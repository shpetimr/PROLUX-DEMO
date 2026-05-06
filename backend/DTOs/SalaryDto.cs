namespace backend.DTOs
{
    public class SalaryCalculationDto
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public int? LinkedUserId { get; set; }
        public string? LinkedUsername { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public decimal MonthlySalary { get; set; }
        public int AbsentDays { get; set; }
        public decimal DailyDeduction { get; set; }
        public decimal TotalDeduction { get; set; }
        public decimal FinalSalary { get; set; }
        public string Formula { get; set; } = string.Empty;
        public string CurrencyCode { get; set; } = "MKD";
        public string CurrencySymbol { get; set; } = "MKD";
    }
}
