using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.DTOs;
using System.Security.Claims;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AttendanceController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AttendanceController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/attendance/employee/{employeeId}/month/{year}/{month}
        [HttpGet("employee/{employeeId}/month/{year}/{month}")]
        public async Task<ActionResult<MonthlyAttendanceDto>> GetMonthlyAttendance(int employeeId, int year, int month)
        {
            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee == null)
                return NotFound("Punëtori nuk u gjet");

            var startDate = new DateTime(year, month, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);

            var attendanceRecords = await _context.AttendanceRecords
                .Where(a => a.EmployeeId == employeeId && a.Date >= startDate && a.Date <= endDate)
                .OrderBy(a => a.Date)
                .ToListAsync();

            var daysWorked = attendanceRecords.Count(a => a.IsPresent && !a.IsHalfDay);
            var halfDays = attendanceRecords.Count(a => a.IsPresent && a.IsHalfDay);
            var absentDays = attendanceRecords.Count(a => !a.IsPresent);
            var totalOvertimeHours = attendanceRecords.Sum(a => a.OvertimeHours ?? 0);
            var totalDailyBonuses = attendanceRecords.Sum(a => a.DailyBonus ?? 0);
            var totalDailyPenalties = attendanceRecords.Sum(a => a.DailyPenalty ?? 0);
            var totalDaysInMonth = DateTime.DaysInMonth(year, month);

            var dailyRecords = attendanceRecords.Select(a => new AttendanceDto
            {
                Id = a.Id,
                EmployeeId = a.EmployeeId,
                EmployeeName = employee.FullName,
                Date = a.Date,
                IsPresent = a.IsPresent,
                Notes = a.Notes,
                DailyBonus = a.DailyBonus,
                DailyPenalty = a.DailyPenalty,
                AbsenceReason = a.AbsenceReason,
                IsHalfDay = a.IsHalfDay,
                OvertimeHours = a.OvertimeHours,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt
            }).ToList();

            return new MonthlyAttendanceDto
            {
                EmployeeId = employeeId,
                EmployeeName = employee.FullName,
                Year = year,
                Month = month,
                DaysWorked = daysWorked,
                HalfDays = halfDays,
                AbsentDays = absentDays,
                TotalOvertimeHours = totalOvertimeHours,
                TotalDailyBonuses = totalDailyBonuses,
                TotalDailyPenalties = totalDailyPenalties,
                TotalDaysInMonth = totalDaysInMonth,
                DailyRecords = dailyRecords
            };
        }

        // GET: api/attendance/month/{year}/{month}
        [HttpGet("month/{year}/{month}")]
        public async Task<ActionResult<List<MonthlyAttendanceDto>>> GetMonthlyAttendanceForAllEmployees(int year, int month)
        {
            var startDate = new DateTime(year, month, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);

            var employees = await _context.Employees.ToListAsync();
            var result = new List<MonthlyAttendanceDto>();

            foreach (var employee in employees)
            {
                var attendanceRecords = await _context.AttendanceRecords
                    .Where(a => a.EmployeeId == employee.Id && a.Date >= startDate && a.Date <= endDate)
                    .OrderBy(a => a.Date)
                    .ToListAsync();

                var daysWorked = attendanceRecords.Count(a => a.IsPresent);
                var totalDaysInMonth = DateTime.DaysInMonth(year, month);

                var dailyRecords = attendanceRecords.Select(a => new AttendanceDto
                {
                    Id = a.Id,
                    EmployeeId = a.EmployeeId,
                    EmployeeName = employee.FullName,
                    Date = a.Date,
                    IsPresent = a.IsPresent,
                    Notes = a.Notes,
                    CreatedAt = a.CreatedAt,
                    UpdatedAt = a.UpdatedAt
                }).ToList();

                result.Add(new MonthlyAttendanceDto
                {
                    EmployeeId = employee.Id,
                    EmployeeName = employee.FullName,
                    Year = year,
                    Month = month,
                    DaysWorked = daysWorked,
                    TotalDaysInMonth = totalDaysInMonth,
                    DailyRecords = dailyRecords
                });
            }

            return result;
        }

        // POST: api/attendance
        [HttpPost]
        public async Task<ActionResult<AttendanceDto>> CreateAttendance(CreateAttendanceDto createDto)
        {
            var employee = await _context.Employees.FindAsync(createDto.EmployeeId);
            if (employee == null)
                return NotFound("Punëtori nuk u gjet");

            // Check if attendance record already exists for this date and employee
            var existingRecord = await _context.AttendanceRecords
                .FirstOrDefaultAsync(a => a.EmployeeId == createDto.EmployeeId && a.Date.Date == createDto.Date.Date);

            if (existingRecord != null)
                return BadRequest("Regjistrimi i pranisë për këtë datë ekziston tashmë");

            var attendanceRecord = new AttendanceRecord
            {
                EmployeeId = createDto.EmployeeId,
                Date = createDto.Date.Date,
                IsPresent = createDto.IsPresent,
                Notes = createDto.Notes,
                DailyBonus = createDto.DailyBonus ?? 0,
                DailyPenalty = createDto.DailyPenalty ?? 0,
                AbsenceReason = createDto.AbsenceReason,
                IsHalfDay = createDto.IsHalfDay,
                OvertimeHours = createDto.OvertimeHours ?? 0
            };

            _context.AttendanceRecords.Add(attendanceRecord);
            await _context.SaveChangesAsync();

            // Update employee's comprehensive data for the current month
            await UpdateEmployeeComprehensiveData(createDto.EmployeeId, createDto.Date.Year, createDto.Date.Month);

            return new AttendanceDto
            {
                Id = attendanceRecord.Id,
                EmployeeId = attendanceRecord.EmployeeId,
                EmployeeName = employee.FullName,
                Date = attendanceRecord.Date,
                IsPresent = attendanceRecord.IsPresent,
                Notes = attendanceRecord.Notes,
                DailyBonus = attendanceRecord.DailyBonus,
                DailyPenalty = attendanceRecord.DailyPenalty,
                AbsenceReason = attendanceRecord.AbsenceReason,
                IsHalfDay = attendanceRecord.IsHalfDay,
                OvertimeHours = attendanceRecord.OvertimeHours,
                CreatedAt = attendanceRecord.CreatedAt,
                UpdatedAt = attendanceRecord.UpdatedAt
            };
        }

        // PUT: api/attendance/{id}
        [HttpPut("{id}")]
        public async Task<ActionResult<AttendanceDto>> UpdateAttendance(int id, UpdateAttendanceDto updateDto)
        {
            var attendanceRecord = await _context.AttendanceRecords.FindAsync(id);
            if (attendanceRecord == null)
                return NotFound("Regjistrimi i pranisë nuk u gjet");

            attendanceRecord.IsPresent = updateDto.IsPresent;
            attendanceRecord.Notes = updateDto.Notes;
            attendanceRecord.DailyBonus = updateDto.DailyBonus ?? 0;
            attendanceRecord.DailyPenalty = updateDto.DailyPenalty ?? 0;
            attendanceRecord.AbsenceReason = updateDto.AbsenceReason;
            attendanceRecord.IsHalfDay = updateDto.IsHalfDay;
            attendanceRecord.OvertimeHours = updateDto.OvertimeHours ?? 0;
            attendanceRecord.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Update employee's comprehensive data for the current month
            await UpdateEmployeeComprehensiveData(attendanceRecord.EmployeeId, attendanceRecord.Date.Year, attendanceRecord.Date.Month);

            var employee = await _context.Employees.FindAsync(attendanceRecord.EmployeeId);

            return new AttendanceDto
            {
                Id = attendanceRecord.Id,
                EmployeeId = attendanceRecord.EmployeeId,
                EmployeeName = employee?.FullName ?? "",
                Date = attendanceRecord.Date,
                IsPresent = attendanceRecord.IsPresent,
                Notes = attendanceRecord.Notes,
                DailyBonus = attendanceRecord.DailyBonus,
                DailyPenalty = attendanceRecord.DailyPenalty,
                AbsenceReason = attendanceRecord.AbsenceReason,
                IsHalfDay = attendanceRecord.IsHalfDay,
                OvertimeHours = attendanceRecord.OvertimeHours,
                CreatedAt = attendanceRecord.CreatedAt,
                UpdatedAt = attendanceRecord.UpdatedAt
            };
        }

        // DELETE: api/attendance/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAttendance(int id)
        {
            var attendanceRecord = await _context.AttendanceRecords.FindAsync(id);
            if (attendanceRecord == null)
                return NotFound("Regjistrimi i pranisë nuk u gjet");

            _context.AttendanceRecords.Remove(attendanceRecord);
            await _context.SaveChangesAsync();

            // Update employee's comprehensive data for the current month
            await UpdateEmployeeComprehensiveData(attendanceRecord.EmployeeId, attendanceRecord.Date.Year, attendanceRecord.Date.Month);

            return NoContent();
        }

        // POST: api/attendance/bulk
        [HttpPost("bulk")]
        public async Task<ActionResult> CreateBulkAttendance(List<CreateAttendanceDto> createDtos)
        {
            foreach (var createDto in createDtos)
            {
                var employee = await _context.Employees.FindAsync(createDto.EmployeeId);
                if (employee == null)
                    continue;

                // Check if attendance record already exists for this date and employee
                var existingRecord = await _context.AttendanceRecords
                    .FirstOrDefaultAsync(a => a.EmployeeId == createDto.EmployeeId && a.Date.Date == createDto.Date.Date);

                if (existingRecord != null)
                    continue;

                var attendanceRecord = new AttendanceRecord
                {
                    EmployeeId = createDto.EmployeeId,
                    Date = createDto.Date.Date,
                    IsPresent = createDto.IsPresent,
                    Notes = createDto.Notes
                };

                _context.AttendanceRecords.Add(attendanceRecord);
            }

            await _context.SaveChangesAsync();

            // Update comprehensive data for all affected employees
            var employeeIds = createDtos.Select(d => d.EmployeeId).Distinct();
            foreach (var employeeId in employeeIds)
            {
                var firstRecord = createDtos.First(d => d.EmployeeId == employeeId);
                await UpdateEmployeeComprehensiveData(employeeId, firstRecord.Date.Year, firstRecord.Date.Month);
            }

            return Ok("Regjistrimet e pranisë u krijuan me sukses");
        }

        private async Task UpdateEmployeeComprehensiveData(int employeeId, int year, int month)
        {
            var startDate = new DateTime(year, month, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);

            var attendanceRecords = await _context.AttendanceRecords
                .Where(a => a.EmployeeId == employeeId && a.Date >= startDate && a.Date <= endDate)
                .ToListAsync();

            var daysWorked = attendanceRecords.Count(a => a.IsPresent && !a.IsHalfDay);
            var halfDays = attendanceRecords.Count(a => a.IsPresent && a.IsHalfDay);
            var absentDays = attendanceRecords.Count(a => !a.IsPresent);
            var totalOvertimeHours = attendanceRecords.Sum(a => a.OvertimeHours ?? 0);
            var totalDailyBonuses = attendanceRecords.Sum(a => a.DailyBonus ?? 0);
            var totalDailyPenalties = attendanceRecords.Sum(a => a.DailyPenalty ?? 0);

            var employee = await _context.Employees.FindAsync(employeeId);
            if (employee != null)
            {
                employee.DaysWorkedThisMonth = daysWorked;
                employee.HalfDaysThisMonth = halfDays;
                employee.AbsentDaysThisMonth = absentDays;
                employee.TotalOvertimeHoursThisMonth = totalOvertimeHours;
                employee.CalculatedDailyBonuses = totalDailyBonuses;
                employee.CalculatedDailyPenalties = totalDailyPenalties;
                await _context.SaveChangesAsync();
            }
        }
    }
} 