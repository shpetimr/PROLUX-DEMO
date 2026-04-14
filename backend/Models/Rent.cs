using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class Rent
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(200)]
        public string Location { get; set; } = string.Empty;
        
        [Required]
        public DateTime PaymentDate { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal MonthlyAmount { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // User who created this rent
        public int CreatedById { get; set; }
        public virtual User CreatedBy { get; set; } = null!;
    }
} 