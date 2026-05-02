using Microsoft.AspNetCore.Cors.Infrastructure;

namespace backend.Configuration
{
    public sealed class CorsSettings
    {
        public const string PolicyName = "ConfiguredCors";

        public bool AllowAnyOrigin { get; init; }
        public IReadOnlyList<string> AllowedOrigins { get; init; } = Array.Empty<string>();

        public static CorsSettings Load(IConfiguration configuration)
        {
            var origins = GetConfiguredOrigins(configuration)
                .Select(NormalizeOrigin)
                .Where(static origin => !string.IsNullOrWhiteSpace(origin))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var allowAnyOrigin = origins.Any(static origin => origin == "*");

            return new CorsSettings
            {
                AllowAnyOrigin = allowAnyOrigin,
                AllowedOrigins = allowAnyOrigin
                    ? Array.Empty<string>()
                    : origins
            };
        }

        public void ApplyTo(CorsPolicyBuilder policy)
        {
            policy
                .AllowAnyMethod()
                .AllowAnyHeader()
                .WithExposedHeaders("Content-Disposition");

            if (AllowAnyOrigin)
            {
                policy.AllowAnyOrigin();
                return;
            }

            if (AllowedOrigins.Count > 0)
            {
                policy
                    .WithOrigins(AllowedOrigins.ToArray())
                    .AllowCredentials();
                return;
            }

            policy.SetIsOriginAllowed(static _ => false);
        }

        public string Describe()
        {
            if (AllowAnyOrigin)
            {
                return "*";
            }

            return AllowedOrigins.Count == 0
                ? "(same-origin only)"
                : string.Join(", ", AllowedOrigins);
        }

        private static string NormalizeOrigin(string origin)
        {
            var normalized = origin.Trim();
            if (normalized == "*")
            {
                return normalized;
            }

            if (!Uri.TryCreate(normalized, UriKind.Absolute, out var uri))
            {
                return normalized.TrimEnd('/');
            }

            var host = uri.HostNameType == UriHostNameType.IPv6
                ? $"[{uri.IdnHost}]"
                : uri.IdnHost;
            var port = uri.IsDefaultPort ? string.Empty : $":{uri.Port}";

            return $"{uri.Scheme}://{host}{port}";
        }

        private static IReadOnlyList<string> GetConfiguredOrigins(IConfiguration configuration)
        {
            var configuredOrigins = EnvironmentConfiguration.GetDelimitedList(
                configuration,
                "CORS_ALLOWED_ORIGINS",
                "Cors:AllowedOrigins");
            if (configuredOrigins.Count > 0)
            {
                return configuredOrigins;
            }

            var frontendOrigins = EnvironmentConfiguration
                .GetFirst(configuration, new[] { "PROLUX_FRONTEND_ORIGINS", "PROLUX_FRONTEND_ORIGIN" });
            if (!string.IsNullOrWhiteSpace(frontendOrigins))
            {
                return frontendOrigins
                    .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToArray();
            }

            var frontendOriginFromParts = BuildOriginFromParts(configuration);
            return string.IsNullOrWhiteSpace(frontendOriginFromParts)
                ? Array.Empty<string>()
                : new[] { frontendOriginFromParts };
        }

        private static string BuildOriginFromParts(IConfiguration configuration)
        {
            var scheme = EnvironmentConfiguration.Get(configuration, "PROLUX_FRONTEND_SCHEME");
            var host = EnvironmentConfiguration.Get(configuration, "PROLUX_FRONTEND_HOST");
            var port = EnvironmentConfiguration.GetFirst(configuration, new[] { "PROLUX_FRONTEND_PORT", "PORT" });

            if (string.IsNullOrWhiteSpace(scheme) || string.IsNullOrWhiteSpace(host))
            {
                return string.Empty;
            }

            var normalizedScheme = scheme.TrimEnd(':', '/', '\\');
            var normalizedHost = host.Trim();
            var normalizedPort = port.Trim().TrimStart(':');
            var portSuffix = string.IsNullOrWhiteSpace(normalizedPort) ? string.Empty : $":{normalizedPort}";

            return $"{normalizedScheme}://{normalizedHost}{portSuffix}";
        }
    }
}
