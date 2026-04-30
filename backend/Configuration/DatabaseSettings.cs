using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;
using Npgsql;

namespace backend.Configuration
{
    public static class DatabaseSettings
    {
        private static readonly Regex PasswordPattern = new(
            @"(?i)(Password|Pwd)\s*=\s*[^;]+",
            RegexOptions.Compiled);

        public static DatabaseOptions Load(IConfiguration configuration, string contentRoot)
        {
            var provider = ResolveProvider(configuration);
            var connectionString = provider switch
            {
                DatabaseProvider.PostgreSql => GetPostgresConnectionString(configuration),
                _ => GetSqliteConnectionString(configuration, contentRoot)
            };

            return new DatabaseOptions(
                provider,
                connectionString,
                MaskConnectionString(provider, connectionString));
        }

        public static string GetSqliteConnectionString(IConfiguration configuration, string contentRoot)
        {
            var raw = EnvironmentConfiguration.GetFirst(
                configuration,
                new[]
                {
                    "SQLITE_CONNECTION_STRING"
                },
                null,
                "");

            if (string.IsNullOrWhiteSpace(raw))
            {
                raw = EnvironmentConfiguration.GetFirst(
                    configuration,
                    new[]
                    {
                        "DATABASE_CONNECTION_STRING",
                        "DATABASE_URL"
                    },
                    "ConnectionStrings:DefaultConnection",
                    "Data Source=BusinessManagement.db");
            }

            if (LooksLikePostgresConnectionString(raw))
            {
                throw new InvalidOperationException(
                    "PostgreSQL connection string was provided while the database provider is SQLite. Set DATABASE_PROVIDER=postgres for cloud PostgreSQL.");
            }

            if (!raw.Contains('='))
            {
                raw = $"Data Source={raw}";
            }

            var builder = new SqliteConnectionStringBuilder(raw);
            if (string.IsNullOrWhiteSpace(builder.DataSource))
            {
                builder.DataSource = "BusinessManagement.db";
            }

            if (ShouldNormalizeSqlitePath(builder.DataSource))
            {
                var root = string.IsNullOrWhiteSpace(contentRoot)
                    ? AppContext.BaseDirectory
                    : contentRoot;
                builder.DataSource = Path.IsPathRooted(builder.DataSource)
                    ? Path.GetFullPath(builder.DataSource)
                    : Path.GetFullPath(Path.Combine(root, builder.DataSource));
            }

            return builder.ToString();
        }

        private static DatabaseProvider ResolveProvider(IConfiguration configuration)
        {
            var configuredProvider = EnvironmentConfiguration.GetFirst(
                configuration,
                new[] { "DATABASE_PROVIDER", "DB_PROVIDER" },
                "Database:Provider",
                "");

            if (!string.IsNullOrWhiteSpace(configuredProvider))
            {
                return configuredProvider.Trim().ToLowerInvariant() switch
                {
                    "postgres" or "postgresql" or "pg" or "supabase" => DatabaseProvider.PostgreSql,
                    "sqlite" or "sqlite3" or "local" => DatabaseProvider.Sqlite,
                    _ => throw new InvalidOperationException(
                        $"Unsupported DATABASE_PROVIDER '{configuredProvider}'. Supported values: sqlite, postgres.")
                };
            }

            var sharedConnection = EnvironmentConfiguration.GetFirst(
                configuration,
                new[] { "DATABASE_CONNECTION_STRING", "DATABASE_URL", "POSTGRES_CONNECTION_STRING", "POSTGRESQL_CONNECTION_STRING", "POSTGRES_URL" },
                "ConnectionStrings:DefaultConnection",
                "");

            if (LooksLikePostgresConnectionString(sharedConnection) || HasPostgresConnectionParts(configuration))
            {
                return DatabaseProvider.PostgreSql;
            }

            return DatabaseProvider.Sqlite;
        }

