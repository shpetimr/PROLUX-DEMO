namespace backend.Models
{
    public static class CurrencyConfig
    {
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
            public const decimal EUR_TO_MKD_RATE = 61.67m;
            public const decimal USD_TO_MKD_RATE = 56.85m;
            public const decimal ALL_TO_MKD_RATE = 0.58m; // Albanian Lek to MKD
        }
    }
} 