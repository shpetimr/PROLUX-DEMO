using System.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    internal static class SchemaTableInspector
    {
        public static async Task<bool> TableExistsAsync(
            ApplicationDbContext db,
            string tableName,
            CancellationToken cancellationToken = default)
        {
            if (db.Database.IsNpgsql())
            {
                return await QueryTableExistsAsync(
                    db,
                    """
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = ANY (current_schemas(false))
      AND table_name = @tableName
);
""",
                    tableName,
                    cancellationToken);
            }

            if (db.Database.IsSqlite())
            {
                return await QueryTableExistsAsync(
                    db,
                    """
SELECT EXISTS (
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table'
      AND name = @tableName
);
""",
                    tableName,
                    cancellationToken);
            }

            return false;
        }

        private static async Task<bool> QueryTableExistsAsync(
            ApplicationDbContext db,
            string sql,
            string tableName,
            CancellationToken cancellationToken)
        {
            var connection = db.Database.GetDbConnection();
            var shouldClose = connection.State != ConnectionState.Open;
            if (shouldClose)
            {
                await db.Database.OpenConnectionAsync(cancellationToken);
            }

            try
            {
                await using var command = connection.CreateCommand();
                command.CommandText = sql;

                var parameter = command.CreateParameter();
                parameter.ParameterName = "@tableName";
                parameter.Value = tableName;
                command.Parameters.Add(parameter);

                var result = await command.ExecuteScalarAsync(cancellationToken);
                return result switch
                {
                    bool exists => exists,
                    long count => count != 0,
                    int count => count != 0,
                    null => false,
                    _ => Convert.ToBoolean(result)
                };
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