        private static string GetPostgresConnectionString(IConfiguration configuration)
        {
            var raw = EnvironmentConfiguration.GetFirst(
                configuration,
                new[]
                {
                    "POSTGRES_CONNECTION_STRING",
                    "POSTGRESQL_CONNECTION_STRING",
                    "POSTGRES_URL",
                    "DATABASE_CONNECTION_STRING",
                    "DATABASE_URL"
                },
                "ConnectionStrings:DefaultConnection",
                "");

            if (string.IsNullOrWhiteSpace(raw))
            {
                var builtFromParts = TryBuildPostgresConnectionStringFromParts(configuration);
                if (!string.IsNullOrWhiteSpace(builtFromParts))
                {
                    return builtFromParts;
                }

                throw new InvalidOperationException(
                    "DATABASE_PROVIDER=postgres requires DATABASE_URL, DATABASE_CONNECTION_STRING, POSTGRES_CONNECTION_STRING, or POSTGRES_HOST/POSTGRES_DATABASE/POSTGRES_USER/POSTGRES_PASSWORD.");
            }

            if (LooksLikeSqliteConnectionString(raw))
            {
                throw new InvalidOperationException(
                    "SQLite connection string was provided while the database provider is PostgreSQL. Use a PostgreSQL DATABASE_URL or set DATABASE_PROVIDER=sqlite.");
            }

            return NormalizePostgresConnectionString(raw);
        }

        private static string NormalizePostgresConnectionString(string raw)
        {
            var configuredOptions = ParseConfiguredPostgresOptionNames(raw);

            if (!Uri.TryCreate(raw, UriKind.Absolute, out var uri) || !IsPostgresScheme(uri.Scheme))
            {
                var rawBuilder = new NpgsqlConnectionStringBuilder(raw);
                ApplyPostgresDefaults(rawBuilder, configuredOptions);
                return rawBuilder.ToString();
            }

            var builder = new NpgsqlConnectionStringBuilder
            {
                Host = uri.Host,
                Database = Uri.UnescapeDataString(uri.AbsolutePath.Trim('/'))
            };

            if (!uri.IsDefaultPort && uri.Port > 0)
            {
                builder.Port = uri.Port;
            }

            if (!string.IsNullOrWhiteSpace(uri.UserInfo))
            {
                var parts = uri.UserInfo.Split(':', 2);
                builder.Username = Uri.UnescapeDataString(parts[0]);
                if (parts.Length > 1)
                {
                    builder.Password = Uri.UnescapeDataString(parts[1]);
                }
            }

            var query = ParseQuery(uri.Query);
            foreach (var (key, value) in query)
            {
                ApplyPostgresQueryOption(builder, key, value);
            }

            ApplyPostgresDefaults(builder, configuredOptions);
            return builder.ToString();
        }

        private static string? TryBuildPostgresConnectionStringFromParts(IConfiguration configuration)
        {
            var host = EnvironmentConfiguration.GetFirst(configuration, new[] { "POSTGRES_HOST", "PGHOST" }, null, "");
            var database = EnvironmentConfiguration.GetFirst(configuration, new[] { "POSTGRES_DATABASE", "POSTGRES_DB", "PGDATABASE" }, null, "");
            var username = EnvironmentConfiguration.GetFirst(configuration, new[] { "POSTGRES_USER", "POSTGRES_USERNAME", "PGUSER" }, null, "");
            var password = EnvironmentConfiguration.GetFirst(configuration, new[] { "POSTGRES_PASSWORD", "PGPASSWORD" }, null, "");

            if (string.IsNullOrWhiteSpace(host)
                && string.IsNullOrWhiteSpace(database)
                && string.IsNullOrWhiteSpace(username)
                && string.IsNullOrWhiteSpace(password))
            {
                return null;
            }

            var missing = new List<string>();
            if (string.IsNullOrWhiteSpace(host))
            {
                missing.Add("POSTGRES_HOST");
            }

            if (string.IsNullOrWhiteSpace(database))
            {
                missing.Add("POSTGRES_DATABASE");
            }

            if (string.IsNullOrWhiteSpace(username))
            {
                missing.Add("POSTGRES_USER");
            }

            if (string.IsNullOrWhiteSpace(password))
            {
                missing.Add("POSTGRES_PASSWORD");
            }

            if (missing.Count > 0)
            {
                throw new InvalidOperationException(
                    $"PostgreSQL environment variables are incomplete. Missing: {string.Join(", ", missing)}.");
            }

            var builder = new NpgsqlConnectionStringBuilder
            {
                Host = host,
                Database = database,
                Username = username,
                Password = password
            };

            var configuredOptions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var port = EnvironmentConfiguration.GetFirst(configuration, new[] { "POSTGRES_PORT", "PGPORT" }, null, "");
            if (!string.IsNullOrWhiteSpace(port))
            {
                if (!int.TryParse(port, out var parsedPort) || parsedPort <= 0)
                {
                    throw new InvalidOperationException("POSTGRES_PORT must be a positive integer.");
                }

                builder.Port = parsedPort;
                configuredOptions.Add(NormalizeOptionName("Port"));
            }

            var sslMode = EnvironmentConfiguration.GetFirst(configuration, new[] { "POSTGRES_SSL_MODE", "PGSSLMODE" }, null, "");
            if (!string.IsNullOrWhiteSpace(sslMode))
            {
                builder["SSL Mode"] = sslMode;
                configuredOptions.Add(NormalizeOptionName("SSL Mode"));
            }

            var trustServerCertificate = EnvironmentConfiguration.GetFirst(
                configuration,
                new[] { "POSTGRES_TRUST_SERVER_CERTIFICATE", "PGTRUSTSERVERCERTIFICATE" },
                null,
                "");
            if (!string.IsNullOrWhiteSpace(trustServerCertificate))
            {
                if (!bool.TryParse(trustServerCertificate, out var parsedTrustServerCertificate))
                {
                    throw new InvalidOperationException("POSTGRES_TRUST_SERVER_CERTIFICATE must be true or false.");
                }

                builder["Trust Server Certificate"] = parsedTrustServerCertificate;
                configuredOptions.Add(NormalizeOptionName("Trust Server Certificate"));
            }

            ApplyPostgresDefaults(builder, configuredOptions);
            return builder.ToString();
        }

