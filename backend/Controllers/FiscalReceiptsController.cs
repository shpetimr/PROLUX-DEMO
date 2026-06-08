using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Authorization;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using backend.Utilities;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/fiscal-receipts")]
    [Authorize]
    public class FiscalReceiptsController : ControllerBase
    {
        private const string ReceiptAlreadyArchivedMessage =
            "Fiscal receipt was already archived; stock deduction was not repeated.";

        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;
        private readonly IFiscalReceiptStockDeductionService _stockDeductionService;

        public FiscalReceiptsController(
            ApplicationDbContext context,
            ICurrentUserService currentUserService,
            IFiscalReceiptStockDeductionService stockDeductionService)
        {
            _context = context;
            _currentUserService = currentUserService;
            _stockDeductionService = stockDeductionService;
        }

        [HttpGet]
        [Authorize(Policy = AppPermissions.FiscalReceiptsManage)]
        public async Task<ActionResult<IEnumerable<FiscalReceiptResponseDto>>> GetFiscalReceipts(
            [FromQuery] int? limit = null)
        {
            IQueryable<FiscalReceipt> query = _context.FiscalReceipts
                .AsNoTracking()
                .Include(receipt => receipt.CreatedBy)
                .Include(receipt => receipt.Archive)
                .OrderByDescending(receipt => receipt.CreatedAt)
                .ThenByDescending(receipt => receipt.Id);

            if (limit is > 0)
            {
                query = query.Take(Math.Min(limit.Value, 100));
            }

            var receipts = await query.ToListAsync();
            return Ok(receipts.Select(ToReceiptDto).ToList());
        }

        [HttpGet("{id:int}")]
        [Authorize(Policy = AppPermissions.FiscalReceiptsManage)]
        public async Task<ActionResult<FiscalReceiptResponseDto>> GetFiscalReceipt(int id)
        {
            var receipt = await _context.FiscalReceipts
                .AsNoTracking()
                .Include(entity => entity.CreatedBy)
                .Include(entity => entity.Archive)
                .FirstOrDefaultAsync(entity => entity.Id == id);

            if (receipt == null)
            {
                return NotFound();
            }

            return Ok(ToReceiptDto(receipt));
        }

        [HttpPost("print")]
        [Authorize(Policy = AppPermissions.TemplatesPrint)]
        public async Task<ActionResult<FiscalReceiptArchiveResponseDto>> PrintFiscalReceipt(
            [FromBody] CreateFiscalReceiptDto dto)
        {
            var currentUser = _currentUserService.GetCurrentUser();
            if (currentUser == null)
            {
                return Unauthorized();
            }

            var itemValidationError = ValidateReceiptItemsJson(dto.ItemsJson);
            if (!string.IsNullOrWhiteSpace(itemValidationError))
            {
                return BadRequest(new { message = itemValidationError });
            }

            var requestedReceiptNumber = dto.ReceiptNumber?.Trim() ?? "";
            var clientRequestId = NormalizeOptional(dto.ClientRequestId);
            var customerName = NormalizeOptional(dto.CustomerName);

            if (string.IsNullOrWhiteSpace(requestedReceiptNumber) &&
                string.IsNullOrWhiteSpace(clientRequestId))
            {
                return BadRequest(new
                {
                    message = "ClientRequestId is required when the fiscal receipt number is generated automatically."
                });
            }

            if (!string.IsNullOrWhiteSpace(clientRequestId))
            {
                var existingByRequest = await FindArchivedReceiptByClientRequestIdAsync(clientRequestId);
                if (existingByRequest != null)
                {
                    return Ok(ToAlreadyArchivedDto(existingByRequest));
                }
            }

            if (!string.IsNullOrWhiteSpace(requestedReceiptNumber))
            {
                var existingReceipt = await FindArchivedReceiptByNumberAsync(requestedReceiptNumber);
                if (existingReceipt != null)
                {
                    return Ok(ToAlreadyArchivedDto(existingReceipt));
                }
            }

            if (string.IsNullOrWhiteSpace(requestedReceiptNumber))
            {
                return await CreatePrintedReceiptWithGeneratedNumberAsync(
                    dto,
                    currentUser,
                    customerName,
                    clientRequestId);
            }

            return await CreatePrintedReceiptWithNumberAsync(
                dto,
                currentUser,
                requestedReceiptNumber,
                customerName,
                clientRequestId);
        }

        private async Task<ActionResult<FiscalReceiptArchiveResponseDto>> CreatePrintedReceiptWithNumberAsync(
            CreateFiscalReceiptDto dto,
            User currentUser,
            string receiptNumber,
            string? customerName,
            string? clientRequestId)
        {
            var now = DateTime.UtcNow;
            var total = InvoiceArchiveFinancials.GetRevenueTotal(dto.ItemsJson, dto.Total);
            var receipt = BuildReceipt(
                dto,
                currentUser,
                receiptNumber,
                customerName,
                clientRequestId,
                total,
                now);
            var archive = BuildArchive(
                dto,
                receipt,
                currentUser,
                receiptNumber,
                customerName,
                clientRequestId,
                total,
                now);

            var stockRequest = _stockDeductionService.BuildRequestFromReceiptPayload(
                receiptNumber,
                customerName,
                dto.ItemsJson);
            var stockStage = await _stockDeductionService.StageFiscalReceiptDeductionsAsync(
                stockRequest,
                reserveDeductionKeyWhenEmpty: true);
            if (!string.IsNullOrWhiteSpace(stockStage.ErrorMessage))
            {
                return BadRequest(new { message = stockStage.ErrorMessage });
            }

            _context.FiscalReceipts.Add(receipt);
            _context.FiscalReceiptArchives.Add(archive);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsUniqueFiscalReceiptIdentityViolation(ex))
            {
                DetachPendingFiscalReceiptChanges();
                DetachPendingStockDeductionChanges();

                var existingAfterRace = await FindExistingArchivedReceiptAfterRaceAsync(
                    clientRequestId,
                    receiptNumber);
                if (existingAfterRace != null)
                {
                    return Ok(ToAlreadyArchivedDto(existingAfterRace));
                }

                throw;
            }
            catch (DbUpdateException ex) when (_stockDeductionService.IsUniqueFiscalReceiptDeductionViolation(ex))
            {
                DetachPendingStockDeductionChanges();

                var existingAfterRace = await FindArchivedReceiptByNumberAsync(receiptNumber);
                if (existingAfterRace != null)
                {
                    DetachPendingFiscalReceiptChanges();
                    return Ok(ToAlreadyArchivedDto(existingAfterRace));
                }

                stockStage.Result.Applied.Clear();
                stockStage.Result.AlreadyApplied = true;
                stockStage.Result.Message = "Stock deduction was already applied for this fiscal receipt.";
                await _context.SaveChangesAsync();
            }

            archive.CreatedBy = currentUser;
            var response = ToArchiveDto(archive);
            response.StockDeduction = stockStage.Result;
            return Created($"/api/fiscal-receipt-archive/{archive.Id}", response);
        }

        private async Task<ActionResult<FiscalReceiptArchiveResponseDto>> CreatePrintedReceiptWithGeneratedNumberAsync(
            CreateFiscalReceiptDto dto,
            User currentUser,
            string? customerName,
            string? clientRequestId)
        {
            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync<ActionResult<FiscalReceiptArchiveResponseDto>>(async () =>
            {
                _context.ChangeTracker.Clear();

                await using var transaction = await _context.Database.BeginTransactionAsync();
                var now = DateTime.UtcNow;
                var total = InvoiceArchiveFinancials.GetRevenueTotal(dto.ItemsJson, dto.Total);
                var receipt = BuildReceipt(
                    dto,
                    currentUser,
                    BuildPendingReceiptNumber(),
                    customerName,
                    clientRequestId,
                    total,
                    now);
                var archive = BuildArchive(
                    dto,
                    receipt,
                    currentUser,
                    receipt.ReceiptNumber,
                    customerName,
                    clientRequestId,
                    total,
                    now);

                _context.FiscalReceipts.Add(receipt);
                _context.FiscalReceiptArchives.Add(archive);

                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException ex) when (IsUniqueFiscalReceiptIdentityViolation(ex))
                {
                    await transaction.RollbackAsync();
                    DetachPendingFiscalReceiptChanges();

                    if (!string.IsNullOrWhiteSpace(clientRequestId))
                    {
                        var existingAfterRace = await FindArchivedReceiptByClientRequestIdAsync(clientRequestId);
                        if (existingAfterRace != null)
                        {
                            return Ok(ToAlreadyArchivedDto(existingAfterRace));
                        }
                    }

                    throw;
                }

                var receiptNumber = await GenerateReceiptNumberForArchiveAsync(archive.Id, now);
                receipt.ReceiptNumber = receiptNumber;
                archive.ReceiptNumber = receiptNumber;

                var stockRequest = _stockDeductionService.BuildRequestFromReceiptPayload(
                    receiptNumber,
                    customerName,
                    dto.ItemsJson);
                var stockStage = await _stockDeductionService.StageFiscalReceiptDeductionsAsync(
                    stockRequest,
                    reserveDeductionKeyWhenEmpty: true);
                if (!string.IsNullOrWhiteSpace(stockStage.ErrorMessage))
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { message = stockStage.ErrorMessage });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                archive.CreatedBy = currentUser;
                var response = ToArchiveDto(archive);
                response.StockDeduction = stockStage.Result;
                return Created($"/api/fiscal-receipt-archive/{archive.Id}", response);
            });
        }

        private static FiscalReceipt BuildReceipt(
            CreateFiscalReceiptDto dto,
            User currentUser,
            string receiptNumber,
            string? customerName,
            string? clientRequestId,
            decimal total,
            DateTime now)
        {
            return new FiscalReceipt
            {
                ReceiptNumber = receiptNumber,
                ClientRequestId = clientRequestId,
                CustomerName = customerName,
                CustomerPhone = NormalizeOptional(dto.CustomerPhone),
                ItemsJson = dto.ItemsJson,
                Subtotal = dto.Subtotal,
                Total = total,
                Notes = NormalizeOptional(dto.Notes),
                Status = FiscalReceiptStatus.Archived,
                CreatedAt = now,
                PrintedAt = now,
                ArchivedAt = now,
                CreatedById = currentUser.Id
            };
        }

        private static FiscalReceiptArchive BuildArchive(
            CreateFiscalReceiptDto dto,
            FiscalReceipt receipt,
            User currentUser,
            string receiptNumber,
            string? customerName,
            string? clientRequestId,
            decimal total,
            DateTime now)
        {
            return new FiscalReceiptArchive
            {
                FiscalReceipt = receipt,
                ReceiptNumber = receiptNumber,
                ClientRequestId = clientRequestId,
                CustomerName = customerName,
                CustomerPhone = NormalizeOptional(dto.CustomerPhone),
                ItemsJson = dto.ItemsJson,
                Subtotal = dto.Subtotal,
                Total = total,
                Notes = NormalizeOptional(dto.Notes),
                CreatedAt = now,
                PrintedAt = now,
                ArchivedAt = now,
                CreatedById = currentUser.Id
            };
        }

        private static FiscalReceiptResponseDto ToReceiptDto(FiscalReceipt receipt)
        {
            return new FiscalReceiptResponseDto
            {
                Id = receipt.Id,
                ArchiveId = receipt.Archive?.Id,
                ReceiptNumber = receipt.ReceiptNumber,
                CustomerName = receipt.CustomerName,
                CustomerPhone = receipt.CustomerPhone,
                ItemsJson = receipt.ItemsJson,
                Subtotal = receipt.Subtotal,
                Total = receipt.Total,
                Notes = receipt.Notes,
                Status = receipt.Status,
                CreatedAt = receipt.CreatedAt,
                PrintedAt = receipt.PrintedAt,
                ArchivedAt = receipt.ArchivedAt,
                CreatedById = receipt.CreatedById,
                CreatedByFullName = receipt.CreatedBy?.FullName ?? string.Empty
            };
        }

        private static FiscalReceiptArchiveResponseDto ToArchiveDto(FiscalReceiptArchive archive)
        {
            return new FiscalReceiptArchiveResponseDto
            {
                Id = archive.Id,
                FiscalReceiptId = archive.FiscalReceiptId,
                ReceiptNumber = archive.ReceiptNumber,
                CustomerName = archive.CustomerName,
                CustomerPhone = archive.CustomerPhone,
                ItemsJson = archive.ItemsJson,
                Subtotal = archive.Subtotal,
                Total = archive.Total,
                Notes = archive.Notes,
                CreatedAt = archive.CreatedAt,
                PrintedAt = archive.PrintedAt,
                ArchivedAt = archive.ArchivedAt,
                CreatedById = archive.CreatedById,
                CreatedByFullName = archive.CreatedBy?.FullName ?? string.Empty
            };
        }

        private static FiscalReceiptArchiveResponseDto ToAlreadyArchivedDto(FiscalReceiptArchive archive)
        {
            var response = ToArchiveDto(archive);
            response.StockDeduction = new InvoiceStockDeductionResultDto
            {
                AlreadyApplied = true,
                Message = ReceiptAlreadyArchivedMessage
            };

            return response;
        }

        private async Task<FiscalReceiptArchive?> FindExistingArchivedReceiptAfterRaceAsync(
            string? clientRequestId,
            string receiptNumber)
        {
            if (!string.IsNullOrWhiteSpace(clientRequestId))
            {
                var existingByRequest = await FindArchivedReceiptByClientRequestIdAsync(clientRequestId);
                if (existingByRequest != null)
                {
                    return existingByRequest;
                }
            }

            return string.IsNullOrWhiteSpace(receiptNumber)
                ? null
                : await FindArchivedReceiptByNumberAsync(receiptNumber);
        }

        private async Task<FiscalReceiptArchive?> FindArchivedReceiptByClientRequestIdAsync(string clientRequestId)
        {
            return await _context.FiscalReceiptArchives
                .AsNoTracking()
                .Include(entity => entity.CreatedBy)
                .OrderBy(entity => entity.Id)
                .FirstOrDefaultAsync(entity => entity.ClientRequestId == clientRequestId);
        }

        private async Task<FiscalReceiptArchive?> FindArchivedReceiptByNumberAsync(string receiptNumber)
        {
            var normalizedReceiptNumber = receiptNumber.ToUpperInvariant();

            return await _context.FiscalReceiptArchives
                .AsNoTracking()
                .Include(entity => entity.CreatedBy)
                .OrderBy(entity => entity.Id)
                .FirstOrDefaultAsync(entity =>
                    entity.ReceiptNumber.ToUpper() == normalizedReceiptNumber);
        }

        private static string? ValidateReceiptItemsJson(string? itemsJson)
        {
            if (string.IsNullOrWhiteSpace(itemsJson))
            {
                return "ItemsJson is required.";
            }

            try
            {
                using var document = JsonDocument.Parse(itemsJson);
                var root = document.RootElement;
                var items = root.ValueKind == JsonValueKind.Array
                    ? root
                    : TryReadProperty(root, "items", "rows", "lines");

                if (items.ValueKind != JsonValueKind.Array)
                {
                    return "ItemsJson must contain an items array.";
                }

                var hasReceiptLine = false;
                foreach (var item in items.EnumerateArray())
                {
                    if (item.ValueKind != JsonValueKind.Object)
                    {
                        return "Fiscal receipt items must be JSON objects.";
                    }

                    if (!IsFilledReceiptLine(item))
                    {
                        continue;
                    }

                    hasReceiptLine = true;
                    var name = ReadString(item, "name", "itemName", "description").Trim();
                    if (string.IsNullOrWhiteSpace(name))
                    {
                        return "Each fiscal receipt item must include a name.";
                    }

                    var quantity = ParseReceiptQuantity(
                        ReadString(item, "m2pcs", "m2Pcs", "quantity", "qty"));
                    if (quantity <= 0)
                    {
                        return $"Fiscal receipt line '{name}' must have a quantity greater than 0.";
                    }
                }

                return hasReceiptLine
                    ? null
                    : "Fiscal receipt must include at least one item.";
            }
            catch (JsonException)
            {
                return "ItemsJson must be valid JSON.";
            }
        }

        private static bool IsFilledReceiptLine(JsonElement item)
        {
            return !string.IsNullOrWhiteSpace(ReadString(item, "name", "itemName", "description")) ||
                !string.IsNullOrWhiteSpace(ReadString(item, "materials", "material")) ||
                !string.IsNullOrWhiteSpace(ReadString(item, "m2pcs", "m2Pcs", "quantity", "qty")) ||
                !string.IsNullOrWhiteSpace(ReadString(item, "price", "unitPrice")) ||
                !string.IsNullOrWhiteSpace(ReadString(item, "total", "lineTotal"));
        }

        private static string? NormalizeOptional(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        private static string BuildPendingReceiptNumber()
        {
            return $"PENDING-LF-{Guid.NewGuid():N}";
        }

        private static decimal ParseReceiptQuantity(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return 0m;
            }

            var normalized = raw.Trim().Replace('\u00A0', ' ').Replace(',', '.');
            var matches = Regex.Matches(normalized, @"[-+]?(?:\d+\.?\d*|\.\d+)");
            var quantityText = matches
                .Cast<Match>()
                .FirstOrDefault(match =>
                    match.Index == 0 ||
                    !char.IsLetter(normalized[match.Index - 1]))
                ?.Value;

            if (string.IsNullOrWhiteSpace(quantityText))
            {
                return 0m;
            }

            return decimal.TryParse(
                quantityText,
                NumberStyles.Number,
                CultureInfo.InvariantCulture,
                out var parsed)
                    ? parsed
                    : 0m;
        }

        private static JsonElement TryReadProperty(JsonElement source, params string[] names)
        {
            if (source.ValueKind != JsonValueKind.Object)
            {
                return default;
            }

            foreach (var property in source.EnumerateObject())
            {
                if (names.Any(name => property.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
                {
                    return property.Value;
                }
            }

            return default;
        }

        private static string ReadString(JsonElement source, params string[] names)
        {
            var value = TryReadProperty(source, names);
            return value.ValueKind switch
            {
                JsonValueKind.String => value.GetString() ?? "",
                JsonValueKind.Number => value.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                _ => ""
            };
        }

        private async Task<string> GenerateReceiptNumberForArchiveAsync(int archiveId, DateTime createdAt)
        {
            var datePart = createdAt.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
            var baseNumber = $"LF-{datePart}-{archiveId:D6}";
            var candidate = baseNumber;
            var suffix = 1;

            while (await ReceiptNumberExistsForAnotherArchiveOrReceiptAsync(candidate, archiveId))
            {
                candidate = $"{baseNumber}-{suffix}";
                suffix++;
            }

            return candidate;
        }

        private async Task<bool> ReceiptNumberExistsForAnotherArchiveOrReceiptAsync(
            string receiptNumber,
            int archiveId)
        {
            var normalizedReceiptNumber = receiptNumber.ToUpperInvariant();

            var archiveExists = await _context.FiscalReceiptArchives
                .AsNoTracking()
                .AnyAsync(entity =>
                    entity.Id != archiveId &&
                    entity.ReceiptNumber.ToUpper() == normalizedReceiptNumber);
            if (archiveExists)
            {
                return true;
            }

            return await _context.FiscalReceipts
                .AsNoTracking()
                .AnyAsync(entity => entity.ReceiptNumber.ToUpper() == normalizedReceiptNumber);
        }

        private void DetachPendingStockDeductionChanges()
        {
            var entries = _context.ChangeTracker.Entries()
                .Where(entry =>
                    entry.State == EntityState.Added &&
                    (entry.Entity is FiscalReceiptStockDeduction || entry.Entity is StockMovement))
                .ToList();

            foreach (var entry in entries)
            {
                entry.State = EntityState.Detached;
            }
        }

        private void DetachPendingFiscalReceiptChanges()
        {
            var entries = _context.ChangeTracker.Entries()
                .Where(entry =>
                    entry.State == EntityState.Added &&
                    (entry.Entity is FiscalReceipt || entry.Entity is FiscalReceiptArchive))
                .ToList();

            foreach (var entry in entries)
            {
                entry.State = EntityState.Detached;
            }
        }

        private static bool IsUniqueFiscalReceiptIdentityViolation(DbUpdateException exception)
        {
            for (var current = exception.InnerException; current != null; current = current.InnerException)
            {
                if (current.Message.Contains(
                        "IX_FiscalReceipts_ReceiptNumber",
                        StringComparison.OrdinalIgnoreCase) ||
                    current.Message.Contains(
                        "IX_FiscalReceipts_ClientRequestId",
                        StringComparison.OrdinalIgnoreCase) ||
                    current.Message.Contains(
                        "IX_FiscalReceiptArchives_ReceiptNumber",
                        StringComparison.OrdinalIgnoreCase) ||
                    current.Message.Contains(
                        "IX_FiscalReceiptArchives_ClientRequestId",
                        StringComparison.OrdinalIgnoreCase) ||
                    current.Message.Contains(
                        "FiscalReceipts.ReceiptNumber",
                        StringComparison.OrdinalIgnoreCase) ||
                    current.Message.Contains(
                        "FiscalReceipts.ClientRequestId",
                        StringComparison.OrdinalIgnoreCase) ||
                    current.Message.Contains(
                        "FiscalReceiptArchives.ReceiptNumber",
                        StringComparison.OrdinalIgnoreCase) ||
                    current.Message.Contains(
                        "FiscalReceiptArchives.ClientRequestId",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
