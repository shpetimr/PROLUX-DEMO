import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Button,
  Select,
  Space,
  Spin,
  message,
  Alert,
  Layout,
} from "antd";
import {
  AppstoreOutlined,
  DollarOutlined,
  FileDoneOutlined,
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
  ReloadOutlined,
  TeamOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import apiClient, { API_ENDPOINTS } from "../config/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useDataChange } from "../contexts/DataChangeContext";

dayjs.extend(utc);

const { Title, Text } = Typography;
const { Option } = Select;
const { Content } = Layout;

const emptyStockSegment = {
  itemCount: 0,
  currentQuantity: 0,
  lowStockCount: 0,
  quantityIn: 0,
  quantityOut: 0,
  movementCount: 0,
};

const normalizeStockSegment = (segment = {}) => ({
  itemCount: Number(segment.itemCount || 0),
  currentQuantity: Number(segment.currentQuantity || 0),
  lowStockCount: Number(segment.lowStockCount || 0),
  quantityIn: Number(segment.quantityIn || 0),
  quantityOut: Number(segment.quantityOut || 0),
  movementCount: Number(segment.movementCount || 0),
});

function Reports() {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [monthlyTotals, setMonthlyTotals] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalPurchases: 0,
    totalRents: 0,
    totalSalaries: 0,
    totalArchivedInvoices: 0,
    archivedInvoicesCount: 0,
    totalWorkSalesRevenue: 0,
    totalWorkSalesCost: 0,
    totalWorkSalesProfit: 0,
    workSalesCount: 0,
    stockSplit: {
      material: emptyStockSegment,
      product: emptyStockSegment,
    },
    netProfit: 0,
    margin: 0,
  });
  const { dataChanged } = useDataChange();

  // Generate month options for the last 12 months
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = dayjs().subtract(i, "month");
    return {
      value: date.format("YYYY-MM"),
      label: date.format("MMMM YYYY"),
      albanianName: getAlbanianMonthName(date.month()),
    };
  });

  function getAlbanianMonthName(month) {
    const months = [
      "Janar",
      "Shkurt",
      "Mars",
      "Prill",
      "Maj",
      "Qershor",
      "Korrik",
      "Gusht",
      "Shtator",
      "Tetor",
      "Nëntor",
      "Dhjetor",
    ];
    return months[month];
  }

  useEffect(() => {
    fetchFinancialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, dataChanged]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split("-").map(Number);
      const response = await apiClient.get(
        API_ENDPOINTS.FINANCIAL_CALCULATIONS.MONTHLY,
        { params: { year, month } }
      );
      const summary = response.data?.financialSummary || {};
      const totalIncome = Number(summary.totalIncome || 0);
      const totalExpenses = Number(summary.totalExpenses || 0);
      const totalPurchases = Number(summary.totalPurchases || 0);
      const totalRents = Number(summary.totalRents || 0);
      const totalSalaries = Number(summary.totalEmployeePayments || 0);
      const totalArchivedInvoices = Number(
        summary.totalArchivedInvoices || response.data?.archivedInvoices?.total || 0
      );
      const archivedInvoicesCount = Number(
        summary.archivedInvoicesCount || response.data?.archivedInvoices?.count || 0
      );
      const totalWorkSalesRevenue = Number(summary.totalWorkSalesRevenue || 0);
      const totalWorkSalesCost = Number(summary.totalWorkSalesCost || 0);
      const totalWorkSalesProfit = Number(summary.totalWorkSalesProfit || 0);
      const workSalesCount = Number(
        response.data?.transactionCounts?.workSales || 0
      );
      const stockSplit = response.data?.stockSplit || {};
      const netProfit = Number(summary.netIncome || 0);
      const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      setMonthlyTotals({
        totalIncome,
        totalExpenses,
        totalPurchases,
        totalRents,
        totalSalaries,
        totalArchivedInvoices,
        archivedInvoicesCount,
        totalWorkSalesRevenue,
        totalWorkSalesCost,
        totalWorkSalesProfit,
        workSalesCount,
        stockSplit: {
          material: normalizeStockSegment(stockSplit.material),
          product: normalizeStockSegment(stockSplit.product),
        },
        netProfit,
        margin,
      });
    } catch (error) {
      console.error("Error fetching financial data:", error);
      message.error("Dështoi të merren të dhënat financiare");
    } finally {
      setLoading(false);
    }
  };

  const selectedMonthDisplay = monthOptions.find(
    (option) => option.value === selectedMonth
  );

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Content className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-3">
                <BarChartOutlined className="text-2xl text-blue-600" />
                <Title level={2} className="mb-0 text-gray-800">
                  Raporti Financiar - {selectedMonthDisplay?.albanianName}{" "}
                  {selectedMonth.split("-")[0]}
                </Title>
              </div>
              <Space>
                <Select
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  style={{ width: 200 }}
                  placeholder="Zgjidh muajin"
                >
                  {monthOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.albanianName} {option.value.split("-")[0]}
                    </Option>
                  ))}
                </Select>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={fetchFinancialData}
                  loading={loading}
                >
                  Rifresko
                </Button>
              </Space>
            </div>
          </div>
          <Spin spinning={loading}>
            {/* Summary Metrics */}
            <Row gutter={[16, 16]} className="mb-8">
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <Statistic
                    title="Të Ardhurat"
                    value={monthlyTotals.totalIncome}
                    precision={2}
                    valueStyle={{ color: "#52c41a" }}
                    prefix={<RiseOutlined />}
                    suffix="DEN"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <Statistic
                    title="Shpenzimet"
                    value={
                      monthlyTotals.totalExpenses +
                      monthlyTotals.totalPurchases +
                      monthlyTotals.totalRents +
                      monthlyTotals.totalSalaries
                    }
                    precision={2}
                    valueStyle={{ color: "#ff4d4f" }}
                    prefix={<FallOutlined />}
                    suffix="DEN"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <Statistic
                    title="Pagat"
                    value={monthlyTotals.totalSalaries}
                    precision={2}
                    valueStyle={{ color: "#fa8c16" }}
                    prefix={<TeamOutlined />}
                    suffix="DEN"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <Statistic
                    title="Fitimi Neto"
                    value={monthlyTotals.netProfit}
                    precision={2}
                    valueStyle={{
                      color:
                        monthlyTotals.netProfit >= 0 ? "#1890ff" : "#ff4d4f",
                    }}
                    prefix={<DollarOutlined />}
                    suffix="DEN"
                  />
                </Card>
              </Col>
              {/* <Col xs={24} sm={12} md={6}>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <Statistic
                    title="Marzha"
                    value={monthlyTotals.margin}
                    precision={1}
                    valueStyle={{
                      color: monthlyTotals.margin >= 0 ? "#722ed1" : "#ff4d4f",
                    }}
                    prefix={<BarChartOutlined />}
                    suffix="%"
                  />
                </Card>
              </Col> */}
            </Row>

            <Row gutter={[16, 16]} className="mb-8">
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <Statistic
                    title="Faturat e Arkivuara"
                    value={monthlyTotals.totalArchivedInvoices}
                    precision={2}
                    valueStyle={{ color: "#13c2c2" }}
                    prefix={<FileDoneOutlined />}
                    suffix="DEN"
                  />
                  <Text type="secondary">
                    {monthlyTotals.archivedInvoicesCount} fatura
                  </Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <Statistic
                    title="Qarkullimi nga Punët"
                    value={monthlyTotals.totalWorkSalesRevenue}
                    precision={2}
                    valueStyle={{ color: "#52c41a" }}
                    prefix={<ToolOutlined />}
                    suffix="DEN"
                  />
                  <Text type="secondary">
                    {monthlyTotals.workSalesCount} punë
                  </Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <Statistic
                    title="Kosto nga Punët"
                    value={monthlyTotals.totalWorkSalesCost}
                    precision={2}
                    valueStyle={{ color: "#ff4d4f" }}
                    prefix={<FallOutlined />}
                    suffix="DEN"
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <Statistic
                    title="Fitimi nga Punët"
                    value={monthlyTotals.totalWorkSalesProfit}
                    precision={2}
                    valueStyle={{
                      color:
                        monthlyTotals.totalWorkSalesProfit >= 0
                          ? "#1890ff"
                          : "#ff4d4f",
                    }}
                    prefix={<DollarOutlined />}
                    suffix="DEN"
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} className="mb-8">
              <Col xs={24} md={12}>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <Statistic
                    title="Stoku i Materialeve"
                    value={monthlyTotals.stockSplit.material.currentQuantity}
                    precision={2}
                    valueStyle={{ color: "#1677ff" }}
                    prefix={<AppstoreOutlined />}
                    suffix="sasi"
                  />
                  <Text type="secondary">
                    {monthlyTotals.stockSplit.material.itemCount} artikuj,{" "}
                    {monthlyTotals.stockSplit.material.quantityOut.toFixed(2)} të përdorura këtë muaj
                  </Text>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card className="shadow-md hover:shadow-lg transition-shadow">
                  <Statistic
                    title="Stoku i Produkteve"
                    value={monthlyTotals.stockSplit.product.currentQuantity}
                    precision={2}
                    valueStyle={{ color: "#722ed1" }}
                    prefix={<AppstoreOutlined />}
                    suffix="sasi"
                  />
                  <Text type="secondary">
                    {monthlyTotals.stockSplit.product.itemCount} artikuj,{" "}
                    {monthlyTotals.stockSplit.product.quantityOut.toFixed(2)} të përdorura këtë muaj
                  </Text>
                </Card>
              </Col>
            </Row>

            {/* No Data Warning */}
            {monthlyTotals.totalIncome === 0 &&
              monthlyTotals.totalExpenses === 0 &&
              monthlyTotals.totalPurchases === 0 &&
              monthlyTotals.totalRents === 0 &&
              monthlyTotals.totalSalaries === 0 &&
              monthlyTotals.totalArchivedInvoices === 0 &&
              monthlyTotals.totalWorkSalesRevenue === 0 && (
                <Row className="mt-6">
                  <Col span={24}>
                    <Alert
                      message="Nuk ka të dhëna"
                      description={`Nuk ka të dhëna financiare për ${
                        selectedMonthDisplay?.albanianName
                      } ${
                        selectedMonth.split("-")[0]
                      }. Provoni të zgjidhni një muaj tjetër ose të shtoni të dhëna të reja.`}
                      type="warning"
                      showIcon
                      className="shadow-sm"
                    />
                  </Col>
                </Row>
              )}

            {/* Additional Info */}
            <Row className="mt-8">
              <Col span={24}>
                <Alert
                  message="Informacion i Raportit"
                  description={`Raporti financiar për ${
                    selectedMonthDisplay?.albanianName
                  } ${
                    selectedMonth.split("-")[0]
                  }. Të dhënat vijnë nga backend dhe përfshijnë pagat, faturat e arkivuara, punët dhe ndarjen e stokut Material/Produkt.`}
                  type="info"
                  showIcon
                  className="shadow-sm"
                />
              </Col>
            </Row>
          </Spin>
        </div>
      </Content>
    </Layout>
  );
}

export default Reports;
