using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.DTOs
{
    public class LoginDto
    {
        [Required]
        [StringLength(50)]
        public string Username { get; set; } = string.Empty;
        
        [Required]
        [StringLength(512)]
        public string Password { get; set; } = string.Empty;
    }
    
    public class RegisterDto
    {
        [Required]
        [StringLength(50)]
        public string Username { get; set; } = string.Empty;
        
        [Required]
        [StringLength(512, MinimumLength = 12)]
        public string Password { get; set; } = string.Empty;
        
        [Required]
        [StringLength(100)]
        public string FullName { get; set; } = string.Empty;
        
        [Required]
        public UserRole Role { get; set; }

        public int? EmployeeId { get; set; }

        [StringLength(20)]
        public string? EmployeePosition { get; set; }

        public string? HireDate { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? DailyWage { get; set; }

        [Range(0, double.MaxValue)]
        public decimal? DailyRate { get; set; }
    }
    
    public class AuthResponseDto
    {
        public int Id { get; set; }
        public string Token { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public UserRole Role { get; set; }
        public int? EmployeeId { get; set; }
        public string? EmployeeFullName { get; set; }
        public IReadOnlyList<string> Permissions { get; set; } = Array.Empty<string>();
        public DateTime ExpiresAt { get; set; }
    }

    public class ValidateTokenDto
    {
        [Required]
        public string Token { get; set; } = string.Empty;
    }
    
    public class UserResponseDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public UserRole Role { get; set; }
        public int? EmployeeId { get; set; }
        public string? EmployeeFullName { get; set; }
        public IReadOnlyList<string> Permissions { get; set; } = Array.Empty<string>();
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
    }
} 
