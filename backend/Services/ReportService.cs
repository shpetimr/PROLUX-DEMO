using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Services;
using backend.Models;
using backend.Utilities;

namespace backend.Services
{
    public class ReportService : IReportService
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ReportService(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<FinancialReportDto> GetFinancialReportAsync(DateTime? startDate, DateTime? endDate, string? reportType = null)
        {
            // Determine the date range based on reportType
            if (!string.IsNullOrEmpty(reportType))
            {
                var now = DateTimeUtc.Today();
                if (reportType == "daily")
                {
                    startDate = now;
                    endDate = now;
                }
                else if (reportType == "weekly")
                {
                    startDate = now.AddDays(-(int)now.DayOfWeek);
                    endDate = startDate.Value.AddDays(6);
                }
                else if (reportType == "monthly")
                {
                    startDate = DateTimeUtc.MonthStart(now.Year, now.Month);
                    endDate = startDate.Value.AddMonths(1).AddDays(-1);
                }
                else if (reportType == "yearly")
                {
                    startDate = DateTimeUtc.YearStart(now.Year);
                    endDate = startDate.Value.AddYears(1).AddDays(-1);
                }
            }

            // If no date range is provided, use the full range of data
            bool allTime = (!startDate.HasValue && !endDate.HasValue);
            var normalizedStartDate = startDate.HasValue ? DateTimeUtc.Normalize(startDate.Value) : (DateTime?)null;
            var normalizedEndDate = endDate.HasValue ? DateTimeUtc.Date(endDate.Value) : (DateTime?)null;
            var endExclusive = normalizedEndDate?.AddDays(1);

            var expenses = _context.Expenses.AsQueryable();
            var rents = _context.Rents.AsQueryable();
            var purchases = _context.Purchases.AsQueryable();
            var incomes = _context.Incomes.AsQueryable();

            if (!allTime)
            {
                if (normalizedStartDate.HasValue)
                {
                    expenses = expenses.Where(e => e.Date >= normalizedStartDate.Value);
                    rents = rents.Where(r => r.PaymentDate >= normalizedStartDate.Value);
                    purchases = purchases.Where(p => p.PurchaseDate >= normalizedStartDate.Value);
                    incomes = incomes.Where(i => i.Date >= normalizedStartDate.Value);
                }
                if (endExclusive.HasValue)
                {
                    expenses = expenses.Where(e => e.Date < endExclusive.Value);
                    rents = rents.Where(r => r.PaymentDate < endExclusive.Value);
                    purchases = purchases.Where(p => p.PurchaseDate < endExclusive.Value);
                    incomes = incomes.Where(i => i.Date < endExclusive.Value);
                }
            }

            var totalExpenses = (decimal)await expenses.SumAsync(e => (double)e.Amount);
            var totalRent = (decimal)await rents.SumAsync(r => (double)r.MonthlyAmount);
            var totalPurchases = (decimal)await purchases.SumAsync(p => (double)p.TotalPrice);
            var totalIncome = (decimal)await incomes.SumAsync(i => (double)i.Amount);
            var netBalance = totalIncome - (totalExpenses + totalRent + totalPurchases);

            return new FinancialReportDto
            {
                TotalSalaries = 0, // Salary calculation removed
                TotalExpenses = totalExpenses,
                TotalPurchases = totalPurchases,
                TotalRents = totalRent,
                TotalIncome = totalIncome,
                NetBalance = netBalance,
                StartDate = normalizedStartDate ?? DateTime.MinValue,
                EndDate = normalizedEndDate ?? DateTime.MaxValue
            };
        }

        public async Task<MonthlyReportDto> GetMonthlyReportAsync(int year, int month)
        {
            var startDate = DateTimeUtc.MonthStart(year, month);
            var endDate = startDate.AddMonths(1).AddDays(-1);
            
            var report = await GetFinancialReportAsync(startDate, endDate);
            
            return new MonthlyReportDto
            {
                Year = year,
                Month = month,
                TotalSalaries = report.TotalSalaries,
                TotalExpenses = report.TotalExpenses,
                TotalRent = report.TotalRents,
                TotalPurchases = report.TotalPurchases,
                TotalIncome = report.TotalIncome,
                NetProfit = report.NetBalance,
                EmployeeCount = report.EmployeeCount
            };
        }

        public async Task<YearlyReportDto> GetYearlyReportAsync(int year)
        {
            var startDate = DateTimeUtc.YearStart(year);
            var endDate = startDate.AddYears(1).AddDays(-1);
            
            var report = await GetFinancialReportAsync(startDate, endDate);
            var monthlyBreakdown = await GetMonthlyReportsForYearAsync(year);
            
            return new YearlyReportDto
            {
                Year = year,
                TotalSalaries = report.TotalSalaries,
                TotalExpenses = report.TotalExpenses,
                TotalRent = report.TotalRents,
                TotalPurchases = report.TotalPurchases,
                TotalIncome = report.TotalIncome,
                NetProfit = report.NetBalance,
                EmployeeCount = report.EmployeeCount,
                MonthlyBreakdown = monthlyBreakdown
            };
        }

        public async Task<DashboardStatsDto> GetDashboardStatsAsync()
        {
            try
            {
                var currentDate = DateTime.UtcNow;
                var currentMonthStart = DateTimeUtc.MonthStart(currentDate.Year, currentDate.Month);
                var currentMonthEnd = currentMonthStart.AddMonths(1);
                var yearStart = DateTimeUtc.YearStart(currentDate.Year);
                
                // Filter data based on user role
                var currentUserId = _currentUserService.GetCurrentUserId();
                var isAdmin = _currentUserService.IsAdmin();
                var expensesQuery = _context.Expenses.AsQueryable();
                var purchasesQuery = _context.Purchases.AsQueryable();

                if (!isAdmin)
                {
                    expensesQuery = expensesQuery.Where(e => e.CreatedById == currentUserId);
                    purchasesQuery = purchasesQuery.Where(p => p.CreatedById == currentUserId);
                }
                
                // Employee statistics with new position system (only for admins)
                var totalEmployees = isAdmin ? await _context.Employees.CountAsync() : 0;
                var magazineEmployees = isAdmin ? await _context.Employees.CountAsync(e => e.Position == Models.EmployeePosition.Magazine) : 0;
                var terrenEmployees = isAdmin ? await _context.Employees.CountAsync(e => e.Position == Models.EmployeePosition.Terren) : 0;
                
                // Calculate current month salaries using new system
                var employees = isAdmin ? await _context.Employees.ToListAsync() : new List<Models.Employee>();
                var currentMonthSalaries = employees.Sum(e => e.CalculatedMonthlySalary);
                var averageSalary = employees.Any() ? currentMonthSalaries / employees.Count : 0;
                
                // Calculate current month financial data
                var currentMonthExpenses = await expensesQuery
                    .Where(e => e.Date >= currentMonthStart && e.Date < currentMonthEnd)
                    .SumAsync(e => e.Amount);
                    
                var currentMonthIncome = isAdmin
                    ? await _context.Incomes
                        .Where(i => i.Date >= currentMonthStart && i.Date < currentMonthEnd)
                        .SumAsync(i => i.Amount)
                    : 0m;
                    
                var currentMonthPurchases = await purchasesQuery
                    .Where(p => p.PurchaseDate >= currentMonthStart && p.PurchaseDate < currentMonthEnd)
                    .SumAsync(p => p.TotalPrice);
                    
                var currentMonthRents = isAdmin
                    ? await _context.Rents
                        .Where(r => r.PaymentDate >= currentMonthStart && r.PaymentDate < currentMonthEnd)
                        .SumAsync(r => r.MonthlyAmount)
                    : 0m;
                    
                var currentMonthProfit = currentMonthIncome - (currentMonthExpenses + currentMonthPurchases + currentMonthRents + currentMonthSalaries);
                
                // Calculate year to date data
                var yearToDateIncome = isAdmin
                    ? await _context.Incomes
                        .Where(i => i.Date >= yearStart && i.Date <= currentDate)
                        .SumAsync(i => i.Amount)
                    : 0m;
                    
                var yearToDateExpenses = await expensesQuery
                    .Where(e => e.Date >= yearStart && e.Date <= currentDate)
                    .SumAsync(e => e.Amount);
                    
                var yearToDateProfit = yearToDateIncome - yearToDateExpenses;
                
                // Calculate total data
                var totalExpenses = await expensesQuery.SumAsync(e => e.Amount);
                var totalIncomes = isAdmin ? await _context.Incomes.SumAsync(i => i.Amount) : 0m;
                var totalPurchases = await purchasesQuery.SumAsync(p => p.TotalPrice);
                var totalRents = isAdmin ? await _context.Rents.SumAsync(r => r.MonthlyAmount) : 0m;
                
                return new DashboardStatsDto
                {
                    TotalEmployees = totalEmployees,
                    WarehouseEmployees = magazineEmployees,
                    FieldEmployees = terrenEmployees,
                    CurrentMonthSalaries = currentMonthSalaries,
                    CurrentMonthExpenses = currentMonthExpenses,
                    CurrentMonthIncome = currentMonthIncome,
                    CurrentMonthProfit = currentMonthProfit,
                    YearToDateIncome = yearToDateIncome,
                    YearToDateExpenses = yearToDateExpenses,
                    YearToDateProfit = yearToDateProfit,
                    TotalExpenses = totalExpenses,
                    TotalIncomes = totalIncomes,
                    TotalPurchases = totalPurchases,
                    TotalRents = totalRents,
                    AverageSalary = averageSalary
                };
            }
            catch (Exception)
            {
                throw;
            }
        }

        // New comprehensive financial calculation methods

        public async Task<object> GetDailyFinancialCalculationsAsync(DateTime? date = null)
        {
            var targetDate = DateTimeUtc.Date(date ?? DateTime.UtcNow);
            var nextDate = targetDate.AddDays(1);
            var dailyExpenses = await _context.Expenses
                .Where(e => e.Date >= targetDate && e.Date < nextDate)
                .ToListAsync();

            var dailyIncomes = await _context.Incomes
                .Where(i => i.Date >= targetDate && i.Date < nextDate)
                .ToListAsync();

            var dailyPurchases = await _context.Purchases
                .Where(p => p.PurchaseDate >= targetDate && p.PurchaseDate < nextDate)
                .ToListAsync();

            var dailyRents = await _context.Rents
                .Where(r => r.PaymentDate >= targetDate && r.PaymentDate < nextDate)
                .ToListAsync();

            var totalExpenses = dailyExpenses.Sum(e => e.Amount);
            var totalIncome = dailyIncomes.Sum(i => i.Amount);
            var totalPurchases = dailyPurchases.Sum(p => p.TotalPrice);
            var totalRents = dailyRents.Sum(r => r.MonthlyAmount);
            var totalOutflow = totalExpenses + totalPurchases + totalRents;
            var netIncome = totalIncome - totalOutflow;

            var expensesByType = dailyExpenses
                .GroupBy(e => e.ExpenseType)
                .Select(g => new
                {
                    Type = g.Key,
                    Total = g.Sum(e => e.Amount),
                    Count = g.Count(),
                    Percentage = totalOutflow > 0 ? (g.Sum(e => e.Amount) / totalOutflow) * 100 : 0
                })
                .OrderByDescending(x => x.Total)
                .ToList();

            return new
            {
                Date = targetDate,
                FinancialSummary = new
                {
                    TotalIncome = totalIncome,
                    TotalExpenses = totalExpenses,
                    TotalPurchases = totalPurchases,
                    TotalRents = totalRents,
                    TotalOutflow = totalOutflow,
                    NetIncome = netIncome,
                    ProfitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0
                },
                ExpenseBreakdown = expensesByType,
                TransactionCounts = new
                {
                    Expenses = dailyExpenses.Count,
                    Incomes = dailyIncomes.Count,
                    Purchases = dailyPurchases.Count,
                    Rents = dailyRents.Count
                },
                HourlyBreakdown = Enumerable.Range(0, 24)
                    .Select(hour => new
                    {
                        Hour = hour,
                        Expenses = dailyExpenses.Where(e => e.Date.Hour == hour).Sum(e => e.Amount),
                        Incomes = dailyIncomes.Where(i => i.Date.Hour == hour).Sum(i => i.Amount),
                        Count = dailyExpenses.Count(e => e.Date.Hour == hour) + 
                               dailyIncomes.Count(i => i.Date.Hour == hour)
                    })
                    .Where(x => x.Count > 0)
                    .ToList()
            };
        }

        public async Task<object> GetWeeklyFinancialCalculationsAsync(DateTime? startDate = null)
        {
            var targetDate = DateTimeUtc.Date(startDate ?? DateTime.UtcNow);
            var startOfWeek = targetDate.AddDays(-(int)targetDate.DayOfWeek);
            var endOfWeek = startOfWeek.AddDays(7);

            var weeklyExpenses = await _context.Expenses
                .Where(e => e.Date >= startOfWeek && e.Date < endOfWeek)
                .ToListAsync();

            var weeklyIncomes = await _context.Incomes
                .Where(i => i.Date >= startOfWeek && i.Date < endOfWeek)
                .ToListAsync();

            var weeklyPurchases = await _context.Purchases
                .Where(p => p.PurchaseDate >= startOfWeek && p.PurchaseDate < endOfWeek)
                .ToListAsync();

            var weeklyRents = await _context.Rents
                .Where(r => r.PaymentDate >= startOfWeek && r.PaymentDate < endOfWeek)
                .ToListAsync();

            var totalExpenses = weeklyExpenses.Sum(e => e.Amount);
            var totalIncome = weeklyIncomes.Sum(i => i.Amount);
            var totalPurchases = weeklyPurchases.Sum(p => p.TotalPrice);
            var totalRents = weeklyRents.Sum(r => r.MonthlyAmount);
            var totalOutflow = totalExpenses + totalPurchases + totalRents;
            var netIncome = totalIncome - totalOutflow;

            var dailyBreakdown = Enumerable.Range(0, 7)
                .Select(dayOffset => new
                {
                    Date = startOfWeek.AddDays(dayOffset),
                    DayOfWeek = startOfWeek.AddDays(dayOffset).DayOfWeek.ToString(),
                    Expenses = weeklyExpenses.Where(e => e.Date.Date == startOfWeek.AddDays(dayOffset).Date).Sum(e => e.Amount),
                    Incomes = weeklyIncomes.Where(i => i.Date.Date == startOfWeek.AddDays(dayOffset).Date).Sum(i => i.Amount),
                    Purchases = weeklyPurchases.Where(p => p.PurchaseDate.Date == startOfWeek.AddDays(dayOffset).Date).Sum(p => p.TotalPrice),
                    Rents = weeklyRents.Where(r => r.PaymentDate.Date == startOfWeek.AddDays(dayOffset).Date).Sum(r => r.MonthlyAmount),
                    NetIncome = weeklyIncomes.Where(i => i.Date.Date == startOfWeek.AddDays(dayOffset).Date).Sum(i => i.Amount) -
                               weeklyExpenses.Where(e => e.Date.Date == startOfWeek.AddDays(dayOffset).Date).Sum(e => e.Amount) -
                               weeklyPurchases.Where(p => p.PurchaseDate.Date == startOfWeek.AddDays(dayOffset).Date).Sum(p => p.TotalPrice) -
                               weeklyRents.Where(r => r.PaymentDate.Date == startOfWeek.AddDays(dayOffset).Date).Sum(r => r.MonthlyAmount)
                })
                .ToList();

            return new
            {
                WeekStart = startOfWeek,
                WeekEnd = endOfWeek.AddDays(-1),
                FinancialSummary = new
                {
                    TotalIncome = totalIncome,
                    TotalExpenses = totalExpenses,
                    TotalPurchases = totalPurchases,
                    TotalRents = totalRents,
                    TotalOutflow = totalOutflow,
                    NetIncome = netIncome,
                    ProfitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0,
                    DailyAverage = netIncome / 7
                },
                DailyBreakdown = dailyBreakdown,
                TransactionCounts = new
                {
                    Expenses = weeklyExpenses.Count,
                    Incomes = weeklyIncomes.Count,
                    Purchases = weeklyPurchases.Count,
                    Rents = weeklyRents.Count
                },
                ExpenseBreakdown = weeklyExpenses
                    .GroupBy(e => e.ExpenseType)
                    .Select(g => new
                    {
                        Type = g.Key,
                        Total = g.Sum(e => e.Amount),
                        Count = g.Count(),
                        Percentage = totalOutflow > 0 ? (g.Sum(e => e.Amount) / totalOutflow) * 100 : 0
                    })
                    .OrderByDescending(x => x.Total)
                    .ToList()
            };
        }

        public async Task<object> GetMonthlyFinancialCalculationsAsync(int? year = null, int? month = null)
        {
            var targetYear = year ?? DateTime.UtcNow.Year;
            var targetMonth = month ?? DateTime.UtcNow.Month;
            
            var startOfMonth = DateTimeUtc.MonthStart(targetYear, targetMonth);
            var endOfMonth = startOfMonth.AddMonths(1);

            var monthlyExpenses = await _context.Expenses
                .Where(e => e.Date >= startOfMonth && e.Date < endOfMonth)
                .ToListAsync();

            var monthlyIncomes = await _context.Incomes
                .Where(i => i.Date >= startOfMonth && i.Date < endOfMonth)
                .ToListAsync();

            var monthlyPurchases = await _context.Purchases
                .Where(p => p.PurchaseDate >= startOfMonth && p.PurchaseDate < endOfMonth)
                .ToListAsync();

            var monthlyRents = await _context.Rents
                .Where(r => r.PaymentDate >= startOfMonth && r.PaymentDate < endOfMonth)
                .ToListAsync();

            // Calculate employee salaries for the month
            var employees = await _context.Employees.ToListAsync();
            var totalSalaries = employees.Sum(e => e.CalculatedMonthlySalary);
            var totalBonuses = employees.Sum(e => e.MonthlyBonuses + e.CalculatedDailyBonuses);
            var totalPenalties = employees.Sum(e => e.MonthlyPenalties + e.CalculatedDailyPenalties);
            var totalEmployeePayments = totalSalaries;
            
            var totalExpenses = monthlyExpenses.Sum(e => e.Amount);
            var totalIncome = monthlyIncomes.Sum(i => i.Amount);
            var totalPurchases = monthlyPurchases.Sum(p => p.TotalPrice);
            var totalRents = monthlyRents.Sum(r => r.MonthlyAmount);
            var totalOutflow = totalExpenses + totalPurchases + totalRents + totalEmployeePayments;
            var netIncome = totalIncome - totalOutflow;

            var dailyBreakdown = Enumerable.Range(0, DateTime.DaysInMonth(targetYear, targetMonth))
                .Select(dayOffset => new
                {
                    Date = startOfMonth.AddDays(dayOffset),
                    DayOfMonth = dayOffset + 1,
                    Expenses = monthlyExpenses.Where(e => e.Date.Date == startOfMonth.AddDays(dayOffset).Date).Sum(e => e.Amount),
                    Incomes = monthlyIncomes.Where(i => i.Date.Date == startOfMonth.AddDays(dayOffset).Date).Sum(i => i.Amount),
                    Purchases = monthlyPurchases.Where(p => p.PurchaseDate.Date == startOfMonth.AddDays(dayOffset).Date).Sum(p => p.TotalPrice),
                    Rents = monthlyRents.Where(r => r.PaymentDate.Date == startOfMonth.AddDays(dayOffset).Date).Sum(r => r.MonthlyAmount),
                    NetIncome = monthlyIncomes.Where(i => i.Date.Date == startOfMonth.AddDays(dayOffset).Date).Sum(i => i.Amount) -
                               monthlyExpenses.Where(e => e.Date.Date == startOfMonth.AddDays(dayOffset).Date).Sum(e => e.Amount) -
                               monthlyPurchases.Where(p => p.PurchaseDate.Date == startOfMonth.AddDays(dayOffset).Date).Sum(p => p.TotalPrice) -
                               monthlyRents.Where(r => r.PaymentDate.Date == startOfMonth.AddDays(dayOffset).Date).Sum(r => r.MonthlyAmount)
                })
                .Where(x => x.Expenses > 0 || x.Incomes > 0 || x.Purchases > 0 || x.Rents > 0)
                .ToList();

            var weeklyBreakdown = Enumerable.Range(0, 6)
                .Select(weekOffset => new
                {
                    WeekNumber = weekOffset + 1,
                    StartDate = startOfMonth.AddDays(weekOffset * 7),
                    EndDate = startOfMonth.AddDays((weekOffset + 1) * 7 - 1),
                    Expenses = monthlyExpenses.Where(e => 
                        e.Date >= startOfMonth.AddDays(weekOffset * 7) && 
                        e.Date < startOfMonth.AddDays((weekOffset + 1) * 7)).Sum(e => e.Amount),
                    Incomes = monthlyIncomes.Where(i => 
                        i.Date >= startOfMonth.AddDays(weekOffset * 7) && 
                        i.Date < startOfMonth.AddDays((weekOffset + 1) * 7)).Sum(i => i.Amount),
                    Purchases = monthlyPurchases.Where(p => 
                        p.PurchaseDate >= startOfMonth.AddDays(weekOffset * 7) && 
                        p.PurchaseDate < startOfMonth.AddDays((weekOffset + 1) * 7)).Sum(p => p.TotalPrice),
                    Rents = monthlyRents.Where(r => 
                        r.PaymentDate >= startOfMonth.AddDays(weekOffset * 7) && 
                        r.PaymentDate < startOfMonth.AddDays((weekOffset + 1) * 7)).Sum(r => r.MonthlyAmount),
                    NetIncome = monthlyIncomes.Where(i => 
                        i.Date >= startOfMonth.AddDays(weekOffset * 7) && 
                        i.Date < startOfMonth.AddDays((weekOffset + 1) * 7)).Sum(i => i.Amount) -
                               monthlyExpenses.Where(e => 
                        e.Date >= startOfMonth.AddDays(weekOffset * 7) && 
                        e.Date < startOfMonth.AddDays((weekOffset + 1) * 7)).Sum(e => e.Amount) -
                               monthlyPurchases.Where(p => 
                        p.PurchaseDate >= startOfMonth.AddDays(weekOffset * 7) && 
                        p.PurchaseDate < startOfMonth.AddDays((weekOffset + 1) * 7)).Sum(p => p.TotalPrice) -
                               monthlyRents.Where(r => 
                        r.PaymentDate >= startOfMonth.AddDays(weekOffset * 7) && 
                        r.PaymentDate < startOfMonth.AddDays((weekOffset + 1) * 7)).Sum(r => r.MonthlyAmount)
                })
                .Where(x => x.Expenses > 0 || x.Incomes > 0 || x.Purchases > 0 || x.Rents > 0)
                .ToList();

            return new
            {
                Year = targetYear,
                Month = targetMonth,
                MonthName = startOfMonth.ToString("MMMM"),
                FinancialSummary = new
                {
                    TotalIncome = totalIncome,
                    TotalExpenses = totalExpenses,
                    TotalPurchases = totalPurchases,
                    TotalRents = totalRents,
                    TotalEmployeePayments = totalEmployeePayments,
                    TotalOutflow = totalOutflow,
                    NetIncome = netIncome,
                    DailyAverage = netIncome / DateTime.DaysInMonth(targetYear, targetMonth),
                    WeeklyAverage = netIncome / 4.33m
                },
                DailyBreakdown = dailyBreakdown,
                WeeklyBreakdown = weeklyBreakdown,
                TransactionCounts = new
                {
                    Expenses = monthlyExpenses.Count,
                    Incomes = monthlyIncomes.Count,
                    Purchases = monthlyPurchases.Count,
                    Rents = monthlyRents.Count
                },
                ExpenseBreakdown = monthlyExpenses
                    .GroupBy(e => e.ExpenseType)
                    .Select(g => new
                    {
                        Type = g.Key,
                        Total = g.Sum(e => e.Amount),
                        Count = g.Count(),
                        Percentage = totalOutflow > 0 ? (g.Sum(e => e.Amount) / totalOutflow) * 100 : 0
                    })
                    .OrderByDescending(x => x.Total)
                    .ToList()
            };
        }

        public async Task<object> GetAnnualFinancialCalculationsAsync(int? year = null)
        {
            var targetYear = year ?? DateTime.UtcNow.Year;
            var startOfYear = DateTimeUtc.YearStart(targetYear);
            var endOfYear = startOfYear.AddYears(1);

            var annualExpenses = await _context.Expenses
                .Where(e => e.Date >= startOfYear && e.Date < endOfYear)
                .ToListAsync();

            var annualIncomes = await _context.Incomes
                .Where(i => i.Date >= startOfYear && i.Date < endOfYear)
                .ToListAsync();

            var annualPurchases = await _context.Purchases
                .Where(p => p.PurchaseDate >= startOfYear && p.PurchaseDate < endOfYear)
                .ToListAsync();

            var annualRents = await _context.Rents
                .Where(r => r.PaymentDate >= startOfYear && r.PaymentDate < endOfYear)
                .ToListAsync();

            var totalExpenses = annualExpenses.Sum(e => e.Amount);
            var totalIncome = annualIncomes.Sum(i => i.Amount);
            var totalPurchases = annualPurchases.Sum(p => p.TotalPrice);
            var totalRents = annualRents.Sum(r => r.MonthlyAmount);
            var totalOutflow = totalExpenses + totalPurchases + totalRents;
            var netIncome = totalIncome - totalOutflow;

            var monthlyBreakdown = Enumerable.Range(1, 12)
                .Select(month => new
                {
                    Year = targetYear,
                    Month = month,
                    MonthName = new DateTime(targetYear, month, 1).ToString("MMMM"),
                    Expenses = annualExpenses.Where(e => e.Date.Month == month).Sum(e => e.Amount),
                    Incomes = annualIncomes.Where(i => i.Date.Month == month).Sum(i => i.Amount),
                    Purchases = annualPurchases.Where(p => p.PurchaseDate.Month == month).Sum(p => p.TotalPrice),
                    Rents = annualRents.Where(r => r.PaymentDate.Month == month).Sum(r => r.MonthlyAmount),
                    NetIncome = annualIncomes.Where(i => i.Date.Month == month).Sum(i => i.Amount) -
                               annualExpenses.Where(e => e.Date.Month == month).Sum(e => e.Amount) -
                               annualPurchases.Where(p => p.PurchaseDate.Month == month).Sum(p => p.TotalPrice) -
                               annualRents.Where(r => r.PaymentDate.Month == month).Sum(r => r.MonthlyAmount)
                })
                .ToList();

            var quarterlyBreakdown = Enumerable.Range(1, 4)
                .Select(quarter => new
                {
                    Quarter = quarter,
                    StartMonth = (quarter - 1) * 3 + 1,
                    EndMonth = quarter * 3,
                    Expenses = annualExpenses.Where(e => e.Date.Month >= (quarter - 1) * 3 + 1 && e.Date.Month <= quarter * 3).Sum(e => e.Amount),
                    Incomes = annualIncomes.Where(i => i.Date.Month >= (quarter - 1) * 3 + 1 && i.Date.Month <= quarter * 3).Sum(i => i.Amount),
                    Purchases = annualPurchases.Where(p => p.PurchaseDate.Month >= (quarter - 1) * 3 + 1 && p.PurchaseDate.Month <= quarter * 3).Sum(p => p.TotalPrice),
                    Rents = annualRents.Where(r => r.PaymentDate.Month >= (quarter - 1) * 3 + 1 && r.PaymentDate.Month <= quarter * 3).Sum(r => r.MonthlyAmount),
                    NetIncome = annualIncomes.Where(i => i.Date.Month >= (quarter - 1) * 3 + 1 && i.Date.Month <= quarter * 3).Sum(i => i.Amount) -
                               annualExpenses.Where(e => e.Date.Month >= (quarter - 1) * 3 + 1 && e.Date.Month <= quarter * 3).Sum(e => e.Amount) -
                               annualPurchases.Where(p => p.PurchaseDate.Month >= (quarter - 1) * 3 + 1 && p.PurchaseDate.Month <= quarter * 3).Sum(p => p.TotalPrice) -
                               annualRents.Where(r => r.PaymentDate.Month >= (quarter - 1) * 3 + 1 && r.PaymentDate.Month <= quarter * 3).Sum(r => r.MonthlyAmount)
                })
                .ToList();

            return new
            {
                Year = targetYear,
                FinancialSummary = new
                {
                    TotalIncome = totalIncome,
                    TotalExpenses = totalExpenses,
                    TotalPurchases = totalPurchases,
                    TotalRents = totalRents,
                    TotalOutflow = totalOutflow,
                    NetIncome = netIncome,
                    ProfitMargin = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0,
                    MonthlyAverage = netIncome / 12,
                    QuarterlyAverage = netIncome / 4,
                    DailyAverage = netIncome / 365
                },
                MonthlyBreakdown = monthlyBreakdown,
                QuarterlyBreakdown = quarterlyBreakdown,
                TransactionCounts = new
                {
                    Expenses = annualExpenses.Count,
                    Incomes = annualIncomes.Count,
                    Purchases = annualPurchases.Count,
                    Rents = annualRents.Count
                },
                ExpenseBreakdown = annualExpenses
                    .GroupBy(e => e.ExpenseType)
                    .Select(g => new
                    {
                        Type = g.Key,
                        Total = g.Sum(e => e.Amount),
                        Count = g.Count(),
                        Percentage = totalOutflow > 0 ? (g.Sum(e => e.Amount) / totalOutflow) * 100 : 0
                    })
                    .OrderByDescending(x => x.Total)
                    .ToList()
            };
        }



        // New method to get project and debt statistics for dashboard removal
        public async Task<object> GetProjectAndDebtStatsAsync()
        {
            try
            {
                // Project statistics
                var totalProjects = await _context.Projects.CountAsync();
                var inProgressProjects = await _context.Projects.CountAsync(p => p.Status == ProjectStatus.InProgress);
                var completedProjects = await _context.Projects.CountAsync(p => p.Status == ProjectStatus.Completed);
                var totalPromet = await _context.Projects.SumAsync(p => p.Promet);

                // Debt statistics
                var totalOwedToCompany = await _context.Debts
                    .Where(d => d.Type == DebtType.OwedToCompany && !d.IsPaid)
                    .SumAsync(d => d.Amount);

                var totalCompanyOwes = await _context.Debts
                    .Where(d => d.Type == DebtType.CompanyOwes && !d.IsPaid)
                    .SumAsync(d => d.Amount);

                var pendingToCompany = await _context.Debts
                    .CountAsync(d => d.Type == DebtType.OwedToCompany && !d.IsPaid);

                var pendingFromCompany = await _context.Debts
                    .CountAsync(d => d.Type == DebtType.CompanyOwes && !d.IsPaid);

                return new
                {
                    Projects = new
                    {
                        TotalProjects = totalProjects,
                        InProgressProjects = inProgressProjects,
                        CompletedProjects = completedProjects,
                        TotalPromet = totalPromet
                    },
                    Debts = new
                    {
                        TotalOwedToCompany = totalOwedToCompany,
                        TotalCompanyOwes = totalCompanyOwes,
                        PendingToCompany = pendingToCompany,
                        PendingFromCompany = pendingFromCompany
                    },
                    CurrencyCode = "MKD",
                    CurrencySymbol = "MKD"
                };
            }
            catch (Exception)
            {
                throw;
            }
        }

        public async Task<List<MonthlyReportDto>> GetMonthlyReportsForYearAsync(int year)
        {
            var reports = new List<MonthlyReportDto>();
            
            for (int month = 1; month <= 12; month++)
            {
                var report = await GetMonthlyReportAsync(year, month);
                reports.Add(report);
            }
            
            return reports;
        }

        // Breakdown për blerjet (purchases) - Ditore
        public async Task<object> GetDailyPurchasesBreakdownAsync(DateTime? date = null)
        {
            var targetDate = DateTimeUtc.Date(date ?? DateTime.UtcNow);
            var nextDate = targetDate.AddDays(1);
            var dailyPurchases = await _context.Purchases
                .Where(p => p.PurchaseDate >= targetDate && p.PurchaseDate < nextDate)
                .ToListAsync();
            var totalPurchases = dailyPurchases.Sum(p => p.TotalPrice);
            var purchasesByItem = dailyPurchases
                .GroupBy(p => p.ItemName)
                .Select(g => new {
                    Item = g.Key,
                    Total = g.Sum(p => p.TotalPrice),
                    Count = g.Count(),
                    Average = g.Average(p => p.TotalPrice)
                })
                .OrderByDescending(x => x.Total)
                .ToList();
            return new {
                Date = targetDate,
                TotalPurchases = totalPurchases,
                PurchasesByItem = purchasesByItem,
                PurchaseCount = dailyPurchases.Count
            };
        }

        // Breakdown për blerjet (purchases) - Javore
        public async Task<object> GetWeeklyPurchasesBreakdownAsync(DateTime? startDate = null)
        {
            var targetDate = DateTimeUtc.Date(startDate ?? DateTime.UtcNow);
            var startOfWeek = targetDate.AddDays(-(int)targetDate.DayOfWeek);
            var endOfWeek = startOfWeek.AddDays(7);
            var dailyPurchases = await _context.Purchases
                .Where(p => p.PurchaseDate >= startOfWeek && p.PurchaseDate < endOfWeek)
                .ToListAsync();
            var totalPurchases = dailyPurchases.Sum(p => p.TotalPrice);
            var dailyBreakdown = Enumerable.Range(0, 7)
                .Select(dayOffset => new {
                    Date = startOfWeek.AddDays(dayOffset),
                    Purchases = dailyPurchases.Where(p => p.PurchaseDate.Date == startOfWeek.AddDays(dayOffset).Date).Sum(p => p.TotalPrice),
                    Count = dailyPurchases.Count(p => p.PurchaseDate.Date == startOfWeek.AddDays(dayOffset).Date)
                })
                .ToList();
            return new {
                WeekStart = startOfWeek,
                WeekEnd = startOfWeek.AddDays(6),
                TotalPurchases = totalPurchases,
                DailyBreakdown = dailyBreakdown,
                PurchaseCount = dailyPurchases.Count
            };
        }

        // Breakdown për blerjet (purchases) - Mujore
        public async Task<object> GetMonthlyPurchasesBreakdownAsync(int? year = null, int? month = null)
        {
            var targetYear = year ?? DateTime.UtcNow.Year;
            var targetMonth = month ?? DateTime.UtcNow.Month;
            var startOfMonth = DateTimeUtc.MonthStart(targetYear, targetMonth);
            var daysInMonth = DateTime.DaysInMonth(targetYear, targetMonth);
            var startOfNextMonth = startOfMonth.AddMonths(1);
            var dailyPurchases = await _context.Purchases
                .Where(p => p.PurchaseDate >= startOfMonth && p.PurchaseDate < startOfNextMonth)
                .ToListAsync();
            var totalPurchases = dailyPurchases.Sum(p => p.TotalPrice);
            var dailyBreakdown = Enumerable.Range(0, daysInMonth)
                .Select(dayOffset => new {
                    Date = startOfMonth.AddDays(dayOffset),
                    Purchases = dailyPurchases.Where(p => p.PurchaseDate.Date == startOfMonth.AddDays(dayOffset).Date).Sum(p => p.TotalPrice),
                    Count = dailyPurchases.Count(p => p.PurchaseDate.Date == startOfMonth.AddDays(dayOffset).Date)
                })
                .ToList();
            return new {
                Year = targetYear,
                Month = targetMonth,
                TotalPurchases = totalPurchases,
                DailyBreakdown = dailyBreakdown,
                PurchaseCount = dailyPurchases.Count
            };
        }

        // Breakdown për blerjet (purchases) - Vjetore
        public async Task<object> GetAnnualPurchasesBreakdownAsync(int? year = null)
        {
            var targetYear = year ?? DateTime.UtcNow.Year;
            var startOfYear = DateTimeUtc.YearStart(targetYear);
            var endOfYear = startOfYear.AddYears(1);
            var monthlyPurchases = await _context.Purchases
                .Where(p => p.PurchaseDate >= startOfYear && p.PurchaseDate < endOfYear)
                .ToListAsync();
            var totalPurchases = monthlyPurchases.Sum(p => p.TotalPrice);
            var monthlyBreakdown = Enumerable.Range(1, 12)
                .Select(month => new {
                    Month = month,
                    Purchases = monthlyPurchases.Where(p => p.PurchaseDate.Month == month).Sum(p => p.TotalPrice),
                    Count = monthlyPurchases.Count(p => p.PurchaseDate.Month == month)
                })
                .ToList();
            return new {
                Year = targetYear,
                TotalPurchases = totalPurchases,
                MonthlyBreakdown = monthlyBreakdown,
                PurchaseCount = monthlyPurchases.Count
            };
        }

        // New monthly tracking methods with date ranges
        public async Task<MonthlyTrackingDto> GetMonthlyTrackingAsync(DateTime startDate, DateTime endDate, bool includeDetails = true, bool includeBreakdowns = true)
        {
            try
            {
                startDate = DateTimeUtc.Date(startDate);
                endDate = DateTimeUtc.Date(endDate);
                var endExclusive = endDate.AddDays(1);
                var periodName = GetPeriodName(startDate, endDate);
                
                // Get expenses for the period
                var expenses = await _context.Expenses
                    .Where(e => e.Date >= startDate && e.Date < endExclusive)
                    .Include(e => e.CreatedBy)
                    .ToListAsync();

                // Get purchases for the period
                var purchases = await _context.Purchases
                    .Where(p => p.PurchaseDate >= startDate && p.PurchaseDate < endExclusive)
                    .Include(p => p.CreatedBy)
                    .ToListAsync();

                // Get rents for the period
                var rents = await _context.Rents
                    .Where(r => r.PaymentDate >= startDate && r.PaymentDate < endExclusive)
                    .Include(r => r.CreatedBy)
                    .ToListAsync();

                // Get incomes for the period
                var incomes = await _context.Incomes
                    .Where(i => i.Date >= startDate && i.Date < endExclusive)
                    .Include(i => i.CreatedBy)
                    .ToListAsync();

                // Calculate employee salaries using the new system
                var employees = await _context.Employees.ToListAsync();
                var totalSalaries = employees.Sum(e => e.CalculatedMonthlySalary);
                var totalBonuses = employees.Sum(e => e.MonthlyBonuses + e.CalculatedDailyBonuses);
                var totalPenalties = employees.Sum(e => e.MonthlyPenalties + e.CalculatedDailyPenalties);
                var netPayments = totalSalaries;
                
                var employeePayments = employees.Select(e => new EmployeePaymentDto
                {
                    EmployeeId = e.Id,
                    EmployeeName = e.FullName,
                    Position = e.Position.ToString(),
                    DaysWorked = e.DaysWorkedThisMonth,
                    DailyRate = e.DailyRate,
                    BaseSalary = e.BaseSalary,
                    Bonuses = e.MonthlyBonuses + e.CalculatedDailyBonuses,
                    Penalties = e.MonthlyPenalties + e.CalculatedDailyPenalties,
                    NetSalary = e.CalculatedMonthlySalary,
                    HireDate = e.HireDate
                }).ToList();

                // Build the response
                var monthlyTracking = new MonthlyTrackingDto
                {
                    StartDate = startDate,
                    EndDate = endDate,
                    PeriodName = periodName,
                    Expenses = new MonthlyExpensesDto
                    {
                        TotalAmount = expenses.Sum(e => e.Amount),
                        TotalCount = expenses.Count,
                        Items = includeDetails ? expenses.Select(e => new ExpenseItemDto
                        {
                            Id = e.Id,
                            Description = e.Description,
                            Amount = e.Amount,
                            ExpenseType = e.ExpenseType.ToString(),
                            Date = e.Date
                        }).ToList() : new List<ExpenseItemDto>(),
                        ByType = includeBreakdowns ? expenses.GroupBy(e => e.ExpenseType.ToString())
                            .ToDictionary(g => g.Key, g => g.Sum(e => e.Amount)) : new Dictionary<string, decimal>()
                    },
                    Purchases = new MonthlyPurchasesDto
                    {
                        TotalAmount = purchases.Sum(p => p.TotalPrice),
                        TotalCount = purchases.Count,
                        Items = includeDetails ? purchases.Select(p => new PurchaseItemDto
                        {
                            Id = p.Id,
                            ItemName = p.ItemName,
                            Description = p.Description ?? string.Empty,
                            TotalPrice = p.TotalPrice,
                            Quantity = p.Quantity,
                            UnitPrice = p.UnitPrice,
                            PurchaseDate = p.PurchaseDate,
                            CreatedBy = p.CreatedBy?.FullName ?? "Unknown"
                        }).ToList() : new List<PurchaseItemDto>(),
                        ByCategory = includeBreakdowns ? purchases.GroupBy(p => p.ItemName)
                            .ToDictionary(g => g.Key, g => g.Sum(p => p.TotalPrice)) : new Dictionary<string, decimal>()
                    },
                    Rent = new MonthlyRentDto
                    {
                        TotalAmount = rents.Sum(r => r.MonthlyAmount),
                        TotalCount = rents.Count,
                        Items = includeDetails ? rents.Select(r => new RentItemDto
                        {
                            Id = r.Id,
                            Location = r.Location,
                            Description = r.Description ?? string.Empty,
                            MonthlyAmount = r.MonthlyAmount,
                            PaymentDate = r.PaymentDate,
                            CreatedBy = r.CreatedBy?.FullName ?? "Unknown"
                        }).ToList() : new List<RentItemDto>(),
                        ByLocation = includeBreakdowns ? rents.GroupBy(r => r.Location)
                            .ToDictionary(g => g.Key, g => g.Sum(r => r.MonthlyAmount)) : new Dictionary<string, decimal>()
                    },
                    Income = new MonthlyIncomeDto
                    {
                        TotalAmount = incomes.Sum(i => i.Amount),
                        TotalCount = incomes.Count,
                        Items = includeDetails ? incomes.Select(i => new IncomeItemDto
                        {
                            Id = i.Id,
                            Source = i.Source,
                            Description = i.Description ?? string.Empty,
                            Amount = i.Amount,
                            Date = i.Date,
                            CreatedBy = i.CreatedBy?.FullName ?? "Unknown"
                        }).ToList() : new List<IncomeItemDto>(),
                        BySource = includeBreakdowns ? incomes.GroupBy(i => i.Source)
                            .ToDictionary(g => g.Key, g => g.Sum(i => i.Amount)) : new Dictionary<string, decimal>()
                    },
                    EmployeePayments = new MonthlyEmployeePaymentsDto
                    {
                        TotalSalaries = totalSalaries,
                        TotalBonuses = totalBonuses,
                        TotalPenalties = totalPenalties,
                        NetPayments = netPayments,
                        TotalEmployees = employees.Count,
                        TotalDaysWorked = employees.Sum(e => e.DaysWorkedThisMonth),
                        EmployeePayments = employeePayments,
                        ByPosition = employees.GroupBy(e => e.Position.ToString())
                            .ToDictionary(g => g.Key, g => g.Sum(e => e.CalculatedMonthlySalary))
                    }
                };

                // Calculate summary
                var totalIncome = monthlyTracking.Income.TotalAmount;
                var totalExpenses = monthlyTracking.Expenses.TotalAmount;
                var totalOutflow = totalExpenses + monthlyTracking.Purchases.TotalAmount + monthlyTracking.Rent.TotalAmount + monthlyTracking.EmployeePayments.NetPayments;
                var netProfit = totalIncome - totalOutflow;
                var totalTransactions = monthlyTracking.Expenses.TotalCount + monthlyTracking.Purchases.TotalCount + 
                                      monthlyTracking.Rent.TotalCount + monthlyTracking.Income.TotalCount;

                monthlyTracking.Summary = new MonthlySummaryDto
                {
                    TotalIncome = totalIncome,
                    TotalExpenses = totalExpenses,
                    TotalOutflow = totalOutflow,
                    NetProfit = netProfit,
                    TotalTransactions = totalTransactions
                };

                return monthlyTracking;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error generating monthly tracking report: {ex.Message}", ex);
            }
        }

        public async Task<MonthlyTrackingDto> GetMonthlyTrackingByMonthAsync(int year, int month, bool includeDetails = true, bool includeBreakdowns = true)
        {
            var startDate = DateTimeUtc.MonthStart(year, month);
            var endDate = startDate.AddMonths(1).AddDays(-1);
            return await GetMonthlyTrackingAsync(startDate, endDate, includeDetails, includeBreakdowns);
        }

        public async Task<List<MonthlyTrackingDto>> GetMonthlyTrackingForYearAsync(int year, bool includeDetails = true, bool includeBreakdowns = true)
        {
            var monthlyReports = new List<MonthlyTrackingDto>();
            
            for (int month = 1; month <= 12; month++)
            {
                var report = await GetMonthlyTrackingByMonthAsync(year, month, includeDetails, includeBreakdowns);
                monthlyReports.Add(report);
            }
            
            return monthlyReports;
        }

        public async Task<object> GetMonthlyTrackingSummaryAsync(DateTime startDate, DateTime endDate)
        {
            var tracking = await GetMonthlyTrackingAsync(startDate, endDate, false, false);
            
            return new
            {
                Period = tracking.PeriodName,
                StartDate = tracking.StartDate,
                EndDate = tracking.EndDate,
                Summary = tracking.Summary,
                QuickStats = new
                {
                    TotalIncome = tracking.Income.TotalAmount,
                    TotalExpenses = tracking.Expenses.TotalAmount,
                    TotalPurchases = tracking.Purchases.TotalAmount,
                    TotalRent = tracking.Rent.TotalAmount,
                    TotalEmployeePayments = tracking.EmployeePayments.NetPayments,
                    NetProfit = tracking.Summary.NetProfit,
                    TotalTransactions = tracking.Summary.TotalTransactions,
                    EmployeeCount = tracking.EmployeePayments.TotalEmployees
                },
                CurrencyCode = "MKD",
                CurrencySymbol = "MKD"
            };
        }

        private string GetPeriodName(DateTime startDate, DateTime endDate)
        {
            if (startDate.Year == endDate.Year && startDate.Month == endDate.Month)
            {
                return $"{startDate:MMMM yyyy}";
            }
            else if (startDate.Year == endDate.Year)
            {
                return $"{startDate:MMMM} - {endDate:MMMM yyyy}";
            }
            else
            {
                return $"{startDate:MMMM yyyy} - {endDate:MMMM yyyy}";
            }
        }
    }
} 
