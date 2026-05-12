using System.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    /// <summary>
    /// Adds soft-delete and account-active columns on databases that predate safe employee deletion.
    /// </summary>
    public static class EmployeeDeletionSchemaBootstrapper
    {
        public static async Task EnsureAsync(ApplicationDbContext db)
        {
            if (!await SchemaTableInspector.TableExistsAsync(db, "Employees") ||
                !await SchemaTableInspector.TableExistsAsync(db, "Users"))
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
ALTER TABLE "Employees" ADD COLUMN IF NOT EXISTS "IsDeleted" boolean NOT NULL DEFAULT FALSE;
ALTER TABLE "Employees" ADD COLUMN IF NOT EXISTS "DeletedAt" timestamp with time zone NULL;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "IsActive" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "DeactivatedAt" timestamp with time zone NULL;
CREATE INDEX IF NOT EXISTS "IX_Employees_IsDeleted" ON "Employees" ("IsDeleted");
CREATE INDEX IF NOT EXISTS "IX_Users_IsActive" ON "Users" ("IsActive");
""");
        }

        private static async Task EnsureSqliteAsync(ApplicationDbContext db)
        {
            if (!await SqliteColumnExistsAsync(db, "Employees", "IsDeleted"))
            {
                await db.Database.ExecuteSqlRawAsync(
                    @"ALTER TABLE ""Employees"" ADD COLUMN ""IsDeleted"" INTEGER NOT NULL DEFAULT 0;");
            }

            if (!await SqliteColumnExistsAsync(db, "Employees", "DeletedAt"))
            {
                await db.Database.ExecuteSqlRawAsync(
                    @"ALTER TABLE ""Employees"" ADD COLUMN ""DeletedAt"" TEXT NULL;");
            }

            if (!await SqliteColumnExistsAsync(db, "Users", "IsActive"))
            {
                await db.Database.ExecuteSqlRawAsync(
                    @"ALTER TABLE ""Users"" ADD COLUMN ""IsActive"" INTEGER NOT NULL DEFAULT 1;");
            }

            if (!await SqliteColumnExistsAsync(db, "Users", "DeactivatedAt"))
            {
                await db.Database.ExecuteSqlRawAsync(
                    @"ALTER TABLE ""Users"" ADD COLUMN ""DeactivatedAt"" TEXT NULL;");
            }

            await db.Database.ExecuteSqlRawAsync(
                @"CREATE INDEX IF NOT EXISTS ""IX_Employees_IsDeleted"" ON ""Employees"" (""IsDeleted"");");
            await db.Database.ExecuteSqlRawAsync(
                @"CREATE INDEX IF NOT EXISTS ""IX_Users_IsActive"" ON ""Users"" (""IsActive"");");
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
