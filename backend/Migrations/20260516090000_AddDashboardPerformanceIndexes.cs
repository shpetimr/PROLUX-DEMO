using backend.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260516090000_AddDashboardPerformanceIndexes")]
    public partial class AddDashboardPerformanceIndexes : Migration
    {
        private static readonly string[] UpStatements =
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

        private static readonly string[] DownStatements =
        {
            @"DROP INDEX IF EXISTS ""IX_WorkerTasks_Status_CreatedAt"";",
            @"DROP INDEX IF EXISTS ""IX_WorkerTasks_Deadline"";",
            @"DROP INDEX IF EXISTS ""IX_WorkerTasks_CreatedAt"";",
            @"DROP INDEX IF EXISTS ""IX_StockMovements_StockItemId_OccurredAt"";",
            @"DROP INDEX IF EXISTS ""IX_StockMovements_MovementKind_OccurredAt"";",
            @"DROP INDEX IF EXISTS ""IX_StockMovements_OccurredAt"";",
            @"DROP INDEX IF EXISTS ""IX_StockItems_StockType"";",
            @"DROP INDEX IF EXISTS ""IX_Projects_EndDate"";",
            @"DROP INDEX IF EXISTS ""IX_Projects_StartDate"";",
            @"DROP INDEX IF EXISTS ""IX_Projects_CreatedAt"";",
            @"DROP INDEX IF EXISTS ""IX_Projects_Status"";",
            @"DROP INDEX IF EXISTS ""IX_Debts_Type_IsPaid"";",
            @"DROP INDEX IF EXISTS ""IX_Debts_IsPaid"";",
            @"DROP INDEX IF EXISTS ""IX_Debts_DueDate"";",
            @"DROP INDEX IF EXISTS ""IX_Incomes_Source"";",
            @"DROP INDEX IF EXISTS ""IX_Incomes_CreatedAt"";",
            @"DROP INDEX IF EXISTS ""IX_Incomes_Date"";",
            @"DROP INDEX IF EXISTS ""IX_Rents_Location"";",
            @"DROP INDEX IF EXISTS ""IX_Rents_CreatedAt"";",
            @"DROP INDEX IF EXISTS ""IX_Rents_PaymentDate"";",
            @"DROP INDEX IF EXISTS ""IX_Purchases_CreatedById_PurchaseDate"";",
            @"DROP INDEX IF EXISTS ""IX_Purchases_ItemName"";",
            @"DROP INDEX IF EXISTS ""IX_Purchases_CreatedAt"";",
            @"DROP INDEX IF EXISTS ""IX_Purchases_PurchaseDate"";",
            @"DROP INDEX IF EXISTS ""IX_Expenses_CreatedById_Date"";",
            @"DROP INDEX IF EXISTS ""IX_Expenses_ExpenseType"";",
            @"DROP INDEX IF EXISTS ""IX_Expenses_CreatedAt"";",
            @"DROP INDEX IF EXISTS ""IX_Expenses_Date"";",
            @"DROP INDEX IF EXISTS ""IX_SalaryRecords_EmployeeId_Month_CreatedAt"";",
            @"DROP INDEX IF EXISTS ""IX_SalaryRecords_Month"";",
            @"DROP INDEX IF EXISTS ""IX_Employees_CreatedAt"";"
        };

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var statement in UpStatements)
            {
                migrationBuilder.Sql(statement);
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var statement in DownStatements)
            {
                migrationBuilder.Sql(statement);
            }
        }
    }
}
