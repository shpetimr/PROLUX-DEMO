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
                    !record.Employee.IsDeleted &&
                    record.Month >= monthStart &&
                    record.Month < monthEnd);

            if (existingRecord != null)
            {
                return BuildSalaryCalculation(existingRecord, monthStart);
            }

            var employee = await _context.Employees
                .AsNoTracking()
                .Include(e => e.UserAccount)
                .FirstOrDefaultAsync(e => e.Id == employeeId && !e.IsDeleted);
            if (employee == null)
                throw new ArgumentException("Employee not found");

            var attendanceTotals = await _context.AttendanceRecords
                .AsNoTracking()
                .Where(a =>
                    a.EmployeeId == employeeId &&
                    a.Date >= monthStart &&
                    a.Date < monthEnd)
                .GroupBy(a => a.EmployeeId)
                .Select(group => new AttendanceSalaryTotals
                {
                    EmployeeId = group.Key,
                    AbsentDays = group.Count(a => !a.IsPresent),
                    DailyBonuses = group.Sum(a => a.DailyBonus ?? 0),
                    DailyPenalties = group.Sum(a => a.DailyPenalty ?? 0)
                })
                .FirstOrDefaultAsync() ?? new AttendanceSalaryTotals { EmployeeId = employeeId };

            return BuildSalaryCalculation(employee, attendanceTotals, monthStart);
        }

        public async Task<List<SalaryCalculationDto>> GetSalaryCalculationsForMonthAsync(DateTime month)
        {
            var monthStart = DateTimeUtc.MonthStart(month.Year, month.Month);
            var monthEnd = monthStart.AddMonths(1);

            var employees = await _context.Employees
                .AsNoTracking()
                .Include(e => e.UserAccount)
                .Where(e => !e.IsDeleted)
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
            var attendanceTotalsByEmployee = await _context.AttendanceRecords
                .AsNoTracking()
                .Where(a =>
                    employeeIds.Contains(a.EmployeeId) &&
                    a.Date >= monthStart &&
                    a.Date < monthEnd)
                .GroupBy(a => a.EmployeeId)
                .Select(group => new AttendanceSalaryTotals
                {
                    EmployeeId = group.Key,
                    AbsentDays = group.Count(a => !a.IsPresent),
                    DailyBonuses = group.Sum(a => a.DailyBonus ?? 0),
                    DailyPenalties = group.Sum(a => a.DailyPenalty ?? 0)
                })
                .ToDictionaryAsync(group => group.EmployeeId);

            return employees
                .Select(employee =>
                    salaryRecordsByEmployeeId.TryGetValue(employee.Id, out var salaryRecord)
                        ? BuildSalaryCalculation(salaryRecord, monthStart, employee)
                        : BuildSalaryCalculation(
                            employee,
                            attendanceTotalsByEmployee.TryGetValue(employee.Id, out var attendanceTotals)
                                ? attendanceTotals
                                : new AttendanceSalaryTotals { EmployeeId = employee.Id },
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
                                          !sr.Employee.IsDeleted &&
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
                Bonuses = calculation.Bonuses,
                AttendanceDeduction = calculation.AttendanceDeduction,
                Penalties = calculation.Penalties,
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
                .Where(sr => sr.EmployeeId == employeeId && !sr.Employee.IsDeleted)
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

        private static SalaryCalculationDto BuildSalaryCalculation(
            Employee employee,
            AttendanceSalaryTotals attendanceTotals,
            DateTime month)
        {
            var monthlySalary = SalaryCalculator.GetMonthlySalary(employee);
            var dailyDeduction = SalaryCalculator.CalculateDailyDeduction(employee);
            var attendanceDeduction = attendanceTotals.AbsentDays * dailyDeduction;
            var bonuses = employee.MonthlyBonuses + attendanceTotals.DailyBonuses;
            var penalties = employee.MonthlyPenalties + attendanceTotals.DailyPenalties;
            var totalDeduction = attendanceDeduction + penalties;

            return new SalaryCalculationDto
            {
                EmployeeId = employee.Id,
                EmployeeName = employee.FullName,
                LinkedUserId = employee.UserAccount?.Id,
                LinkedUsername = employee.UserAccount?.Username,
                Year = month.Year,
                Month = month.Month,
                MonthlySalary = monthlySalary,
                AbsentDays = attendanceTotals.AbsentDays,
                DailyDeduction = dailyDeduction,
                AttendanceDeduction = attendanceDeduction,
                Bonuses = bonuses,
                Penalties = penalties,
                TotalDeduction = totalDeduction,
                FinalSalary = monthlySalary - attendanceDeduction + bonuses - penalties,
                Formula = "Final salary = Monthly salary - absentDays * daily salary + bonuses - penalties"
            };
        }

        private static SalaryCalculationDto BuildSalaryCalculation(
            SalaryRecord record,
            DateTime month,
            Employee? employee = null)
        {
            var recordEmployee = employee ?? record.Employee;
            var absentDays = Math.Max(0, SalaryCalculator.StandardWorkingDaysPerMonth - record.DaysWorked);
            var dailyDeduction = recordEmployee != null
                ? SalaryCalculator.CalculateDailyDeduction(recordEmployee)
                : 0;
            var deductions = SalaryCalculator.GetSalaryRecordDeductionBreakdown(record, recordEmployee);

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
                DailyDeduction = dailyDeduction,
                AttendanceDeduction = deductions.AttendanceDeduction,
                Bonuses = record.Bonuses,
                Penalties = deductions.Penalties,
                TotalDeduction = deductions.TotalDeduction,
                FinalSalary = record.TotalSalary,
                Formula = "Final salary = historical salary record total"
            };
        }

        private sealed class AttendanceSalaryTotals
        {
            public int EmployeeId { get; set; }
            public int AbsentDays { get; set; }
            public decimal DailyBonuses { get; set; }
            public decimal DailyPenalties { get; set; }
        }
    }
} 
