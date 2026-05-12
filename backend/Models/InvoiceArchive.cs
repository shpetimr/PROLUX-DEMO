using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class InvoiceArchive
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string InvoiceNumber { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? ClientRequestId { get; set; }

        [Required]
        [MaxLength(200)]
        public string CustomerName { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? CustomerAddress { get; set; }

        [MaxLength(50)]
        public string? CustomerPhone { get; set; }

        [Required]
        public InvoiceLanguage Language { get; set; } = InvoiceLanguage.Albanian;

        [Required]
        public string ItemsJson { get; set; } = "[]";

        [Range(0, double.MaxValue)]
        public decimal Subtotal { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Total { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int CreatedById { get; set; }
        public User CreatedBy { get; set; } = null!;
    }

    public enum InvoiceLanguage
    {
        Albanian,
        Macedonian
    }
}
