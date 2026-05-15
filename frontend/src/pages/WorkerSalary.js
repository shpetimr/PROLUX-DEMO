import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Card,
  Col,
  Result,
  Row,
  Skeleton,
  Space,
  Statistic,
  Typography,
} from "antd";
import {
  CalendarOutlined,
  DollarOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import apiClient, { API_ENDPOINTS } from "../config/api";

const { Title, Text } = Typography;

const getApiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;

  if (data?.message) {
    return data.message;
  }

  if (data?.title) {
    return data.title;
  }

  if (typeof data === "string") {
    return data;
  }

  return fallback;
};

const formatMoney = (value, salary) => {
  const currency = salary?.currencySymbol || salary?.currencyCode || "MKD";
  return `${(Number(value) || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
};

function SalaryStatCard({ title, value, icon, valueStyle }) {
  return (
    <Card className="bg-white border-0 shadow-md h-full">
      <Statistic
        title={title}
        value={value}
        prefix={icon}
        valueStyle={valueStyle}
      />
    </Card>
  );
}

export function WorkerSalarySummary({ compact = false }) {
  const [salary, setSalary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [currentMonth] = useState(() => dayjs());

  const fetchSalary = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await apiClient.get(
        API_ENDPOINTS.SALARY_ME_MONTH(currentMonth.year(), currentMonth.month() + 1)
      );
      setSalary(response.data);
    } catch (error) {
      setSalary(null);
      setErrorMessage(
        getApiErrorMessage(error, "Dështoi të ngarkohet paga juaj.")
      );
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchSalary();
  }, [fetchSalary]);

  if (loading) {
    return <Skeleton active paragraph={{ rows: compact ? 2 : 4 }} />;
  }

  if (errorMessage) {
    return compact ? (
      <Alert type="warning" message={errorMessage} showIcon />
    ) : (
      <Result
        status="warning"
        title="Paga nuk është e disponueshme"
        subTitle={errorMessage}
      />
    );
  }

  if (!salary) {
    return null;
  }

  return (
    <div>
      {!compact && (
        <div className="mb-6">
          <Space align="center" size={12}>
            <DollarOutlined className="text-2xl text-green-600" />
            <div>
              <Title level={2} className="m-0">
                Paga Ime
              </Title>
              <Text type="secondary">
                Muaji aktual: {currentMonth.format("MMMM YYYY")}
              </Text>
            </div>
          </Space>
        </div>
      )}

      {compact && (
        <Text type="secondary">
          Muaji aktual: {currentMonth.format("MMMM YYYY")}
        </Text>
      )}

      <Row gutter={[16, 16]} className={compact ? "mt-3" : ""}>
        <Col xs={24} md={compact ? 24 : 12} xl={compact ? 12 : 6}>
          <SalaryStatCard
            title="Paga mujore"
            value={formatMoney(salary.monthlySalary, salary)}
            icon={<DollarOutlined className="text-green-600" />}
          />
        </Col>
        <Col xs={24} md={compact ? 24 : 12} xl={compact ? 12 : 6}>
          <SalaryStatCard
            title="Ditët e munguara"
            value={Number(salary.absentDays) || 0}
            icon={<CalendarOutlined className="text-orange-500" />}
          />
        </Col>
        <Col xs={24} md={compact ? 24 : 12} xl={compact ? 12 : 6}>
          <SalaryStatCard
            title="Zbritja ditore"
            value={formatMoney(salary.dailyDeduction, salary)}
            icon={<MinusCircleOutlined className="text-red-500" />}
          />
        </Col>
        <Col xs={24} md={compact ? 24 : 12} xl={compact ? 12 : 6}>
          <SalaryStatCard
            title="Paga finale"
            value={formatMoney(salary.finalSalary, salary)}
            icon={<DollarOutlined className="text-blue-600" />}
            valueStyle={{ color: "#1677ff", fontWeight: 600 }}
          />
        </Col>
      </Row>
    </div>
  );
}

function WorkerSalary() {
  return <WorkerSalarySummary />;
}

export default WorkerSalary;
