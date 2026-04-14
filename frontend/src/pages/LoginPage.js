import React, { useState } from "react";
import apiClient, { API_ENDPOINTS } from "../config/api";
import { Form, Input, Button, Typography, Card, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import BackendStatus from "../components/BackendStatus";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      console.log("Attempting login with:", values.username);

      // Check if backend is available
      let backendAvailable = false;
      try {
        await apiClient.get("/");
        backendAvailable = true;
      } catch (err) {
        // If we get a response (even 404), the server is running
        if (err.response) {
          backendAvailable = true;
        } else {
          console.log("Backend not available, using mock authentication");
        }
      }

      if (backendAvailable) {
        // Try real backend authentication with multiple endpoint attempts
        let response = null;
        let loginSuccessful = false;

        // Try different login endpoints
        const loginEndpoints = [
          API_ENDPOINTS.LOGIN,
          API_ENDPOINTS.LOGIN_ALT,
          API_ENDPOINTS.LOGIN_AUTH,
          API_ENDPOINTS.LOGIN_USER,
          API_ENDPOINTS.LOGIN_AUTHENTICATE,
        ];

        for (const endpoint of loginEndpoints) {
          try {
            console.log("Trying login endpoint:", endpoint);
            console.log("Request payload:", {
              username: values.username,
              password: "***",
            });

            // Try different request formats
            const requestFormats = [
              { username: values.username, password: values.password },
              { userName: values.username, password: values.password },
              { email: values.username, password: values.password },
              { login: values.username, password: values.password },
              { user: values.username, password: values.password },
              { name: values.username, password: values.password },
              {
                username: values.username,
                password: values.password,
                grant_type: "password",
              },
            ];

            for (const format of requestFormats) {
              try {
                response = await apiClient.post(endpoint, format);
                console.log(
                  "Login successful with format:",
                  Object.keys(format)
                );
                break;
              } catch (err) {
                console.log(
                  `Login failed with format ${Object.keys(format)}:`,
                  err.response?.status
                );
                if (err.response?.status === 401) {
                  // Invalid credentials, don't try other formats
                  break;
                }
              }
            }

            if (!response) {
              continue; // Try next endpoint
            }

            console.log("Login successful with endpoint:", endpoint);
            console.log("Full login response:", response);
            console.log("Login response data:", response.data);
            loginSuccessful = true;
            break;
          } catch (err) {
            console.log(
              `Login failed with endpoint ${endpoint}:`,
              err.response?.status,
              err.response?.statusText
            );
            if (err.response?.status === 401) {
              // Invalid credentials, don't try other endpoints
              break;
            }
          }
        }

        if (!loginSuccessful) {
          throw new Error("All login endpoints failed");
        }

        // Handle different response formats
        let userData = response.data;
        let token = null;

        // Try different possible token field names
        if (response.data.token) {
          token = response.data.token;
        } else if (response.data.accessToken) {
          token = response.data.accessToken;
        } else if (response.data.jwt) {
          token = response.data.jwt;
        } else if (response.data.access_token) {
          token = response.data.access_token;
        } else if (response.data.jwtToken) {
          token = response.data.jwtToken;
        }

        console.log("Extracted token:", token ? "Found" : "Not found");

        // If the response doesn't have a token, try to construct user data
        if (!token) {
          console.error(
            "No token found in response. Available fields:",
            Object.keys(response.data)
          );
          message.error("Login failed: No authentication token received");
          return;
        }

        // Ensure user data has required fields
        if (!userData.role) {
          // Try to determine role from username for testing
          userData.role = values.username === "admin" ? "Admin" : "User";
          console.log(
            "Role not found in response, using username-based role:",
            userData.role
          );
        }

        if (!userData.username) {
          userData.username = values.username;
        }

        console.log("Final user data:", userData);

        // Store token
        localStorage.setItem("token", token);

        // Login through context
        login(userData);

        message.success("Login successful!");
        navigate("/");
      } else {
        // Mock authentication for testing
        if (
          (values.username === "admin" && values.password === "admin123") ||
          (values.username === "user" && values.password === "user123")
        ) {
          const mockUserData = {
            username: values.username,
            role: values.username === "admin" ? "Admin" : "User",
            fullName:
              values.username === "admin" ? "Administrator" : "Regular User",
            token: `mock-token-${values.username}-${Date.now()}`,
          };

          localStorage.setItem("token", mockUserData.token);
          login(mockUserData);

          message.success(
            "Login successful! (Mock mode - Backend not available)"
          );
          navigate("/");
        } else {
          message.error(
            "Invalid credentials. Use admin/admin123 or user/user123"
          );
        }
      }
    } catch (err) {
      console.error("Login error:", err);

      if (err.response) {
        // Server responded with error
        const errorMessage =
          err.response.data?.message ||
          err.response.data?.error ||
          "Server error";
        message.error(`Login failed: ${errorMessage}`);
      } else if (err.request) {
        // Network error - try mock authentication
        if (
          (values.username === "admin" && values.password === "admin123") ||
          (values.username === "user" && values.password === "user123")
        ) {
          const mockUserData = {
            username: values.username,
            role: values.username === "admin" ? "Admin" : "User",
            fullName:
              values.username === "admin" ? "Administrator" : "Regular User",
            token: `mock-token-${values.username}-${Date.now()}`,
          };

          localStorage.setItem("token", mockUserData.token);
          login(mockUserData);

          message.success(
            "Login successful! (Mock mode - Backend not available)"
          );
          navigate("/");
        } else {
          message.error(
            "Invalid credentials. Use admin/admin123 or user/user123"
          );
        }
      } else {
        // Other error
        message.error("Login failed: Invalid credentials or server error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
      }}
    >
      <Card
        style={{
          width: 350,
          boxShadow: "0 4px 32px 0 rgba(0,0,0,0.08)",
          borderRadius: 16,
          padding: "32px 24px",
          border: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <img
            src={process.env.NODE_ENV === 'development' ? '/rio-logo.png' : './rio-logo.png'}
            alt="ProLux Group Logo"
            style={{ height: 80, marginBottom: 12 }}
          />
          <Title
            level={3}
            style={{
              margin: 0,
              color: "#1e293b",
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            PROLUX GROUP
          </Title>
          <div
            style={{
              color: "#64748b",
              fontWeight: 500,
              fontSize: 15,
              marginBottom: 8,
            }}
          >
            SUPERIOR NATURAL SURFACES
          </div>
        </div>
        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: "Please enter your username!" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Username"
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please enter your password!" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
              style={{ borderRadius: 8, fontWeight: 600 }}
            >
              Log In
            </Button>
          </Form.Item>
        </Form>
        <div
          style={{
            marginTop: 24,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 13,
          }}
        >
          © {new Date().getFullYear()} PROLUX Group | Developed by FYS-DEV
        </div>
      </Card>
    </div>
  );
}

export default LoginPage;
