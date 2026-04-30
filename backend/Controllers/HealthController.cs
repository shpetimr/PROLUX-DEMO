using backend.Configuration;
using backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly DatabaseOptions _databaseOptions;

        public HealthController(ApplicationDbContext dbContext, DatabaseOptions databaseOptions)
        {
            _dbContext = dbContext;
            _databaseOptions = databaseOptions;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> Get(CancellationToken cancellationToken)
        {
            try
            {
                var databaseAvailable = await _dbContext.Database.CanConnectAsync(cancellationToken);
                if (!databaseAvailable)
                {
                    return StatusCode(503, new
                    {
                        status = "Degraded",
                        timestamp = DateTime.UtcNow,
                        database = new
                        {
                            status = "Unavailable",
                            provider = _databaseOptions.ProviderName
                        }
                    });
                }

                return Ok(new
                {
                    status = "OK",
                    timestamp = DateTime.UtcNow,
                    database = new
                    {
                        status = "OK",
                        provider = _databaseOptions.ProviderName
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(503, new
                {
                    status = "Degraded",
                    timestamp = DateTime.UtcNow,
                    database = new
                    {
                        status = "Unavailable",
                        provider = _databaseOptions.ProviderName,
                        error = ex.GetType().Name
                    }
                });
            }
        }
    }
} 
