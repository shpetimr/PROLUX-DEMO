namespace backend.Configuration
{
    public static class ServerSettings
    {
        public static string GetConfiguredUrls(IConfiguration configuration)
        {
            var explicitUrls = EnvironmentConfiguration.GetFirst(
                configuration,
                new[] { "ASPNETCORE_URLS", "PROLUX_BACKEND_URLS" });
            if (!string.IsNullOrWhiteSpace(explicitUrls))
            {
                return explicitUrls;
            }

            var configuredOrigin = BuildOriginFromParts(configuration, "PROLUX_BACKEND");
            if (!string.IsNullOrWhiteSpace(configuredOrigin))
            {
                return configuredOrigin;
            }

            return BuildOriginFromPort(configuration);
        }

        public static bool ShouldUseHttpsRedirection(IConfiguration configuration)
        {
            var httpsPort = EnvironmentConfiguration.Get(configuration, "ASPNETCORE_HTTPS_PORT");
            if (!string.IsNullOrWhiteSpace(httpsPort))
            {
                return true;
            }

            var urls = GetConfiguredUrls(configuration);
            return urls.Contains("https://", StringComparison.OrdinalIgnoreCase);
        }

        public static string DescribeUrls(IConfiguration configuration)
        {
            var urls = GetConfiguredUrls(configuration);
            return string.IsNullOrWhiteSpace(urls)
                ? "(Kestrel defaults)"
                : urls;
        }

        private static string BuildOriginFromParts(IConfiguration configuration, string prefix)
        {
            var scheme = EnvironmentConfiguration.Get(configuration, $"{prefix}_SCHEME");
            var host = EnvironmentConfiguration.Get(configuration, $"{prefix}_HOST");
            var port = EnvironmentConfiguration.Get(configuration, $"{prefix}_PORT");

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

        private static string BuildOriginFromPort(IConfiguration configuration)
        {
            var port = EnvironmentConfiguration.Get(configuration, "PORT");
            if (string.IsNullOrWhiteSpace(port))
            {
                return string.Empty;
            }

            var normalizedPort = port.Trim().TrimStart(':');
            return string.IsNullOrWhiteSpace(normalizedPort)
                ? string.Empty
                : $"http://0.0.0.0:{normalizedPort}";
        }
    }
}
