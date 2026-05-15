using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backend.Authorization;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using backend.Utilities;
using System.Security.Claims;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = AppPermissions.ProjectsManage)]
    public class ProjectsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ProjectsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        // GET: api/Projects
        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<ProjectDto>>> GetProjects()
        {
            IQueryable<Project> projectsQuery = _context.Projects
                .Include(p => p.CreatedBy);

            if (!_currentUserService.IsAdmin())
            {
                var currentUserId = _currentUserService.GetCurrentUserId();
                projectsQuery = projectsQuery.Where(p => p.CreatedById == currentUserId);
            }

            var projects = await projectsQuery
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new ProjectDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    StartDate = p.StartDate,
                    EndDate = p.EndDate,
                    Content = p.Content,
                    Promet = p.Promet,
                    Description = p.Description,
                    Expenses = p.Expenses,
                    Profit = p.Profit,
                    Status = p.Status,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt,
                    CreatedByFullName = p.CreatedBy.FullName
                })
                .ToListAsync();

            return Ok(projects);
        }

        // GET: api/Projects/5
        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<ProjectDto>> GetProject(int id)
        {
            var project = await _context.Projects
                .Include(p => p.CreatedBy)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
            {
                return NotFound();
            }

            if (!_currentUserService.IsAdmin() && project.CreatedById != _currentUserService.GetCurrentUserId())
            {
                return Forbid();
            }

            var projectDto = new ProjectDto
            {
                Id = project.Id,
                Name = project.Name,
                StartDate = project.StartDate,
                EndDate = project.EndDate,
                Content = project.Content,
                Promet = project.Promet,
                Description = project.Description,
                Expenses = project.Expenses,
                Profit = project.Profit,
                Status = project.Status,
                CreatedAt = project.CreatedAt,
                UpdatedAt = project.UpdatedAt,
                CreatedByFullName = project.CreatedBy.FullName
            };

            return Ok(projectDto);
        }

        // POST: api/Projects
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<ProjectDto>> CreateProject(CreateProjectDto createProjectDto)
        {
            var currentUser = _currentUserService.GetCurrentUser();
            if (currentUser == null)
            {
                return Unauthorized();
            }

            var project = new Project
            {
                Name = createProjectDto.Name,
                StartDate = DateTimeUtc.Date(createProjectDto.StartDate),
                EndDate = DateTimeUtc.Date(createProjectDto.EndDate),
                Content = createProjectDto.Content,
                Promet = createProjectDto.Promet,
                Description = createProjectDto.Description,
                Expenses = createProjectDto.Expenses,
                Profit = createProjectDto.Profit,
                Status = createProjectDto.Status,
                CreatedById = currentUser.Id,
                CreatedAt = DateTime.UtcNow
            };

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            var projectDto = new ProjectDto
            {
                Id = project.Id,
                Name = project.Name,
                StartDate = project.StartDate,
                EndDate = project.EndDate,
                Content = project.Content,
                Promet = project.Promet,
                Description = project.Description,
                Expenses = project.Expenses,
                Profit = project.Profit,
                Status = project.Status,
                CreatedAt = project.CreatedAt,
                UpdatedAt = project.UpdatedAt,
                CreatedByFullName = currentUser.FullName
            };

            return CreatedAtAction(nameof(GetProject), new { id = project.Id }, projectDto);
        }

        // PUT: api/Projects/5
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateProject(int id, UpdateProjectDto updateProjectDto)
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null)
            {
                return NotFound();
            }

            // Check if user has access to this project
            if (!_currentUserService.IsAdmin() && project.CreatedById != _currentUserService.GetCurrentUserId())
            {
                return Forbid();
            }

            project.Name = updateProjectDto.Name;
            project.StartDate = DateTimeUtc.Date(updateProjectDto.StartDate);
            project.EndDate = DateTimeUtc.Date(updateProjectDto.EndDate);
            project.Content = updateProjectDto.Content;
            project.Promet = updateProjectDto.Promet;
            project.Description = updateProjectDto.Description;
            project.Expenses = updateProjectDto.Expenses;
            project.Profit = updateProjectDto.Profit;
            project.Status = updateProjectDto.Status;
            project.UpdatedAt = DateTime.UtcNow;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProjectExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // DELETE: api/Projects/5
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteProject(int id)
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null)
            {
                return NotFound();
            }

            // Check if user has access to this project
            if (!_currentUserService.IsAdmin() && project.CreatedById != _currentUserService.GetCurrentUserId())
            {
                return Forbid();
            }

            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/Projects/status/{status}
        [HttpGet("status/{status}")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<ProjectDto>>> GetProjectsByStatus(ProjectStatus status)
        {
            IQueryable<Project> projectsQuery = _context.Projects
                .Include(p => p.CreatedBy)
                .Where(p => p.Status == status);

            if (!_currentUserService.IsAdmin())
            {
                var currentUserId = _currentUserService.GetCurrentUserId();
                projectsQuery = projectsQuery.Where(p => p.CreatedById == currentUserId);
            }

            var projects = await projectsQuery
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new ProjectDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    StartDate = p.StartDate,
                    EndDate = p.EndDate,
                    Content = p.Content,
                    Promet = p.Promet,
                    Description = p.Description,
                    Expenses = p.Expenses,
                    Profit = p.Profit,
                    Status = p.Status,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt,
                    CreatedByFullName = p.CreatedBy.FullName
                })
                .ToListAsync();

            return Ok(projects);
        }

        private bool ProjectExists(int id)
        {
            return _context.Projects.Any(e => e.Id == id);
        }
    }
} 
