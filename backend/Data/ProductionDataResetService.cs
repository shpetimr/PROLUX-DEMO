using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    public sealed record ProductionDataResetOptions(
        bool Confirmed,
        string? PreserveAdminUsername);

    public sealed record ProductionDataResetTableCount(
        string Name,
        int Count);

    public sealed record ProductionDataResetResult(
        bool DryRun,
        IReadOnlyList<string> PreservedAdmins,
        IReadOnlyList<ProductionDataResetTableCount> PlannedCounts,
        IReadOnlyList<ProductionDataResetTableCount> AppliedCounts)
    {
        public int PlannedRows => PlannedCounts.Sum(static item => item.Count);
        public int AppliedRows => AppliedCounts.Sum(static item => item.Count);
    }

    public sealed class ProductionDataResetService
    {
        private readonly ApplicationDbContext _context;

        public ProductionDataResetService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ProductionDataResetResult> ResetAsync(
            ProductionDataResetOptions options,
            CancellationToken cancellationToken = default)
        {
            var preservedAdmins = await ResolvePreservedAdminsAsync(
                options.PreserveAdminUsername,
                cancellationToken);
            var preservedAdminIds = preservedAdmins.Select(static user => user.Id).ToArray();
            var preservedAdminLabels = preservedAdmins
                .Select(static user => $"{user.Username} (id {user.Id})")
                .ToArray();

            var plannedCounts = await CountResetTargetsAsync(preservedAdminIds, cancellationToken);
            if (!options.Confirmed)
            {
                return new ProductionDataResetResult(
                    DryRun: true,
                    PreservedAdmins: preservedAdminLabels,
                    PlannedCounts: plannedCounts,
                    AppliedCounts: Array.Empty<ProductionDataResetTableCount>());
            }

            var appliedCounts = new List<ProductionDataResetTableCount>();
            var strategy = _context.Database.CreateExecutionStrategy();

            await strategy.ExecuteAsync(async () =>
            {
                var transactionCounts = new List<ProductionDataResetTableCount>();
                await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

                await AddUpdateCountAsync(
                    transactionCounts,
                    "UserEmployeeLinks",
                    await _context.Users
                        .Where(static user => user.EmployeeId != null)
                        .ExecuteUpdateAsync(
                            setters => setters.SetProperty(user => user.EmployeeId, (int?)null),
                            cancellationToken));

                await AddDeleteCountAsync(transactionCounts, "WorkerTasks", _context.WorkerTasks, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "WorkSales", _context.WorkSales, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "FiscalReceiptStockDeductions", _context.FiscalReceiptStockDeductions, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "FiscalReceiptArchives", _context.FiscalReceiptArchives, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "FiscalReceipts", _context.FiscalReceipts, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "InvoiceStockDeductions", _context.InvoiceStockDeductions, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "InvoiceArchives", _context.InvoiceArchives, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "StockMovements", _context.StockMovements, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "StockItems", _context.StockItems, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "SalaryRecords", _context.SalaryRecords, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "AttendanceRecords", _context.AttendanceRecords, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "Expenses", _context.Expenses, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "Purchases", _context.Purchases, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "Rents", _context.Rents, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "Incomes", _context.Incomes, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "Debts", _context.Debts, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "Projects", _context.Projects, cancellationToken);
                await AddDeleteCountAsync(transactionCounts, "Employees", _context.Employees, cancellationToken);
                await AddDeleteCountAsync(
                    transactionCounts,
                    "Users",
                    _context.Users.Where(user => !preservedAdminIds.Contains(user.Id)),
                    cancellationToken);

                await transaction.CommitAsync(cancellationToken);
                appliedCounts = transactionCounts;
            });

            return new ProductionDataResetResult(
                DryRun: false,
                PreservedAdmins: preservedAdminLabels,
                PlannedCounts: plannedCounts,
                AppliedCounts: appliedCounts);
        }

        private async Task<IReadOnlyList<User>> ResolvePreservedAdminsAsync(
            string? configuredAdminUsername,
            CancellationToken cancellationToken)
        {
            var admins = await _context.Users
                .AsNoTracking()
                .Where(static user => user.Role == UserRole.Admin)
                .OrderBy(static user => user.Id)
                .ToListAsync(cancellationToken);

            if (!string.IsNullOrWhiteSpace(configuredAdminUsername))
            {
                var configuredAdmin = admins.FirstOrDefault(user =>
                    string.Equals(
                        user.Username,
                        configuredAdminUsername.Trim(),
                        StringComparison.OrdinalIgnoreCase));

                if (configuredAdmin is null)
                {
                    throw new InvalidOperationException(
                        $"The configured ADMIN_USERNAME '{configuredAdminUsername}' does not match an administrator account. " +
                        "Run --audit-users and correct ADMIN_USERNAME before resetting production data.");
                }

                EnsureAdminCanBePreserved(configuredAdmin);
                return new[] { configuredAdmin };
            }

            var activeAdmins = admins
                .Where(static user => user.IsActive)
                .ToArray();

            if (activeAdmins.Length == 1)
            {
                return activeAdmins;
            }

            if (activeAdmins.Length == 0)
            {
                throw new InvalidOperationException(
                    "No active administrator account exists. Run --provision-admin or --reset-admin-password before resetting production data.");
            }

            throw new InvalidOperationException(
                "Multiple active administrator accounts exist. Set ADMIN_USERNAME to the real admin account before running --reset-production-data.");
        }

        private static void EnsureAdminCanBePreserved(User admin)
        {
            if (!admin.IsActive)
            {
                throw new InvalidOperationException(
                    $"The configured administrator '{admin.Username}' is inactive. Run --reset-admin-password before resetting production data.");
            }
        }

        private async Task<IReadOnlyList<ProductionDataResetTableCount>> CountResetTargetsAsync(
            int[] preservedAdminIds,
            CancellationToken cancellationToken)
        {
            return new[]
            {
                new ProductionDataResetTableCount("WorkerTasks", await _context.WorkerTasks.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("WorkSales", await _context.WorkSales.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("FiscalReceiptStockDeductions", await _context.FiscalReceiptStockDeductions.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("FiscalReceiptArchives", await _context.FiscalReceiptArchives.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("FiscalReceipts", await _context.FiscalReceipts.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("InvoiceStockDeductions", await _context.InvoiceStockDeductions.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("InvoiceArchives", await _context.InvoiceArchives.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("StockMovements", await _context.StockMovements.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("StockItems", await _context.StockItems.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("SalaryRecords", await _context.SalaryRecords.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("AttendanceRecords", await _context.AttendanceRecords.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("Expenses", await _context.Expenses.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("Purchases", await _context.Purchases.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("Rents", await _context.Rents.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("Incomes", await _context.Incomes.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("Debts", await _context.Debts.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("Projects", await _context.Projects.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount("Employees", await _context.Employees.CountAsync(cancellationToken)),
                new ProductionDataResetTableCount(
                    "Users",
                    await _context.Users
                        .Where(user => !preservedAdminIds.Contains(user.Id))
                        .CountAsync(cancellationToken))
            };
        }

        private static async Task AddDeleteCountAsync<TEntity>(
            ICollection<ProductionDataResetTableCount> counts,
            string name,
            IQueryable<TEntity> query,
            CancellationToken cancellationToken)
            where TEntity : class
        {
            counts.Add(new ProductionDataResetTableCount(
                name,
                await query.ExecuteDeleteAsync(cancellationToken)));
        }

        private static Task AddUpdateCountAsync(
            ICollection<ProductionDataResetTableCount> counts,
            string name,
            int count)
        {
            counts.Add(new ProductionDataResetTableCount(name, count));
            return Task.CompletedTask;
        }
    }
}
