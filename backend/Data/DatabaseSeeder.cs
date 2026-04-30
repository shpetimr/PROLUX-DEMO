namespace backend.Data
{
    public static class DatabaseSeeder
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            // Do not run startup maintenance while an explicit data clear is requested.
            var commandLineArgs = Environment.GetCommandLineArgs();
            bool shouldClearDatabase = commandLineArgs.Contains("--clear-database");
            
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
            Console.WriteLine("Starting database cleanup...");
            
            // Clear all data except users
            context.SalaryRecords.RemoveRange(context.SalaryRecords);
            context.Expenses.RemoveRange(context.Expenses);
            context.Purchases.RemoveRange(context.Purchases);
            context.Rents.RemoveRange(context.Rents);
            context.Incomes.RemoveRange(context.Incomes);
            context.Projects.RemoveRange(context.Projects);
            context.Debts.RemoveRange(context.Debts);
            context.Employees.RemoveRange(context.Employees);
            
            await context.SaveChangesAsync();
            
            Console.WriteLine("All data cleared successfully!");
            Console.WriteLine("User accounts were preserved during cleanup.");
        }
    }
} 
