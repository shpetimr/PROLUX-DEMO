namespace backend.Configuration
{
    public sealed class JwtSettings
    {
        public string Key { get; init; } = string.Empty;
        public string Issuer { get; init; } = string.Empty;
        public string Audience { get; init; } = string.Empty;
    }

    public static class JwtSettingsLoader
    {
        private static readonly string[] DisallowedKeys =
        {
            string.Empty,
            "your-secret-key-here",
            "your-super-secret-jwt-key-here-change-this-in-production"
        };

        public static JwtSettings GetRequiredJwtSettings(IConfiguration configuration)
        {
            var key = EnvironmentConfiguration.Get(configuration, "JWT_KEY", "Jwt:Key");
            var issuer = EnvironmentConfiguration.Get(configuration, "JWT_ISSUER", "Jwt:Issuer");
            var audience = EnvironmentConfiguration.Get(configuration, "JWT_AUDIENCE", "Jwt:Audience");

            if (DisallowedKeys.Contains(key, StringComparer.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "JWT signing key is not configured. Set JWT_KEY to a strong secret before starting the application.");
            }

            if (key.Any(char.IsWhiteSpace))
            {
                throw new InvalidOperationException("JWT signing key must not contain whitespace.");
            }

            if (key.Length < 43)
            {
                throw new InvalidOperationException(
                    "JWT signing key is too weak. Use at least 32 random bytes encoded as a 43+ character Base64Url or 64-character hex string.");
            }

            if (key.Distinct().Count() < 16)
            {
                throw new InvalidOperationException(
                    "JWT signing key is too weak. Generate a long random secret and store it in the environment instead of using a predictable phrase.");
            }

            if (string.IsNullOrWhiteSpace(issuer))
            {
                throw new InvalidOperationException("JWT_ISSUER must be configured.");
            }

            if (string.IsNullOrWhiteSpace(audience))
            {
                throw new InvalidOperationException("JWT_AUDIENCE must be configured.");
            }

            return new JwtSettings
            {
                Key = key,
                Issuer = issuer,
                Audience = audience
            };
        }
    }
}
