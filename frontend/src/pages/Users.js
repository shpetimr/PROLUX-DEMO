import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import {
  IdcardOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import apiClient, { API_ENDPOINTS } from "../config/api";
import { ROLES } from "../config/permissions";
import { useDataChange } from "../contexts/DataChangeContext";

const { Title, Text } = Typography;

const roleOptions = [
  { value: ROLES.USER, label: "Worker" },
  { value: ROLES.ADMIN, label: "Admin" },
];

const positionOptions = [
  { value: "magazine", label: "Magazine" },
  { value: "terren", label: "Terren" },
];

const getDefaultDailyWage = (position) =>
  position === "terren" ? 2460 : 1850;

const getApiErrorMessage = (error) => {
  const data = error?.response?.data;

  if (data?.message) {
    return data.message;
  }

  const validationErrors = data?.errors
    ? Object.values(data.errors).flat()
    : [];

  if (validationErrors.length > 0) {
    return validationErrors[0];
  }

  if (data?.title) {
    return data.title;
  }

  if (typeof data === "string") {
    return data;
  }

  return "Failed to create user account.";
};

const countPasswordGroups = (password) => {
  return [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
};

function Users() {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [createdUser, setCreatedUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const { notifyDataChanged } = useDataChange();
  const selectedRole = Form.useWatch("role", form);
  const selectedEmployeeId = Form.useWatch("employeeId", form);
  const currentRole = selectedRole ?? ROLES.USER;

  const fetchEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES);
      setEmployees(Array.isArray(response.data) ? response.data : []);
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((employee) => !employee.linkedUserId)
        .map((employee) => ({
          value: employee.id,
          label: `${employee.fullName} (${employee.position})`,
        })),
    [employees]
  );

  const shouldCollectEmployeeDetails =
    currentRole === ROLES.USER && !selectedEmployeeId;

  const validatePassword = (_, value) => {
    if (!value) {
      return Promise.resolve();
    }

    if (value.length < 12) {
      return Promise.reject(
        new Error("Password must be at least 12 characters long.")
      );
    }

    if (countPasswordGroups(value) < 3) {
      return Promise.reject(
        new Error(
          "Use at least three groups: uppercase, lowercase, numbers, symbols."
        )
      );
    }

    const username = form.getFieldValue("username")?.trim();
    if (
      username &&
      value.toLowerCase().includes(username.toLowerCase())
    ) {
      return Promise.reject(
        new Error("Password must not contain the username.")
      );
    }

    const fullName = form.getFieldValue("fullName") ?? "";
    const nameTokens = fullName
      .split(" ")
      .map((part) => part.trim())
      .filter((part) => part.length >= 3);

    if (
      nameTokens.some((part) =>
        value.toLowerCase().includes(part.toLowerCase())
      )
    ) {
      return Promise.reject(
        new Error("Password must not contain the user's name.")
      );
    }

    return Promise.resolve();
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    setCreatedUser(null);

    const payload = {
      username: values.username.trim(),
      fullName: values.fullName.trim(),
      password: values.password,
      role: values.role,
    };

    if (values.role === ROLES.USER) {
      if (values.employeeId) {
        payload.employeeId = values.employeeId;
      } else {
        const employeePosition = values.employeePosition || "magazine";
        const dailyWage =
          values.dailyWage ?? getDefaultDailyWage(employeePosition);

        payload.employeePosition = employeePosition;
        payload.hireDate = values.hireDate
          ? values.hireDate.format("YYYY-MM-DD")
          : dayjs().format("YYYY-MM-DD");
        payload.dailyWage = dailyWage;
        payload.dailyRate = dailyWage;
      }
    }

    try {
      const response = await apiClient.post(API_ENDPOINTS.REGISTER, payload);
      const user = response.data ?? {};

      setCreatedUser({
        username: user.username ?? payload.username,
        fullName: user.fullName ?? payload.fullName,
        role: user.role ?? payload.role,
      });
      await fetchEmployees();
      notifyDataChanged();

      message.success("User account created.");
      form.resetFields();
      form.setFieldsValue({
        role: ROLES.USER,
        employeePosition: "magazine",
        hireDate: dayjs(),
        dailyWage: getDefaultDailyWage("magazine"),
      });
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Space align="center" size={12}>
          <UserAddOutlined className="text-2xl text-blue-600" />
          <Title level={2} className="m-0">
            Users
          </Title>
        </Space>
        <div className="mt-2">
          <Text type="secondary">Create staff sign-in accounts.</Text>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            role: ROLES.USER,
            employeePosition: "magazine",
            hireDate: dayjs(),
            dailyWage: getDefaultDailyWage("magazine"),
          }}
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="Username"
            name="username"
            rules={[
              { required: true, message: "Username is required." },
              { max: 50, message: "Username cannot exceed 50 characters." },
              {
                transform: (value) => value?.trim(),
                whitespace: true,
                message: "Username is required.",
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="username"
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item
            label="Full name"
            name="fullName"
            rules={[
              { required: true, message: "Full name is required." },
              { max: 100, message: "Full name cannot exceed 100 characters." },
              {
                transform: (value) => value?.trim(),
                whitespace: true,
                message: "Full name is required.",
              },
            ]}
          >
            <Input
              prefix={<IdcardOutlined />}
              placeholder="Full name"
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            dependencies={["username", "fullName"]}
            rules={[
              { required: true, message: "Password is required." },
              { max: 512, message: "Password cannot exceed 512 characters." },
              { validator: validatePassword },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: "Role is required." }]}
          >
            <Select
              options={roleOptions}
              suffixIcon={<SafetyCertificateOutlined />}
              onChange={(role) => {
                if (role === ROLES.USER) {
                  form.setFieldsValue({
                    employeePosition: "magazine",
                    hireDate: form.getFieldValue("hireDate") || dayjs(),
                    dailyWage:
                      form.getFieldValue("dailyWage") ??
                      getDefaultDailyWage("magazine"),
                  });
                }
              }}
            />
          </Form.Item>

          {currentRole === ROLES.USER && (
            <>
              <Form.Item label="Employee record" name="employeeId">
                <Select
                  allowClear
                  showSearch
                  loading={loadingEmployees}
                  options={employeeOptions}
                  optionFilterProp="label"
                  placeholder="Create new employee"
                  onChange={(employeeId) => {
                    const employee = employees.find(
                      (item) => item.id === employeeId
                    );
                    if (employee && !form.getFieldValue("fullName")) {
                      form.setFieldsValue({ fullName: employee.fullName });
                    }
                  }}
                />
              </Form.Item>

              {shouldCollectEmployeeDetails && (
                <>
                  <Form.Item
                    label="Employee position"
                    name="employeePosition"
                    rules={[
                      {
                        required: true,
                        message: "Employee position is required.",
                      },
                    ]}
                  >
                    <Select
                      options={positionOptions}
                      onChange={(position) =>
                        form.setFieldsValue({
                          dailyWage: getDefaultDailyWage(position),
                        })
                      }
                    />
                  </Form.Item>

                  <Form.Item
                    label="Hire date"
                    name="hireDate"
                    rules={[
                      { required: true, message: "Hire date is required." },
                    ]}
                  >
                    <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                  </Form.Item>

                  <Form.Item
                    label="Daily wage"
                    name="dailyWage"
                    rules={[
                      { required: true, message: "Daily wage is required." },
                      {
                        type: "number",
                        min: 0,
                        message: "Daily wage must be 0 or greater.",
                      },
                    ]}
                  >
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </>
              )}
            </>
          )}

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              icon={<UserAddOutlined />}
              loading={saving}
            >
              Create User
            </Button>
          </Form.Item>
        </Form>

        {createdUser && (
          <Alert
            className="mt-6"
            type="success"
            showIcon
            message="Created user"
            description={`${createdUser.fullName} (${createdUser.username}) - ${createdUser.role}`}
          />
        )}
      </div>
    </div>
  );
}

export default Users;
