namespace backend.Configuration
{
    public static class EnvFileLoader
    {
        public static void LoadIntoEnvironment(params string[] candidateDirectories)
        {
            var seenFiles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var directory in candidateDirectories.Where(static value => !string.IsNullOrWhiteSpace(value)))
            {
                var envPath = Path.Combine(directory, ".env");
                if (!File.Exists(envPath))
                {
                    continue;
                }

                var fullPath = Path.GetFullPath(envPath);
                if (!seenFiles.Add(fullPath))
                {
                    continue;
                }

                foreach (var rawLine in File.ReadAllLines(fullPath))
                {
                    var line = rawLine.Trim();
                    if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#'))
                    {
                        continue;
                    }

                    if (line.StartsWith("export ", StringComparison.OrdinalIgnoreCase))
                    {
                        line = line["export ".Length..].Trim();
                    }

                    var separatorIndex = line.IndexOf('=');
                    if (separatorIndex <= 0)
                    {
                        continue;
                    }

                    var key = line[..separatorIndex].Trim();
                    var value = line[(separatorIndex + 1)..].Trim();
                    if (string.IsNullOrWhiteSpace(key))
                    {
                        continue;
                    }

                    value = EnvironmentConfiguration.ExpandEnvironmentReferences(UnwrapValue(value));

                    if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                    {
                        Environment.SetEnvironmentVariable(key, value);
                    }
                }

                Console.WriteLine($"[Configuration] Loaded environment variables from {fullPath}");
            }
        }

        private static string UnwrapValue(string value)
        {
            if (value.Length >= 2)
            {
                if ((value.StartsWith('"') && value.EndsWith('"')) || (value.StartsWith('\'') && value.EndsWith('\'')))
                {
                    value = value[1..^1];
                }
            }

            return value
                .Replace("\\n", "\n", StringComparison.Ordinal)
                .Replace("\\r", "\r", StringComparison.Ordinal)
                .Replace("\\t", "\t", StringComparison.Ordinal);
        }
    }
}
