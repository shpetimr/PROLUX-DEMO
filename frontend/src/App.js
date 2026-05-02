import React from "react";
import {
  HashRouter as Router,
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

import Reports from "./pages/Reports";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { DataChangeProvider } from "./contexts/DataChangeContext";
import TemplatePrint from "./pages/TemplatePrint";
import OfferPrint from "./pages/OfferPrint";
import Stock from "./pages/Stock";
import { PERMISSIONS } from "./config/permissions";

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
                    requiredPermission={PERMISSIONS.DASHBOARD_VIEW}
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
                path="stock"
                element={
                  <ProtectedRoute
                    requiredPermission={PERMISSIONS.STOCK_MANAGE}
                  >
                    <Stock />
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
