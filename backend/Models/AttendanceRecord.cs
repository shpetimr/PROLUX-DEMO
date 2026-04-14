using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class AttendanceRecord
    {
        public int Id { get; set; }
        
        public int EmployeeId { get; set; }
        
        [Required]
        public DateTime Date { get; set; }
        
        [Required]
        public bool IsPresent { get; set; } = true;
        
        public string? Notes { get; set; }
        
        // Additional fields for comprehensive tracking
        public decimal? DailyBonus { get; set; } = 0; // Bonus for this specific day
        
        public decimal? DailyPenalty { get; set; } = 0; // Penalty for this specific day
        
        public string? AbsenceReason { get; set; } // Reason for absence if not present
        
        public bool IsHalfDay { get; set; } = false; // For half-day attendance
        
        public decimal? OvertimeHours { get; set; } = 0; // Overtime hours for this day
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation property
        public virtual Employee Employee { get; set; } = null!;
    }
} 