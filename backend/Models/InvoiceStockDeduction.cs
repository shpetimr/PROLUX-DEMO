namespace backend.Models
{
    public class InvoiceStockDeduction
    {
        public int Id { get; set; }
        public string DeductionKey { get; set; } = "";
        public string InvoiceNumber { get; set; } = "";
        public string? CustomerName { get; set; }
        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
    }
}
