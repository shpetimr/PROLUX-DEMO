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
  { value: ROLES.USER, label: "Punëtor" },
  { value: ROLES.ADMIN, label: "Administrator" },
];

const positionOptions = [
  { value: "magazine", label: "Magazinë" },
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

  return "Dështoi të krijohet llogaria e përdoruesit.";
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
      const response = await apiClient.get(API_ENDPOINTS.AVAILABLE_EMPLOYEES);
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
        new Error("Fjalëkalimi duhet të ketë të paktën 12 karaktere.")
      );
    }

    if (countPasswordGroups(value) < 3) {
      return Promise.reject(
        new Error(
          "Përdorni të paktën tre grupe: shkronja të mëdha, të vogla, numra, simbole."
        )
      );
    }

    const username = form.getFieldValue("username")?.trim();
    if (
      username &&
      value.toLowerCase().includes(username.toLowerCase())
    ) {
      return Promise.reject(
        new Error("Fjalëkalimi nuk duhet të përmbajë emrin e përdoruesit.")
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
        new Error("Fjalëkalimi nuk duhet të përmbajë emrin e personit.")
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

      message.success("Llogaria e përdoruesit u krijua.");
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
            Përdoruesit
          </Title>
        </Space>
        <div className="mt-2">
          <Text type="secondary">Krijo llogari hyrjeje për stafin.</Text>
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
            label="Emri i përdoruesit"
            name="username"
            rules={[
              { required: true, message: "Emri i përdoruesit është i detyrueshëm." },
              { max: 50, message: "Emri i përdoruesit nuk mund të kalojë 50 karaktere." },
              {
                transform: (value) => value?.trim(),
                whitespace: true,
                message: "Emri i përdoruesit është i detyrueshëm.",
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="emri i përdoruesit"
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item
            label="Emri i plotë"
            name="fullName"
            rules={[
              { required: true, message: "Emri i plotë është i detyrueshëm." },
              { max: 100, message: "Emri i plotë nuk mund të kalojë 100 karaktere." },
              {
                transform: (value) => value?.trim(),
                whitespace: true,
                message: "Emri i plotë është i detyrueshëm.",
              },
            ]}
          >
            <Input
              prefix={<IdcardOutlined />}
              placeholder="Emri i plotë"
              autoComplete="off"
            />
          </Form.Item>

          <Form.Item
            label="Fjalëkalimi"
            name="password"
            dependencies={["username", "fullName"]}
            rules={[
              { required: true, message: "Fjalëkalimi është i detyrueshëm." },
              { max: 512, message: "Fjalëkalimi nuk mund të kalojë 512 karaktere." },
              { validator: validatePassword },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Fjalëkalimi"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            label="Roli"
            name="role"
            rules={[{ required: true, message: "Roli është i detyrueshëm." }]}
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
              <Form.Item label="Dosja e punëtorit" name="employeeId">
                <Select
                  allowClear
                  showSearch
                  loading={loadingEmployees}
                  options={employeeOptions}
                  optionFilterProp="label"
                  placeholder="Krijo punëtor të ri"
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
                    label="Pozicioni i punëtorit"
                    name="employeePosition"
                    rules={[
                      {
                        required: true,
                        message: "Pozicioni i punëtorit është i detyrueshëm.",
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
                    label="Data e punësimit"
                    name="hireDate"
                    rules={[
                      { required: true, message: "Data e punësimit është e detyrueshme." },
                    ]}
                  >
                    <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                  </Form.Item>

                  <Form.Item
                    label="Paga ditore"
                    name="dailyWage"
                    rules={[
                      { required: true, message: "Paga ditore është e detyrueshme." },
                      {
                        type: "number",
                        min: 0,
                        message: "Paga ditore duhet të jetë 0 ose më e madhe.",
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
              Krijo Përdorues
            </Button>
          </Form.Item>
        </Form>

        {createdUser && (
          <Alert
            className="mt-6"
            type="success"
            showIcon
            message="Përdoruesi u krijua"
            description={`${createdUser.fullName} (${createdUser.username}) - ${createdUser.role}`}
          />
        )}
      </div>
    </div>
  );
}

export default Users;
