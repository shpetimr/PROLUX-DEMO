using System.Text.RegularExpressions;

namespace backend.Configuration
{
    internal static class EnvironmentConfiguration
    {
        private static readonly Regex EnvironmentReferencePattern = new(
            @"\$\{(?<name>[A-Za-z_][A-Za-z0-9_]*)\}|\$(?<name>[A-Za-z_][A-Za-z0-9_]*)",
            RegexOptions.Compiled);

        public static string Get(
            IConfiguration configuration,
            string environmentVariableName,
            string? legacyConfigurationKey = null,
            string fallback = "")
        {
            return GetFirst(
                configuration,
                new[] { environmentVariableName },
                legacyConfigurationKey,
                fallback);
        }

        public static string GetFirst(
            IConfiguration configuration,
            IEnumerable<string> environmentVariableNames,
            string? legacyConfigurationKey = null,
            string fallback = "")
        {
            foreach (var environmentVariableName in environmentVariableNames)
            {
                var environmentValue = Environment.GetEnvironmentVariable(environmentVariableName);
                if (!string.IsNullOrWhiteSpace(environmentValue))
                {
                    return ExpandEnvironmentReferences(environmentValue).Trim();
                }

                var configurationValue = configuration[environmentVariableName];
                if (!string.IsNullOrWhiteSpace(configurationValue))
                {
                    return ExpandEnvironmentReferences(configurationValue).Trim();
                }
            }

            if (!string.IsNullOrWhiteSpace(legacyConfigurationKey))
            {
                var legacyValue = configuration[legacyConfigurationKey];
                if (!string.IsNullOrWhiteSpace(legacyValue))
                {
                    return ExpandEnvironmentReferences(legacyValue).Trim();
                }
            }

            return ExpandEnvironmentReferences(fallback).Trim();
        }

        public static IReadOnlyList<string> GetDelimitedList(
            IConfiguration configuration,
            string environmentVariableName,
            string? legacyConfigurationKey = null)
        {
            var rawValue = Get(configuration, environmentVariableName, legacyConfigurationKey);
            if (string.IsNullOrWhiteSpace(rawValue))
            {
                return Array.Empty<string>();
            }

            return rawValue
                .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(static value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }

        public static string ExpandEnvironmentReferences(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return value;
            }

            return EnvironmentReferencePattern.Replace(value, match =>
            {
                var name = match.Groups["name"].Value;
                var replacement = Environment.GetEnvironmentVariable(name);
                return string.IsNullOrEmpty(replacement) ? match.Value : replacement;
            });
        }
    }
}
