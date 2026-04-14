namespace backend.Models
{
    /// <summary>
    /// Quantity change: positive adds stock, negative removes stock.
    /// </summary>
    public class StockMovement
    {
        public int Id { get; set; }
        public int StockItemId { get; set; }
        public StockItem StockItem { get; set; } = null!;
        public decimal QuantityChange { get; set; }
        public string? MovementKind { get; set; }
        public string? Note { get; set; }
        public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    }
}
