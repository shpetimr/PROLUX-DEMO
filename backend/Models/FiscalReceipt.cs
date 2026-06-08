using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class FiscalReceipt
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string ReceiptNumber { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? ClientRequestId { get; set; }

        [MaxLength(200)]
        public string? CustomerName { get; set; }

        [MaxLength(50)]
        public string? CustomerPhone { get; set; }

        [Required]
        public string ItemsJson { get; set; } = "[]";

        [Range(0, double.MaxValue)]
        public decimal Subtotal { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Total { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }

        public FiscalReceiptStatus Status { get; set; } = FiscalReceiptStatus.Archived;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? PrintedAt { get; set; }
        public DateTime? ArchivedAt { get; set; }

        public int CreatedById { get; set; }
        public User CreatedBy { get; set; } = null!;

        public FiscalReceiptArchive? Archive { get; set; }
    }

    public enum FiscalReceiptStatus
    {
        Draft,
        Printed,
        Archived,
        Cancelled
    }
}
