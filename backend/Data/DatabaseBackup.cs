using backend.Configuration;
using Microsoft.Data.Sqlite;

namespace backend.Data
{
    public static class DatabaseBackup
    {
        public static string? TryCreateBeforeAuthMutation(DatabaseOptions databaseOptions)
        {
            return TryCreateSqliteBackup(databaseOptions, "auth-backup");
        }

        public static string? TryCreateBeforeProductionDataReset(DatabaseOptions databaseOptions)
        {
            return TryCreateSqliteBackup(databaseOptions, "production-reset-backup");
        }

        private static string? TryCreateSqliteBackup(
            DatabaseOptions databaseOptions,
            string suffix)
        {
            if (databaseOptions.Provider != DatabaseProvider.Sqlite)
            {
                return null;
            }

            return CreateSqliteBackup(databaseOptions.ConnectionString, suffix);
        }

        private static string? CreateSqliteBackup(
            string connectionString,
            string suffix)
        {
            var builder = new SqliteConnectionStringBuilder(connectionString);
            var sqliteFilePath = builder.DataSource;
            if (string.IsNullOrWhiteSpace(sqliteFilePath)
                || sqliteFilePath.Equals(":memory:", StringComparison.OrdinalIgnoreCase)
                || sqliteFilePath.StartsWith("file:", StringComparison.OrdinalIgnoreCase)
                || !File.Exists(sqliteFilePath))
            {
                return null;
            }

            var directory = Path.GetDirectoryName(sqliteFilePath);
            var fileNameWithoutExtension = Path.GetFileNameWithoutExtension(sqliteFilePath);
            var extension = Path.GetExtension(sqliteFilePath);
            var backupPath = Path.Combine(
                directory!,
                $"{fileNameWithoutExtension}.{suffix}-{DateTime.UtcNow:yyyyMMddHHmmss}{extension}");

            File.Copy(sqliteFilePath, backupPath, overwrite: false);
            return backupPath;
        }
    }
}
