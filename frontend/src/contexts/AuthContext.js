import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient, { API_ENDPOINTS } from "../config/api";
import {
  ROLES,
  getDefaultPermissionsForRole,
  normalizePermissions,
  normalizeRole,
} from "../config/permissions";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizeUser = (rawUser) => {
    if (!rawUser || typeof rawUser !== "object") {
      return null;
    }

    const role = normalizeRole(rawUser.role);
    const explicitPermissions = normalizePermissions(rawUser.permissions);

    return {
      ...rawUser,
      role,
      permissions:
        explicitPermissions.length > 0
          ? explicitPermissions
          : getDefaultPermissionsForRole(role),
    };
  };

  const clearSession = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const resetStoredSession = () => {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    };

    const loadCurrentUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get(API_ENDPOINTS.AUTH_ME);
        const currentUser = normalizeUser(response.data);

        if (!currentUser) {
          resetStoredSession();
          return;
        }

        setUser(currentUser);
        localStorage.setItem("user", JSON.stringify(currentUser));
      } catch (error) {
        resetStoredSession();
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, []);

  const login = (userData) => {
    const normalizedUser = normalizeUser(userData);
    setUser(normalizedUser);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
  };

  const logout = () => {
    clearSession();
  };

  const isAuthenticated = () => {
    return !!user && !!localStorage.getItem("token");
  };

  const isAdmin = () => {
    return user?.role === ROLES.ADMIN;
  };

  const isUser = () => {
    return user?.role === ROLES.USER;
  };

  const hasPermission = (permission) => {
    if (!user || !permission) {
      return false;
    }

    const requestedPermission = permission.trim().toLowerCase();
    return (
      user.permissions?.some(
        (userPermission) =>
          typeof userPermission === "string" &&
          userPermission.trim().toLowerCase() === requestedPermission
      ) ?? false
    );
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    isUser,
    hasPermission,
    permissions: user?.permissions ?? [],
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
