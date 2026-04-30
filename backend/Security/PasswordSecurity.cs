using System.Security.Cryptography;
using System.Text;

namespace backend.Security
{
    public static class PasswordSecurity
    {
        private const string Pbkdf2Prefix = "PBKDF2";
        private const int Iterations = 210000;
        private const int SaltSize = 16;
        private const int KeySize = 32;
        private const int MinimumPasswordLength = 12;

        public static string HashPassword(string password)
        {
            if (string.IsNullOrWhiteSpace(password))
            {
                throw new ArgumentException("Password is required.", nameof(password));
            }

            var salt = RandomNumberGenerator.GetBytes(SaltSize);
            var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, KeySize);

            return $"{Pbkdf2Prefix}${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(key)}";
        }

        public static bool VerifyPassword(string password, string storedHash)
        {
            if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(storedHash))
            {
                return false;
            }

            if (IsModernHash(storedHash))
            {
                return VerifyPbkdf2(password, storedHash);
            }

            return VerifyLegacySha256(password, storedHash);
        }

        public static bool NeedsRehash(string? storedHash)
        {
            return !IsModernHash(storedHash);
        }

        public static void EnsureStrongPassword(string password, string? username = null, string? fullName = null)
        {
            if (string.IsNullOrWhiteSpace(password))
            {
                throw new InvalidOperationException("Password is required.");
            }

            if (password.Length < MinimumPasswordLength)
            {
                throw new InvalidOperationException($"Password must be at least {MinimumPasswordLength} characters long.");
            }

            int characterGroups = 0;
            if (password.Any(char.IsUpper))
            {
                characterGroups++;
            }

            if (password.Any(char.IsLower))
            {
                characterGroups++;
            }

            if (password.Any(char.IsDigit))
            {
                characterGroups++;
            }

            if (password.Any(static character => !char.IsLetterOrDigit(character)))
            {
                characterGroups++;
            }

            if (characterGroups < 3)
            {
                throw new InvalidOperationException("Password must include at least three of these groups: uppercase letters, lowercase letters, numbers, and symbols.");
            }

            if (!string.IsNullOrWhiteSpace(username) &&
                password.Contains(username.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Password must not contain the username.");
            }

            if (!string.IsNullOrWhiteSpace(fullName))
            {
                foreach (var token in fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                {
                    if (token.Length >= 3 && password.Contains(token, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException("Password must not contain the user's name.");
                    }
                }
            }
        }

        public static string GenerateRandomSecret(int byteLength = 32)
        {
            var bytes = RandomNumberGenerator.GetBytes(byteLength);
            return Convert.ToBase64String(bytes)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
        }

        private static bool IsModernHash(string? storedHash)
        {
            return storedHash?.StartsWith($"{Pbkdf2Prefix}$", StringComparison.Ordinal) == true;
        }

        private static bool VerifyPbkdf2(string password, string storedHash)
        {
            var parts = storedHash.Split('$');
            if (parts.Length != 4 || !int.TryParse(parts[1], out var iterations))
            {
                return false;
            }

            try
            {
                var salt = Convert.FromBase64String(parts[2]);
                var expectedKey = Convert.FromBase64String(parts[3]);
                var actualKey = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expectedKey.Length);

                return CryptographicOperations.FixedTimeEquals(actualKey, expectedKey);
            }
            catch (FormatException)
            {
                return false;
            }
        }

        private static bool VerifyLegacySha256(string password, string storedHash)
        {
            try
            {
                using var sha256 = SHA256.Create();
                var actualHash = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                var expectedHash = Convert.FromBase64String(storedHash);

                return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
            }
            catch (FormatException)
            {
                return false;
            }
        }
    }
}
