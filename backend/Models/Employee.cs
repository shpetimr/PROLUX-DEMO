using System.ComponentModel.DataAnnotations;
using backend.Services;

namespace backend.Models
{
    public class Employee
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string FullName { get; set; } = string.Empty;
        
        [Required]
        public EmployeePosition Position { get; set; }
        
        // [StringLength(50)]
        // public string Role { get; set; } = "Simple Worker"; // E HEQIM
        
        [Required]
        public DateTime HireDate { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal BaseSalary { get; set; }
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal DailyWage { get; set; } // Custom daily wage set by admin
        
        // Calculated properties - will be updated based on attendance records
        public int DaysWorkedThisMonth { get; set; }
        
        public int HalfDaysThisMonth { get; set; }
        
        public int AbsentDaysThisMonth { get; set; }
        
        public decimal TotalOvertimeHoursThisMonth { get; set; }
        
        // Manual bonuses and penalties (for monthly bonuses/penalties)
        [Range(0, double.MaxValue)]
        public decimal MonthlyBonuses { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal MonthlyPenalties { get; set; }
        
        // Calculated bonuses and penalties from daily attendance
        public decimal CalculatedDailyBonuses { get; set; }
        
        public decimal CalculatedDailyPenalties { get; set; }
        
        // New salary calculation system based on days worked
        [Range(0, double.MaxValue)]
        public decimal DailyRate { get; set; } = 1800; // 1800 denarë per ditë
        
        public decimal OvertimeRate { get; set; } = 150; // 150 denarë per orë overtime
        
        public decimal CalculatedMonthlySalary => SalaryCalculator.CalculateMonthlySalary(this);
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // User who created this employee
        public int CreatedById { get; set; }
        public virtual User CreatedBy { get; set; } = null!;
        
        // Navigation properties
        public virtual ICollection<SalaryRecord> SalaryRecords { get; set; } = new List<SalaryRecord>();
        public virtual ICollection<AttendanceRecord> AttendanceRecords { get; set; } = new List<AttendanceRecord>();
    }
    
    public enum EmployeePosition
    {
        Magazine,   // Default: 1850 MKD/ditë
        Terren      // Default: 2460 MKD/ditë
    }
} 
