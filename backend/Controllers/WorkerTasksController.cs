using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Authorization;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/worker-tasks")]
    [Authorize(Policy = AppPermissions.WorkersViewOwnTasks)]
    public class WorkerTasksController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public WorkerTasksController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<WorkerTaskDto>>> GetWorkerTasks()
        {
            var tasksQuery = _context.WorkerTasks
                .AsNoTracking()
                .Include(task => task.AssignedUser)
                    .ThenInclude(user => user.Employee)
                .Include(task => task.CreatedBy)
                .AsQueryable();

            if (!_currentUserService.IsAdmin())
            {
                var currentUserId = _currentUserService.GetCurrentUserId();
                tasksQuery = tasksQuery.Where(task => task.AssignedUserId == currentUserId);
            }

            var tasks = await tasksQuery
                .OrderBy(task => task.Deadline)
                .ThenByDescending(task => task.CreatedAt)
                .Select(task => new WorkerTaskDto
                {
                    Id = task.Id,
                    Title = task.Title,
                    Description = task.Description,
                    Deadline = task.Deadline,
                    Status = task.Status,
                    AssignedUserId = task.AssignedUserId,
                    AssignedEmployeeId = task.AssignedUser.EmployeeId ?? 0,
                    AssignedUserFullName = task.AssignedUser.Employee == null
                        ? task.AssignedUser.FullName
                        : task.AssignedUser.Employee.FullName,
                    AssignedEmployeeFullName = task.AssignedUser.Employee == null
                        ? task.AssignedUser.FullName
                        : task.AssignedUser.Employee.FullName,
                    CreatedById = task.CreatedById,
                    CreatedByFullName = task.CreatedBy.FullName,
                    CreatedAt = task.CreatedAt,
                    UpdatedAt = task.UpdatedAt
                })
                .ToListAsync();

            return Ok(tasks);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<WorkerTaskDto>> GetWorkerTask(int id)
        {
            var task = await _context.WorkerTasks
                .AsNoTracking()
                .Include(entity => entity.AssignedUser)
                    .ThenInclude(user => user.Employee)
                .Include(entity => entity.CreatedBy)
                .FirstOrDefaultAsync(entity => entity.Id == id);

            if (task == null)
            {
                return NotFound();
            }

            if (!CanAccessTask(task))
            {
                return Forbid();
            }

            return Ok(ToDto(task));
        }

        [HttpPost]
        [Authorize(Policy = AppPermissions.WorkersManageTasks)]
        public async Task<ActionResult<WorkerTaskDto>> CreateWorkerTask([FromBody] CreateWorkerTaskDto dto)
        {
            var currentUser = _currentUserService.GetCurrentUser();
            if (currentUser == null)
            {
                return Unauthorized();
            }

            var assignedUser = await FindAssignableWorkerAsync(dto.AssignedUserId);
            if (assignedUser == null)
            {
                return BadRequest(new { message = "Assigned worker account was not found or is not linked to an employee." });
            }

            var task = new WorkerTask
            {
                Title = dto.Title.Trim(),
                Description = dto.Description.Trim(),
                Deadline = dto.Deadline,
                Status = dto.Status,
                AssignedUserId = assignedUser.Id,
                CreatedById = currentUser.Id,
                CreatedAt = DateTime.UtcNow
            };

            _context.WorkerTasks.Add(task);
            await _context.SaveChangesAsync();

            task.AssignedUser = assignedUser;
            task.CreatedBy = currentUser;

            return CreatedAtAction(nameof(GetWorkerTask), new { id = task.Id }, ToDto(task));
        }

        [HttpPut("{id:int}")]
        [Authorize(Policy = AppPermissions.WorkersManageTasks)]
        public async Task<IActionResult> UpdateWorkerTask(int id, [FromBody] UpdateWorkerTaskDto dto)
        {
            var task = await _context.WorkerTasks.FindAsync(id);
            if (task == null)
            {
                return NotFound();
            }

            var assignedUser = await FindAssignableWorkerAsync(dto.AssignedUserId);
            if (assignedUser == null)
            {
                return BadRequest(new { message = "Assigned worker account was not found or is not linked to an employee." });
            }

            task.Title = dto.Title.Trim();
            task.Description = dto.Description.Trim();
            task.Deadline = dto.Deadline;
            task.Status = dto.Status!.Value;
            task.AssignedUserId = assignedUser.Id;
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPatch("{id:int}/status")]
        [Authorize(Policy = AppPermissions.WorkersUpdateOwnTaskStatus)]
        public async Task<IActionResult> UpdateWorkerTaskStatus(int id, [FromBody] UpdateWorkerTaskStatusDto dto)
        {
            var task = await _context.WorkerTasks.FindAsync(id);
            if (task == null)
            {
                return NotFound();
            }

            if (!CanAccessTask(task))
            {
                return Forbid();
            }

            task.Status = dto.Status!.Value;
            task.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id:int}")]
        [Authorize(Policy = AppPermissions.WorkersManageTasks)]
        public async Task<IActionResult> DeleteWorkerTask(int id)
        {
            var task = await _context.WorkerTasks.FindAsync(id);
            if (task == null)
            {
                return NotFound();
            }

            _context.WorkerTasks.Remove(task);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool CanAccessTask(WorkerTask task)
        {
            return _currentUserService.IsAdmin()
                || task.AssignedUserId == _currentUserService.GetCurrentUserId();
        }

        private async Task<User?> FindAssignableWorkerAsync(int userId)
        {
            return await _context.Users
                .Include(user => user.Employee)
                .FirstOrDefaultAsync(user =>
                    user.Id == userId &&
                    user.Role == UserRole.User &&
                    user.IsActive &&
                    user.EmployeeId != null &&
                    user.Employee != null &&
                    !user.Employee.IsDeleted);
        }

        private static WorkerTaskDto ToDto(WorkerTask task)
        {
            var assignedEmployeeFullName = task.AssignedUser.Employee?.FullName ?? task.AssignedUser.FullName;

            return new WorkerTaskDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                Deadline = task.Deadline,
                Status = task.Status,
                AssignedUserId = task.AssignedUserId,
                AssignedEmployeeId = task.AssignedUser.EmployeeId ?? 0,
                AssignedUserFullName = assignedEmployeeFullName,
                AssignedEmployeeFullName = assignedEmployeeFullName,
                CreatedById = task.CreatedById,
                CreatedByFullName = task.CreatedBy.FullName,
                CreatedAt = task.CreatedAt,
                UpdatedAt = task.UpdatedAt
            };
        }
    }
}
