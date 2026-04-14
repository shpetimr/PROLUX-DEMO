using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public enum DebtType
    {
        OwedToCompany,    // Borxhet ndaj firmës
        CompanyOwes       // Borxhet që i ka firma
    }

    public class Debt
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(200)]
        public string DebtorName { get; set; } = string.Empty;
        
        [Required]
        public DebtType Type { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal Amount { get; set; }
        
        [Required]
        public DateTime DueDate { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
        
        public bool IsPaid { get; set; } = false;
        
        public DateTime? PaidDate { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // User who created this debt record
        public int CreatedById { get; set; }
        public virtual User CreatedBy { get; set; } = null!;
    }
} 