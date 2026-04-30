import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Spin, Result, Button } from "antd";
import { ROLES } from "../config/permissions";

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
    const normalizedRequiredRole = requiredRole.toLowerCase();

    if (
      normalizedRequiredRole === ROLES.ADMIN.toLowerCase() &&
      !isAdmin()
    ) {
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
    if (
      normalizedRequiredRole === ROLES.USER.toLowerCase() &&
      !isUser()
    ) {
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

  return children;
};

export default ProtectedRoute;
