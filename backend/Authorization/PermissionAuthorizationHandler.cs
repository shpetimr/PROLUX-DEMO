using Microsoft.AspNetCore.Authorization;
using backend.Services;

namespace backend.Authorization
{
    public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
    {
        private readonly ICurrentUserService _currentUserService;

        public PermissionAuthorizationHandler(ICurrentUserService currentUserService)
        {
            _currentUserService = currentUserService;
        }

        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            PermissionRequirement requirement)
        {
            var currentUser = _currentUserService.GetCurrentUser();
            if (currentUser != null &&
                AppPermissions.GetPermissionsForRole(currentUser.Role)
                    .Contains(requirement.Permission, StringComparer.OrdinalIgnoreCase))
            {
                context.Succeed(requirement);
            }

            return Task.CompletedTask;
        }
    }
}
