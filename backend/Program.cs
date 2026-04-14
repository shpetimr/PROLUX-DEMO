using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using backend.Data;
using backend.Models;
using backend.Services;

static string ResolveSqliteConnectionString(string? configured, string contentRoot)
{
    var raw = string.IsNullOrWhiteSpace(configured)
        ? "Data Source=BusinessManagement.db"
        : configured!.Trim();
    if (!raw.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase))
        return raw;
    var filePart = raw["Data Source=".Length..].Trim().Trim('"');
    if (string.IsNullOrEmpty(filePart))
        filePart = "BusinessManagement.db";
    if (Path.IsPathRooted(filePart))
        return $"Data Source={Path.GetFullPath(filePart)}";
    var root = string.IsNullOrWhiteSpace(contentRoot) ? AppContext.BaseDirectory : contentRoot;
    var absolute = Path.GetFullPath(Path.Combine(root, filePart));
    return $"Data Source={absolute}";
}

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// SQLite: use absolute path so reads/writes always hit the same file regardless of process cwd
var sqliteConnection = ResolveSqliteConnectionString(
    builder.Configuration.GetConnectionString("DefaultConnection"),
    builder.Environment.ContentRootPath);
Console.WriteLine($"[Database] SQLite file: {sqliteConnection}");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(sqliteConnection));

// Configure JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "your-secret-key-here"))
        };
    });

builder.Services.AddAuthorization();

// Register services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddHttpContextAccessor();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader()
              .WithExposedHeaders("Content-Disposition");
    });
    
    // Add a more specific policy for development
    options.AddPolicy("Development", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://localhost:8080", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:5173", "http://127.0.0.1:8080")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("Development"); // Use specific development policy
}
else
{
    app.UseCors("AllowAll"); // Use general policy for production
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Database setup and seeding
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    
    try
    {
        // Ensure database is created
        await context.Database.EnsureCreatedAsync();
        await StockSchemaBootstrapper.EnsureAsync(context);
        Console.WriteLine("Database connection established successfully.");
        var dbLogPath = Path.Combine(AppContext.BaseDirectory, "backend.log");
        File.AppendAllText(dbLogPath, $"{DateTime.Now}: Database connection established successfully\n");
        
        // Only seed database if we're not clearing it and not skipping seeding
        var commandLineArgs = Environment.GetCommandLineArgs();
        bool shouldClearDatabase = commandLineArgs.Contains("--clear-database");
        bool shouldSkipSeeding = commandLineArgs.Contains("--skip-seeding");
        
        if (shouldClearDatabase)
        {
            // Clear all data
            await DatabaseSeeder.ClearAllDataAsync(context);
        }
        else if (!shouldSkipSeeding)
        {
            // Seed database
            await DatabaseSeeder.SeedAsync(context, scope.ServiceProvider.GetRequiredService<IAuthService>());
            
            // Ensure default users exist (backup in case seeder fails)
            var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
            
            if (!context.Users.Any(u => u.Username == "admin"))
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
                Console.WriteLine("Created admin user");
            }
            
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
                Console.WriteLine("Created regular user");
            }
            
            await context.SaveChangesAsync();
        }
        else
        {
            // When skipping seeding, only ensure basic users exist
            var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
            
            if (!context.Users.Any(u => u.Username == "admin"))
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
                Console.WriteLine("Created admin user");
            }
            
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
                Console.WriteLine("Created regular user");
            }
            
            await context.SaveChangesAsync();
        }
    }
    catch (Exception ex)
    {
        var errorMsg = $"Error connecting to database: {ex.Message}";
        Console.WriteLine(errorMsg);
        var dbLogPath = Path.Combine(AppContext.BaseDirectory, "backend.log");
        File.AppendAllText(dbLogPath, $"{DateTime.Now}: {errorMsg}\n");
    }
}

// Helper method to hash passwords
static string HashPassword(string password)
{
    using var sha256 = System.Security.Cryptography.SHA256.Create();
    var hashedBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
    return Convert.ToBase64String(hashedBytes);
}

Console.WriteLine("Starting backend server...");

// Set up logging for better debugging
var logPath = Path.Combine(AppContext.BaseDirectory, "backend.log");
Console.WriteLine($"Log file will be written to: {logPath}");

try
{
    // Try to run on the configured port, fallback to a different port if needed
    var port = 5069;
    var maxPortAttempts = 10;
    
    for (int attempt = 0; attempt < maxPortAttempts; attempt++)
    {
        try
        {
            var url = $"http://localhost:{port}";
            Console.WriteLine($"Attempting to start server on {url}");
            File.AppendAllText(logPath, $"{DateTime.Now}: Starting server on {url}\n");
            app.Run(url);
            break; // If successful, break out of the loop
        }
        catch (System.Net.Sockets.SocketException ex) when (ex.Message.Contains("Address already in use"))
        {
            Console.WriteLine($"Port {port} is in use, trying next port...");
            File.AppendAllText(logPath, $"{DateTime.Now}: Port {port} in use, trying next port\n");
            port++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error starting server on port {port}: {ex.Message}");
            File.AppendAllText(logPath, $"{DateTime.Now}: Error on port {port}: {ex.Message}\n");
            port++;
        }
    }
}
catch (Exception ex)
{
    var errorMsg = $"Failed to start server after multiple attempts: {ex.Message}";
    Console.WriteLine(errorMsg);
    File.AppendAllText(logPath, $"{DateTime.Now}: {errorMsg}\n");
    Environment.Exit(1);
}
