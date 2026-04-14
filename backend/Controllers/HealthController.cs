using Microsoft.AspNetCore.Mvc;
using backend.Data;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public HealthController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new { status = "OK", timestamp = DateTime.UtcNow });
        }

        [HttpPost("clear-database")]
        public async Task<IActionResult> ClearDatabase()
        {
            try
            {
                await DatabaseSeeder.ClearAllDataAsync(_context);
                return Ok(new { message = "Database cleared successfully", timestamp = DateTime.UtcNow });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error clearing database: {ex.Message}" });
            }
        }
    }
} 