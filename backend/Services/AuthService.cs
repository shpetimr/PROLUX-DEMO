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

        public AuthService(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _jwtSettings = JwtSettingsLoader.GetRequiredJwtSettings(configuration);
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
                .FirstOrDefaultAsync(u => u.Username.ToUpper() == normalizedUsername);

            if (user == null || !PasswordSecurity.VerifyPassword(loginDto.Password, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Invalid username or password");
            }

            if (PasswordSecurity.NeedsRehash(user.PasswordHash))
            {
                user.PasswordHash = PasswordSecurity.HashPassword(loginDto.Password);
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

            var user = new User
            {
                Username = username,
                PasswordHash = passwordHash,
                FullName = fullName,
                Role = registerDto.Role,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
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
            var user = await _context.Users.FirstOrDefaultAsync(entity => entity.Id == userId);
            return user == null ? null : ToUserResponseDto(user);
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
                Permissions = AppPermissions.GetPermissionsForRole(user.Role),
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt
            };
        }
    }
} 
