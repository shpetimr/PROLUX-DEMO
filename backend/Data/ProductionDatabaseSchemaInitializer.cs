using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    public static class ProductionDatabaseSchemaInitializer
    {
        private const string MigrationHistoryTableName = "__EFMigrationsHistory";
        private const string UsersTableName = "Users";

        public static async Task ApplyMigrationsAsync(
            ApplicationDbContext db,
            CancellationToken cancellationToken = default)
        {
            if (!db.Database.IsRelational())
            {
                throw new InvalidOperationException("Production database initialization requires a relational EF Core provider.");
            }

            var hasMigrationHistory = await SchemaTableInspector.TableExistsAsync(
                db,
                MigrationHistoryTableName,
                cancellationToken);
            var hasUsersTable = await SchemaTableInspector.TableExistsAsync(
                db,
                UsersTableName,
                cancellationToken);

            if (!hasMigrationHistory && hasUsersTable)
            {
                Console.WriteLine(
                    "[Database] Production startup: existing core schema has no EF migration history; " +
                    "skipping automatic MigrateAsync() to avoid replaying migrations over live tables.");
                return;
            }

            var pendingMigrations = (await db.Database.GetPendingMigrationsAsync(cancellationToken)).ToArray();
            if (pendingMigrations.Length == 0)
            {
                Console.WriteLine("[Database] Production startup: EF migrations are up to date.");
                await EnsureCoreSchemaExistsAsync(db, cancellationToken);
                return;
            }

            if (!hasUsersTable)
            {
                Console.WriteLine("[Database] Production startup: core schema not found; initializing with EF migrations.");
            }

            Console.WriteLine($"[Database] Production startup: applying {pendingMigrations.Length} EF migration(s).");
            await db.Database.MigrateAsync(cancellationToken);
            await EnsureCoreSchemaExistsAsync(db, cancellationToken);
            Console.WriteLine("[Database] Production startup: EF migration step completed.");
        }

        private static async Task EnsureCoreSchemaExistsAsync(
            ApplicationDbContext db,
            CancellationToken cancellationToken)
        {
            if (!await SchemaTableInspector.TableExistsAsync(db, UsersTableName, cancellationToken))
            {
                throw new InvalidOperationException(
                    "Production database migration step completed, but the core Users table is still missing.");
            }
        }
    }
}
