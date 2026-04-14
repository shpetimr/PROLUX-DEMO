using backend.Models;
using backend.Services;
using System.Security.Cryptography;
using System.Text;
using System.Collections.Generic;

namespace backend.Data
{
    public static class DatabaseSeeder
    {
        public static async Task SeedAsync(ApplicationDbContext context, IAuthService authService)
        {
            // Check if we're clearing the database (skip seeding sample data)
            var commandLineArgs = Environment.GetCommandLineArgs();
            bool shouldClearDatabase = commandLineArgs.Contains("--clear-database");
            
            if (shouldClearDatabase)
            {
                Console.WriteLine("Skipping sample data seeding due to database clearing.");
                return;
            }
            
            // Seed admin user if no users exist
            if (!context.Users.Any())
            {
                var adminUser = new User
                {
                    Username = "admin",
                    PasswordHash = HashPassword("admin123"),
                    FullName = "Administrator",
                    Role = UserRole.Admin,
                    CreatedAt = DateTime.UtcNow
                };

                context.Users.Add(adminUser);
                await context.SaveChangesAsync();
            }

            // Always ensure a default regular user exists
            if (!context.Users.Any(u => u.Username == "user"))
            {
                var regularUser = new User
                {
                    Username = "user",
                    PasswordHash = HashPassword("user123"),
                    FullName = "Regular User",
                    Role = UserRole.User,
                    CreatedAt = DateTime.UtcNow
                };
                context.Users.Add(regularUser);
                await context.SaveChangesAsync();
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
            Console.WriteLine("Admin user (admin/admin123) and regular user (user/user123) are preserved.");
        }

        private static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes);
        }
    }
} 