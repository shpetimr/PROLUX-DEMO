using backend.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace backend.Data
{
    public sealed class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
    {
        public ApplicationDbContext CreateDbContext(string[] args)
        {
            var currentDirectory = Directory.GetCurrentDirectory();
            var contentRoot = ResolveContentRoot(currentDirectory);

            EnvFileLoader.LoadIntoEnvironment(
                contentRoot,
                currentDirectory,
                AppContext.BaseDirectory);

            var configuration = new ConfigurationBuilder()
                .SetBasePath(currentDirectory)
                .AddJsonFile("appsettings.json", optional: true)
                .AddJsonFile(Path.Combine("backend", "appsettings.json"), optional: true)
                .AddEnvironmentVariables()
                .Build();

            var databaseOptions = DatabaseSettings.Load(configuration, contentRoot);
            var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
            ApplicationDatabase.ConfigureDbContextOptions(optionsBuilder, databaseOptions);

            return new ApplicationDbContext(optionsBuilder.Options);
        }

        private static string ResolveContentRoot(string currentDirectory)
        {
            if (File.Exists(Path.Combine(currentDirectory, "backend.csproj")))
            {
                return currentDirectory;
            }

            var backendDirectory = Path.Combine(currentDirectory, "backend");
            return Directory.Exists(backendDirectory)
                ? backendDirectory
                : currentDirectory;
        }
    }
}
