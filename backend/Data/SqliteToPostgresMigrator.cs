using System.Data;
using System.Data.Common;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using backend.Configuration;
using backend.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;

namespace backend.Data
{
    public sealed class SqliteToPostgresMigrationOptions
    {
        public bool DryRun { get; init; }
        public bool AllowMerge { get; init; }
    }

    public sealed class SqliteToPostgresMigrator
    {
        private readonly ApplicationDbContext destination;
        private readonly DatabaseOptions destinationOptions;

        public SqliteToPostgresMigrator(
            ApplicationDbContext destination,
            DatabaseOptions destinationOptions)
        {
            this.destination = destination;
            this.destinationOptions = destinationOptions;
        }

        public async Task RunAsync(
            IConfiguration configuration,
            string contentRoot,
            SqliteToPostgresMigrationOptions options,
            CancellationToken cancellationToken = default)
        {
            if (destinationOptions.Provider != DatabaseProvider.PostgreSql)
            {
                throw new InvalidOperationException(
                    "SQLite migration requires DATABASE_PROVIDER=postgres for the destination database.");
            }

            var sourceConnectionString = DatabaseSettings.GetSqliteConnectionString(configuration, contentRoot);
            ValidateSourceDatabaseExists(sourceConnectionString);

            await VerifyDestinationPostgresConnectionAsync(cancellationToken);
            await EnsureDestinationSchemaReadyAsync(options.DryRun, cancellationToken);

            await using var source = CreateSourceContext(sourceConnectionString);
            await ValidateSqliteAsync(source, cancellationToken);

            var targetCounts = await CountTargetTablesAsync(cancellationToken);
            var nonEmptyTables = targetCounts.Where(table => table.Count > 0).ToList();
            if (nonEmptyTables.Count > 0 && !options.AllowMerge)
            {
                var details = string.Join(", ", nonEmptyTables.Select(table => $"{table.TableName}={table.Count}"));
                throw new InvalidOperationException(
                    "Destination PostgreSQL database already has application data. "
                    + $"Non-empty tables: {details}. "
                    + "Use an empty database, or rerun with --migration-allow-merge to insert only missing primary keys.");
            }

            string? backupPath = null;
            if (!options.DryRun)
            {
                backupPath = CreateSqliteBackup(sourceConnectionString);
                Console.WriteLine($"[Migration] SQLite backup created at {backupPath}");
            }

            var results = options.DryRun
                ? await CopyApplicationTablesAsync(source, dryRun: true, cancellationToken)
                : await CopyApplicationTablesInTransactionAsync(source, cancellationToken);

            Console.WriteLine(options.DryRun
                ? "[Migration] Dry run completed. No rows were inserted."
                : "[Migration] SQLite to PostgreSQL migration completed.");

            foreach (var result in results)
            {
                Console.WriteLine(
                    $"[Migration] {result.TableName}: source={result.SourceCount}, "
                    + $"existing={result.ExistingCount}, inserted={result.InsertedCount}, final={result.FinalCount}");
            }
        }

        private static ApplicationDbContext CreateSourceContext(string sourceConnectionString)
        {
            var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
            optionsBuilder.UseSqlite(sourceConnectionString);
            return new ApplicationDbContext(optionsBuilder.Options);
        }

