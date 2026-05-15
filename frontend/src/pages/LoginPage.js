import React, { useState } from "react";
import apiClient, { API_ENDPOINTS } from "../config/api";
import { Form, Input, Button, Typography, Card, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    const username = values.username.trim();

    try {
      const response = await apiClient.post(API_ENDPOINTS.LOGIN, {
        username,
        password: values.password,
      });

      const { token, ...userData } = response.data ?? {};

      if (!token) {
        message.error("Hyrja dështoi: nuk u pranua token autentikimi");
        return;
      }

      localStorage.setItem("token", token);
      login({
        ...userData,
        username: userData.username ?? username,
      });

      message.success("Hyrja u krye me sukses!");
      navigate("/");
    } catch (err) {
      if (err.response) {
        const errorMessage =
          err.response.data?.message ||
          err.response.data?.error ||
          "Emri i përdoruesit ose fjalëkalimi nuk është i saktë";
        message.error(`Hyrja dështoi: ${errorMessage}`);
      } else if (err.request) {
        message.error("Hyrja dështoi: serveri i autentikimit nuk është i arritshëm");
      } else {
        message.error("Hyrja dështoi: të dhëna të pasakta ose gabim në server");
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
            src={
              process.env.NODE_ENV === "development"
                ? "/prolux-logo.png"
                : "./prolux-logo.png"
            }
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
            rules={[{ required: true, message: "Shkruani emrin e përdoruesit!" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Emri i përdoruesit"
              size="large"
              autoComplete="username"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "Shkruani fjalëkalimin!" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Fjalëkalimi"
              size="large"
              autoComplete="current-password"
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
              Hyr
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
          Copyright {new Date().getFullYear()} PROLUX Group
        </div>
      </Card>
    </div>
  );
}

export default LoginPage;
