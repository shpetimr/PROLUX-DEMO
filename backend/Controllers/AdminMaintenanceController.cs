using backend.Authorization;
using backend.Configuration;
using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers
{
    // TEMPORARY PRE-PRODUCTION MAINTENANCE ENDPOINT.
    // Remove this controller after the production data reset has been completed.
    [ApiController]
    [Route("api/admin")]
    [Authorize(Policy = AppPermissions.UsersManage)]
    [ApiExplorerSettings(IgnoreApi = true)]
    public class AdminMaintenanceController : ControllerBase
    {
        private readonly ProductionDataResetService _productionDataResetService;
        private readonly ICurrentUserService _currentUserService;
        private readonly DatabaseOptions _databaseOptions;

        public AdminMaintenanceController(
            ProductionDataResetService productionDataResetService,
            ICurrentUserService currentUserService,
            DatabaseOptions databaseOptions)
        {
            _productionDataResetService = productionDataResetService;
            _currentUserService = currentUserService;
            _databaseOptions = databaseOptions;
        }

        [HttpPost("reset-production-data")]
        public async Task<IActionResult> ResetProductionData(CancellationToken cancellationToken)
        {
            var currentUser = _currentUserService.GetCurrentUser();
            if (currentUser is null)
            {
                return Unauthorized(new { message = "Authentication is required." });
            }

            if (currentUser.Role != UserRole.Admin)
            {
                return Forbid();
            }

            var backupPath = DatabaseBackup.TryCreateBeforeProductionDataReset(_databaseOptions);
            var resetResult = await _productionDataResetService.ResetAsync(
                new ProductionDataResetOptions(
                    Confirmed: true,
                    PreserveAdminUsername: currentUser.Username),
                cancellationToken);

            return Ok(new
            {
                message = "Production data reset completed.",
                preservedAdmins = resetResult.PreservedAdmins,
                appliedRows = resetResult.AppliedRows,
                cleaned = resetResult.AppliedCounts,
                backupCreated = !string.IsNullOrWhiteSpace(backupPath),
                backupPath,
                warning = string.IsNullOrWhiteSpace(backupPath)
                    ? "No automatic database backup was created for this provider. Verify an external backup before using this endpoint against shared data."
                    : null
            });
        }
    }
}
