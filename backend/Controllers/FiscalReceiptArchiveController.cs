using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Authorization;
using backend.Data;
using backend.DTOs;
using backend.Models;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/fiscal-receipt-archive")]
    [Authorize]
    public class FiscalReceiptArchiveController : ControllerBase
    {
        private const string ReprintMessage =
            "Reprint uses archived fiscal receipt data; stock deduction was not repeated.";

        private readonly ApplicationDbContext _context;

        public FiscalReceiptArchiveController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize(Policy = AppPermissions.FiscalReceiptArchiveManage)]
        public async Task<ActionResult<IEnumerable<FiscalReceiptArchiveResponseDto>>> GetArchivedFiscalReceipts(
            [FromQuery] int? limit = null)
        {
            IQueryable<FiscalReceiptArchive> query = _context.FiscalReceiptArchives
                .AsNoTracking()
                .Include(receipt => receipt.CreatedBy)
                .OrderByDescending(receipt => receipt.ArchivedAt)
                .ThenByDescending(receipt => receipt.Id);

            if (limit is > 0)
            {
                query = query.Take(Math.Min(limit.Value, 100));
            }

            var receipts = await query.ToListAsync();
            return Ok(receipts.Select(ToDto).ToList());
        }

        [HttpGet("{id:int}")]
        [Authorize(Policy = AppPermissions.FiscalReceiptArchiveManage)]
        public async Task<ActionResult<FiscalReceiptArchiveResponseDto>> GetArchivedFiscalReceipt(int id)
        {
            var receipt = await _context.FiscalReceiptArchives
                .AsNoTracking()
                .Include(entity => entity.CreatedBy)
                .FirstOrDefaultAsync(entity => entity.Id == id);

            if (receipt == null)
            {
                return NotFound();
            }

            return Ok(ToDto(receipt));
        }

        [HttpPost("{id:int}/reprint")]
        [Authorize(Policy = AppPermissions.FiscalReceiptArchiveManage)]
        public async Task<ActionResult<FiscalReceiptArchiveResponseDto>> ReprintArchivedFiscalReceipt(int id)
        {
            var receipt = await _context.FiscalReceiptArchives
                .AsNoTracking()
                .Include(entity => entity.CreatedBy)
                .FirstOrDefaultAsync(entity => entity.Id == id);

            if (receipt == null)
            {
                return NotFound();
            }

            var response = ToDto(receipt);
            response.StockDeduction = new InvoiceStockDeductionResultDto
            {
                AlreadyApplied = true,
                Message = ReprintMessage
            };

            return Ok(response);
        }

        private static FiscalReceiptArchiveResponseDto ToDto(FiscalReceiptArchive receipt)
        {
            return new FiscalReceiptArchiveResponseDto
            {
                Id = receipt.Id,
                FiscalReceiptId = receipt.FiscalReceiptId,
                ReceiptNumber = receipt.ReceiptNumber,
                CustomerName = receipt.CustomerName,
                CustomerPhone = receipt.CustomerPhone,
                ItemsJson = receipt.ItemsJson,
                Subtotal = receipt.Subtotal,
                Total = receipt.Total,
                Notes = receipt.Notes,
                CreatedAt = receipt.CreatedAt,
                PrintedAt = receipt.PrintedAt,
                ArchivedAt = receipt.ArchivedAt,
                CreatedById = receipt.CreatedById,
                CreatedByFullName = receipt.CreatedBy?.FullName ?? string.Empty
            };
        }
    }
}
