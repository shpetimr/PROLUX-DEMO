import React, { useState } from "react";
import {
  Button,
  Card,
  Space,
  Typography,
  message,
  Divider,
  Alert,
  Tag,
} from "antd";
import apiClient, { API_ENDPOINTS } from "../config/api";
import { useAuth } from "../contexts/AuthContext";

const { Title, Text } = Typography;

const ApiTest = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [connectionStatus, setConnectionStatus] = useState(null);
  const { isAuthenticated, isAdmin, user } = useAuth();

  const testDirectConnection = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      console.log("Testing direct connection to backend...");
      console.log("Token:", token ? "Present" : "Missing");

      const response = await fetch("http://localhost:5069/api/Projects", {
        method: "GET",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: data,
        message: `Direct connection test - ${
          response.ok ? "Success" : "Failed"
        }: ${response.status} ${response.statusText}`,
      };

      setConnectionStatus(result);
      setResults((prev) => ({ ...prev, "direct-connection": result }));

      if (response.ok) {
        message.success("Direct connection successful!");
      } else {
        message.error(
          `Direct connection failed: ${response.status} ${response.statusText}`
        );
      }

      return result;
    } catch (error) {
      console.error("Direct connection error:", error);

      const result = {
        success: false,
        error: error.message,
        message: `Direct connection failed: ${error.message}`,
      };

      setConnectionStatus(result);
      setResults((prev) => ({ ...prev, "direct-connection": result }));
      message.error(`Direct connection failed: ${error.message}`);

      return result;
    } finally {
      setLoading(false);
    }
  };

  const testCorsConnection = async () => {
    setLoading(true);
    try {
      console.log("Testing CORS connection...");

      const response = await fetch("http://localhost:5069/api/Projects", {
        method: "OPTIONS",
        headers: {
          Origin: window.location.origin,
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "Authorization,Content-Type",
        },
      });

      const result = {
        success: response.ok,
        status: response.status,
        corsHeaders: {
          "Access-Control-Allow-Origin": response.headers.get(
            "Access-Control-Allow-Origin"
          ),
          "Access-Control-Allow-Methods": response.headers.get(
            "Access-Control-Allow-Methods"
          ),
          "Access-Control-Allow-Headers": response.headers.get(
            "Access-Control-Allow-Headers"
          ),
        },
        message: `CORS test - ${response.ok ? "Success" : "Failed"}: ${
          response.status
        }`,
      };

      setResults((prev) => ({ ...prev, "cors-test": result }));

      if (response.ok) {
        message.success("CORS test successful!");
      } else {
        message.error(`CORS test failed: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error("CORS test error:", error);

      const result = {
        success: false,
        error: error.message,
        message: `CORS test failed: ${error.message}`,
      };

      setResults((prev) => ({ ...prev, "cors-test": result }));
      message.error(`CORS test failed: ${error.message}`);

      return result;
    } finally {
      setLoading(false);
    }
  };

  const testApiCall = async (endpoint, method = "GET", data = null) => {
    setLoading(true);
    try {
      console.log(`Testing ${method} ${endpoint}`);

      let response;
      switch (method) {
        case "GET":
          response = await apiClient.get(endpoint);
          break;
        case "POST":
          response = await apiClient.post(endpoint, data);
          break;
        case "PUT":
          response = await apiClient.put(endpoint, data);
          break;
        case "DELETE":
          response = await apiClient.delete(endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      const result = {
        success: true,
        status: response.status,
        data: response.data,
        message: `${method} ${endpoint} - Success`,
      };

      setResults((prev) => ({ ...prev, [endpoint]: result }));
      message.success(`${method} ${endpoint} - Success`);

      return result;
    } catch (error) {
      const result = {
        success: false,
        status: error.response?.status,
        error: error.message,
        response: error.response?.data,
        message: `${method} ${endpoint} - Failed: ${error.response?.status} ${error.response?.statusText}`,
      };

      setResults((prev) => ({ ...prev, [endpoint]: result }));
      message.error(
        `${method} ${endpoint} - Failed: ${error.response?.status} ${error.response?.statusText}`
      );

      return result;
    } finally {
      setLoading(false);
    }
  };

  const testAuthentication = () => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    console.log("Authentication Test:");
    console.log("- Token exists:", !!token);
    console.log("- Token length:", token ? token.length : 0);
    console.log(
      "- Token preview:",
      token ? token.substring(0, 20) + "..." : "None"
    );
    console.log("- User data exists:", !!userData);
    console.log("- Current user:", user);
    console.log("- Is authenticated:", isAuthenticated());
    console.log("- Is admin:", isAdmin());

    const authResult = {
      success: isAuthenticated(),
      token: !!token,
      tokenLength: token ? token.length : 0,
      user: user,
      isAdmin: isAdmin(),
      message: `Authentication - ${isAuthenticated() ? "Valid" : "Invalid"}`,
    };

    setResults((prev) => ({ ...prev, authentication: authResult }));
    message.info("Authentication test completed. Check results below.");
  };

  const testProjects = async () => {
    await testApiCall(API_ENDPOINTS.PROJECTS, "GET");
  };

  const testDebts = async () => {
    await testApiCall(API_ENDPOINTS.DEBTS, "GET");
  };

  const testExpenses = async () => {
    await testApiCall(API_ENDPOINTS.EXPENSES, "GET");
  };

  const testAllEndpoints = async () => {
    console.log("Testing all endpoints...");

    // Test GET endpoints
    await testApiCall(API_ENDPOINTS.PROJECTS, "GET");
    await testApiCall(API_ENDPOINTS.DEBTS, "GET");
    await testApiCall(API_ENDPOINTS.EXPENSES, "GET");
    await testApiCall(API_ENDPOINTS.INCOMES, "GET");
    await testApiCall(API_ENDPOINTS.PURCHASES, "GET");
    await testApiCall(API_ENDPOINTS.RENTS, "GET");

    message.success("All endpoint tests completed. Check results below.");
  };

  const clearResults = () => {
    setResults({});
    setConnectionStatus(null);
  };

  const getStatusColor = (success) => (success ? "green" : "red");

  return (
    <div style={{ padding: "20px" }}>
      <Title level={2}>API Test Panel</Title>

      <Alert
        message="Backend Connection Testing"
        description="This panel helps you test the connection to your backend API and identify any issues with authentication, CORS, or API endpoints."
        type="info"
        showIcon
        style={{ marginBottom: "20px" }}
      />

      <Card style={{ marginBottom: "20px" }}>
        <Title level={4}>Connection Tests</Title>
        <Space wrap>
          <Button
            onClick={testDirectConnection}
            loading={loading}
            type="primary"
          >
            Test Direct Connection
          </Button>
          <Button onClick={testCorsConnection} loading={loading} type="primary">
            Test CORS
          </Button>
          <Button onClick={testAuthentication} type="default">
            Test Authentication
          </Button>
        </Space>
      </Card>

      <Card style={{ marginBottom: "20px" }}>
        <Title level={4}>Authentication Status</Title>
        <Space direction="vertical">
          <Text>User: {user?.username || "Not logged in"}</Text>
          <Text>Role: {user?.role || "Unknown"}</Text>
          <Text>
            Authenticated:{" "}
            <Tag color={isAuthenticated() ? "green" : "red"}>
              {isAuthenticated() ? "Yes" : "No"}
            </Tag>
          </Text>
          <Text>
            Admin:{" "}
            <Tag color={isAdmin() ? "green" : "red"}>
              {isAdmin() ? "Yes" : "No"}
            </Tag>
          </Text>
          <Text>
            Token:{" "}
            <Tag color={localStorage.getItem("token") ? "green" : "red"}>
              {localStorage.getItem("token") ? "Present" : "Missing"}
            </Tag>
          </Text>
        </Space>
      </Card>

      <Card style={{ marginBottom: "20px" }}>
        <Title level={4}>API Endpoint Tests</Title>
        <Space wrap>
          <Button onClick={testProjects} loading={loading} type="primary">
            Test Projects
          </Button>
          <Button onClick={testDebts} loading={loading} type="primary">
            Test Debts
          </Button>
          <Button onClick={testExpenses} loading={loading} type="primary">
            Test Expenses
          </Button>
          <Button onClick={testAllEndpoints} loading={loading} type="default">
            Test All Endpoints
          </Button>
          <Button onClick={clearResults} danger>
            Clear Results
          </Button>
        </Space>
      </Card>

      {Object.keys(results).length > 0 && (
        <Card>
          <Title level={4}>Test Results</Title>
          <Space direction="vertical" style={{ width: "100%" }}>
            {Object.entries(results).map(([endpoint, result]) => (
              <div
                key={endpoint}
                style={{
                  padding: "15px",
                  border: "1px solid #d9d9d9",
                  borderRadius: "6px",
                  backgroundColor: result.success ? "#f6ffed" : "#fff2f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <Text strong>{endpoint}</Text>
                  <Tag color={getStatusColor(result.success)}>
                    {result.success ? "SUCCESS" : "FAILED"}
                  </Tag>
                </div>
                <Text type={result.success ? "success" : "danger"}>
                  {result.message}
                </Text>
                {result.status && (
                  <div style={{ marginTop: "5px" }}>
                    <Text type="secondary">
                      Status: {result.status} {result.statusText}
                    </Text>
                  </div>
                )}
                {result.data && (
                  <div style={{ marginTop: "5px" }}>
                    <Text type="secondary">
                      Data: {JSON.stringify(result.data).substring(0, 200)}...
                    </Text>
                  </div>
                )}
                {result.response && (
                  <div style={{ marginTop: "5px" }}>
                    <Text type="secondary">
                      Error Response: {JSON.stringify(result.response)}
                    </Text>
                  </div>
                )}
                {result.corsHeaders && (
                  <div style={{ marginTop: "5px" }}>
                    <Text type="secondary">
                      CORS Headers: {JSON.stringify(result.corsHeaders)}
                    </Text>
                  </div>
                )}
              </div>
            ))}
          </Space>
        </Card>
      )}

      <Card style={{ marginTop: "20px" }}>
        <Title level={4}>Manual Testing Instructions</Title>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text strong>1. Test Direct Connection:</Text>
          <Text code>
            {`fetch('http://localhost:5069/api/Projects', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error: ', error));`}
          </Text>

          <Divider />

          <Text strong>2. Check Network Tab:</Text>
          <Text>
            Open Developer Tools → Network tab and look for requests to
            localhost:5069
          </Text>

          <Divider />

          <Text strong>3. Test Swagger UI:</Text>
          <Text>
            Visit{" "}
            <a
              href="http://localhost:5069/swagger"
              target="_blank"
              rel="noopener noreferrer"
            >
              http://localhost:5069/swagger
            </a>{" "}
            to test the API directly
          </Text>
        </Space>
      </Card>
    </div>
  );
};

export default ApiTest;
