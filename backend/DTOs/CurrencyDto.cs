namespace backend.DTOs
{
    public class CurrencyInfoDto
    {
        public string CurrencyCode { get; set; } = string.Empty;
        public string CurrencyName { get; set; } = string.Empty;
        public string CurrencySymbol { get; set; } = string.Empty;
        public string Locale { get; set; } = string.Empty;
        public CurrencyDisplayDto Display { get; set; } = new();
        public CurrencyConversionDto Conversion { get; set; } = new();
    }

    public class CurrencyDisplayDto
    {
        public string CurrencyFormat { get; set; } = string.Empty;
        public string CurrencyFormatWithSymbol { get; set; } = string.Empty;
        public string CurrencyFormatCompact { get; set; } = string.Empty;
    }

    public class CurrencyConversionDto
    {
        public decimal EurToMkdRate { get; set; }
        public decimal UsdToMkdRate { get; set; }
        public decimal AllToMkdRate { get; set; }
    }
} 