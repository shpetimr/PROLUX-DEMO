namespace backend.DTOs
{
    public class FinancialReportDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal TotalSalaries { get; set; }
        public int TotalDaysWorked { get; set; }
        public decimal TotalExpenses { get; set; }
        public decimal TotalRent { get; set; }
        public decimal TotalPurchases { get; set; }
        public decimal TotalIncome { get; set; }
        public decimal NetProfit { get; set; }
        public int EmployeeCount { get; set; }
        public decimal TotalArchivedInvoices { get; set; }
        public int ArchivedInvoicesCount { get; set; }
        public decimal TotalWorkSalesRevenue { get; set; }
        public decimal TotalWorkSalesCost { get; set; }
        public decimal TotalWorkSalesProfit { get; set; }
        public int WorkSalesCount { get; set; }
        public decimal TotalInvoiceStockCost { get; set; }
        public int InvoiceStockCostCount { get; set; }
        public int MaterialStockItemCount { get; set; }
        public decimal MaterialStockQuantity { get; set; }
        public int ProductStockItemCount { get; set; }
        public decimal ProductStockQuantity { get; set; }
        public int WorkerTasksTotal { get; set; }
        public int WorkerTasksWaiting { get; set; }
        public int WorkerTasksInProcess { get; set; }
        public int WorkerTasksCompleted { get; set; }
        public decimal TotalRents { get; set; }
        public decimal NetBalance { get; set; }
        public string currencyCode { get; set; } = "MKD";
        public string currencySymbol { get; set; } = "MKD";
    }
    
    public class MonthlyReportDto
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public decimal TotalSalaries { get; set; }
        public decimal TotalExpenses { get; set; }
        public decimal TotalRent { get; set; }
        public decimal TotalPurchases { get; set; }
        public decimal TotalIncome { get; set; }
        public decimal NetProfit { get; set; }
        public int EmployeeCount { get; set; }
        public decimal TotalArchivedInvoices { get; set; }
        public int ArchivedInvoicesCount { get; set; }
        public decimal TotalWorkSalesRevenue { get; set; }
        public decimal TotalWorkSalesCost { get; set; }
        public decimal TotalWorkSalesProfit { get; set; }
        public int WorkSalesCount { get; set; }
        public decimal TotalInvoiceStockCost { get; set; }
        public int InvoiceStockCostCount { get; set; }
        public int MaterialStockItemCount { get; set; }
        public decimal MaterialStockQuantity { get; set; }
        public int ProductStockItemCount { get; set; }
        public decimal ProductStockQuantity { get; set; }
        public int WorkerTasksTotal { get; set; }
        public int WorkerTasksWaiting { get; set; }
        public int WorkerTasksInProcess { get; set; }
        public int WorkerTasksCompleted { get; set; }
        public string currencyCode { get; set; } = "MKD";
        public string currencySymbol { get; set; } = "MKD";
    }
    
    public class YearlyReportDto
    {
        public int Year { get; set; }
        public decimal TotalSalaries { get; set; }
        public decimal TotalExpenses { get; set; }
        public decimal TotalRent { get; set; }
        public decimal TotalPurchases { get; set; }
        public decimal TotalIncome { get; set; }
        public decimal NetProfit { get; set; }
        public int EmployeeCount { get; set; }
        public decimal TotalArchivedInvoices { get; set; }
        public int ArchivedInvoicesCount { get; set; }
        public decimal TotalWorkSalesRevenue { get; set; }
        public decimal TotalWorkSalesCost { get; set; }
        public decimal TotalWorkSalesProfit { get; set; }
        public int WorkSalesCount { get; set; }
        public decimal TotalInvoiceStockCost { get; set; }
        public int InvoiceStockCostCount { get; set; }
        public int MaterialStockItemCount { get; set; }
        public decimal MaterialStockQuantity { get; set; }
        public int ProductStockItemCount { get; set; }
        public decimal ProductStockQuantity { get; set; }
        public int WorkerTasksTotal { get; set; }
        public int WorkerTasksWaiting { get; set; }
        public int WorkerTasksInProcess { get; set; }
        public int WorkerTasksCompleted { get; set; }
        public List<MonthlyReportDto> MonthlyBreakdown { get; set; } = new();
        public string currencyCode { get; set; } = "MKD";
        public string currencySymbol { get; set; } = "MKD";
    }
    
    public class DashboardStatsDto
    {
        public int TotalEmployees { get; set; }
        public int WarehouseEmployees { get; set; }
        public int FieldEmployees { get; set; }
        public decimal CurrentMonthSalaries { get; set; }
        public decimal CurrentMonthExpenses { get; set; }
        public decimal CurrentMonthIncome { get; set; }
        public decimal CurrentMonthProfit { get; set; }
        public decimal CurrentMonthPurchases { get; set; }
        public decimal CurrentMonthRents { get; set; }
        public decimal CurrentMonthWorkSalesRevenue { get; set; }
        public decimal CurrentMonthWorkSalesCost { get; set; }
        public decimal CurrentMonthWorkSalesProfit { get; set; }
        public int CurrentMonthWorkSalesCount { get; set; }
        public decimal CurrentMonthArchivedInvoices { get; set; }
        public int CurrentMonthArchivedInvoicesCount { get; set; }
        public decimal CurrentMonthInvoiceStockCost { get; set; }
        public int CurrentMonthInvoiceStockCostCount { get; set; }
        public decimal YearToDateIncome { get; set; }
        public decimal YearToDateExpenses { get; set; }
        public decimal YearToDatePurchases { get; set; }
        public decimal YearToDateRents { get; set; }
        public decimal YearToDateSalaries { get; set; }
        public decimal YearToDateWorkSalesRevenue { get; set; }
        public decimal YearToDateWorkSalesCost { get; set; }
        public decimal YearToDateWorkSalesProfit { get; set; }
        public int YearToDateWorkSalesCount { get; set; }
        public decimal YearToDateArchivedInvoices { get; set; }
        public int YearToDateArchivedInvoicesCount { get; set; }
        public decimal YearToDateInvoiceStockCost { get; set; }
        public int YearToDateInvoiceStockCostCount { get; set; }
        public decimal YearToDateProfit { get; set; }
        
        // Additional statistics for comprehensive dashboard
        public decimal TotalExpenses { get; set; }
        public decimal TotalIncomes { get; set; }
        public decimal TotalPurchases { get; set; }
        public decimal TotalRents { get; set; }
        public decimal TotalSalaries { get; set; }
        public decimal TotalWorkSalesRevenue { get; set; }
        public decimal TotalWorkSalesCost { get; set; }
        public decimal TotalWorkSalesProfit { get; set; }
        public int TotalWorkSalesCount { get; set; }
        public decimal TotalArchivedInvoices { get; set; }
        public int TotalArchivedInvoicesCount { get; set; }
        public decimal TotalInvoiceStockCost { get; set; }
        public int TotalInvoiceStockCostCount { get; set; }
        public int WorkerTasksTotal { get; set; }
        public int WorkerTasksWaiting { get; set; }
        public int WorkerTasksInProcess { get; set; }
        public int WorkerTasksCompleted { get; set; }
        public decimal AverageSalary { get; set; }
        public decimal ProfitMargin { get; set; }
        public string currencyCode { get; set; } = "MKD";
        public string currencySymbol { get; set; } = "MKD";
    }

    // New DTOs for monthly tracking with date ranges
    public class MonthlyTrackingDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string PeriodName { get; set; } = ""; // e.g., "June 2025", "Q1 2025"
        public MonthlyExpensesDto Expenses { get; set; } = new();
        public MonthlyPurchasesDto Purchases { get; set; } = new();
        public MonthlyRentDto Rent { get; set; } = new();
        public MonthlyIncomeDto Income { get; set; } = new();
        public MonthlyEmployeePaymentsDto EmployeePayments { get; set; } = new();
        public MonthlySummaryDto Summary { get; set; } = new();
        public string currencyCode { get; set; } = "MKD";
        public string currencySymbol { get; set; } = "MKD";
    }

    public class MonthlyExpensesDto
    {
        public decimal TotalAmount { get; set; }
        public int TotalCount { get; set; }
        public List<ExpenseItemDto> Items { get; set; } = new();
        public Dictionary<string, decimal> ByType { get; set; } = new();
    }

    public class MonthlyPurchasesDto
    {
        public decimal TotalAmount { get; set; }
        public int TotalCount { get; set; }
        public List<PurchaseItemDto> Items { get; set; } = new();
        public Dictionary<string, decimal> ByCategory { get; set; } = new();
    }

    public class MonthlyRentDto
    {
        public decimal TotalAmount { get; set; }
        public int TotalCount { get; set; }
        public List<RentItemDto> Items { get; set; } = new();
        public Dictionary<string, decimal> ByLocation { get; set; } = new();
    }

    public class MonthlyIncomeDto
    {
        public decimal TotalAmount { get; set; }
        public int TotalCount { get; set; }
        public List<IncomeItemDto> Items { get; set; } = new();
        public Dictionary<string, decimal> BySource { get; set; } = new();
    }

    public class MonthlyEmployeePaymentsDto
    {
        public decimal TotalSalaries { get; set; }
        public decimal TotalBonuses { get; set; }
        public decimal TotalPenalties { get; set; }
        public decimal NetPayments { get; set; }
        public int TotalEmployees { get; set; }
        public int TotalDaysWorked { get; set; }
        public List<EmployeePaymentDto> EmployeePayments { get; set; } = new();
        public Dictionary<string, decimal> ByPosition { get; set; } = new();
    }

    public class MonthlySummaryDto
    {
        public decimal TotalIncome { get; set; }
        public decimal TotalExpenses { get; set; }
        public decimal TotalOutflow { get; set; }
        public decimal NetProfit { get; set; }
        public int TotalTransactions { get; set; }
    }

    // Item DTOs for detailed breakdowns (using existing ExpenseItemDto from FinancialDto.cs)
    public class PurchaseItemDto
    {
        public int Id { get; set; }
        public string ItemName { get; set; } = "";
        public string Description { get; set; } = "";
        public decimal TotalPrice { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public DateTime PurchaseDate { get; set; }
        public string CreatedBy { get; set; } = "";
    }

    public class RentItemDto
    {
        public int Id { get; set; }
        public string Location { get; set; } = "";
        public string Description { get; set; } = "";
        public decimal MonthlyAmount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string CreatedBy { get; set; } = "";
    }

    public class IncomeItemDto
    {
        public int Id { get; set; }
        public string Source { get; set; } = "";
        public string Description { get; set; } = "";
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string CreatedBy { get; set; } = "";
    }

    public class EmployeePaymentDto
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; } = "";
        public string Position { get; set; } = "";
        public decimal BaseSalary { get; set; }
        public decimal Bonuses { get; set; }
        public decimal Penalties { get; set; }
        public decimal NetSalary { get; set; }
        public int DaysWorked { get; set; }
        public decimal DailyRate { get; set; }
        public DateTime HireDate { get; set; }
    }

    // Request DTO for date range filtering
    public class MonthlyTrackingRequestDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IncludeDetails { get; set; } = true;
        public bool IncludeBreakdowns { get; set; } = true;
    }
}
