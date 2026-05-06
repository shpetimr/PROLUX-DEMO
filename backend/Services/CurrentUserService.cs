using backend.Models;
using backend.Data;
using Microsoft.AspNetCore.Http;
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
            
            return _context.Users.FirstOrDefault(u => u.Id == userId);
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
                .Where(user => user.Id == userId)
                .Select(user => user.EmployeeId)
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
