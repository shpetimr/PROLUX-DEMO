import axios from "axios";

const isProductionBuild = process.env.NODE_ENV === "production";

const isLoopbackHostname = (hostname) => {
  const normalizedHostname = hostname?.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname?.startsWith("127.") ||
    normalizedHostname === "::1" ||
    normalizedHostname === "0.0.0.0"
  );
};

const pointsToLocalhost = (value) => {
  if (!value || typeof window === "undefined") {
    return false;
  }

  try {
    const url = new URL(value, window.location.origin);
    return url.origin !== window.location.origin && isLoopbackHostname(url.hostname);
  } catch {
    return false;
  }
};

const normalizeBaseUrl = (value) => {
  const configuredValue = value?.trim();

  if (!configuredValue) {
    return "/api";
  }

  if (isProductionBuild && pointsToLocalhost(configuredValue)) {
    console.error(
      "Ignoring localhost API URL in a production build. Set REACT_APP_API_URL to the public Railway API URL."
    );
    return "/api";
  }

  if (isProductionBuild && shouldUseNetlifyApiProxy(configuredValue)) {
    return "/api";
  }

  return configuredValue.replace(/\/+$/, "");
};

const shouldUseNetlifyApiProxy = (configuredValue) => {
  if (
    typeof window === "undefined" ||
    process.env.REACT_APP_DISABLE_NETLIFY_API_PROXY === "true"
  ) {
    return false;
  }

  const currentHostname = window.location.hostname.toLowerCase();
  if (!currentHostname.endsWith(".netlify.app")) {
    return false;
  }

  try {
    const apiUrl = new URL(configuredValue, window.location.origin);
    return apiUrl.origin !== window.location.origin;
  } catch {
    return false;
  }
};

const getRuntimeApiUrl = () => {
  if (typeof window === "undefined") {
    return "";
  }

  if (
    isProductionBuild &&
    process.env.REACT_APP_ALLOW_RUNTIME_API_OVERRIDE !== "true"
  ) {
    return "";
  }

  return new URLSearchParams(window.location.search).get("apiBaseUrl") ?? "";
};

const normalizeApiPath = (value) => {
  const apiPath = value?.trim() || "/api";
  return `/${apiPath.replace(/^\/+/, "").replace(/\/+$/, "")}`;
};

const buildOriginFromParts = () => {
  const scheme = process.env.REACT_APP_BACKEND_SCHEME?.trim();
  const host = process.env.REACT_APP_BACKEND_HOST?.trim();
  const port = process.env.REACT_APP_BACKEND_PORT?.trim();

  if (!scheme || !host) {
    return "";
  }

  const normalizedScheme = scheme.replace(/[:/\\]+$/, "");
  const normalizedPort = port ? `:${port.replace(/^:/, "")}` : "";
  return `${normalizedScheme}://${host}${normalizedPort}`;
};

const buildConfiguredApiUrl = () => {
  const explicitApiUrl = process.env.REACT_APP_API_URL?.trim();
  if (explicitApiUrl) {
    return explicitApiUrl;
  }

  const backendOrigin =
    process.env.REACT_APP_BACKEND_ORIGIN?.trim() || buildOriginFromParts();
  if (!backendOrigin) {
    return "";
  }

  return `${backendOrigin.replace(/\/+$/, "")}${normalizeApiPath(
    process.env.REACT_APP_API_PATH
  )}`;
};

const joinUrl = (baseUrl, endpoint = "") => {
  const cleanEndpoint = endpoint ? `/${endpoint.replace(/^\/+/, "")}` : "";
  return `${baseUrl}${cleanEndpoint}`;
};

export const API_BASE_URL = normalizeBaseUrl(
  getRuntimeApiUrl() || buildConfiguredApiUrl()
);
export const getApiUrl = (endpoint = "") => joinUrl(API_BASE_URL, endpoint);
export const getSwaggerUrl = () => {
  if (typeof window === "undefined") {
    return "/swagger";
  }

  const apiUrl = new URL(API_BASE_URL, window.location.origin);
  return new URL("/swagger", apiUrl.origin).toString();
};

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add authentication token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    return Promise.reject(error);
  }
);

