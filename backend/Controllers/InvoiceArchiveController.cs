using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Authorization;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/invoice-archive")]
    [Authorize]
    public class InvoiceArchiveController : ControllerBase
    {
        private const string InvoiceAlreadyArchivedMessage =
            "Invoice was already archived; stock deduction was not repeated.";

        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly InvoiceTemplatePdfService _pdfService;
        private readonly IInvoiceStockDeductionService _invoiceStockDeductionService;

        public InvoiceArchiveController(
            ApplicationDbContext context,
            ICurrentUserService currentUserService,
            InvoiceTemplatePdfService pdfService,
            IInvoiceStockDeductionService invoiceStockDeductionService)
        {
            _context = context;
            _currentUserService = currentUserService;
            _pdfService = pdfService;
            _invoiceStockDeductionService = invoiceStockDeductionService;
        }

        [HttpGet]
        [Authorize(Policy = AppPermissions.InvoiceArchiveManage)]
        public async Task<ActionResult<IEnumerable<InvoiceArchiveResponseDto>>> GetArchivedInvoices()
        {
            var invoices = await _context.InvoiceArchives
                .AsNoTracking()
                .Include(invoice => invoice.CreatedBy)
                .OrderByDescending(invoice => invoice.CreatedAt)
                .ThenByDescending(invoice => invoice.Id)
                .Select(invoice => new InvoiceArchiveResponseDto
                {
                    Id = invoice.Id,
                    InvoiceNumber = invoice.InvoiceNumber,
                    CustomerName = invoice.CustomerName,
                    CustomerAddress = invoice.CustomerAddress,
                    CustomerPhone = invoice.CustomerPhone,
                    Language = invoice.Language,
                    ItemsJson = invoice.ItemsJson,
                    Subtotal = invoice.Subtotal,
                    Total = invoice.Total,
                    Notes = invoice.Notes,
                    CreatedAt = invoice.CreatedAt,
                    CreatedById = invoice.CreatedById,
                    CreatedByFullName = invoice.CreatedBy.FullName
                })
                .ToListAsync();

            return Ok(invoices);
        }

        [HttpGet("{id:int}")]
        [Authorize(Policy = AppPermissions.InvoiceArchiveManage)]
        public async Task<ActionResult<InvoiceArchiveResponseDto>> GetArchivedInvoice(int id)
        {
            var invoice = await _context.InvoiceArchives
                .AsNoTracking()
                .Include(entity => entity.CreatedBy)
                .FirstOrDefaultAsync(entity => entity.Id == id);

            if (invoice == null)
            {
                return NotFound();
            }

            return Ok(ToDto(invoice));
        }

        [HttpGet("{id:int}/pdf")]
        [Authorize(Policy = AppPermissions.InvoiceArchiveManage)]
        public async Task<IActionResult> ExportArchivedInvoicePdf(int id)
        {
            var invoice = await _context.InvoiceArchives
                .AsNoTracking()
                .Include(entity => entity.CreatedBy)
                .FirstOrDefaultAsync(entity => entity.Id == id);

            if (invoice == null)
            {
                return NotFound();
            }

            var pdfBytes = _pdfService.GenerateArchivedInvoicePdf(invoice);
            return File(pdfBytes, "application/pdf", $"ArchivedInvoice-{SanitizeFileName(invoice.InvoiceNumber)}.pdf");
        }

        [HttpPost]
        [Authorize(Policy = AppPermissions.TemplatesPrint)]
        public async Task<ActionResult<InvoiceArchiveResponseDto>> CreateArchivedInvoice(
            [FromBody] CreateInvoiceArchiveDto dto)
        {
            var currentUser = _currentUserService.GetCurrentUser();
            if (currentUser == null)
            {
                return Unauthorized();
            }

            if (!dto.Language.HasValue || !Enum.IsDefined(typeof(InvoiceLanguage), dto.Language.Value))
            {
                return BadRequest(new { message = "Language must be Albanian or Macedonian." });
            }

            var requestedInvoiceNumber = dto.InvoiceNumber?.Trim() ?? "";
            var clientRequestId = NormalizeOptional(dto.ClientRequestId);
            var customerName = dto.CustomerName.Trim();

            if (string.IsNullOrWhiteSpace(customerName))
            {
                return BadRequest(new { message = "CustomerName is required." });
            }

            if (!IsValidItemsJson(dto.ItemsJson))
            {
                return BadRequest(new { message = "ItemsJson must be valid JSON." });
            }

            if (!string.IsNullOrWhiteSpace(clientRequestId))
            {
                var existingByRequest = await FindArchivedInvoiceByClientRequestIdAsync(clientRequestId);
                if (existingByRequest != null)
                {
                    return Ok(ToAlreadyArchivedDto(existingByRequest));
                }
            }

            if (!string.IsNullOrWhiteSpace(requestedInvoiceNumber))
            {
                var existingInvoice = await FindArchivedInvoiceByNumberAsync(requestedInvoiceNumber);
                if (existingInvoice != null)
                {
                    return Ok(ToAlreadyArchivedDto(existingInvoice));
                }
            }

            if (string.IsNullOrWhiteSpace(requestedInvoiceNumber))
            {
                return await CreateArchivedInvoiceWithGeneratedNumberAsync(
                    dto,
                    currentUser,
                    customerName,
                    clientRequestId);
            }

            return await CreateArchivedInvoiceWithNumberAsync(
                dto,
                currentUser,
                requestedInvoiceNumber,
                customerName,
                clientRequestId);
        }

        private async Task<ActionResult<InvoiceArchiveResponseDto>> CreateArchivedInvoiceWithNumberAsync(
            CreateInvoiceArchiveDto dto,
            User currentUser,
            string invoiceNumber,
            string customerName,
            string? clientRequestId)
        {
            var stockRequest = _invoiceStockDeductionService.BuildRequestFromArchivePayload(
                invoiceNumber,
                customerName,
                dto.ItemsJson);
            var stockStage = await _invoiceStockDeductionService.StageInvoiceDeductionsAsync(
                stockRequest,
                reserveDeductionKeyWhenEmpty: true);
            if (!string.IsNullOrWhiteSpace(stockStage.ErrorMessage))
            {
                return BadRequest(new { message = stockStage.ErrorMessage });
            }

            var invoice = new InvoiceArchive
            {
                InvoiceNumber = invoiceNumber,
                ClientRequestId = clientRequestId,
                CustomerName = customerName,
                CustomerAddress = NormalizeOptional(dto.CustomerAddress),
                CustomerPhone = NormalizeOptional(dto.CustomerPhone),
                Language = dto.Language!.Value,
                ItemsJson = dto.ItemsJson,
                Subtotal = dto.Subtotal,
                Total = dto.Total,
                Notes = NormalizeOptional(dto.Notes),
                CreatedAt = DateTime.UtcNow,
                CreatedById = currentUser.Id,
                CreatedBy = currentUser
            };

            _context.InvoiceArchives.Add(invoice);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsUniqueClientRequestIdViolation(ex))
            {
                DetachPendingInvoiceArchiveChanges();
                DetachPendingStockDeductionChanges();

                if (!string.IsNullOrWhiteSpace(clientRequestId))
                {
                    var existingAfterRace = await FindArchivedInvoiceByClientRequestIdAsync(clientRequestId);
                    if (existingAfterRace != null)
                    {
                        return Ok(ToAlreadyArchivedDto(existingAfterRace));
                    }
                }

                throw;
            }
            catch (DbUpdateException ex) when (_invoiceStockDeductionService.IsUniqueInvoiceDeductionViolation(ex))
            {
                DetachPendingStockDeductionChanges();

                var existingAfterRace = await FindArchivedInvoiceByNumberAsync(invoiceNumber);
                if (existingAfterRace != null)
                {
                    _context.Entry(invoice).State = EntityState.Detached;
                    return Ok(ToAlreadyArchivedDto(existingAfterRace));
                }

                stockStage.Result.Applied.Clear();
                stockStage.Result.AlreadyApplied = true;
                stockStage.Result.Message = "Stock deduction was already applied for this invoice.";
                await _context.SaveChangesAsync();
            }

            var response = ToDto(invoice);
            response.StockDeduction = stockStage.Result;
            return CreatedAtAction(nameof(GetArchivedInvoice), new { id = invoice.Id }, response);
        }

        private async Task<ActionResult<InvoiceArchiveResponseDto>> CreateArchivedInvoiceWithGeneratedNumberAsync(
            CreateInvoiceArchiveDto dto,
            User currentUser,
            string customerName,
            string? clientRequestId)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();
            var createdAt = DateTime.UtcNow;
            var invoice = new InvoiceArchive
            {
                InvoiceNumber = BuildPendingInvoiceNumber(),
                ClientRequestId = clientRequestId,
                CustomerName = customerName,
                CustomerAddress = NormalizeOptional(dto.CustomerAddress),
                CustomerPhone = NormalizeOptional(dto.CustomerPhone),
                Language = dto.Language!.Value,
                ItemsJson = dto.ItemsJson,
                Subtotal = dto.Subtotal,
                Total = dto.Total,
                Notes = NormalizeOptional(dto.Notes),
                CreatedAt = createdAt,
                CreatedById = currentUser.Id,
                CreatedBy = currentUser
            };

            _context.InvoiceArchives.Add(invoice);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsUniqueClientRequestIdViolation(ex))
            {
                await transaction.RollbackAsync();
                DetachPendingInvoiceArchiveChanges();

                if (!string.IsNullOrWhiteSpace(clientRequestId))
                {
                    var existingAfterRace = await FindArchivedInvoiceByClientRequestIdAsync(clientRequestId);
                    if (existingAfterRace != null)
                    {
                        return Ok(ToAlreadyArchivedDto(existingAfterRace));
                    }
                }

                throw;
            }

            var invoiceNumber = await GenerateInvoiceNumberForArchiveAsync(invoice.Id, createdAt);
            invoice.InvoiceNumber = invoiceNumber;

            var stockRequest = _invoiceStockDeductionService.BuildRequestFromArchivePayload(
                invoiceNumber,
                customerName,
                dto.ItemsJson);
            var stockStage = await _invoiceStockDeductionService.StageInvoiceDeductionsAsync(
                stockRequest,
                reserveDeductionKeyWhenEmpty: true);
            if (!string.IsNullOrWhiteSpace(stockStage.ErrorMessage))
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = stockStage.ErrorMessage });
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            var response = ToDto(invoice);
            response.StockDeduction = stockStage.Result;
            return CreatedAtAction(nameof(GetArchivedInvoice), new { id = invoice.Id }, response);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Policy = AppPermissions.InvoiceArchiveManage)]
        public async Task<IActionResult> DeleteArchivedInvoice(int id)
        {
            var invoice = await _context.InvoiceArchives.FindAsync(id);
            if (invoice == null)
            {
                return NotFound();
            }

            _context.InvoiceArchives.Remove(invoice);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private static InvoiceArchiveResponseDto ToDto(InvoiceArchive invoice)
        {
            return new InvoiceArchiveResponseDto
            {
                Id = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber,
                CustomerName = invoice.CustomerName,
                CustomerAddress = invoice.CustomerAddress,
                CustomerPhone = invoice.CustomerPhone,
                Language = invoice.Language,
                ItemsJson = invoice.ItemsJson,
                Subtotal = invoice.Subtotal,
                Total = invoice.Total,
                Notes = invoice.Notes,
                CreatedAt = invoice.CreatedAt,
                CreatedById = invoice.CreatedById,
                CreatedByFullName = invoice.CreatedBy.FullName
            };
        }

        private async Task<InvoiceArchive?> FindArchivedInvoiceByClientRequestIdAsync(string clientRequestId)
        {
            return await _context.InvoiceArchives
                .AsNoTracking()
                .Include(entity => entity.CreatedBy)
                .OrderBy(entity => entity.Id)
                .FirstOrDefaultAsync(entity => entity.ClientRequestId == clientRequestId);
        }

        private async Task<InvoiceArchive?> FindArchivedInvoiceByNumberAsync(string invoiceNumber)
        {
            var normalizedInvoiceNumber = invoiceNumber.ToUpperInvariant();

            return await _context.InvoiceArchives
                .AsNoTracking()
                .Include(entity => entity.CreatedBy)
                .OrderBy(entity => entity.Id)
                .FirstOrDefaultAsync(entity =>
                    entity.InvoiceNumber.ToUpper() == normalizedInvoiceNumber);
        }

        private static InvoiceArchiveResponseDto ToAlreadyArchivedDto(InvoiceArchive invoice)
        {
            var response = ToDto(invoice);
            response.StockDeduction = new InvoiceStockDeductionResultDto
            {
                AlreadyApplied = true,
                Message = InvoiceAlreadyArchivedMessage
            };

            return response;
        }

        private static bool IsValidItemsJson(string? itemsJson)
        {
            if (string.IsNullOrWhiteSpace(itemsJson))
            {
                return false;
            }

            try
            {
                using var document = JsonDocument.Parse(itemsJson);
                return document.RootElement.ValueKind == JsonValueKind.Array
                    || document.RootElement.ValueKind == JsonValueKind.Object;
            }
            catch (JsonException)
            {
                return false;
            }
        }

        private static string? NormalizeOptional(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        private static string BuildPendingInvoiceNumber()
        {
            return $"PENDING-{Guid.NewGuid():N}";
        }

        private async Task<string> GenerateInvoiceNumberForArchiveAsync(int archiveId, DateTime createdAt)
        {
            var datePart = createdAt.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
            var baseNumber = $"INV-{datePart}-{archiveId:D6}";
            var candidate = baseNumber;
            var suffix = 1;

            while (await InvoiceNumberExistsForAnotherArchiveAsync(candidate, archiveId))
            {
                candidate = $"{baseNumber}-{suffix}";
                suffix++;
            }

            return candidate;
        }

        private async Task<bool> InvoiceNumberExistsForAnotherArchiveAsync(
            string invoiceNumber,
            int archiveId)
        {
            var normalizedInvoiceNumber = invoiceNumber.ToUpperInvariant();

            return await _context.InvoiceArchives
                .AsNoTracking()
                .AnyAsync(entity =>
                    entity.Id != archiveId &&
                    entity.InvoiceNumber.ToUpper() == normalizedInvoiceNumber);
        }

        private void DetachPendingStockDeductionChanges()
        {
            var entries = _context.ChangeTracker.Entries()
                .Where(entry =>
                    entry.State == EntityState.Added &&
                    (entry.Entity is InvoiceStockDeduction || entry.Entity is StockMovement))
                .ToList();

            foreach (var entry in entries)
            {
                entry.State = EntityState.Detached;
            }
        }

        private void DetachPendingInvoiceArchiveChanges()
        {
            var entries = _context.ChangeTracker.Entries<InvoiceArchive>()
                .Where(entry => entry.State == EntityState.Added)
                .ToList();

            foreach (var entry in entries)
            {
                entry.State = EntityState.Detached;
            }
        }

        private static bool IsUniqueClientRequestIdViolation(DbUpdateException exception)
        {
            for (var current = exception.InnerException; current != null; current = current.InnerException)
            {
                if (current.Message.Contains(
                        "IX_InvoiceArchives_ClientRequestId",
                        StringComparison.OrdinalIgnoreCase) ||
                    current.Message.Contains(
                        "InvoiceArchives.ClientRequestId",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        private static string SanitizeFileName(string value)
        {
            var invalidChars = Path.GetInvalidFileNameChars();
            var cleaned = new string(value
                .Where(character => !invalidChars.Contains(character))
                .ToArray())
                .Trim();

            return string.IsNullOrWhiteSpace(cleaned) ? "invoice" : cleaned;
        }
    }
}
