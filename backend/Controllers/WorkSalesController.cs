using System.Globalization;
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
    [Route("api/work-sales")]
    [Authorize(Policy = AppPermissions.WorkSalesManage)]
    public class WorkSalesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public WorkSalesController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<WorkSaleResponseDto>>> GetWorkSales([FromQuery] int? limit = null)
        {
            IQueryable<WorkSale> query = _context.WorkSales
                .AsNoTracking()
                .Include(workSale => workSale.CreatedBy)
                .OrderByDescending(workSale => workSale.Date)
                .ThenByDescending(workSale => workSale.Id);

            if (limit is > 0)
            {
                query = query.Take(Math.Min(limit.Value, 100));
            }

            var workSales = await query.ToListAsync();

            return Ok(workSales.Select(ToDto));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<WorkSaleResponseDto>> GetWorkSale(int id)
        {
            var workSale = await _context.WorkSales
                .AsNoTracking()
                .Include(entity => entity.CreatedBy)
                .FirstOrDefaultAsync(entity => entity.Id == id);

            if (workSale == null)
            {
                return NotFound();
            }

            return Ok(ToDto(workSale));
        }

        [HttpPost]
        public async Task<ActionResult<WorkSaleResponseDto>> CreateWorkSale([FromBody] CreateWorkSaleDto dto)
        {
            var currentUser = _currentUserService.GetCurrentUser();
            if (currentUser == null)
            {
                return Unauthorized();
            }

            if (!TryParseWorkSaleDate(dto.Date, out var workSaleDate))
            {
                return BadRequest(new { message = "Invalid date format. Expected YYYY-MM-DD." });
            }

            if (string.IsNullOrWhiteSpace(dto.WorkName))
            {
                return BadRequest(new { message = "WorkName is required." });
            }

            var workSale = new WorkSale
            {
                WorkName = dto.WorkName.Trim(),
                TotalWorkM2 = dto.TotalWorkM2,
                ClientPricePerM2 = dto.ClientPricePerM2,
                SubcontractorPricePerM2 = dto.SubcontractorPricePerM2,
                Date = workSaleDate,
                Notes = NormalizeNotes(dto.Notes),
                CreatedAt = DateTime.UtcNow,
                CreatedById = currentUser.Id
            };
            RecalculateTotals(workSale);

            _context.WorkSales.Add(workSale);
            await _context.SaveChangesAsync();

            workSale.CreatedBy = currentUser;

            return CreatedAtAction(nameof(GetWorkSale), new { id = workSale.Id }, ToDto(workSale));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateWorkSale(int id, [FromBody] UpdateWorkSaleDto dto)
        {
            var workSale = await _context.WorkSales.FindAsync(id);
            if (workSale == null)
            {
                return NotFound();
            }

            if (!TryParseWorkSaleDate(dto.Date, out var workSaleDate))
            {
                return BadRequest(new { message = "Invalid date format. Expected YYYY-MM-DD." });
            }

            if (string.IsNullOrWhiteSpace(dto.WorkName))
            {
                return BadRequest(new { message = "WorkName is required." });
            }

            workSale.WorkName = dto.WorkName.Trim();
            workSale.TotalWorkM2 = dto.TotalWorkM2;
            workSale.ClientPricePerM2 = dto.ClientPricePerM2;
            workSale.SubcontractorPricePerM2 = dto.SubcontractorPricePerM2;
            workSale.Date = workSaleDate;
            workSale.Notes = NormalizeNotes(dto.Notes);
            workSale.UpdatedAt = DateTime.UtcNow;
            RecalculateTotals(workSale);

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteWorkSale(int id)
        {
            var workSale = await _context.WorkSales.FindAsync(id);
            if (workSale == null)
            {
                return NotFound();
            }

            _context.WorkSales.Remove(workSale);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private static WorkSaleResponseDto ToDto(WorkSale workSale)
        {
            return new WorkSaleResponseDto
            {
                Id = workSale.Id,
                WorkName = workSale.WorkName,
                TotalWorkM2 = workSale.TotalWorkM2,
                ClientPricePerM2 = workSale.ClientPricePerM2,
                SubcontractorPricePerM2 = workSale.SubcontractorPricePerM2,
                TotalRevenue = workSale.TotalRevenue,
                TotalCost = workSale.TotalCost,
                Profit = workSale.Profit,
                Date = workSale.Date,
                Notes = workSale.Notes,
                CreatedAt = workSale.CreatedAt,
                UpdatedAt = workSale.UpdatedAt,
                CreatedByFullName = workSale.CreatedBy?.FullName ?? string.Empty
            };
        }

        private static void RecalculateTotals(WorkSale workSale)
        {
            workSale.TotalRevenue = RoundMoney(workSale.TotalWorkM2 * workSale.ClientPricePerM2);
            workSale.TotalCost = RoundMoney(workSale.TotalWorkM2 * workSale.SubcontractorPricePerM2);
            workSale.Profit = RoundMoney(workSale.TotalRevenue - workSale.TotalCost);
        }

        private static decimal RoundMoney(decimal value)
        {
            return Math.Round(value, 2, MidpointRounding.AwayFromZero);
        }

        private static string? NormalizeNotes(string? notes)
        {
            return string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        }

        private static bool TryParseWorkSaleDate(string? rawDate, out DateTime date)
        {
            date = default;
            if (string.IsNullOrWhiteSpace(rawDate))
            {
                return false;
            }

            if (!DateTime.TryParseExact(
                    rawDate.Trim(),
                    "yyyy-MM-dd",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out var parsedDate))
            {
                return false;
            }

            date = DateTime.SpecifyKind(parsedDate.Date, DateTimeKind.Utc);
            return true;
        }
    }
}
