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
    [Authorize(Policy = AppPermissions.InvoiceArchiveManage)]
    public class InvoiceArchiveController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public InvoiceArchiveController(
            ApplicationDbContext context,
            ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
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

        [HttpPost]
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

            var invoiceNumber = dto.InvoiceNumber.Trim();
            var customerName = dto.CustomerName.Trim();

            if (string.IsNullOrWhiteSpace(invoiceNumber))
            {
                return BadRequest(new { message = "InvoiceNumber is required." });
            }

            if (string.IsNullOrWhiteSpace(customerName))
            {
                return BadRequest(new { message = "CustomerName is required." });
            }

            if (!IsValidItemsJson(dto.ItemsJson))
            {
                return BadRequest(new { message = "ItemsJson must be valid JSON." });
            }

            var invoice = new InvoiceArchive
            {
                InvoiceNumber = invoiceNumber,
                CustomerName = customerName,
                CustomerAddress = NormalizeOptional(dto.CustomerAddress),
                CustomerPhone = NormalizeOptional(dto.CustomerPhone),
                Language = dto.Language.Value,
                ItemsJson = dto.ItemsJson,
                Subtotal = dto.Subtotal,
                Total = dto.Total,
                Notes = NormalizeOptional(dto.Notes),
                CreatedAt = DateTime.UtcNow,
                CreatedById = currentUser.Id,
                CreatedBy = currentUser
            };

            _context.InvoiceArchives.Add(invoice);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetArchivedInvoice), new { id = invoice.Id }, ToDto(invoice));
        }

        [HttpDelete("{id:int}")]
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
    }
}
