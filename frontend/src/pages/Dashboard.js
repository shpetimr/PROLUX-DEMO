import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Table,
  Tag,
  Button,
} from "antd";
import {
  TeamOutlined,
  DollarOutlined,
  RiseOutlined,
  ShoppingOutlined,
  HomeOutlined,
  BarChartOutlined,
  CalendarOutlined,
  CrownOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import apiClient, { API_ENDPOINTS } from "../config/api";
import dayjs from "dayjs";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { PERMISSIONS } from "../config/permissions";
import WorkerTasks from "./WorkerTasks";
import { WorkerSalarySummary } from "./WorkerSalary";

const { Title, Text } = Typography;

const calculateComprehensiveStats = (
  employees,
  expenses,
  incomes,
  purchases,
  rents,
  dashboardStats
) => {
  const currentMonth = dayjs().format("YYYY-MM");
  const currentYear = dayjs().format("YYYY");

  const totalEmployees = employees.length;
  const magazineEmployees = employees.filter(
    (emp) =>
      emp.position === "magazine" ||
      emp.position === "Magazine" ||
      emp.position === 0
  ).length;
  const terrenEmployees = employees.filter(
    (emp) =>
      emp.position === "terren" ||
      emp.position === "Terren" ||
      emp.position === 1
  ).length;

  const totalSalaries = employees.reduce(
    (sum, emp) => sum + (emp.monthlySalary || 0),
    0
  );

  const currentMonthExpenses = expenses
    .filter((exp) => dayjs(exp.date).format("YYYY-MM") === currentMonth)
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const currentMonthIncomes = incomes
    .filter((inc) => dayjs(inc.date).format("YYYY-MM") === currentMonth)
    .reduce((sum, inc) => sum + (inc.amount || 0), 0);

  const currentMonthPurchases = purchases
    .filter((pur) => dayjs(pur.purchaseDate).format("YYYY-MM") === currentMonth)
    .reduce((sum, pur) => sum + (pur.totalPrice || 0), 0);

  const currentMonthRents = rents
    .filter((rent) => dayjs(rent.paymentDate).format("YYYY-MM") === currentMonth)
    .reduce((sum, rent) => sum + (rent.monthlyAmount || 0), 0);

  const yearToDateExpenses = expenses
    .filter((exp) => dayjs(exp.date).format("YYYY") === currentYear)
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const yearToDateIncomes = incomes
    .filter((inc) => dayjs(inc.date).format("YYYY") === currentYear)
    .reduce((sum, inc) => sum + (inc.amount || 0), 0);

  const yearToDatePurchases = purchases
    .filter((pur) => dayjs(pur.purchaseDate).format("YYYY") === currentYear)
    .reduce((sum, pur) => sum + (pur.totalPrice || 0), 0);

  const yearToDateRents = rents
    .filter((rent) => dayjs(rent.paymentDate).format("YYYY") === currentYear)
    .reduce((sum, rent) => sum + (rent.monthlyAmount || 0), 0);

  const currentMonthProfit =
    currentMonthIncomes -
    currentMonthExpenses -
    currentMonthPurchases -
    currentMonthRents -
    totalSalaries;
  const yearToDateProfit =
    yearToDateIncomes -
    yearToDateExpenses -
    yearToDatePurchases -
    yearToDateRents -
    totalSalaries * 12;

  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + (exp.amount || 0),
    0
  );
  const totalIncomes = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
  const totalPurchases = purchases.reduce(
    (sum, pur) => sum + (pur.totalPrice || 0),
    0
  );
  const totalRents = rents.reduce(
    (sum, rent) => sum + (rent.monthlyAmount || 0),
    0
  );

  return {
    totalEmployees,
    warehouseEmployees: magazineEmployees,
    fieldEmployees: terrenEmployees,
    currentMonthSalaries: totalSalaries,
    currentMonthIncome: currentMonthIncomes,
    currentMonthExpenses:
      currentMonthExpenses + currentMonthPurchases + currentMonthRents,
    currentMonthProfit,
    yearToDateIncome: yearToDateIncomes,
    yearToDateExpenses:
      yearToDateExpenses + yearToDatePurchases + yearToDateRents,
    yearToDateProfit,
    totalExpenses,
    totalIncomes,
    totalPurchases,
    totalRents,
    profitMargin:
      totalIncomes > 0
        ? ((totalIncomes - totalExpenses - totalPurchases - totalRents) /
            totalIncomes) *
          100
        : 0,
    averageSalary: totalEmployees > 0 ? totalSalaries / totalEmployees : 0,
    ...dashboardStats,
  };
};

function WorkerDashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-6">
        <div>
          <Title level={2}>My Dashboard</Title>
          <Text className="text-gray-600">
            Welcome, {user?.fullName || user?.username || "User"}
          </Text>
        </div>
      </div>

      <WorkerSalarySummary compact />

      <div className="mt-8">
        <WorkerTasks />
      </div>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentData, setRecentData] = useState({
    employees: [],
    expenses: [],
    incomes: [],
    purchases: [],
    rents: [],
    projects: [],
  });
  const { isAdmin, isUser, hasPermission } = useAuth();
  const navigate = useNavigate();

  const canViewDashboard = hasPermission(PERMISSIONS.DASHBOARD_VIEW);
  const canManageEmployees = hasPermission(PERMISSIONS.EMPLOYEES_MANAGE);
  const canManageExpenses = hasPermission(PERMISSIONS.EXPENSES_MANAGE);
  const canManagePurchases = hasPermission(PERMISSIONS.PURCHASES_MANAGE);
  const canManageRents = hasPermission(PERMISSIONS.RENTS_MANAGE);
  const canManageIncomes = hasPermission(PERMISSIONS.INCOMES_MANAGE);
  const canManageDebts = hasPermission(PERMISSIONS.DEBTS_MANAGE);
  const canViewReports = hasPermission(PERMISSIONS.REPORTS_VIEW);
  const showWorkerDashboard =
    !isAdmin() && hasPermission(PERMISSIONS.WORKERS_VIEW_OWN_DASHBOARD);

  const fetchAllDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const apiCalls = [
        canManageEmployees && [
          "employees",
          apiClient.get(API_ENDPOINTS.EMPLOYEES),
        ],
        canManageExpenses && [
          "expenses",
          apiClient.get(API_ENDPOINTS.EXPENSES),
        ],
        canManageIncomes && [
          "incomes",
          apiClient.get(API_ENDPOINTS.INCOMES),
        ],
        canManagePurchases && [
          "purchases",
          apiClient.get(API_ENDPOINTS.PURCHASES),
        ],
        canManageRents && ["rents", apiClient.get(API_ENDPOINTS.RENTS)],
        canViewDashboard && [
          "dashboardStats",
          apiClient.get(API_ENDPOINTS.DASHBOARD_STATS),
        ],
      ].filter(Boolean);

      const responses = await Promise.allSettled(
        apiCalls.map(([, request]) => request)
      );
      const responseData = responses.reduce((acc, response, index) => {
        const [name] = apiCalls[index];
        acc[name] = response.status === "fulfilled" ? response.value.data : [];
        return acc;
      }, {});

      const employees = responseData.employees ?? [];
      const expenses = responseData.expenses ?? [];
      const incomes = responseData.incomes ?? [];
      const purchases = responseData.purchases ?? [];
      const rents = responseData.rents ?? [];
      const dashboardStats = responseData.dashboardStats ?? {};

      // Calculate comprehensive statistics
      const calculatedStats = calculateComprehensiveStats(
        employees,
        expenses,
        incomes,
        purchases,
        rents,
        dashboardStats
      );

      setStats(calculatedStats);
      setRecentData({
        employees: employees.slice(0, 5), // Latest 5 employees
        expenses: expenses.slice(0, 5), // Latest 5 expenses
        incomes: incomes.slice(0, 5), // Latest 5 incomes
        purchases: purchases.slice(0, 5), // Latest 5 purchases
        rents: rents.slice(0, 5), // Latest 5 rents
      });
    } catch (error) {
      console.error("Gabim në marrjen e të dhënave të dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [
    canManageEmployees,
    canManageExpenses,
    canManageIncomes,
    canManagePurchases,
    canManageRents,
    canViewDashboard,
  ]);

  useEffect(() => {
    if (showWorkerDashboard) {
      setLoading(false);
      return;
    }

    fetchAllDashboardData();
  }, [fetchAllDashboardData, showWorkerDashboard]);

  if (showWorkerDashboard) {
    return <WorkerDashboard />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  // Handle case when no data is available
  if (!stats) {
    return (
      <div className="text-center py-12">
        <Title level={3} className="text-gray-500 mb-4">
          Nuk ka të dhëna të disponueshme
        </Title>
        <Text className="text-gray-400">
          Ju lutemi shtoni të dhëna në sistemin tuaj për të parë statistikat
        </Text>
        <div className="mt-4">
          <Button type="primary" onClick={fetchAllDashboardData}>
            Provoni Përsëri
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2}>Përmbledhja e Dashboard</Title>
          <Text className="text-gray-600">
            Mirë se vini në sistemin e menaxhimit të biznesit
            {isAdmin() && (
              <Tag color="red" icon={<CrownOutlined />} className="ml-2">
                Administrator
              </Tag>
            )}
            {isUser() && (
              <Tag color="blue" className="ml-2">
                Përdorues
              </Tag>
            )}
          </Text>
        </div>
        <Button
          type="primary"
          onClick={fetchAllDashboardData}
          loading={loading}
          icon={<CalendarOutlined />}
        >
          Rifresko Të Dhënat
        </Button>
      </div>

      {/* Quick Actions, Recent Data Tables, and Summary Card remain below */}

      <Row gutter={[16, 16]} className="mt-8">
        {canManageEmployees && (
          <Col xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                className="text-center cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-100 border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                onClick={() => navigate("/employees")}
              >
                <TeamOutlined className="text-2xl text-blue-600 mb-2" />
                <div className="font-medium text-gray-700">
                  Menaxho Punëtorët
                </div>
              </Card>
          </Col>
        )}
        {canManageRents && (
          <Col xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                className="text-center cursor-pointer bg-gradient-to-br from-purple-50 to-violet-100 border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                onClick={() => navigate("/rents")}
              >
                <HomeOutlined className="text-2xl text-purple-600 mb-2" />
                <div className="font-medium text-gray-700">Menaxho Qirat</div>
              </Card>
          </Col>
        )}
        {canManageIncomes && (
          <Col xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                className="text-center cursor-pointer bg-gradient-to-br from-green-50 to-emerald-100 border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                onClick={() => navigate("/incomes")}
              >
                <RiseOutlined className="text-2xl text-green-600 mb-2" />
                <div className="font-medium text-gray-700">
                  Ndjek Të Ardhurat
                </div>
              </Card>
          </Col>
        )}
        {canManageDebts && (
          <Col xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                className="text-center cursor-pointer bg-gradient-to-br from-red-50 to-pink-100 border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                onClick={() => navigate("/debts")}
              >
                <ExclamationCircleOutlined className="text-2xl text-red-600 mb-2" />
                <div className="font-medium text-gray-700">Menaxho Borxhet</div>
              </Card>
          </Col>
        )}
        {canViewReports && (
          <Col xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                className="text-center cursor-pointer bg-gradient-to-br from-cyan-50 to-teal-100 border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                onClick={() => navigate("/reports")}
              >
                <BarChartOutlined className="text-2xl text-cyan-600 mb-2" />
                <div className="font-medium text-gray-700">Shiko Raportet</div>
              </Card>
          </Col>
        )}
        {canManageExpenses && (
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              className="text-center cursor-pointer bg-gradient-to-br from-red-50 to-rose-100 border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
              onClick={() => navigate("/expenses")}
            >
              <DollarOutlined className="text-2xl text-red-600 mb-2" />
              <div className="font-medium text-gray-700">Ndjek Shpenzimet</div>
            </Card>
          </Col>
        )}
        {canManagePurchases && (
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              className="text-center cursor-pointer bg-gradient-to-br from-orange-50 to-amber-100 border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
              onClick={() => navigate("/purchases")}
            >
              <ShoppingOutlined className="text-2xl text-orange-600 mb-2" />
              <div className="font-medium text-gray-700">Menaxho Blerjet</div>
            </Card>
          </Col>
        )}
      </Row>

      {/* Recent Data Tables */}
      <Row gutter={[16, 16]} className="mt-8">
        {canManageEmployees && (
          <Col xs={24} lg={12}>
              <Card
                title="Punëtorët e Fundit"
                className="bg-white border-0 shadow-lg"
                extra={
                  <Button
                    type="link"
                    onClick={() => navigate("/employees")}
                  >
                    Shiko Të Gjitha
                  </Button>
                }
              >
                <Table
                  dataSource={recentData.employees}
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: "Emri",
                      dataIndex: "fullName",
                      key: "fullName",
                      render: (name) => <Text strong>{name}</Text>,
                    },
                    {
                      title: "Pozicioni",
                      dataIndex: "position",
                      key: "position",
                      render: (position) => (
                        <Tag
                          color={
                            position === "magazine" ||
                            position === "Magazine" ||
                            position === 0
                              ? "blue"
                              : "green"
                          }
                        >
                          {position === "magazine" ||
                          position === "Magazine" ||
                          position === 0
                            ? "Magazine"
                            : "Terren"}
                        </Tag>
                      ),
                    },
                    {
                      title: "Paga",
                      dataIndex: "monthlySalary",
                      key: "monthlySalary",
                      render: (salary) => `${(salary || 0).toFixed(2)} ден`,
                    },
                  ]}
                />
              </Card>
          </Col>
        )}
        {canManageIncomes && (
          <Col xs={24} lg={12}>
              <Card
                title="Të Ardhurat e Fundit"
                className="bg-white border-0 shadow-lg"
                extra={
                  <Button
                    type="link"
                    onClick={() => navigate("/incomes")}
                  >
                    Shiko Të Gjitha
                  </Button>
                }
              >
                <Table
                  dataSource={recentData.incomes}
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: "Burimi",
                      dataIndex: "source",
                      key: "source",
                      render: (source) => <Tag color="green">{source}</Tag>,
                    },
                    {
                      title: "Shuma",
                      dataIndex: "amount",
                      key: "amount",
                      render: (amount) => (
                        <Text strong style={{ color: "#52c41a" }}>
                          {(amount || 0).toFixed(2)} ден
                        </Text>
                      ),
                    },
                    {
                      title: "Data",
                      dataIndex: "date",
                      key: "date",
                      render: (date) => dayjs(date).format("MM/DD"),
                    },
                  ]}
                />
              </Card>
          </Col>
        )}
      </Row>

      <Row gutter={[16, 16]} className="mt-6">
        {canManageExpenses && (
          <Col xs={24} lg={12}>
          <Card
            title="Shpenzimet e Fundit"
            className="bg-white border-0 shadow-lg"
            extra={
              <Button
                type="link"
                onClick={() => navigate("/expenses")}
              >
                Shiko Të Gjitha
              </Button>
            }
          >
            <Table
              dataSource={recentData.expenses}
              pagination={false}
              size="small"
              columns={[
                {
                  title: "Lloji",
                  dataIndex: "expenseType",
                  key: "expenseType",
                  render: (type) => <Tag color="red">{type}</Tag>,
                },
                {
                  title: "Shuma",
                  dataIndex: "amount",
                  key: "amount",
                  render: (amount) => (
                    <Text strong style={{ color: "#ff4d4f" }}>
                      {(amount || 0).toFixed(2)} ден
                    </Text>
                  ),
                },
                {
                  title: "Data",
                  dataIndex: "date",
                  key: "date",
                  render: (date) => dayjs(date).format("MM/DD"),
                },
              ]}
            />
          </Card>
          </Col>
        )}
        {canManagePurchases && (
          <Col xs={24} lg={12}>
          <Card
            title="Blerjet e Fundit"
            className="bg-white border-0 shadow-lg"
            extra={
              <Button
                type="link"
                onClick={() => navigate("/purchases")}
              >
                Shiko Të Gjitha
              </Button>
            }
          >
            <Table
              dataSource={recentData.purchases}
              pagination={false}
              size="small"
              columns={[
                {
                  title: "Artikulli",
                  dataIndex: "itemName",
                  key: "itemName",
                  render: (name) => <Text strong>{name}</Text>,
                },
                {
                  title: "Çmimi",
                  dataIndex: "totalPrice",
                  key: "totalPrice",
                  render: (price) => (
                    <Text strong style={{ color: "#fa8c16" }}>
                      {(price || 0).toFixed(2)} ден
                    </Text>
                  ),
                },
                {
                  title: "Data",
                  dataIndex: "purchaseDate",
                  key: "purchaseDate",
                  render: (date) => dayjs(date).format("MM/DD"),
                },
              ]}
            />
          </Card>
          </Col>
        )}
      </Row>

      {/* Remove the summary card at the bottom */}
    </div>
  );
}

export default Dashboard;
