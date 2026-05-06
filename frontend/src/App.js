import React from "react";
import {
  HashRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Expenses from "./pages/Expenses";
import Purchases from "./pages/Purchases";
import Rents from "./pages/Rents";
import Incomes from "./pages/Incomes";
import Debts from "./pages/Debts";
import Users from "./pages/Users";
import WorkerTasks from "./pages/WorkerTasks";
import WorkerSalary from "./pages/WorkerSalary";

import Reports from "./pages/Reports";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Pune from "./pages/Pune";
import WorkSales from "./pages/WorkSales";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { DataChangeProvider } from "./contexts/DataChangeContext";
import TemplatePrint from "./pages/TemplatePrint";
import OfferPrint from "./pages/OfferPrint";
import InvoiceArchive from "./pages/InvoiceArchive";
import Stock from "./pages/Stock";
import { PERMISSIONS, ROLES } from "./config/permissions";

function App() {
  return (
    <DataChangeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.WORKERS_VIEW_OWN_DASHBOARD}
                  >
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="employees"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.EMPLOYEES_MANAGE}
                  >
                    <Employees />
                  </ProtectedRoute>
                }
              />
              <Route
                path="expenses"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.EXPENSES_MANAGE}
                  >
                    <Expenses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="purchases"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.PURCHASES_MANAGE}
                  >
                    <Purchases />
                  </ProtectedRoute>
                }
              />
              <Route
                path="rents"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.RENTS_MANAGE}
                  >
                    <Rents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="incomes"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.INCOMES_MANAGE}
                  >
                    <Incomes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="debts"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.DEBTS_MANAGE}
                  >
                    <Debts />
                  </ProtectedRoute>
                }
              />

              <Route
                path="reports"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.REPORTS_VIEW}
                  >
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="projects"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.PROJECTS_MANAGE}
                  >
                    <Projects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="projects/:id"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.PROJECTS_MANAGE}
                  >
                    <ProjectDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="pune"
                element={
                  <ProtectedRoute
                    requiredRole={ROLES.ADMIN}
                    requiredPermission={PERMISSIONS.WORK_SALES_MANAGE}
                  >
                    <Pune />
                  </ProtectedRoute>
                }
              />
              <Route
                path="work-sales"
                element={
                  <ProtectedRoute
                    requiredRole={ROLES.ADMIN}
                    requiredPermission={PERMISSIONS.WORK_SALES_MANAGE}
                  >
                    <WorkSales />
                  </ProtectedRoute>
                }
              />
              <Route
                path="template-print"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.TEMPLATES_PRINT}
                  >
                    <TemplatePrint />
                  </ProtectedRoute>
                }
              />
              <Route
                path="offer-print"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.OFFERS_PRINT}
                  >
                    <OfferPrint />
                  </ProtectedRoute>
                }
              />
              <Route
                path="invoice-archive"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.INVOICE_ARCHIVE_MANAGE}
                  >
                    <InvoiceArchive />
                  </ProtectedRoute>
                }
              />
              <Route
                path="stock"
                element={
                  <ProtectedRoute
                    requiredRole={ROLES.ADMIN}
                    requiredPermission={PERMISSIONS.STOCK_MANAGE}
                  >
                    <Navigate to="/stock/material" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="stock/material"
                element={
                  <ProtectedRoute
                    requiredRole={ROLES.ADMIN}
                    requiredPermission={PERMISSIONS.STOCK_MANAGE}
                  >
                    <Stock stockType="Material" title="Material Stock" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="stock/product"
                element={
                  <ProtectedRoute
                    requiredRole={ROLES.ADMIN}
                    requiredPermission={PERMISSIONS.STOCK_MANAGE}
                  >
                    <Stock stockType="Product" title="Product Stock" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="worker-tasks"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.WORKERS_VIEW_OWN_TASKS}
                  >
                    <WorkerTasks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="my-salary"
                element={
                  <ProtectedRoute
                    requiredRole={ROLES.USER}
                    requiredPermission={PERMISSIONS.WORKERS_VIEW_OWN_SALARY}
                  >
                    <WorkerSalary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.USERS_MANAGE}
                  >
                    <Users />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </DataChangeProvider>
  );
}

export default App;
