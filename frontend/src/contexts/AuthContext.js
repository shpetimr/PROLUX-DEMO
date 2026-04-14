import React, { createContext, useContext, useState, useEffect } from "react";

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

  useEffect(() => {
    // Check if user is logged in on app start
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (storedUser && token) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    // Do not navigate here. Navigation should be handled in the component after logout.
  };

  const isAuthenticated = () => {
    return !!user && !!localStorage.getItem("token");
  };

  const isAdmin = () => {
    return user?.role === "Admin" || user?.role === "admin";
  };

  const isUser = () => {
    return user?.role === "User" || user?.role === "user";
  };

  const hasPermission = (permission) => {
    if (!user) return false;

    // Admin has all permissions
    if (isAdmin()) return true;

    // User permissions
    if (isUser()) {
      const userPermissions = ["expenses", "purchases"];
      return userPermissions.includes(permission);
    }

    return false;
  };

  const canAccessPage = (page) => {
    if (!user) return false;

    // Admin can access all pages
    if (isAdmin()) return true;

    // User can only access specific pages
    if (isUser()) {
      const allowedPages = [
        "expenses",
        "purchases",
        "dashboard",
        "template-print",
        "offer-print",
        "",
      ];
      return allowedPages.includes(page);
    }

    return false;
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    isUser,
    hasPermission,
    canAccessPage,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
