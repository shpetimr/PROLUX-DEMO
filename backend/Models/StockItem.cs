namespace backend.Models
{
    public class StockItem
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string? Sku { get; set; }
        public string Unit { get; set; } = "pcs";
        public StockType StockType { get; set; } = StockType.Material;
        public string? Description { get; set; }
        public decimal? ReorderLevel { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<StockMovement> Movements { get; set; } = new List<StockMovement>();
    }
}
