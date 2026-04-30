using backend.Configuration;
using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    public static class ApplicationDatabase
    {
        public static DatabaseOptions AddApplicationDatabase(
            this IServiceCollection services,
            IConfiguration configuration,
            string contentRootPath)
        {
            var databaseOptions = DatabaseSettings.Load(configuration, contentRootPath);
            services.AddSingleton(databaseOptions);
            services.AddDbContext<ApplicationDbContext>(options =>
                ConfigureDbContextOptions(options, databaseOptions));

            return databaseOptions;
        }

        public static void ConfigureDbContextOptions(
            DbContextOptionsBuilder options,
            DatabaseOptions databaseOptions)
        {
            switch (databaseOptions.Provider)
            {
                case DatabaseProvider.PostgreSql:
                    options.UseNpgsql(
                        databaseOptions.ConnectionString,
                        postgresOptions =>
                        {
                            postgresOptions.CommandTimeout(30);
                            postgresOptions.EnableRetryOnFailure(
                                maxRetryCount: 5,
                                maxRetryDelay: TimeSpan.FromSeconds(10),
                                errorCodesToAdd: null);
                        });
                    break;

                case DatabaseProvider.Sqlite:
                default:
                    options.UseSqlite(databaseOptions.ConnectionString);
                    break;
            }
        }
    }
}