        private static void ValidateSourceDatabaseExists(string sourceConnectionString)
        {
            var builder = new SqliteConnectionStringBuilder(sourceConnectionString);
            if (string.IsNullOrWhiteSpace(builder.DataSource)
                || builder.DataSource.Equals(":memory:", StringComparison.OrdinalIgnoreCase)
                || builder.DataSource.StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            if (!File.Exists(builder.DataSource))
            {
                throw new FileNotFoundException("SQLite source database was not found.", builder.DataSource);
            }
        }

        private static string? CreateSqliteBackup(string sourceConnectionString)
        {
            var builder = new SqliteConnectionStringBuilder(sourceConnectionString);
            if (string.IsNullOrWhiteSpace(builder.DataSource)
                || builder.DataSource.Equals(":memory:", StringComparison.OrdinalIgnoreCase)
                || builder.DataSource.StartsWith("file:", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            var sourcePath = builder.DataSource;
            var directory = Path.GetDirectoryName(sourcePath);
            var fileName = Path.GetFileNameWithoutExtension(sourcePath);
            var extension = Path.GetExtension(sourcePath);
            var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            var backupPath = Path.Combine(
                string.IsNullOrWhiteSpace(directory) ? Directory.GetCurrentDirectory() : directory,
                $"{fileName}.pre-postgres-migration-{timestamp}{extension}");

            File.Copy(sourcePath, backupPath, overwrite: false);
            return backupPath;
        }

        private static async Task ValidateSqliteAsync(
            ApplicationDbContext source,
            CancellationToken cancellationToken)
        {
            await source.Database.OpenConnectionAsync(cancellationToken);
            var connection = source.Database.GetDbConnection();

            var integrity = await ExecuteScalarAsync(connection, "PRAGMA integrity_check;", cancellationToken);
            if (!string.Equals(integrity, "ok", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"SQLite integrity check failed: {integrity}");
            }

            using var command = connection.CreateCommand();
            command.CommandText = "PRAGMA foreign_key_check;";
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                var table = reader.GetString(0);
                var rowId = reader.GetValue(1);
                var parent = reader.GetString(2);
                throw new InvalidOperationException(
                    $"SQLite foreign key check failed: table={table}, rowid={rowId}, parent={parent}.");
            }
        }

        private static async Task<string?> ExecuteScalarAsync(
            DbConnection connection,
            string sql,
            CancellationToken cancellationToken)
        {
            using var command = connection.CreateCommand();
            command.CommandText = sql;
            var value = await command.ExecuteScalarAsync(cancellationToken);
            return value?.ToString();
        }

        private async Task VerifyDestinationPostgresConnectionAsync(CancellationToken cancellationToken)
        {
            Console.WriteLine("[Migration] Checking destination PostgreSQL connection before schema initialization...");

            var connection = destination.Database.GetDbConnection();
            try
            {
                await destination.Database.OpenConnectionAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException(BuildPostgresConnectionFailureMessage(ex), ex);
            }
            finally
            {
                if (connection.State != ConnectionState.Closed)
                {
                    await destination.Database.CloseConnectionAsync();
                }
            }
        }

        private static string BuildPostgresConnectionFailureMessage(Exception exception)
        {
            var message = new StringBuilder();
            message.AppendLine("Could not connect to the destination PostgreSQL database.");
            message.AppendLine("The migration stopped before PostgreSQL schema initialization.");
            message.AppendLine($"Connection failure reason: {GetConnectionFailureReason(exception)}");
            message.AppendLine("Exception chain:");

            var current = exception;
            var depth = 0;
            while (current is not null)
            {
                var prefix = depth == 0 ? "  Root" : $"  Inner #{depth}";
                message.AppendLine($"{prefix}: {current.GetType().FullName}");
                message.AppendLine($"    Message: {current.Message}");

                if (current is PostgresException postgresException)
                {
                    message.AppendLine($"    SqlState: {postgresException.SqlState}");
                    message.AppendLine($"    Severity: {postgresException.Severity}");
                    if (!string.IsNullOrWhiteSpace(postgresException.Detail))
                    {
                        message.AppendLine($"    Detail: {postgresException.Detail}");
                    }
                }
                else if (current is NpgsqlException npgsqlException)
                {
                    message.AppendLine($"    IsTransient: {npgsqlException.IsTransient}");
                }
                else if (current is SocketException socketException)
                {
                    message.AppendLine($"    SocketErrorCode: {socketException.SocketErrorCode}");
                    message.AppendLine($"    NativeErrorCode: {socketException.NativeErrorCode}");
                }

                current = current.InnerException;
                depth++;
            }

            message.AppendLine("Full exception:");
            message.AppendLine(exception.ToString());
            return message.ToString();
        }

        private static string GetConnectionFailureReason(Exception exception)
        {
            for (var current = exception; current is not null; current = current.InnerException)
            {
                if (current is PostgresException postgresException)
                {
                    return $"{postgresException.SqlState} - {postgresException.MessageText}";
                }

                if (current is SocketException socketException)
                {
                    return $"{socketException.SocketErrorCode} - {socketException.Message}";
                }

                if (current is TimeoutException timeoutException)
                {
                    return timeoutException.Message;
                }

                if (current is NpgsqlException npgsqlException)
                {
                    return npgsqlException.Message;
                }
            }

            return exception.Message;
        }

        private async Task<IReadOnlyList<TableMigrationResult>> CopyApplicationTablesInTransactionAsync(
            ApplicationDbContext source,
            CancellationToken cancellationToken)
        {
            var strategy = destination.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await destination.Database.BeginTransactionAsync(cancellationToken);
                try
                {
                    var results = await CopyApplicationTablesAsync(source, dryRun: false, cancellationToken);
                    await ResetPostgresSequencesAsync(cancellationToken);
                    await ValidateMigratedIdsAsync(source, cancellationToken);
                    await transaction.CommitAsync(cancellationToken);
                    return results;
                }
                catch
                {
                    destination.ChangeTracker.Clear();
                    throw;
                }
            });
        }

