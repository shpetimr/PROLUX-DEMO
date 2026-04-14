import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Button,
  Table,
  Space,
  Spin,
  message,
  Divider,
  Tag,
  DatePicker,
  Select,
  Collapse,
  Progress,
  Tooltip,
  Badge,
} from "antd";
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  HomeOutlined,
  TeamOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  PieChartOutlined,
  TrophyOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Panel } = Collapse;

const MonthlyTrackingTest = () => {
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  // Mock data for testing
  const mockMonthlyData = {
    summary: {
      totalIncome: 150000,
      totalExpenses: 85000,
      netProfit: 65000,
      profitMargin: 43.3,
    },
    expenses: {
      breakdown: [
        { type: "Materiale", amount: 30000, percentage: 35.3 },
        { type: "Paga", amount: 25000, percentage: 29.4 },
        { type: "Shërbime", amount: 15000, percentage: 17.6 },
        { type: "Të Tjera", amount: 15000, percentage: 17.6 },
      ],
      transactions: [
        {
          description: "Blerja e materialeve",
          amount: 15000,
          date: "2025-06-15",
        },
        { description: "Paga punëtorëve", amount: 25000, date: "2025-06-30" },
        {
          description: "Faturat e energjisë",
          amount: 8000,
          date: "2025-06-20",
        },
      ],
    },
    purchases: {
      breakdown: [
        { category: "Materiale ndërtimi", amount: 20000, percentage: 40.0 },
        { category: "Mjete", amount: 15000, percentage: 30.0 },
        { category: "Pajisje", amount: 10000, percentage: 20.0 },
        { category: "Të tjera", amount: 5000, percentage: 10.0 },
      ],
    },
    incomes: {
      breakdown: [
        { source: "Projekte ndërtimi", amount: 100000, percentage: 66.7 },
        { source: "Shërbime", amount: 30000, percentage: 20.0 },
        { source: "Qira", amount: 20000, percentage: 13.3 },
      ],
      transactions: [
        { source: "Projekti A", amount: 50000, date: "2025-06-10" },
        { source: "Projekti B", amount: 50000, date: "2025-06-25" },
        { source: "Shërbime", amount: 30000, date: "2025-06-20" },
      ],
    },
    rents: {
      breakdown: [
        { location: "Tirana", amount: 12000, percentage: 60.0 },
        { location: "Durrës", amount: 8000, percentage: 40.0 },
      ],
    },
    employeePayments: {
      breakdown: [
        {
          position: "Inxhinier",
          baseSalary: 15000,
                      monthlyBonuses: 2000,
            monthlyPenalties: 0,
          total: 17000,
        },
        {
          position: "Punëtor",
          baseSalary: 8000,
                      monthlyBonuses: 500,
            monthlyPenalties: 200,
          total: 8300,
        },
      ],
    },
  };

  const fetchMockData = async () => {
    setLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setMonthlyData(mockMonthlyData);
      setLoading(false);
      message.success("Të dhënat u morën me sukses!");
    }, 1000);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("mk-MK", {
      style: "currency",
      currency: "MKD",
    }).format(amount || 0);
  };

  const getProfitColor = (profit) => {
    return profit >= 0 ? "#52c41a" : "#ff4d4f";
  };

  const getProfitIcon = (profit) => {
    return profit >= 0 ? <RiseOutlined /> : <FallOutlined />;
  };

  const renderSummaryCards = () => {
    if (!monthlyData) return null;

    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Të Ardhurat Totale"
              value={monthlyData.summary.totalIncome}
              precision={2}
              valueStyle={{ color: "#52c41a" }}
              prefix={<DollarOutlined />}
              suffix="MKD"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Shpenzimet Totale"
              value={monthlyData.summary.totalExpenses}
              precision={2}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<FallOutlined />}
              suffix="MKD"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Fitimi Neto"
              value={monthlyData.summary.netProfit}
              precision={2}
              valueStyle={{
                color: getProfitColor(monthlyData.summary.netProfit),
              }}
              prefix={getProfitIcon(monthlyData.summary.netProfit)}
              suffix="MKD"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Marzhi i Fitimit"
              value={monthlyData.summary.profitMargin}
              precision={1}
              valueStyle={{
                color: getProfitColor(monthlyData.summary.profitMargin),
              }}
              prefix={<BarChartOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>
    );
  };

  const renderDetailedBreakdown = () => {
    if (!monthlyData) return null;

    return (
      <Collapse defaultActiveKey={["1"]} style={{ marginBottom: 24 }}>
        <Panel header="Detajet e Shpenzimeve" key="1">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Shpenzimet sipas Llojit" size="small">
                <Table
                  dataSource={monthlyData.expenses?.breakdown || []}
                  columns={[
                    { title: "Lloji", dataIndex: "type", key: "type" },
                    {
                      title: "Shuma",
                      dataIndex: "amount",
                      key: "amount",
                      render: (amount) => formatCurrency(amount),
                    },
                    {
                      title: "Përqindja",
                      dataIndex: "percentage",
                      key: "percentage",
                      render: (percentage) => `${percentage.toFixed(1)}%`,
                    },
                  ]}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Blerjet sipas Kategorisë" size="small">
                <Table
                  dataSource={monthlyData.purchases?.breakdown || []}
                  columns={[
                    {
                      title: "Kategoria",
                      dataIndex: "category",
                      key: "category",
                    },
                    {
                      title: "Shuma",
                      dataIndex: "amount",
                      key: "amount",
                      render: (amount) => formatCurrency(amount),
                    },
                    {
                      title: "Përqindja",
                      dataIndex: "percentage",
                      key: "percentage",
                      render: (percentage) => `${percentage.toFixed(1)}%`,
                    },
                  ]}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        </Panel>

        <Panel header="Detajet e Të Ardhurave" key="2">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Të Ardhurat sipas Burimit" size="small">
                <Table
                  dataSource={monthlyData.incomes?.breakdown || []}
                  columns={[
                    { title: "Burimi", dataIndex: "source", key: "source" },
                    {
                      title: "Shuma",
                      dataIndex: "amount",
                      key: "amount",
                      render: (amount) => formatCurrency(amount),
                    },
                    {
                      title: "Përqindja",
                      dataIndex: "percentage",
                      key: "percentage",
                      render: (percentage) => `${percentage.toFixed(1)}%`,
                    },
                  ]}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Qiratë sipas Vendndodhjes" size="small">
                <Table
                  dataSource={monthlyData.rents?.breakdown || []}
                  columns={[
                    {
                      title: "Vendndodhja",
                      dataIndex: "location",
                      key: "location",
                    },
                    {
                      title: "Shuma",
                      dataIndex: "amount",
                      key: "amount",
                      render: (amount) => formatCurrency(amount),
                    },
                    {
                      title: "Përqindja",
                      dataIndex: "percentage",
                      key: "percentage",
                      render: (percentage) => `${percentage.toFixed(1)}%`,
                    },
                  ]}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        </Panel>

        <Panel header="Detajet e Punëtorëve" key="3">
          <Card title="Pagesat e Punëtorëve sipas Pozicionit" size="small">
            <Table
              dataSource={monthlyData.employeePayments?.breakdown || []}
              columns={[
                { title: "Pozicioni", dataIndex: "position", key: "position" },
                {
                  title: "Paga Bazë",
                  dataIndex: "baseSalary",
                  key: "baseSalary",
                  render: (amount) => formatCurrency(amount),
                },
                {
                  title: "Bonuset Mujore",
                  dataIndex: "monthlyBonuses",
                  key: "monthlyBonuses",
                  render: (amount) => formatCurrency(amount),
                },
                {
                  title: "Gjobat Mujore",
                  dataIndex: "monthlyPenalties",
                  key: "monthlyPenalties",
                  render: (amount) => formatCurrency(amount),
                },
                {
                  title: "Total",
                  dataIndex: "total",
                  key: "total",
                  render: (amount) => formatCurrency(amount),
                },
              ]}
              pagination={false}
              size="small"
            />
          </Card>
        </Panel>
      </Collapse>
    );
  };

  return (
    <div style={{ padding: "24px" }}>
      <Card>
        <Title level={2}>
          <CalendarOutlined /> Test i Gjurmimit Mujor
        </Title>

        <Paragraph>
          Ky është një test me të dhëna të simuluara për të verifikuar
          funksionalitetin e gjurmimit mujor.
        </Paragraph>

        {/* Controls */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12}>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                placeholder={["Data Fillestare", "Data Përfundimtare"]}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Button
                type="primary"
                onClick={fetchMockData}
                loading={loading}
                icon={<BarChartOutlined />}
                style={{ width: "100%" }}
              >
                Testo me të Dhëna të Simuluara
              </Button>
            </Col>
          </Row>
        </Card>

        {loading && (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>Duke marrë të dhënat...</div>
          </div>
        )}

        {!loading && monthlyData && (
          <>
            {renderSummaryCards()}
            {renderDetailedBreakdown()}
          </>
        )}

        {!loading && !monthlyData && (
          <Card style={{ textAlign: "center", padding: "50px" }}>
            <FileTextOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
            <div style={{ marginTop: 16, color: "#8c8c8c" }}>
              Klikoni "Testo me të Dhëna të Simuluara" për të parë raportin
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default MonthlyTrackingTest;
