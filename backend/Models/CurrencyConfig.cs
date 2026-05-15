using System.Globalization;

namespace backend.Models
{
    public static class CurrencyConfig
    {
        public const decimal DefaultEurToMkdRate = 61.67m;
        public const string CurrencyCode = "MKD";
        public const string CurrencyName = "Denar";
        public const string CurrencySymbol = "MKD";
        public const string Locale = "mk-MK";
        
        public static class Display
        {
            public const string CurrencyFormat = "{0:N2} MKD";
            public const string CurrencyFormatWithSymbol = "{0:N2} MKD";
            public const string CurrencyFormatCompact = "{0:N0} MKD";
        }
        
        public static class Conversion
        {
            public static decimal EUR_TO_MKD_RATE => ReadPositiveDecimal(
                "EUR_TO_MKD_RATE",
                DefaultEurToMkdRate);
            public const decimal USD_TO_MKD_RATE = 56.85m;
            public const decimal ALL_TO_MKD_RATE = 0.58m; // Albanian Lek to MKD
        }

        public static decimal ConvertBaseToEur(decimal amount)
        {
            var rate = Conversion.EUR_TO_MKD_RATE;
            return rate > 0m
                ? amount / rate
                : 0m;
        }

        private static decimal ReadPositiveDecimal(string environmentVariableName, decimal fallback)
        {
            var rawValue = Environment.GetEnvironmentVariable(environmentVariableName);
            if (string.IsNullOrWhiteSpace(rawValue))
            {
                return fallback;
            }

            var normalized = rawValue.Trim().Replace(',', '.');
            return decimal.TryParse(
                normalized,
                NumberStyles.Number,
                CultureInfo.InvariantCulture,
                out var value) && value > 0m
                    ? value
                    : fallback;
        }
    }
}