export const API_ENDPOINTS = {
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  AUTH_ME: "/auth/me",
  USERS: "/auth/users",
  WORKERS: "/auth/workers",
  VALIDATE_TOKEN: "/auth/validate",

  EMPLOYEES: "/employees",
  EMPLOYEE_BY_ID: (id) => `/employees/${id}`,

  SALARY_MONTH: (year, month) => `/salary/month/${year}/${month}`,
  SALARY_ME_MONTH: (year, month) => `/salary/me/month/${year}/${month}`,

  ATTENDANCE: "/attendance",
  ATTENDANCE_BY_ID: (id) => `/attendance/${id}`,
  ATTENDANCE_EMPLOYEE_MONTH: (employeeId, year, month) => `/attendance/employee/${employeeId}/month/${year}/${month}`,
  ATTENDANCE_MONTH: (year, month) => `/attendance/month/${year}/${month}`,
  ATTENDANCE_BULK: "/attendance/bulk",

  DASHBOARD_STATS: "/reports/dashboard",
  DASHBOARD_COMPREHENSIVE: "/reports/dashboard/comprehensive",

  EXPENSES: "/expenses",
  INCOMES: "/incomes",
  PURCHASES: "/purchases",
  RENTS: "/rents",
  DEBTS: "/debts",
  DEBTS_STATISTICS: "/debts/summary",

  // Projects/Works management
  PROJECTS: "/projects",
  PROJECT_BY_ID: (id) => `/projects/${id}`,
  PROJECTS_BY_STATUS: (status) => `/projects/status/${status}`,

  // Expense calculations and reports
  EXPENSE_CALCULATIONS: {
    DAILY: "/expenses/calculations/daily",
    WEEKLY: "/expenses/calculations/weekly",
    MONTHLY: "/expenses/calculations/monthly",
    BY_TYPE: "/expenses/summary",
    BY_DATE_RANGE: "/expenses/calculations/period",
  },

  // Comprehensive reports
  REPORTS: "/reports",
  EXPENSE_REPORTS: {
    COMPREHENSIVE: "/reports/expenses/comprehensive",
    SUMMARY: "/expenses/summary",
    FINANCIAL_IMPACT: "/reports/expenses/financial-impact",
    TRENDS: "/reports/expenses/trends",
    FORECAST: "/reports/expenses/forecast",
  },

  // Financial calculations
  FINANCIAL_CALCULATIONS: {
    DAILY: "/reports/financial/daily",
    WEEKLY: "/reports/financial/weekly",
    MONTHLY: "/reports/financial/monthly",
    ANNUAL: "/reports/financial/annual",
    COMPREHENSIVE: "/reports/financial/comprehensive",
    SUMMARY: "/reports/financial/summary",
    BY_DATE_RANGE: "/reports/financial",
    PERIOD_TOTALS: "/reports/financial/period-totals",
  },

  STOCK_ITEMS: "/stock/items",
  STOCK_ITEM_BY_ID: (id) => `/stock/items/${id}`,
  STOCK_ITEM_MOVEMENTS: (id) => `/stock/items/${id}/movements`,
  STOCK_APPLY_INVOICE_DEDUCTIONS: "/stock/apply-invoice-deductions",

  WORKER_TASKS: "/worker-tasks",
  WORKER_TASK_BY_ID: (id) => `/worker-tasks/${id}`,
  WORKER_TASK_STATUS: (id) => `/worker-tasks/${id}/status`,

  INVOICE_ARCHIVE: "/invoice-archive",
  INVOICE_ARCHIVE_BY_ID: (id) => `/invoice-archive/${id}`,
  INVOICE_ARCHIVE_PDF: (id) => `/invoice-archive/${id}/pdf`,
};

export default apiClient;
