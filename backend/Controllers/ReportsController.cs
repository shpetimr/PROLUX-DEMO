using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backend.Authorization;
using backend.Services;
using backend.DTOs;
using backend.Data;
using backend.Utilities;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _reportService;
        private readonly ApplicationDbContext _context;

        public ReportsController(IReportService reportService, ApplicationDbContext context)
        {
            _reportService = reportService;
            _context = context;
        }

        [HttpGet("financial")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<FinancialReportDto>> GetFinancialReport(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] string? reportType = null)
        {
            try
            {
                var report = await _reportService.GetFinancialReportAsync(startDate, endDate, reportType);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("monthly/{year}/{month}")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<MonthlyReportDto>> GetMonthlyReport(int year, int month)
        {
            try
            {
                var report = await _reportService.GetMonthlyReportAsync(year, month);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("yearly/{year}")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<YearlyReportDto>> GetYearlyReport(int year)
        {
            try
            {
                var report = await _reportService.GetYearlyReportAsync(year);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("dashboard")]
        [Authorize(Policy = AppPermissions.DashboardView)]
        public async Task<ActionResult<DashboardStatsDto>> GetDashboardStats()
        {
            try
            {
                var stats = await _reportService.GetDashboardStatsAsync();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("dashboard/project-debt-stats")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetProjectAndDebtStats()
        {
            try
            {
                var stats = await _reportService.GetProjectAndDebtStatsAsync();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("dashboard/comprehensive")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetComprehensiveDashboardData()
        {
            
            try
            {
                var stats = await _reportService.GetDashboardStatsAsync();
                
                // Get recent data for dashboard
                var recentEmployees = await _context.Employees
                    .OrderByDescending(e => e.CreatedAt)
                    .Take(5)
                    .Select(e => new
                    {
                        e.Id,
                        e.FullName,
                        e.Position,
                        e.DaysWorkedThisMonth,
                        e.BaseSalary
                    })
                    .ToListAsync();

                var recentExpenses = await _context.Expenses
                    .OrderByDescending(e => e.Date)
                    .Take(5)
                    .Select(e => new
                    {
                        e.Id,
                        e.ExpenseType,
                        e.Amount,
                        e.Date,
                        e.Description
                    })
                    .ToListAsync();

                var recentIncomes = await _context.Incomes
                    .OrderByDescending(i => i.Date)
                    .Take(5)
                    .Select(i => new
                    {
                        i.Id,
                        i.Source,
                        i.Amount,
                        i.Date,
                        i.Description
                    })
                    .ToListAsync();

                var recentPurchases = await _context.Purchases
                    .OrderByDescending(p => p.PurchaseDate)
                    .Take(5)
                    .Select(p => new
                    {
                        p.Id,
                        p.ItemName,
                        p.TotalPrice,
                        p.PurchaseDate,
                        p.Description
                    })
                    .ToListAsync();

                var recentRents = await _context.Rents
                    .OrderByDescending(r => r.PaymentDate)
                    .Take(5)
                    .Select(r => new
                    {
                        r.Id,
                        r.Location,
                        r.MonthlyAmount,
                        r.PaymentDate,
                        r.Description
                    })
                    .ToListAsync();

                return Ok(new
                {
                    stats,
                    recentData = new
                    {
                        employees = recentEmployees,
                        expenses = recentExpenses,
                        incomes = recentIncomes,
                        purchases = recentPurchases,
                        rents = recentRents
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("monthly-breakdown/{year}")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<List<MonthlyReportDto>>> GetMonthlyBreakdown(int year)
        {
            try
            {
                var breakdown = await _reportService.GetMonthlyReportsForYearAsync(year);
                return Ok(breakdown);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("current-month")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<MonthlyReportDto>> GetCurrentMonthReport()
        {
            try
            {
                var currentDate = DateTime.UtcNow;
                var report = await _reportService.GetMonthlyReportAsync(currentDate.Year, currentDate.Month);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("current-year")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<YearlyReportDto>> GetCurrentYearReport()
        {
            try
            {
                var currentDate = DateTime.UtcNow;
                var report = await _reportService.GetYearlyReportAsync(currentDate.Year);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // New endpoints for comprehensive expense reporting

        [HttpGet("expenses/comprehensive")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetComprehensiveExpenseReport(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var start = DateTimeUtc.Date(startDate ?? DateTime.UtcNow.Date.AddMonths(-1));
                var end = DateTimeUtc.Date(endDate ?? DateTime.UtcNow.Date);
                var endExclusive = end.AddDays(1);

                var expenses = await _context.Expenses
                    .Where(e => e.Date >= start && e.Date < endExclusive)
                    .ToListAsync();

                var totalExpenses = expenses.Sum(e => e.Amount);
                var expenseCount = expenses.Count;

                // Group by expense type
                var expensesByType = expenses
                    .GroupBy(e => e.ExpenseType)
                    .Select(g => new
                    {
                        Type = g.Key,
                        Total = g.Sum(e => e.Amount),
                        Count = g.Count(),
                        Percentage = totalExpenses > 0 ? (g.Sum(e => e.Amount) / totalExpenses) * 100 : 0,
                        Average = g.Average(e => e.Amount)
                    })
                    .OrderByDescending(x => x.Total)
                    .ToList();

                // Daily breakdown
                var dailyBreakdown = expenses
                    .GroupBy(e => e.Date.Date)
                    .Select(g => new
                    {
                        Date = g.Key,
                        Amount = g.Sum(e => e.Amount),
                        Count = g.Count(),
                        Types = g.GroupBy(e => e.ExpenseType)
                            .Select(t => new { Type = t.Key, Amount = t.Sum(e => e.Amount) })
                            .OrderByDescending(t => t.Amount)
                            .ToList()
                    })
                    .OrderBy(x => x.Date)
                    .ToList();

                // Weekly breakdown
                var weeklyBreakdown = expenses
                    .GroupBy(e => new { Week = e.Date.AddDays(-(int)e.Date.DayOfWeek).Date })
                    .Select(g => new
                    {
                        WeekStart = g.Key.Week,
                        WeekEnd = g.Key.Week.AddDays(6),
                        Amount = g.Sum(e => e.Amount),
                        Count = g.Count(),
                        DailyAverage = g.Sum(e => e.Amount) / 7
                    })
                    .OrderBy(x => x.WeekStart)
                    .ToList();

                // Monthly breakdown
                var monthlyBreakdown = expenses
                    .GroupBy(e => new { e.Date.Year, e.Date.Month })
                    .Select(g => new
                    {
                        Year = g.Key.Year,
                        Month = g.Key.Month,
                        MonthName = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMMM yyyy"),
                        Amount = g.Sum(e => e.Amount),
                        Count = g.Count(),
                        DailyAverage = g.Sum(e => e.Amount) / DateTime.DaysInMonth(g.Key.Year, g.Key.Month)
                    })
                    .OrderBy(x => x.Year)
                    .ThenBy(x => x.Month)
                    .ToList();

                // Top expenses
                var topExpenses = expenses
                    .OrderByDescending(e => e.Amount)
                    .Take(10)
                    .Select(e => new
                    {
                        e.Id,
                        e.ExpenseType,
                        e.Amount,
                        e.Date,
                        e.Description
                    })
                    .ToList();

                return Ok(new
                {
                    Period = new { StartDate = start, EndDate = end },
                    Summary = new
                    {
                        TotalExpenses = totalExpenses,
                        ExpenseCount = expenseCount,
                        AverageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0,
                        DailyAverage = totalExpenses / Math.Max(1, (end - start).Days + 1)
                    },
                    ExpensesByType = expensesByType,
                    DailyBreakdown = dailyBreakdown,
                    WeeklyBreakdown = weeklyBreakdown,
                    MonthlyBreakdown = monthlyBreakdown,
                    TopExpenses = topExpenses
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("expenses/financial-impact")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetExpenseFinancialImpact(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var start = DateTimeUtc.Date(startDate ?? DateTime.UtcNow.Date.AddMonths(-1));
                var end = DateTimeUtc.Date(endDate ?? DateTime.UtcNow.Date);
                var endExclusive = end.AddDays(1);

                // Get all financial data for the period
                var expenses = await _context.Expenses
                    .Where(e => e.Date >= start && e.Date < endExclusive)
                    .SumAsync(e => e.Amount);

                var incomes = await _context.Incomes
                    .Where(i => i.Date >= start && i.Date < endExclusive)
                    .SumAsync(i => i.Amount);

                var purchases = await _context.Purchases
                    .Where(p => p.PurchaseDate >= start && p.PurchaseDate < endExclusive)
                    .SumAsync(p => p.TotalPrice);

                var rents = await _context.Rents
                    .Where(r => r.PaymentDate >= start && r.PaymentDate < endExclusive)
                    .SumAsync(r => r.MonthlyAmount);

                var totalOutflow = expenses + purchases + rents;
                var netIncome = incomes - totalOutflow;
                var profitMargin = incomes > 0 ? (netIncome / incomes) * 100 : 0;

                // Expense breakdown by type
                var expenseBreakdown = await _context.Expenses
                    .Where(e => e.Date >= start && e.Date < endExclusive)
                    .GroupBy(e => e.ExpenseType)
                    .Select(g => new
                    {
                        Type = g.Key,
                        Amount = g.Sum(e => e.Amount),
                        PercentageOfTotal = totalOutflow > 0 ? (g.Sum(e => e.Amount) / totalOutflow) * 100 : 0,
                        PercentageOfIncome = incomes > 0 ? (g.Sum(e => e.Amount) / incomes) * 100 : 0
                    })
                    .OrderByDescending(x => x.Amount)
                    .ToListAsync();

                return Ok(new
                {
                    Period = new { StartDate = start, EndDate = end },
                    FinancialSummary = new
                    {
                        TotalIncome = incomes,
                        TotalExpenses = expenses,
                        TotalPurchases = purchases,
                        TotalRents = rents,
                        TotalOutflow = totalOutflow,
                        NetIncome = netIncome,
                        ProfitMargin = profitMargin
                    },
                    ExpenseBreakdown = expenseBreakdown,
                    CashFlow = new
                    {
                        Inflow = incomes,
                        Outflow = totalOutflow,
                        Net = netIncome
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("expenses/trends")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetExpenseTrends([FromQuery] int months = 12)
        {
            try
            {
                var endDate = DateTimeUtc.Today();
                var startDate = endDate.AddMonths(-months);
                var endExclusive = endDate.AddDays(1);

                var monthlyTrendRows = await _context.Expenses
                    .Where(e => e.Date >= startDate && e.Date < endExclusive)
                    .GroupBy(e => new { e.Date.Year, e.Date.Month })
                    .Select(g => new
                    {
                        Year = g.Key.Year,
                        Month = g.Key.Month,
                        TotalAmount = g.Sum(e => e.Amount),
                        ExpenseCount = g.Count(),
                        AverageAmount = g.Average(e => e.Amount)
                    })
                    .OrderBy(x => x.Year)
                    .ThenBy(x => x.Month)
                    .ToListAsync();

                var monthlyTrends = monthlyTrendRows
                    .Select(x => new
                    {
                        x.Year,
                        x.Month,
                        MonthName = new DateTime(x.Year, x.Month, 1).ToString("MMMM yyyy"),
                        x.TotalAmount,
                        x.ExpenseCount,
                        x.AverageAmount,
                        DailyAverage = x.TotalAmount / DateTime.DaysInMonth(x.Year, x.Month)
                    })
                    .ToList();

                var typeTrends = await _context.Expenses
                    .Where(e => e.Date >= startDate && e.Date < endExclusive)
                    .GroupBy(e => new { e.ExpenseType, e.Date.Year, e.Date.Month })
                    .Select(g => new
                    {
                        Type = g.Key.ExpenseType,
                        Year = g.Key.Year,
                        Month = g.Key.Month,
                        TotalAmount = g.Sum(e => e.Amount),
                        Count = g.Count(),
                        AverageAmount = g.Average(e => e.Amount)
                    })
                    .OrderBy(x => x.Type)
                    .ThenBy(x => x.Year)
                    .ThenBy(x => x.Month)
                    .ToListAsync();

                // Calculate growth rates
                var growthRates = new List<object>();
                for (int i = 1; i < monthlyTrends.Count; i++)
                {
                    var current = monthlyTrends[i];
                    var previous = monthlyTrends[i - 1];
                    var growthRate = previous.TotalAmount > 0 
                        ? ((current.TotalAmount - previous.TotalAmount) / previous.TotalAmount) * 100 
                        : 0;

                    growthRates.Add(new
                    {
                        Month = current.MonthName,
                        GrowthRate = Math.Round(growthRate, 2),
                        PreviousAmount = previous.TotalAmount,
                        CurrentAmount = current.TotalAmount
                    });
                }

                return Ok(new
                {
                    Period = $"{months} months",
                    StartDate = startDate,
                    EndDate = endDate,
                    MonthlyTrends = monthlyTrends,
                    TypeTrends = typeTrends,
                    GrowthRates = growthRates
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("expenses/forecast")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetExpenseForecast([FromQuery] int months = 3)
        {
            try
            {
                var endDate = DateTimeUtc.Today();
                var startDate = endDate.AddMonths(-6); // Use last 6 months for forecasting
                var endExclusive = endDate.AddDays(1);

                var historicalData = await _context.Expenses
                    .Where(e => e.Date >= startDate && e.Date < endExclusive)
                    .GroupBy(e => new { e.Date.Year, e.Date.Month })
                    .Select(g => new
                    {
                        Year = g.Key.Year,
                        Month = g.Key.Month,
                        TotalAmount = g.Sum(e => e.Amount),
                        ExpenseCount = g.Count()
                    })
                    .OrderBy(x => x.Year)
                    .ThenBy(x => x.Month)
                    .ToListAsync();

                if (historicalData.Count < 2)
                {
                    return BadRequest(new { message = "Insufficient historical data for forecasting" });
                }

                // Simple linear regression for forecasting
                var averageMonthlyExpense = historicalData.Average(x => x.TotalAmount);
                var trend = CalculateTrend(historicalData.Select(x => (double)x.TotalAmount).ToArray());

                var forecast = new List<object>();
                var currentDate = endDate.AddMonths(1);

                for (int i = 0; i < months; i++)
                {
                    var forecastAmount = averageMonthlyExpense + ((decimal)trend * (i + 1));
                    forecast.Add(new
                    {
                        Year = currentDate.Year,
                        Month = currentDate.Month,
                        MonthName = currentDate.ToString("MMMM yyyy"),
                        ForecastedAmount = Math.Max(0, forecastAmount),
                        Confidence = Math.Max(0, 100 - (i * 10)) // Decreasing confidence over time
                    });
                    currentDate = currentDate.AddMonths(1);
                }

                return Ok(new
                {
                    HistoricalData = historicalData,
                    Forecast = forecast,
                    AverageMonthlyExpense = averageMonthlyExpense,
                    Trend = trend
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // New comprehensive financial calculation endpoints

        [HttpGet("financial/daily")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetDailyFinancialCalculations([FromQuery] DateTime? date = null)
        {
            try
            {
                var result = await _reportService.GetDailyFinancialCalculationsAsync(date);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("financial/weekly")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetWeeklyFinancialCalculations([FromQuery] DateTime? startDate = null)
        {
            try
            {
                var result = await _reportService.GetWeeklyFinancialCalculationsAsync(startDate);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("financial/monthly")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetMonthlyFinancialCalculations([FromQuery] int? year = null, [FromQuery] int? month = null)
        {
            try
            {
                var result = await _reportService.GetMonthlyFinancialCalculationsAsync(year, month);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("financial/annual")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetAnnualFinancialCalculations([FromQuery] int? year = null)
        {
            try
            {
                var result = await _reportService.GetAnnualFinancialCalculationsAsync(year);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("financial/comprehensive")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetComprehensiveFinancialReport([FromQuery] string period = "current")
        {
            try
            {
                var currentDate = DateTimeUtc.Today();
                object? dailyReport = null, weeklyReport = null, monthlyReport = null, annualReport = null;

                switch (period.ToLower())
                {
                    case "yesterday":
                        dailyReport = await _reportService.GetDailyFinancialCalculationsAsync(currentDate.AddDays(-1));
                        break;
                    case "lastweek":
                        weeklyReport = await _reportService.GetWeeklyFinancialCalculationsAsync(currentDate.AddDays(-7));
                        break;
                    case "lastmonth":
                        var lastMonth = currentDate.AddMonths(-1);
                        monthlyReport = await _reportService.GetMonthlyFinancialCalculationsAsync(lastMonth.Year, lastMonth.Month);
                        break;
                    case "lastyear":
                        annualReport = await _reportService.GetAnnualFinancialCalculationsAsync(currentDate.Year - 1);
                        break;
                    default: // current
                        dailyReport = await _reportService.GetDailyFinancialCalculationsAsync();
                        weeklyReport = await _reportService.GetWeeklyFinancialCalculationsAsync();
                        monthlyReport = await _reportService.GetMonthlyFinancialCalculationsAsync();
                        annualReport = await _reportService.GetAnnualFinancialCalculationsAsync();
                        break;
                }

                return Ok(new
                {
                    Period = period,
                    GeneratedAt = DateTime.UtcNow,
                    Daily = dailyReport ?? await _reportService.GetDailyFinancialCalculationsAsync(),
                    Weekly = weeklyReport ?? await _reportService.GetWeeklyFinancialCalculationsAsync(),
                    Monthly = monthlyReport ?? await _reportService.GetMonthlyFinancialCalculationsAsync(),
                    Annual = annualReport ?? await _reportService.GetAnnualFinancialCalculationsAsync()
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("financial/summary")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetFinancialSummary([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var start = DateTimeUtc.Date(startDate ?? DateTime.UtcNow.Date.AddMonths(-1));
                var end = DateTimeUtc.Date(endDate ?? DateTime.UtcNow.Date);
                var endExclusive = end.AddDays(1);

                // Get all financial data for the period
                var expenses = await _context.Expenses
                    .Where(e => e.Date >= start && e.Date < endExclusive)
                    .SumAsync(e => e.Amount);

                var incomes = await _context.Incomes
                    .Where(i => i.Date >= start && i.Date < endExclusive)
                    .SumAsync(i => i.Amount);

                var purchases = await _context.Purchases
                    .Where(p => p.PurchaseDate >= start && p.PurchaseDate < endExclusive)
                    .SumAsync(p => p.TotalPrice);

                var rents = await _context.Rents
                    .Where(r => r.PaymentDate >= start && r.PaymentDate < endExclusive)
                    .SumAsync(r => r.MonthlyAmount);

                var totalOutflow = expenses + purchases + rents;
                var netIncome = incomes - totalOutflow;
                var profitMargin = incomes > 0 ? (netIncome / incomes) * 100 : 0;

                // Calculate averages
                var daysInPeriod = (end - start).Days + 1;
                var dailyAverageIncome = incomes / daysInPeriod;
                var dailyAverageExpenses = totalOutflow / daysInPeriod;
                var dailyAverageNet = netIncome / daysInPeriod;

                // Get top expense types
                var topExpenseTypes = await _context.Expenses
                    .Where(e => e.Date >= start && e.Date < endExclusive)
                    .GroupBy(e => e.ExpenseType)
                    .Select(g => new
                    {
                        Type = g.Key,
                        Total = g.Sum(e => e.Amount),
                        Count = g.Count(),
                        Percentage = totalOutflow > 0 ? (g.Sum(e => e.Amount) / totalOutflow) * 100 : 0
                    })
                    .OrderByDescending(x => x.Total)
                    .Take(5)
                    .ToListAsync();

                // Get top income sources
                var topIncomeSources = await _context.Incomes
                    .Where(i => i.Date >= start && i.Date < endExclusive)
                    .GroupBy(i => i.Source)
                    .Select(g => new
                    {
                        Source = g.Key,
                        Total = g.Sum(i => i.Amount),
                        Count = g.Count(),
                        Percentage = incomes > 0 ? (g.Sum(i => i.Amount) / incomes) * 100 : 0
                    })
                    .OrderByDescending(x => x.Total)
                    .Take(5)
                    .ToListAsync();

                return Ok(new
                {
                    Period = new { StartDate = start, EndDate = end, Days = daysInPeriod },
                    FinancialSummary = new
                    {
                        TotalIncome = incomes,
                        TotalExpenses = expenses,
                        TotalPurchases = purchases,
                        TotalRents = rents,
                        TotalOutflow = totalOutflow,
                        NetIncome = netIncome,
                        ProfitMargin = profitMargin
                    },
                    Averages = new
                    {
                        DailyIncome = dailyAverageIncome,
                        DailyExpenses = dailyAverageExpenses,
                        DailyNet = dailyAverageNet
                    },
                    TopExpenseTypes = topExpenseTypes,
                    TopIncomeSources = topIncomeSources,
                    CashFlow = new
                    {
                        Inflow = incomes,
                        Outflow = totalOutflow,
                        Net = netIncome
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("financial/period-totals")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetAllPeriodTotals()
        {
            var today = DateTimeUtc.Today();
            var weekStart = today.AddDays(-(int)today.DayOfWeek + 1); // Monday as start

            dynamic daily = await _reportService.GetDailyFinancialCalculationsAsync(today);
            dynamic weekly = await _reportService.GetWeeklyFinancialCalculationsAsync(weekStart);
            dynamic monthly = await _reportService.GetMonthlyFinancialCalculationsAsync(today.Year, today.Month);
            dynamic annual = await _reportService.GetAnnualFinancialCalculationsAsync(today.Year);

            object ExtractPeriod(dynamic obj)
            {
                return new
                {
                    expenses = new { total = (decimal)obj.FinancialSummary.TotalExpenses, count = obj.TransactionCounts.Expenses },
                    purchases = new { total = (decimal)obj.FinancialSummary.TotalPurchases, count = obj.TransactionCounts.Purchases },
                    rents = new { total = (decimal)obj.FinancialSummary.TotalRents, count = obj.TransactionCounts.Rents },
                    incomes = new { total = (decimal)obj.FinancialSummary.TotalIncome, count = obj.TransactionCounts.Incomes }
                };
            }

            return Ok(new
            {
                daily = ExtractPeriod(daily),
                weekly = ExtractPeriod(weekly),
                monthly = ExtractPeriod(monthly),
                annual = ExtractPeriod(annual)
            });
        }

        [HttpGet("purchases/daily-breakdown")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetDailyPurchasesBreakdown([FromQuery] DateTime? date = null)
        {
            var result = await _reportService.GetDailyPurchasesBreakdownAsync(date);
            return Ok(result);
        }

        [HttpGet("purchases/weekly-breakdown")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetWeeklyPurchasesBreakdown([FromQuery] DateTime? startDate = null)
        {
            var result = await _reportService.GetWeeklyPurchasesBreakdownAsync(startDate);
            return Ok(result);
        }

        [HttpGet("purchases/monthly-breakdown")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetMonthlyPurchasesBreakdown([FromQuery] int? year = null, [FromQuery] int? month = null)
        {
            var result = await _reportService.GetMonthlyPurchasesBreakdownAsync(year, month);
            return Ok(result);
        }

        [HttpGet("purchases/annual-breakdown")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetAnnualPurchasesBreakdown([FromQuery] int? year = null)
        {
            var result = await _reportService.GetAnnualPurchasesBreakdownAsync(year);
            return Ok(result);
        }

        [HttpGet("purchases/financial")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetFinancialPurchasesReport([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            var start = DateTimeUtc.Date(startDate ?? DateTime.UtcNow.Date.AddMonths(-1));
            var end = DateTimeUtc.Date(endDate ?? DateTime.UtcNow.Date);
            var endExclusive = end.AddDays(1);
            var purchases = await _context.Purchases
                .Where(p => p.PurchaseDate >= start && p.PurchaseDate < endExclusive)
                .OrderByDescending(p => p.PurchaseDate)
                .ToListAsync();
            var total = purchases.Sum(p => p.TotalPrice);
            var count = purchases.Count;
            var byItem = purchases
                .GroupBy(p => p.ItemName)
                .Select(g => new {
                    Item = g.Key,
                    Total = g.Sum(p => p.TotalPrice),
                    Count = g.Count(),
                    Average = g.Average(p => p.TotalPrice)
                })
                .OrderByDescending(x => x.Total)
                .ToList();
            return Ok(new {
                Period = new { StartDate = start, EndDate = end },
                Total = total,
                Count = count,
                Purchases = purchases,
                ByItem = byItem
            });
        }

        // New Monthly Tracking Endpoints
        [HttpGet("monthly-tracking")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<MonthlyTrackingDto>> GetMonthlyTracking(
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate,
            [FromQuery] bool includeDetails = true,
            [FromQuery] bool includeBreakdowns = true)
        {
            try
            {
                var tracking = await _reportService.GetMonthlyTrackingAsync(startDate, endDate, includeDetails, includeBreakdowns);
                return Ok(tracking);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("monthly-tracking/{year}/{month}")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<MonthlyTrackingDto>> GetMonthlyTrackingByMonth(
            int year, 
            int month,
            [FromQuery] bool includeDetails = true,
            [FromQuery] bool includeBreakdowns = true)
        {
            try
            {
                var tracking = await _reportService.GetMonthlyTrackingByMonthAsync(year, month, includeDetails, includeBreakdowns);
                return Ok(tracking);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("monthly-tracking/year/{year}")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<List<MonthlyTrackingDto>>> GetMonthlyTrackingForYear(
            int year,
            [FromQuery] bool includeDetails = true,
            [FromQuery] bool includeBreakdowns = true)
        {
            try
            {
                var tracking = await _reportService.GetMonthlyTrackingForYearAsync(year, includeDetails, includeBreakdowns);
                return Ok(tracking);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("monthly-tracking/summary")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<object>> GetMonthlyTrackingSummary(
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate)
        {
            try
            {
                var summary = await _reportService.GetMonthlyTrackingSummaryAsync(startDate, endDate);
                return Ok(summary);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("monthly-tracking/current-month")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<MonthlyTrackingDto>> GetCurrentMonthTracking(
            [FromQuery] bool includeDetails = true,
            [FromQuery] bool includeBreakdowns = true)
        {
            try
            {
                var currentDate = DateTime.UtcNow;
                var tracking = await _reportService.GetMonthlyTrackingByMonthAsync(currentDate.Year, currentDate.Month, includeDetails, includeBreakdowns);
                return Ok(tracking);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("monthly-tracking/current-year")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<List<MonthlyTrackingDto>>> GetCurrentYearTracking(
            [FromQuery] bool includeDetails = true,
            [FromQuery] bool includeBreakdowns = true)
        {
            try
            {
                var currentDate = DateTime.UtcNow;
                var tracking = await _reportService.GetMonthlyTrackingForYearAsync(currentDate.Year, includeDetails, includeBreakdowns);
                return Ok(tracking);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("monthly-tracking/custom")]
        [Authorize(Policy = AppPermissions.ReportsView)]
        public async Task<ActionResult<MonthlyTrackingDto>> GetCustomMonthlyTracking([FromBody] MonthlyTrackingRequestDto request)
        {
            try
            {
                var tracking = await _reportService.GetMonthlyTrackingAsync(request.StartDate, request.EndDate, request.IncludeDetails, request.IncludeBreakdowns);
                return Ok(tracking);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private double CalculateTrend(double[] values)
        {
            if (values.Length < 2) return 0;

            var n = values.Length;
            var sumX = n * (n - 1) / 2.0;
            var sumY = values.Sum();
            var sumXY = 0.0;
            var sumX2 = 0.0;

            for (int i = 0; i < n; i++)
            {
                sumXY += i * values[i];
                sumX2 += i * i;
            }

            var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            return slope;
        }
    }
} 
