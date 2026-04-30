import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Space,
  Typography,
  Card,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  BarChartOutlined,
  FallOutlined,
  SendOutlined,
} from "@ant-design/icons";
import apiClient, { API_ENDPOINTS } from "../config/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useDataChange } from "../contexts/DataChangeContext";
import { useAuth } from "../contexts/AuthContext";
import { PERMISSIONS } from "../config/permissions";
import { useNavigate } from "react-router-dom";

dayjs.extend(utc);

const { Title } = Typography;
const { TextArea } = Input;

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form] = Form.useForm();
  const { notifyDataChanged } = useDataChange();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const canViewReports = hasPermission(PERMISSIONS.REPORTS_VIEW);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.EXPENSES);
      setExpenses(response.data);
    } catch (error) {
      message.error("DÃ«shtoi tÃ« merren shpenzimet");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingExpense(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingExpense(record);
    form.setFieldsValue({
      ...record,
      date: dayjs(record.date),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`${API_ENDPOINTS.EXPENSES}/${id}`);
      message.success("Shpenzimi u fshi me sukses");
      fetchExpenses();
      notifyDataChanged();
    } catch (error) {
      message.error("DÃ«shtoi tÃ« fshihet shpenzimi");
    }
  };

  const handleSubmit = async (values) => {
    try {
      console.log("Form values:", values); // Debug log

      // Fix timezone issue by using local date format instead of UTC
      const data = {
        ...values,
        date: values.date.format("YYYY-MM-DD"),
      };

      console.log("Data to send:", data); // Debug log

      if (editingExpense) {
        await apiClient.put(
          `${API_ENDPOINTS.EXPENSES}/${editingExpense.id}`,
          data
        );
        message.success("Shpenzimi u pÃ«rditÃ«sua me sukses");
      } else {
        const response = await apiClient.post(API_ENDPOINTS.EXPENSES, data);
        console.log("Create response:", response); // Debug log
        message.success("Shpenzimi u krijua me sukses");
      }

      setModalVisible(false);
      fetchExpenses();
      notifyDataChanged();
    } catch (error) {
      console.error("Error details:", error); // Debug log
      console.error("Error response:", error.response); // Debug log

      if (error.response?.data?.message) {
        message.error(`Gabim: ${error.response.data.message}`);
      } else if (error.response?.status === 400) {
        message.error("TÃ« dhÃ«nat nuk janÃ« tÃ« vlefshme. Kontrolloni fushat.");
      } else if (error.response?.status === 401) {
        message.error("Ju nuk jeni tÃ« autorizuar. Ju lutemi identifikohuni.");
      } else if (error.response?.status === 403) {
        message.error("Ju nuk keni tÃ« drejta pÃ«r kÃ«tÃ« veprim.");
      } else if (error.response?.status >= 500) {
        message.error("Gabim nÃ« server. Provoni pÃ«rsÃ«ri mÃ« vonÃ«.");
      } else {
        message.error("DÃ«shtoi tÃ« ruhet shpenzimi. Kontrolloni lidhjen.");
      }
    }
  };

  // Funksioni pÃ«r tÃ« dÃ«rguar tÃ« dhÃ«nat nÃ« raportin financiar
  const sendToFinancialReport = async () => {
    if (!canViewReports) {
      message.error("Ju nuk keni tÃ« drejta pÃ«r raportet financiare.");
      return;
    }

    try {
      setLoading(true);

      // Mbledh tÃ« gjitha shpenzimet
      const response = await apiClient.get(API_ENDPOINTS.EXPENSES);
      const allExpenses = response.data;

      // DÃ«rgon tÃ« dhÃ«nat nÃ« raportin financiar
      const reportData = {
        expenses: allExpenses,
        totalAmount: allExpenses.reduce(
          (sum, exp) => sum + (exp.amount || 0),
          0
        ),
        count: allExpenses.length,
        reportType: "expenses",
        generatedAt: new Date().toISOString(),
      };

      // DÃ«rgon nÃ« endpoint-in e raportit financiar
      await apiClient.post(
        `${API_ENDPOINTS.REPORTS}/financial/expenses`,
        reportData
      );

      message.success("TÃ« dhÃ«nat u dÃ«rguan me sukses nÃ« raportin financiar!");

      // Hap faqen e raporteve
      navigate("/reports");
    } catch (error) {
      console.error("Gabim nÃ« dÃ«rgimin e tÃ« dhÃ«nave:", error);
      message.error("DÃ«shtoi tÃ« dÃ«rgohen tÃ« dhÃ«nat nÃ« raportin financiar");
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const thisMonthExpenses = expenses
    .filter((expense) => dayjs.utc(expense.date).isSame(dayjs.utc(), "month"))
    .reduce((sum, expense) => sum + expense.amount, 0);

  const columns = [
    {
      title: "Lloji i Shpenzimit",
      dataIndex: "expenseType",
      key: "expenseType",
      render: (type) => <Tag color="red">{type}</Tag>,
      sorter: (a, b) => a.expenseType.localeCompare(b.expenseType),
      filters: [...new Set(expenses.map((e) => e.expenseType))].map((type) => ({
        text: type,
        value: type,
      })),
      onFilter: (value, record) => record.expenseType === value,
    },
    {
      title: "Data",
      dataIndex: "date",
      key: "date",
      render: (date) => dayjs(date).format("DD/MM/YYYY"),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: "Shuma",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => `${(amount || 0).toFixed(2)} Ð´ÐµÐ½`,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "PÃ«rshkrimi",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Veprime",
      key: "actions",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Redakto
          </Button>
          <Popconfirm
            title="A jeni tÃ« sigurt qÃ« dÃ«shironi ta fshini kÃ«tÃ« shpenzim?"
            onConfirm={() => handleDelete(record.id)}
            okText="Po"
            cancelText="Jo"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Fshi
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>Menaxhimi i Shpenzimeve</Title>
        <Space>
          {canViewReports && (
            <Button
              type="default"
              icon={<BarChartOutlined />}
              onClick={() => navigate("/reports")}
            >
              Shiko Raportet
            </Button>
          )}
          {canViewReports && (
            <Button
              type="default"
              icon={<SendOutlined />}
              onClick={sendToFinancialReport}
              loading={loading}
            >
              DÃ«rgo nÃ« Raportin Financiar
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Shto Shpenzim
          </Button>
        </Space>
      </div>

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="bg-white border-0 shadow-lg">
            <Statistic
              title="Totali i Shpenzimeve"
              value={totalExpenses}
              precision={2}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<DollarOutlined />}
              suffix="Ð´ÐµÐ½"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="bg-white border-0 shadow-lg">
            <Statistic
              title="Shpenzimet e KÃ«tij Muaji"
              value={thisMonthExpenses}
              precision={2}
              valueStyle={{ color: "#1890ff" }}
              prefix={<FallOutlined />}
              suffix="Ð´ÐµÐ½"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="bg-white border-0 shadow-lg">
            <Statistic
              title="Numri i Shpenzimeve"
              value={expenses.length}
              valueStyle={{ color: "#52c41a" }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Expenses Table */}
      <Card className="bg-white border-0 shadow-lg">
        <Table
          columns={columns}
          dataSource={expenses}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} nga ${total} shpenzime`,
          }}
        />
      </Card>

      <Modal
        title={editingExpense ? "Redakto Shpenzim" : "Shto Shpenzim"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="expenseType"
            label="Lloji i Shpenzimit"
            rules={[
              {
                required: true,
                message: "Ju lutemi shkruani llojin e shpenzimit",
              },
            ]}
          >
            <Input placeholder="Shkruani llojin e shpenzimit" />
          </Form.Item>

          <Form.Item
            name="date"
            label="Data"
            rules={[{ required: true, message: "Ju lutemi zgjidhni datÃ«n" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Shuma"
            rules={[{ required: true, message: "Ju lutemi shkruani shumÃ«n" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              formatter={(value) =>
                `${value} Ð´ÐµÐ½`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/Ð´ÐµÐ½\s?|,*/g, "")}
              min={0}
            />
          </Form.Item>

          <Form.Item name="description" label="PÃ«rshkrimi">
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                {editingExpense ? "PÃ«rditÃ«so" : "Krijo"}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Anulo</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Expenses;
