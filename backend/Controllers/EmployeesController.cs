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
            IQueryable<Employee> employeesQuery = _context.Employees;
            
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
                    currencyCode = "MKD",
                    currencySymbol = "MKD"
                });
            }

            return Ok(response);
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<EmployeeResponseDto>> GetEmployee(int id)
        {
            if (!_currentUserService.IsAdmin())
            {
                return Forbid();
            }
            
            var employee = await _context.Employees.FindAsync(id);

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
            
            Console.WriteLine("=== EMPLOYEE CREATE ENDPOINT HIT ===");
            Console.WriteLine($"ModelState.IsValid: {ModelState.IsValid}");
            Console.WriteLine($"Received DTO: fullName={dto.fullName}, position={dto.position}, hireDate={dto.hireDate}, dailyWage={dto.dailyWage}");
            
            if (dto == null)
            {
                return BadRequest(new { message = "Request body is required" });
            }
            
            if (!ModelState.IsValid)
            {
                Console.WriteLine("=== MODEL STATE ERRORS ===");
                foreach (var key in ModelState.Keys)
                {
                    var errors = ModelState[key]?.Errors;
                    if (errors == null)
                    {
                        continue;
                    }

                    foreach (var error in errors)
                    {
                        Console.WriteLine($"ModelState error for {key}: {error.ErrorMessage}");
                    }
                }
                return BadRequest(ModelState);
            }

            Console.WriteLine("=== CREATING EMPLOYEE ===");
            
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
            
            var employee = new Employee
            {
                FullName = dto.fullName,
                Position = position,
                HireDate = hireDate,
                BaseSalary = 0, // Set to 0 since we're not using base salary anymore
                DailyWage = dto.dailyWage,
                DaysWorkedThisMonth = 0, // Will be calculated from attendance records
                MonthlyBonuses = dto.monthlyBonuses,
                MonthlyPenalties = dto.monthlyPenalties,
                DailyRate = dto.dailyRate, // New salary system
                CreatedAt = DateTime.UtcNow,
                CreatedById = _currentUserService.GetCurrentUserId()
            };

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            Console.WriteLine($"=== EMPLOYEE CREATED SUCCESSFULLY - ID: {employee.Id} ===");

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
            
            var employee = await _context.Employees.FindAsync(id);

            if (employee == null)
            {
                return NotFound();
            }

            Console.WriteLine($"=== UPDATING EMPLOYEE {id} ===");
            Console.WriteLine($"Received DTO - dailyWage: {dto.dailyWage}");
            Console.WriteLine($"Before update - dailyWage: {employee.DailyWage}");

            if (dto.fullName != null)
                employee.FullName = dto.fullName;

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
                employee.HireDate = hireDate;
            }

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

            Console.WriteLine($"After update - dailyWage: {employee.DailyWage}");

            await _context.SaveChangesAsync();

            Console.WriteLine($"=== EMPLOYEE UPDATED SUCCESSFULLY ===");

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
            var employee = await _context.Employees.FindAsync(id);
            if (employee == null)
            {
                return NotFound();
            }

            _context.Employees.Remove(employee);
            await _context.SaveChangesAsync();

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
