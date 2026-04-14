using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class Expense
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string ExpenseType { get; set; } = string.Empty;
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal Amount { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // User who created this expense
        public int CreatedById { get; set; }
        public virtual User CreatedBy { get; set; } = null!;
    }
} 