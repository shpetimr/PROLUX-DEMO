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
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  BarChartOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import apiClient, { API_ENDPOINTS } from "../config/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useDataChange } from "../contexts/DataChangeContext";

dayjs.extend(utc);

const { Title } = Typography;
const { Option } = Select;
const { Content } = Layout;

function Reports() {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [monthlyTotals, setMonthlyTotals] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalPurchases: 0,
    totalRents: 0,
    totalSalaries: 0,
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
      "NÃƒÂ«ntor",
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
      const netProfit = Number(summary.netIncome || 0);
      const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      setMonthlyTotals({
        totalIncome,
        totalExpenses,
        totalPurchases,
        totalRents,
        totalSalaries,
        netProfit,
        margin,
      });
    } catch (error) {
      console.error("Error fetching financial data:", error);
      message.error("DÃƒÂ«shtoi tÃƒÂ« merren tÃƒÂ« dhÃƒÂ«nat financiare");
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
                    title="TÃƒÂ« Ardhurat"
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

            {/* No Data Warning */}
            {monthlyTotals.totalIncome === 0 &&
              monthlyTotals.totalExpenses === 0 &&
              monthlyTotals.totalPurchases === 0 &&
              monthlyTotals.totalRents === 0 && (
                <Row className="mt-6">
                  <Col span={24}>
                    <Alert
                      message="Nuk ka tÃƒÂ« dhÃƒÂ«na"
                      description={`Nuk ka tÃƒÂ« dhÃƒÂ«na financiare pÃƒÂ«r ${
                        selectedMonthDisplay?.albanianName
                      } ${
                        selectedMonth.split("-")[0]
                      }. Provoni tÃƒÂ« zgjidhni njÃƒÂ« muaj tjetÃƒÂ«r ose tÃƒÂ« shtoni tÃƒÂ« dhÃƒÂ«na tÃƒÂ« reja.`}
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
                  description={`Raporti financiar pÃƒÂ«r ${
                    selectedMonthDisplay?.albanianName
                  } ${
                    selectedMonth.split("-")[0]
                  }. TÃƒÂ« dhÃƒÂ«nat pÃƒÂ«rditÃƒÂ«sohen automatikisht kur ndryshoni muajin ose klikoni butonin "Rifresko". Raporti pÃƒÂ«rfshin tÃƒÂ« gjitha transaksionet financiare dhe llogaritjet e fitimit.`}
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
