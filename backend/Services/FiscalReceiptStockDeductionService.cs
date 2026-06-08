using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public class FiscalReceiptStockDeductionService : IFiscalReceiptStockDeductionService
    {
        public const string FiscalReceiptMovementKind = "FiscalReceipt";

        private const string FiscalReceiptDeductionKeyPrefix = "fiscal-receipt:";
        private const string AlreadyAppliedMessage =
            "Stock deduction was already applied for this fiscal receipt.";

        private readonly ApplicationDbContext _context;

        public FiscalReceiptStockDeductionService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<FiscalReceiptStockDeductionStageResult> StageFiscalReceiptDeductionsAsync(
            InvoiceStockDeductionRequestDto? request,
            bool reserveDeductionKeyWhenEmpty = false,
            CancellationToken cancellationToken = default)
        {
            var stage = new FiscalReceiptStockDeductionStageResult();
            var result = stage.Result;

            if (request == null)
            {
                stage.ErrorMessage = "Request body is required.";
                return stage;
            }

            if (!reserveDeductionKeyWhenEmpty && (request.Lines == null || request.Lines.Count == 0))
            {
                return stage;
            }

            var stockItems = await _context.StockItems.AsNoTracking().ToListAsync(cancellationToken);
            var itemIds = stockItems.Select(item => item.Id).ToList();
            var balances = itemIds.Count == 0
                ? new Dictionary<int, decimal>()
                : await _context.StockMovements
                    .Where(movement => itemIds.Contains(movement.StockItemId))
                    .GroupBy(movement => movement.StockItemId)
                    .Select(group => new { Id = group.Key, Quantity = group.Sum(item => item.QuantityChange) })
                    .ToDictionaryAsync(item => item.Id, item => item.Quantity, cancellationToken);

            var aggregated = new Dictionary<int, (StockItem Item, decimal Quantity)>();

            foreach (var line in request.Lines ?? Enumerable.Empty<InvoiceStockDeductionLineDto>())
            {
                var name = line.Name?.Trim() ?? "";
                if (string.IsNullOrEmpty(name))
                {
                    continue;
                }

                var quantity = ParseReceiptQuantity(line.M2Pcs);
                if (quantity <= 0)
                {
                    result.Skipped.Add($"{name}: quantity in m2/pcs must be greater than 0");
                    continue;
                }

                var matches = stockItems
                    .Where(item => IsStockItemMatch(item, name))
                    .Take(2)
                    .ToList();

                if (matches.Count == 0)
                {
                    result.Skipped.Add($"{name}: no stock item matched by name or SKU");
                    continue;
                }

                if (matches.Count > 1)
                {
                    stage.ErrorMessage =
                        $"Fiscal receipt line '{name}' matches multiple stock items. Use a unique stock name or SKU before issuing the receipt.";
                    return stage;
                }

                var match = matches[0];
                if (aggregated.TryGetValue(match.Id, out var existing))
                {
                    aggregated[match.Id] = (match, existing.Quantity + quantity);
                }
                else
                {
                    aggregated[match.Id] = (match, quantity);
                }
            }

            if (aggregated.Count == 0 && !reserveDeductionKeyWhenEmpty)
            {
                return stage;
            }

            var receiptNumber = NormalizeReceiptNumber(request.InvoiceNumber);
            if (string.IsNullOrWhiteSpace(receiptNumber))
            {
                stage.ErrorMessage = "Fiscal receipt number is required before deducting stock.";
                return stage;
            }

            var deductionKey = BuildFiscalReceiptDeductionKey(receiptNumber);
            if (await FiscalReceiptDeductionAlreadyAppliedAsync(deductionKey, receiptNumber, cancellationToken))
            {
                result.AlreadyApplied = true;
                result.Message = AlreadyAppliedMessage;
                return stage;
            }

            foreach (var item in aggregated.Values)
            {
                var balance = balances.TryGetValue(item.Item.Id, out var current) ? current : 0m;
                if (balance < item.Quantity)
                {
                    stage.ErrorMessage =
                        $"Insufficient stock for '{item.Item.Name}': in stock {balance}, fiscal receipt needs {item.Quantity}.";
                    return stage;
                }
            }

            var now = DateTime.UtcNow;
            _context.FiscalReceiptStockDeductions.Add(new FiscalReceiptStockDeduction
            {
                DeductionKey = deductionKey,
                ReceiptNumber = receiptNumber,
                CustomerName = string.IsNullOrWhiteSpace(request.CustomerName) ? null : request.CustomerName.Trim(),
                AppliedAt = now
            });

            if (aggregated.Count == 0)
            {
                stage.HasPendingDeductions = true;
                return stage;
            }

            var noteParts = new List<string> { $"No. {receiptNumber}" };
            if (!string.IsNullOrWhiteSpace(request.CustomerName))
            {
                noteParts.Add(request.CustomerName.Trim());
            }

            var noteBase = string.Join(" - ", noteParts);
            foreach (var item in aggregated.Values)
            {
                var unitCost = item.Item.BuyPrice;
                var costAmount = Math.Round(item.Quantity * unitCost, 2, MidpointRounding.AwayFromZero);

                _context.StockMovements.Add(new StockMovement
                {
                    StockItemId = item.Item.Id,
                    QuantityChange = -item.Quantity,
                    UnitCost = unitCost,
                    CostAmount = costAmount,
                    MovementKind = FiscalReceiptMovementKind,
                    Note = $"Fiscal receipt: {noteBase}",
                    OccurredAt = now
                });

                result.Applied.Add(new InvoiceStockDeductionAppliedDto
                {
                    StockItemId = item.Item.Id,
                    StockItemName = item.Item.Name,
                    QuantityDeducted = item.Quantity,
                    UnitCost = unitCost,
                    CostAmount = costAmount
                });
            }

            stage.HasPendingDeductions = true;
            return stage;
        }

        public InvoiceStockDeductionRequestDto BuildRequestFromReceiptPayload(
            string receiptNumber,
            string? customerName,
            string? itemsJson)
        {
            var request = new InvoiceStockDeductionRequestDto
            {
                InvoiceNumber = receiptNumber,
                CustomerName = customerName
            };

            if (string.IsNullOrWhiteSpace(itemsJson))
            {
                return request;
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
                    return request;
                }

                foreach (var item in items.EnumerateArray())
                {
                    if (item.ValueKind != JsonValueKind.Object)
                    {
                        continue;
                    }

                    request.Lines.Add(new InvoiceStockDeductionLineDto
                    {
                        Name = ReadString(item, "name", "itemName", "description"),
                        M2Pcs = ReadString(item, "m2pcs", "m2Pcs", "quantity", "qty", "unit")
                    });
                }
            }
            catch (JsonException)
            {
                return request;
            }

            return request;
        }

        public bool IsUniqueFiscalReceiptDeductionViolation(DbUpdateException exception)
        {
            for (var current = exception.InnerException; current != null; current = current.InnerException)
            {
                if (current.Message.Contains(
                        "IX_FiscalReceiptStockDeductions_DeductionKey",
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

        private async Task<bool> FiscalReceiptDeductionAlreadyAppliedAsync(
            string deductionKey,
            string receiptNumber,
            CancellationToken cancellationToken)
        {
            if (await _context.FiscalReceiptStockDeductions
                .AsNoTracking()
                .AnyAsync(deduction => deduction.DeductionKey == deductionKey, cancellationToken))
            {
                return true;
            }

            var candidateNotes = await _context.StockMovements
                .AsNoTracking()
                .Where(movement =>
                    movement.MovementKind == FiscalReceiptMovementKind &&
                    movement.Note != null &&
                    movement.Note.Contains(receiptNumber))
                .Select(movement => movement.Note!)
                .ToListAsync(cancellationToken);

            return candidateNotes.Any(note => IsFiscalReceiptDeductionNote(note, receiptNumber));
        }

        private static bool IsStockItemMatch(StockItem item, string receiptLineName)
        {
            return item.Name.Equals(receiptLineName, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrEmpty(item.Sku) &&
                 item.Sku.Equals(receiptLineName, StringComparison.OrdinalIgnoreCase));
        }

        private static bool IsFiscalReceiptDeductionNote(string note, string receiptNumber)
        {
            var markers = new[] { $"Nr. {receiptNumber}", $"No. {receiptNumber}" };
            foreach (var marker in markers)
            {
                var index = CultureInfo.InvariantCulture.CompareInfo.IndexOf(
                    note,
                    marker,
                    CompareOptions.IgnoreCase);

                if (index < 0)
                {
                    continue;
                }

                var afterMarker = index + marker.Length;
                return afterMarker >= note.Length || !char.IsLetterOrDigit(note[afterMarker]);
            }

            return false;
        }

        private static string NormalizeReceiptNumber(string? receiptNumber)
        {
            return receiptNumber?.Trim() ?? "";
        }

        private static string BuildFiscalReceiptDeductionKey(string receiptNumber)
        {
            return $"{FiscalReceiptDeductionKeyPrefix}{receiptNumber.ToUpperInvariant()}";
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
    }
}
