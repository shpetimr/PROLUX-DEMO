using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using backend.Authorization;
using backend.DTOs;
using backend.Services;
using backend.Utilities;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SalaryController : ControllerBase
    {
        private readonly ISalaryService _salaryService;
        private readonly ICurrentUserService _currentUserService;

        public SalaryController(
            ISalaryService salaryService,
            ICurrentUserService currentUserService)
        {
            _salaryService = salaryService;
            _currentUserService = currentUserService;
        }

        [HttpGet("month/{year:int}/{month:int}")]
        [Authorize(Policy = AppPermissions.EmployeesManage)]
        public async Task<ActionResult<IEnumerable<SalaryCalculationDto>>> GetAllForMonth(int year, int month)
        {
            if (!IsValidMonth(month))
            {
                return BadRequest(new { message = "Month must be between 1 and 12." });
            }

            var monthStart = DateTimeUtc.MonthStart(year, month);
            var calculations = await _salaryService.GetSalaryCalculationsForMonthAsync(monthStart);

            return Ok(calculations);
        }

        [HttpGet("me/month/{year:int}/{month:int}")]
        [Authorize(Policy = AppPermissions.WorkersViewOwnSalary)]
        public async Task<ActionResult<SalaryCalculationDto>> GetOwnForMonth(int year, int month)
        {
            if (!IsValidMonth(month))
            {
                return BadRequest(new { message = "Month must be between 1 and 12." });
            }

            var employeeId = _currentUserService.GetCurrentEmployeeId();
            if (!employeeId.HasValue)
            {
                return NotFound(new { message = "Current user is not linked to an employee." });
            }

            try
            {
                var monthStart = DateTimeUtc.MonthStart(year, month);
                var calculation = await _salaryService.GetSalaryCalculationAsync(employeeId.Value, monthStart);

                return Ok(calculation);
            }
            catch (ArgumentException)
            {
                return NotFound(new { message = "Linked employee was not found." });
            }
        }

        private static bool IsValidMonth(int month)
        {
            return month >= 1 && month <= 12;
        }
    }
}
