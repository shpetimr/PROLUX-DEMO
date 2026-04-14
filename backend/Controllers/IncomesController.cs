using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.DTOs;
using backend.Services;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class IncomesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public IncomesController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<IncomeResponseDto>>> GetIncomes()
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            
            var incomes = await _context.Incomes
                .OrderByDescending(i => i.Date)
                .ToListAsync();

            var response = incomes.Select(i => new IncomeResponseDto
            {
                Id = i.Id,
                Source = i.Source,
                Date = i.Date,
                Amount = i.Amount,
                Description = i.Description,
                CreatedAt = i.CreatedAt,
                UpdatedAt = i.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            });

            return Ok(response);
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<IncomeResponseDto>> GetIncome(int id)
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            
            var income = await _context.Incomes.FindAsync(id);

            if (income == null)
            {
                return NotFound();
            }

            var response = new IncomeResponseDto
            {
                Id = income.Id,
                Source = income.Source,
                Date = income.Date,
                Amount = income.Amount,
                Description = income.Description,
                CreatedAt = income.CreatedAt,
                UpdatedAt = income.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            };

            return Ok(response);
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<IncomeResponseDto>> CreateIncome(CreateIncomeDto createDto)
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            
            // Parse the date string to DateTime
            if (!DateTime.TryParse(createDto.Date, out DateTime incomeDate))
            {
                return BadRequest("Invalid date format. Expected YYYY-MM-DD");
            }
            
            var income = new Income
            {
                Source = createDto.Source,
                Date = incomeDate, // Use parsed date
                Amount = createDto.Amount,
                Description = createDto.Description,
                CreatedAt = DateTime.UtcNow,
                CreatedById = _currentUserService.GetCurrentUserId()
            };

            _context.Incomes.Add(income);
            await _context.SaveChangesAsync();

            var response = new IncomeResponseDto
            {
                Id = income.Id,
                Source = income.Source,
                Date = income.Date,
                Amount = income.Amount,
                Description = income.Description,
                CreatedAt = income.CreatedAt,
                UpdatedAt = income.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            };

            return CreatedAtAction(nameof(GetIncome), new { id = income.Id }, response);
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateIncome(int id, UpdateIncomeDto updateDto)
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            
            var income = await _context.Incomes.FindAsync(id);

            if (income == null)
            {
                return NotFound();
            }

            if (updateDto.Source != null)
                income.Source = updateDto.Source;

            if (!string.IsNullOrEmpty(updateDto.Date))
            {
                // Parse the date string to DateTime
                if (DateTime.TryParse(updateDto.Date, out DateTime newIncomeDate))
                {
                    income.Date = newIncomeDate;
                }
                else
                {
                    return BadRequest("Invalid date format. Expected YYYY-MM-DD");
                }
            }

            if (updateDto.Amount.HasValue)
                income.Amount = updateDto.Amount.Value;

            if (updateDto.Description != null)
                income.Description = updateDto.Description;

            income.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteIncome(int id)
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            
            var income = await _context.Incomes.FindAsync(id);
            if (income == null)
            {
                return NotFound();
            }

            _context.Incomes.Remove(income);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("sources")]
        public async Task<ActionResult<IEnumerable<string>>> GetSources()
        {
            var sources = await _context.Incomes
                .Select(i => i.Source)
                .Distinct()
                .OrderBy(s => s)
                .ToListAsync();

            return Ok(sources);
        }

        [HttpGet("summary")]
        public async Task<ActionResult<object>> GetIncomeSummary()
        {
            var totalIncome = await _context.Incomes.SumAsync(i => i.Amount);
            var incomeCount = await _context.Incomes.CountAsync();
            var averageIncome = incomeCount > 0 ? totalIncome / incomeCount : 0;

            var summaryBySource = await _context.Incomes
                .GroupBy(i => i.Source)
                .Select(g => new
                {
                    Source = g.Key,
                    TotalAmount = g.Sum(i => i.Amount),
                    TransactionCount = g.Count()
                })
                .OrderByDescending(x => x.TotalAmount)
                .ToListAsync();

            return Ok(new
            {
                TotalIncome = totalIncome,
                IncomeCount = incomeCount,
                AverageIncome = averageIncome,
                SummaryBySource = summaryBySource
            });
        }
    }
} 