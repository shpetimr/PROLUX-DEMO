using backend.Models;

namespace backend.DTOs
{
    public class ProjectDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Content { get; set; } = string.Empty;
        public decimal Promet { get; set; }
        public string? Description { get; set; }
        public decimal? Expenses { get; set; }
        public decimal? Profit { get; set; }
        public ProjectStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string CreatedByFullName { get; set; } = string.Empty;
    }
    
    public class CreateProjectDto
    {
        public string Name { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Content { get; set; } = string.Empty;
        public decimal Promet { get; set; }
        public string? Description { get; set; }
        public ProjectStatus Status { get; set; } = ProjectStatus.Pending;
    }
    
    public class UpdateProjectDto
    {
        public string Name { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Content { get; set; } = string.Empty;
        public decimal Promet { get; set; }
        public string? Description { get; set; }
        public decimal? Expenses { get; set; }
        public decimal? Profit { get; set; }
        public ProjectStatus Status { get; set; }
    }
} 