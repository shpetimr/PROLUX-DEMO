import React, { useState, useEffect } from "react";
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
import apiClient, { API_ENDPOINTS } from "../config/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Panel } = Collapse;

const MonthlyTracking = () => {
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [trackingType, setTrackingType] = useState("current-month");
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);

  // Raw data from API
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [rents, setRents] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [expensesRes, incomesRes, purchasesRes, rentsRes, employeesRes] =
        await Promise.all([
          apiClient.get(API_ENDPOINTS.EXPENSES),
          apiClient.get(API_ENDPOINTS.INCOMES),
          apiClient.get(API_ENDPOINTS.PURCHASES),
          apiClient.get(API_ENDPOINTS.RENTS),
          apiClient.get(API_ENDPOINTS.EMPLOYEES),
        ]);

      setExpenses(expensesRes.data || []);
      setIncomes(incomesRes.data || []);
      setPurchases(purchasesRes.data || []);
      setRents(rentsRes.data || []);
      setEmployees(employeesRes.data || []);

      // Load current month data by default
      processDataForCurrentMonth();
    } catch (error) {
      console.error("Error fetching data:", error);
      message.error("Dështoi të merren të dhënat");
    } finally {
      setLoading(false);
    }
  };

  const processDataForCurrentMonth = () => {
    const startDate = dayjs().startOf("month");
    const endDate = dayjs().endOf("month");
    processDataForDateRange(startDate, endDate);
  };

  const processDataForCustomRange = () => {
    if (!dateRange || dateRange.length !== 2) {
      message.warning("Ju lutem zgjidhni një interval datash");
      return;
    }
    processDataForDateRange(dateRange[0], dateRange[1]);
  };

  const processDataForSpecificMonth = () => {
    const startDate = dayjs()
      .year(selectedYear)
      .month(selectedMonth - 1)
      .startOf("month");
    const endDate = dayjs()
      .year(selectedYear)
      .month(selectedMonth - 1)
      .endOf("month");
    processDataForDateRange(startDate, endDate);
  };

  const processDataForYear = () => {
    const startDate = dayjs().year(selectedYear).startOf("year");
    const endDate = dayjs().year(selectedYear).endOf("year");
    processDataForDateRange(startDate, endDate);
  };

  const processDataForDateRange = (startDate, endDate) => {
    setLoading(true);

    // Filter data by date range
    const filteredExpenses = expenses.filter((exp) => {
      const expDate = dayjs(exp.date);
      return (
        expDate.isAfter(startDate) ||
        expDate.isSame(startDate, "day") ||
        expDate.isBefore(endDate) ||
        expDate.isSame(endDate, "day")
      );
    });

    const filteredIncomes = incomes.filter((inc) => {
      const incDate = dayjs(inc.date);
      return (
        incDate.isAfter(startDate) ||
        incDate.isSame(startDate, "day") ||
        incDate.isBefore(endDate) ||
        incDate.isSame(endDate, "day")
      );
    });

    const filteredPurchases = purchases.filter((pur) => {
      const purDate = dayjs(pur.purchaseDate);
      return (
        purDate.isAfter(startDate) ||
        purDate.isSame(startDate, "day") ||
        purDate.isBefore(endDate) ||
        purDate.isSame(endDate, "day")
      );
    });

    const filteredRents = rents.filter((rent) => {
      const rentDate = dayjs(rent.paymentDate);
      return (
        rentDate.isAfter(startDate) ||
        rentDate.isSame(startDate, "day") ||
        rentDate.isBefore(endDate) ||
        rentDate.isSame(endDate, "day")
      );
    });

    // Calculate totals
    const totalIncome = filteredIncomes.reduce(
      (sum, inc) => sum + (inc.amount || 0),
      0
    );
    const totalExpenses = filteredExpenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );
    const totalPurchases = filteredPurchases.reduce(
      (sum, pur) => sum + (pur.totalPrice || 0),
      0
    );
    const totalRents = filteredRents.reduce(
      (sum, rent) => sum + (rent.monthlyAmount || 0),
      0
    );
    const totalEmployeeSalaries = employees.reduce(
      (sum, emp) => sum + (emp.monthlySalary || 0),
      0
    );

    const totalExpensesWithSalaries =
      totalExpenses + totalPurchases + totalEmployeeSalaries;
    const netProfit = totalIncome + totalRents - totalExpensesWithSalaries;
    const profitMargin =
      totalIncome + totalRents > 0
        ? (netProfit / (totalIncome + totalRents)) * 100
        : 0;

    // Create breakdown data
    const expenseBreakdown = createExpenseBreakdown(filteredExpenses);
    const purchaseBreakdown = createPurchaseBreakdown(filteredPurchases);
    const incomeBreakdown = createIncomeBreakdown(filteredIncomes);
    const rentBreakdown = createRentBreakdown(filteredRents);
    const employeeBreakdown = createEmployeeBreakdown(employees);

    const processedData = {
      summary: {
        totalIncome: totalIncome + totalRents,
        totalExpenses: totalExpensesWithSalaries,
        netProfit: netProfit,
        profitMargin: profitMargin,
      },
      expenses: {
        breakdown: expenseBreakdown,
        transactions: filteredExpenses.slice(0, 10).map((exp) => ({
          description: exp.description,
          amount: exp.amount,
          date: exp.date,
        })),
      },
      purchases: {
        breakdown: purchaseBreakdown,
      },
      incomes: {
        breakdown: incomeBreakdown,
        transactions: filteredIncomes.slice(0, 10).map((inc) => ({
          source: inc.source,
          amount: inc.amount,
          date: inc.date,
        })),
      },
      rents: {
        breakdown: rentBreakdown,
      },
      employeePayments: {
        breakdown: employeeBreakdown,
      },
    };

    setMonthlyData(processedData);
    setSummaryData(processedData.summary);
    setLoading(false);
  };

  const createExpenseBreakdown = (filteredExpenses) => {
    const breakdown = {};
    filteredExpenses.forEach((exp) => {
      const type = exp.type || "Të Tjera";
      breakdown[type] = (breakdown[type] || 0) + (exp.amount || 0);
    });

    const total = Object.values(breakdown).reduce(
      (sum, amount) => sum + amount,
      0
    );
    return Object.entries(breakdown).map(([type, amount]) => ({
      type,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }));
  };

  const createPurchaseBreakdown = (filteredPurchases) => {
    const breakdown = {};
    filteredPurchases.forEach((pur) => {
      const category = pur.category || "Të Tjera";
      breakdown[category] = (breakdown[category] || 0) + (pur.totalPrice || 0);
    });

    const total = Object.values(breakdown).reduce(
      (sum, amount) => sum + amount,
      0
    );
    return Object.entries(breakdown).map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }));
  };

  const createIncomeBreakdown = (filteredIncomes) => {
    const breakdown = {};
    filteredIncomes.forEach((inc) => {
      const source = inc.source || "Të Tjera";
      breakdown[source] = (breakdown[source] || 0) + (inc.amount || 0);
    });

    const total = Object.values(breakdown).reduce(
      (sum, amount) => sum + amount,
      0
    );
    return Object.entries(breakdown).map(([source, amount]) => ({
      source,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }));
  };

  const createRentBreakdown = (filteredRents) => {
    const breakdown = {};
    filteredRents.forEach((rent) => {
      const location = rent.location || "Të Tjera";
      breakdown[location] =
        (breakdown[location] || 0) + (rent.monthlyAmount || 0);
    });

    const total = Object.values(breakdown).reduce(
      (sum, amount) => sum + amount,
      0
    );
    return Object.entries(breakdown).map(([location, amount]) => ({
      location,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }));
  };

  const createEmployeeBreakdown = (employees) => {
    const breakdown = {};
    employees.forEach((emp) => {
      const position = emp.position || "Të Tjera";
      if (!breakdown[position]) {
        breakdown[position] = {
          baseSalary: 0,
                      monthlyBonuses: 0,
            monthlyPenalties: 0,
          total: 0,
        };
      }
      breakdown[position].baseSalary += emp.monthlySalary || 0;
                breakdown[position].monthlyBonuses += emp.monthlyBonuses || 0;
          breakdown[position].monthlyPenalties += emp.monthlyPenalties || 0;
      breakdown[position].total =
        breakdown[position].baseSalary +
                  breakdown[position].monthlyBonuses -
          breakdown[position].monthlyPenalties;
    });

    return Object.entries(breakdown).map(([position, data]) => ({
      position,
      ...data,
    }));
  };

  const handleTrackingTypeChange = (value) => {
    setTrackingType(value);
    if (value === "current-month") {
      processDataForCurrentMonth();
    } else if (value === "current-year") {
      processDataForYear();
    }
  };

  const handleFetchData = () => {
    switch (trackingType) {
      case "custom":
        processDataForCustomRange();
        break;
      case "specific-month":
        processDataForSpecificMonth();
        break;
      case "year":
        processDataForYear();
        break;
      default:
        processDataForCurrentMonth();
    }
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
    if (!summaryData) return null;

    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Të Ardhurat Totale"
              value={summaryData.totalIncome}
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
              value={summaryData.totalExpenses}
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
              value={summaryData.netProfit}
              precision={2}
              valueStyle={{ color: getProfitColor(summaryData.netProfit) }}
              prefix={getProfitIcon(summaryData.netProfit)}
              suffix="MKD"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Marzhi i Fitimit"
              value={summaryData.profitMargin}
              precision={1}
              valueStyle={{ color: getProfitColor(summaryData.profitMargin) }}
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
                  locale={{
                    emptyText: (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        <FileTextOutlined
                          style={{ fontSize: 24, color: "#d9d9d9" }}
                        />
                        <div style={{ marginTop: 8, color: "#8c8c8c" }}>
                          No data
                        </div>
                      </div>
                    ),
                  }}
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
                  locale={{
                    emptyText: (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        <FileTextOutlined
                          style={{ fontSize: 24, color: "#d9d9d9" }}
                        />
                        <div style={{ marginTop: 8, color: "#8c8c8c" }}>
                          No data
                        </div>
                      </div>
                    ),
                  }}
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
                  locale={{
                    emptyText: (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        <FileTextOutlined
                          style={{ fontSize: 24, color: "#d9d9d9" }}
                        />
                        <div style={{ marginTop: 8, color: "#8c8c8c" }}>
                          No data
                        </div>
                      </div>
                    ),
                  }}
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
                  locale={{
                    emptyText: (
                      <div style={{ textAlign: "center", padding: "20px" }}>
                        <FileTextOutlined
                          style={{ fontSize: 24, color: "#d9d9d9" }}
                        />
                        <div style={{ marginTop: 8, color: "#8c8c8c" }}>
                          No data
                        </div>
                      </div>
                    ),
                  }}
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
              locale={{
                emptyText: (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <FileTextOutlined
                      style={{ fontSize: 24, color: "#d9d9d9" }}
                    />
                    <div style={{ marginTop: 8, color: "#8c8c8c" }}>
                      No data
                    </div>
                  </div>
                ),
              }}
            />
          </Card>
        </Panel>
      </Collapse>
    );
  };

  const renderTransactionTables = () => {
    if (!monthlyData) return null;

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Shpenzimet e Fundit" size="small">
            <Table
              dataSource={monthlyData.expenses?.transactions || []}
              columns={[
                {
                  title: "Përshkrimi",
                  dataIndex: "description",
                  key: "description",
                },
                {
                  title: "Shuma",
                  dataIndex: "amount",
                  key: "amount",
                  render: (amount) => formatCurrency(amount),
                },
                {
                  title: "Data",
                  dataIndex: "date",
                  key: "date",
                  render: (date) => dayjs(date).format("DD/MM/YYYY"),
                },
              ]}
              pagination={{ pageSize: 5 }}
              size="small"
              locale={{
                emptyText: (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <FileTextOutlined
                      style={{ fontSize: 24, color: "#d9d9d9" }}
                    />
                    <div style={{ marginTop: 8, color: "#8c8c8c" }}>
                      No data
                    </div>
                  </div>
                ),
              }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Të Ardhurat e Fundit" size="small">
            <Table
              dataSource={monthlyData.incomes?.transactions || []}
              columns={[
                { title: "Burimi", dataIndex: "source", key: "source" },
                {
                  title: "Shuma",
                  dataIndex: "amount",
                  key: "amount",
                  render: (amount) => formatCurrency(amount),
                },
                {
                  title: "Data",
                  dataIndex: "date",
                  key: "date",
                  render: (date) => dayjs(date).format("DD/MM/YYYY"),
                },
              ]}
              pagination={{ pageSize: 5 }}
              size="small"
              locale={{
                emptyText: (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <FileTextOutlined
                      style={{ fontSize: 24, color: "#d9d9d9" }}
                    />
                    <div style={{ marginTop: 8, color: "#8c8c8c" }}>
                      No data
                    </div>
                  </div>
                ),
              }}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  return (
    <div style={{ padding: "24px" }}>
      <Card>
        <Title level={2}>
          <CalendarOutlined /> Gjurmimi Mujor i Financave
        </Title>

        <Paragraph>
          Gjurmoni të gjitha aspektet financiare për çdo periudhë kohore:
          shpenzimet, blerjet, qiratë, të ardhurat dhe pagesat e punëtorëve.
        </Paragraph>

        {/* Controls */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={8}>
              <Select
                value={trackingType}
                onChange={handleTrackingTypeChange}
                style={{ width: "100%" }}
                placeholder="Zgjidhni llojin e gjurmimit"
              >
                <Option value="current-month">Muaji Aktual</Option>
                <Option value="custom">Interval i Personalizuar</Option>
                <Option value="specific-month">Muaj i Caktuar</Option>
                <Option value="year">Viti i Caktuar</Option>
              </Select>
            </Col>

            {trackingType === "custom" && (
              <Col xs={24} sm={8}>
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  placeholder={["Data Fillestare", "Data Përfundimtare"]}
                />
              </Col>
            )}

            {trackingType === "specific-month" && (
              <>
                <Col xs={24} sm={6}>
                  <Select
                    value={selectedYear}
                    onChange={setSelectedYear}
                    style={{ width: "100%" }}
                    placeholder="Viti"
                  >
                    {Array.from(
                      { length: 10 },
                      (_, i) => dayjs().year() - i
                    ).map((year) => (
                      <Option key={year} value={year}>
                        {year}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={6}>
                  <Select
                    value={selectedMonth}
                    onChange={setSelectedMonth}
                    style={{ width: "100%" }}
                    placeholder="Muaji"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(
                      (month) => (
                        <Option key={month} value={month}>
                          {dayjs()
                            .month(month - 1)
                            .format("MMMM")}
                        </Option>
                      )
                    )}
                  </Select>
                </Col>
              </>
            )}

            {trackingType === "year" && (
              <Col xs={24} sm={8}>
                <Select
                  value={selectedYear}
                  onChange={setSelectedYear}
                  style={{ width: "100%" }}
                  placeholder="Viti"
                >
                  {Array.from({ length: 10 }, (_, i) => dayjs().year() - i).map(
                    (year) => (
                      <Option key={year} value={year}>
                        {year}
                      </Option>
                    )
                  )}
                </Select>
              </Col>
            )}

            <Col xs={24} sm={8}>
              <Button
                type="primary"
                onClick={handleFetchData}
                loading={loading}
                icon={<BarChartOutlined />}
                style={{ width: "100%" }}
              >
                Merr të Dhënat
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
            {renderTransactionTables()}
          </>
        )}

        {!loading && !monthlyData && (
          <Card style={{ textAlign: "center", padding: "50px" }}>
            <FileTextOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
            <div style={{ marginTop: 16, color: "#8c8c8c" }}>
              Zgjidhni një periudhë kohore dhe klikoni "Merr të Dhënat" për të
              parë raportin
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default MonthlyTracking;
