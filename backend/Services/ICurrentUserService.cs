using backend.Models;

namespace backend.Services
{
    public interface ICurrentUserService
    {
        User? GetCurrentUser();
        int GetCurrentUserId();
        int? GetCurrentEmployeeId();
        bool IsAdmin();
        bool IsUser();
    }
}
