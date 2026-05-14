namespace backend.Configuration
{
    public sealed class AdminBootstrapSettings
    {
        public string Username { get; init; } = string.Empty;
        public string FullName { get; init; } = string.Empty;
        public string Password { get; init; } = string.Empty;
    }

    public sealed class AdminPasswordResetSettings
    {
        public string Username { get; init; } = string.Empty;
        public string Password { get; init; } = string.Empty;
    }

    public static class AdminBootstrapSettingsLoader
    {
        public static AdminBootstrapSettings GetRequired(IConfiguration configuration)
        {
            var username = EnvironmentConfiguration.Get(configuration, "ADMIN_USERNAME", "AdminBootstrap:Username");
            var fullName = EnvironmentConfiguration.Get(configuration, "ADMIN_FULL_NAME", "AdminBootstrap:FullName");
            var password = EnvironmentConfiguration.Get(configuration, "ADMIN_PASSWORD", "AdminBootstrap:Password");

            if (string.IsNullOrWhiteSpace(username))
            {
                throw new InvalidOperationException("Admin bootstrap username is not configured. Set ADMIN_USERNAME in your .env file before provisioning the admin account.");
            }

            if (string.IsNullOrWhiteSpace(fullName))
            {
                throw new InvalidOperationException("Admin bootstrap full name is not configured. Set ADMIN_FULL_NAME in your .env file before provisioning the admin account.");
            }

            if (string.IsNullOrWhiteSpace(password))
            {
                throw new InvalidOperationException("Admin bootstrap password is not configured. Set ADMIN_PASSWORD in your .env file before provisioning the admin account.");
            }

            return new AdminBootstrapSettings
            {
                Username = username.Trim(),
                FullName = fullName.Trim(),
                Password = password
            };
        }

        public static AdminPasswordResetSettings GetRequiredPasswordReset(IConfiguration configuration)
        {
            var username = EnvironmentConfiguration.Get(configuration, "ADMIN_USERNAME", "AdminBootstrap:Username");
            var password = EnvironmentConfiguration.Get(configuration, "ADMIN_PASSWORD", "AdminBootstrap:Password");

            if (string.IsNullOrWhiteSpace(username))
            {
                throw new InvalidOperationException("Admin username is not configured. Set ADMIN_USERNAME to the existing administrator username before resetting the password.");
            }

            if (string.IsNullOrWhiteSpace(password))
            {
                throw new InvalidOperationException("Admin password is not configured. Set ADMIN_PASSWORD to the new administrator password before resetting the password.");
            }

            return new AdminPasswordResetSettings
            {
                Username = username.Trim(),
                Password = password
            };
        }
    }
}
