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
    [Authorize(Policy = AppPermissions.ExpensesManage)]
    public class ExpensesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public ExpensesController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<ExpenseResponseDto>>> GetExpenses()
        {
            // Admin can see all expenses, users can only see their own
            IQueryable<Expense> expensesQuery = _context.Expenses;
            
            if (!_currentUserService.IsAdmin())
            {
                // Regular users can only see expenses they created
                expensesQuery = expensesQuery.Where(e => e.CreatedById == _currentUserService.GetCurrentUserId());
            }
            
            var expenses = await expensesQuery
                .OrderByDescending(e => e.Date)
                .ToListAsync();

            var response = expenses.Select(e => new ExpenseResponseDto
            {
                id = e.Id,
                expenseType = e.ExpenseType,
                date = e.Date,
                amount = e.Amount,
                description = e.Description,
                createdAt = e.CreatedAt,
                updatedAt = e.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            });

            return Ok(response);
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<ExpenseResponseDto>> GetExpense(int id)
        {
            var expense = await _context.Expenses.FindAsync(id);

            if (expense == null)
            {
                return NotFound();
            }

            // Check if user has access to this expense
            if (!_currentUserService.IsAdmin() && expense.CreatedById != _currentUserService.GetCurrentUserId())
            {
                return Forbid();
            }

            var response = new ExpenseResponseDto
            {
                id = expense.Id,
                expenseType = expense.ExpenseType,
                date = expense.Date,
                amount = expense.Amount,
                description = expense.Description,
                createdAt = expense.CreatedAt,
                updatedAt = expense.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            };

            return Ok(response);
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<ExpenseResponseDto>> CreateExpense(CreateExpenseDto createDto)
        {
            // Parse the date string to DateTime
            if (!DateTime.TryParse(createDto.date, out DateTime expenseDate))
            {
                return BadRequest("Invalid date format. Expected YYYY-MM-DD");
            }
            expenseDate = DateTimeUtc.Date(expenseDate);
            
            var expense = new Expense
            {
                ExpenseType = createDto.expenseType,
                Date = expenseDate,
                Amount = createDto.amount,
                Description = createDto.description,
                CreatedAt = DateTime.UtcNow,
                CreatedById = _currentUserService.GetCurrentUserId()
            };

            _context.Expenses.Add(expense);
            await _context.SaveChangesAsync();

            var response = new ExpenseResponseDto
            {
                id = expense.Id,
                expenseType = expense.ExpenseType,
                date = expense.Date,
                amount = expense.Amount,
                description = expense.Description,
                createdAt = expense.CreatedAt,
                updatedAt = expense.UpdatedAt,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            };

            return CreatedAtAction(nameof(GetExpense), new { id = expense.Id }, response);
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateExpense(int id, UpdateExpenseDto updateDto)
        {
            var expense = await _context.Expenses.FindAsync(id);

            if (expense == null)
            {
                return NotFound();
            }

            // Check if user has access to this expense
            if (!_currentUserService.IsAdmin() && expense.CreatedById != _currentUserService.GetCurrentUserId())
            {
                return Forbid();
            }

            if (updateDto.expenseType != null)
                expense.ExpenseType = updateDto.expenseType;

            if (!string.IsNullOrEmpty(updateDto.date))
            {
                // Parse the date string to DateTime
                if (DateTime.TryParse(updateDto.date, out DateTime newExpenseDate))
                {
                    expense.Date = DateTimeUtc.Date(newExpenseDate);
                }
                else
                {
                    return BadRequest("Invalid date format. Expected YYYY-MM-DD");
                }
            }

            if (updateDto.amount.HasValue)
                expense.Amount = updateDto.amount.Value;

            if (updateDto.description != null)
                expense.Description = updateDto.description;

            expense.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteExpense(int id)
        {
            var expense = await _context.Expenses.FindAsync(id);
            if (expense == null)
            {
                return NotFound();
            }

            // Check if user has access to this expense
            if (!_currentUserService.IsAdmin() && expense.CreatedById != _currentUserService.GetCurrentUserId())
            {
                return Forbid();
            }

            _context.Expenses.Remove(expense);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("types")]
        public async Task<ActionResult<IEnumerable<string>>> GetExpenseTypes()
        {
            var types = await GetAccessibleExpenses()
                .Select(e => e.ExpenseType)
                .Distinct()
                .OrderBy(t => t)
                .ToListAsync();

            return Ok(types);
        }

        [HttpGet("summary")]
        public async Task<ActionResult<object>> GetExpenseSummary()
        {
            var expensesQuery = GetAccessibleExpenses();
            var totalExpenses = await expensesQuery.SumAsync(e => e.Amount);
            var expenseCount = await expensesQuery.CountAsync();
            var averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

            var summaryByType = await expensesQuery
                .GroupBy(e => e.ExpenseType)
                .Select(g => new
                {
                    Type = g.Key,
                    Total = g.Sum(e => e.Amount),
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Total)
                .ToListAsync();

            return Ok(new
            {
                TotalExpenses = totalExpenses,
                ExpenseCount = expenseCount,
                AverageExpense = averageExpense,
                SummaryByType = summaryByType
            });
        }

        // New endpoints for enhanced expense calculations and reporting

        [HttpGet("calculations/daily")]
        [Authorize]
        public async Task<ActionResult<object>> GetDailyExpenseCalculations([FromQuery] DateTime? date = null)
        {
            var targetDate = DateTimeUtc.Date(date ?? DateTime.UtcNow);
            var startOfDay = targetDate;
            var endOfDay = startOfDay.AddDays(1);

            var dailyExpenses = await GetAccessibleExpenses()
                .Where(e => e.Date >= startOfDay && e.Date < endOfDay)
                .ToListAsync();

            var totalAmount = dailyExpenses.Sum(e => e.Amount);
            var expenseCount = dailyExpenses.Count;

            var expensesByType = dailyExpenses
                .GroupBy(e => e.ExpenseType)
                .Select(g => new
                {
                    Type = g.Key,
                    Total = g.Sum(e => e.Amount),
                    Count = g.Count(),
                    Percentage = totalAmount > 0 ? (g.Sum(e => e.Amount) / totalAmount) * 100 : 0
                })
                .OrderByDescending(x => x.Total)
                .ToList();

            var hourlyBreakdown = Enumerable.Range(0, 24)
                .Select(hour => new
                {
                    Hour = hour,
                    Amount = dailyExpenses.Where(e => e.Date.Hour == hour).Sum(e => e.Amount),
                    Count = dailyExpenses.Count(e => e.Date.Hour == hour)
                })
                .Where(x => x.Count > 0)
                .ToList();

            return Ok(new
            {
                Date = targetDate,
                TotalAmount = totalAmount,
                ExpenseCount = expenseCount,
                AverageAmount = expenseCount > 0 ? totalAmount / expenseCount : 0,
                ExpensesByType = expensesByType,
                HourlyBreakdown = hourlyBreakdown,
                Expenses = dailyExpenses.Select(e => new
                {
                    e.Id,
                    e.ExpenseType,
                    e.Amount,
                    e.Date,
                    e.Description
                })
            });
        }

        [HttpGet("calculations/weekly")]
        [Authorize]
        public async Task<ActionResult<object>> GetWeeklyExpenseCalculations([FromQuery] DateTime? startDate = null)
        {
            var targetDate = DateTimeUtc.Date(startDate ?? DateTime.UtcNow);
            var startOfWeek = targetDate.AddDays(-(int)targetDate.DayOfWeek);
            var endOfWeek = startOfWeek.AddDays(7);

            var weeklyExpenses = await GetAccessibleExpenses()
                .Where(e => e.Date >= startOfWeek && e.Date < endOfWeek)
                .ToListAsync();

            var totalAmount = weeklyExpenses.Sum(e => e.Amount);
            var expenseCount = weeklyExpenses.Count;

            var expensesByType = weeklyExpenses
                .GroupBy(e => e.ExpenseType)
                .Select(g => new
                {
                    Type = g.Key,
                    Total = g.Sum(e => e.Amount),
                    Count = g.Count(),
                    Percentage = totalAmount > 0 ? (g.Sum(e => e.Amount) / totalAmount) * 100 : 0
                })
                .OrderByDescending(x => x.Total)
                .ToList();

            var dailyBreakdown = Enumerable.Range(0, 7)
                .Select(dayOffset => new
                {
                    Date = startOfWeek.AddDays(dayOffset),
                    DayOfWeek = startOfWeek.AddDays(dayOffset).DayOfWeek.ToString(),
                    Amount = weeklyExpenses.Where(e => e.Date.Date == startOfWeek.AddDays(dayOffset).Date).Sum(e => e.Amount),
                    Count = weeklyExpenses.Count(e => e.Date.Date == startOfWeek.AddDays(dayOffset).Date)
                })
                .ToList();

            return Ok(new
            {
                WeekStart = startOfWeek,
                WeekEnd = endOfWeek.AddDays(-1),
                TotalAmount = totalAmount,
                ExpenseCount = expenseCount,
                AverageAmount = expenseCount > 0 ? totalAmount / expenseCount : 0,
                DailyAverage = totalAmount / 7,
                ExpensesByType = expensesByType,
                DailyBreakdown = dailyBreakdown,
                Expenses = weeklyExpenses.Select(e => new
                {
                    e.Id,
                    e.ExpenseType,
                    e.Amount,
                    e.Date,
                    e.Description
                })
            });
        }

        [HttpGet("calculations/monthly")]
        [Authorize]
        public async Task<ActionResult<object>> GetMonthlyExpenseCalculations([FromQuery] int? year = null, [FromQuery] int? month = null)
        {
            var targetYear = year ?? DateTime.UtcNow.Year;
            var targetMonth = month ?? DateTime.UtcNow.Month;
            
            var startOfMonth = DateTimeUtc.MonthStart(targetYear, targetMonth);
            var endOfMonth = startOfMonth.AddMonths(1);

            var monthlyExpenses = await GetAccessibleExpenses()
                .Where(e => e.Date >= startOfMonth && e.Date < endOfMonth)
                .ToListAsync();

            var totalAmount = monthlyExpenses.Sum(e => e.Amount);
            var expenseCount = monthlyExpenses.Count;

            var expensesByType = monthlyExpenses
                .GroupBy(e => e.ExpenseType)
                .Select(g => new
                {
                    Type = g.Key,
                    Total = g.Sum(e => e.Amount),
                    Count = g.Count(),
                    Percentage = totalAmount > 0 ? (g.Sum(e => e.Amount) / totalAmount) * 100 : 0
                })
                .OrderByDescending(x => x.Total)
                .ToList();

            var weeklyBreakdown = Enumerable.Range(0, 6)
                .Select(weekOffset => new
                {
                    WeekNumber = weekOffset + 1,
                    StartDate = startOfMonth.AddDays(weekOffset * 7),
                    EndDate = startOfMonth.AddDays((weekOffset + 1) * 7 - 1),
                    Amount = monthlyExpenses.Where(e => 
                        e.Date >= startOfMonth.AddDays(weekOffset * 7) && 
                        e.Date < startOfMonth.AddDays((weekOffset + 1) * 7)).Sum(e => e.Amount),
                    Count = monthlyExpenses.Count(e => 
                        e.Date >= startOfMonth.AddDays(weekOffset * 7) && 
                        e.Date < startOfMonth.AddDays((weekOffset + 1) * 7))
                })
                .Where(x => x.Count > 0)
                .ToList();

            var dailyBreakdown = Enumerable.Range(0, DateTime.DaysInMonth(targetYear, targetMonth))
                .Select(dayOffset => new
                {
                    Date = startOfMonth.AddDays(dayOffset),
                    DayOfMonth = dayOffset + 1,
                    Amount = monthlyExpenses.Where(e => e.Date.Date == startOfMonth.AddDays(dayOffset).Date).Sum(e => e.Amount),
                    Count = monthlyExpenses.Count(e => e.Date.Date == startOfMonth.AddDays(dayOffset).Date)
                })
                .Where(x => x.Count > 0)
                .ToList();

            return Ok(new
            {
                Year = targetYear,
                Month = targetMonth,
                MonthName = startOfMonth.ToString("MMMM"),
                TotalAmount = totalAmount,
                ExpenseCount = expenseCount,
                AverageAmount = expenseCount > 0 ? totalAmount / expenseCount : 0,
                DailyAverage = totalAmount / DateTime.DaysInMonth(targetYear, targetMonth),
                WeeklyAverage = totalAmount / 4.33m, // Average weeks per month
                ExpensesByType = expensesByType,
                WeeklyBreakdown = weeklyBreakdown,
                DailyBreakdown = dailyBreakdown,
                Expenses = monthlyExpenses.Select(e => new
                {
                    e.Id,
                    e.ExpenseType,
                    e.Amount,
                    e.Date,
                    e.Description
                })
            });
        }

        [HttpGet("calculations/period")]
        [Authorize]
        public async Task<ActionResult<object>> GetExpenseCalculationsForPeriod(
            [FromQuery] DateTime startDate, 
            [FromQuery] DateTime endDate)
        {
            startDate = DateTimeUtc.Date(startDate);
            endDate = DateTimeUtc.Date(endDate);
            var endExclusive = endDate.AddDays(1);

            var periodExpenses = await GetAccessibleExpenses()
                .Where(e => e.Date >= startDate && e.Date < endExclusive)
                .ToListAsync();

            var totalAmount = periodExpenses.Sum(e => e.Amount);
            var expenseCount = periodExpenses.Count;
            var daysInPeriod = (endDate - startDate).Days + 1;

            var expensesByType = periodExpenses
                .GroupBy(e => e.ExpenseType)
                .Select(g => new
                {
                    Type = g.Key,
                    Total = g.Sum(e => e.Amount),
                    Count = g.Count(),
                    Percentage = totalAmount > 0 ? (g.Sum(e => e.Amount) / totalAmount) * 100 : 0
                })
                .OrderByDescending(x => x.Total)
                .ToList();

            var dailyBreakdown = periodExpenses
                .GroupBy(e => e.Date.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    Amount = g.Sum(e => e.Amount),
                    Count = g.Count()
                })
                .OrderBy(x => x.Date)
                .ToList();

            return Ok(new
            {
                StartDate = startDate,
                EndDate = endDate,
                PeriodDays = daysInPeriod,
                TotalAmount = totalAmount,
                ExpenseCount = expenseCount,
                AverageAmount = expenseCount > 0 ? totalAmount / expenseCount : 0,
                DailyAverage = totalAmount / daysInPeriod,
                ExpensesByType = expensesByType,
                DailyBreakdown = dailyBreakdown,
                Expenses = periodExpenses.Select(e => new
                {
                    e.Id,
                    e.ExpenseType,
                    e.Amount,
                    e.Date,
                    e.Description
                })
            });
        }

        [HttpGet("trends")]
        [Authorize]
        public async Task<ActionResult<object>> GetExpenseTrends([FromQuery] int months = 6)
        {
            var endDate = DateTimeUtc.Today();
            var startDate = endDate.AddMonths(-months);
            var endExclusive = endDate.AddDays(1);

            var expensesQuery = GetAccessibleExpenses();

            var expenses = await expensesQuery
                .Where(e => e.Date >= startDate && e.Date < endExclusive)
                .ToListAsync();

            var monthlyTrends = expenses
                .GroupBy(e => new { e.Date.Year, e.Date.Month })
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    MonthName = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMMM yyyy"),
                    TotalAmount = g.Sum(e => e.Amount),
                    ExpenseCount = g.Count(),
                    AverageAmount = g.Average(e => e.Amount)
                })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ToList();

            var typeTrends = expenses
                .GroupBy(e => new { e.ExpenseType, e.Date.Year, e.Date.Month })
                .Select(g => new
                {
                    Type = g.Key.ExpenseType,
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    TotalAmount = g.Sum(e => e.Amount),
                    Count = g.Count()
                })
                .OrderBy(x => x.Type)
                .ThenBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ToList();

            return Ok(new
            {
                Period = $"{months} months",
                StartDate = startDate,
                EndDate = endDate,
                MonthlyTrends = monthlyTrends,
                TypeTrends = typeTrends
            });
        }

        private IQueryable<Expense> GetAccessibleExpenses()
        {
            IQueryable<Expense> expensesQuery = _context.Expenses;

            if (!_currentUserService.IsAdmin())
            {
                var currentUserId = _currentUserService.GetCurrentUserId();
                expensesQuery = expensesQuery.Where(e => e.CreatedById == currentUserId);
            }

            return expensesQuery;
        }
    }
} 
