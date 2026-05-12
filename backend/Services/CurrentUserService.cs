using backend.Models;
using backend.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace backend.Services
{
    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ApplicationDbContext _context;

        public CurrentUserService(IHttpContextAccessor httpContextAccessor, ApplicationDbContext context)
        {
            _httpContextAccessor = httpContextAccessor;
            _context = context;
        }

        public User? GetCurrentUser()
        {
            var userId = GetCurrentUserId();
            if (userId == 0) return null;
            
            return _context.Users
                .Include(u => u.Employee)
                .FirstOrDefault(u =>
                    u.Id == userId &&
                    u.IsActive &&
                    (u.Role != UserRole.User ||
                        (u.Employee != null && !u.Employee.IsDeleted)));
        }

        public int GetCurrentUserId()
        {
            var userIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out int userId))
            {
                return userId;
            }
            return 0;
        }

        public int? GetCurrentEmployeeId()
        {
            var userId = GetCurrentUserId();
            if (userId == 0)
            {
                return null;
            }

            return _context.Users
                .Where(user => user.Id == userId && user.IsActive)
                .Select(user =>
                    user.Employee != null && user.Employee.IsDeleted
                        ? null
                        : user.EmployeeId)
                .FirstOrDefault();
        }

        public bool IsAdmin()
        {
            var user = GetCurrentUser();
            return user?.Role == UserRole.Admin;
        }

        public bool IsUser()
        {
            var user = GetCurrentUser();
            return user?.Role == UserRole.User;
        }
    }
}
