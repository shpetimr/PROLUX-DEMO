namespace backend.DTOs
{
    public class AttendanceDto
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public bool IsPresent { get; set; }
        public string? Notes { get; set; }
        public decimal? DailyBonus { get; set; }
        public decimal? DailyPenalty { get; set; }
        public string? AbsenceReason { get; set; }
        public bool IsHalfDay { get; set; }
        public decimal? OvertimeHours { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class CreateAttendanceDto
    {
        public int EmployeeId { get; set; }
        public DateTime Date { get; set; }
        public bool IsPresent { get; set; } = true;
        public string? Notes { get; set; }
        public decimal? DailyBonus { get; set; } = 0;
        public decimal? DailyPenalty { get; set; } = 0;
        public string? AbsenceReason { get; set; }
        public bool IsHalfDay { get; set; } = false;
        public decimal? OvertimeHours { get; set; } = 0;
    }

    public class UpdateAttendanceDto
    {
        public bool IsPresent { get; set; }
        public string? Notes { get; set; }
        public decimal? DailyBonus { get; set; }
        public decimal? DailyPenalty { get; set; }
        public string? AbsenceReason { get; set; }
        public bool IsHalfDay { get; set; }
        public decimal? OvertimeHours { get; set; }
    }

    public class MonthlyAttendanceDto
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public int Year { get; set; }
        public int Month { get; set; }
        public int DaysWorked { get; set; }
        public int HalfDays { get; set; }
        public int AbsentDays { get; set; }
        public decimal TotalOvertimeHours { get; set; }
        public decimal TotalDailyBonuses { get; set; }
        public decimal TotalDailyPenalties { get; set; }
        public int TotalDaysInMonth { get; set; }
        public List<AttendanceDto> DailyRecords { get; set; } = new List<AttendanceDto>();
    }
} 