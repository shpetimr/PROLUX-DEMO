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
    }
}
