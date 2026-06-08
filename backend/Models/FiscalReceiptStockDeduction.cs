namespace backend.Models
{
    public class FiscalReceiptStockDeduction
    {
        public int Id { get; set; }
        public string DeductionKey { get; set; } = "";
        public string ReceiptNumber { get; set; } = "";
        public string? CustomerName { get; set; }
        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
    }
}
