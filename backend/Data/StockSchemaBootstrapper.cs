using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    /// <summary>
    /// Ensures stock tables exist when the database was created with EnsureCreated before stock was added.
    /// </summary>
    public static class StockSchemaBootstrapper
    {
        public static async Task EnsureAsync(ApplicationDbContext db)
        {
            await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS ""StockItems"" (
    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_StockItems"" PRIMARY KEY AUTOINCREMENT,
    ""Name"" TEXT NOT NULL,
    ""Sku"" TEXT NULL,
    ""Unit"" TEXT NOT NULL,
    ""Description"" TEXT NULL,
    ""ReorderLevel"" TEXT NULL,
    ""CreatedAt"" TEXT NOT NULL
);
");
            await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS ""StockMovements"" (
    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_StockMovements"" PRIMARY KEY AUTOINCREMENT,
    ""StockItemId"" INTEGER NOT NULL,
    ""QuantityChange"" TEXT NOT NULL,
    ""MovementKind"" TEXT NULL,
    ""Note"" TEXT NULL,
    ""OccurredAt"" TEXT NOT NULL,
    CONSTRAINT ""FK_StockMovements_StockItems_StockItemId"" FOREIGN KEY (""StockItemId"") REFERENCES ""StockItems"" (""Id"") ON DELETE CASCADE
);
");
            await db.Database.ExecuteSqlRawAsync(
                @"CREATE INDEX IF NOT EXISTS ""IX_StockMovements_StockItemId"" ON ""StockMovements"" (""StockItemId"");");
        }
    }
}
