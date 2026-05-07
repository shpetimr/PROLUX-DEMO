using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.DTOs;
using backend.Utilities;

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
            var calculation = await GetSalaryCalculationAsync(employeeId, month);
            return calculation.FinalSalary;
        }

        public async Task<SalaryCalculationDto> GetSalaryCalculationAsync(int employeeId, DateTime month)
        {
            var monthStart = DateTimeUtc.MonthStart(month.Year, month.Month);
            var monthEnd = monthStart.AddMonths(1);

            var existingRecord = await _context.SalaryRecords
                .AsNoTracking()
                .Include(record => record.Employee)
                .ThenInclude(employee => employee.UserAccount)
                .FirstOrDefaultAsync(record =>
                    record.EmployeeId == employeeId &&
                    record.Month >= monthStart &&
                    record.Month < monthEnd);

            if (existingRecord != null)
            {
                return BuildSalaryCalculation(existingRecord, monthStart);
            }

            var employee = await _context.Employees
                .AsNoTracking()
                .Include(e => e.UserAccount)
                .FirstOrDefaultAsync(e => e.Id == employeeId);
            if (employee == null)
                throw new ArgumentException("Employee not found");

            var absentDays = await _context.AttendanceRecords
                .AsNoTracking()
                .CountAsync(a =>
                    a.EmployeeId == employeeId &&
                    a.Date >= monthStart &&
                    a.Date < monthEnd &&
                    !a.IsPresent);

            return BuildSalaryCalculation(employee, absentDays, monthStart);
        }

        public async Task<List<SalaryCalculationDto>> GetSalaryCalculationsForMonthAsync(DateTime month)
        {
            var monthStart = DateTimeUtc.MonthStart(month.Year, month.Month);
            var monthEnd = monthStart.AddMonths(1);

            var employees = await _context.Employees
                .AsNoTracking()
                .Include(e => e.UserAccount)
                .OrderBy(e => e.FullName)
                .ToListAsync();

            var salaryRecords = await _context.SalaryRecords
                .AsNoTracking()
                .Where(record => record.Month >= monthStart && record.Month < monthEnd)
                .ToListAsync();
            var salaryRecordsByEmployeeId = salaryRecords
                .GroupBy(record => record.EmployeeId)
                .ToDictionary(
                    group => group.Key,
                    group => group.OrderByDescending(record => record.CreatedAt).First());

            var employeeIds = employees.Select(e => e.Id).ToList();
            var absentDaysByEmployee = await _context.AttendanceRecords
                .AsNoTracking()
                .Where(a =>
                    employeeIds.Contains(a.EmployeeId) &&
                    a.Date >= monthStart &&
                    a.Date < monthEnd &&
                    !a.IsPresent)
                .GroupBy(a => a.EmployeeId)
                .Select(group => new
                {
                    EmployeeId = group.Key,
                    AbsentDays = group.Count()
                })
                .ToDictionaryAsync(group => group.EmployeeId, group => group.AbsentDays);

            return employees
                .Select(employee =>
                    salaryRecordsByEmployeeId.TryGetValue(employee.Id, out var salaryRecord)
                        ? BuildSalaryCalculation(salaryRecord, monthStart, employee)
                        : BuildSalaryCalculation(
                            employee,
                            absentDaysByEmployee.TryGetValue(employee.Id, out var absentDays) ? absentDays : 0,
                            monthStart))
                .ToList();
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
            // Check if salary record already exists for this month
            var existingRecord = await _context.SalaryRecords
                .FirstOrDefaultAsync(sr => sr.EmployeeId == employeeId && 
                                          sr.Month.Year == month.Year && 
                                          sr.Month.Month == month.Month);

            if (existingRecord != null)
                throw new InvalidOperationException("Salary record already exists for this month");

            var calculation = await GetSalaryCalculationAsync(employeeId, month);

            var salaryRecord = new SalaryRecord
            {
                EmployeeId = employeeId,
                Month = new DateTime(month.Year, month.Month, 1),
                BaseSalary = calculation.MonthlySalary,
                Bonuses = 0,
                Penalties = calculation.TotalDeduction,
                TotalSalary = calculation.FinalSalary,
                DaysWorked = Math.Max(0, SalaryCalculator.StandardWorkingDaysPerMonth - calculation.AbsentDays),
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

        private static SalaryCalculationDto BuildSalaryCalculation(Employee employee, int absentDays, DateTime month)
        {
            var monthlySalary = SalaryCalculator.GetMonthlySalary(employee);
            var dailyDeduction = SalaryCalculator.CalculateDailyDeduction(monthlySalary);
            var totalDeduction = absentDays * dailyDeduction;

            return new SalaryCalculationDto
            {
                EmployeeId = employee.Id,
                EmployeeName = employee.FullName,
                LinkedUserId = employee.UserAccount?.Id,
                LinkedUsername = employee.UserAccount?.Username,
                Year = month.Year,
                Month = month.Month,
                MonthlySalary = monthlySalary,
                AbsentDays = absentDays,
                DailyDeduction = dailyDeduction,
                TotalDeduction = totalDeduction,
                FinalSalary = monthlySalary - totalDeduction,
                Formula = "Final salary = Monthly salary - absentDays * (Monthly salary / 22)"
            };
        }

        private static SalaryCalculationDto BuildSalaryCalculation(
            SalaryRecord record,
            DateTime month,
            Employee? employee = null)
        {
            var recordEmployee = employee ?? record.Employee;
            var absentDays = Math.Max(0, SalaryCalculator.StandardWorkingDaysPerMonth - record.DaysWorked);

            return new SalaryCalculationDto
            {
                EmployeeId = record.EmployeeId,
                EmployeeName = recordEmployee?.FullName ?? string.Empty,
                LinkedUserId = recordEmployee?.UserAccount?.Id,
                LinkedUsername = recordEmployee?.UserAccount?.Username,
                Year = month.Year,
                Month = month.Month,
                MonthlySalary = record.BaseSalary,
                AbsentDays = absentDays,
                DailyDeduction = SalaryCalculator.CalculateDailyDeduction(record.BaseSalary),
                TotalDeduction = record.Penalties,
                FinalSalary = record.TotalSalary,
                Formula = "Final salary = historical salary record total"
            };
        }
    }
} 
