using backend.Models;

namespace backend.Services
{
    public static class SalaryCalculator
    {
        public const int StandardWorkingDaysPerMonth = 26;

        public static decimal CalculateMonthlySalary(Employee employee)
        {
            return CalculateMonthlySalary(employee, employee.AbsentDaysThisMonth);
        }

        public static decimal CalculateMonthlySalary(Employee employee, int absentDays)
        {
            var monthlySalary = GetMonthlySalary(employee);
            var dailyDeduction = CalculateDailyDeduction(employee);
            var totalBonuses = GetTotalBonuses(employee);
            var totalPenalties = GetTotalPenalties(employee);

            return monthlySalary - absentDays * dailyDeduction + totalBonuses - totalPenalties;
        }

        public static decimal CalculateDailyDeduction(Employee employee)
        {
            return GetDailySalary(employee);
        }

        public static decimal GetMonthlySalary(Employee employee)
        {
            return employee.BaseSalary > 0
                ? employee.BaseSalary
                : GetDailySalary(employee) * StandardWorkingDaysPerMonth;
        }

        public static decimal GetDailySalary(Employee employee)
        {
            if (employee.DailyWage > 0)
            {
                return employee.DailyWage;
            }

            return employee.DailyRate > 0 ? employee.DailyRate : 0;
        }

        public static decimal GetTotalBonuses(Employee employee)
        {
            return employee.MonthlyBonuses + employee.CalculatedDailyBonuses;
        }

        public static decimal GetTotalPenalties(Employee employee)
        {
            return employee.MonthlyPenalties + employee.CalculatedDailyPenalties;
        }

        public static SalaryRecordDeductionBreakdown GetSalaryRecordDeductionBreakdown(
            SalaryRecord record,
            Employee? employee = null)
        {
            if (record.AttendanceDeduction.HasValue)
            {
                return new SalaryRecordDeductionBreakdown(
                    Math.Max(0, record.AttendanceDeduction.Value),
                    Math.Max(0, record.Penalties));
            }

            var absentDays = Math.Max(0, StandardWorkingDaysPerMonth - record.DaysWorked);
            var dailyDeduction = employee != null ? CalculateDailyDeduction(employee) : 0;
            var inferredAttendanceDeduction = Math.Min(
                Math.Max(0, record.Penalties),
                absentDays * dailyDeduction);

            return new SalaryRecordDeductionBreakdown(
                inferredAttendanceDeduction,
                Math.Max(0, record.Penalties - inferredAttendanceDeduction));
        }
    }

    public readonly record struct SalaryRecordDeductionBreakdown(
        decimal AttendanceDeduction,
        decimal Penalties)
    {
        public decimal TotalDeduction => AttendanceDeduction + Penalties;
    }
}
