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
    [Authorize(Policy = AppPermissions.EmployeesManage)]
    public class EmployeesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public EmployeesController(ApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<EmployeeResponseDto>>> GetEmployees()
        {
            // Only admins can see all employees, users can only see their own
            IQueryable<Employee> employeesQuery = _context.Employees
                .Include(e => e.UserAccount)
                .Where(e => !e.IsDeleted);
            
            if (!_currentUserService.IsAdmin())
            {
                // Regular users cannot access employees at all
                return Forbid();
            }
            
            var employees = await employeesQuery
                .OrderBy(e => e.FullName)
                .ToListAsync();

            var response = new List<EmployeeResponseDto>();
            foreach (var e in employees)
            {
                // Calculate comprehensive monthly salary using the new formula
                decimal monthlySalary = e.CalculatedMonthlySalary;
                
                response.Add(new EmployeeResponseDto
                {
                    id = e.Id,
                    fullName = e.FullName,
                    position = e.Position.ToString(),
                    hireDate = e.HireDate,
                    baseSalary = e.BaseSalary,
                    dailyWage = e.DailyWage,
                    daysWorkedThisMonth = e.DaysWorkedThisMonth,
                    halfDaysThisMonth = e.HalfDaysThisMonth,
                    absentDaysThisMonth = e.AbsentDaysThisMonth,
                    totalOvertimeHoursThisMonth = e.TotalOvertimeHoursThisMonth,
                    monthlyBonuses = e.MonthlyBonuses,
                    monthlyPenalties = e.MonthlyPenalties,
                    calculatedDailyBonuses = e.CalculatedDailyBonuses,
                    calculatedDailyPenalties = e.CalculatedDailyPenalties,
                    monthlySalary = monthlySalary,
                    dailyRate = e.DailyRate,
                    overtimeRate = e.OvertimeRate,
                    createdAt = e.CreatedAt,
                    updatedAt = e.UpdatedAt,
                    createdById = e.CreatedById,
                    linkedUserId = e.UserAccount?.Id,
                    linkedUsername = e.UserAccount?.Username,
                    currencyCode = "MKD",
                    currencySymbol = "MKD"
                });
            }

            return Ok(response);
        }

        [HttpGet("available")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<EmployeeResponseDto>>> GetAvailableEmployees()
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }

            var employees = await _context.Employees
                .AsNoTracking()
                .Where(e =>
                    !e.IsDeleted &&
                    !_context.Users.Any(user => user.EmployeeId == e.Id))
                .OrderBy(e => e.FullName)
                .ToListAsync();

            return Ok(employees.Select(e => new EmployeeResponseDto
            {
                id = e.Id,
                fullName = e.FullName,
                position = e.Position.ToString(),
                hireDate = e.HireDate,
                baseSalary = e.BaseSalary,
                dailyWage = e.DailyWage,
                daysWorkedThisMonth = e.DaysWorkedThisMonth,
                halfDaysThisMonth = e.HalfDaysThisMonth,
                absentDaysThisMonth = e.AbsentDaysThisMonth,
                totalOvertimeHoursThisMonth = e.TotalOvertimeHoursThisMonth,
                monthlyBonuses = e.MonthlyBonuses,
                monthlyPenalties = e.MonthlyPenalties,
                calculatedDailyBonuses = e.CalculatedDailyBonuses,
                calculatedDailyPenalties = e.CalculatedDailyPenalties,
                monthlySalary = e.CalculatedMonthlySalary,
                dailyRate = e.DailyRate,
                overtimeRate = e.OvertimeRate,
                createdAt = e.CreatedAt,
                updatedAt = e.UpdatedAt,
                createdById = e.CreatedById,
                linkedUserId = null,
                linkedUsername = null,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            }));
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<EmployeeResponseDto>> GetEmployee(int id)
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            
            var employee = await _context.Employees
                .Include(e => e.UserAccount)
                .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

            if (employee == null)
            {
                return NotFound();
            }

            // Calculate comprehensive monthly salary using the new formula
            decimal monthlySalary = employee.CalculatedMonthlySalary;
            
            var response = new EmployeeResponseDto
            {
                id = employee.Id,
                fullName = employee.FullName,
                position = employee.Position.ToString(),
                hireDate = employee.HireDate,
                baseSalary = employee.BaseSalary,
                dailyWage = employee.DailyWage,
                daysWorkedThisMonth = employee.DaysWorkedThisMonth,
                halfDaysThisMonth = employee.HalfDaysThisMonth,
                absentDaysThisMonth = employee.AbsentDaysThisMonth,
                totalOvertimeHoursThisMonth = employee.TotalOvertimeHoursThisMonth,
                monthlyBonuses = employee.MonthlyBonuses,
                monthlyPenalties = employee.MonthlyPenalties,
                calculatedDailyBonuses = employee.CalculatedDailyBonuses,
                calculatedDailyPenalties = employee.CalculatedDailyPenalties,
                monthlySalary = monthlySalary,
                dailyRate = employee.DailyRate,
                overtimeRate = employee.OvertimeRate,
                createdAt = employee.CreatedAt,
                updatedAt = employee.UpdatedAt,
                createdById = employee.CreatedById,
                linkedUserId = employee.UserAccount?.Id,
                linkedUsername = employee.UserAccount?.Username,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            };

            return Ok(response);
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<EmployeeResponseDto>> Create([FromBody] CreateEmployeeDto dto)
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            
            if (dto == null)
            {
                return BadRequest(new { message = "Request body is required" });
            }
            
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Convert string position to enum
            EmployeePosition position;
            switch (dto.position?.ToLower())
            {
                case "magazine":
                    position = EmployeePosition.Magazine;
                    break;
                case "terren":
                    position = EmployeePosition.Terren;
                    break;
                default:
                    return BadRequest(new { message = $"Invalid position: {dto.position}. Valid positions are: Magazine, Terren" });
            }
            
            // Parse the date string to DateTime
            if (!DateTime.TryParse(dto.hireDate, out DateTime hireDate))
            {
                return BadRequest("Invalid date format. Expected YYYY-MM-DD");
            }
            hireDate = DateTimeUtc.Date(hireDate);
            
            var configuredDailySalary = dto.dailyWage > 0 ? dto.dailyWage : dto.dailyRate;
            var configuredMonthlySalary = dto.baseSalary ??
                configuredDailySalary * SalaryCalculator.StandardWorkingDaysPerMonth;
            var dailyWage = configuredDailySalary;

            var employee = new Employee
            {
                FullName = dto.fullName,
                Position = position,
                HireDate = hireDate,
                BaseSalary = configuredMonthlySalary,
                DailyWage = dailyWage,
                DaysWorkedThisMonth = 0, // Will be calculated from attendance records
                MonthlyBonuses = dto.monthlyBonuses,
                MonthlyPenalties = dto.monthlyPenalties,
                DailyRate = dto.dailyRate, // New salary system
                CreatedAt = DateTime.UtcNow,
                CreatedById = _currentUserService.GetCurrentUserId()
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            // Calculate comprehensive monthly salary using the new formula
            decimal monthlySalary = employee.CalculatedMonthlySalary;
            
            var response = new EmployeeResponseDto
            {
                id = employee.Id,
                fullName = employee.FullName,
                position = employee.Position.ToString(),
                hireDate = employee.HireDate,
                baseSalary = employee.BaseSalary,
                dailyWage = employee.DailyWage,
                daysWorkedThisMonth = employee.DaysWorkedThisMonth,
                halfDaysThisMonth = employee.HalfDaysThisMonth,
                absentDaysThisMonth = employee.AbsentDaysThisMonth,
                totalOvertimeHoursThisMonth = employee.TotalOvertimeHoursThisMonth,
                monthlyBonuses = employee.MonthlyBonuses,
                monthlyPenalties = employee.MonthlyPenalties,
                calculatedDailyBonuses = employee.CalculatedDailyBonuses,
                calculatedDailyPenalties = employee.CalculatedDailyPenalties,
                monthlySalary = monthlySalary,
                dailyRate = employee.DailyRate,
                overtimeRate = employee.OvertimeRate,
                createdAt = employee.CreatedAt,
                updatedAt = employee.UpdatedAt,
                createdById = employee.CreatedById,
                linkedUserId = employee.UserAccount?.Id,
                linkedUsername = employee.UserAccount?.Username,
                currencyCode = "MKD",
                currencySymbol = "MKD"
            };

            return CreatedAtAction(nameof(GetEmployee), new { id = employee.Id }, response);
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateEmployeeDto dto)
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            
            if (dto == null)
            {
                return BadRequest(new { message = "Request body is required" });
            }
            
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            
            var employee = await _context.Employees
                .Include(e => e.UserAccount)
                .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

            if (employee == null)
            {
                return NotFound();
            }

            if (dto.fullName != null)
            {
                employee.FullName = dto.fullName;
                if (employee.UserAccount != null)
                {
                    employee.UserAccount.FullName = dto.fullName;
                }
            }

            if (dto.position != null)
            {
                // Convert string position to enum
                EmployeePosition position;
                switch (dto.position.ToLower())
                {
                    case "magazine":
                        position = EmployeePosition.Magazine;
                        break;
                    case "terren":
                        position = EmployeePosition.Terren;
                        break;
                    default:
                        return BadRequest(new { message = $"Invalid position: {dto.position}. Valid positions are: Magazine, Terren" });
                }
                employee.Position = position;
            }

            if (!string.IsNullOrEmpty(dto.hireDate))
            {
                if (!DateTime.TryParse(dto.hireDate, out DateTime hireDate))
                {
                    return BadRequest("Invalid date format. Expected YYYY-MM-DD");
                }
                employee.HireDate = DateTimeUtc.Date(hireDate);
            }

            if (dto.baseSalary.HasValue)
                employee.BaseSalary = dto.baseSalary.Value;

            if (dto.dailyWage.HasValue)
                employee.DailyWage = dto.dailyWage.Value;

            // Days worked is now calculated from attendance records, not manually set
            // if (dto.daysWorkedThisMonth.HasValue)
            //     employee.DaysWorkedThisMonth = dto.daysWorkedThisMonth.Value;

            if (dto.monthlyBonuses.HasValue)
                employee.MonthlyBonuses = dto.monthlyBonuses.Value;

            if (dto.monthlyPenalties.HasValue)
                employee.MonthlyPenalties = dto.monthlyPenalties.Value;

            if (dto.dailyRate.HasValue)
                employee.DailyRate = dto.dailyRate.Value;

            employee.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            var employee = await _context.Employees
                .Include(e => e.UserAccount)
                .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
            if (employee == null)
            {
                return NotFound();
            }

            var linkedUser = employee.UserAccount;
            if (linkedUser?.Role == UserRole.Admin)
            {
                return BadRequest(new { message = "This employee is linked to an admin account and cannot be deleted from Employees." });
            }

            var deletedAt = DateTime.UtcNow;
            await using var transaction = await _context.Database.BeginTransactionAsync();

            employee.IsDeleted = true;
            employee.DeletedAt = deletedAt;
            employee.UpdatedAt = deletedAt;

            if (linkedUser != null)
            {
                linkedUser.IsActive = false;
                linkedUser.DeactivatedAt = deletedAt;
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return NoContent();
        }

        [HttpGet("positions")]
        public ActionResult<IEnumerable<string>> GetPositions()
        {
            var positions = Enum.GetValues(typeof(EmployeePosition))
                .Cast<EmployeePosition>()
                .Select(p => p.ToString());

            return Ok(positions);
        }
    }
} 