        private async Task<IReadOnlyList<TableMigrationResult>> CopyApplicationTablesAsync(
            ApplicationDbContext source,
            bool dryRun,
            CancellationToken cancellationToken)
        {
            var results = new List<TableMigrationResult>
            {
                await CopyTableAsync(source.Users, destination.Users, "Users", dryRun, cancellationToken),
                await CopyTableAsync(source.Employees, destination.Employees, "Employees", dryRun, cancellationToken),
                await CopyTableAsync(source.AttendanceRecords, destination.AttendanceRecords, "AttendanceRecords", dryRun, cancellationToken),
                await CopyTableAsync(source.SalaryRecords, destination.SalaryRecords, "SalaryRecords", dryRun, cancellationToken),
                await CopyTableAsync(source.Expenses, destination.Expenses, "Expenses", dryRun, cancellationToken),
                await CopyTableAsync(source.Purchases, destination.Purchases, "Purchases", dryRun, cancellationToken),
                await CopyTableAsync(source.Rents, destination.Rents, "Rents", dryRun, cancellationToken),
                await CopyTableAsync(source.Incomes, destination.Incomes, "Incomes", dryRun, cancellationToken),
                await CopyTableAsync(source.Debts, destination.Debts, "Debts", dryRun, cancellationToken),
                await CopyTableAsync(source.Projects, destination.Projects, "Projects", dryRun, cancellationToken),
                await CopyTableAsync(source.InvoiceArchives, destination.InvoiceArchives, "InvoiceArchives", dryRun, cancellationToken),
                await CopyTableAsync(source.InvoiceStockDeductions, destination.InvoiceStockDeductions, "InvoiceStockDeductions", dryRun, cancellationToken),
                await CopyTableAsync(source.StockItems, destination.StockItems, "StockItems", dryRun, cancellationToken),
                await CopyTableAsync(source.StockMovements, destination.StockMovements, "StockMovements", dryRun, cancellationToken)
            };

            return results;
        }

