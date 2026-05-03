using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backend.Authorization;
using backend.Data;
using backend.Services;
using backend.DTOs;
using backend.Models;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ICurrentUserService _currentUserService;
        private readonly ApplicationDbContext _context;

        public AuthController(
            IAuthService authService,
            ICurrentUserService currentUserService,
            ApplicationDbContext context)
        {
            _authService = authService;
            _currentUserService = currentUserService;
            _context = context;
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
        {
            try
            {
                var response = await _authService.LoginAsync(loginDto);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("register")]
        [Authorize(Policy = AppPermissions.UsersManage)]
        public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto registerDto)
        {
            try
            {
                var response = await _authService.RegisterAsync(registerDto);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<UserResponseDto>> GetCurrentUser()
        {
            var userId = _currentUserService.GetCurrentUserId();
            if (userId == 0)
            {
                return Unauthorized();
            }

            var user = await _authService.GetCurrentUserAsync(userId);
            if (user == null)
            {
                return Unauthorized();
            }

            return Ok(user);
        }

        [HttpGet("users")]
        [Authorize(Policy = AppPermissions.UsersManage)]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetUsers()
        {
            var users = await _context.Users
                .AsNoTracking()
                .Include(user => user.Employee)
                .OrderBy(user => user.FullName)
                .ThenBy(user => user.Username)
                .Select(user => new
                {
                    user.Id,
                    user.Username,
                    user.FullName,
                    user.Role,
                    user.EmployeeId,
                    EmployeeFullName = user.Employee == null ? null : user.Employee.FullName,
                    user.CreatedAt,
                    user.LastLoginAt
                })
                .ToListAsync();

            return Ok(users.Select(user => new UserResponseDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                EmployeeId = user.EmployeeId,
                EmployeeFullName = user.EmployeeFullName,
                Permissions = AppPermissions.GetPermissionsForRole(user.Role),
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt
            }));
        }

        [HttpGet("workers")]
        [Authorize(Policy = AppPermissions.WorkersManageTasks)]
        public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetWorkers()
        {
            var workers = await _context.Users
                .AsNoTracking()
                .Include(user => user.Employee)
                .Where(user => user.Role == UserRole.User && user.EmployeeId != null)
                .OrderBy(user => user.Employee!.FullName)
                .ThenBy(user => user.Username)
                .Select(user => new
                {
                    user.Id,
                    user.Username,
                    user.FullName,
                    user.Role,
                    user.EmployeeId,
                    EmployeeFullName = user.Employee == null ? null : user.Employee.FullName,
                    user.CreatedAt,
                    user.LastLoginAt
                })
                .ToListAsync();

            return Ok(workers.Select(user => new UserResponseDto
            {
                Id = user.Id,
                Username = user.Username,
                FullName = user.EmployeeFullName ?? user.FullName,
                Role = user.Role,
                EmployeeId = user.EmployeeId,
                EmployeeFullName = user.EmployeeFullName,
                Permissions = AppPermissions.GetPermissionsForRole(user.Role),
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt
            }));
        }

        [HttpPost("validate")]
        [AllowAnonymous]
        public async Task<ActionResult<bool>> ValidateToken([FromBody] ValidateTokenDto request)
        {
            try
            {
                var isValid = await _authService.ValidateTokenAsync(request.Token);
                return Ok(isValid);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
} 
