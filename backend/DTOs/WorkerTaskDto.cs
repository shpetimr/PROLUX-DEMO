using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.DTOs
{
    public class WorkerTaskDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public DateTime Deadline { get; set; }
        public WorkerTaskStatus Status { get; set; }
        public int AssignedUserId { get; set; }
        public int AssignedEmployeeId { get; set; }
        public string AssignedUserFullName { get; set; } = string.Empty;
        public string AssignedEmployeeFullName { get; set; } = string.Empty;
        public int CreatedById { get; set; }
        public string CreatedByFullName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class CreateWorkerTaskDto
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(1000)]
        public string Description { get; set; } = string.Empty;

        [Required]
        public DateTime Deadline { get; set; }

        public WorkerTaskStatus Status { get; set; } = WorkerTaskStatus.Waiting;

        [Required]
        public int AssignedUserId { get; set; }
    }

    public class UpdateWorkerTaskDto
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(1000)]
        public string Description { get; set; } = string.Empty;

        [Required]
        public DateTime Deadline { get; set; }

        public WorkerTaskStatus? Status { get; set; }

        [Required]
        public int AssignedUserId { get; set; }
    }

    public class UpdateWorkerTaskStatusDto
    {
        [Required]
        public WorkerTaskStatus? Status { get; set; }
    }
}
