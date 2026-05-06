using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class WorkSale
    {
        public int Id { get; set; }

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
        [Range(0, double.MaxValue)]
        public decimal TotalRevenue { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal TotalCost { get; set; }

        public decimal Profit { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [StringLength(1000)]
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        public int CreatedById { get; set; }
        public User CreatedBy { get; set; } = null!;
    }
}
