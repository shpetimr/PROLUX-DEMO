using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using backend.Authorization;
using System.Text.Json.Serialization;
using backend.Configuration;
using backend.Data;
using backend.Services;
using backend.Security;

EnvFileLoader.LoadIntoEnvironment(
    Path.Combine(Directory.GetCurrentDirectory(), "backend"),
    Directory.GetCurrentDirectory(),
    Path.Combine(AppContext.BaseDirectory, "backend"),
    AppContext.BaseDirectory);

var commandOptions = StartupCommandOptions.Parse(args);
var builder = WebApplication.CreateBuilder(args);
var configuredServerUrls = ServerSettings.GetConfiguredUrls(builder.Configuration);
if (!string.IsNullOrWhiteSpace(configuredServerUrls))
{
    builder.WebHost.UseUrls(configuredServerUrls.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
}

var corsSettings = CorsSettings.Load(builder.Configuration);
JwtSettings? jwtSettings = null;
if (!commandOptions.IsMaintenanceMode)
{
    jwtSettings = JwtSettingsLoader.GetRequiredJwtSettings(builder.Configuration);
}

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

var databaseOptions = builder.Services.AddApplicationDatabase(
    builder.Configuration,
    builder.Environment.ContentRootPath);
Console.WriteLine($"[Database] Provider: {databaseOptions.ProviderName}");
Console.WriteLine($"[Database] Connection: {databaseOptions.SafeConnectionString}");

// Configure JWT Authentication
if (jwtSettings is not null)
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidateAudience = true,
                ValidAudience = jwtSettings.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtSettings.Key))
            };
        });
}

builder.Services.AddAuthorization(options =>
    {
        options.FallbackPolicy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .Build();

        foreach (var permission in AppPermissions.All)
        {
            options.AddPolicy(permission, policy =>
            {
                policy.RequireAuthenticatedUser();
                policy.AddRequirements(new PermissionRequirement(permission));
            });
        }
    });

// Register services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<AuthMaintenanceService>();
builder.Services.AddScoped<SqliteToPostgresMigrator>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<ISalaryService, SalaryService>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<InvoiceTemplatePdfService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsSettings.PolicyName, corsSettings.ApplyTo);
});
Console.WriteLine($"[Configuration] CORS allowed origins: {corsSettings.Describe()}");

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();
var isProductionEnvironment = app.Environment.IsProduction();

if (commandOptions.ShouldMigrateSqliteToPostgres)
{
    try
    {
        using var scope = app.Services.CreateScope();
        var migrator = scope.ServiceProvider.GetRequiredService<SqliteToPostgresMigrator>();
        await migrator.RunAsync(
            app.Configuration,
            builder.Environment.ContentRootPath,
            new SqliteToPostgresMigrationOptions
            {
                DryRun = commandOptions.ShouldDryRunMigration,
                AllowMerge = commandOptions.ShouldAllowMigrationMerge
            });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Migration] Failed: {ex.Message}");
        Environment.Exit(1);
    }

    return;
}

