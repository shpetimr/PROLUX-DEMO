using backend.Models;

namespace backend.Services
{
    public static class SalaryCalculator
    {
        public const int StandardWorkingDaysPerMonth = 22;

        public static decimal CalculateMonthlySalary(Employee employee)
        {
            return CalculateMonthlySalary(employee, employee.AbsentDaysThisMonth);
        }

        public static decimal CalculateMonthlySalary(Employee employee, int absentDays)
        {
            var monthlySalary = GetMonthlySalary(employee);
            var dailyDeduction = CalculateDailyDeduction(monthlySalary);

            return monthlySalary - absentDays * dailyDeduction;
        }

        public static decimal CalculateDailyDeduction(decimal monthlySalary)
        {
            return monthlySalary / StandardWorkingDaysPerMonth;
        }

        public static decimal GetMonthlySalary(Employee employee)
        {
            return employee.BaseSalary > 0
                ? employee.BaseSalary
                : employee.DailyWage * StandardWorkingDaysPerMonth;
        }
    }
}
