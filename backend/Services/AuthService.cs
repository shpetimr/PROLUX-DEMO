using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Authorization;
using backend.Configuration;
using backend.Data;
using backend.Models;
using backend.DTOs;
using backend.Security;

namespace backend.Services
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly JwtSettings _jwtSettings;
        private readonly ICurrentUserService _currentUserService;

        public AuthService(
            ApplicationDbContext context,
            IConfiguration configuration,
            ICurrentUserService currentUserService)
        {
            _context = context;
            _jwtSettings = JwtSettingsLoader.GetRequiredJwtSettings(configuration);
            _currentUserService = currentUserService;
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
        {
            var username = loginDto.Username.Trim();

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(loginDto.Password))
            {
                throw new UnauthorizedAccessException("Invalid username or password");
            }

            var normalizedUsername = username.ToUpperInvariant();
            var user = await _context.Users
                .Include(u => u.Employee)
                .FirstOrDefaultAsync(u => u.Username.ToUpper() == normalizedUsername);

            if (user == null || !PasswordSecurity.VerifyPassword(loginDto.Password, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Invalid username or password");
            }

            if (PasswordSecurity.NeedsRehash(user.PasswordHash))
            {
                user.PasswordHash = PasswordSecurity.HashPassword(loginDto.Password);
            }

            if (user.Role == UserRole.User && user.Employee == null)
            {
                user.EmployeeId = null;
                var existingEmployee = await FindSingleUnlinkedEmployeeByNameAsync(user.FullName);
                user.Employee = existingEmployee
                    ?? CreateEmployeeForWorker(
                        user.FullName,
                        user.CreatedAt,
                        await GetFallbackCreatorUserIdAsync(user.Id));
            }

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var userDto = ToUserResponseDto(user);
            var token = GenerateJwtToken(userDto);

            return new AuthResponseDto
            {
                Id = user.Id,
                Token = token,
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                EmployeeId = user.EmployeeId,
                EmployeeFullName = user.Employee?.FullName,
                Permissions = userDto.Permissions,
                ExpiresAt = DateTime.UtcNow.AddDays(7) // Token expires in 7 days
            };
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
        {
            var username = registerDto.Username.Trim();
            var fullName = registerDto.FullName.Trim();

            if (string.IsNullOrWhiteSpace(username))
            {
                throw new InvalidOperationException("Username is required");
            }

            if (string.IsNullOrWhiteSpace(fullName))
            {
                throw new InvalidOperationException("Full name is required");
            }

            PasswordSecurity.EnsureStrongPassword(registerDto.Password, username, fullName);

            // Check if username already exists
            var normalizedUsername = username.ToUpperInvariant();
            if (await _context.Users.AnyAsync(u => u.Username.ToUpper() == normalizedUsername))
            {
                throw new InvalidOperationException("Username already exists");
            }

            var passwordHash = PasswordSecurity.HashPassword(registerDto.Password);
            Employee? linkedEmployee = null;

            if (registerDto.Role == UserRole.User)
            {
                var creatorUserId = _currentUserService.GetCurrentUserId();
                if (creatorUserId == 0)
                {
                    throw new InvalidOperationException("A worker account must be created by an authenticated administrator.");
                }

                linkedEmployee = await ResolveEmployeeForWorkerAsync(registerDto, fullName, creatorUserId);
                fullName = linkedEmployee.FullName;
            }

            var user = new User
            {
                Username = username,
                PasswordHash = passwordHash,
                FullName = fullName,
                Role = registerDto.Role,
                Employee = linkedEmployee,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            if (user.Role == UserRole.User)
            {
                await EnsureSavedWorkerEmployeeLinkAsync(user);
            }

            var userDto = ToUserResponseDto(user);
            var token = GenerateJwtToken(userDto);

            return new AuthResponseDto
            {
                Id = user.Id,
                Token = token,
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                EmployeeId = user.EmployeeId,
                EmployeeFullName = user.Employee?.FullName,
                Permissions = userDto.Permissions,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };
        }

        public Task<bool> ValidateTokenAsync(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.UTF8.GetBytes(_jwtSettings.Key);

                tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = _jwtSettings.Issuer,
                    ValidateAudience = true,
                    ValidAudience = _jwtSettings.Audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                return Task.FromResult(true);
            }
            catch
            {
                return Task.FromResult(false);
            }
        }

        public async Task<UserResponseDto?> GetCurrentUserAsync(int userId)
        {
            var user = await _context.Users
                .Include(entity => entity.Employee)
                .FirstOrDefaultAsync(entity => entity.Id == userId);
            return user == null ? null : ToUserResponseDto(user);
        }

        private async Task EnsureSavedWorkerEmployeeLinkAsync(User user)
        {
            if (!user.EmployeeId.HasValue && user.Employee?.Id > 0)
            {
                user.EmployeeId = user.Employee.Id;
                await _context.SaveChangesAsync();
            }

            if (!user.EmployeeId.HasValue)
            {
                throw new InvalidOperationException("Worker account must be linked to an employee record.");
            }

            if (user.Employee == null)
            {
                await _context.Entry(user)
                    .Reference(entity => entity.Employee)
                    .LoadAsync();
            }

            if (user.Employee == null)
            {
                throw new InvalidOperationException("Worker account was linked to an employee record that no longer exists.");
            }
        }

        public string GenerateJwtToken(UserResponseDto user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_jwtSettings.Key);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.GivenName, user.FullName),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            };

            if (user.EmployeeId.HasValue)
            {
                claims.Add(new Claim("employeeId", user.EmployeeId.Value.ToString()));
            }

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Issuer = _jwtSettings.Issuer,
                Audience = _jwtSettings.Audience,
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private static UserResponseDto ToUserResponseDto(User user)
        {
            return new UserResponseDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                EmployeeId = user.EmployeeId,
                EmployeeFullName = user.Employee?.FullName,
                Permissions = AppPermissions.GetPermissionsForRole(user.Role),
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt
            };
        }

        private async Task<Employee> ResolveEmployeeForWorkerAsync(
            RegisterDto registerDto,
            string fullName,
            int creatorUserId)
        {
            if (registerDto.EmployeeId.HasValue)
            {
                var employee = await _context.Employees
                    .FirstOrDefaultAsync(entity => entity.Id == registerDto.EmployeeId.Value);

                if (employee == null)
                {
                    throw new InvalidOperationException("Selected employee was not found.");
                }

                var isAlreadyLinked = await _context.Users.AnyAsync(user =>
                    user.EmployeeId == employee.Id);
                if (isAlreadyLinked)
                {
                    throw new InvalidOperationException("Selected employee already has a worker login account.");
                }

                return employee;
            }

            var existingEmployee = await FindSingleUnlinkedEmployeeByNameAsync(fullName);
            if (existingEmployee != null)
            {
                return existingEmployee;
            }

            return CreateEmployeeForWorker(
                fullName,
                ParseHireDateOrDefault(registerDto.HireDate),
                creatorUserId,
                ParseEmployeePositionOrDefault(registerDto.EmployeePosition),
                registerDto.DailyWage,
                registerDto.DailyRate);
        }

        private async Task<Employee?> FindSingleUnlinkedEmployeeByNameAsync(string fullName)
        {
            var normalizedFullName = fullName.Trim().ToUpperInvariant();
            var candidates = await _context.Employees
                .Where(employee => employee.FullName.ToUpper() == normalizedFullName)
                .OrderBy(employee => employee.Id)
                .ToListAsync();

            if (candidates.Count == 0)
            {
                return null;
            }

            var linkedEmployeeIds = await _context.Users
                .Where(user => user.EmployeeId.HasValue)
                .Select(user => user.EmployeeId!.Value)
                .ToListAsync();

            var unlinkedCandidates = candidates
                .Where(employee => !linkedEmployeeIds.Contains(employee.Id))
                .ToList();

            return unlinkedCandidates.Count == 1 ? unlinkedCandidates[0] : null;
        }

        private Employee CreateEmployeeForWorker(
            string fullName,
            DateTime hireDate,
            int creatorUserId,
            EmployeePosition position = EmployeePosition.Magazine,
            decimal? dailyWage = null,
            decimal? dailyRate = null)
        {
            var defaultDailyWage = GetDefaultDailyWage(position);
            var employee = new Employee
            {
                FullName = fullName.Trim(),
                Position = position,
                HireDate = hireDate,
                BaseSalary = (dailyWage ?? defaultDailyWage) * SalaryCalculator.StandardWorkingDaysPerMonth,
                DailyWage = dailyWage ?? defaultDailyWage,
                DaysWorkedThisMonth = 0,
                MonthlyBonuses = 0,
                MonthlyPenalties = 0,
                DailyRate = dailyRate ?? dailyWage ?? defaultDailyWage,
                CreatedAt = DateTime.UtcNow,
                CreatedById = creatorUserId
            };

            _context.Employees.Add(employee);
            return employee;
        }

        private async Task<int> GetFallbackCreatorUserIdAsync(int preferredUserId)
        {
            var adminId = await _context.Users
                .Where(user => user.Role == UserRole.Admin)
                .OrderBy(user => user.Id)
                .Select(user => user.Id)
                .FirstOrDefaultAsync();

            return adminId != 0 ? adminId : preferredUserId;
        }

        private static EmployeePosition ParseEmployeePositionOrDefault(string? position)
        {
            return position?.Trim().ToLowerInvariant() switch
            {
                "terren" => EmployeePosition.Terren,
                "magazine" => EmployeePosition.Magazine,
                _ => EmployeePosition.Magazine
            };
        }

        private static DateTime ParseHireDateOrDefault(string? hireDate)
        {
            return DateTime.TryParse(hireDate, out var parsedHireDate)
                ? parsedHireDate
                : DateTime.UtcNow.Date;
        }

        private static decimal GetDefaultDailyWage(EmployeePosition position)
        {
            return position switch
            {
                EmployeePosition.Terren => 2460m,
                _ => 1850m
            };
        }
    }
} 
