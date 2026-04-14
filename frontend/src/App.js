import React from "react";
import {
  HashRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Expenses from "./pages/Expenses";
import Purchases from "./pages/Purchases";
import Rents from "./pages/Rents";
import Incomes from "./pages/Incomes";
import Debts from "./pages/Debts";

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
import ApiTest from "./components/ApiTest";

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
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="employees"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Employees />
                  </ProtectedRoute>
                }
              />
              <Route
                path="expenses"
                element={
                  <ProtectedRoute requiredPermission="expenses">
                    <Expenses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="purchases"
                element={
                  <ProtectedRoute requiredPermission="purchases">
                    <Purchases />
                  </ProtectedRoute>
                }
              />
              <Route
                path="rents"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Rents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="incomes"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Incomes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="debts"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Debts />
                  </ProtectedRoute>
                }
              />

              <Route
                path="reports"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="projects"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Projects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="projects/:id"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ProjectDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="template-print"
                element={
                  <ProtectedRoute>
                    <TemplatePrint />
                  </ProtectedRoute>
                }
              />
              <Route
                path="offer-print"
                element={
                  <ProtectedRoute>
                    <OfferPrint />
                  </ProtectedRoute>
                }
              />
              <Route
                path="stock"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Stock />
                  </ProtectedRoute>
                }
              />
              <Route
                path="api-test"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <ApiTest />
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
