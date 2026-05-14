namespace backend.Configuration
{
    public sealed class StartupCommandOptions
    {
        public bool ShouldClearDatabase { get; init; }
        public bool ShouldSkipSeeding { get; init; }
        public bool ShouldAuditUsers { get; init; }
        public bool ShouldProvisionAdmin { get; init; }
        public bool ShouldResetAdminPassword { get; init; }
        public bool ShouldSanitizeSampleUsers { get; init; }
        public bool ShouldMigrateSqliteToPostgres { get; init; }
        public bool ShouldDryRunMigration { get; init; }
        public bool ShouldAllowMigrationMerge { get; init; }

        public bool IsMaintenanceMode =>
            ShouldAuditUsers
            || ShouldProvisionAdmin
            || ShouldResetAdminPassword
            || ShouldSanitizeSampleUsers
            || ShouldMigrateSqliteToPostgres;
        public bool WillMutateAuthData => ShouldProvisionAdmin || ShouldResetAdminPassword || ShouldSanitizeSampleUsers;

        public static StartupCommandOptions Parse(string[] args)
        {
            bool HasArg(string value) => args.Contains(value, StringComparer.OrdinalIgnoreCase);

            return new StartupCommandOptions
            {
                ShouldClearDatabase = HasArg("--clear-database"),
                ShouldSkipSeeding = HasArg("--skip-seeding"),
                ShouldAuditUsers = HasArg("--audit-users"),
                ShouldProvisionAdmin = HasArg("--provision-admin"),
                ShouldResetAdminPassword = HasArg("--reset-admin-password"),
                ShouldSanitizeSampleUsers = HasArg("--sanitize-sample-users"),
                ShouldMigrateSqliteToPostgres = HasArg("--migrate-sqlite-to-postgres"),
                ShouldDryRunMigration = HasArg("--migration-dry-run"),
                ShouldAllowMigrationMerge = HasArg("--migration-allow-merge")
            };
        }
    }
}
