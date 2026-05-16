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
        private const string InvoiceStockMovementKind = "Invoice";

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

            var workSaleTotals = await GetWorkSaleFinancialTotalsAsync(normalizedStartDate, endExclusive);
            var salaryTotals = await GetSalaryFinancialTotalsAsync(normalizedStartDate, endExclusive);
            var archivedInvoiceTotals = await GetArchivedInvoiceFinancialTotalsAsync(normalizedStartDate, endExclusive);
            var invoiceStockCostTotals = await GetInvoiceStockCostTotalsAsync(normalizedStartDate, endExclusive);
            var stockSplitTotals = await GetStockSplitTotalsAsync(normalizedStartDate, endExclusive);
            var workerTaskCounts = await GetWorkerTaskCountsAsync(normalizedStartDate, endExclusive);

            var baseExpenses = (decimal)await expenses.SumAsync(e => (double)e.Amount);
            var totalRent = (decimal)await rents.SumAsync(r => (double)r.MonthlyAmount);
            var totalPurchases = (decimal)await purchases.SumAsync(p => (double)p.TotalPrice);
            var baseIncome = (decimal)await incomes.SumAsync(i => (double)i.Amount);
            var totalExpenses = baseExpenses + invoiceStockCostTotals.Cost;
            var totalIncome = baseIncome + workSaleTotals.Profit + archivedInvoiceTotals.Total;
            var netBalance = totalIncome - (totalExpenses + totalRent + totalPurchases + salaryTotals.TotalSalaries);

            return new FinancialReportDto
            {
                TotalSalaries = salaryTotals.TotalSalaries,
                TotalDaysWorked = salaryTotals.TotalDaysWorked,
                TotalExpenses = totalExpenses,
                TotalRent = totalRent,
                TotalPurchases = totalPurchases,
                TotalRents = totalRent,
                TotalIncome = totalIncome,
                NetProfit = netBalance,
                NetBalance = netBalance,
                EmployeeCount = salaryTotals.EmployeeCount,
                TotalArchivedInvoices = archivedInvoiceTotals.Total,
                ArchivedInvoicesCount = archivedInvoiceTotals.Count,
                TotalWorkSalesRevenue = workSaleTotals.Revenue,
                TotalWorkSalesCost = workSaleTotals.Cost,
                TotalWorkSalesProfit = workSaleTotals.Profit,
                WorkSalesCount = workSaleTotals.Count,
                TotalInvoiceStockCost = invoiceStockCostTotals.Cost,
                InvoiceStockCostCount = invoiceStockCostTotals.Count,
                MaterialStockItemCount = stockSplitTotals.Material.ItemCount,
                MaterialStockQuantity = stockSplitTotals.Material.CurrentQuantity,
                ProductStockItemCount = stockSplitTotals.Product.ItemCount,
                ProductStockQuantity = stockSplitTotals.Product.CurrentQuantity,
                WorkerTasksTotal = workerTaskCounts.Total,
                WorkerTasksWaiting = workerTaskCounts.Waiting,
                WorkerTasksInProcess = workerTaskCounts.InProcess,
                WorkerTasksCompleted = workerTaskCounts.Completed,
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
                EmployeeCount = report.EmployeeCount,
                TotalArchivedInvoices = report.TotalArchivedInvoices,
                ArchivedInvoicesCount = report.ArchivedInvoicesCount,
                TotalWorkSalesRevenue = report.TotalWorkSalesRevenue,
                TotalWorkSalesCost = report.TotalWorkSalesCost,
                TotalWorkSalesProfit = report.TotalWorkSalesProfit,
                WorkSalesCount = report.WorkSalesCount,
                TotalInvoiceStockCost = report.TotalInvoiceStockCost,
                InvoiceStockCostCount = report.InvoiceStockCostCount,
                MaterialStockItemCount = report.MaterialStockItemCount,
                MaterialStockQuantity = report.MaterialStockQuantity,
                ProductStockItemCount = report.ProductStockItemCount,
                ProductStockQuantity = report.ProductStockQuantity,
                WorkerTasksTotal = report.WorkerTasksTotal,
                WorkerTasksWaiting = report.WorkerTasksWaiting,
                WorkerTasksInProcess = report.WorkerTasksInProcess,
                WorkerTasksCompleted = report.WorkerTasksCompleted
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
                TotalArchivedInvoices = report.TotalArchivedInvoices,
                ArchivedInvoicesCount = report.ArchivedInvoicesCount,
                TotalWorkSalesRevenue = report.TotalWorkSalesRevenue,
                TotalWorkSalesCost = report.TotalWorkSalesCost,
                TotalWorkSalesProfit = report.TotalWorkSalesProfit,
                WorkSalesCount = report.WorkSalesCount,
                TotalInvoiceStockCost = report.TotalInvoiceStockCost,
                InvoiceStockCostCount = report.InvoiceStockCostCount,
                MaterialStockItemCount = report.MaterialStockItemCount,
                MaterialStockQuantity = report.MaterialStockQuantity,
                ProductStockItemCount = report.ProductStockItemCount,
                ProductStockQuantity = report.ProductStockQuantity,
                WorkerTasksTotal = report.WorkerTasksTotal,
                WorkerTasksWaiting = report.WorkerTasksWaiting,
                WorkerTasksInProcess = report.WorkerTasksInProcess,
                WorkerTasksCompleted = report.WorkerTasksCompleted,
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
                var todayExclusive = DateTimeUtc.Date(currentDate).AddDays(1);
                
                var currentUserId = _currentUserService.GetCurrentUserId();
                var isAdmin = _currentUserService.IsAdmin();
                var expensesQuery = _context.Expenses.AsNoTracking().AsQueryable();
                var purchasesQuery = _context.Purchases.AsNoTracking().AsQueryable();

                if (!isAdmin)
                {
                    expensesQuery = expensesQuery.Where(e => e.CreatedById == currentUserId);
                    purchasesQuery = purchasesQuery.Where(p => p.CreatedById == currentUserId);
                }
                
                var employeeCounts = isAdmin
                    ? await GetDashboardEmployeeCountsAsync()
                    : DashboardEmployeeCounts.Empty;
                var salaryBuckets = await GetDashboardSalaryTotalsAsync(
                    currentMonthStart,
                    currentMonthEnd,
                    yearStart,
                    todayExclusive);
                var currentMonthSalaryTotals = salaryBuckets.CurrentMonth;
                var currentMonthSalaries = currentMonthSalaryTotals.TotalSalaries;
                var averageSalary = currentMonthSalaryTotals.EmployeeCount > 0
                    ? currentMonthSalaries / currentMonthSalaryTotals.EmployeeCount
                    : 0;

                var expenseBuckets = await GetDashboardExpenseBucketsAsync(
                    expensesQuery,
                    currentMonthStart,
                    currentMonthEnd,
                    yearStart,
                    currentDate);
                var purchaseBuckets = await GetDashboardPurchaseBucketsAsync(
                    purchasesQuery,
                    currentMonthStart,
                    currentMonthEnd,
                    yearStart,
                    currentDate);
                var incomeBuckets = isAdmin
                    ? await GetDashboardIncomeBucketsAsync(
                        currentMonthStart,
                        currentMonthEnd,
                        yearStart,
                        currentDate)
                    : DashboardAmountBuckets.Empty;
                var rentBuckets = isAdmin
                    ? await GetDashboardRentBucketsAsync(
                        currentMonthStart,
                        currentMonthEnd,
                        yearStart,
                        currentDate)
                    : DashboardAmountBuckets.Empty;
                var workSaleBuckets = isAdmin
                    ? await GetDashboardWorkSaleBucketsAsync(
                        currentMonthStart,
                        currentMonthEnd,
                        yearStart,
                        todayExclusive)
                    : DashboardWorkSaleBuckets.Empty;
                var archivedInvoiceBuckets = isAdmin
                    ? await GetDashboardArchivedInvoiceBucketsAsync(
                        currentMonthStart,
                        currentMonthEnd,
                        yearStart,
                        todayExclusive)
                    : DashboardArchivedInvoiceBuckets.Empty;
                var invoiceStockCostBuckets = isAdmin
                    ? await GetDashboardInvoiceStockCostBucketsAsync(
                        currentMonthStart,
                        currentMonthEnd,
                        yearStart,
                        todayExclusive)
                    : DashboardInvoiceStockCostBuckets.Empty;
                var allTimeWorkerTaskCounts = await GetWorkerTaskCountsAsync(null, null);

                var currentMonthWorkSaleTotals = workSaleBuckets.CurrentMonth;
                var currentMonthArchivedInvoiceTotals = archivedInvoiceBuckets.CurrentMonth;
                var currentMonthInvoiceStockCostTotals = invoiceStockCostBuckets.CurrentMonth;
                var currentMonthExpenses = expenseBuckets.CurrentMonth + currentMonthInvoiceStockCostTotals.Cost;
                var currentMonthIncome = incomeBuckets.CurrentMonth;
                currentMonthIncome += currentMonthWorkSaleTotals.Profit + currentMonthArchivedInvoiceTotals.Total;
                var currentMonthPurchases = purchaseBuckets.CurrentMonth;
                var currentMonthRents = rentBuckets.CurrentMonth;
                var currentMonthProfit = currentMonthIncome - (currentMonthExpenses + currentMonthPurchases + currentMonthRents + currentMonthSalaries);

                var yearToDateWorkSaleTotals = workSaleBuckets.YearToDate;
                var yearToDateArchivedInvoiceTotals = archivedInvoiceBuckets.YearToDate;
                var yearToDateInvoiceStockCostTotals = invoiceStockCostBuckets.YearToDate;
                var yearToDateSalaryTotals = salaryBuckets.YearToDate;
                var yearToDateIncome = incomeBuckets.YearToDate;
                yearToDateIncome += yearToDateWorkSaleTotals.Profit + yearToDateArchivedInvoiceTotals.Total;
                var yearToDateExpenses = expenseBuckets.YearToDate;
                yearToDateExpenses += yearToDateInvoiceStockCostTotals.Cost;
                var yearToDatePurchases = purchaseBuckets.YearToDate;
                var yearToDateRents = rentBuckets.YearToDate;
                var yearToDateProfit = yearToDateIncome -
                    (yearToDateExpenses + yearToDatePurchases + yearToDateRents + yearToDateSalaryTotals.TotalSalaries);

                var allTimeWorkSaleTotals = workSaleBuckets.AllTime;
                var allTimeArchivedInvoiceTotals = archivedInvoiceBuckets.AllTime;
                var allTimeInvoiceStockCostTotals = invoiceStockCostBuckets.AllTime;
                var allTimeSalaryTotals = salaryBuckets.AllTime;
                var totalExpenses = expenseBuckets.Total;
                var totalIncomes = incomeBuckets.Total;
                var totalPurchases = purchaseBuckets.Total;
                var totalRents = rentBuckets.Total;
                totalExpenses += allTimeInvoiceStockCostTotals.Cost;
                totalIncomes += allTimeWorkSaleTotals.Profit + allTimeArchivedInvoiceTotals.Total;
                var profitMargin = totalIncomes > 0
                    ? ((totalIncomes - totalExpenses - totalPurchases - totalRents) / totalIncomes) * 100
                    : 0m;
                
                return new DashboardStatsDto
                {
                    TotalEmployees = employeeCounts.Total,
                    WarehouseEmployees = employeeCounts.Magazine,
                    FieldEmployees = employeeCounts.Terren,
                    CurrentMonthSalaries = currentMonthSalaries,
                    CurrentMonthExpenses = currentMonthExpenses,
                    CurrentMonthIncome = currentMonthIncome,
                    CurrentMonthProfit = currentMonthProfit,
                    CurrentMonthPurchases = currentMonthPurchases,
                    CurrentMonthRents = currentMonthRents,
                    CurrentMonthWorkSalesRevenue = currentMonthWorkSaleTotals.Revenue,
                    CurrentMonthWorkSalesCost = currentMonthWorkSaleTotals.Cost,
                    CurrentMonthWorkSalesProfit = currentMonthWorkSaleTotals.Profit,
                    CurrentMonthWorkSalesCount = currentMonthWorkSaleTotals.Count,
                    CurrentMonthArchivedInvoices = currentMonthArchivedInvoiceTotals.Total,
                    CurrentMonthArchivedInvoicesCount = currentMonthArchivedInvoiceTotals.Count,
                    CurrentMonthInvoiceStockCost = currentMonthInvoiceStockCostTotals.Cost,
                    CurrentMonthInvoiceStockCostCount = currentMonthInvoiceStockCostTotals.Count,
                    YearToDateIncome = yearToDateIncome,
                    YearToDateExpenses = yearToDateExpenses,
                    YearToDatePurchases = yearToDatePurchases,
                    YearToDateRents = yearToDateRents,
                    YearToDateSalaries = yearToDateSalaryTotals.TotalSalaries,
                    YearToDateWorkSalesRevenue = yearToDateWorkSaleTotals.Revenue,
                    YearToDateWorkSalesCost = yearToDateWorkSaleTotals.Cost,
                    YearToDateWorkSalesProfit = yearToDateWorkSaleTotals.Profit,
                    YearToDateWorkSalesCount = yearToDateWorkSaleTotals.Count,
                    YearToDateArchivedInvoices = yearToDateArchivedInvoiceTotals.Total,
                    YearToDateArchivedInvoicesCount = yearToDateArchivedInvoiceTotals.Count,
                    YearToDateInvoiceStockCost = yearToDateInvoiceStockCostTotals.Cost,
                    YearToDateInvoiceStockCostCount = yearToDateInvoiceStockCostTotals.Count,
                    YearToDateProfit = yearToDateProfit,
                    TotalExpenses = totalExpenses,
                    TotalIncomes = totalIncomes,
                    TotalPurchases = totalPurchases,
                    TotalRents = totalRents,
                    TotalSalaries = allTimeSalaryTotals.TotalSalaries,
                    TotalWorkSalesRevenue = allTimeWorkSaleTotals.Revenue,
                    TotalWorkSalesCost = allTimeWorkSaleTotals.Cost,
                    TotalWorkSalesProfit = allTimeWorkSaleTotals.Profit,
                    TotalWorkSalesCount = allTimeWorkSaleTotals.Count,
                    TotalArchivedInvoices = allTimeArchivedInvoiceTotals.Total,
                    TotalArchivedInvoicesCount = allTimeArchivedInvoiceTotals.Count,
                    TotalInvoiceStockCost = allTimeInvoiceStockCostTotals.Cost,
                    TotalInvoiceStockCostCount = allTimeInvoiceStockCostTotals.Count,
                    WorkerTasksTotal = allTimeWorkerTaskCounts.Total,
                    WorkerTasksWaiting = allTimeWorkerTaskCounts.Waiting,
                    WorkerTasksInProcess = allTimeWorkerTaskCounts.InProcess,
                    WorkerTasksCompleted = allTimeWorkerTaskCounts.Completed,
                    AverageSalary = averageSalary,
                    ProfitMargin = profitMargin
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

            var dailyWorkSales = await _context.WorkSales
                .Where(workSale => workSale.Date >= targetDate && workSale.Date < nextDate)
                .ToListAsync();
            var dailyArchivedInvoices = await _context.InvoiceArchives
                .Where(invoice => invoice.CreatedAt >= targetDate && invoice.CreatedAt < nextDate)
                .ToListAsync();
            var dailyInvoiceStockCostMovements = await GetInvoiceStockCostMovementSnapshotsAsync(targetDate, nextDate);
            var workSaleTotals = GetWorkSaleFinancialTotals(dailyWorkSales);
            var archivedInvoiceTotals = GetArchivedInvoiceFinancialTotals(dailyArchivedInvoices);
            var invoiceStockCostTotals = GetInvoiceStockCostTotals(dailyInvoiceStockCostMovements);
            var stockSplitTotals = await GetStockSplitTotalsAsync(targetDate, nextDate);
            var salaryTotals = await GetSalaryFinancialTotalsAsync(targetDate, nextDate);
            var workerTaskCounts = await GetWorkerTaskCountsAsync(targetDate, nextDate);

            var totalExpenses = dailyExpenses.Sum(e => e.Amount) + invoiceStockCostTotals.Cost;
            var totalIncome = dailyIncomes.Sum(i => i.Amount) + workSaleTotals.Profit + archivedInvoiceTotals.Total;
            var totalPurchases = dailyPurchases.Sum(p => p.TotalPrice);
            var totalRents = dailyRents.Sum(r => r.MonthlyAmount);
            var totalOutflow = totalExpenses + totalPurchases + totalRents + salaryTotals.TotalSalaries;
            var netIncome = totalIncome - totalOutflow;

            var expensesByType = BuildExpenseBreakdown(dailyExpenses, totalOutflow, invoiceStockCostTotals, salaryTotals);

            return new
            {
                Date = targetDate,
                FinancialSummary = new
                {
                    TotalIncome = totalIncome,
                    TotalExpenses = totalExpenses,
                    TotalPurchases = totalPurchases,
                    TotalRents = totalRents,
                    TotalSalaries = salaryTotals.TotalSalaries,
                    TotalEmployeePayments = salaryTotals.TotalSalaries,
                    TotalArchivedInvoices = archivedInvoiceTotals.Total,
                    ArchivedInvoicesCount = archivedInvoiceTotals.Count,
                    TotalWorkSalesRevenue = workSaleTotals.Revenue,
                    TotalWorkSalesCost = workSaleTotals.Cost,
                    TotalWorkSalesProfit = workSaleTotals.Profit,
                    TotalInvoiceStockCost = invoiceStockCostTotals.Cost,
                    InvoiceStockCostCount = invoiceStockCostTotals.Count,
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
                    Rents = dailyRents.Count,
                    ArchivedInvoices = dailyArchivedInvoices.Count,
                    WorkSales = dailyWorkSales.Count,
                    InvoiceStockCostMovements = invoiceStockCostTotals.Count,
                    StockMovements = stockSplitTotals.TotalMovementCount,
                    WorkerTasks = workerTaskCounts.Total
                },
                ArchivedInvoices = BuildArchivedInvoiceReport(archivedInvoiceTotals),
                StockSplit = BuildStockSplitReport(stockSplitTotals),
                WorkerTaskCounts = new
                {
                    Total = workerTaskCounts.Total,
                    Waiting = workerTaskCounts.Waiting,
                    InProcess = workerTaskCounts.InProcess,
                    Completed = workerTaskCounts.Completed
                },
                HourlyBreakdown = Enumerable.Range(0, 24)
                    .Select(hour => new
                    {
                        Hour = hour,
                        Expenses = dailyExpenses.Where(e => e.Date.Hour == hour).Sum(e => e.Amount) +
                                   dailyInvoiceStockCostMovements
                                       .Where(movement => movement.OccurredAt.Hour == hour)
                                       .Sum(GetInvoiceStockMovementCost),
                        Incomes = dailyIncomes.Where(i => i.Date.Hour == hour).Sum(i => i.Amount) +
                                  dailyWorkSales.Where(workSale => workSale.Date.Hour == hour).Sum(workSale => workSale.Profit) +
                                  dailyArchivedInvoices
                                      .Where(invoice => invoice.CreatedAt.Hour == hour)
                                      .Sum(InvoiceArchiveFinancials.GetRevenueTotal),
                        Count = dailyExpenses.Count(e => e.Date.Hour == hour) + 
                               dailyIncomes.Count(i => i.Date.Hour == hour) +
                               dailyWorkSales.Count(workSale => workSale.Date.Hour == hour) +
                               dailyArchivedInvoices.Count(invoice => invoice.CreatedAt.Hour == hour) +
                               dailyInvoiceStockCostMovements.Count(movement => movement.OccurredAt.Hour == hour)
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

            var weeklyWorkSales = await _context.WorkSales
                .Where(workSale => workSale.Date >= startOfWeek && workSale.Date < endOfWeek)
                .ToListAsync();
            var weeklyArchivedInvoices = await _context.InvoiceArchives
                .Where(invoice => invoice.CreatedAt >= startOfWeek && invoice.CreatedAt < endOfWeek)
                .ToListAsync();
            var weeklyInvoiceStockCostMovements = await GetInvoiceStockCostMovementSnapshotsAsync(startOfWeek, endOfWeek);
            var workSaleTotals = GetWorkSaleFinancialTotals(weeklyWorkSales);
            var archivedInvoiceTotals = GetArchivedInvoiceFinancialTotals(weeklyArchivedInvoices);
            var invoiceStockCostTotals = GetInvoiceStockCostTotals(weeklyInvoiceStockCostMovements);
            var stockSplitTotals = await GetStockSplitTotalsAsync(startOfWeek, endOfWeek);
            var salaryTotals = await GetSalaryFinancialTotalsAsync(startOfWeek, endOfWeek);
            var workerTaskCounts = await GetWorkerTaskCountsAsync(startOfWeek, endOfWeek);

            var totalExpenses = weeklyExpenses.Sum(e => e.Amount) + invoiceStockCostTotals.Cost;
            var totalIncome = weeklyIncomes.Sum(i => i.Amount) + workSaleTotals.Profit + archivedInvoiceTotals.Total;
            var totalPurchases = weeklyPurchases.Sum(p => p.TotalPrice);
            var totalRents = weeklyRents.Sum(r => r.MonthlyAmount);
            var totalOutflow = totalExpenses + totalPurchases + totalRents + salaryTotals.TotalSalaries;
            var netIncome = totalIncome - totalOutflow;

            var dailyBreakdown = Enumerable.Range(0, 7)
                .Select(dayOffset =>
                {
                    var day = startOfWeek.AddDays(dayOffset).Date;
                    var dayExpenses = weeklyExpenses.Where(e => e.Date.Date == day).Sum(e => e.Amount);
                    var dayIncomes = weeklyIncomes.Where(i => i.Date.Date == day).Sum(i => i.Amount);
                    var dayPurchases = weeklyPurchases.Where(p => p.PurchaseDate.Date == day).Sum(p => p.TotalPrice);
                    var dayRents = weeklyRents.Where(r => r.PaymentDate.Date == day).Sum(r => r.MonthlyAmount);
                    var dayWorkSaleTotals = GetWorkSaleFinancialTotals(weeklyWorkSales.Where(workSale => workSale.Date.Date == day));
                    var dayArchivedInvoiceTotals = GetArchivedInvoiceFinancialTotals(weeklyArchivedInvoices.Where(invoice => invoice.CreatedAt.Date == day));
                    var dayInvoiceStockCostTotals = GetInvoiceStockCostTotals(weeklyInvoiceStockCostMovements.Where(movement => movement.OccurredAt.Date == day));

                    return new
                    {
                        Date = day,
                        DayOfWeek = day.DayOfWeek.ToString(),
                        Expenses = dayExpenses + dayInvoiceStockCostTotals.Cost,
                        Incomes = dayIncomes + dayWorkSaleTotals.Profit + dayArchivedInvoiceTotals.Total,
                        Purchases = dayPurchases,
                        Rents = dayRents,
                        ArchivedInvoices = dayArchivedInvoiceTotals.Total,
                        WorkSalesRevenue = dayWorkSaleTotals.Revenue,
                        WorkSalesCost = dayWorkSaleTotals.Cost,
                        WorkSalesProfit = dayWorkSaleTotals.Profit,
                        InvoiceStockCost = dayInvoiceStockCostTotals.Cost,
                        NetIncome = (dayIncomes + dayWorkSaleTotals.Profit + dayArchivedInvoiceTotals.Total) -
                                    (dayExpenses + dayInvoiceStockCostTotals.Cost) -
                                    dayPurchases -
                                    dayRents
                    };
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
                    TotalSalaries = salaryTotals.TotalSalaries,
                    TotalEmployeePayments = salaryTotals.TotalSalaries,
                    TotalArchivedInvoices = archivedInvoiceTotals.Total,
                    ArchivedInvoicesCount = archivedInvoiceTotals.Count,
                    TotalWorkSalesRevenue = workSaleTotals.Revenue,
                    TotalWorkSalesCost = workSaleTotals.Cost,
                    TotalWorkSalesProfit = workSaleTotals.Profit,
                    TotalInvoiceStockCost = invoiceStockCostTotals.Cost,
                    InvoiceStockCostCount = invoiceStockCostTotals.Count,
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
                    Rents = weeklyRents.Count,
                    ArchivedInvoices = weeklyArchivedInvoices.Count,
                    WorkSales = weeklyWorkSales.Count,
                    InvoiceStockCostMovements = invoiceStockCostTotals.Count,
                    StockMovements = stockSplitTotals.TotalMovementCount,
                    WorkerTasks = workerTaskCounts.Total
                },
                ArchivedInvoices = BuildArchivedInvoiceReport(archivedInvoiceTotals),
                StockSplit = BuildStockSplitReport(stockSplitTotals),
                WorkerTaskCounts = new
                {
                    Total = workerTaskCounts.Total,
                    Waiting = workerTaskCounts.Waiting,
                    InProcess = workerTaskCounts.InProcess,
                    Completed = workerTaskCounts.Completed
                },
                ExpenseBreakdown = BuildExpenseBreakdown(weeklyExpenses, totalOutflow, invoiceStockCostTotals, salaryTotals)
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

            var monthlyWorkSales = await _context.WorkSales
                .Where(workSale => workSale.Date >= startOfMonth && workSale.Date < endOfMonth)
                .ToListAsync();
            var monthlyArchivedInvoices = await _context.InvoiceArchives
                .Where(invoice => invoice.CreatedAt >= startOfMonth && invoice.CreatedAt < endOfMonth)
                .ToListAsync();
            var monthlyInvoiceStockCostMovements = await GetInvoiceStockCostMovementSnapshotsAsync(startOfMonth, endOfMonth);
            var workSaleTotals = GetWorkSaleFinancialTotals(monthlyWorkSales);
            var archivedInvoiceTotals = GetArchivedInvoiceFinancialTotals(monthlyArchivedInvoices);
            var invoiceStockCostTotals = GetInvoiceStockCostTotals(monthlyInvoiceStockCostMovements);
            var stockSplitTotals = await GetStockSplitTotalsAsync(startOfMonth, endOfMonth);
            var salaryTotals = await GetSalaryFinancialTotalsAsync(startOfMonth, endOfMonth);
            var workerTaskCounts = await GetWorkerTaskCountsAsync(startOfMonth, endOfMonth);

            // Calculate employee salaries for the month
            var totalEmployeePayments = salaryTotals.TotalSalaries;
            
            var totalExpenses = monthlyExpenses.Sum(e => e.Amount) + invoiceStockCostTotals.Cost;
            var totalIncome = monthlyIncomes.Sum(i => i.Amount) + workSaleTotals.Profit + archivedInvoiceTotals.Total;
            var totalPurchases = monthlyPurchases.Sum(p => p.TotalPrice);
            var totalRents = monthlyRents.Sum(r => r.MonthlyAmount);
            var totalOutflow = totalExpenses + totalPurchases + totalRents + totalEmployeePayments;
            var netIncome = totalIncome - totalOutflow;

            var dailyBreakdown = Enumerable.Range(0, DateTime.DaysInMonth(targetYear, targetMonth))
                .Select(dayOffset =>
                {
                    var day = startOfMonth.AddDays(dayOffset).Date;
                    var dayExpenses = monthlyExpenses.Where(e => e.Date.Date == day).Sum(e => e.Amount);
                    var dayIncomes = monthlyIncomes.Where(i => i.Date.Date == day).Sum(i => i.Amount);
                    var dayPurchases = monthlyPurchases.Where(p => p.PurchaseDate.Date == day).Sum(p => p.TotalPrice);
                    var dayRents = monthlyRents.Where(r => r.PaymentDate.Date == day).Sum(r => r.MonthlyAmount);
                    var dayWorkSaleTotals = GetWorkSaleFinancialTotals(monthlyWorkSales.Where(workSale => workSale.Date.Date == day));
                    var dayArchivedInvoiceTotals = GetArchivedInvoiceFinancialTotals(monthlyArchivedInvoices.Where(invoice => invoice.CreatedAt.Date == day));
                    var dayInvoiceStockCostTotals = GetInvoiceStockCostTotals(monthlyInvoiceStockCostMovements.Where(movement => movement.OccurredAt.Date == day));

                    return new
                    {
                        Date = day,
                        DayOfMonth = dayOffset + 1,
                        Expenses = dayExpenses + dayInvoiceStockCostTotals.Cost,
                        Incomes = dayIncomes + dayWorkSaleTotals.Profit + dayArchivedInvoiceTotals.Total,
                        Purchases = dayPurchases,
                        Rents = dayRents,
                        ArchivedInvoices = dayArchivedInvoiceTotals.Total,
                        WorkSalesRevenue = dayWorkSaleTotals.Revenue,
                        WorkSalesCost = dayWorkSaleTotals.Cost,
                        WorkSalesProfit = dayWorkSaleTotals.Profit,
                        InvoiceStockCost = dayInvoiceStockCostTotals.Cost,
                        NetIncome = (dayIncomes + dayWorkSaleTotals.Profit + dayArchivedInvoiceTotals.Total) -
                                    (dayExpenses + dayInvoiceStockCostTotals.Cost) -
                                    dayPurchases -
                                    dayRents
                    };
                })
                .Where(x => x.Expenses > 0 || x.Incomes > 0 || x.Purchases > 0 || x.Rents > 0 || x.ArchivedInvoices > 0 || x.WorkSalesRevenue > 0 || x.WorkSalesCost > 0 || x.InvoiceStockCost > 0)
                .ToList();

            var weeklyBreakdown = Enumerable.Range(0, 6)
                .Select(weekOffset =>
                {
                    var weekStart = startOfMonth.AddDays(weekOffset * 7);
                    var weekEnd = startOfMonth.AddDays((weekOffset + 1) * 7);
                    var weekExpenses = monthlyExpenses.Where(e => e.Date >= weekStart && e.Date < weekEnd).Sum(e => e.Amount);
                    var weekIncomes = monthlyIncomes.Where(i => i.Date >= weekStart && i.Date < weekEnd).Sum(i => i.Amount);
                    var weekPurchases = monthlyPurchases.Where(p => p.PurchaseDate >= weekStart && p.PurchaseDate < weekEnd).Sum(p => p.TotalPrice);
                    var weekRents = monthlyRents.Where(r => r.PaymentDate >= weekStart && r.PaymentDate < weekEnd).Sum(r => r.MonthlyAmount);
                    var weekWorkSaleTotals = GetWorkSaleFinancialTotals(monthlyWorkSales.Where(workSale => workSale.Date >= weekStart && workSale.Date < weekEnd));
                    var weekArchivedInvoiceTotals = GetArchivedInvoiceFinancialTotals(monthlyArchivedInvoices.Where(invoice => invoice.CreatedAt >= weekStart && invoice.CreatedAt < weekEnd));
                    var weekInvoiceStockCostTotals = GetInvoiceStockCostTotals(monthlyInvoiceStockCostMovements.Where(movement => movement.OccurredAt >= weekStart && movement.OccurredAt < weekEnd));

                    return new
                    {
                        WeekNumber = weekOffset + 1,
                        StartDate = weekStart,
                        EndDate = weekEnd.AddDays(-1),
                        Expenses = weekExpenses + weekInvoiceStockCostTotals.Cost,
                        Incomes = weekIncomes + weekWorkSaleTotals.Profit + weekArchivedInvoiceTotals.Total,
                        Purchases = weekPurchases,
                        Rents = weekRents,
                        ArchivedInvoices = weekArchivedInvoiceTotals.Total,
                        WorkSalesRevenue = weekWorkSaleTotals.Revenue,
                        WorkSalesCost = weekWorkSaleTotals.Cost,
                        WorkSalesProfit = weekWorkSaleTotals.Profit,
                        InvoiceStockCost = weekInvoiceStockCostTotals.Cost,
                        NetIncome = (weekIncomes + weekWorkSaleTotals.Profit + weekArchivedInvoiceTotals.Total) -
                                    (weekExpenses + weekInvoiceStockCostTotals.Cost) -
                                    weekPurchases -
                                    weekRents
                    };
                })
                .Where(x => x.Expenses > 0 || x.Incomes > 0 || x.Purchases > 0 || x.Rents > 0 || x.ArchivedInvoices > 0 || x.WorkSalesRevenue > 0 || x.WorkSalesCost > 0 || x.InvoiceStockCost > 0)
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
                    TotalSalaries = totalEmployeePayments,
                    TotalEmployeePayments = totalEmployeePayments,
                    TotalArchivedInvoices = archivedInvoiceTotals.Total,
                    ArchivedInvoicesCount = archivedInvoiceTotals.Count,
                    TotalWorkSalesRevenue = workSaleTotals.Revenue,
                    TotalWorkSalesCost = workSaleTotals.Cost,
                    TotalWorkSalesProfit = workSaleTotals.Profit,
                    TotalInvoiceStockCost = invoiceStockCostTotals.Cost,
                    InvoiceStockCostCount = invoiceStockCostTotals.Count,
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
                    Rents = monthlyRents.Count,
                    ArchivedInvoices = monthlyArchivedInvoices.Count,
                    WorkSales = monthlyWorkSales.Count,
                    InvoiceStockCostMovements = invoiceStockCostTotals.Count,
                    StockMovements = stockSplitTotals.TotalMovementCount,
                    WorkerTasks = workerTaskCounts.Total
                },
                ArchivedInvoices = BuildArchivedInvoiceReport(archivedInvoiceTotals),
                StockSplit = BuildStockSplitReport(stockSplitTotals),
                WorkerTaskCounts = new
                {
                    Total = workerTaskCounts.Total,
                    Waiting = workerTaskCounts.Waiting,
                    InProcess = workerTaskCounts.InProcess,
                    Completed = workerTaskCounts.Completed
                },
                ExpenseBreakdown = BuildExpenseBreakdown(monthlyExpenses, totalOutflow, invoiceStockCostTotals, salaryTotals)
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

            var annualWorkSales = await _context.WorkSales
                .Where(workSale => workSale.Date >= startOfYear && workSale.Date < endOfYear)
                .ToListAsync();
            var annualArchivedInvoices = await _context.InvoiceArchives
                .Where(invoice => invoice.CreatedAt >= startOfYear && invoice.CreatedAt < endOfYear)
                .ToListAsync();
            var annualInvoiceStockCostMovements = await GetInvoiceStockCostMovementSnapshotsAsync(startOfYear, endOfYear);
            var workSaleTotals = GetWorkSaleFinancialTotals(annualWorkSales);
            var archivedInvoiceTotals = GetArchivedInvoiceFinancialTotals(annualArchivedInvoices);
            var invoiceStockCostTotals = GetInvoiceStockCostTotals(annualInvoiceStockCostMovements);
            var stockSplitTotals = await GetStockSplitTotalsAsync(startOfYear, endOfYear);
            var salaryTotals = await GetSalaryFinancialTotalsAsync(startOfYear, endOfYear);
            var workerTaskCounts = await GetWorkerTaskCountsAsync(startOfYear, endOfYear);

            var totalExpenses = annualExpenses.Sum(e => e.Amount) + invoiceStockCostTotals.Cost;
            var totalIncome = annualIncomes.Sum(i => i.Amount) + workSaleTotals.Profit + archivedInvoiceTotals.Total;
            var totalPurchases = annualPurchases.Sum(p => p.TotalPrice);
            var totalRents = annualRents.Sum(r => r.MonthlyAmount);
            var totalOutflow = totalExpenses + totalPurchases + totalRents + salaryTotals.TotalSalaries;
            var netIncome = totalIncome - totalOutflow;

            var monthlyBreakdown = Enumerable.Range(1, 12)
                .Select(month =>
                {
                    var monthExpenses = annualExpenses.Where(e => e.Date.Month == month).Sum(e => e.Amount);
                    var monthIncomes = annualIncomes.Where(i => i.Date.Month == month).Sum(i => i.Amount);
                    var monthPurchases = annualPurchases.Where(p => p.PurchaseDate.Month == month).Sum(p => p.TotalPrice);
                    var monthRents = annualRents.Where(r => r.PaymentDate.Month == month).Sum(r => r.MonthlyAmount);
                    var monthWorkSaleTotals = GetWorkSaleFinancialTotals(annualWorkSales.Where(workSale => workSale.Date.Month == month));
                    var monthArchivedInvoiceTotals = GetArchivedInvoiceFinancialTotals(annualArchivedInvoices.Where(invoice => invoice.CreatedAt.Month == month));
                    var monthInvoiceStockCostTotals = GetInvoiceStockCostTotals(annualInvoiceStockCostMovements.Where(movement => movement.OccurredAt.Month == month));

                    return new
                    {
                        Year = targetYear,
                        Month = month,
                        MonthName = new DateTime(targetYear, month, 1).ToString("MMMM"),
                        Expenses = monthExpenses + monthInvoiceStockCostTotals.Cost,
                        Incomes = monthIncomes + monthWorkSaleTotals.Profit + monthArchivedInvoiceTotals.Total,
                        Purchases = monthPurchases,
                        Rents = monthRents,
                        ArchivedInvoices = monthArchivedInvoiceTotals.Total,
                        WorkSalesRevenue = monthWorkSaleTotals.Revenue,
                        WorkSalesCost = monthWorkSaleTotals.Cost,
                        WorkSalesProfit = monthWorkSaleTotals.Profit,
                        InvoiceStockCost = monthInvoiceStockCostTotals.Cost,
                        NetIncome = (monthIncomes + monthWorkSaleTotals.Profit + monthArchivedInvoiceTotals.Total) -
                                    (monthExpenses + monthInvoiceStockCostTotals.Cost) -
                                    monthPurchases -
                                    monthRents
                    };
                })
                .ToList();

            var quarterlyBreakdown = Enumerable.Range(1, 4)
                .Select(quarter =>
                {
                    var startMonth = (quarter - 1) * 3 + 1;
                    var endMonth = quarter * 3;
                    var quarterExpenses = annualExpenses.Where(e => e.Date.Month >= startMonth && e.Date.Month <= endMonth).Sum(e => e.Amount);
                    var quarterIncomes = annualIncomes.Where(i => i.Date.Month >= startMonth && i.Date.Month <= endMonth).Sum(i => i.Amount);
                    var quarterPurchases = annualPurchases.Where(p => p.PurchaseDate.Month >= startMonth && p.PurchaseDate.Month <= endMonth).Sum(p => p.TotalPrice);
                    var quarterRents = annualRents.Where(r => r.PaymentDate.Month >= startMonth && r.PaymentDate.Month <= endMonth).Sum(r => r.MonthlyAmount);
                    var quarterWorkSaleTotals = GetWorkSaleFinancialTotals(annualWorkSales.Where(workSale => workSale.Date.Month >= startMonth && workSale.Date.Month <= endMonth));
                    var quarterArchivedInvoiceTotals = GetArchivedInvoiceFinancialTotals(annualArchivedInvoices.Where(invoice => invoice.CreatedAt.Month >= startMonth && invoice.CreatedAt.Month <= endMonth));
                    var quarterInvoiceStockCostTotals = GetInvoiceStockCostTotals(annualInvoiceStockCostMovements.Where(movement => movement.OccurredAt.Month >= startMonth && movement.OccurredAt.Month <= endMonth));

                    return new
                    {
                        Quarter = quarter,
                        StartMonth = startMonth,
                        EndMonth = endMonth,
                        Expenses = quarterExpenses + quarterInvoiceStockCostTotals.Cost,
                        Incomes = quarterIncomes + quarterWorkSaleTotals.Profit + quarterArchivedInvoiceTotals.Total,
                        Purchases = quarterPurchases,
                        Rents = quarterRents,
                        ArchivedInvoices = quarterArchivedInvoiceTotals.Total,
                        WorkSalesRevenue = quarterWorkSaleTotals.Revenue,
                        WorkSalesCost = quarterWorkSaleTotals.Cost,
                        WorkSalesProfit = quarterWorkSaleTotals.Profit,
                        InvoiceStockCost = quarterInvoiceStockCostTotals.Cost,
                        NetIncome = (quarterIncomes + quarterWorkSaleTotals.Profit + quarterArchivedInvoiceTotals.Total) -
                                    (quarterExpenses + quarterInvoiceStockCostTotals.Cost) -
                                    quarterPurchases -
                                    quarterRents
                    };
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
                    TotalSalaries = salaryTotals.TotalSalaries,
                    TotalEmployeePayments = salaryTotals.TotalSalaries,
                    TotalArchivedInvoices = archivedInvoiceTotals.Total,
                    ArchivedInvoicesCount = archivedInvoiceTotals.Count,
                    TotalWorkSalesRevenue = workSaleTotals.Revenue,
                    TotalWorkSalesCost = workSaleTotals.Cost,
                    TotalWorkSalesProfit = workSaleTotals.Profit,
                    TotalInvoiceStockCost = invoiceStockCostTotals.Cost,
                    InvoiceStockCostCount = invoiceStockCostTotals.Count,
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
                    Rents = annualRents.Count,
                    ArchivedInvoices = annualArchivedInvoices.Count,
                    WorkSales = annualWorkSales.Count,
                    InvoiceStockCostMovements = invoiceStockCostTotals.Count,
                    StockMovements = stockSplitTotals.TotalMovementCount,
                    WorkerTasks = workerTaskCounts.Total
                },
                ArchivedInvoices = BuildArchivedInvoiceReport(archivedInvoiceTotals),
                StockSplit = BuildStockSplitReport(stockSplitTotals),
                WorkerTaskCounts = new
                {
                    Total = workerTaskCounts.Total,
                    Waiting = workerTaskCounts.Waiting,
                    InProcess = workerTaskCounts.InProcess,
                    Completed = workerTaskCounts.Completed
                },
                ExpenseBreakdown = BuildExpenseBreakdown(annualExpenses, totalOutflow, invoiceStockCostTotals, salaryTotals)
            };
        }



        // New method to get project and debt statistics for dashboard removal
        public async Task<object> GetProjectAndDebtStatsAsync()
        {
            try
            {
                var projectStats = await _context.Projects
                    .AsNoTracking()
                    .GroupBy(_ => 1)
                    .Select(group => new
                    {
                        TotalProjects = group.Count(),
                        InProgressProjects = group.Count(project => project.Status == ProjectStatus.InProgress),
                        CompletedProjects = group.Count(project => project.Status == ProjectStatus.Completed),
                        TotalPromet = group.Sum(project => project.Promet)
                    })
                    .FirstOrDefaultAsync();

                var debtStats = await _context.Debts
                    .AsNoTracking()
                    .Where(debt => !debt.IsPaid)
                    .GroupBy(_ => 1)
                    .Select(group => new
                    {
                        TotalOwedToCompany = group.Sum(debt =>
                            debt.Type == DebtType.OwedToCompany ? debt.Amount : 0m),
                        TotalCompanyOwes = group.Sum(debt =>
                            debt.Type == DebtType.CompanyOwes ? debt.Amount : 0m),
                        PendingToCompany = group.Count(debt => debt.Type == DebtType.OwedToCompany),
                        PendingFromCompany = group.Count(debt => debt.Type == DebtType.CompanyOwes)
                    })
                    .FirstOrDefaultAsync();

                return new
                {
                    Projects = new
                    {
                        TotalProjects = projectStats?.TotalProjects ?? 0,
                        InProgressProjects = projectStats?.InProgressProjects ?? 0,
                        CompletedProjects = projectStats?.CompletedProjects ?? 0,
                        TotalPromet = projectStats?.TotalPromet ?? 0m
                    },
                    Debts = new
                    {
                        TotalOwedToCompany = debtStats?.TotalOwedToCompany ?? 0m,
                        TotalCompanyOwes = debtStats?.TotalCompanyOwes ?? 0m,
                        PendingToCompany = debtStats?.PendingToCompany ?? 0,
                        PendingFromCompany = debtStats?.PendingFromCompany ?? 0
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
            var yearStart = DateTimeUtc.YearStart(year);
            var yearEnd = yearStart.AddYears(1);

            var expenseTotals = await GetMonthlyExpenseTotalsAsync(yearStart, yearEnd);
            var purchaseTotals = await GetMonthlyPurchaseTotalsAsync(yearStart, yearEnd);
            var rentTotals = await GetMonthlyRentTotalsAsync(yearStart, yearEnd);
            var incomeTotals = await GetMonthlyIncomeTotalsAsync(yearStart, yearEnd);
            var salaryTotals = await GetMonthlySalaryTotalsForYearAsync(year);
            var workSaleTotals = await GetMonthlyWorkSaleTotalsAsync(yearStart, yearEnd);
            var archivedInvoiceTotals = await GetMonthlyArchivedInvoiceTotalsAsync(yearStart, yearEnd);
            var invoiceStockCostTotals = await GetMonthlyInvoiceStockCostTotalsAsync(yearStart, yearEnd);
            var workerTaskCounts = await GetMonthlyWorkerTaskCountsAsync(yearStart, yearEnd);
            var stockTotals = await GetCurrentStockSplitTotalsAsync();
            var reports = new List<MonthlyReportDto>(12);

            for (var month = 1; month <= 12; month++)
            {
                var expenseTotal = GetMonthlyValue(expenseTotals, month);
                var purchaseTotal = GetMonthlyValue(purchaseTotals, month);
                var rentTotal = GetMonthlyValue(rentTotals, month);
                var incomeTotal = GetMonthlyValue(incomeTotals, month);
                var salaryTotal = GetMonthlyValue(salaryTotals, month, SalaryFinancialTotals.Empty);
                var workSaleTotal = GetMonthlyValue(workSaleTotals, month, WorkSaleFinancialTotals.Empty);
                var archivedInvoiceTotal = GetMonthlyValue(archivedInvoiceTotals, month, ArchivedInvoiceFinancialTotals.Empty);
                var invoiceStockCostTotal = GetMonthlyValue(invoiceStockCostTotals, month, InvoiceStockCostTotals.Empty);
                var workerTaskCount = GetMonthlyValue(workerTaskCounts, month, WorkerTaskCounts.Empty);

                var totalExpenses = expenseTotal + invoiceStockCostTotal.Cost;
                var totalIncome = incomeTotal + workSaleTotal.Profit + archivedInvoiceTotal.Total;
                var netProfit = totalIncome - (totalExpenses + rentTotal + purchaseTotal + salaryTotal.TotalSalaries);

                reports.Add(new MonthlyReportDto
                {
                    Year = year,
                    Month = month,
                    TotalSalaries = salaryTotal.TotalSalaries,
                    TotalExpenses = totalExpenses,
                    TotalRent = rentTotal,
                    TotalPurchases = purchaseTotal,
                    TotalIncome = totalIncome,
                    NetProfit = netProfit,
                    EmployeeCount = salaryTotal.EmployeeCount,
                    TotalArchivedInvoices = archivedInvoiceTotal.Total,
                    ArchivedInvoicesCount = archivedInvoiceTotal.Count,
                    TotalWorkSalesRevenue = workSaleTotal.Revenue,
                    TotalWorkSalesCost = workSaleTotal.Cost,
                    TotalWorkSalesProfit = workSaleTotal.Profit,
                    WorkSalesCount = workSaleTotal.Count,
                    TotalInvoiceStockCost = invoiceStockCostTotal.Cost,
                    InvoiceStockCostCount = invoiceStockCostTotal.Count,
                    MaterialStockItemCount = stockTotals.Material.ItemCount,
                    MaterialStockQuantity = stockTotals.Material.CurrentQuantity,
                    ProductStockItemCount = stockTotals.Product.ItemCount,
                    ProductStockQuantity = stockTotals.Product.CurrentQuantity,
                    WorkerTasksTotal = workerTaskCount.Total,
                    WorkerTasksWaiting = workerTaskCount.Waiting,
                    WorkerTasksInProcess = workerTaskCount.InProcess,
                    WorkerTasksCompleted = workerTaskCount.Completed
                });
            }

            return reports;
        }

        // Breakdown për blerjet (purchases) - Ditore
        private async Task<DashboardEmployeeCounts> GetDashboardEmployeeCountsAsync()
        {
            return await _context.Employees
                .AsNoTracking()
                .Where(employee => !employee.IsDeleted)
                .GroupBy(_ => 1)
                .Select(group => new DashboardEmployeeCounts
                {
                    Total = group.Count(),
                    Magazine = group.Count(employee => employee.Position == EmployeePosition.Magazine),
                    Terren = group.Count(employee => employee.Position == EmployeePosition.Terren)
                })
                .FirstOrDefaultAsync() ?? DashboardEmployeeCounts.Empty;
        }

        private async Task<DashboardAmountBuckets> GetDashboardExpenseBucketsAsync(
            IQueryable<Expense> expenses,
            DateTime currentMonthStart,
            DateTime currentMonthEnd,
            DateTime yearStart,
            DateTime yearEndInclusive)
        {
            return await expenses
                .GroupBy(_ => 1)
                .Select(group => new DashboardAmountBuckets
                {
                    CurrentMonth = group.Sum(expense =>
                        expense.Date >= currentMonthStart && expense.Date < currentMonthEnd
                            ? expense.Amount
                            : 0m),
                    YearToDate = group.Sum(expense =>
                        expense.Date >= yearStart && expense.Date <= yearEndInclusive
                            ? expense.Amount
                            : 0m),
                    Total = group.Sum(expense => expense.Amount)
                })
                .FirstOrDefaultAsync() ?? DashboardAmountBuckets.Empty;
        }

        private async Task<DashboardAmountBuckets> GetDashboardPurchaseBucketsAsync(
            IQueryable<Purchase> purchases,
            DateTime currentMonthStart,
            DateTime currentMonthEnd,
            DateTime yearStart,
            DateTime yearEndInclusive)
        {
            return await purchases
                .GroupBy(_ => 1)
                .Select(group => new DashboardAmountBuckets
                {
                    CurrentMonth = group.Sum(purchase =>
                        purchase.PurchaseDate >= currentMonthStart && purchase.PurchaseDate < currentMonthEnd
                            ? purchase.TotalPrice
                            : 0m),
                    YearToDate = group.Sum(purchase =>
                        purchase.PurchaseDate >= yearStart && purchase.PurchaseDate <= yearEndInclusive
                            ? purchase.TotalPrice
                            : 0m),
                    Total = group.Sum(purchase => purchase.TotalPrice)
                })
                .FirstOrDefaultAsync() ?? DashboardAmountBuckets.Empty;
        }

        private async Task<DashboardAmountBuckets> GetDashboardIncomeBucketsAsync(
            DateTime currentMonthStart,
            DateTime currentMonthEnd,
            DateTime yearStart,
            DateTime yearEndInclusive)
        {
            return await _context.Incomes
                .AsNoTracking()
                .GroupBy(_ => 1)
                .Select(group => new DashboardAmountBuckets
                {
                    CurrentMonth = group.Sum(income =>
                        income.Date >= currentMonthStart && income.Date < currentMonthEnd
                            ? income.Amount
                            : 0m),
                    YearToDate = group.Sum(income =>
                        income.Date >= yearStart && income.Date <= yearEndInclusive
                            ? income.Amount
                            : 0m),
                    Total = group.Sum(income => income.Amount)
                })
                .FirstOrDefaultAsync() ?? DashboardAmountBuckets.Empty;
        }

        private async Task<DashboardAmountBuckets> GetDashboardRentBucketsAsync(
            DateTime currentMonthStart,
            DateTime currentMonthEnd,
            DateTime yearStart,
            DateTime yearEndInclusive)
        {
            return await _context.Rents
                .AsNoTracking()
                .GroupBy(_ => 1)
                .Select(group => new DashboardAmountBuckets
                {
                    CurrentMonth = group.Sum(rent =>
                        rent.PaymentDate >= currentMonthStart && rent.PaymentDate < currentMonthEnd
                            ? rent.MonthlyAmount
                            : 0m),
                    YearToDate = group.Sum(rent =>
                        rent.PaymentDate >= yearStart && rent.PaymentDate <= yearEndInclusive
                            ? rent.MonthlyAmount
                            : 0m),
                    Total = group.Sum(rent => rent.MonthlyAmount)
                })
                .FirstOrDefaultAsync() ?? DashboardAmountBuckets.Empty;
        }

        private async Task<DashboardWorkSaleBuckets> GetDashboardWorkSaleBucketsAsync(
            DateTime currentMonthStart,
            DateTime currentMonthEnd,
            DateTime yearStart,
            DateTime todayExclusive)
        {
            var row = await _context.WorkSales
                .AsNoTracking()
                .GroupBy(_ => 1)
                .Select(group => new DashboardWorkSaleBucketRow
                {
                    CurrentMonthRevenue = group.Sum(workSale =>
                        workSale.Date >= currentMonthStart && workSale.Date < currentMonthEnd
                            ? workSale.TotalRevenue
                            : 0m),
                    CurrentMonthCost = group.Sum(workSale =>
                        workSale.Date >= currentMonthStart && workSale.Date < currentMonthEnd
                            ? workSale.TotalCost
                            : 0m),
                    CurrentMonthProfit = group.Sum(workSale =>
                        workSale.Date >= currentMonthStart && workSale.Date < currentMonthEnd
                            ? workSale.Profit
                            : 0m),
                    CurrentMonthCount = group.Sum(workSale =>
                        workSale.Date >= currentMonthStart && workSale.Date < currentMonthEnd ? 1 : 0),
                    YearToDateRevenue = group.Sum(workSale =>
                        workSale.Date >= yearStart && workSale.Date < todayExclusive
                            ? workSale.TotalRevenue
                            : 0m),
                    YearToDateCost = group.Sum(workSale =>
                        workSale.Date >= yearStart && workSale.Date < todayExclusive
                            ? workSale.TotalCost
                            : 0m),
                    YearToDateProfit = group.Sum(workSale =>
                        workSale.Date >= yearStart && workSale.Date < todayExclusive
                            ? workSale.Profit
                            : 0m),
                    YearToDateCount = group.Sum(workSale =>
                        workSale.Date >= yearStart && workSale.Date < todayExclusive ? 1 : 0),
                    TotalRevenue = group.Sum(workSale => workSale.TotalRevenue),
                    TotalCost = group.Sum(workSale => workSale.TotalCost),
                    TotalProfit = group.Sum(workSale => workSale.Profit),
                    TotalCount = group.Count()
                })
                .FirstOrDefaultAsync();

            return row?.ToBuckets() ?? DashboardWorkSaleBuckets.Empty;
        }

        private async Task<DashboardArchivedInvoiceBuckets> GetDashboardArchivedInvoiceBucketsAsync(
            DateTime currentMonthStart,
            DateTime currentMonthEnd,
            DateTime yearStart,
            DateTime todayExclusive)
        {
            var invoices = await GetArchivedInvoiceFinancialSnapshots().ToListAsync();
            var currentMonth = new ArchivedInvoiceFinancialAccumulator();
            var yearToDate = new ArchivedInvoiceFinancialAccumulator();
            var allTime = new ArchivedInvoiceFinancialAccumulator();

            foreach (var invoice in invoices)
            {
                allTime.Add(invoice);

                if (invoice.CreatedAt >= yearStart && invoice.CreatedAt < todayExclusive)
                {
                    yearToDate.Add(invoice);
                }

                if (invoice.CreatedAt >= currentMonthStart && invoice.CreatedAt < currentMonthEnd)
                {
                    currentMonth.Add(invoice);
                }
            }

            return new DashboardArchivedInvoiceBuckets
            {
                CurrentMonth = currentMonth.ToTotals(),
                YearToDate = yearToDate.ToTotals(),
                AllTime = allTime.ToTotals()
            };
        }

        private async Task<DashboardInvoiceStockCostBuckets> GetDashboardInvoiceStockCostBucketsAsync(
            DateTime currentMonthStart,
            DateTime currentMonthEnd,
            DateTime yearStart,
            DateTime todayExclusive)
        {
            var movements = await GetInvoiceStockCostMovementSnapshotsAsync(null, null);
            var currentMonth = new InvoiceStockCostAccumulator();
            var yearToDate = new InvoiceStockCostAccumulator();
            var allTime = new InvoiceStockCostAccumulator();

            foreach (var movement in movements)
            {
                allTime.Add(movement);

                if (movement.OccurredAt >= yearStart && movement.OccurredAt < todayExclusive)
                {
                    yearToDate.Add(movement);
                }

                if (movement.OccurredAt >= currentMonthStart && movement.OccurredAt < currentMonthEnd)
                {
                    currentMonth.Add(movement);
                }
            }

            return new DashboardInvoiceStockCostBuckets
            {
                CurrentMonth = currentMonth.ToTotals(),
                YearToDate = yearToDate.ToTotals(),
                AllTime = allTime.ToTotals()
            };
        }

        private async Task<DashboardSalaryBuckets> GetDashboardSalaryTotalsAsync(
            DateTime currentMonthStart,
            DateTime currentMonthEnd,
            DateTime yearStart,
            DateTime todayExclusive)
        {
            if (!_currentUserService.IsAdmin())
            {
                return DashboardSalaryBuckets.Empty;
            }

            var records = SelectLatestSalaryRecords(await _context.SalaryRecords
                .AsNoTracking()
                .ToListAsync());
            var currentMonth = new SalaryFinancialAccumulator();
            var yearToDate = new SalaryFinancialAccumulator();
            var allTime = new SalaryFinancialAccumulator();
            var yearSalaryEnd = GetMonthAfterLastCoveredDate(todayExclusive);

            foreach (var record in records)
            {
                allTime.Add(record.EmployeeId, record.TotalSalary, record.DaysWorked);

                if (record.Month >= yearStart && record.Month < yearSalaryEnd)
                {
                    yearToDate.Add(
                        record.EmployeeId,
                        record.TotalSalary,
                        record.DaysWorked,
                        GetMonthCoverageFactor(record.Month, yearStart, todayExclusive));
                }

                if (record.Month >= currentMonthStart && record.Month < currentMonthEnd)
                {
                    currentMonth.Add(
                        record.EmployeeId,
                        record.TotalSalary,
                        record.DaysWorked,
                        GetMonthCoverageFactor(record.Month, currentMonthStart, currentMonthEnd));
                }
            }

            var recordedEmployeeMonths = records
                .Select(record => EmployeeMonthKey.From(record.EmployeeId, record.Month))
                .ToHashSet();

            await AddDashboardFallbackSalariesAsync(
                currentMonthStart,
                currentMonthEnd,
                yearStart,
                todayExclusive,
                recordedEmployeeMonths,
                currentMonth,
                yearToDate,
                allTime);

            return new DashboardSalaryBuckets
            {
                CurrentMonth = currentMonth.ToTotals(),
                YearToDate = yearToDate.ToTotals(),
                AllTime = allTime.ToTotals()
            };
        }

        private async Task AddDashboardFallbackSalariesAsync(
            DateTime currentMonthStart,
            DateTime currentMonthEnd,
            DateTime yearStart,
            DateTime todayExclusive,
            IReadOnlySet<EmployeeMonthKey> recordedEmployeeMonths,
            SalaryFinancialAccumulator currentMonth,
            SalaryFinancialAccumulator yearToDate,
            SalaryFinancialAccumulator allTime)
        {
            var employees = await _context.Employees
                .AsNoTracking()
                .Where(employee => !employee.IsDeleted)
                .ToListAsync();
            if (employees.Count == 0)
            {
                return;
            }

            var monthStarts = GetCoveredMonthStarts(yearStart, todayExclusive);
            if (monthStarts.Count == 0)
            {
                return;
            }

            var employeeIds = employees.Select(employee => employee.Id).ToList();
            var attendanceTotals = await GetAttendanceSalaryTotalsAsync(
                employeeIds,
                monthStarts.First(),
                currentMonthEnd);

            foreach (var monthStart in monthStarts)
            {
                var monthEnd = monthStart.AddMonths(1);
                var isCurrentMonth = monthStart.Year == currentMonthStart.Year &&
                    monthStart.Month == currentMonthStart.Month;

                foreach (var employee in employees)
                {
                    if (DateTimeUtc.Date(employee.HireDate) >= monthEnd)
                    {
                        continue;
                    }

                    var key = EmployeeMonthKey.From(employee.Id, monthStart);
                    if (recordedEmployeeMonths.Contains(key))
                    {
                        continue;
                    }

                    attendanceTotals.TryGetValue(key, out var attendance);
                    var fallbackSalary = BuildFallbackEmployeeMonthlySalary(
                        employee,
                        monthStart,
                        1m,
                        attendance);

                    yearToDate.Add(
                        fallbackSalary.EmployeeId,
                        fallbackSalary.TotalSalary,
                        fallbackSalary.DaysWorked,
                        GetMonthCoverageFactor(monthStart, yearStart, todayExclusive));

                    if (!isCurrentMonth)
                    {
                        continue;
                    }

                    currentMonth.Add(
                        fallbackSalary.EmployeeId,
                        fallbackSalary.TotalSalary,
                        fallbackSalary.DaysWorked,
                        GetMonthCoverageFactor(monthStart, currentMonthStart, currentMonthEnd));
                    allTime.Add(
                        fallbackSalary.EmployeeId,
                        fallbackSalary.TotalSalary,
                        fallbackSalary.DaysWorked,
                        GetMonthCoverageFactor(monthStart, currentMonthStart, todayExclusive));
                }
            }
        }

        private async Task<Dictionary<EmployeeMonthKey, AttendanceSalaryTotals>> GetAttendanceSalaryTotalsAsync(
            IReadOnlyCollection<int> employeeIds,
            DateTime startDate,
            DateTime endExclusive)
        {
            if (employeeIds.Count == 0 || endExclusive <= startDate)
            {
                return new Dictionary<EmployeeMonthKey, AttendanceSalaryTotals>();
            }

            return await _context.AttendanceRecords
                .AsNoTracking()
                .Where(record =>
                    employeeIds.Contains(record.EmployeeId) &&
                    record.Date >= startDate &&
                    record.Date < endExclusive)
                .GroupBy(record => new { record.EmployeeId, record.Date.Year, record.Date.Month })
                .Select(group => new AttendanceSalaryTotals
                {
                    EmployeeId = group.Key.EmployeeId,
                    Year = group.Key.Year,
                    Month = group.Key.Month,
                    AbsentDays = group.Count(record => !record.IsPresent),
                    DailyBonuses = group.Sum(record => record.DailyBonus ?? 0),
                    DailyPenalties = group.Sum(record => record.DailyPenalty ?? 0)
                })
                .ToDictionaryAsync(
                    totals => new EmployeeMonthKey(totals.EmployeeId, totals.Year, totals.Month));
        }

        private async Task<Dictionary<int, decimal>> GetMonthlyExpenseTotalsAsync(DateTime yearStart, DateTime yearEnd)
        {
            return await _context.Expenses
                .AsNoTracking()
                .Where(expense => expense.Date >= yearStart && expense.Date < yearEnd)
                .GroupBy(expense => expense.Date.Month)
                .Select(group => new { Month = group.Key, Total = group.Sum(expense => expense.Amount) })
                .ToDictionaryAsync(item => item.Month, item => item.Total);
        }

        private async Task<Dictionary<int, decimal>> GetMonthlyPurchaseTotalsAsync(DateTime yearStart, DateTime yearEnd)
        {
            return await _context.Purchases
                .AsNoTracking()
                .Where(purchase => purchase.PurchaseDate >= yearStart && purchase.PurchaseDate < yearEnd)
                .GroupBy(purchase => purchase.PurchaseDate.Month)
                .Select(group => new { Month = group.Key, Total = group.Sum(purchase => purchase.TotalPrice) })
                .ToDictionaryAsync(item => item.Month, item => item.Total);
        }

        private async Task<Dictionary<int, decimal>> GetMonthlyRentTotalsAsync(DateTime yearStart, DateTime yearEnd)
        {
            return await _context.Rents
                .AsNoTracking()
                .Where(rent => rent.PaymentDate >= yearStart && rent.PaymentDate < yearEnd)
                .GroupBy(rent => rent.PaymentDate.Month)
                .Select(group => new { Month = group.Key, Total = group.Sum(rent => rent.MonthlyAmount) })
                .ToDictionaryAsync(item => item.Month, item => item.Total);
        }

        private async Task<Dictionary<int, decimal>> GetMonthlyIncomeTotalsAsync(DateTime yearStart, DateTime yearEnd)
        {
            return await _context.Incomes
                .AsNoTracking()
                .Where(income => income.Date >= yearStart && income.Date < yearEnd)
                .GroupBy(income => income.Date.Month)
                .Select(group => new { Month = group.Key, Total = group.Sum(income => income.Amount) })
                .ToDictionaryAsync(item => item.Month, item => item.Total);
        }

        private async Task<Dictionary<int, SalaryFinancialTotals>> GetMonthlySalaryTotalsForYearAsync(int year)
        {
            if (!_currentUserService.IsAdmin())
            {
                return new Dictionary<int, SalaryFinancialTotals>();
            }

            var yearStart = DateTimeUtc.YearStart(year);
            var yearEnd = yearStart.AddYears(1);
            var accumulators = Enumerable.Range(1, 12)
                .ToDictionary(month => month, _ => new SalaryFinancialAccumulator());
            var records = SelectLatestSalaryRecords(await _context.SalaryRecords
                .AsNoTracking()
                .Where(record => record.Month >= yearStart && record.Month < yearEnd)
                .ToListAsync());

            foreach (var record in records)
            {
                if (record.Month.Year == year && accumulators.TryGetValue(record.Month.Month, out var accumulator))
                {
                    accumulator.Add(record.EmployeeId, record.TotalSalary, record.DaysWorked);
                }
            }

            var recordedEmployeeMonths = records
                .Select(record => EmployeeMonthKey.From(record.EmployeeId, record.Month))
                .ToHashSet();
            var employees = await _context.Employees
                .AsNoTracking()
                .Where(employee => !employee.IsDeleted)
                .ToListAsync();
            if (employees.Count > 0)
            {
                var employeeIds = employees.Select(employee => employee.Id).ToList();
                var attendanceTotals = await GetAttendanceSalaryTotalsAsync(employeeIds, yearStart, yearEnd);

                foreach (var month in Enumerable.Range(1, 12))
                {
                    var monthStart = DateTimeUtc.MonthStart(year, month);
                    var monthEnd = monthStart.AddMonths(1);

                    foreach (var employee in employees)
                    {
                        if (DateTimeUtc.Date(employee.HireDate) >= monthEnd)
                        {
                            continue;
                        }

                        var key = EmployeeMonthKey.From(employee.Id, monthStart);
                        if (recordedEmployeeMonths.Contains(key))
                        {
                            continue;
                        }

                        attendanceTotals.TryGetValue(key, out var attendance);
                        var fallbackSalary = BuildFallbackEmployeeMonthlySalary(
                            employee,
                            monthStart,
                            1m,
                            attendance);
                        accumulators[month].Add(
                            fallbackSalary.EmployeeId,
                            fallbackSalary.TotalSalary,
                            fallbackSalary.DaysWorked);
                    }
                }
            }

            return accumulators.ToDictionary(
                item => item.Key,
                item => item.Value.ToTotals());
        }

        private async Task<Dictionary<int, WorkSaleFinancialTotals>> GetMonthlyWorkSaleTotalsAsync(DateTime yearStart, DateTime yearEnd)
        {
            var rows = await _context.WorkSales
                .AsNoTracking()
                .Where(workSale => workSale.Date >= yearStart && workSale.Date < yearEnd)
                .GroupBy(workSale => workSale.Date.Month)
                .Select(group => new MonthlyWorkSaleTotalsRow
                {
                    Month = group.Key,
                    Revenue = group.Sum(workSale => workSale.TotalRevenue),
                    Cost = group.Sum(workSale => workSale.TotalCost),
                    Profit = group.Sum(workSale => workSale.Profit),
                    Count = group.Count()
                })
                .ToListAsync();

            return rows.ToDictionary(
                row => row.Month,
                row => new WorkSaleFinancialTotals
                {
                    Revenue = row.Revenue,
                    Cost = row.Cost,
                    Profit = row.Profit,
                    Count = row.Count
                });
        }

        private async Task<Dictionary<int, ArchivedInvoiceFinancialTotals>> GetMonthlyArchivedInvoiceTotalsAsync(
            DateTime yearStart,
            DateTime yearEnd)
        {
            var invoices = await GetArchivedInvoiceFinancialSnapshots()
                .Where(invoice => invoice.CreatedAt >= yearStart && invoice.CreatedAt < yearEnd)
                .ToListAsync();
            var accumulators = new Dictionary<int, ArchivedInvoiceFinancialAccumulator>();

            foreach (var invoice in invoices)
            {
                var month = invoice.CreatedAt.Month;
                if (!accumulators.TryGetValue(month, out var accumulator))
                {
                    accumulator = new ArchivedInvoiceFinancialAccumulator();
                    accumulators[month] = accumulator;
                }

                accumulator.Add(invoice);
            }

            return accumulators.ToDictionary(
                item => item.Key,
                item => item.Value.ToTotals());
        }

        private async Task<Dictionary<int, InvoiceStockCostTotals>> GetMonthlyInvoiceStockCostTotalsAsync(
            DateTime yearStart,
            DateTime yearEnd)
        {
            var movements = await GetInvoiceStockCostMovementSnapshotsAsync(yearStart, yearEnd);
            var accumulators = new Dictionary<int, InvoiceStockCostAccumulator>();

            foreach (var movement in movements)
            {
                var month = movement.OccurredAt.Month;
                if (!accumulators.TryGetValue(month, out var accumulator))
                {
                    accumulator = new InvoiceStockCostAccumulator();
                    accumulators[month] = accumulator;
                }

                accumulator.Add(movement);
            }

            return accumulators.ToDictionary(
                item => item.Key,
                item => item.Value.ToTotals());
        }

        private async Task<Dictionary<int, WorkerTaskCounts>> GetMonthlyWorkerTaskCountsAsync(DateTime yearStart, DateTime yearEnd)
        {
            if (!_currentUserService.IsAdmin())
            {
                return new Dictionary<int, WorkerTaskCounts>();
            }

            var rows = await _context.WorkerTasks
                .AsNoTracking()
                .Where(task => task.CreatedAt >= yearStart && task.CreatedAt < yearEnd)
                .GroupBy(task => task.CreatedAt.Month)
                .Select(group => new MonthlyWorkerTaskCountsRow
                {
                    Month = group.Key,
                    Total = group.Count(),
                    Waiting = group.Count(task => task.Status == WorkerTaskStatus.Waiting),
                    InProcess = group.Count(task => task.Status == WorkerTaskStatus.InProcess),
                    Completed = group.Count(task => task.Status == WorkerTaskStatus.Completed)
                })
                .ToListAsync();

            return rows.ToDictionary(
                row => row.Month,
                row => new WorkerTaskCounts
                {
                    Total = row.Total,
                    Waiting = row.Waiting,
                    InProcess = row.InProcess,
                    Completed = row.Completed
                });
        }

        private async Task<StockSplitTotals> GetCurrentStockSplitTotalsAsync()
        {
            var stockItems = await _context.StockItems
                .AsNoTracking()
                .Select(item => new StockItemSnapshot
                {
                    Id = item.Id,
                    StockType = item.StockType,
                    ReorderLevel = item.ReorderLevel
                })
                .ToListAsync();

            if (stockItems.Count == 0)
            {
                return StockSplitTotals.Empty;
            }

            var stockItemIds = stockItems.Select(item => item.Id).ToList();
            var stockTypeById = stockItems.ToDictionary(item => item.Id, item => item.StockType);
            var balances = await _context.StockMovements
                .AsNoTracking()
                .Where(movement => stockItemIds.Contains(movement.StockItemId))
                .GroupBy(movement => movement.StockItemId)
                .Select(group => new
                {
                    StockItemId = group.Key,
                    Quantity = group.Sum(movement => movement.QuantityChange)
                })
                .ToDictionaryAsync(item => item.StockItemId, item => item.Quantity);

            return new StockSplitTotals
            {
                Material = BuildStockSplitSegment(
                    StockType.Material,
                    stockItems,
                    balances,
                    Array.Empty<StockMovementSnapshot>(),
                    stockTypeById),
                Product = BuildStockSplitSegment(
                    StockType.Product,
                    stockItems,
                    balances,
                    Array.Empty<StockMovementSnapshot>(),
                    stockTypeById)
            };
        }

        private static decimal GetMonthlyValue(IReadOnlyDictionary<int, decimal> values, int month)
        {
            return values.TryGetValue(month, out var value) ? value : 0m;
        }

        private static T GetMonthlyValue<T>(IReadOnlyDictionary<int, T> values, int month, T defaultValue)
        {
            return values.TryGetValue(month, out var value) ? value : defaultValue;
        }

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

                var employeePayments = await GetEmployeePaymentsForPeriodAsync(startDate, endExclusive);

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
                        TotalSalaries = employeePayments.TotalSalaries,
                        TotalBonuses = employeePayments.TotalBonuses,
                        TotalAttendanceDeductions = employeePayments.TotalAttendanceDeductions,
                        TotalPenalties = employeePayments.TotalPenalties,
                        TotalDeductions = employeePayments.TotalDeductions,
                        NetPayments = employeePayments.NetPayments,
                        TotalEmployees = employeePayments.TotalEmployees,
                        TotalDaysWorked = employeePayments.TotalDaysWorked,
                        EmployeePayments = employeePayments.EmployeePayments,
                        ByPosition = employeePayments.ByPosition
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

        private async Task<SalaryFinancialTotals> GetSalaryFinancialTotalsAsync(DateTime? startDate, DateTime? endExclusive)
        {
            if (!_currentUserService.IsAdmin())
            {
                return SalaryFinancialTotals.Empty;
            }

            var normalizedStartDate = startDate.HasValue ? DateTimeUtc.Date(startDate.Value) : (DateTime?)null;
            var normalizedEndExclusive = endExclusive.HasValue ? DateTimeUtc.Date(endExclusive.Value) : (DateTime?)null;

            if (normalizedStartDate.HasValue &&
                normalizedEndExclusive.HasValue &&
                normalizedEndExclusive.Value <= normalizedStartDate.Value)
            {
                return SalaryFinancialTotals.Empty;
            }

            var salaryRecords = _context.SalaryRecords.AsNoTracking().AsQueryable();

            if (normalizedStartDate.HasValue)
            {
                var firstMonth = DateTimeUtc.MonthStart(normalizedStartDate.Value.Year, normalizedStartDate.Value.Month);
                salaryRecords = salaryRecords.Where(record => record.Month >= firstMonth);
            }

            if (normalizedEndExclusive.HasValue)
            {
                var monthEndExclusive = GetMonthAfterLastCoveredDate(normalizedEndExclusive.Value);
                salaryRecords = salaryRecords.Where(record => record.Month < monthEndExclusive);
            }

            var records = SelectLatestSalaryRecords(await salaryRecords.ToListAsync());
            var totalSalaries = 0m;
            var totalDaysWorked = 0m;
            var employeeIds = records
                .Select(record => record.EmployeeId)
                .Distinct()
                .ToHashSet();
            var recordedEmployeeMonths = records
                .Select(record => EmployeeMonthKey.From(record.EmployeeId, record.Month))
                .ToHashSet();

            foreach (var record in records)
            {
                var coverageFactor = GetMonthCoverageFactor(record.Month, normalizedStartDate, normalizedEndExclusive);
                totalSalaries += record.TotalSalary * coverageFactor;
                totalDaysWorked += record.DaysWorked * coverageFactor;
            }

            var fallbackPeriod = GetSalaryFallbackPeriod(normalizedStartDate, normalizedEndExclusive);
            if (fallbackPeriod.HasValue)
            {
                var fallbackSalaries = await GetFallbackEmployeeMonthlySalariesAsync(
                    fallbackPeriod.Value.StartDate,
                    fallbackPeriod.Value.EndExclusive,
                    recordedEmployeeMonths);

                foreach (var fallbackSalary in fallbackSalaries)
                {
                    totalSalaries += fallbackSalary.TotalSalary * fallbackSalary.CoverageFactor;
                    totalDaysWorked += fallbackSalary.DaysWorked * fallbackSalary.CoverageFactor;
                    employeeIds.Add(fallbackSalary.EmployeeId);
                }
            }

            return new SalaryFinancialTotals
            {
                TotalSalaries = RoundMoney(totalSalaries),
                TotalDaysWorked = RoundCount(totalDaysWorked),
                EmployeeCount = employeeIds.Count,
                EmployeeIds = employeeIds
            };
        }

        private async Task<MonthlyEmployeePaymentsDto> GetEmployeePaymentsForPeriodAsync(DateTime startDate, DateTime endExclusive)
        {
            if (!_currentUserService.IsAdmin() || endExclusive <= startDate)
            {
                return new MonthlyEmployeePaymentsDto();
            }

            var firstMonth = DateTimeUtc.MonthStart(startDate.Year, startDate.Month);
            var monthEndExclusive = GetMonthAfterLastCoveredDate(endExclusive);
            var records = await _context.SalaryRecords
                .AsNoTracking()
                .Include(record => record.Employee)
                .Where(record => record.Month >= firstMonth && record.Month < monthEndExclusive)
                .ToListAsync();
            records = SelectLatestSalaryRecords(records);

            var payments = records
                .Select(record => BuildEmployeePayment(record, startDate, endExclusive))
                .Where(payment =>
                    payment.BaseSalary != 0 ||
                    payment.Bonuses != 0 ||
                    payment.AttendanceDeduction != 0 ||
                    payment.Penalties != 0 ||
                    payment.TotalDeductions != 0 ||
                    payment.NetSalary != 0 ||
                    payment.DaysWorked != 0)
                .ToList();

            var recordedEmployeeMonths = records
                .Select(record => EmployeeMonthKey.From(record.EmployeeId, record.Month))
                .ToHashSet();
            var fallbackSalaries = await GetFallbackEmployeeMonthlySalariesAsync(
                startDate,
                endExclusive,
                recordedEmployeeMonths);
            payments.AddRange(fallbackSalaries.Select(BuildEmployeePayment));

            return BuildMonthlyEmployeePayments(payments);
        }

        private async Task<List<EmployeeMonthlySalary>> GetFallbackEmployeeMonthlySalariesAsync(
            DateTime startDate,
            DateTime endExclusive,
            IReadOnlySet<EmployeeMonthKey> recordedEmployeeMonths)
        {
            if (endExclusive <= startDate)
            {
                return new List<EmployeeMonthlySalary>();
            }

            var monthStarts = GetCoveredMonthStarts(startDate, endExclusive);
            if (monthStarts.Count == 0)
            {
                return new List<EmployeeMonthlySalary>();
            }

            var employees = await _context.Employees
                .AsNoTracking()
                .Where(employee => !employee.IsDeleted)
                .ToListAsync();
            if (employees.Count == 0)
            {
                return new List<EmployeeMonthlySalary>();
            }

            var firstMonth = monthStarts.First();
            var monthEndExclusive = monthStarts.Last().AddMonths(1);
            var employeeIds = employees.Select(employee => employee.Id).ToList();
            var attendanceTotals = await _context.AttendanceRecords
                .AsNoTracking()
                .Where(record =>
                    employeeIds.Contains(record.EmployeeId) &&
                    record.Date >= firstMonth &&
                    record.Date < monthEndExclusive)
                .GroupBy(record => new { record.EmployeeId, record.Date.Year, record.Date.Month })
                .Select(group => new AttendanceSalaryTotals
                {
                    EmployeeId = group.Key.EmployeeId,
                    Year = group.Key.Year,
                    Month = group.Key.Month,
                    AbsentDays = group.Count(record => !record.IsPresent),
                    DailyBonuses = group.Sum(record => record.DailyBonus ?? 0),
                    DailyPenalties = group.Sum(record => record.DailyPenalty ?? 0)
                })
                .ToDictionaryAsync(
                    totals => new EmployeeMonthKey(totals.EmployeeId, totals.Year, totals.Month));

            var fallbackSalaries = new List<EmployeeMonthlySalary>();
            foreach (var monthStart in monthStarts)
            {
                var coverageFactor = GetMonthCoverageFactor(monthStart, startDate, endExclusive);
                if (coverageFactor <= 0)
                {
                    continue;
                }

                var monthEnd = monthStart.AddMonths(1);
                foreach (var employee in employees)
                {
                    if (DateTimeUtc.Date(employee.HireDate) >= monthEnd)
                    {
                        continue;
                    }

                    var key = EmployeeMonthKey.From(employee.Id, monthStart);
                    if (recordedEmployeeMonths.Contains(key))
                    {
                        continue;
                    }

                    attendanceTotals.TryGetValue(key, out var attendance);
                    fallbackSalaries.Add(BuildFallbackEmployeeMonthlySalary(
                        employee,
                        monthStart,
                        coverageFactor,
                        attendance));
                }
            }

            return fallbackSalaries;
        }

        private static EmployeePaymentDto BuildEmployeePayment(
            SalaryRecord record,
            DateTime startDate,
            DateTime endExclusive)
        {
            var coverageFactor = GetMonthCoverageFactor(record.Month, startDate, endExclusive);
            var dailyRate = record.Employee != null
                ? SalaryCalculator.GetDailySalary(record.Employee)
                : 0;
            var deductions = SalaryCalculator.GetSalaryRecordDeductionBreakdown(record, record.Employee);

            return new EmployeePaymentDto
            {
                EmployeeId = record.EmployeeId,
                EmployeeName = record.Employee?.FullName ?? string.Empty,
                Position = record.Employee?.Position.ToString() ?? string.Empty,
                DaysWorked = RoundCount(record.DaysWorked * coverageFactor),
                DailyRate = dailyRate,
                BaseSalary = RoundMoney(record.BaseSalary * coverageFactor),
                Bonuses = RoundMoney(record.Bonuses * coverageFactor),
                AttendanceDeduction = RoundMoney(deductions.AttendanceDeduction * coverageFactor),
                Penalties = RoundMoney(deductions.Penalties * coverageFactor),
                TotalDeductions = RoundMoney(deductions.TotalDeduction * coverageFactor),
                NetSalary = RoundMoney(record.TotalSalary * coverageFactor),
                HireDate = record.Employee?.HireDate ?? DateTime.MinValue
            };
        }

        private static EmployeePaymentDto BuildEmployeePayment(EmployeeMonthlySalary salary)
        {
            var totalDeductions = salary.AttendanceDeduction + salary.Penalties;

            return new EmployeePaymentDto
            {
                EmployeeId = salary.EmployeeId,
                EmployeeName = salary.EmployeeName,
                Position = salary.Position,
                DaysWorked = RoundCount(salary.DaysWorked * salary.CoverageFactor),
                DailyRate = salary.DailyRate,
                BaseSalary = RoundMoney(salary.BaseSalary * salary.CoverageFactor),
                Bonuses = RoundMoney(salary.Bonuses * salary.CoverageFactor),
                AttendanceDeduction = RoundMoney(salary.AttendanceDeduction * salary.CoverageFactor),
                Penalties = RoundMoney(salary.Penalties * salary.CoverageFactor),
                TotalDeductions = RoundMoney(totalDeductions * salary.CoverageFactor),
                NetSalary = RoundMoney(salary.TotalSalary * salary.CoverageFactor),
                HireDate = salary.HireDate
            };
        }

        private static EmployeeMonthlySalary BuildFallbackEmployeeMonthlySalary(
            Employee employee,
            DateTime month,
            decimal coverageFactor,
            AttendanceSalaryTotals? attendance)
        {
            var monthlySalary = SalaryCalculator.GetMonthlySalary(employee);
            var dailyDeduction = SalaryCalculator.CalculateDailyDeduction(employee);
            var absentDays = attendance?.AbsentDays ?? 0;
            var attendanceDeduction = absentDays * dailyDeduction;
            var bonuses = employee.MonthlyBonuses + (attendance?.DailyBonuses ?? 0);
            var penalties = employee.MonthlyPenalties + (attendance?.DailyPenalties ?? 0);

            return new EmployeeMonthlySalary
            {
                EmployeeId = employee.Id,
                EmployeeName = employee.FullName,
                Position = employee.Position.ToString(),
                Month = month,
                BaseSalary = monthlySalary,
                Bonuses = bonuses,
                AttendanceDeduction = attendanceDeduction,
                Penalties = penalties,
                TotalSalary = monthlySalary - attendanceDeduction + bonuses - penalties,
                DaysWorked = Math.Max(0, SalaryCalculator.StandardWorkingDaysPerMonth - absentDays),
                DailyRate = SalaryCalculator.GetDailySalary(employee),
                CoverageFactor = coverageFactor,
                HireDate = employee.HireDate
            };
        }

        private static MonthlyEmployeePaymentsDto BuildMonthlyEmployeePayments(List<EmployeePaymentDto> payments)
        {
            return new MonthlyEmployeePaymentsDto
            {
                TotalSalaries = payments.Sum(payment => payment.NetSalary),
                TotalBonuses = payments.Sum(payment => payment.Bonuses),
                TotalAttendanceDeductions = payments.Sum(payment => payment.AttendanceDeduction),
                TotalPenalties = payments.Sum(payment => payment.Penalties),
                TotalDeductions = payments.Sum(payment => payment.TotalDeductions),
                NetPayments = payments.Sum(payment => payment.NetSalary),
                TotalEmployees = payments.Select(payment => payment.EmployeeId).Distinct().Count(),
                TotalDaysWorked = payments.Sum(payment => payment.DaysWorked),
                EmployeePayments = payments,
                ByPosition = payments
                    .GroupBy(payment => payment.Position)
                    .ToDictionary(group => group.Key, group => group.Sum(payment => payment.NetSalary))
            };
        }

        private IQueryable<WorkerTask> GetWorkerTasksForPeriod(DateTime? startDate, DateTime? endExclusive)
        {
            var workerTasks = _context.WorkerTasks.AsNoTracking().AsQueryable();

            if (startDate.HasValue)
            {
                workerTasks = workerTasks.Where(task => task.CreatedAt >= startDate.Value);
            }

            if (endExclusive.HasValue)
            {
                workerTasks = workerTasks.Where(task => task.CreatedAt < endExclusive.Value);
            }

            return workerTasks;
        }

        private async Task<WorkerTaskCounts> GetWorkerTaskCountsAsync(DateTime? startDate, DateTime? endExclusive)
        {
            if (!_currentUserService.IsAdmin())
            {
                return WorkerTaskCounts.Empty;
            }

            var workerTasks = GetWorkerTasksForPeriod(startDate, endExclusive);

            return await workerTasks
                .GroupBy(_ => 1)
                .Select(group => new WorkerTaskCounts
                {
                    Total = group.Count(),
                    Waiting = group.Count(task => task.Status == WorkerTaskStatus.Waiting),
                    InProcess = group.Count(task => task.Status == WorkerTaskStatus.InProcess),
                    Completed = group.Count(task => task.Status == WorkerTaskStatus.Completed)
                })
                .FirstOrDefaultAsync() ?? WorkerTaskCounts.Empty;
        }

        private IQueryable<WorkSale> GetWorkSalesForPeriod(DateTime? startDate, DateTime? endExclusive)
        {
            var workSales = _context.WorkSales.AsNoTracking().AsQueryable();

            if (startDate.HasValue)
            {
                workSales = workSales.Where(workSale => workSale.Date >= startDate.Value);
            }

            if (endExclusive.HasValue)
            {
                workSales = workSales.Where(workSale => workSale.Date < endExclusive.Value);
            }

            return workSales;
        }

        private async Task<WorkSaleFinancialTotals> GetWorkSaleFinancialTotalsAsync(DateTime? startDate, DateTime? endExclusive)
        {
            var workSales = GetWorkSalesForPeriod(startDate, endExclusive);

            return await workSales
                .GroupBy(_ => 1)
                .Select(group => new WorkSaleFinancialTotals
                {
                    Revenue = group.Sum(workSale => workSale.TotalRevenue),
                    Cost = group.Sum(workSale => workSale.TotalCost),
                    Profit = group.Sum(workSale => workSale.Profit),
                    Count = group.Count()
                })
                .FirstOrDefaultAsync() ?? WorkSaleFinancialTotals.Empty;
        }

        private static WorkSaleFinancialTotals GetWorkSaleFinancialTotals(IEnumerable<WorkSale> workSales)
        {
            var workSaleList = workSales as ICollection<WorkSale> ?? workSales.ToList();

            return new WorkSaleFinancialTotals
            {
                Revenue = workSaleList.Sum(workSale => workSale.TotalRevenue),
                Cost = workSaleList.Sum(workSale => workSale.TotalCost),
                Profit = workSaleList.Sum(workSale => workSale.Profit),
                Count = workSaleList.Count
            };
        }

        private IQueryable<InvoiceArchive> GetArchivedInvoicesForPeriod(DateTime? startDate, DateTime? endExclusive)
        {
            var archivedInvoices = _context.InvoiceArchives.AsNoTracking().AsQueryable();

            if (startDate.HasValue)
            {
                archivedInvoices = archivedInvoices.Where(invoice => invoice.CreatedAt >= startDate.Value);
            }

            if (endExclusive.HasValue)
            {
                archivedInvoices = archivedInvoices.Where(invoice => invoice.CreatedAt < endExclusive.Value);
            }

            return archivedInvoices;
        }

        private async Task<ArchivedInvoiceFinancialTotals> GetArchivedInvoiceFinancialTotalsAsync(DateTime? startDate, DateTime? endExclusive)
        {
            var archivedInvoices = await GetArchivedInvoiceFinancialSnapshots(startDate, endExclusive)
                .ToListAsync();

            return GetArchivedInvoiceFinancialTotals(archivedInvoices);
        }

        private IQueryable<ArchivedInvoiceFinancialSnapshot> GetArchivedInvoiceFinancialSnapshots(
            DateTime? startDate = null,
            DateTime? endExclusive = null)
        {
            var invoices = GetArchivedInvoicesForPeriod(startDate, endExclusive);

            return invoices.Select(invoice => new ArchivedInvoiceFinancialSnapshot
            {
                CreatedAt = invoice.CreatedAt,
                Subtotal = invoice.Subtotal,
                Total = invoice.Total,
                ItemsJson = invoice.ItemsJson
            });
        }

        private static ArchivedInvoiceFinancialTotals GetArchivedInvoiceFinancialTotals(IEnumerable<InvoiceArchive> archivedInvoices)
        {
            var invoiceList = archivedInvoices as ICollection<InvoiceArchive> ?? archivedInvoices.ToList();

            return new ArchivedInvoiceFinancialTotals
            {
                Subtotal = invoiceList.Sum(invoice => invoice.Subtotal),
                Total = invoiceList.Sum(InvoiceArchiveFinancials.GetRevenueTotal),
                Count = invoiceList.Count
            };
        }

        private static ArchivedInvoiceFinancialTotals GetArchivedInvoiceFinancialTotals(IEnumerable<ArchivedInvoiceFinancialSnapshot> archivedInvoices)
        {
            var invoiceList = archivedInvoices as ICollection<ArchivedInvoiceFinancialSnapshot> ?? archivedInvoices.ToList();

            return new ArchivedInvoiceFinancialTotals
            {
                Subtotal = invoiceList.Sum(invoice => invoice.Subtotal),
                Total = invoiceList.Sum(invoice => InvoiceArchiveFinancials.GetRevenueTotal(invoice.ItemsJson, invoice.Total)),
                Count = invoiceList.Count
            };
        }

        private async Task<List<InvoiceStockCostMovementSnapshot>> GetInvoiceStockCostMovementSnapshotsAsync(
            DateTime? startDate,
            DateTime? endExclusive)
        {
            var movements = _context.StockMovements
                .AsNoTracking()
                .Where(movement =>
                    movement.MovementKind == InvoiceStockMovementKind &&
                    movement.QuantityChange < 0);

            if (startDate.HasValue)
            {
                movements = movements.Where(movement => movement.OccurredAt >= startDate.Value);
            }

            if (endExclusive.HasValue)
            {
                movements = movements.Where(movement => movement.OccurredAt < endExclusive.Value);
            }

            return await movements
                .Select(movement => new InvoiceStockCostMovementSnapshot
                {
                    OccurredAt = movement.OccurredAt,
                    QuantityChange = movement.QuantityChange,
                    UnitCost = movement.UnitCost,
                    CostAmount = movement.CostAmount,
                    StockBuyPrice = movement.StockItem.BuyPrice
                })
                .ToListAsync();
        }

        private async Task<InvoiceStockCostTotals> GetInvoiceStockCostTotalsAsync(
            DateTime? startDate,
            DateTime? endExclusive)
        {
            var movements = await GetInvoiceStockCostMovementSnapshotsAsync(startDate, endExclusive);
            return GetInvoiceStockCostTotals(movements);
        }

        private static InvoiceStockCostTotals GetInvoiceStockCostTotals(
            IEnumerable<InvoiceStockCostMovementSnapshot> movements)
        {
            var movementList = movements as ICollection<InvoiceStockCostMovementSnapshot> ?? movements.ToList();

            return new InvoiceStockCostTotals
            {
                Cost = movementList.Sum(GetInvoiceStockMovementCost),
                Count = movementList.Count
            };
        }

        private static decimal GetInvoiceStockMovementCost(InvoiceStockCostMovementSnapshot movement)
        {
            if (movement.CostAmount.HasValue)
            {
                return movement.CostAmount.Value;
            }

            var unitCost = movement.UnitCost ?? movement.StockBuyPrice;
            return RoundMoney(Math.Abs(movement.QuantityChange) * unitCost);
        }

        private async Task<StockSplitTotals> GetStockSplitTotalsAsync(DateTime? startDate, DateTime? endExclusive)
        {
            var stockItems = await _context.StockItems
                .AsNoTracking()
                .Select(item => new StockItemSnapshot
                {
                    Id = item.Id,
                    StockType = item.StockType,
                    ReorderLevel = item.ReorderLevel
                })
                .ToListAsync();

            if (stockItems.Count == 0)
            {
                return StockSplitTotals.Empty;
            }

            var stockItemIds = stockItems.Select(item => item.Id).ToList();
            var stockTypeById = stockItems.ToDictionary(item => item.Id, item => item.StockType);
            var balances = await _context.StockMovements
                .AsNoTracking()
                .Where(movement => stockItemIds.Contains(movement.StockItemId))
                .GroupBy(movement => movement.StockItemId)
                .Select(group => new
                {
                    StockItemId = group.Key,
                    Quantity = group.Sum(movement => movement.QuantityChange)
                })
                .ToDictionaryAsync(item => item.StockItemId, item => item.Quantity);

            var movementsQuery = _context.StockMovements
                .AsNoTracking()
                .Where(movement => stockItemIds.Contains(movement.StockItemId));

            if (startDate.HasValue)
            {
                movementsQuery = movementsQuery.Where(movement => movement.OccurredAt >= startDate.Value);
            }

            if (endExclusive.HasValue)
            {
                movementsQuery = movementsQuery.Where(movement => movement.OccurredAt < endExclusive.Value);
            }

            var periodMovements = await movementsQuery
                .Select(movement => new StockMovementSnapshot
                {
                    StockItemId = movement.StockItemId,
                    QuantityChange = movement.QuantityChange
                })
                .ToListAsync();

            return new StockSplitTotals
            {
                Material = BuildStockSplitSegment(
                    StockType.Material,
                    stockItems,
                    balances,
                    periodMovements,
                    stockTypeById),
                Product = BuildStockSplitSegment(
                    StockType.Product,
                    stockItems,
                    balances,
                    periodMovements,
                    stockTypeById)
            };
        }

        private static StockSplitSegment BuildStockSplitSegment(
            StockType stockType,
            IReadOnlyCollection<StockItemSnapshot> stockItems,
            IReadOnlyDictionary<int, decimal> balances,
            IReadOnlyCollection<StockMovementSnapshot> periodMovements,
            IReadOnlyDictionary<int, StockType> stockTypeById)
        {
            var matchingItems = stockItems
                .Where(item => item.StockType == stockType)
                .ToList();
            var matchingItemIds = matchingItems.Select(item => item.Id).ToHashSet();
            var currentQuantity = matchingItemIds.Sum(stockItemId =>
                balances.TryGetValue(stockItemId, out var quantity) ? quantity : 0m);
            var lowStockCount = matchingItems.Count(item =>
                item.ReorderLevel.HasValue &&
                balances.TryGetValue(item.Id, out var quantity) &&
                quantity <= item.ReorderLevel.Value);

            var matchingMovements = periodMovements
                .Where(movement =>
                    stockTypeById.TryGetValue(movement.StockItemId, out var movementStockType) &&
                    movementStockType == stockType)
                .ToList();

            return new StockSplitSegment
            {
                ItemCount = matchingItems.Count,
                CurrentQuantity = currentQuantity,
                LowStockCount = lowStockCount,
                QuantityIn = matchingMovements
                    .Where(movement => movement.QuantityChange > 0)
                    .Sum(movement => movement.QuantityChange),
                QuantityOut = matchingMovements
                    .Where(movement => movement.QuantityChange < 0)
                    .Sum(movement => Math.Abs(movement.QuantityChange)),
                MovementCount = matchingMovements.Count
            };
        }

        private static object BuildArchivedInvoiceReport(ArchivedInvoiceFinancialTotals totals)
        {
            return new
            {
                totals.Count,
                totals.Subtotal,
                totals.Total
            };
        }

        private static object BuildStockSplitReport(StockSplitTotals totals)
        {
            return new
            {
                Material = BuildStockSplitSegmentReport(totals.Material),
                Product = BuildStockSplitSegmentReport(totals.Product),
                TotalItemCount = totals.TotalItemCount,
                CurrentQuantity = totals.CurrentQuantity,
                QuantityIn = totals.QuantityIn,
                QuantityOut = totals.QuantityOut,
                MovementCount = totals.TotalMovementCount
            };
        }

        private static object BuildStockSplitSegmentReport(StockSplitSegment segment)
        {
            return new
            {
                segment.ItemCount,
                segment.CurrentQuantity,
                segment.LowStockCount,
                segment.QuantityIn,
                segment.QuantityOut,
                segment.MovementCount
            };
        }

        private static List<ExpenseBreakdownItem> BuildExpenseBreakdown(
            IEnumerable<Expense> expenses,
            decimal totalOutflow,
            InvoiceStockCostTotals invoiceStockCostTotals,
            SalaryFinancialTotals? salaryTotals = null)
        {
            var breakdown = expenses
                .GroupBy(e => e.ExpenseType)
                .Select(g => new ExpenseBreakdownItem
                {
                    Type = g.Key,
                    Total = g.Sum(e => e.Amount),
                    Count = g.Count(),
                    Percentage = totalOutflow > 0 ? (g.Sum(e => e.Amount) / totalOutflow) * 100 : 0
                })
                .ToList();

            if (invoiceStockCostTotals.Count > 0 || invoiceStockCostTotals.Cost > 0)
            {
                breakdown.Add(new ExpenseBreakdownItem
                {
                    Type = "Invoice Stock Cost",
                    Total = invoiceStockCostTotals.Cost,
                    Count = invoiceStockCostTotals.Count,
                    Percentage = totalOutflow > 0 ? (invoiceStockCostTotals.Cost / totalOutflow) * 100 : 0
                });
            }

            if (salaryTotals is { TotalSalaries: > 0 })
            {
                breakdown.Add(new ExpenseBreakdownItem
                {
                    Type = "Salaries",
                    Total = salaryTotals.TotalSalaries,
                    Count = salaryTotals.EmployeeCount,
                    Percentage = totalOutflow > 0 ? (salaryTotals.TotalSalaries / totalOutflow) * 100 : 0
                });
            }

            return breakdown
                .OrderByDescending(item => item.Total)
                .ToList();
        }

        private static List<DateTime> GetCoveredMonthStarts(DateTime startDate, DateTime endExclusive)
        {
            var monthStarts = new List<DateTime>();
            var cursor = DateTimeUtc.MonthStart(startDate.Year, startDate.Month);

            while (cursor < endExclusive)
            {
                monthStarts.Add(cursor);
                cursor = cursor.AddMonths(1);
            }

            return monthStarts;
        }

        private static DateTime GetMonthAfterLastCoveredDate(DateTime endExclusive)
        {
            var lastCoveredDate = endExclusive.AddTicks(-1);
            return DateTimeUtc.MonthStart(lastCoveredDate.Year, lastCoveredDate.Month).AddMonths(1);
        }

        private static (DateTime StartDate, DateTime EndExclusive)? GetSalaryFallbackPeriod(
            DateTime? startDate,
            DateTime? endExclusive)
        {
            if (startDate.HasValue && endExclusive.HasValue)
            {
                return (startDate.Value, endExclusive.Value);
            }

            if (startDate.HasValue)
            {
                return (startDate.Value, DateTimeUtc.Today().AddDays(1));
            }

            if (endExclusive.HasValue)
            {
                return null;
            }

            var today = DateTimeUtc.Today();
            return (DateTimeUtc.MonthStart(today.Year, today.Month), today.AddDays(1));
        }

        private static List<SalaryRecord> SelectLatestSalaryRecords(IEnumerable<SalaryRecord> records)
        {
            return records
                .GroupBy(record => EmployeeMonthKey.From(record.EmployeeId, record.Month))
                .Select(group => group
                    .OrderByDescending(record => record.CreatedAt)
                    .ThenByDescending(record => record.Id)
                    .First())
                .ToList();
        }

        private static decimal GetMonthCoverageFactor(DateTime month, DateTime? startDate, DateTime? endExclusive)
        {
            var monthStart = DateTimeUtc.MonthStart(month.Year, month.Month);
            var monthEnd = monthStart.AddMonths(1);
            var overlapStart = startDate.HasValue && startDate.Value > monthStart ? startDate.Value : monthStart;
            var overlapEnd = endExclusive.HasValue && endExclusive.Value < monthEnd ? endExclusive.Value : monthEnd;

            if (overlapEnd <= overlapStart)
            {
                return 0m;
            }

            if (overlapStart <= monthStart && overlapEnd >= monthEnd)
            {
                return 1m;
            }

            var workingDays = CountWeekdays(overlapStart, overlapEnd);
            return Math.Min(1m, workingDays / (decimal)SalaryCalculator.StandardWorkingDaysPerMonth);
        }

        private static int CountWeekdays(DateTime startDate, DateTime endExclusive)
        {
            var count = 0;

            for (var day = startDate.Date; day < endExclusive.Date; day = day.AddDays(1))
            {
                if (day.DayOfWeek != DayOfWeek.Saturday && day.DayOfWeek != DayOfWeek.Sunday)
                {
                    count++;
                }
            }

            return count;
        }

        private static decimal RoundMoney(decimal value)
        {
            return Math.Round(value, 2, MidpointRounding.AwayFromZero);
        }

        private static int RoundCount(decimal value)
        {
            return (int)Math.Round(value, MidpointRounding.AwayFromZero);
        }

        private sealed class SalaryFinancialTotals
        {
            public static SalaryFinancialTotals Empty { get; } = new();

            public decimal TotalSalaries { get; init; }
            public int TotalDaysWorked { get; init; }
            public int EmployeeCount { get; init; }
            public IReadOnlyCollection<int> EmployeeIds { get; init; } = Array.Empty<int>();
        }

        private readonly record struct EmployeeMonthKey(int EmployeeId, int Year, int Month)
        {
            public static EmployeeMonthKey From(int employeeId, DateTime month)
            {
                return new EmployeeMonthKey(employeeId, month.Year, month.Month);
            }
        }

        private sealed class AttendanceSalaryTotals
        {
            public int EmployeeId { get; init; }
            public int Year { get; init; }
            public int Month { get; init; }
            public int AbsentDays { get; init; }
            public decimal DailyBonuses { get; init; }
            public decimal DailyPenalties { get; init; }
        }

        private sealed class EmployeeMonthlySalary
        {
            public int EmployeeId { get; init; }
            public string EmployeeName { get; init; } = string.Empty;
            public string Position { get; init; } = string.Empty;
            public DateTime Month { get; init; }
            public decimal BaseSalary { get; init; }
            public decimal Bonuses { get; init; }
            public decimal AttendanceDeduction { get; init; }
            public decimal Penalties { get; init; }
            public decimal TotalSalary { get; init; }
            public int DaysWorked { get; init; }
            public decimal DailyRate { get; init; }
            public decimal CoverageFactor { get; init; }
            public DateTime HireDate { get; init; }
        }

        private sealed class WorkSaleFinancialTotals
        {
            public static WorkSaleFinancialTotals Empty { get; } = new();

            public decimal Revenue { get; init; }
            public decimal Cost { get; init; }
            public decimal Profit { get; init; }
            public int Count { get; init; }
        }

        private sealed class ArchivedInvoiceFinancialTotals
        {
            public static ArchivedInvoiceFinancialTotals Empty { get; } = new();

            public decimal Subtotal { get; init; }
            public decimal Total { get; init; }
            public int Count { get; init; }
        }

        private sealed class InvoiceStockCostTotals
        {
            public static InvoiceStockCostTotals Empty { get; } = new();

            public decimal Cost { get; init; }
            public int Count { get; init; }
        }

        private sealed class StockSplitTotals
        {
            public static StockSplitTotals Empty { get; } = new();

            public StockSplitSegment Material { get; init; } = StockSplitSegment.Empty;
            public StockSplitSegment Product { get; init; } = StockSplitSegment.Empty;
            public int TotalItemCount => Material.ItemCount + Product.ItemCount;
            public decimal CurrentQuantity => Material.CurrentQuantity + Product.CurrentQuantity;
            public decimal QuantityIn => Material.QuantityIn + Product.QuantityIn;
            public decimal QuantityOut => Material.QuantityOut + Product.QuantityOut;
            public int TotalMovementCount => Material.MovementCount + Product.MovementCount;
        }

        private sealed class StockSplitSegment
        {
            public static StockSplitSegment Empty { get; } = new();

            public int ItemCount { get; init; }
            public decimal CurrentQuantity { get; init; }
            public int LowStockCount { get; init; }
            public decimal QuantityIn { get; init; }
            public decimal QuantityOut { get; init; }
            public int MovementCount { get; init; }
        }

        private sealed class StockItemSnapshot
        {
            public int Id { get; init; }
            public StockType StockType { get; init; }
            public decimal? ReorderLevel { get; init; }
        }

        private sealed class StockMovementSnapshot
        {
            public int StockItemId { get; init; }
            public decimal QuantityChange { get; init; }
        }

        private sealed class InvoiceStockCostMovementSnapshot
        {
            public DateTime OccurredAt { get; init; }
            public decimal QuantityChange { get; init; }
            public decimal? UnitCost { get; init; }
            public decimal? CostAmount { get; init; }
            public decimal StockBuyPrice { get; init; }
        }

        private sealed class WorkerTaskCounts
        {
            public static WorkerTaskCounts Empty { get; } = new();

            public int Total { get; init; }
            public int Waiting { get; init; }
            public int InProcess { get; init; }
            public int Completed { get; init; }
        }

        private sealed class DashboardEmployeeCounts
        {
            public static DashboardEmployeeCounts Empty { get; } = new();

            public int Total { get; init; }
            public int Magazine { get; init; }
            public int Terren { get; init; }
        }

        private sealed class DashboardAmountBuckets
        {
            public static DashboardAmountBuckets Empty { get; } = new();

            public decimal CurrentMonth { get; init; }
            public decimal YearToDate { get; init; }
            public decimal Total { get; init; }
        }

        private sealed class DashboardSalaryBuckets
        {
            public static DashboardSalaryBuckets Empty { get; } = new();

            public SalaryFinancialTotals CurrentMonth { get; init; } = SalaryFinancialTotals.Empty;
            public SalaryFinancialTotals YearToDate { get; init; } = SalaryFinancialTotals.Empty;
            public SalaryFinancialTotals AllTime { get; init; } = SalaryFinancialTotals.Empty;
        }

        private sealed class DashboardWorkSaleBuckets
        {
            public static DashboardWorkSaleBuckets Empty { get; } = new();

            public WorkSaleFinancialTotals CurrentMonth { get; init; } = WorkSaleFinancialTotals.Empty;
            public WorkSaleFinancialTotals YearToDate { get; init; } = WorkSaleFinancialTotals.Empty;
            public WorkSaleFinancialTotals AllTime { get; init; } = WorkSaleFinancialTotals.Empty;
        }

        private sealed class DashboardArchivedInvoiceBuckets
        {
            public static DashboardArchivedInvoiceBuckets Empty { get; } = new();

            public ArchivedInvoiceFinancialTotals CurrentMonth { get; init; } = ArchivedInvoiceFinancialTotals.Empty;
            public ArchivedInvoiceFinancialTotals YearToDate { get; init; } = ArchivedInvoiceFinancialTotals.Empty;
            public ArchivedInvoiceFinancialTotals AllTime { get; init; } = ArchivedInvoiceFinancialTotals.Empty;
        }

        private sealed class DashboardInvoiceStockCostBuckets
        {
            public static DashboardInvoiceStockCostBuckets Empty { get; } = new();

            public InvoiceStockCostTotals CurrentMonth { get; init; } = InvoiceStockCostTotals.Empty;
            public InvoiceStockCostTotals YearToDate { get; init; } = InvoiceStockCostTotals.Empty;
            public InvoiceStockCostTotals AllTime { get; init; } = InvoiceStockCostTotals.Empty;
        }

        private sealed class DashboardWorkSaleBucketRow
        {
            public decimal CurrentMonthRevenue { get; init; }
            public decimal CurrentMonthCost { get; init; }
            public decimal CurrentMonthProfit { get; init; }
            public int CurrentMonthCount { get; init; }
            public decimal YearToDateRevenue { get; init; }
            public decimal YearToDateCost { get; init; }
            public decimal YearToDateProfit { get; init; }
            public int YearToDateCount { get; init; }
            public decimal TotalRevenue { get; init; }
            public decimal TotalCost { get; init; }
            public decimal TotalProfit { get; init; }
            public int TotalCount { get; init; }

            public DashboardWorkSaleBuckets ToBuckets()
            {
                return new DashboardWorkSaleBuckets
                {
                    CurrentMonth = new WorkSaleFinancialTotals
                    {
                        Revenue = CurrentMonthRevenue,
                        Cost = CurrentMonthCost,
                        Profit = CurrentMonthProfit,
                        Count = CurrentMonthCount
                    },
                    YearToDate = new WorkSaleFinancialTotals
                    {
                        Revenue = YearToDateRevenue,
                        Cost = YearToDateCost,
                        Profit = YearToDateProfit,
                        Count = YearToDateCount
                    },
                    AllTime = new WorkSaleFinancialTotals
                    {
                        Revenue = TotalRevenue,
                        Cost = TotalCost,
                        Profit = TotalProfit,
                        Count = TotalCount
                    }
                };
            }
        }

        private sealed class MonthlyWorkSaleTotalsRow
        {
            public int Month { get; init; }
            public decimal Revenue { get; init; }
            public decimal Cost { get; init; }
            public decimal Profit { get; init; }
            public int Count { get; init; }
        }

        private sealed class MonthlyWorkerTaskCountsRow
        {
            public int Month { get; init; }
            public int Total { get; init; }
            public int Waiting { get; init; }
            public int InProcess { get; init; }
            public int Completed { get; init; }
        }

        private sealed class ArchivedInvoiceFinancialSnapshot
        {
            public DateTime CreatedAt { get; init; }
            public decimal Subtotal { get; init; }
            public decimal Total { get; init; }
            public string ItemsJson { get; init; } = string.Empty;
        }

        private sealed class ArchivedInvoiceFinancialAccumulator
        {
            private decimal _subtotal;
            private decimal _total;
            private int _count;

            public void Add(ArchivedInvoiceFinancialSnapshot invoice)
            {
                _subtotal += invoice.Subtotal;
                _total += InvoiceArchiveFinancials.GetRevenueTotal(invoice.ItemsJson, invoice.Total);
                _count++;
            }

            public ArchivedInvoiceFinancialTotals ToTotals()
            {
                return new ArchivedInvoiceFinancialTotals
                {
                    Subtotal = _subtotal,
                    Total = _total,
                    Count = _count
                };
            }
        }

        private sealed class InvoiceStockCostAccumulator
        {
            private decimal _cost;
            private int _count;

            public void Add(InvoiceStockCostMovementSnapshot movement)
            {
                _cost += GetInvoiceStockMovementCost(movement);
                _count++;
            }

            public InvoiceStockCostTotals ToTotals()
            {
                return new InvoiceStockCostTotals
                {
                    Cost = _cost,
                    Count = _count
                };
            }
        }

        private sealed class SalaryFinancialAccumulator
        {
            private decimal _totalSalaries;
            private decimal _totalDaysWorked;
            private readonly HashSet<int> _employeeIds = new();

            public void Add(int employeeId, decimal totalSalary, decimal daysWorked, decimal coverageFactor = 1m)
            {
                if (coverageFactor <= 0)
                {
                    return;
                }

                _totalSalaries += totalSalary * coverageFactor;
                _totalDaysWorked += daysWorked * coverageFactor;
                _employeeIds.Add(employeeId);
            }

            public SalaryFinancialTotals ToTotals()
            {
                return new SalaryFinancialTotals
                {
                    TotalSalaries = RoundMoney(_totalSalaries),
                    TotalDaysWorked = RoundCount(_totalDaysWorked),
                    EmployeeCount = _employeeIds.Count,
                    EmployeeIds = _employeeIds.ToArray()
                };
            }
        }

        private sealed class ExpenseBreakdownItem
        {
            public string Type { get; init; } = string.Empty;
            public decimal Total { get; init; }
            public int Count { get; init; }
            public decimal Percentage { get; init; }
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
