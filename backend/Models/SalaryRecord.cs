using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class SalaryRecord
    {
        public int Id { get; set; }
        
        public int EmployeeId { get; set; }
        
        [Required]
        public DateTime Month { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal BaseSalary { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal Bonuses { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? AttendanceDeduction { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal Penalties { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal TotalSalary { get; set; }
        
        public int DaysWorked { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation property
        public virtual Employee Employee { get; set; } = null!;
    }
}
