import React, { useState } from "react";
import axios from "axios";
import { Form, Input, Button, Typography, Card } from "antd";

const { Title } = Typography;

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onFinish = async (values) => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(
        "http://localhost:5069/api/auth/login",
        {
          username: values.username,
          password: values.password,
        }
      );
      localStorage.setItem("token", response.data.token);
      setError("");
      setLoading(false);
      window.location.href = "/";
    } catch (err) {
      setError("Kredencialet e pavlefshme");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-sm shadow-lg" bordered={false}>
        <Title level={2} className="text-center mb-6">
          Hyrje
        </Title>
        <Form
          name="login"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            label="Emri i Përdoruesit"
            name="username"
            rules={[
              {
                required: true,
                message: "Ju lutemi shkruani emrin e përdoruesit!",
              },
            ]}
          >
            <Input className="py-2" />
          </Form.Item>

          <Form.Item
            label="Fjalëkalimi"
            name="password"
            rules={[
              { required: true, message: "Ju lutemi shkruani fjalëkalimin!" },
            ]}
          >
            <Input.Password className="py-2" />
          </Form.Item>

          {error && (
            <div className="text-red-500 mb-2 text-center">{error}</div>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={loading}
            >
              Hyr
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default LoginPage;
