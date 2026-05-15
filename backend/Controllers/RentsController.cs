using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backend.Authorization;
using backend.Data;
using backend.Models;
using backend.DTOs;
using backend.Services;
using backend.Utilities;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = AppPermissions.RentsManage)]
    public class RentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public RentsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<RentResponseDto>>> GetRents()
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            
            var rents = await _context.Rents
                .OrderByDescending(r => r.PaymentDate)
                .ToListAsync();

            var response = rents.Select(r => new RentResponseDto
            {
                Id = r.Id,
                Location = r.Location,
                PaymentDate = r.PaymentDate,
                MonthlyAmount = r.MonthlyAmount,
                Description = r.Description,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            });

            return Ok(response);
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<RentResponseDto>> GetRent(int id)
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            
            var rent = await _context.Rents.FindAsync(id);

            if (rent == null)
            {
                return NotFound();
            }

            var response = new RentResponseDto
            {
                Id = rent.Id,
                Location = rent.Location,
                PaymentDate = rent.PaymentDate,
                MonthlyAmount = rent.MonthlyAmount,
                Description = rent.Description,
                CreatedAt = rent.CreatedAt,
                UpdatedAt = rent.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            };

            return Ok(response);
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<RentResponseDto>> CreateRent(CreateRentDto createDto)
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            
            // Parse the date string to DateTime
            if (!DateTime.TryParse(createDto.PaymentDate, out DateTime paymentDate))
            {
                return BadRequest("Invalid date format. Expected YYYY-MM-DD");
            }
            paymentDate = DateTimeUtc.Date(paymentDate);
            
            var rent = new Rent
            {
                Location = createDto.Location,
                PaymentDate = paymentDate,
                MonthlyAmount = createDto.MonthlyAmount,
                Description = createDto.Description,
                CreatedAt = DateTime.UtcNow,
                CreatedById = _currentUserService.GetCurrentUserId()
            };

            _context.Rents.Add(rent);
            await _context.SaveChangesAsync();

            var response = new RentResponseDto
            {
                Id = rent.Id,
                Location = rent.Location,
                PaymentDate = rent.PaymentDate,
                MonthlyAmount = rent.MonthlyAmount,
                Description = rent.Description,
                CreatedAt = rent.CreatedAt,
                UpdatedAt = rent.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            };

            return CreatedAtAction(nameof(GetRent), new { id = rent.Id }, response);
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateRent(int id, UpdateRentDto updateDto)
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            
            var rent = await _context.Rents.FindAsync(id);

            if (rent == null)
            {
                return NotFound();
            }

            if (updateDto.Location != null)
                rent.Location = updateDto.Location;

            if (!string.IsNullOrEmpty(updateDto.PaymentDate))
            {
                // Parse the date string to DateTime
                if (DateTime.TryParse(updateDto.PaymentDate, out DateTime newPaymentDate))
                {
                    rent.PaymentDate = DateTimeUtc.Date(newPaymentDate);
                }
                else
                {
                    return BadRequest("Invalid date format. Expected YYYY-MM-DD");
                }
            }

            if (updateDto.MonthlyAmount.HasValue)
                rent.MonthlyAmount = updateDto.MonthlyAmount.Value;

            if (updateDto.Description != null)
                rent.Description = updateDto.Description;

            rent.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteRent(int id)
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            
            var rent = await _context.Rents.FindAsync(id);
            if (rent == null)
            {
                return NotFound();
            }

            _context.Rents.Remove(rent);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("locations")]
        public async Task<ActionResult<IEnumerable<string>>> GetLocations()
        {
            var locations = await _context.Rents
                .Select(r => r.Location)
                .Distinct()
                .OrderBy(l => l)
                .ToListAsync();

            return Ok(locations);
        }

        [HttpGet("summary")]
        public async Task<ActionResult<object>> GetRentSummary()
        {
            var totalRent = await _context.Rents.SumAsync(r => r.MonthlyAmount);
            var rentCount = await _context.Rents.CountAsync();
            var averageRent = rentCount > 0 ? totalRent / rentCount : 0;

            var summaryByLocation = await _context.Rents
                .GroupBy(r => r.Location)
                .Select(g => new
                {
                    Location = g.Key,
                    TotalAmount = g.Sum(r => r.MonthlyAmount),
                    PaymentCount = g.Count()
                })
                .OrderByDescending(x => x.TotalAmount)
                .ToListAsync();

            return Ok(new
            {
                TotalRent = totalRent,
                RentCount = rentCount,
                AverageRent = averageRent,
                SummaryByLocation = summaryByLocation
            });
        }
    }
} 