        private async Task EnsureDestinationSchemaReadyAsync(
            bool dryRun,
            CancellationToken cancellationToken)
        {
            var schemaState = await GetDestinationSchemaStateAsync(cancellationToken);
            Console.WriteLine(
                $"[Migration] Destination schema '{schemaState.SchemaName}' has "
                + $"{schemaState.TotalTableCount} table(s), including "
                + $"{schemaState.ExistingApplicationTables.Count}/{TableNames.Count} application table(s).");

            if (schemaState.ExistingApplicationTables.Count == 0)
            {
                if (dryRun)
                {
                    throw new InvalidOperationException(
                        "Destination PostgreSQL has no application tables yet. "
                        + "Dry run stops before schema creation; rerun with -Run to create the schema and migrate data.");
                }

                Console.WriteLine("[Migration] No application tables found. Creating PostgreSQL schema from the EF model...");
                await CreateDestinationSchemaAsync(cancellationToken);
                schemaState = await GetDestinationSchemaStateAsync(cancellationToken);
            }

            var existingTableSet = schemaState.ExistingApplicationTables.ToHashSet(StringComparer.Ordinal);
            var missingTables = TableNames
                .Where(tableName => !existingTableSet.Contains(tableName))
                .ToList();

            if (missingTables.Count > 0)
            {
                var existingTables = schemaState.ExistingApplicationTables.Count == 0
                    ? "none"
                    : string.Join(", ", schemaState.ExistingApplicationTables);

                throw new InvalidOperationException(
                    "Destination PostgreSQL schema is incomplete. "
                    + $"Existing application tables: {existingTables}. "
                    + $"Missing application tables: {string.Join(", ", missingTables)}. "
                    + "Use a fresh empty database or repair the schema before running the data migration.");
            }

            Console.WriteLine("[Migration] Destination application schema is ready.");
        }

        private async Task CreateDestinationSchemaAsync(CancellationToken cancellationToken)
        {
            try
            {
                var databaseCreator = destination.Database.GetService<IRelationalDatabaseCreator>();
                await databaseCreator.CreateTablesAsync(cancellationToken);
                Console.WriteLine("[Migration] PostgreSQL application tables created.");
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException(
                    "Failed to create PostgreSQL application schema before reading target tables.",
                    ex);
            }
        }

        private async Task<DestinationSchemaState> GetDestinationSchemaStateAsync(CancellationToken cancellationToken)
        {
            var connection = destination.Database.GetDbConnection();
            var shouldClose = connection.State == ConnectionState.Closed;

            if (shouldClose)
            {
                await destination.Database.OpenConnectionAsync(cancellationToken);
            }

            try
            {
                var schemaName = await ExecuteScalarAsync(connection, "SELECT current_schema();", cancellationToken)
                    ?? "public";
                var tableNames = new List<string>();

                using var command = connection.CreateCommand();
                command.CommandText = @"
SELECT table_name
FROM information_schema.tables
WHERE table_schema = current_schema()
  AND table_type = 'BASE TABLE';";

                await using var reader = await command.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                {
                    tableNames.Add(reader.GetString(0));
                }

                var allTableSet = tableNames.ToHashSet(StringComparer.Ordinal);
                var applicationTables = TableNames
                    .Where(tableName => allTableSet.Contains(tableName))
                    .ToList();

                return new DestinationSchemaState(schemaName, tableNames.Count, applicationTables);
            }
            finally
            {
                if (shouldClose && connection.State != ConnectionState.Closed)
                {
                    await destination.Database.CloseConnectionAsync();
                }
            }
        }

        private async Task<TableMigrationResult> CopyTableAsync<TEntity>(
            DbSet<TEntity> sourceSet,
            DbSet<TEntity> destinationSet,
            string tableName,
            bool dryRun,
            CancellationToken cancellationToken)
            where TEntity : class
        {
            var sourceRows = await sourceSet
                .AsNoTracking()
                .OrderBy(row => EF.Property<int>(row, "Id"))
                .ToListAsync(cancellationToken);

            var existingIds = await destinationSet
                .AsNoTracking()
                .Select(row => EF.Property<int>(row, "Id"))
                .ToListAsync(cancellationToken);

            var existingIdSet = existingIds.ToHashSet();
            var rowsToInsert = sourceRows
                .Where(row => !existingIdSet.Contains(GetEntityId(row)))
                .ToList();

            if (!dryRun && rowsToInsert.Count > 0)
            {
                foreach (var row in rowsToInsert)
                {
                    NormalizeEntityDateTimesToUtc(row);
                }

                destinationSet.AddRange(rowsToInsert);
                await destination.SaveChangesAsync(cancellationToken);
                destination.ChangeTracker.Clear();
            }

            var finalCount = dryRun
                ? existingIds.Count + rowsToInsert.Count
                : await destinationSet.CountAsync(cancellationToken);

            return new TableMigrationResult(
                tableName,
                sourceRows.Count,
                existingIds.Count,
                rowsToInsert.Count,
                finalCount);
        }

