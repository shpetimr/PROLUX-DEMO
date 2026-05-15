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
          subTitle="Nuk jeni të autorizuar të hyni në këtë faqe."
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Kthehu
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
          subTitle="Nuk jeni të autorizuar të hyni në këtë faqe."
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Kthehu
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
        subTitle="Nuk keni të drejta për këtë burim."
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            Kthehu
          </Button>
        }
      />
    );
  }

  return children;
};

export default ProtectedRoute;
