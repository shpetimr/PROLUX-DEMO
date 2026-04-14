using backend.DTOs;

namespace backend.Services
{
    public interface IReportService
    {
        Task<FinancialReportDto> GetFinancialReportAsync(DateTime? startDate, DateTime? endDate, string? reportType = null);
        Task<MonthlyReportDto> GetMonthlyReportAsync(int year, int month);
        Task<YearlyReportDto> GetYearlyReportAsync(int year);
        Task<DashboardStatsDto> GetDashboardStatsAsync();
        Task<List<MonthlyReportDto>> GetMonthlyReportsForYearAsync(int year);
        
        // New comprehensive financial calculation methods
        Task<object> GetDailyFinancialCalculationsAsync(DateTime? date = null);
        Task<object> GetWeeklyFinancialCalculationsAsync(DateTime? startDate = null);
        Task<object> GetMonthlyFinancialCalculationsAsync(int? year = null, int? month = null);
        Task<object> GetAnnualFinancialCalculationsAsync(int? year = null);

        // Add missing breakdown methods for purchases
        Task<object> GetDailyPurchasesBreakdownAsync(DateTime? date = null);
        Task<object> GetWeeklyPurchasesBreakdownAsync(DateTime? startDate = null);
        Task<object> GetMonthlyPurchasesBreakdownAsync(int? year = null, int? month = null);
        Task<object> GetAnnualPurchasesBreakdownAsync(int? year = null);

        // New method for project and debt statistics (for dashboard removal)
        Task<object> GetProjectAndDebtStatsAsync();

        // New monthly tracking methods with date ranges
        Task<MonthlyTrackingDto> GetMonthlyTrackingAsync(DateTime startDate, DateTime endDate, bool includeDetails = true, bool includeBreakdowns = true);
        Task<MonthlyTrackingDto> GetMonthlyTrackingByMonthAsync(int year, int month, bool includeDetails = true, bool includeBreakdowns = true);
        Task<List<MonthlyTrackingDto>> GetMonthlyTrackingForYearAsync(int year, bool includeDetails = true, bool includeBreakdowns = true);
        Task<object> GetMonthlyTrackingSummaryAsync(DateTime startDate, DateTime endDate);
    }
} 