        private static bool HasPostgresConnectionParts(IConfiguration configuration)
        {
            var host = EnvironmentConfiguration.GetFirst(configuration, new[] { "POSTGRES_HOST", "PGHOST" }, null, "");
            var database = EnvironmentConfiguration.GetFirst(configuration, new[] { "POSTGRES_DATABASE", "POSTGRES_DB", "PGDATABASE" }, null, "");

            return !string.IsNullOrWhiteSpace(host) && !string.IsNullOrWhiteSpace(database);
        }

        private static Dictionary<string, string> ParseQuery(string query)
        {
            var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            var trimmed = query.TrimStart('?');
            if (string.IsNullOrWhiteSpace(trimmed))
            {
                return result;
            }

            foreach (var pair in trimmed.Split('&', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var separatorIndex = pair.IndexOf('=');
                var rawKey = separatorIndex >= 0 ? pair[..separatorIndex] : pair;
                var rawValue = separatorIndex >= 0 ? pair[(separatorIndex + 1)..] : "";
                var key = Uri.UnescapeDataString(rawKey.Replace("+", " ", StringComparison.Ordinal));
                var value = Uri.UnescapeDataString(rawValue.Replace("+", " ", StringComparison.Ordinal));
                if (!string.IsNullOrWhiteSpace(key))
                {
                    result[key] = value;
                }
            }

            return result;
        }

        private static void ApplyPostgresQueryOption(NpgsqlConnectionStringBuilder builder, string key, string value)
        {
            var normalizedKey = NormalizeOptionName(key);
            var connectionStringKey = normalizedKey switch
            {
                "sslmode" => "SSL Mode",
                "trustservercertificate" => "Trust Server Certificate",
                "pooling" => "Pooling",
                "maximumpoolsize" or "maxpoolsize" => "Maximum Pool Size",
                "minimumpoolsize" or "minpoolsize" => "Minimum Pool Size",
                "timeout" or "connecttimeout" => "Timeout",
                "commandtimeout" => "Command Timeout",
                "applicationname" => "Application Name",
                "keepalive" => "Keepalive",
                _ => null
            };

            if (connectionStringKey is null)
            {
                return;
            }

            builder[connectionStringKey] = value;
        }

        private static HashSet<string> ParseConfiguredPostgresOptionNames(string raw)
        {
            var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            if (Uri.TryCreate(raw, UriKind.Absolute, out var uri) && IsPostgresScheme(uri.Scheme))
            {
                foreach (var key in ParseQuery(uri.Query).Keys)
                {
                    result.Add(NormalizeOptionName(key));
                }

                return result;
            }

            foreach (var pair in raw.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                var separatorIndex = pair.IndexOf('=');
                if (separatorIndex <= 0)
                {
                    continue;
                }

                result.Add(NormalizeOptionName(pair[..separatorIndex]));
            }

            return result;
        }

        private static void ApplyPostgresDefaults(
            NpgsqlConnectionStringBuilder builder,
            ISet<string> configuredOptions)
        {
            SetPostgresDefault(builder, configuredOptions, "Pooling", true);
            SetPostgresDefault(builder, configuredOptions, "Minimum Pool Size", 0, "Min Pool Size");
            SetPostgresDefault(builder, configuredOptions, "Maximum Pool Size", 20, "Max Pool Size");
            SetPostgresDefault(builder, configuredOptions, "Timeout", 15, "Connect Timeout");
            SetPostgresDefault(builder, configuredOptions, "Command Timeout", 30);
            SetPostgresDefault(builder, configuredOptions, "Keepalive", 30);
            SetPostgresDefault(builder, configuredOptions, "Application Name", "PROLUX Backend");

            if (!IsConfigured(configuredOptions, "SSL Mode", "SslMode") && !IsLocalPostgresHost(builder.Host))
            {
                builder["SSL Mode"] = "Require";
            }
        }

        private static void SetPostgresDefault(
            NpgsqlConnectionStringBuilder builder,
            ISet<string> configuredOptions,
            string optionName,
            object value,
            params string[] aliases)
        {
            if (IsConfigured(configuredOptions, optionName) || aliases.Any(alias => IsConfigured(configuredOptions, alias)))
            {
                return;
            }

            builder[optionName] = value;
        }

        private static bool IsConfigured(ISet<string> configuredOptions, params string[] optionNames)
        {
            return optionNames.Any(optionName => configuredOptions.Contains(NormalizeOptionName(optionName)));
        }

        private static string NormalizeOptionName(string key)
        {
            return key
                .Replace(" ", "", StringComparison.Ordinal)
                .Replace("_", "", StringComparison.Ordinal)
                .Replace("-", "", StringComparison.Ordinal)
                .ToLowerInvariant();
        }

        private static bool LooksLikePostgresConnectionString(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            var trimmed = value.Trim();
            return trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
                || trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)
                || HasConnectionStringKey(trimmed, "Host");
        }

