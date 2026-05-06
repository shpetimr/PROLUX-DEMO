using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backend.Authorization;
using backend.Data;
using backend.Models;
using backend.DTOs;
using backend.Services;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = AppPermissions.DebtsManage)]
    public class DebtsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public DebtsController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<DebtResponseDto>>> GetDebts([FromQuery] DebtType? type = null)
        {
            // Admin can see all debts, users can only see their own
            IQueryable<Debt> debtsQuery = _context.Debts;
            
            if (!_currentUserService.IsAdmin())
            {
                // Regular users can only see debts they created
                debtsQuery = debtsQuery.Where(d => d.CreatedById == _currentUserService.GetCurrentUserId());
            }
            
            // Filter by type if specified
            if (type.HasValue)
            {
                debtsQuery = debtsQuery.Where(d => d.Type == type.Value);
            }
            
            var debts = await debtsQuery
                .OrderByDescending(d => d.DueDate)
                .ToListAsync();

            var response = debts.Select(d => new DebtResponseDto
            {
                id = d.Id,
                debtorName = d.DebtorName,
                type = d.Type,
                amount = d.Amount,
                dueDate = d.DueDate,
                description = d.Description,
                isPaid = d.IsPaid,
                paidDate = d.PaidDate,
                createdAt = d.CreatedAt,
                updatedAt = d.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            });

            return Ok(response);
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<DebtResponseDto>> GetDebt(int id)
        {
            var debt = await _context.Debts.FindAsync(id);

            if (debt == null)
            {
                return NotFound();
            }

            // Check if user has access to this debt
            if (!_currentUserService.IsAdmin() && debt.CreatedById != _currentUserService.GetCurrentUserId())
            {
                return Forbid();
            }

            var response = new DebtResponseDto
            {
                id = debt.Id,
                debtorName = debt.DebtorName,
                type = debt.Type,
                amount = debt.Amount,
                dueDate = debt.DueDate,
                description = debt.Description,
                isPaid = debt.IsPaid,
                paidDate = debt.PaidDate,
                createdAt = debt.CreatedAt,
                updatedAt = debt.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            };

            return Ok(response);
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<DebtResponseDto>> CreateDebt(CreateDebtDto createDto)
        {
            // Parse the date string to DateTime
            if (!DateTime.TryParse(createDto.dueDate, out DateTime dueDate))
            {
                return BadRequest("Invalid date format. Expected YYYY-MM-DD");
            }
            
            var debt = new Debt
            {
                DebtorName = createDto.debtorName,
                Type = createDto.type,
                Amount = createDto.amount,
                DueDate = dueDate, // Use parsed date
                Description = createDto.description,
                CreatedAt = DateTime.UtcNow,
                CreatedById = _currentUserService.GetCurrentUserId()
            };

            _context.Debts.Add(debt);
            await _context.SaveChangesAsync();

            var response = new DebtResponseDto
            {
                id = debt.Id,
                debtorName = debt.DebtorName,
                type = debt.Type,
                amount = debt.Amount,
                dueDate = debt.DueDate,
                description = debt.Description,
                isPaid = debt.IsPaid,
                paidDate = debt.PaidDate,
                createdAt = debt.CreatedAt,
                updatedAt = debt.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            };

            return CreatedAtAction(nameof(GetDebt), new { id = debt.Id }, response);
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateDebt(int id, UpdateDebtDto updateDto)
        {
            var debt = await _context.Debts.FindAsync(id);

            if (debt == null)
            {
                return NotFound();
            }

            // Check if user has access to this debt
            if (!_currentUserService.IsAdmin() && debt.CreatedById != _currentUserService.GetCurrentUserId())
            {
                return Forbid();
            }

            if (updateDto.debtorName != null)
                debt.DebtorName = updateDto.debtorName;

            if (updateDto.type.HasValue)
                debt.Type = updateDto.type.Value;

            if (updateDto.amount.HasValue)
                debt.Amount = updateDto.amount.Value;

            if (!string.IsNullOrEmpty(updateDto.dueDate))
            {
                // Parse the date string to DateTime
                if (DateTime.TryParse(updateDto.dueDate, out DateTime newDueDate))
                {
                    debt.DueDate = newDueDate;
                }
                else
                {
                    return BadRequest("Invalid date format. Expected YYYY-MM-DD");
                }
            }

            if (updateDto.description != null)
                debt.Description = updateDto.description;

            if (updateDto.isPaid.HasValue)
            {
                debt.IsPaid = updateDto.isPaid.Value;
                if (updateDto.isPaid.Value)
                {
                    // Parse paid date if provided, otherwise use current time
                    if (!string.IsNullOrEmpty(updateDto.paidDate))
                    {
                        if (DateTime.TryParse(updateDto.paidDate, out DateTime paidDate))
                        {
                            debt.PaidDate = paidDate;
                        }
                        else
                        {
                            return BadRequest("Invalid paid date format. Expected YYYY-MM-DD");
                        }
                    }
                    else
                    {
                        debt.PaidDate = DateTime.UtcNow;
                    }
                }
                else
                {
                    debt.PaidDate = null;
                }
            }

            debt.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteDebt(int id)
        {
            var debt = await _context.Debts.FindAsync(id);
            if (debt == null)
            {
                return NotFound();
            }

            // Check if user has access to this debt
            if (!_currentUserService.IsAdmin() && debt.CreatedById != _currentUserService.GetCurrentUserId())
            {
                return Forbid();
            }

            _context.Debts.Remove(debt);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("summary")]
        [Authorize]
        public async Task<ActionResult<DebtSummaryDto>> GetDebtSummary()
        {
            try
            {
                IQueryable<Debt> debtsQuery = _context.Debts;
                
                if (!_currentUserService.IsAdmin())
                {
                    debtsQuery = debtsQuery.Where(d => d.CreatedById == _currentUserService.GetCurrentUserId());
                }

                var owedToCompanyDebts = await debtsQuery
                    .Where(d => d.Type == DebtType.OwedToCompany && !d.IsPaid)
                    .ToListAsync();

                var companyOwesDebts = await debtsQuery
                    .Where(d => d.Type == DebtType.CompanyOwes && !d.IsPaid)
                    .ToListAsync();

                var totalOwedToCompany = owedToCompanyDebts.Sum(d => d.Amount);
                var totalCompanyOwes = companyOwesDebts.Sum(d => d.Amount);

                var totalDebts = await debtsQuery.CountAsync();
                var paidDebts = await debtsQuery.CountAsync(d => d.IsPaid);
                var unpaidDebts = await debtsQuery.CountAsync(d => !d.IsPaid);
                var overdueDebts = await debtsQuery.CountAsync(d => !d.IsPaid && d.DueDate < DateTime.Today);

                var summary = new DebtSummaryDto
                {
                    totalOwedToCompany = totalOwedToCompany,
                    totalCompanyOwes = totalCompanyOwes,
                    netDebt = totalOwedToCompany - totalCompanyOwes,
                    totalDebts = totalDebts,
                    paidDebts = paidDebts,
                    unpaidDebts = unpaidDebts,
                    overdueDebts = overdueDebts,
                    currencyCode = "MKD",
                    currencySymbol = "MKD"
                };

                return Ok(summary);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpGet("breakdown")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<DebtTypeBreakdownDto>>> GetDebtBreakdown()
        {
            try
            {
                IQueryable<Debt> debtsQuery = _context.Debts;
                
                if (!_currentUserService.IsAdmin())
                {
                    debtsQuery = debtsQuery.Where(d => d.CreatedById == _currentUserService.GetCurrentUserId());
                }

                var debts = await debtsQuery.ToListAsync();
                var breakdown = debts
                    .GroupBy(d => d.Type)
                    .Select(g => new DebtTypeBreakdownDto
                    {
                        type = g.Key,
                        totalAmount = g.Sum(d => d.Amount),
                        count = g.Count(),
                        paidCount = g.Count(d => d.IsPaid),
                        unpaidCount = g.Count(d => !d.IsPaid),
                        overdueCount = g.Count(d => !d.IsPaid && d.DueDate < DateTime.Today),
                        currencyCode = "MKD",
                        currencySymbol = "MKD"
                    })
                    .ToList();

                return Ok(breakdown);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpGet("overdue")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<DebtResponseDto>>> GetOverdueDebts()
        {
            IQueryable<Debt> debtsQuery = _context.Debts
                .Where(d => !d.IsPaid && d.DueDate < DateTime.Today);
            
            if (!_currentUserService.IsAdmin())
            {
                debtsQuery = debtsQuery.Where(d => d.CreatedById == _currentUserService.GetCurrentUserId());
            }
            
            var overdueDebts = await debtsQuery
                .OrderBy(d => d.DueDate)
                .ToListAsync();

            var response = overdueDebts.Select(d => new DebtResponseDto
            {
                id = d.Id,
                debtorName = d.DebtorName,
                type = d.Type,
                amount = d.Amount,
                dueDate = d.DueDate,
                description = d.Description,
                isPaid = d.IsPaid,
                paidDate = d.PaidDate,
                createdAt = d.CreatedAt,
                updatedAt = d.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            });

            return Ok(response);
        }
    }
} 
