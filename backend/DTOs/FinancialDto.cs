using System.ComponentModel.DataAnnotations;

namespace backend.DTOs
{
    // Expense DTOs
    public class CreateExpenseDto
    {
        [Required]
        [StringLength(100)]
        public string expenseType { get; set; } = string.Empty;
        
        [Required]
        public string date { get; set; } = string.Empty;
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal amount { get; set; }
        
        [StringLength(500)]
        public string? description { get; set; }
    }
    
    public class UpdateExpenseDto
    {
        [StringLength(100)]
        public string? expenseType { get; set; }
        
        public string? date { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? amount { get; set; }
        
        [StringLength(500)]
        public string? description { get; set; }
    }
    
    public class ExpenseResponseDto
    {
        public int id { get; set; }
        public string expenseType { get; set; } = string.Empty;
        public DateTime date { get; set; }
        public decimal amount { get; set; }
        public string? description { get; set; }
        public DateTime createdAt { get; set; }
        public DateTime? updatedAt { get; set; }
        public string currencyCode { get; set; } = "MKD";
        public string currencySymbol { get; set; } = "MKD";
    }

    // Enhanced Expense Calculation DTOs
    public class DailyExpenseCalculationDto
    {
        public DateTime Date { get; set; }
        public decimal TotalAmount { get; set; }
        public int ExpenseCount { get; set; }
        public decimal AverageAmount { get; set; }
        public List<ExpenseTypeBreakdownDto> ExpensesByType { get; set; } = new();
        public List<HourlyBreakdownDto> HourlyBreakdown { get; set; } = new();
        public List<ExpenseItemDto> Expenses { get; set; } = new();
    }

    public class WeeklyExpenseCalculationDto
    {
        public DateTime WeekStart { get; set; }
        public DateTime WeekEnd { get; set; }
        public decimal TotalAmount { get; set; }
        public int ExpenseCount { get; set; }
        public decimal AverageAmount { get; set; }
        public decimal DailyAverage { get; set; }
        public List<ExpenseTypeBreakdownDto> ExpensesByType { get; set; } = new();
        public List<DailyBreakdownDto> DailyBreakdown { get; set; } = new();
        public List<ExpenseItemDto> Expenses { get; set; } = new();
    }

    public class MonthlyExpenseCalculationDto
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public string MonthName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public int ExpenseCount { get; set; }
        public decimal AverageAmount { get; set; }
        public decimal DailyAverage { get; set; }
        public decimal WeeklyAverage { get; set; }
        public List<ExpenseTypeBreakdownDto> ExpensesByType { get; set; } = new();
        public List<WeeklyBreakdownDto> WeeklyBreakdown { get; set; } = new();
        public List<DailyBreakdownDto> DailyBreakdown { get; set; } = new();
        public List<ExpenseItemDto> Expenses { get; set; } = new();
    }

    public class PeriodExpenseCalculationDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int PeriodDays { get; set; }
        public decimal TotalAmount { get; set; }
        public int ExpenseCount { get; set; }
        public decimal AverageAmount { get; set; }
        public decimal DailyAverage { get; set; }
        public List<ExpenseTypeBreakdownDto> ExpensesByType { get; set; } = new();
        public List<DailyBreakdownDto> DailyBreakdown { get; set; } = new();
        public List<ExpenseItemDto> Expenses { get; set; } = new();
    }

    public class ExpenseTypeBreakdownDto
    {
        public string Type { get; set; } = string.Empty;
        public decimal Total { get; set; }
        public int Count { get; set; }
        public decimal Percentage { get; set; }
        public decimal Average { get; set; }
    }

    public class HourlyBreakdownDto
    {
        public int Hour { get; set; }
        public decimal Amount { get; set; }
        public int Count { get; set; }
    }

    public class DailyBreakdownDto
    {
        public DateTime Date { get; set; }
        public string DayOfWeek { get; set; } = string.Empty;
        public int DayOfMonth { get; set; }
        public decimal Amount { get; set; }
        public int Count { get; set; }
        public List<ExpenseTypeSummaryDto> Types { get; set; } = new();
    }

    public class WeeklyBreakdownDto
    {
        public int WeekNumber { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Amount { get; set; }
        public int Count { get; set; }
    }

    public class ExpenseItemDto
    {
        public int Id { get; set; }
        public string ExpenseType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string? Description { get; set; }
    }

    public class ExpenseTypeSummaryDto
    {
        public string Type { get; set; } = string.Empty;
        public decimal Amount { get; set; }
    }

    public class ExpenseTrendDto
    {
        public string Period { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public List<MonthlyTrendDto> MonthlyTrends { get; set; } = new();
        public List<TypeTrendDto> TypeTrends { get; set; } = new();
    }

    public class MonthlyTrendDto
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public string MonthName { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public int ExpenseCount { get; set; }
        public decimal AverageAmount { get; set; }
        public decimal DailyAverage { get; set; }
    }

    public class TypeTrendDto
    {
        public string Type { get; set; } = string.Empty;
        public int Year { get; set; }
        public int Month { get; set; }
        public decimal TotalAmount { get; set; }
        public int Count { get; set; }
        public decimal AverageAmount { get; set; }
    }

    public class ExpenseForecastDto
    {
        public List<MonthlyTrendDto> HistoricalData { get; set; } = new();
        public List<ForecastDto> Forecast { get; set; } = new();
        public decimal AverageMonthlyExpense { get; set; }
        public double Trend { get; set; }
    }

    public class ForecastDto
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public string MonthName { get; set; } = string.Empty;
        public decimal ForecastedAmount { get; set; }
        public int Confidence { get; set; }
    }

    public class ComprehensiveExpenseReportDto
    {
        public PeriodDto Period { get; set; } = new();
        public ExpenseSummaryDto Summary { get; set; } = new();
        public List<ExpenseTypeBreakdownDto> ExpensesByType { get; set; } = new();
        public List<DailyBreakdownDto> DailyBreakdown { get; set; } = new();
        public List<WeeklyBreakdownDto> WeeklyBreakdown { get; set; } = new();
        public List<MonthlyTrendDto> MonthlyBreakdown { get; set; } = new();
        public List<ExpenseItemDto> TopExpenses { get; set; } = new();
    }

    public class PeriodDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }

    public class ExpenseSummaryDto
    {
        public decimal TotalExpenses { get; set; }
        public int ExpenseCount { get; set; }
        public decimal AverageExpense { get; set; }
        public decimal DailyAverage { get; set; }
    }

    public class FinancialImpactDto
    {
        public PeriodDto Period { get; set; } = new();
        public FinancialSummaryDto FinancialSummary { get; set; } = new();
        public List<ExpenseTypeBreakdownDto> ExpenseBreakdown { get; set; } = new();
        public CashFlowDto CashFlow { get; set; } = new();
    }

    public class FinancialSummaryDto
    {
        public decimal TotalIncome { get; set; }
        public decimal TotalExpenses { get; set; }
        public decimal TotalPurchases { get; set; }
        public decimal TotalRents { get; set; }
        public decimal TotalOutflow { get; set; }
        public decimal NetIncome { get; set; }
        public decimal ProfitMargin { get; set; }
    }

    public class CashFlowDto
    {
        public decimal Inflow { get; set; }
        public decimal Outflow { get; set; }
        public decimal Net { get; set; }
    }
    
    // Purchase DTOs
    public class CreatePurchaseDto
    {
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
        public string PurchaseDate { get; set; } = string.Empty;
        
        [StringLength(500)]
        public string? Description { get; set; }
    }
    
    public class UpdatePurchaseDto
    {
        [StringLength(200)]
        public string? ItemName { get; set; }
        
        [Range(1, int.MaxValue)]
        public int? Quantity { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? UnitPrice { get; set; }
        
        public string? PurchaseDate { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
    }
    
    public class PurchaseResponseDto
    {
        public int Id { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
        public DateTime PurchaseDate { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string currencyCode { get; set; } = "MKD";
        public string currencySymbol { get; set; } = "MKD";
    }
    
    // Rent DTOs
    public class CreateRentDto
    {
        [Required]
        [StringLength(200)]
        public string Location { get; set; } = string.Empty;
        
        [Required]
        public string PaymentDate { get; set; } = string.Empty;
        
        [Required]
        [Range(0, double.MaxValue)]
        public decimal MonthlyAmount { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
    }
    
    public class UpdateRentDto
    {
        [StringLength(200)]
        public string? Location { get; set; }
        
        public string? PaymentDate { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal? MonthlyAmount { get; set; }
        
        [StringLength(500)]
        public string? Description { get; set; }
    }
    
    public class RentResponseDto
    {
        public int Id { get; set; }
        public string Location { get; set; } = string.Empty;
        public DateTime PaymentDate { get; set; }
        public decimal MonthlyAmount { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string currencyCode { get; set; } = "MKD";
        public string currencySymbol { get; set; } = "MKD";
    }
    
    // Income DTOs
        public class CreateIncomeDto
    {
        [Required]
        [StringLength(200)]
        public string Source { get; set; } = string.Empty;

        [Required]
        public string Date { get; set; } = string.Empty;

        [Required]
        [Range(0, double.MaxValue)]
        public decimal Amount { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }
    }

    public class UpdateIncomeDto
    {
        [StringLength(200)]
        public string? Source { get; set; }

        public string? Date { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? Amount { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }
    }
    
    public class IncomeResponseDto
    {
        public int Id { get; set; }
        public string Source { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string currencyCode { get; set; } = "MKD";
        public string currencySymbol { get; set; } = "MKD";
    }
} 