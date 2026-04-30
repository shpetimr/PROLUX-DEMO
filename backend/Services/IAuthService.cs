using backend.DTOs;

namespace backend.Services
{
    public interface IAuthService
    {
        Task<AuthResponseDto> LoginAsync(LoginDto loginDto);
        Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto);
        Task<bool> ValidateTokenAsync(string token);
        Task<UserResponseDto?> GetCurrentUserAsync(int userId);
        string GenerateJwtToken(UserResponseDto user);
    }
}
