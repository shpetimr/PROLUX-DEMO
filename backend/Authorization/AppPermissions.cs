using backend.Models;

namespace backend.Authorization
{
    public static class AppPermissions
    {
        public const string DashboardView = "dashboard.view";
        public const string TemplatesPrint = "templates.print";
        public const string OffersPrint = "offers.print";
        public const string ExpensesManage = "expenses.manage";
        public const string PurchasesManage = "purchases.manage";
        public const string EmployeesManage = "employees.manage";
        public const string RentsManage = "rents.manage";
        public const string IncomesManage = "incomes.manage";
        public const string DebtsManage = "debts.manage";
        public const string ProjectsManage = "projects.manage";
        public const string ReportsView = "reports.view";
        public const string StockManage = "stock.manage";
        public const string AttendanceManage = "attendance.manage";
        public const string UsersManage = "users.manage";
        public const string WorkersManageTasks = "workers.manageTasks";
        public const string WorkersViewOwnDashboard = "workers.viewOwnDashboard";
        public const string WorkersViewOwnTasks = "workers.viewOwnTasks";
        public const string WorkersUpdateOwnTaskStatus = "workers.updateOwnTaskStatus";
        public const string WorkersViewOwnSalary = "workers.viewOwnSalary";

        public static IReadOnlyList<string> All { get; } = new[]
        {
            DashboardView,
            TemplatesPrint,
            OffersPrint,
            ExpensesManage,
            PurchasesManage,
            EmployeesManage,
            RentsManage,
            IncomesManage,
            DebtsManage,
            ProjectsManage,
            ReportsView,
            StockManage,
            AttendanceManage,
            UsersManage,
            WorkersManageTasks,
            WorkersViewOwnDashboard,
            WorkersViewOwnTasks,
            WorkersUpdateOwnTaskStatus,
            WorkersViewOwnSalary
        };

        private static readonly IReadOnlyDictionary<UserRole, IReadOnlyList<string>> PermissionsByRole =
            new Dictionary<UserRole, IReadOnlyList<string>>
            {
                [UserRole.Admin] = All,
                [UserRole.User] = new[]
                {
                    DashboardView,
                    TemplatesPrint,
                    OffersPrint,
                    ExpensesManage,
                    PurchasesManage,
                    WorkersViewOwnDashboard,
                    WorkersViewOwnTasks,
                    WorkersUpdateOwnTaskStatus,
                    WorkersViewOwnSalary
                }
            };

        public static IReadOnlyList<string> GetPermissionsForRole(UserRole role)
        {
            return PermissionsByRole.TryGetValue(role, out var permissions)
                ? permissions
                : Array.Empty<string>();
        }

        public static bool RoleHasPermission(string? role, string permission)
        {
            if (!Enum.TryParse<UserRole>(role, ignoreCase: true, out var parsedRole))
                return false;

            return GetPermissionsForRole(parsedRole).Contains(permission, StringComparer.OrdinalIgnoreCase);
        }
    }
}
