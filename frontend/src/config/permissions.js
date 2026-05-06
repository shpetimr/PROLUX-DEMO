export const ROLES = {
  ADMIN: "Admin",
  USER: "User",
};

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  TEMPLATES_PRINT: "templates.print",
  OFFERS_PRINT: "offers.print",
  INVOICE_ARCHIVE_MANAGE: "invoiceArchive.manage",
  EXPENSES_MANAGE: "expenses.manage",
  PURCHASES_MANAGE: "purchases.manage",
  EMPLOYEES_MANAGE: "employees.manage",
  RENTS_MANAGE: "rents.manage",
  INCOMES_MANAGE: "incomes.manage",
  DEBTS_MANAGE: "debts.manage",
  PROJECTS_MANAGE: "projects.manage",
  REPORTS_VIEW: "reports.view",
  STOCK_MANAGE: "stock.manage",
  ATTENDANCE_MANAGE: "attendance.manage",
  USERS_MANAGE: "users.manage",
  WORKERS_MANAGE_TASKS: "workers.manageTasks",
  WORKERS_VIEW_OWN_DASHBOARD: "workers.viewOwnDashboard",
  WORKERS_VIEW_OWN_TASKS: "workers.viewOwnTasks",
  WORKERS_UPDATE_OWN_TASK_STATUS: "workers.updateOwnTaskStatus",
  WORKERS_VIEW_OWN_SALARY: "workers.viewOwnSalary",
};

const DEFAULT_PERMISSIONS_BY_ROLE = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.USER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.TEMPLATES_PRINT,
    PERMISSIONS.OFFERS_PRINT,
    PERMISSIONS.EXPENSES_MANAGE,
    PERMISSIONS.PURCHASES_MANAGE,
    PERMISSIONS.WORKERS_VIEW_OWN_DASHBOARD,
    PERMISSIONS.WORKERS_VIEW_OWN_TASKS,
    PERMISSIONS.WORKERS_UPDATE_OWN_TASK_STATUS,
    PERMISSIONS.WORKERS_VIEW_OWN_SALARY,
  ],
};

export const normalizeRole = (role) => {
  if (typeof role !== "string") {
    return null;
  }

  const normalized = role.trim().toLowerCase();

  if (normalized === "admin") {
    return ROLES.ADMIN;
  }

  if (normalized === "user") {
    return ROLES.USER;
  }

  return role;
};

export const normalizePermissions = (permissions) => {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return [
    ...new Set(
      permissions
        .filter(
          (permission) =>
            typeof permission === "string" && permission.trim().length > 0
        )
        .map((permission) => permission.trim())
    ),
  ];
};

export const getDefaultPermissionsForRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return DEFAULT_PERMISSIONS_BY_ROLE[normalizedRole] ?? [];
};
