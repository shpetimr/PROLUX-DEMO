import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Spin, Result, Button } from "antd";

const ProtectedRoute = ({
  children,
  requiredRole = null,
  requiredPermission = null,
}) => {
  const {
    isAuthenticated,
    isAdmin,
    isUser,
    hasPermission,
    canAccessPage,
    loading,
  } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole) {
    if (requiredRole === "admin" && !isAdmin()) {
      return (
        <Result
          status="403"
          title="403"
          subTitle="Sorry, you are not authorized to access this page."
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          }
        />
      );
    }
    if (requiredRole === "user" && !isUser()) {
      return (
        <Result
          status="403"
          title="403"
          subTitle="Sorry, you are not authorized to access this page."
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Go Back
            </Button>
          }
        />
      );
    }
  }

  // Check permission-based access
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="Sorry, you don't have permission to access this resource."
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            Go Back
          </Button>
        }
      />
    );
  }

  // Check page access
  const currentPage = location.pathname.split("/")[1] || "dashboard";
  if (!canAccessPage(currentPage)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="Sorry, you are not authorized to access this page."
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            Go Back
          </Button>
        }
      />
    );
  }

  return children;
};

export default ProtectedRoute;
