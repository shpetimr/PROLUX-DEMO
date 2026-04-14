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
  Select,
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
  RiseOutlined,
  FallOutlined,
  SendOutlined,
} from "@ant-design/icons";
import apiClient, { API_ENDPOINTS } from "../config/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useDataChange } from "../contexts/DataChangeContext";
import { useNavigate } from "react-router-dom";

dayjs.extend(utc);

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form] = Form.useForm();
  const { notifyDataChanged } = useDataChange();
  const navigate = useNavigate();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.EXPENSES);
      setExpenses(response.data);
    } catch (error) {
      message.error("Dështoi të merren shpenzimet");
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
      message.error("Dështoi të fshihet shpenzimi");
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
        message.success("Shpenzimi u përditësua me sukses");
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
        message.error("Të dhënat nuk janë të vlefshme. Kontrolloni fushat.");
      } else if (error.response?.status === 401) {
        message.error("Ju nuk jeni të autorizuar. Ju lutemi identifikohuni.");
      } else if (error.response?.status === 403) {
        message.error("Ju nuk keni të drejta për këtë veprim.");
      } else if (error.response?.status >= 500) {
        message.error("Gabim në server. Provoni përsëri më vonë.");
      } else {
        message.error("Dështoi të ruhet shpenzimi. Kontrolloni lidhjen.");
      }
    }
  };

  // Funksioni për të dërguar të dhënat në raportin financiar
  const sendToFinancialReport = async () => {
    try {
      setLoading(true);

      // Mbledh të gjitha shpenzimet
      const response = await apiClient.get(API_ENDPOINTS.EXPENSES);
      const allExpenses = response.data;

      // Dërgon të dhënat në raportin financiar
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

      // Dërgon në endpoint-in e raportit financiar
      await apiClient.post(
        `${API_ENDPOINTS.REPORTS}/financial/expenses`,
        reportData
      );

      message.success("Të dhënat u dërguan me sukses në raportin financiar!");

      // Hap faqen e raporteve
      navigate("/reports");
    } catch (error) {
      console.error("Gabim në dërgimin e të dhënave:", error);
      message.error("Dështoi të dërgohen të dhënat në raportin financiar");
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );
  const todayExpenses = expenses
    .filter((expense) => dayjs.utc(expense.date).isSame(dayjs.utc(), "day"))
    .reduce((sum, expense) => sum + expense.amount, 0);
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
      render: (amount) => `${(amount || 0).toFixed(2)} ден`,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Përshkrimi",
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
            title="A jeni të sigurt që dëshironi ta fshini këtë shpenzim?"
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
          <Button
            type="default"
            icon={<BarChartOutlined />}
            onClick={() => navigate("/reports")}
          >
            Shiko Raportet
          </Button>
          <Button
            type="default"
            icon={<SendOutlined />}
            onClick={sendToFinancialReport}
            loading={loading}
          >
            Dërgo në Raportin Financiar
          </Button>
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
              suffix="ден"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="bg-white border-0 shadow-lg">
            <Statistic
              title="Shpenzimet e Këtij Muaji"
              value={thisMonthExpenses}
              precision={2}
              valueStyle={{ color: "#1890ff" }}
              prefix={<FallOutlined />}
              suffix="ден"
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
            rules={[{ required: true, message: "Ju lutemi zgjidhni datën" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Shuma"
            rules={[{ required: true, message: "Ju lutemi shkruani shumën" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              formatter={(value) =>
                `${value} ден`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/ден\s?|,*/g, "")}
              min={0}
            />
          </Form.Item>

          <Form.Item name="description" label="Përshkrimi">
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                {editingExpense ? "Përditëso" : "Krijo"}
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
