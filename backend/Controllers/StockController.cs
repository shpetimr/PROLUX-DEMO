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
    [Route("api/stock")]
    [Authorize(Policy = AppPermissions.StockManage)]
    public class StockController : ControllerBase
    {
        private const string AlreadyAppliedMessage = "Stock deduction was already applied for this invoice.";

        private readonly ApplicationDbContext _context;
        private readonly IInvoiceStockDeductionService _invoiceStockDeductionService;

        public StockController(
            ApplicationDbContext context,
            IInvoiceStockDeductionService invoiceStockDeductionService)
        {
            _context = context;
            _invoiceStockDeductionService = invoiceStockDeductionService;
        }

        [HttpGet("items")]
        public async Task<ActionResult<IEnumerable<StockItemResponseDto>>> GetItems([FromQuery] StockType? stockType)
        {
            if (stockType.HasValue && !IsValidStockType(stockType.Value))
                return BadRequest(new { message = "StockType must be Material or Product." });

            var query = _context.StockItems.AsNoTracking();
            if (stockType.HasValue)
            {
                query = query.Where(item => item.StockType == stockType.Value);
            }

            var items = await query.OrderBy(item => item.Name).ToListAsync();
            var ids = items.Select(item => item.Id).ToList();

            var balances = ids.Count == 0
                ? new Dictionary<int, decimal>()
                : await _context.StockMovements
                    .Where(movement => ids.Contains(movement.StockItemId))
                    .GroupBy(movement => movement.StockItemId)
                    .Select(group => new { Id = group.Key, Quantity = group.Sum(item => item.QuantityChange) })
                    .ToDictionaryAsync(item => item.Id, item => item.Quantity);

            var result = items.Select(item => new StockItemResponseDto
            {
                Id = item.Id,
                Name = item.Name,
                Sku = item.Sku,
                Unit = item.Unit,
                StockType = item.StockType,
                Description = item.Description,
                ReorderLevel = item.ReorderLevel,
                CreatedAt = item.CreatedAt,
                CurrentQuantity = balances.TryGetValue(item.Id, out var quantity) ? quantity : 0m
            });

            return Ok(result);
        }

        [HttpGet("items/{id:int}")]
        public async Task<ActionResult<StockItemResponseDto>> GetItem(int id)
        {
            var item = await _context.StockItems.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id);
            if (item == null)
                return NotFound();

            var quantity = await _context.StockMovements
                .Where(movement => movement.StockItemId == id)
                .SumAsync(movement => movement.QuantityChange);

            return Ok(new StockItemResponseDto
            {
                Id = item.Id,
                Name = item.Name,
                Sku = item.Sku,
                Unit = item.Unit,
                StockType = item.StockType,
                Description = item.Description,
                ReorderLevel = item.ReorderLevel,
                CreatedAt = item.CreatedAt,
                CurrentQuantity = quantity
            });
        }

        [HttpPost("items")]
        public async Task<ActionResult<StockItemResponseDto>> CreateItem([FromBody] CreateStockItemDto dto)
        {
            if (!IsValidStockType(dto.StockType))
                return BadRequest(new { message = "StockType must be Material or Product." });

            if (dto.InitialQuantity < 0)
                return BadRequest(new { message = "InitialQuantity cannot be negative." });

            var now = DateTime.UtcNow;
            var entity = new StockItem
            {
                Name = dto.Name.Trim(),
                Sku = string.IsNullOrWhiteSpace(dto.Sku) ? null : dto.Sku.Trim(),
                Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "pcs" : dto.Unit.Trim(),
                StockType = dto.StockType,
                Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
                ReorderLevel = dto.ReorderLevel,
                CreatedAt = now
            };
            _context.StockItems.Add(entity);

            if (dto.InitialQuantity > 0)
            {
                _context.StockMovements.Add(new StockMovement
                {
                    StockItem = entity,
                    QuantityChange = dto.InitialQuantity,
                    MovementKind = "Initial",
                    Note = "Initial quantity",
                    OccurredAt = now
                });
            }

            await _context.SaveChangesAsync();

            return Ok(new StockItemResponseDto
            {
                Id = entity.Id,
                Name = entity.Name,
                Sku = entity.Sku,
                Unit = entity.Unit,
                StockType = entity.StockType,
                Description = entity.Description,
                ReorderLevel = entity.ReorderLevel,
                CreatedAt = entity.CreatedAt,
                CurrentQuantity = dto.InitialQuantity
            });
        }

        [HttpPut("items/{id:int}")]
        public async Task<IActionResult> UpdateItem(int id, [FromBody] UpdateStockItemDto dto)
        {
            if (!IsValidStockType(dto.StockType))
                return BadRequest(new { message = "StockType must be Material or Product." });

            var entity = await _context.StockItems.FirstOrDefaultAsync(item => item.Id == id);
            if (entity == null)
                return NotFound();

            entity.Name = dto.Name.Trim();
            entity.Sku = string.IsNullOrWhiteSpace(dto.Sku) ? null : dto.Sku.Trim();
            entity.Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "pcs" : dto.Unit.Trim();
            entity.StockType = dto.StockType;
            entity.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
            entity.ReorderLevel = dto.ReorderLevel;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("items/{id:int}")]
        public async Task<IActionResult> DeleteItem(int id)
        {
            var entity = await _context.StockItems
                .Include(item => item.Movements)
                .FirstOrDefaultAsync(item => item.Id == id);
            if (entity == null)
                return NotFound();

            _context.StockItems.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("items/{id:int}/movements")]
        public async Task<ActionResult<IEnumerable<StockMovementResponseDto>>> GetMovements(int id)
        {
            if (!await _context.StockItems.AnyAsync(item => item.Id == id))
                return NotFound();

            var movements = await _context.StockMovements.AsNoTracking()
                .Where(movement => movement.StockItemId == id)
                .OrderByDescending(movement => movement.OccurredAt)
                .ThenByDescending(movement => movement.Id)
                .Select(movement => new StockMovementResponseDto
                {
                    Id = movement.Id,
                    StockItemId = movement.StockItemId,
                    QuantityChange = movement.QuantityChange,
                    MovementKind = movement.MovementKind,
                    Note = movement.Note,
                    OccurredAt = movement.OccurredAt
                })
                .ToListAsync();

            return Ok(movements);
        }

        [HttpPost("items/{id:int}/movements")]
        public async Task<ActionResult<StockMovementResponseDto>> AddMovement(int id, [FromBody] AddStockMovementDto dto)
        {
            var item = await _context.StockItems.FirstOrDefaultAsync(item => item.Id == id);
            if (item == null)
                return NotFound();

            if (dto.QuantityChange == 0)
                return BadRequest(new { message = "QuantityChange cannot be zero." });

            var current = await _context.StockMovements
                .Where(movement => movement.StockItemId == id)
                .SumAsync(movement => movement.QuantityChange);
            if (dto.QuantityChange < 0 && current + dto.QuantityChange < 0)
                return BadRequest(new { message = "Stock cannot go negative.", current, requested = dto.QuantityChange });

            var movement = new StockMovement
            {
                StockItemId = id,
                QuantityChange = dto.QuantityChange,
                MovementKind = string.IsNullOrWhiteSpace(dto.MovementKind) ? null : dto.MovementKind.Trim(),
                Note = string.IsNullOrWhiteSpace(dto.Note) ? null : dto.Note.Trim(),
                OccurredAt = DateTime.UtcNow
            };
            _context.StockMovements.Add(movement);
            await _context.SaveChangesAsync();

            return Ok(new StockMovementResponseDto
            {
                Id = movement.Id,
                StockItemId = movement.StockItemId,
                QuantityChange = movement.QuantityChange,
                MovementKind = movement.MovementKind,
                Note = movement.Note,
                OccurredAt = movement.OccurredAt
            });
        }

        /// <summary>
        /// Applies invoice stock deductions using exact invoice line name to stock name/SKU matching.
        /// Kept for compatibility; invoice creation now calls the same service automatically.
        /// </summary>
        [HttpPost("apply-invoice-deductions")]
        public async Task<ActionResult<InvoiceStockDeductionResultDto>> ApplyInvoiceDeductions(
            [FromBody] InvoiceStockDeductionRequestDto body)
        {
            var stage = await _invoiceStockDeductionService.StageInvoiceDeductionsAsync(body);
            if (!string.IsNullOrWhiteSpace(stage.ErrorMessage))
                return BadRequest(new { message = stage.ErrorMessage });

            if (!stage.HasPendingDeductions)
                return Ok(stage.Result);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (_invoiceStockDeductionService.IsUniqueInvoiceDeductionViolation(ex))
            {
                stage.Result.Applied.Clear();
                stage.Result.AlreadyApplied = true;
                stage.Result.Message = AlreadyAppliedMessage;
            }

            return Ok(stage.Result);
        }

        private static bool IsValidStockType(StockType stockType)
        {
            return Enum.IsDefined(stockType);
        }
    }
}