// Database setup and seeding
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var authMaintenance = scope.ServiceProvider.GetRequiredService<AuthMaintenanceService>();
    
    try
    {
        if (isProductionEnvironment)
        {
            Console.WriteLine("[Database] Production startup: skipping EnsureCreatedAsync().");
        }
        else
        {
            // Keep local/non-production startup behavior that can create the schema when needed.
            await context.Database.EnsureCreatedAsync();
        }

        await StockSchemaBootstrapper.EnsureAsync(context);
        await UserEmployeeLinkSchemaBootstrapper.EnsureAsync(context);
        await WorkerTaskSchemaBootstrapper.EnsureAsync(context);
        await InvoiceArchiveSchemaBootstrapper.EnsureAsync(context);
        await WorkSaleSchemaBootstrapper.EnsureAsync(context);
        Console.WriteLine("Database connection established successfully.");
        var dbLogPath = Path.Combine(AppContext.BaseDirectory, "backend.log");
        File.AppendAllText(dbLogPath, $"{DateTime.Now}: Database connection established successfully\n");

        if (commandOptions.WillMutateAuthData)
        {
            var backupPath = DatabaseBackup.TryCreateBeforeAuthMutation(databaseOptions);
            if (!string.IsNullOrWhiteSpace(backupPath))
            {
                Console.WriteLine($"[Database] Backup created at {backupPath}");
            }
        }

        if (commandOptions.ShouldProvisionAdmin)
        {
            var adminBootstrapSettings = AdminBootstrapSettingsLoader.GetRequired(builder.Configuration);
            var provisioningResult = await authMaintenance.ProvisionAdminAsync(
                adminBootstrapSettings.Username,
                adminBootstrapSettings.FullName,
                adminBootstrapSettings.Password);

            var action = provisioningResult.Created ? "Created" : "Updated";
            Console.WriteLine($"[Auth] {action} administrator account '{provisioningResult.Username}' (id {provisioningResult.UserId}).");
        }

        if (commandOptions.ShouldSanitizeSampleUsers)
        {
            string? preservedUsername = null;
            if (commandOptions.ShouldProvisionAdmin)
            {
                preservedUsername = AdminBootstrapSettingsLoader.GetRequired(builder.Configuration).Username;
            }

            var cleanupResult = await authMaintenance.SanitizeSampleUsersAsync(preservedUsername);
            Console.WriteLine($"[Auth] Sample-user cleanup complete. Deleted: {cleanupResult.DeletedCount}. Rotated: {cleanupResult.RotatedCount}.");
            foreach (var action in cleanupResult.Actions)
            {
                Console.WriteLine($"[Auth] {action}");
            }
        }

        await UserEmployeeLinkSchemaBootstrapper.EnsureAsync(context);

        var audit = await authMaintenance.AuditUsersAsync(
            commandOptions.ShouldProvisionAdmin ? AdminBootstrapSettingsLoader.GetRequired(builder.Configuration).Username : null);

        Console.WriteLine($"[Auth] User audit: {audit.Users.Count} total users, {audit.AdminCount} admin account(s), {audit.SampleCandidates.Count} sample/test candidate(s).");
        foreach (var user in audit.Users)
        {
            var flags = user.Flags.Count == 0 ? "none" : string.Join(", ", user.Flags);
            Console.WriteLine($"[Auth] User #{user.Id} '{user.Username}' role={user.Role} refs={user.References.Total} flags={flags}");
        }

        if (commandOptions.IsMaintenanceMode)
        {
            AuthMaintenanceService.EnsureAdminAccountExists(audit);
            return;
        }

        AuthMaintenanceService.EnsureAdminAccountExists(audit);
        if (audit.SampleCandidates.Count > 0)
        {
            Console.WriteLine("[Auth] Warning: sample/test user candidates still exist in the database. Run 'dotnet run -- --sanitize-sample-users' after reviewing the audit output.");
        }

        if (commandOptions.ShouldClearDatabase)
        {
            // Clear all data
            await DatabaseSeeder.ClearAllDataAsync(context);
        }
        else if (isProductionEnvironment)
        {
            Console.WriteLine("[Database] Production startup: skipping automatic DatabaseSeeder.SeedAsync().");
        }
        else if (!commandOptions.ShouldSkipSeeding)
        {
            // Seed database
            await DatabaseSeeder.SeedAsync(context);
        }
        else
        {
            Console.WriteLine("Skipping startup data maintenance by request.");
        }
    }
    catch (Exception ex)
    {
        var errorMsg = $"Startup failed during database/auth initialization: {ex.Message}";
        Console.WriteLine(errorMsg);
        var dbLogPath = Path.Combine(AppContext.BaseDirectory, "backend.log");
        File.AppendAllText(dbLogPath, $"{DateTime.Now}: {errorMsg}\n");
        Environment.Exit(1);
        return;
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRouting();
app.UseCors(CorsSettings.PolicyName);

if (ServerSettings.ShouldUseHttpsRedirection(app.Configuration))
{
    app.UseHttpsRedirection();
}
else
{
    Console.WriteLine("[Security] HTTPS redirection is disabled because no HTTPS endpoint is configured for this process.");
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

Console.WriteLine("Starting backend server...");

// Set up logging for better debugging
var logPath = Path.Combine(AppContext.BaseDirectory, "backend.log");
Console.WriteLine($"Log file will be written to: {logPath}");

try
{
    var urls = ServerSettings.DescribeUrls(app.Configuration);
    Console.WriteLine($"Configured server URLs: {urls}");
    File.AppendAllText(logPath, $"{DateTime.Now}: Starting server on {urls}\n");
    await app.RunAsync();
}
catch (Exception ex)
{
    var errorMsg = $"Failed to start server: {ex.Message}";
    Console.WriteLine(errorMsg);
    File.AppendAllText(logPath, $"{DateTime.Now}: {errorMsg}\n");
    Environment.Exit(1);
}
