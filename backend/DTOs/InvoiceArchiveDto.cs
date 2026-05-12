using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.DTOs
{
    public class CreateInvoiceArchiveDto
    {
        [StringLength(100)]
        public string? InvoiceNumber { get; set; }

        [StringLength(100)]
        public string? ClientRequestId { get; set; }

        [Required]
        [StringLength(200)]
        public string CustomerName { get; set; } = string.Empty;

        [StringLength(500)]
        public string? CustomerAddress { get; set; }

        [StringLength(50)]
        public string? CustomerPhone { get; set; }

        [Required]
        public InvoiceLanguage? Language { get; set; }

        [Required]
        public string ItemsJson { get; set; } = string.Empty;

        [Range(0, double.MaxValue)]
        public decimal Subtotal { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Total { get; set; }

        [StringLength(1000)]
        public string? Notes { get; set; }
    }

    public class InvoiceArchiveResponseDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string? CustomerAddress { get; set; }
        public string? CustomerPhone { get; set; }
        public InvoiceLanguage Language { get; set; }
        public string ItemsJson { get; set; } = string.Empty;
        public decimal Subtotal { get; set; }
        public decimal Total { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public int CreatedById { get; set; }
        public string CreatedByFullName { get; set; } = string.Empty;
        public InvoiceStockDeductionResultDto? StockDeduction { get; set; }
    }
}
