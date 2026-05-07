using System.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    /// <summary>
    /// Keeps salary history compatible with databases created before deduction snapshots existed.
    /// </summary>
    public static class SalaryRecordSchemaBootstrapper
    {
        public static async Task EnsureAsync(ApplicationDbContext db)
        {
            if (!await SchemaTableInspector.TableExistsAsync(db, "SalaryRecords"))
            {
                return;
            }

            if (db.Database.IsNpgsql())
            {
                await EnsurePostgresAsync(db);
                return;
            }

            if (db.Database.IsSqlite())
            {
                await EnsureSqliteAsync(db);
            }
        }

        private static async Task EnsurePostgresAsync(ApplicationDbContext db)
        {
            await db.Database.ExecuteSqlRawAsync("""
ALTER TABLE "SalaryRecords"
ADD COLUMN IF NOT EXISTS "AttendanceDeduction" numeric(18,2) NULL;
""");
        }

        private static async Task EnsureSqliteAsync(ApplicationDbContext db)
        {
            if (await SqliteColumnExistsAsync(db, "SalaryRecords", "AttendanceDeduction"))
            {
                return;
            }

            await db.Database.ExecuteSqlRawAsync(
                @"ALTER TABLE ""SalaryRecords"" ADD COLUMN ""AttendanceDeduction"" decimal(18,2) NULL;");
        }

        private static async Task<bool> SqliteColumnExistsAsync(
            ApplicationDbContext db,
            string tableName,
            string columnName)
        {
            var connection = db.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;
            if (shouldClose)
            {
                await db.Database.OpenConnectionAsync();
            }

            try
            {
                await using var command = connection.CreateCommand();
                command.CommandText = $@"PRAGMA table_info(""{tableName}"");";

                await using var reader = await command.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    if (string.Equals(reader["name"]?.ToString(), columnName, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                }

                return false;
            }
            finally
            {
                if (shouldClose)
                {
                    await db.Database.CloseConnectionAsync();
                }
            }
        }
    }
}
