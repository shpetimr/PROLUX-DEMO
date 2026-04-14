using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.DTOs
{
    public class CreateEmployeeDto
    {
        [Required]
        [StringLength(100)]
        public string fullName { get; set; } = string.Empty;
        
        [Required]
        public string position { get; set; } = "Magazine";
        
        //[StringLength(50)]
        //public string role { get; set; } = "Simple Worker";
        
        [Required]
        public string hireDate { get; set; } = string.Empty;
        


        [Required]
        [Range(0, double.MaxValue)]
        public decimal dailyWage { get; set; } // Custom daily wage set by admin

        [Range(0, 31)]
        public int daysWorkedThisMonth { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal monthlyBonuses { get; set; } = 0;

        [Range(0, double.MaxValue)]
        public decimal monthlyPenalties { get; set; } = 0;
        
        // New salary calculation system
        [Range(0, double.MaxValue)]
        public decimal dailyRate { get; set; } = 1800; // 1800 denarë per ditë
    }
    
    public class UpdateEmployeeDto
    {
        [StringLength(100)]
        public string? fullName { get; set; }
        
        public string? position { get; set; }
        
        //[StringLength(50)]
        //public string? role { get; set; }
        
        public string? hireDate { get; set; }
        

        
        [Range(0, double.MaxValue)]
        public decimal? dailyWage { get; set; } // Custom daily wage set by admin
        
        [Range(0, 31)]
        public int? daysWorkedThisMonth { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? monthlyBonuses { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? monthlyPenalties { get; set; }
        
        // New salary calculation system
        [Range(0, double.MaxValue)]
        public decimal? dailyRate { get; set; }
    }
    
    public class UpdateDaysWorkedDto
    {
        [Required]
        [Range(0, 31)]
        public int daysWorked { get; set; }
    }
    
    public class EmployeeResponseDto
    {
        public int id { get; set; }
        public string fullName { get; set; } = string.Empty;
        public string position { get; set; } = "Magazine";
        //public string role { get; set; } = "Simple Worker";
        public DateTime hireDate { get; set; }
        public decimal baseSalary { get; set; } = 0;
        public decimal dailyWage { get; set; } = 0; // Custom daily wage set by admin
        public int daysWorkedThisMonth { get; set; } = 0;
        public int halfDaysThisMonth { get; set; } = 0;
        public int absentDaysThisMonth { get; set; } = 0;
        public decimal totalOvertimeHoursThisMonth { get; set; } = 0;
        public decimal monthlyBonuses { get; set; } = 0;
        public decimal monthlyPenalties { get; set; } = 0;
        public decimal calculatedDailyBonuses { get; set; } = 0;
        public decimal calculatedDailyPenalties { get; set; } = 0;
        public decimal monthlySalary { get; set; } = 0; // Calculated monthly salary
        
        // New salary calculation system
        public decimal dailyRate { get; set; } = 1800; // 1800 denarë per ditë
        public decimal overtimeRate { get; set; } = 150; // 150 denarë per orë overtime
        public DateTime createdAt { get; set; }
        public DateTime? updatedAt { get; set; }
        public int? createdById { get; set; }
        public string currencyCode { get; set; } = "MKD";
        public string currencySymbol { get; set; } = "MKD";
    }
} 