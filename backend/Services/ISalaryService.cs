using backend.Models;
using backend.DTOs;

namespace backend.Services
{
    public interface ISalaryService
    {
        Task<decimal> CalculateMonthlySalaryAsync(int employeeId, DateTime month);
        Task<SalaryCalculationDto> GetSalaryCalculationAsync(int employeeId, DateTime month);
        Task<List<SalaryCalculationDto>> GetSalaryCalculationsForMonthAsync(DateTime month);
        Task<SalaryRecord> CreateSalaryRecordAsync(int employeeId, DateTime month);
        Task<List<SalaryRecord>> GetEmployeeSalaryHistoryAsync(int employeeId);
        Task<decimal> GetTotalSalariesForPeriodAsync(DateTime startDate, DateTime endDate);
        Task<int> GetTotalDaysWorkedForPeriodAsync(DateTime startDate, DateTime endDate);
        decimal GetDailyWageForPosition(EmployeePosition position);
    }
} 