        private static void NormalizeEntityDateTimesToUtc<TEntity>(TEntity entity)
            where TEntity : class
        {
            foreach (var property in typeof(TEntity).GetProperties(BindingFlags.Instance | BindingFlags.Public))
            {
                if (!property.CanRead || !property.CanWrite)
                {
                    continue;
                }

                if (property.PropertyType == typeof(DateTime))
                {
                    var value = (DateTime)property.GetValue(entity)!;
                    property.SetValue(entity, NormalizeDateTimeToUtc(value));
                    continue;
                }

                if (Nullable.GetUnderlyingType(property.PropertyType) == typeof(DateTime))
                {
                    var value = (DateTime?)property.GetValue(entity);
                    if (value.HasValue)
                    {
                        property.SetValue(entity, NormalizeDateTimeToUtc(value.Value));
                    }
                }
            }
        }

        private static DateTime NormalizeDateTimeToUtc(DateTime value)
        {
            return value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
            };
        }

        private async Task ValidateMigratedIdsAsync(
            ApplicationDbContext source,
            CancellationToken cancellationToken)
        {
            await ValidateTableIdsAsync(source.Users, destination.Users, "Users", cancellationToken);
            await ValidateTableIdsAsync(source.Employees, destination.Employees, "Employees", cancellationToken);
            await ValidateTableIdsAsync(source.AttendanceRecords, destination.AttendanceRecords, "AttendanceRecords", cancellationToken);
            await ValidateTableIdsAsync(source.SalaryRecords, destination.SalaryRecords, "SalaryRecords", cancellationToken);
            await ValidateTableIdsAsync(source.Expenses, destination.Expenses, "Expenses", cancellationToken);
            await ValidateTableIdsAsync(source.Purchases, destination.Purchases, "Purchases", cancellationToken);
            await ValidateTableIdsAsync(source.Rents, destination.Rents, "Rents", cancellationToken);
            await ValidateTableIdsAsync(source.Incomes, destination.Incomes, "Incomes", cancellationToken);
            await ValidateTableIdsAsync(source.Debts, destination.Debts, "Debts", cancellationToken);
            await ValidateTableIdsAsync(source.Projects, destination.Projects, "Projects", cancellationToken);
            await ValidateTableIdsAsync(source.InvoiceArchives, destination.InvoiceArchives, "InvoiceArchives", cancellationToken);
            await ValidateTableIdsAsync(source.InvoiceStockDeductions, destination.InvoiceStockDeductions, "InvoiceStockDeductions", cancellationToken);
            await ValidateTableIdsAsync(source.StockItems, destination.StockItems, "StockItems", cancellationToken);
            await ValidateTableIdsAsync(source.StockMovements, destination.StockMovements, "StockMovements", cancellationToken);
        }

