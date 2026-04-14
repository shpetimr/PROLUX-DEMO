using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.DTOs;

namespace backend.Services
{
    public class SalaryService : ISalaryService
    {
        private readonly ApplicationDbContext _context;

        public SalaryService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<decimal> CalculateMonthlySalaryAsync(int employeeId, DateTime month)
        {
            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee == null)
                throw new ArgumentException("Employee not found");

            // Use the comprehensive salary calculation from the Employee model
            decimal totalSalary = employee.CalculatedMonthlySalary;
            
            // Debug logging
            Console.WriteLine($"=== SALARY CALCULATION DEBUG ===");
            Console.WriteLine($"Employee: {employee.FullName}");
            Console.WriteLine($"Daily Wage: {employee.DailyWage}");
            Console.WriteLine($"Days Worked: {employee.DaysWorkedThisMonth}");
            Console.WriteLine($"Half Days: {employee.HalfDaysThisMonth}");
            Console.WriteLine($"Overtime Hours: {employee.TotalOvertimeHoursThisMonth}");
            Console.WriteLine($"Daily Bonuses: {employee.CalculatedDailyBonuses}");
            Console.WriteLine($"Daily Penalties: {employee.CalculatedDailyPenalties}");
            Console.WriteLine($"Monthly Bonuses: {employee.MonthlyBonuses}");
            Console.WriteLine($"Monthly Penalties: {employee.MonthlyPenalties}");
            Console.WriteLine($"Total Salary: {totalSalary}");
            Console.WriteLine($"=== END SALARY CALCULATION DEBUG ===");
            
            return Math.Max(0, totalSalary); // Ensure salary is not negative
        }

        public decimal GetDailyWageForPosition(EmployeePosition position)
        {
            // This method now provides default daily wages for new employees
            // The actual calculation uses the employee's custom daily wage
            return position switch
            {
                EmployeePosition.Magazine => 1850.0m,   // Default: 1850 MKD/ditë
                EmployeePosition.Terren => 2460.0m,     // Default: 2460 MKD/ditë
                _ => throw new ArgumentException("Invalid position")
            };
        }

        public async Task<SalaryRecord> CreateSalaryRecordAsync(int employeeId, DateTime month)
        {
            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee == null)
                throw new ArgumentException("Employee not found");

            // Check if salary record already exists for this month
            var existingRecord = await _context.SalaryRecords
                .FirstOrDefaultAsync(sr => sr.EmployeeId == employeeId && 
                                          sr.Month.Year == month.Year && 
                                          sr.Month.Month == month.Month);

            if (existingRecord != null)
                throw new InvalidOperationException("Salary record already exists for this month");

            decimal totalSalary = await CalculateMonthlySalaryAsync(employeeId, month);

            var salaryRecord = new SalaryRecord
            {
                EmployeeId = employeeId,
                Month = new DateTime(month.Year, month.Month, 1),
                BaseSalary = employee.DailyWage, // Store the daily wage as base salary
                Bonuses = employee.MonthlyBonuses + employee.CalculatedDailyBonuses,
                Penalties = employee.MonthlyPenalties + employee.CalculatedDailyPenalties,
                TotalSalary = totalSalary,
                DaysWorked = employee.DaysWorkedThisMonth,
                CreatedAt = DateTime.UtcNow
            };

            _context.SalaryRecords.Add(salaryRecord);
            await _context.SaveChangesAsync();

            return salaryRecord;
        }

        public async Task<List<SalaryRecord>> GetEmployeeSalaryHistoryAsync(int employeeId)
        {
            return await _context.SalaryRecords
                .Where(sr => sr.EmployeeId == employeeId)
                .OrderByDescending(sr => sr.Month)
                .ToListAsync();
        }

        public async Task<decimal> GetTotalSalariesForPeriodAsync(DateTime startDate, DateTime endDate)
        {
            return await _context.SalaryRecords
                .Where(sr => sr.Month >= startDate && sr.Month <= endDate)
                .SumAsync(sr => sr.TotalSalary);
        }

        public async Task<int> GetTotalDaysWorkedForPeriodAsync(DateTime startDate, DateTime endDate)
        {
            return await _context.SalaryRecords
                .Where(sr => sr.Month >= startDate && sr.Month <= endDate)
                .SumAsync(sr => sr.DaysWorked);
        }
    }
} 