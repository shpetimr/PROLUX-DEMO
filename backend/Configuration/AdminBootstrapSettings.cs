namespace backend.Configuration
{
    public sealed class AdminBootstrapSettings
    {
        public string Username { get; init; } = string.Empty;
        public string FullName { get; init; } = string.Empty;
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
    }
}
