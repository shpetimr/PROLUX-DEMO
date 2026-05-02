using System.ComponentModel.DataAnnotations;

namespace backend.Models
{
    public class WorkerTask
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string Description { get; set; } = string.Empty;

        [Required]
        public DateTime Deadline { get; set; }

        [Required]
        public WorkerTaskStatus Status { get; set; } = WorkerTaskStatus.Waiting;

        public int AssignedUserId { get; set; }
        public User AssignedUser { get; set; } = null!;

        public int CreatedById { get; set; }
        public User CreatedBy { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    public enum WorkerTaskStatus
    {
        Waiting,
        InProcess,
        Completed
    }
}
