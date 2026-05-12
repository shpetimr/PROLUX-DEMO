using System.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    /// <summary>
    /// Keeps worker login accounts linked to employee records on databases that predate the worker model.
    /// </summary>
    public static class UserEmployeeLinkSchemaBootstrapper
    {
        public static async Task EnsureAsync(ApplicationDbContext db)
        {
            if (db.Database.IsNpgsql())
            {
                await EnsureCoreTablesExistAsync(db);
                await EnsurePostgresColumnAsync(db);
                await BackfillWorkerEmployeesAsync(db);
                await EnsurePostgresConstraintsAsync(db);
                return;
            }

            if (db.Database.IsSqlite())
            {
                await EnsureCoreTablesExistAsync(db);
                await EnsureSqliteColumnAsync(db);
                await BackfillWorkerEmployeesAsync(db);
                await db.Database.ExecuteSqlRawAsync(
                    @"CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Users_EmployeeId"" ON ""Users"" (""EmployeeId"") WHERE ""EmployeeId"" IS NOT NULL;");
            }
        }

        private static async Task EnsureCoreTablesExistAsync(ApplicationDbContext db)
        {
            var missingTables = new List<string>();
            if (!await SchemaTableInspector.TableExistsAsync(db, "Users"))
            {
                missingTables.Add("Users");
            }

            if (!await SchemaTableInspector.TableExistsAsync(db, "Employees"))
            {
                missingTables.Add("Employees");
            }

            if (missingTables.Count == 0)
            {
                return;
            }

            throw new InvalidOperationException(
                "Cannot bootstrap user/employee links before the core schema exists. " +
                $"Missing table(s): {string.Join(", ", missingTables)}. " +
                "Run EF Core migrations before compatibility schema bootstrappers.");
        }

        private static async Task EnsurePostgresColumnAsync(ApplicationDbContext db)
        {
            await db.Database.ExecuteSqlRawAsync("""
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "EmployeeId" integer NULL;
""");
        }

        private static async Task EnsurePostgresConstraintsAsync(ApplicationDbContext db)
        {
            await db.Database.ExecuteSqlRawAsync(
                @"CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Users_EmployeeId"" ON ""Users"" (""EmployeeId"") WHERE ""EmployeeId"" IS NOT NULL;");

            await db.Database.ExecuteSqlRawAsync("""
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'FK_Users_Employees_EmployeeId'
    ) THEN
        ALTER TABLE "Users"
        ADD CONSTRAINT "FK_Users_Employees_EmployeeId"
        FOREIGN KEY ("EmployeeId") REFERENCES "Employees" ("Id") ON DELETE RESTRICT;
    END IF;
END $$;
""");
        }

        private static async Task EnsureSqliteColumnAsync(ApplicationDbContext db)
        {
            if (await SqliteColumnExistsAsync(db, "Users", "EmployeeId"))
            {
                return;
            }

            await db.Database.ExecuteSqlRawAsync("""
ALTER TABLE "Users" ADD COLUMN "EmployeeId" INTEGER NULL;
""");
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
                await connection.OpenAsync();
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
                    await connection.CloseAsync();
                }
            }
        }

        private static async Task BackfillWorkerEmployeesAsync(ApplicationDbContext db)
        {
            var workers = await db.Users
                .Where(user => user.Role == UserRole.User && user.IsActive)
                .OrderBy(user => user.Id)
                .ToListAsync();

            if (workers.Count == 0)
            {
                return;
            }

            var employees = await db.Employees
                .Where(employee => !employee.IsDeleted)
                .OrderBy(employee => employee.Id)
                .ToListAsync();

            var linkedEmployeeIds = new HashSet<int>();

            var creatorUserId = await db.Users
                .Where(user => user.Role == UserRole.Admin)
                .OrderBy(user => user.Id)
                .Select(user => user.Id)
                .FirstOrDefaultAsync();
            if (creatorUserId == 0)
            {
                creatorUserId = workers[0].Id;
            }

            var changed = false;
            foreach (var worker in workers)
            {
                if (worker.EmployeeId.HasValue)
                {
                    var employeeExists = employees.Any(employee => employee.Id == worker.EmployeeId.Value);
                    if (employeeExists && linkedEmployeeIds.Add(worker.EmployeeId.Value))
                    {
                        continue;
                    }

                    worker.EmployeeId = null;
                    changed = true;
                }

                var normalizedFullName = worker.FullName.Trim().ToUpperInvariant();
                var unlinkedNameMatches = employees
                    .Where(employee =>
                        string.Equals(
                            employee.FullName.Trim().ToUpperInvariant(),
                            normalizedFullName,
                            StringComparison.Ordinal) &&
                        !linkedEmployeeIds.Contains(employee.Id))
                    .ToList();

                if (unlinkedNameMatches.Count == 1)
                {
                    var employee = unlinkedNameMatches[0];
                    worker.EmployeeId = employee.Id;
                    linkedEmployeeIds.Add(employee.Id);
                    changed = true;
                    continue;
                }

                worker.Employee = new Employee
                {
                    FullName = worker.FullName.Trim(),
                    Position = EmployeePosition.Magazine,
                    HireDate = worker.CreatedAt.Date,
                    BaseSalary = 0,
                    DailyWage = 1850m,
                    DaysWorkedThisMonth = 0,
                    MonthlyBonuses = 0,
                    MonthlyPenalties = 0,
                    DailyRate = 1850m,
                    CreatedAt = worker.CreatedAt,
                    CreatedById = creatorUserId
                };
                changed = true;
            }

            if (changed)
            {
                await db.SaveChangesAsync();
            }
        }
    }
}
