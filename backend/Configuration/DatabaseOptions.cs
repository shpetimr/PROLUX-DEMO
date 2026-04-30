namespace backend.Configuration
{
    public sealed class DatabaseOptions
    {
        public DatabaseOptions(
            DatabaseProvider provider,
            string connectionString,
            string safeConnectionString)
        {
            Provider = provider;
            ConnectionString = connectionString;
            SafeConnectionString = safeConnectionString;
        }

        public DatabaseProvider Provider { get; }
        public string ConnectionString { get; }
        public string SafeConnectionString { get; }

        public string ProviderName =>
            Provider == DatabaseProvider.PostgreSql ? "PostgreSQL" : "SQLite";
    }
}