        private static bool LooksLikeSqliteConnectionString(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            var trimmed = value.Trim();
            return HasConnectionStringKey(trimmed, "Data Source")
                || HasConnectionStringKey(trimmed, "Filename");
        }

        private static bool IsPostgresScheme(string scheme)
        {
            return scheme.Equals("postgres", StringComparison.OrdinalIgnoreCase)
                || scheme.Equals("postgresql", StringComparison.OrdinalIgnoreCase);
        }

        private static bool ShouldNormalizeSqlitePath(string dataSource)
        {
            return !string.IsNullOrWhiteSpace(dataSource)
                && !dataSource.Equals(":memory:", StringComparison.OrdinalIgnoreCase)
                && !dataSource.StartsWith("file:", StringComparison.OrdinalIgnoreCase);
        }

        private static bool HasConnectionStringKey(string connectionString, string key)
        {
            var normalizedKey = NormalizeOptionName(key);

            return connectionString
                .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Any(part =>
                {
                    var separatorIndex = part.IndexOf('=');
                    if (separatorIndex <= 0)
                    {
                        return false;
                    }

                    return NormalizeOptionName(part[..separatorIndex]) == normalizedKey;
                });
        }

        private static bool IsLocalPostgresHost(string? host)
        {
            if (string.IsNullOrWhiteSpace(host))
            {
                return false;
            }

            return host
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .All(static value =>
                    value.Equals("localhost", StringComparison.OrdinalIgnoreCase)
                    || value.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase)
                    || value.Equals("::1", StringComparison.OrdinalIgnoreCase));
        }

        private static string MaskConnectionString(DatabaseProvider provider, string connectionString)
        {
            if (provider != DatabaseProvider.PostgreSql)
            {
                return connectionString;
            }

            try
            {
                var builder = new NpgsqlConnectionStringBuilder(connectionString);
                if (!string.IsNullOrEmpty(builder.Password))
                {
                    builder.Password = "***";
                }

                return builder.ToString();
            }
            catch
            {
                return PasswordPattern.Replace(connectionString, "$1=***");
            }
        }
    }
}
