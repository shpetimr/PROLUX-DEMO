import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button, Typography, Card } from "antd";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

function Dashboard(props) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");

  useEffect(() => {
    // Optionally fetch user info from backend using token
    const token = localStorage.getItem("token");
    if (!token) return;
    // Example: decode token or fetch user info
    // For now, just set a placeholder
    setUsername("Admin");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-lg shadow-lg" bordered={false}>
        <Title level={2} className="text-center mb-6">
          Welcome, {username}!
        </Title>
        <div className="flex flex-col items-center">
          <Button type="primary" danger onClick={handleLogout} className="mt-4">
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default Dashboard;
