using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    public class WorkSaleResponseDto
    {
        public int Id { get; set; }
        public string WorkName { get; set; } = string.Empty;
        public decimal TotalWorkM2 { get; set; }
        public decimal ClientPricePerM2 { get; set; }
        public decimal SubcontractorPricePerM2 { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalCost { get; set; }
        public decimal Profit { get; set; }
        public DateTime Date { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string CreatedByFullName { get; set; } = string.Empty;
        public string CurrencyCode { get; set; } = "MKD";
        public string CurrencySymbol { get; set; } = "MKD";
    }

    public class CreateWorkSaleDto
    {
        [Required]
        [StringLength(200)]
        public string WorkName { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal TotalWorkM2 { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal ClientPricePerM2 { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal SubcontractorPricePerM2 { get; set; }

        [Required]
        public string Date { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Notes { get; set; }
    }

    public class UpdateWorkSaleDto
    {
        [Required]
        [StringLength(200)]
        public string WorkName { get; set; } = string.Empty;

        [Required]
        [Range(0.01, double.MaxValue)]
        public decimal TotalWorkM2 { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal ClientPricePerM2 { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal SubcontractorPricePerM2 { get; set; }

        [Required]
        public string Date { get; set; } = string.Empty;

        [StringLength(1000)]
        public string? Notes { get; set; }
    }
}
