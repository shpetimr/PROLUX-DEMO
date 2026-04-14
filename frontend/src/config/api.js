import axios from "axios";

// API Configuration - Update this to match your backend
const API_BASE_URL = "http://localhost:5069/api";

// Common backend URL patterns - uncomment the one that matches your backend
// const API_BASE_URL = "http://localhost:5069/api";
// const API_BASE_URL = "http://localhost:5069";
// const API_BASE_URL = "http://localhost:5069/api/v1";

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

    // Log API requests for debugging
    console.log("API Request:", {
      method: config.method?.toUpperCase(),
      url: config.url,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      data: config.data,
      headers: config.headers,
    });

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => {
    console.log("API Response:", {
      status: response.status,
      url: response.config?.url,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error("API Error Response:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data,
      headers: error.response?.headers,
    });

    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      console.log("Unauthorized access detected, redirecting to login");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // TODO: Replace with React Router navigation (useNavigate) from a component context.
      // window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// API endpoints - Update these to match your backend endpoints
export const API_ENDPOINTS = {
  // Authentication - try different possible endpoints
  LOGIN: "/auth/login",
  LOGIN_ALT: "/login",
  LOGIN_AUTH: "/api/auth/login",
  LOGIN_USER: "/user/login",
  LOGIN_AUTHENTICATE: "/authenticate",

  // Employees - update these to match your backend
  EMPLOYEES: "/employees",
  EMPLOYEE_BY_ID: (id) => `/employees/${id}`,
  CALCULATE_SALARY: (id) => `/employees/${id}/calculate-salary`,

  // Attendance - new endpoints for daily attendance tracking
  ATTENDANCE: "/attendance",
  ATTENDANCE_BY_ID: (id) => `/attendance/${id}`,
  ATTENDANCE_EMPLOYEE_MONTH: (employeeId, year, month) => `/attendance/employee/${employeeId}/month/${year}/${month}`,
  ATTENDANCE_MONTH: (year, month) => `/attendance/month/${year}/${month}`,
  ATTENDANCE_BULK: "/attendance/bulk",

  // Dashboard - update these to match your backend
  DASHBOARD_STATS: "/reports/dashboard",
  DASHBOARD_COMPREHENSIVE: "/reports/dashboard/comprehensive",
  DASHBOARD_ALT: "/dashboard",
  DASHBOARD_V1: "/v1/dashboard",

  // Use only the standard endpoints for these resources:
  EXPENSES: "/expenses",
  INCOMES: "/incomes",
  PURCHASES: "/purchases",
  RENTS: "/rents",
  DEBTS: "/debts",
  DEBTS_STATISTICS: "/debts/statistics",

  // Projects/Works management
  PROJECTS: "/projects",
  PROJECT_BY_ID: (id) => `/projects/${id}`,
  PROJECTS_BY_STATUS: (status) => `/projects/status/${status}`,

  // Expense calculations and reports
  EXPENSE_CALCULATIONS: {
    DAILY: "/expenses/calculations/daily",
    WEEKLY: "/expenses/calculations/weekly",
    MONTHLY: "/expenses/calculations/monthly",
    BY_TYPE: "/expenses/calculations/by-type",
    BY_DATE_RANGE: "/expenses/calculations/by-date-range",
  },

  // Comprehensive reports
  REPORTS: "/reports",
  EXPENSE_REPORTS: {
    COMPREHENSIVE: "/reports/expenses/comprehensive",
    SUMMARY: "/reports/expenses/summary",
    DETAILED: "/reports/expenses/detailed",
    EXPORT: "/reports/expenses/export",
  },

  // Financial calculations
  FINANCIAL_CALCULATIONS: {
    DAILY: "/reports/financial/daily",
    WEEKLY: "/reports/financial/weekly",
    MONTHLY: "/reports/financial/monthly",
    ANNUAL: "/reports/financial/annual",
    BY_DATE_RANGE: "/reports/financial/by-date-range",
  },

  // Monthly tracking endpoints
  MONTHLY_TRACKING: {
    CUSTOM_RANGE: "/reports/monthly-tracking",
    BY_MONTH: (year, month) => `/reports/monthly-tracking/${year}/${month}`,
    BY_YEAR: (year) => `/reports/monthly-tracking/year/${year}`,
    CURRENT_MONTH: "/reports/monthly-tracking/current-month",
    CURRENT_YEAR: "/reports/monthly-tracking/current-year",
    SUMMARY: "/reports/monthly-tracking/summary",
    CUSTOM_REQUEST: "/reports/monthly-tracking/custom",
  },

  STOCK_ITEMS: "/stock/items",
  STOCK_ITEM_BY_ID: (id) => `/stock/items/${id}`,
  STOCK_ITEM_MOVEMENTS: (id) => `/stock/items/${id}/movements`,
  STOCK_APPLY_INVOICE_DEDUCTIONS: "/stock/apply-invoice-deductions",
};

export default apiClient;
