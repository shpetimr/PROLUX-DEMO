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
  Divider,
  Alert,
  Layout,
} from "antd";
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  CalendarOutlined,
  BarChartOutlined,
  HomeOutlined,
  TeamOutlined,
  ShoppingOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import apiClient, { API_ENDPOINTS } from "../config/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useDataChange } from "../contexts/DataChangeContext";

dayjs.extend(utc);

const { Title, Text } = Typography;
const { Option } = Select;
const { Content } = Layout;

function Reports() {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [financialData, setFinancialData] = useState({
    incomes: [],
    expenses: [],
    purchases: [],
    rents: [],
    employees: [],
  });
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
      "Nëntor",
      "Dhjetor",
    ];
    return months[month];
  }

  useEffect(() => {
    fetchFinancialData();
  }, [selectedMonth, dataChanged]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const [incomesRes, expensesRes, purchasesRes, rentsRes, employeesRes] =
        await Promise.all([
          apiClient.get(API_ENDPOINTS.INCOMES),
          apiClient.get(API_ENDPOINTS.EXPENSES),
          apiClient.get(API_ENDPOINTS.PURCHASES),
          apiClient.get(API_ENDPOINTS.RENTS),
          apiClient.get(API_ENDPOINTS.EMPLOYEES),
        ]);

      setFinancialData({
        incomes: incomesRes.data,
        expenses: expensesRes.data,
        purchases: purchasesRes.data,
        rents: rentsRes.data,
        employees: employeesRes.data,
      });

      calculateMonthlyTotals(
        incomesRes.data,
        expensesRes.data,
        purchasesRes.data,
        rentsRes.data,
        employeesRes.data
      );
    } catch (error) {
      console.error("Error fetching financial data:", error);
      message.error("Dështoi të merren të dhënat financiare");
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyTotals = (
    incomes,
    expenses,
    purchases,
    rents,
    employees
  ) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const startOfMonth = dayjs.utc(year, month - 1, 1);
    const endOfMonth = startOfMonth.endOf("month");

    // Filter data for selected month using string comparison
    const monthlyIncomes = incomes.filter((income) => {
      const incomeDateStr = income.date;
      const isInMonth = incomeDateStr.startsWith(
        `${year}-${month.toString().padStart(2, "0")}`
      );

      return isInMonth;
    });
    const monthlyExpenses = expenses.filter((expense) => {
      const expenseDateStr = expense.date;
      const isInMonth = expenseDateStr.startsWith(
        `${year}-${month.toString().padStart(2, "0")}`
      );

      return isInMonth;
    });

    const monthlyPurchases = purchases.filter((purchase) => {
      const purchaseDateStr = purchase.purchaseDate;
      const isInMonth = purchaseDateStr.startsWith(
        `${year}-${month.toString().padStart(2, "0")}`
      );

      return isInMonth;
    });

    const monthlyRents = rents.filter((rent) => {
      const rentDateStr = rent.paymentDate;
      const isInMonth = rentDateStr.startsWith(
        `${year}-${month.toString().padStart(2, "0")}`
      );

      return isInMonth;
    });

    // Calculate totals
    const totalIncome = monthlyIncomes.reduce(
      (sum, income) => sum + (income.amount || 0),
      0
    );
    const totalExpenses = monthlyExpenses.reduce(
      (sum, expense) => sum + (expense.amount || 0),
      0
    );
    const totalPurchases = monthlyPurchases.reduce(
      (sum, purchase) => sum + (purchase.totalPrice || 0),
      0
    );
    const totalRents = monthlyRents.reduce(
      (sum, rent) => sum + (rent.monthlyAmount || 0),
      0
    );

    // Calculate salaries using monthlySalary from backend
    const totalSalaries = employees.reduce((sum, emp) => {
      return sum + (emp.monthlySalary || 0);
    }, 0);

    const totalOutflow =
      totalExpenses + totalPurchases + totalRents + totalSalaries;
    const netProfit = totalIncome - totalOutflow;
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
  };

  // Categorize incomes into Sales and Services
  const categorizeIncomes = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const startOfMonth = dayjs.utc(year, month - 1, 1);
    const endOfMonth = startOfMonth.endOf("month");

    const monthlyIncomes = financialData.incomes.filter((income) => {
      const incomeDate = dayjs.utc(income.date);
      return (
        incomeDate.isSame(startOfMonth, "month") &&
        incomeDate.isSame(startOfMonth, "year")
      );
    });

    // Categorize based on source (you may need to adjust this logic based on your data)
    const sales = monthlyIncomes.filter(
      (income) =>
        income.source?.toLowerCase().includes("shitje") ||
        income.source?.toLowerCase().includes("sale") ||
        income.source?.toLowerCase().includes("projekt") ||
        income.source?.toLowerCase().includes("vill") ||
        income.source?.toLowerCase().includes("apartament")
    );
    const services = monthlyIncomes.filter(
      (income) =>
        income.source?.toLowerCase().includes("shërbim") ||
        income.source?.toLowerCase().includes("service") ||
        income.source?.toLowerCase().includes("montim") ||
        income.source?.toLowerCase().includes("konsultim") ||
        income.source?.toLowerCase().includes("renovim") ||
        income.source?.toLowerCase().includes("tavolina") ||
        income.source?.toLowerCase().includes("lavabor") ||
        income.source?.toLowerCase().includes("pllaka")
    );

    const salesTotal = sales.reduce(
      (sum, income) => sum + (income.amount || 0),
      0
    );
    const servicesTotal = services.reduce(
      (sum, income) => sum + (income.amount || 0),
      0
    );

    return {
      sales: salesTotal,
      services: servicesTotal,
    };
  };

  const incomeCategories = categorizeIncomes();
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

          {/* Financial Calculation Rules - Similar to Employees page - COMMENTED OUT */}
          {/* 
          <Card className="bg-white border-0 shadow-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <h4 className="font-semibold text-green-800 mb-2">
                  Të Ardhurat
                </h4>
                <div className="space-y-1 text-sm">
                  <div>
                    • Shitjet:{" "}
                    <span className="font-medium">
                      {incomeCategories.sales.toLocaleString()} ден
                    </span>
                  </div>
                  <div>
                    • Shërbimet:{" "}
                    <span className="font-medium">
                      {incomeCategories.services.toLocaleString()} ден
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-red-800 mb-2">Shpenzimet</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    • Qirat:{" "}
                    <span className="font-medium">
                      {monthlyTotals.totalRents.toLocaleString()} ден
                    </span>
                  </div>
                  <div>
                    • Blerjet:{" "}
                    <span className="font-medium">
                      {monthlyTotals.totalPurchases.toLocaleString()} ден
                    </span>
                  </div>
                  <div>
                    • Pagat:{" "}
                    <span className="font-medium">
                      {monthlyTotals.totalSalaries.toLocaleString()} ден
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-blue-800 mb-2">Rezultati</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    • Fitimi Neto:{" "}
                    <span
                      className="font-medium"
                      style={{
                        color:
                          monthlyTotals.netProfit >= 0 ? "#52c41a" : "#ff4d4f",
                      }}
                    >
                      {monthlyTotals.netProfit.toLocaleString()} ден
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">
                Si të Përdoret Sistemi i Raporteve
              </h4>
              <div className="text-sm text-left space-y-2">
                <div className="flex items-start">
                  <span className="font-medium text-blue-600 mr-2">1.</span>
                  <span>Zgjidhni muajin për të cilin dëshironi raportin</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium text-blue-600 mr-2">2.</span>
                  <span>Shikoni treguesit kryesorë në karten e sipërme</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium text-blue-600 mr-2">3.</span>
                  <span>Analizoni formulën e llogaritjes financiare</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium text-blue-600 mr-2">4.</span>
                  <span>
                    Përdorni butonin "Rifresko" për të përditësuar të dhënat
                  </span>
                </div>
              </div>
            </div>
          </Card>
          */}

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
                  }. Të dhënat përditësohen automatikisht kur ndryshoni muajin ose klikoni butonin "Rifresko". Raporti përfshin të gjitha transaksionet financiare dhe llogaritjet e fitimit.`}
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
