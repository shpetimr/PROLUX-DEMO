using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    /// <summary>
    /// Adds non-invasive indexes used by dashboard and report aggregation queries.
    /// </summary>
    public static class DashboardPerformanceSchemaBootstrapper
    {
        private static readonly string[] IndexStatements =
        {
            @"CREATE INDEX IF NOT EXISTS ""IX_Employees_CreatedAt"" ON ""Employees"" (""CreatedAt"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_SalaryRecords_Month"" ON ""SalaryRecords"" (""Month"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_SalaryRecords_EmployeeId_Month_CreatedAt"" ON ""SalaryRecords"" (""EmployeeId"", ""Month"", ""CreatedAt"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Expenses_Date"" ON ""Expenses"" (""Date"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Expenses_CreatedAt"" ON ""Expenses"" (""CreatedAt"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Expenses_ExpenseType"" ON ""Expenses"" (""ExpenseType"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Expenses_CreatedById_Date"" ON ""Expenses"" (""CreatedById"", ""Date"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Purchases_PurchaseDate"" ON ""Purchases"" (""PurchaseDate"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Purchases_CreatedAt"" ON ""Purchases"" (""CreatedAt"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Purchases_ItemName"" ON ""Purchases"" (""ItemName"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Purchases_CreatedById_PurchaseDate"" ON ""Purchases"" (""CreatedById"", ""PurchaseDate"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Rents_PaymentDate"" ON ""Rents"" (""PaymentDate"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Rents_CreatedAt"" ON ""Rents"" (""CreatedAt"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Rents_Location"" ON ""Rents"" (""Location"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Incomes_Date"" ON ""Incomes"" (""Date"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Incomes_CreatedAt"" ON ""Incomes"" (""CreatedAt"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Incomes_Source"" ON ""Incomes"" (""Source"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Debts_DueDate"" ON ""Debts"" (""DueDate"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Debts_IsPaid"" ON ""Debts"" (""IsPaid"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Debts_Type_IsPaid"" ON ""Debts"" (""Type"", ""IsPaid"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Projects_Status"" ON ""Projects"" (""Status"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Projects_CreatedAt"" ON ""Projects"" (""CreatedAt"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Projects_StartDate"" ON ""Projects"" (""StartDate"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_Projects_EndDate"" ON ""Projects"" (""EndDate"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_StockItems_StockType"" ON ""StockItems"" (""StockType"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_StockMovements_OccurredAt"" ON ""StockMovements"" (""OccurredAt"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_StockMovements_MovementKind_OccurredAt"" ON ""StockMovements"" (""MovementKind"", ""OccurredAt"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_StockMovements_StockItemId_OccurredAt"" ON ""StockMovements"" (""StockItemId"", ""OccurredAt"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_WorkerTasks_CreatedAt"" ON ""WorkerTasks"" (""CreatedAt"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_WorkerTasks_Deadline"" ON ""WorkerTasks"" (""Deadline"");",
            @"CREATE INDEX IF NOT EXISTS ""IX_WorkerTasks_Status_CreatedAt"" ON ""WorkerTasks"" (""Status"", ""CreatedAt"");"
        };

        public static async Task EnsureAsync(ApplicationDbContext db)
        {
            if (!db.Database.IsNpgsql() && !db.Database.IsSqlite())
            {
                return;
            }

            foreach (var statement in IndexStatements)
            {
                await db.Database.ExecuteSqlRawAsync(statement);
            }
        }
    }
}
