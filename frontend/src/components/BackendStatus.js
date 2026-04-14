import React, { useState, useEffect } from "react";
import { Alert, Button } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import apiClient from "../config/api";

const BackendStatus = () => {
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState(null);

  const checkBackendStatus = async () => {
    setStatus("checking");
    setError(null);

    try {
      // Try to reach the backend with a simple GET request to the base URL
      // This will work even if specific endpoints don't exist
      await apiClient.get("/");
      setStatus("connected");
    } catch (err) {
      // If we get a 404, it means the server is running but the endpoint doesn't exist
      // This is still considered "connected" since we can reach the server
      if (err.response && err.response.status === 404) {
        setStatus("connected");
      } else if (err.response) {
        setStatus("connected"); // Any response means server is running
      } else if (err.request) {
        setStatus("disconnected");
        setError(
          "Cannot connect to backend server. Please ensure the backend is running on http://localhost:5069"
        );
      } else {
        setStatus("disconnected");
        setError("Network error occurred");
      }
    }
  };

  useEffect(() => {
    checkBackendStatus();
  }, []);

  if (status === "checking") {
    return (
      <Alert
        message="Checking backend connection..."
        type="info"
        showIcon
        className="mb-4"
      />
    );
  }

  if (status === "connected") {
    return (
      <Alert
        message="Backend connected successfully"
        type="success"
        icon={<CheckCircleOutlined />}
        className="mb-4"
      />
    );
  }

  return (
    <Alert
      message="Backend connection failed"
      description={
        <div>
          <p>{error}</p>
          <Button
            type="primary"
            size="small"
            icon={<ReloadOutlined />}
            onClick={checkBackendStatus}
            className="mt-2"
          >
            Retry Connection
          </Button>
        </div>
      }
      type="error"
      icon={<CloseCircleOutlined />}
      className="mb-4"
    />
  );
};

export default BackendStatus;
