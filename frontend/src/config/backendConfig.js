// Backend Configuration - Update these values to match your backend
export const BACKEND_CONFIG = {
  // Base URL - Update this to match your backend URL
  BASE_URL: "http://localhost:5069/api",

  // Alternative base URLs - uncomment the one that matches your backend
  // BASE_URL: "http://localhost:5069",
  // BASE_URL: "http://localhost:5069/api/v1",
  // BASE_URL: "http://localhost:5069/api/v2",

  // Authentication endpoints - Update these to match your backend
  AUTH: {
    LOGIN: "/auth/login",
    // Alternative login endpoints - uncomment the one that matches your backend
    // LOGIN: "/login",
    // LOGIN: "/user/login",
    // LOGIN: "/authenticate",
    // LOGIN: "/api/auth/login",
  },

  // API endpoints - Update these to match your backend
  ENDPOINTS: {
    // Employees
    EMPLOYEES: "/employees",
    // Alternative: EMPLOYEES: "/api/employees",
    // Alternative: EMPLOYEES: "/v1/employees",

    // Expenses
    EXPENSES: "/expenses",
    // Alternative: EXPENSES: "/api/expenses",
    // Alternative: EXPENSES: "/v1/expenses",

    // Purchases
    PURCHASES: "/purchases",
    // Alternative: PURCHASES: "/api/purchases",
    // Alternative: PURCHASES: "/v1/purchases",

    // Incomes
    INCOMES: "/incomes",
    // Alternative: INCOMES: "/api/incomes",
    // Alternative: INCOMES: "/v1/incomes",

    // Rents
    RENTS: "/rents",
    // Alternative: RENTS: "/api/rents",
    // Alternative: RENTS: "/v1/rents",

    // Debts
    DEBTS: "/debts",
    // Alternative: DEBTS: "/api/debts",
    // Alternative: DEBTS: "/v1/debts",

    // Reports
    REPORTS: "/reports",
    // Alternative: REPORTS: "/api/reports",
    // Alternative: REPORTS: "/v1/reports",

    // Dashboard
    DASHBOARD: "/reports/dashboard",
    // Alternative: DASHBOARD: "/dashboard",
    // Alternative: DASHBOARD: "/api/dashboard",
  },

  // Request format - Update this to match what your backend expects
  REQUEST_FORMAT: {
    LOGIN: {
      username: "username", // or "user", "email", "login"
      password: "password",
    },
  },

  // Response format - Update this to match what your backend returns
  RESPONSE_FORMAT: {
    LOGIN: {
      token: "token", // or "accessToken", "jwt", "access_token"
      role: "role", // or "userRole", "user_type"
      username: "username", // or "user", "email"
    },
  },
};

// Helper function to get endpoint with base URL
export const getFullUrl = (endpoint) => {
  return `${BACKEND_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get login request format
export const getLoginRequest = (username, password) => {
  const format = BACKEND_CONFIG.REQUEST_FORMAT.LOGIN;
  return {
    [format.username]: username,
    [format.password]: password,
  };
};

// Helper function to extract data from login response
export const extractLoginData = (response) => {
  const format = BACKEND_CONFIG.RESPONSE_FORMAT.LOGIN;
  return {
    token: response.data[format.token],
    role: response.data[format.role],
    username: response.data[format.username],
    ...response.data, // Include all other fields
  };
};
