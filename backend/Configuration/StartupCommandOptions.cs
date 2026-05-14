namespace backend.Configuration
{
    public sealed class StartupCommandOptions
    {
        public bool ShouldResetProductionData { get; init; }
        public bool ShouldConfirmProductionReset { get; init; }
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
            || ShouldResetProductionData
            || ShouldMigrateSqliteToPostgres;
        public bool WillMutateAuthData =>
            ShouldProvisionAdmin
            || ShouldResetAdminPassword
            || ShouldSanitizeSampleUsers;
        public bool WillMutateProductionData => ShouldResetProductionData && ShouldConfirmProductionReset;

        public static StartupCommandOptions Parse(string[] args)
        {
            bool HasArg(string value) => args.Contains(value, StringComparer.OrdinalIgnoreCase);

            return new StartupCommandOptions
            {
                ShouldResetProductionData = HasArg("--reset-production-data") || HasArg("--clear-database"),
                ShouldConfirmProductionReset = HasArg("--confirm-production-reset"),
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
