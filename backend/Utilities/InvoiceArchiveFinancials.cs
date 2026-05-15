using System.Globalization;
using System.Text.Json;
using backend.Models;

namespace backend.Utilities
{
    public static class InvoiceArchiveFinancials
    {
        public static decimal GetRevenueTotal(InvoiceArchive invoice)
        {
            return GetRevenueTotal(invoice.ItemsJson, invoice.Total);
        }

        public static decimal GetEurExchangeRate(InvoiceArchive invoice)
        {
            return GetEurExchangeRate(invoice.ItemsJson);
        }

        public static decimal GetEurExchangeRate(string? itemsJson)
        {
            return TryReadEurExchangeRate(itemsJson) ?? CurrencyConfig.Conversion.EUR_TO_MKD_RATE;
        }

        public static decimal GetTotalEur(InvoiceArchive invoice)
        {
            var rate = GetEurExchangeRate(invoice);
            return rate > 0m ? GetRevenueTotal(invoice) / rate : 0m;
        }

        public static decimal GetRevenueTotal(string? itemsJson, decimal storedTotal)
        {
            var officialTotal = TryReadOfficialTotalAfterDiscount(itemsJson);
            return officialTotal.HasValue ? Math.Max(0m, officialTotal.Value) : storedTotal;
        }

        private static decimal? TryReadEurExchangeRate(string? itemsJson)
        {
            if (string.IsNullOrWhiteSpace(itemsJson))
            {
                return null;
            }

            try
            {
                using var document = JsonDocument.Parse(itemsJson);
                var root = document.RootElement;

                if (root.ValueKind != JsonValueKind.Object ||
                    !TryGetProperty(root, "totals", out var totals) ||
                    totals.ValueKind != JsonValueKind.Object)
                {
                    return null;
                }

                var rate = TryReadDecimalProperty(totals, "eurExchangeRate")
                    ?? TryReadDecimalProperty(totals, "eurExchangeRateInput");
                return rate.HasValue && rate.Value > 0m ? rate.Value : null;
            }
            catch (JsonException)
            {
                return null;
            }
        }

        private static decimal? TryReadOfficialTotalAfterDiscount(string? itemsJson)
        {
            if (string.IsNullOrWhiteSpace(itemsJson))
            {
                return null;
            }

            try
            {
                using var document = JsonDocument.Parse(itemsJson);
                var root = document.RootElement;

                if (root.ValueKind != JsonValueKind.Object ||
                    !TryGetProperty(root, "totals", out var totals) ||
                    totals.ValueKind != JsonValueKind.Object)
                {
                    return null;
                }

                var totalAfterDiscount = TryReadDecimalProperty(totals, "totalAfterDiscount");
                if (totalAfterDiscount.HasValue)
                {
                    return totalAfterDiscount.Value;
                }

                var lineSubtotal = TryReadDecimalProperty(totals, "lineSubtotal");
                if (!lineSubtotal.HasValue)
                {
                    return null;
                }

                var discountAmount = TryReadDecimalProperty(totals, "discountAmount");
                if (discountAmount.HasValue)
                {
                    return lineSubtotal.Value - discountAmount.Value;
                }

                var discountPercent = TryReadDecimalProperty(totals, "discountPercent");
                return discountPercent.HasValue
                    ? lineSubtotal.Value - (lineSubtotal.Value * (discountPercent.Value / 100m))
                    : lineSubtotal.Value;
            }
            catch (JsonException)
            {
                return null;
            }
        }

        private static decimal? TryReadDecimalProperty(JsonElement element, string propertyName)
        {
            return TryGetProperty(element, propertyName, out var property)
                ? ReadDecimal(property)
                : null;
        }

        private static bool TryGetProperty(JsonElement element, string propertyName, out JsonElement value)
        {
            if (element.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in element.EnumerateObject())
                {
                    if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                    {
                        value = property.Value;
                        return true;
                    }
                }
            }

            value = default;
            return false;
        }

        private static decimal? ReadDecimal(JsonElement element)
        {
            if (element.ValueKind == JsonValueKind.Number && element.TryGetDecimal(out var numericValue))
            {
                return numericValue;
            }

            if (element.ValueKind != JsonValueKind.String)
            {
                return null;
            }

            var normalized = element.GetString()?.Trim().Replace(',', '.');
            return decimal.TryParse(
                normalized,
                NumberStyles.Number,
                CultureInfo.InvariantCulture,
                out var stringValue)
                ? stringValue
                : null;
        }
    }
}
