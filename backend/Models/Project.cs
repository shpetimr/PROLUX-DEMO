using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class Project
    {
        public int Id { get; set; }
        
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public DateTime StartDate { get; set; }
        
        [Required]
        public DateTime EndDate { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string Content { get; set; } = string.Empty;
        
        [Required]
        public decimal Promet { get; set; }
        
        [MaxLength(1000)]
        public string? Description { get; set; }
        
        public decimal? Expenses { get; set; }
        
        public decimal? Profit { get; set; }
        
        [Required]
        public ProjectStatus Status { get; set; } = ProjectStatus.Pending;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        public int CreatedById { get; set; }
        public User CreatedBy { get; set; } = null!;
    }
    
    public enum ProjectStatus
    {
        Pending,        // Në pritje
        InProgress,     // Në progres
        Completed,      // Përfunduar
        Cancelled       // Anuluar
    }
} 