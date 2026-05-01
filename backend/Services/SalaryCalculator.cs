using backend.Models;

namespace backend.Services
{
    public static class SalaryCalculator
    {
        public static decimal CalculateMonthlySalary(Employee employee)
        {
            var fullDayPay = employee.DaysWorkedThisMonth * employee.DailyWage;
            var halfDayPay = employee.HalfDaysThisMonth * employee.DailyWage / 2;
            var overtimePay = employee.TotalOvertimeHoursThisMonth * employee.OvertimeRate;
            var bonuses = employee.CalculatedDailyBonuses + employee.MonthlyBonuses;
            var penalties = employee.CalculatedDailyPenalties + employee.MonthlyPenalties;

            return fullDayPay + halfDayPay + overtimePay + bonuses - penalties;
        }
    }
}
