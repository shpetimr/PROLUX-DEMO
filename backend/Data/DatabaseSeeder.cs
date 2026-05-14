namespace backend.Data
{
    public static class DatabaseSeeder
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            // Do not run startup maintenance while an explicit data clear is requested.
            var commandLineArgs = Environment.GetCommandLineArgs();
            bool shouldClearDatabase =
                commandLineArgs.Contains("--clear-database") ||
                commandLineArgs.Contains("--reset-production-data");
            
            if (shouldClearDatabase)
            {
                Console.WriteLine("Skipping startup data maintenance due to database clearing.");
                return;
            }

            // Update existing employees with DailyRate if not set
            var employeesWithoutDailyRate = context.Employees.Where(e => e.DailyRate == 0).ToList();
            foreach (var employee in employeesWithoutDailyRate)
            {
                employee.DailyRate = 1800; // Set default daily rate
            }
            if (employeesWithoutDailyRate.Any())
            {
                await context.SaveChangesAsync();
                Console.WriteLine($"Updated {employeesWithoutDailyRate.Count} employees with default daily rate");
            }
            
            // Mos seed asgjë tjetër!
        }

        public static async Task ClearAllDataAsync(ApplicationDbContext context)
        {
            await Task.CompletedTask;
            throw new NotSupportedException(
                "Use the guarded --reset-production-data maintenance command instead of DatabaseSeeder.ClearAllDataAsync().");
        }
    }
} 
