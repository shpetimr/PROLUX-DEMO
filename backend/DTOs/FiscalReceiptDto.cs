using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.DTOs
{
    public class CreateFiscalReceiptDto
    {
        [StringLength(100)]
        public string? ReceiptNumber { get; set; }

        [StringLength(100)]
        public string? ClientRequestId { get; set; }

        [StringLength(200)]
        public string? CustomerName { get; set; }

        [StringLength(50)]
        public string? CustomerPhone { get; set; }

        [Required]
        public string ItemsJson { get; set; } = string.Empty;

        [Range(0, double.MaxValue)]
        public decimal Subtotal { get; set; }

        [Range(0, double.MaxValue)]
        public decimal Total { get; set; }

        [StringLength(1000)]
        public string? Notes { get; set; }
    }

    public class FiscalReceiptResponseDto
    {
        public int Id { get; set; }
        public int? ArchiveId { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public string ItemsJson { get; set; } = string.Empty;
        public decimal Subtotal { get; set; }
        public decimal Total { get; set; }
        public string? Notes { get; set; }
        public FiscalReceiptStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? PrintedAt { get; set; }
        public DateTime? ArchivedAt { get; set; }
        public int CreatedById { get; set; }
        public string CreatedByFullName { get; set; } = string.Empty;
        public InvoiceStockDeductionResultDto? StockDeduction { get; set; }
    }

    public class FiscalReceiptArchiveResponseDto
    {
        public int Id { get; set; }
        public int? FiscalReceiptId { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerPhone { get; set; }
        public string ItemsJson { get; set; } = string.Empty;
        public decimal Subtotal { get; set; }
        public decimal Total { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime PrintedAt { get; set; }
        public DateTime ArchivedAt { get; set; }
        public int CreatedById { get; set; }
        public string CreatedByFullName { get; set; } = string.Empty;
        public InvoiceStockDeductionResultDto? StockDeduction { get; set; }
    }
}
