using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Security
{
    public sealed record AdminProvisioningResult(int UserId, string Username, bool Created);
    public sealed record AdminPasswordResetResult(int UserId, string Username, bool Reactivated);

    public sealed record UserReferenceSummary(
        int Employees,
        int Expenses,
        int Purchases,
        int Incomes,
        int Rents,
        int Debts,
        int Projects,
        int InvoiceArchives)
    {
        public int Total => Employees + Expenses + Purchases + Incomes + Rents + Debts + Projects + InvoiceArchives;
    }

    public sealed record AuthUserAuditSummary(
        int Id,
        string Username,
        string FullName,
        UserRole Role,
        DateTime CreatedAt,
        DateTime? LastLoginAt,
        bool UsesLegacyPasswordHash,
        bool IsSampleCandidate,
        IReadOnlyList<string> Flags,
        UserReferenceSummary References);

    public sealed record AuthAuditReport(
        IReadOnlyList<AuthUserAuditSummary> Users,
        IReadOnlyList<AuthUserAuditSummary> SampleCandidates)
    {
        public int AdminCount => Users.Count(static user => user.Role == UserRole.Admin);
    }

    public sealed record SampleUserCleanupResult(
        int DeletedCount,
        int RotatedCount,
        IReadOnlyList<string> Actions);

    public sealed class AuthMaintenanceService
    {
        private static readonly string[] SampleTokens =
        {
            "test",
            "demo",
            "sample",
            "default",
            "changeme",
            "example",
            "guest",
            "temp",
            "tmp",
            "dev"
        };

        private readonly ApplicationDbContext _context;

        public AuthMaintenanceService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<AuthAuditReport> AuditUsersAsync(string? preservedUsername = null)
        {
            var users = await _context.Users
                .AsNoTracking()
                .OrderBy(user => user.Id)
                .ToListAsync();

            var auditedUsers = new List<AuthUserAuditSummary>(users.Count);
            var sampleCandidates = new List<AuthUserAuditSummary>();

            foreach (var user in users)
            {
                var references = await GetReferencesAsync(user.Id);
                var flags = BuildFlags(user);
                var isSampleCandidate =
                    !string.Equals(user.Username, preservedUsername, StringComparison.OrdinalIgnoreCase) &&
                    flags.Any(static flag => flag.StartsWith("sample:", StringComparison.Ordinal));

                var summary = new AuthUserAuditSummary(
                    user.Id,
                    user.Username,
                    user.FullName,
                    user.Role,
                    user.CreatedAt,
                    user.LastLoginAt,
                    PasswordSecurity.NeedsRehash(user.PasswordHash),
                    isSampleCandidate,
                    flags,
                    references);

                auditedUsers.Add(summary);

                if (isSampleCandidate)
                {
                    sampleCandidates.Add(summary);
                }
            }

            return new AuthAuditReport(auditedUsers, sampleCandidates);
        }

        public async Task<AdminProvisioningResult> ProvisionAdminAsync(string username, string fullName, string password)
        {
            var normalizedUsername = NormalizeUsername(username);
            var normalizedFullName = fullName.Trim();

            if (string.IsNullOrWhiteSpace(normalizedUsername))
            {
                throw new InvalidOperationException("Admin username is required.");
            }

            if (string.IsNullOrWhiteSpace(normalizedFullName))
            {
                throw new InvalidOperationException("Admin full name is required.");
            }

            PasswordSecurity.EnsureStrongPassword(password, normalizedUsername, normalizedFullName);

            var existingUser = await FindUserByUsernameAsync(normalizedUsername);
            var created = existingUser is null;

            if (existingUser is null)
            {
                existingUser = new User
                {
                    Username = normalizedUsername,
                    FullName = normalizedFullName,
                    PasswordHash = PasswordSecurity.HashPassword(password),
                    Role = UserRole.Admin,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(existingUser);
            }
            else
            {
                existingUser.Username = normalizedUsername;
                existingUser.FullName = normalizedFullName;
                existingUser.PasswordHash = PasswordSecurity.HashPassword(password);
                existingUser.Role = UserRole.Admin;
            }

            await _context.SaveChangesAsync();

            return new AdminProvisioningResult(existingUser.Id, existingUser.Username, created);
        }

        public async Task<AdminPasswordResetResult> ResetAdminPasswordAsync(string username, string password)
        {
            var normalizedUsername = NormalizeUsername(username);

            if (string.IsNullOrWhiteSpace(normalizedUsername))
            {
                throw new InvalidOperationException("Admin username is required.");
            }

            var existingUser = await FindUserByUsernameAsync(normalizedUsername);
            if (existingUser is null)
            {
                throw new InvalidOperationException("No existing administrator account was found for the configured ADMIN_USERNAME. Update ADMIN_USERNAME to the current admin username or use --provision-admin for first-time setup.");
            }

            if (existingUser.Role != UserRole.Admin)
            {
                throw new InvalidOperationException("The configured ADMIN_USERNAME belongs to a non-admin account. Password reset will not promote users or create duplicate admins.");
            }

            PasswordSecurity.EnsureStrongPassword(password, existingUser.Username, existingUser.FullName);

            var reactivated = !existingUser.IsActive;
            existingUser.PasswordHash = PasswordSecurity.HashPassword(password);
            existingUser.IsActive = true;
            existingUser.DeactivatedAt = null;

            await _context.SaveChangesAsync();

            return new AdminPasswordResetResult(existingUser.Id, existingUser.Username, reactivated);
        }

        public async Task<SampleUserCleanupResult> SanitizeSampleUsersAsync(string? preservedUsername = null)
        {
            var audit = await AuditUsersAsync(preservedUsername);
            var candidates = audit.SampleCandidates;

            if (candidates.Count == 0)
            {
                return new SampleUserCleanupResult(0, 0, Array.Empty<string>());
            }

            var deletedCount = 0;
            var rotatedCount = 0;
            var actions = new List<string>();

            foreach (var candidate in candidates)
            {
                var user = await _context.Users.FirstAsync(entity => entity.Id == candidate.Id);

                if (candidate.References.Total == 0)
                {
                    _context.Users.Remove(user);
                    deletedCount++;
                    actions.Add($"Deleted sample/test user '{candidate.Username}' (id {candidate.Id}) because it had no dependent records.");
                    continue;
                }

                var retiredUsername = await GenerateRetiredUsernameAsync(candidate.Id);
                user.Username = retiredUsername;
                user.PasswordHash = PasswordSecurity.HashPassword($"A9-{PasswordSecurity.GenerateRandomSecret(32)}");
                user.Role = UserRole.User;
                rotatedCount++;
                actions.Add($"Rotated sample/test user '{candidate.Username}' to '{retiredUsername}' and removed admin privileges because it still owns {candidate.References.Total} related records.");
            }

            await _context.SaveChangesAsync();

            return new SampleUserCleanupResult(deletedCount, rotatedCount, actions);
        }

        public static void EnsureAdminAccountExists(AuthAuditReport auditReport)
        {
            if (auditReport.AdminCount == 0)
            {
                throw new InvalidOperationException("No administrator account exists in the database. Run 'dotnet run -- --provision-admin' before starting the backend.");
            }
        }

        private async Task<User?> FindUserByUsernameAsync(string username)
        {
            var normalizedUsername = username.Trim().ToUpperInvariant();

            return await _context.Users
                .FirstOrDefaultAsync(user => user.Username.ToUpper() == normalizedUsername);
        }

        private async Task<UserReferenceSummary> GetReferencesAsync(int userId)
        {
            var employees = await _context.Employees.CountAsync(entity => entity.CreatedById == userId);
            var expenses = await _context.Expenses.CountAsync(entity => entity.CreatedById == userId);
            var purchases = await _context.Purchases.CountAsync(entity => entity.CreatedById == userId);
            var incomes = await _context.Incomes.CountAsync(entity => entity.CreatedById == userId);
            var rents = await _context.Rents.CountAsync(entity => entity.CreatedById == userId);
            var debts = await _context.Debts.CountAsync(entity => entity.CreatedById == userId);
            var projects = await _context.Projects.CountAsync(entity => entity.CreatedById == userId);
            var invoiceArchives = await _context.InvoiceArchives.CountAsync(entity => entity.CreatedById == userId);

            return new UserReferenceSummary(employees, expenses, purchases, incomes, rents, debts, projects, invoiceArchives);
        }

        private static string NormalizeUsername(string username)
        {
            return username.Trim();
        }

        private static List<string> BuildFlags(User user)
        {
            var flags = new List<string>();
            var username = user.Username.Trim();
            var fullName = user.FullName.Trim();

            if (LooksLikeSampleValue(username) || LooksLikeSampleValue(fullName))
            {
                flags.Add("sample:name-pattern");
            }

            if (IsGenericPlaceholderAccount(user.Role, username, fullName))
            {
                flags.Add("sample:generic-placeholder-account");
            }

            if (PasswordSecurity.NeedsRehash(user.PasswordHash))
            {
                flags.Add("security:legacy-password-hash");
            }

            return flags;
        }

        private static bool LooksLikeSampleValue(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            var normalized = value.Trim().ToLowerInvariant();
            if (SampleTokens.Contains(normalized))
            {
                return true;
            }

            var segments = normalized
                .Split(new[] { ' ', '-', '_', '.', '@' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            return segments.Any(segment => SampleTokens.Contains(segment));
        }

        private static bool IsGenericPlaceholderAccount(UserRole role, string username, string fullName)
        {
            var normalizedUsername = username.Trim().ToLowerInvariant();
            var normalizedFullName = fullName.Trim().ToLowerInvariant();

            if (normalizedUsername is "user" or "defaultuser" or "default-user")
            {
                return true;
            }

            if (normalizedFullName is "user" or "default user" or "test user")
            {
                return true;
            }

            return role == UserRole.Admin &&
                   (normalizedUsername is "admin" or "administrator" ||
                    normalizedFullName is "admin" or "administrator" or "admin user" or "system administrator");
        }

        private async Task<string> GenerateRetiredUsernameAsync(int userId)
        {
            var baseUsername = $"retired-legacy-{userId}";
            var username = baseUsername;
            var suffix = 1;

            while (await _context.Users.AnyAsync(user => user.Username == username))
            {
                username = $"{baseUsername}-{suffix}";
                suffix++;
            }

            return username;
        }
    }
}
