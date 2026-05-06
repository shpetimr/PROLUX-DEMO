using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.DTOs
{
    public class StockItemResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string? Sku { get; set; }
        public string Unit { get; set; } = "";
        public StockType StockType { get; set; } = StockType.Material;
        public string? Description { get; set; }
        public decimal? ReorderLevel { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal CurrentQuantity { get; set; }
    }

    public class CreateStockItemDto
    {
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = "";

        [StringLength(100)]
        public string? Sku { get; set; }

        [StringLength(20)]
        public string Unit { get; set; } = "pcs";

        public StockType StockType { get; set; } = StockType.Material;

        [StringLength(500)]
        public string? Description { get; set; }

        public decimal? ReorderLevel { get; set; }
    }

    public class UpdateStockItemDto
    {
        [Required]
        [StringLength(200)]
        public string Name { get; set; } = "";

        [StringLength(100)]
        public string? Sku { get; set; }

        [StringLength(20)]
        public string Unit { get; set; } = "pcs";

        public StockType StockType { get; set; } = StockType.Material;

        [StringLength(500)]
        public string? Description { get; set; }

        public decimal? ReorderLevel { get; set; }
    }

    public class StockMovementResponseDto
    {
        public int Id { get; set; }
        public int StockItemId { get; set; }
        public decimal QuantityChange { get; set; }
        public string? MovementKind { get; set; }
        public string? Note { get; set; }
        public DateTime OccurredAt { get; set; }
    }

    public class AddStockMovementDto
    {
        [Required]
        public decimal QuantityChange { get; set; }

        [StringLength(50)]
        public string? MovementKind { get; set; }

        [StringLength(500)]
        public string? Note { get; set; }
    }

    public class InvoiceStockDeductionLineDto
    {
        public string Name { get; set; } = "";
        public string M2Pcs { get; set; } = "";
    }

    public class InvoiceStockDeductionRequestDto
    {
        public List<InvoiceStockDeductionLineDto> Lines { get; set; } = new();
        public string? InvoiceNumber { get; set; }
        public string? CustomerName { get; set; }
    }

    public class InvoiceStockDeductionAppliedDto
    {
        public int StockItemId { get; set; }
        public string StockItemName { get; set; } = "";
        public decimal QuantityDeducted { get; set; }
    }

    public class InvoiceStockDeductionResultDto
    {
        public List<InvoiceStockDeductionAppliedDto> Applied { get; set; } = new();
        public List<string> Skipped { get; set; } = new();
    }
}
