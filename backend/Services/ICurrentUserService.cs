using backend.Models;

namespace backend.Services
{
    public interface ICurrentUserService
    {
        User? GetCurrentUser();
        int GetCurrentUserId();
        bool IsAdmin();
        bool IsUser();
    }
} 