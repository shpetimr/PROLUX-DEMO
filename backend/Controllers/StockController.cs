using System.Globalization;
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
    [Route("api/stock")]
    [Authorize(Policy = AppPermissions.StockManage)]
    public class StockController : ControllerBase
    {
        private const string InvoiceMovementKind = "Invoice";
        private const string InvoiceDeductionKeyPrefix = "invoice:";
        private const string AlreadyAppliedMessage = "Stock deduction was already applied for this invoice.";

        private readonly ApplicationDbContext _context;

        public StockController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("items")]
        public async Task<ActionResult<IEnumerable<StockItemResponseDto>>> GetItems([FromQuery] StockType? stockType)
        {
            if (stockType.HasValue && !IsValidStockType(stockType.Value))
                return BadRequest(new { message = "StockType must be Material or Product." });

            var query = _context.StockItems.AsNoTracking();
            if (stockType.HasValue)
            {
                query = query.Where(i => i.StockType == stockType.Value);
            }

            var items = await query.OrderBy(i => i.Name).ToListAsync();
            var ids = items.Select(i => i.Id).ToList();

            Dictionary<int, decimal> balances;
            if (ids.Count == 0)
            {
                balances = new Dictionary<int, decimal>();
            }
            else
            {
                balances = await _context.StockMovements
                    .Where(m => ids.Contains(m.StockItemId))
                    .GroupBy(m => m.StockItemId)
                    .Select(g => new { Id = g.Key, Qty = g.Sum(x => x.QuantityChange) })
                    .ToDictionaryAsync(x => x.Id, x => x.Qty);
            }

            var result = items.Select(i => new StockItemResponseDto
            {
                Id = i.Id,
                Name = i.Name,
                Sku = i.Sku,
                Unit = i.Unit,
                StockType = i.StockType,
                Description = i.Description,
                ReorderLevel = i.ReorderLevel,
                CreatedAt = i.CreatedAt,
                CurrentQuantity = balances.TryGetValue(i.Id, out var q) ? q : 0m
            });

            return Ok(result);
        }

        [HttpGet("items/{id:int}")]
        public async Task<ActionResult<StockItemResponseDto>> GetItem(int id)
        {
            var item = await _context.StockItems.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id);
            if (item == null) return NotFound();

            var qty = await _context.StockMovements.Where(m => m.StockItemId == id).SumAsync(m => m.QuantityChange);
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
                CurrentQuantity = qty
            });
        }

        [HttpPost("items")]
        public async Task<ActionResult<StockItemResponseDto>> CreateItem([FromBody] CreateStockItemDto dto)
        {
            if (!IsValidStockType(dto.StockType))
                return BadRequest(new { message = "StockType must be Material or Product." });

            var entity = new StockItem
            {
                Name = dto.Name.Trim(),
                Sku = string.IsNullOrWhiteSpace(dto.Sku) ? null : dto.Sku.Trim(),
                Unit = string.IsNullOrWhiteSpace(dto.Unit) ? "pcs" : dto.Unit.Trim(),
                StockType = dto.StockType,
                Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
                ReorderLevel = dto.ReorderLevel,
                CreatedAt = DateTime.UtcNow
            };
            _context.StockItems.Add(entity);
            await _context.SaveChangesAsync();

            var created = new StockItemResponseDto
            {
                Id = entity.Id,
                Name = entity.Name,
                Sku = entity.Sku,
                Unit = entity.Unit,
                StockType = entity.StockType,
                Description = entity.Description,
                ReorderLevel = entity.ReorderLevel,
                CreatedAt = entity.CreatedAt,
                CurrentQuantity = 0
            };
            return Ok(created);
        }

        [HttpPut("items/{id:int}")]
        public async Task<IActionResult> UpdateItem(int id, [FromBody] UpdateStockItemDto dto)
        {
            if (!IsValidStockType(dto.StockType))
                return BadRequest(new { message = "StockType must be Material or Product." });

            var entity = await _context.StockItems.FirstOrDefaultAsync(i => i.Id == id);
            if (entity == null) return NotFound();

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
            var entity = await _context.StockItems.Include(i => i.Movements).FirstOrDefaultAsync(i => i.Id == id);
            if (entity == null) return NotFound();

            _context.StockItems.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("items/{id:int}/movements")]
        public async Task<ActionResult<IEnumerable<StockMovementResponseDto>>> GetMovements(int id)
        {
            if (!await _context.StockItems.AnyAsync(i => i.Id == id))
                return NotFound();

            var movements = await _context.StockMovements.AsNoTracking()
                .Where(m => m.StockItemId == id)
                .OrderByDescending(m => m.OccurredAt)
                .ThenByDescending(m => m.Id)
                .Select(m => new StockMovementResponseDto
                {
                    Id = m.Id,
                    StockItemId = m.StockItemId,
                    QuantityChange = m.QuantityChange,
                    MovementKind = m.MovementKind,
                    Note = m.Note,
                    OccurredAt = m.OccurredAt
                })
                .ToListAsync();

            return Ok(movements);
        }

        [HttpPost("items/{id:int}/movements")]
        public async Task<ActionResult<StockMovementResponseDto>> AddMovement(int id, [FromBody] AddStockMovementDto dto)
        {
            var item = await _context.StockItems.FirstOrDefaultAsync(i => i.Id == id);
            if (item == null) return NotFound();

            if (dto.QuantityChange == 0)
                return BadRequest(new { message = "QuantityChange cannot be zero." });

            var current = await _context.StockMovements.Where(m => m.StockItemId == id).SumAsync(m => m.QuantityChange);
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
        /// Match each invoice line Name to a stock item (by name or SKU, case-insensitive).
        /// Quantity is taken from M2Pcs. Creates Out movements (negative) with kind "Invoice".
        /// </summary>
        [HttpPost("apply-invoice-deductions")]
        public async Task<ActionResult<InvoiceStockDeductionResultDto>> ApplyInvoiceDeductions(
            [FromBody] InvoiceStockDeductionRequestDto body)
        {
            var result = new InvoiceStockDeductionResultDto();
            if (body == null)
                return BadRequest(new { message = "Request body is required." });

            if (body.Lines == null || body.Lines.Count == 0)
                return Ok(result);

            var stockItems = await _context.StockItems.AsNoTracking().ToListAsync();
            var itemIds = stockItems.Select(s => s.Id).ToList();
            var balances = itemIds.Count == 0
                ? new Dictionary<int, decimal>()
                : await _context.StockMovements
                    .Where(m => itemIds.Contains(m.StockItemId))
                    .GroupBy(m => m.StockItemId)
                    .Select(g => new { Id = g.Key, Qty = g.Sum(x => x.QuantityChange) })
                    .ToDictionaryAsync(x => x.Id, x => x.Qty);

            var aggregated = new Dictionary<int, (StockItem Item, decimal Qty)>();

            foreach (var line in body.Lines)
            {
                var name = line.Name?.Trim() ?? "";
                if (string.IsNullOrEmpty(name))
                    continue;

                var qty = ParseInvoiceQuantity(line.M2Pcs);
                if (qty <= 0)
                {
                    result.Skipped.Add($"{name}: sasia në m2/pcs duhet të jetë më e madhe se 0");
                    continue;
                }

                var match = stockItems.FirstOrDefault(s =>
                    s.Name.Equals(name, StringComparison.OrdinalIgnoreCase) ||
                    (!string.IsNullOrEmpty(s.Sku) &&
                     s.Sku.Equals(name, StringComparison.OrdinalIgnoreCase)));

                if (match == null)
                {
                    result.Skipped.Add($"{name}: nuk përputhet me asnjë artikull në stok (emër ose SKU)");
                    continue;
                }

                if (aggregated.TryGetValue(match.Id, out var existing))
                    aggregated[match.Id] = (match, existing.Qty + qty);
                else
                    aggregated[match.Id] = (match, qty);
            }

            if (aggregated.Count == 0)
                return Ok(result);

            var invoiceNumber = NormalizeInvoiceNumber(body.InvoiceNumber);
            if (string.IsNullOrWhiteSpace(invoiceNumber))
            {
                return BadRequest(new { message = "Invoice number is required before deducting stock." });
            }

            var deductionKey = BuildInvoiceDeductionKey(invoiceNumber);
            if (await InvoiceDeductionAlreadyAppliedAsync(deductionKey, invoiceNumber))
            {
                result.AlreadyApplied = true;
                result.Message = AlreadyAppliedMessage;
                return Ok(result);
            }

            _context.InvoiceStockDeductions.Add(new InvoiceStockDeduction
            {
                DeductionKey = deductionKey,
                InvoiceNumber = invoiceNumber,
                CustomerName = string.IsNullOrWhiteSpace(body.CustomerName) ? null : body.CustomerName.Trim(),
                AppliedAt = DateTime.UtcNow
            });

            foreach (var kv in aggregated)
            {
                var bal = balances.TryGetValue(kv.Key, out var b) ? b : 0m;
                if (bal < kv.Value.Qty)
                {
                    return BadRequest(new
                    {
                        message = $"Stok i pamjaftueshëm për '{kv.Value.Item.Name}': në stok {bal}, në faturë {kv.Value.Qty}."
                    });
                }
            }

            var noteParts = new List<string>();
            noteParts.Add($"Nr. {invoiceNumber}");
            if (!string.IsNullOrWhiteSpace(body.CustomerName))
                noteParts.Add(body.CustomerName.Trim());
            var noteBase = noteParts.Count > 0 ? string.Join(" — ", noteParts) : "Faturë";

            foreach (var kv in aggregated)
            {
                var item = kv.Value.Item;
                var qty = kv.Value.Qty;
                var movement = new StockMovement
                {
                    StockItemId = item.Id,
                    QuantityChange = -qty,
                    MovementKind = InvoiceMovementKind,
                    Note = $"Faturë: {noteBase}",
                    OccurredAt = DateTime.UtcNow
                };
                _context.StockMovements.Add(movement);
                result.Applied.Add(new InvoiceStockDeductionAppliedDto
                {
                    StockItemId = item.Id,
                    StockItemName = item.Name,
                    QuantityDeducted = qty
                });
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsUniqueInvoiceDeductionViolation(ex))
            {
                result.Applied.Clear();
                result.AlreadyApplied = true;
                result.Message = AlreadyAppliedMessage;
            }

            return Ok(result);
        }

        private async Task<bool> InvoiceDeductionAlreadyAppliedAsync(string deductionKey, string invoiceNumber)
        {
            if (await _context.InvoiceStockDeductions
                .AsNoTracking()
                .AnyAsync(deduction => deduction.DeductionKey == deductionKey))
            {
                return true;
            }

            var candidateNotes = await _context.StockMovements
                .AsNoTracking()
                .Where(movement =>
                    movement.MovementKind == InvoiceMovementKind &&
                    movement.Note != null &&
                    movement.Note.Contains(invoiceNumber))
                .Select(movement => movement.Note!)
                .ToListAsync();

            return candidateNotes.Any(note => IsLegacyInvoiceDeductionNote(note, invoiceNumber));
        }

        private static bool IsLegacyInvoiceDeductionNote(string note, string invoiceNumber)
        {
            var marker = $"Nr. {invoiceNumber}";
            var index = CultureInfo.InvariantCulture.CompareInfo.IndexOf(
                note,
                marker,
                CompareOptions.IgnoreCase);

            if (index < 0)
                return false;

            var afterMarker = index + marker.Length;
            return afterMarker >= note.Length || !char.IsLetterOrDigit(note[afterMarker]);
        }

        private static string NormalizeInvoiceNumber(string? invoiceNumber)
        {
            return invoiceNumber?.Trim() ?? "";
        }

        private static string BuildInvoiceDeductionKey(string invoiceNumber)
        {
            return $"{InvoiceDeductionKeyPrefix}{invoiceNumber.ToUpperInvariant()}";
        }

        private static bool IsUniqueInvoiceDeductionViolation(DbUpdateException exception)
        {
            for (var current = exception.InnerException; current != null; current = current.InnerException)
            {
                if (current.Message.Contains(
                        "IX_InvoiceStockDeductions_DeductionKey",
                        StringComparison.OrdinalIgnoreCase) ||
                    current.Message.Contains(
                        "duplicate key value violates unique constraint",
                        StringComparison.OrdinalIgnoreCase) ||
                    current.Message.Contains(
                        "UNIQUE constraint failed",
                        StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        private static decimal ParseInvoiceQuantity(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return 0m;
            var s = raw.Trim().Replace(',', '.');
            return decimal.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var d)
                ? d
                : 0m;
        }

        private static bool IsValidStockType(StockType stockType)
        {
            return Enum.IsDefined(stockType);
        }
    }
}
