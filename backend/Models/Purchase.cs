using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class Purchase
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(200)]
        public string ItemName { get; set; } = string.Empty;
        
        [Required]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal UnitPrice { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal TotalPrice { get; set; }
        
        [Required]
        public DateTime PurchaseDate { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // User who created this purchase
        public int CreatedById { get; set; }
        public virtual User CreatedBy { get; set; } = null!;
    }
} 