        private static async Task ValidateTableIdsAsync<TEntity>(
            DbSet<TEntity> sourceSet,
            DbSet<TEntity> destinationSet,
            string tableName,
            CancellationToken cancellationToken)
            where TEntity : class
        {
            var sourceIds = await sourceSet
                .AsNoTracking()
                .Select(row => EF.Property<int>(row, "Id"))
                .ToListAsync(cancellationToken);

            if (sourceIds.Count == 0)
            {
                return;
            }

            var targetIds = await destinationSet
                .AsNoTracking()
                .Where(row => sourceIds.Contains(EF.Property<int>(row, "Id")))
                .Select(row => EF.Property<int>(row, "Id"))
                .ToListAsync(cancellationToken);

            var missingIds = sourceIds.Except(targetIds).Take(10).ToList();
            if (missingIds.Count > 0)
            {
                throw new InvalidOperationException(
                    $"{tableName} validation failed. Missing destination ids: {string.Join(", ", missingIds)}.");
            }
        }

        private async Task ResetPostgresSequencesAsync(CancellationToken cancellationToken)
        {
            foreach (var tableName in TableNames)
            {
                await ResetPostgresSequenceAsync(tableName, cancellationToken);
            }
        }

        private async Task ResetPostgresSequenceAsync(
            string tableName,
            CancellationToken cancellationToken)
        {
            var escapedTableName = tableName.Replace("\"", "\"\"", StringComparison.Ordinal);
            var sql = $@"
SELECT setval(
    pg_get_serial_sequence('""{escapedTableName}""', 'Id'),
    COALESCE((SELECT MAX(""Id"") FROM ""{escapedTableName}""), 1),
    (SELECT COUNT(*) > 0 FROM ""{escapedTableName}"")
);";

            await destination.Database.ExecuteSqlRawAsync(sql, cancellationToken);
        }

        private async Task<IReadOnlyList<TableCount>> CountTargetTablesAsync(CancellationToken cancellationToken)
        {
            return new List<TableCount>
            {
                new("Users", await destination.Users.CountAsync(cancellationToken)),
                new("Employees", await destination.Employees.CountAsync(cancellationToken)),
                new("AttendanceRecords", await destination.AttendanceRecords.CountAsync(cancellationToken)),
                new("SalaryRecords", await destination.SalaryRecords.CountAsync(cancellationToken)),
                new("Expenses", await destination.Expenses.CountAsync(cancellationToken)),
                new("Purchases", await destination.Purchases.CountAsync(cancellationToken)),
                new("Rents", await destination.Rents.CountAsync(cancellationToken)),
                new("Incomes", await destination.Incomes.CountAsync(cancellationToken)),
                new("Debts", await destination.Debts.CountAsync(cancellationToken)),
                new("Projects", await destination.Projects.CountAsync(cancellationToken)),
                new("InvoiceArchives", await destination.InvoiceArchives.CountAsync(cancellationToken)),
                new("InvoiceStockDeductions", await destination.InvoiceStockDeductions.CountAsync(cancellationToken)),
                new("StockItems", await destination.StockItems.CountAsync(cancellationToken)),
                new("StockMovements", await destination.StockMovements.CountAsync(cancellationToken))
            };
        }

        private static int GetEntityId<TEntity>(TEntity entity)
            where TEntity : class
        {
            var property = typeof(TEntity).GetProperty("Id");
            if (property is null)
            {
                throw new InvalidOperationException($"{typeof(TEntity).Name} does not have an Id property.");
            }

            return (int)(property.GetValue(entity) ?? 0);
        }

        private static readonly IReadOnlyList<string> TableNames = new[]
        {
            "Users",
            "Employees",
            "AttendanceRecords",
            "SalaryRecords",
            "Expenses",
            "Purchases",
            "Rents",
            "Incomes",
            "Debts",
            "Projects",
            "InvoiceArchives",
            "InvoiceStockDeductions",
            "StockItems",
            "StockMovements"
        };

        private sealed record TableMigrationResult(
            string TableName,
            int SourceCount,
            int ExistingCount,
            int InsertedCount,
            int FinalCount);

        private sealed record TableCount(string TableName, int Count);

        private sealed record DestinationSchemaState(
            string SchemaName,
            int TotalTableCount,
            IReadOnlyList<string> ExistingApplicationTables);
    }
}
