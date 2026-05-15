import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  DatePicker,
  InputNumber,
  message,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Tabs,
  Popconfirm,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import apiClient, { API_ENDPOINTS } from "../config/api";
import { useDataChange } from "../contexts/DataChangeContext";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;
const { TextArea } = Input;

function Debts() {
  const navigate = useNavigate();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("OwedToCompany");
  const [form] = Form.useForm();
  const { notifyDataChanged } = useDataChange();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    // Check authentication before fetching data
    if (!isAuthenticated()) {
      message.error("Ju nuk jeni të autorizuar. Ju lutemi identifikohuni.");
      navigate("/login");
      return;
    }


    fetchDebts();
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated, user]);

  // Fetch debts
  const fetchDebts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.DEBTS}?type=${activeTab}`
      );
      const debtsData = response.data || [];
      setDebts(debtsData);
    } catch (error) {
      console.error("Error fetching debts:", error);

      // Handle different error types
      if (error.response?.status === 401) {
        message.error("Ju nuk jeni të autorizuar. Ju lutemi identifikohuni.");
        // The API interceptor should handle redirect to login
      } else if (error.response?.status === 403) {
        message.error("Ju nuk keni të drejta për të parë borxhet.");
      } else if (error.response?.status >= 500) {
        message.error("Gabim në server. Provoni përsëri më vonë.");
      } else {
        message.error("Dështoi të merren borxhet. Kontrolloni lidhjen.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch debt summary
  const fetchSummary = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DEBTS_STATISTICS);
      setSummary(response.data);
    } catch (error) {
      console.error("Error fetching summary:", error);

      // Handle different error types
      if (error.response?.status === 401) {
        message.error("Ju nuk jeni të autorizuar. Ju lutemi identifikohuni.");
      } else if (error.response?.status === 403) {
        message.error("Ju nuk keni të drejta për të parë statistikat.");
      } else {
        console.error("Could not fetch debt summary:", error);
      }
    }
  };

  // Create or Update debt
  const handleSubmit = async (values) => {
    try {

      // Fix timezone issue by using local date format instead of UTC
      const debtData = {
        debtorName: values.debtorName,
        type: activeTab, // Use the active tab as the debt type
        amount: values.amount || 0,
        dueDate: values.dueDate
          ? values.dueDate.format("YYYY-MM-DD")
          : dayjs().format("YYYY-MM-DD"),
        description: values.description || "",
      };


      if (editingDebt) {
        await apiClient.put(
          `${API_ENDPOINTS.DEBTS}/${editingDebt.id}`,
          debtData
        );
        message.success("Borxhi u përditësua me sukses");
      } else {
        await apiClient.post(API_ENDPOINTS.DEBTS, debtData);
        message.success("Borxhi u shtua me sukses");
      }

      setModalVisible(false);
      setEditingDebt(null);
      form.resetFields();
      fetchDebts();
      fetchSummary();
      notifyDataChanged();
    } catch (error) {
      console.error("Error saving debt:", error);

      // Handle different error types
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
        message.error("Dështoi të ruhet borxhi. Kontrolloni lidhjen.");
      }
    }
  };

  // Edit debt
  const handleEdit = (record) => {
    setEditingDebt(record);
    form.setFieldsValue({
      ...record,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null,
    });
    setModalVisible(true);
  };

  // Delete debt
  const handleDelete = async (id) => {
    try {

      await apiClient.delete(`${API_ENDPOINTS.DEBTS}/${id}`);
      message.success("Borxhi u fshi me sukses");
      fetchDebts();
      fetchSummary();
      notifyDataChanged();
    } catch (error) {
      console.error("Error deleting debt:", error);

      // Handle different error types
      if (error.response?.status === 401) {
        message.error("Ju nuk jeni të autorizuar. Ju lutemi identifikohuni.");
      } else if (error.response?.status === 403) {
        message.error("Ju nuk keni të drejta për të fshirë borxhet.");
      } else if (error.response?.status === 404) {
        message.error("Borxhi nuk u gjet.");
      } else if (error.response?.status >= 500) {
        message.error("Gabim në server. Provoni përsëri më vonë.");
      } else {
        message.error("Dështoi të fshihet borxhi. Kontrolloni lidhjen.");
      }
    }
  };

  // Toggle paid status
  const handleTogglePaid = async (record) => {
    try {
      await apiClient.put(`${API_ENDPOINTS.DEBTS}/${record.id}`, {
        ...record,
        isPaid: !(record.isPaid || false),
      });
      message.success(
        record.isPaid || false
          ? "Borxhi u shënoi si papaguar"
          : "Borxhi u shënoi si paguar"
      );
      fetchDebts();
      fetchSummary();
      notifyDataChanged();
    } catch (error) {
      console.error("Error toggling paid status:", error);

      // Handle different error types
      if (error.response?.status === 401) {
        message.error("Ju nuk jeni të autorizuar. Ju lutemi identifikohuni.");
      } else if (error.response?.status === 403) {
        message.error("Ju nuk keni të drejta për të ndryshuar statusin.");
      } else if (error.response?.status >= 500) {
        message.error("Gabim në server. Provoni përsëri më vonë.");
      } else {
        message.error(
          "Dështoi të ndryshohet statusi i borxhit. Kontrolloni lidhjen."
        );
      }
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
    },
    {
      title:
        activeTab === "OwedToCompany"
          ? "Emri i Debitorit"
          : "Emri i Kreditorit",
      dataIndex: "debtorName",
      key: "debtorName",
      sorter: (a, b) => a.debtorName.localeCompare(b.debtorName),
    },
    {
      title: "Shuma (MKD)",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => `${(amount || 0).toLocaleString("mk-MK")} MKD`,
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
    },
    {
      title: "Data e Caktuar per te Paguar",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (date) => (date ? dayjs(date).format("DD/MM/YYYY") : "-"),
      sorter: (a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0),
    },
    {
      title: "Statusi",
      dataIndex: "isPaid",
      key: "isPaid",
      render: (isPaid, record) => {
        const isOverdue =
          !isPaid &&
          record.dueDate &&
          dayjs(record.dueDate).isBefore(dayjs(), "day");
        return (
          <Tag color={isPaid ? "green" : isOverdue ? "red" : "orange"}>
            {isPaid ? "E paguar" : isOverdue ? "E vonuar" : "E papaguar"}
          </Tag>
        );
      },
      filters: [
        { text: "E paguar", value: true },
        { text: "E papaguar", value: false },
      ],
      onFilter: (value, record) => (record.isPaid || false) === value,
    },
    {
      title: "Përshkrimi",
      dataIndex: "description",
      key: "description",
      render: (description) => description || "-",
      ellipsis: true,
    },
    {
      title: "Veprime",
      key: "actions",
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edito
          </Button>
          <Button
            type={record.isPaid || false ? "default" : "primary"}
            size="small"
            onClick={() => handleTogglePaid(record)}
          >
            {record.isPaid || false ? "Shëno si papaguar" : "Shëno si paguar"}
          </Button>
          <Popconfirm
            title="A jeni të sigurt që dëshironi ta fshini këtë borxh?"
            description="Ky veprim nuk mund të kthehet mbrapsht."
            onConfirm={() => handleDelete(record.id)}
            okText="Po, fshi"
            cancelText="Anulo"
            okType="danger"
          >
            <Button
              type="primary"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              Fshi
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const createTableWithLocale = (emptyText) => (
    <Table
      columns={columns}
      dataSource={debts}
      rowKey="id"
      loading={loading}
      locale={{
        emptyText: (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <ExclamationCircleOutlined
              style={{ fontSize: 48, color: "#d9d9d9" }}
            />
            <div style={{ marginTop: 16, color: "#8c8c8c" }}>{emptyText}</div>
          </div>
        ),
      }}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) =>
          `${range[0]}-${range[1]} nga ${total} borxhe`,
      }}
      scroll={{ x: 1200 }}
    />
  );

  return (
    <div>
      <div className="responsive-page-header flex justify-between items-center mb-6">
        <Title level={2}>Menaxhimi i Borxheve</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingDebt(null);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          Shto{" "}
          {activeTab === "OwedToCompany" ? "Borxh të Ri" : "Borxh që ka Firma"}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-white border-0 shadow-lg">
              <Statistic
                title="Gjithsej Borxhe ndaj Firmës"
                value={summary.totalOwedToCompany || 0}
                precision={2}
                valueStyle={{ color: "#cf1322" }}
                suffix="MKD"
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-white border-0 shadow-lg">
              <Statistic
                title="Gjithsej Borxhe që ka Firma"
                value={summary.totalCompanyOwes || 0}
                precision={2}
                valueStyle={{ color: "#3f8600" }}
                suffix="MKD"
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-white border-0 shadow-lg">
              <Statistic
                title="Borxh Neto"
                value={summary.netDebt || 0}
                precision={2}
                valueStyle={{
                  color: (summary.netDebt || 0) >= 0 ? "#cf1322" : "#3f8600",
                }}
                suffix="MKD"
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="bg-white border-0 shadow-lg">
              <Statistic
                title="Borxhe të Vonuara"
                value={summary.overdueDebts || 0}
                valueStyle={{ color: "#cf1322" }}
                suffix="borxhe"
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabs for different debt types */}
      <Card className="bg-white border-0 shadow-lg">
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: "OwedToCompany",
              label: (
                <span>
                  <ExclamationCircleOutlined style={{ color: "#cf1322" }} />
                  Borxhet ndaj Firmës
                </span>
              ),
              children: createTableWithLocale("Nuk ka borxhe ndaj firmës"),
            },
            {
              key: "CompanyOwes",
              label: (
                <span>
                  <DollarOutlined style={{ color: "#3f8600" }} />
                  Borxhet që ka Firma
                </span>
              ),
              children: createTableWithLocale("Nuk ka borxhe që ka firma"),
            },
          ]}
        />
      </Card>

      {/* Create/Edit Debt Modal */}
      <Modal
        title={
          editingDebt
            ? "Edito Borxhin"
            : activeTab === "OwedToCompany"
            ? "Shto Borxh të Ri"
            : "Shto Borxh që ka Firma"
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingDebt(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            amount: 0,
          }}
        >
          <Form.Item
            name="debtorName"
            label={
              activeTab === "OwedToCompany"
                ? "Emri i Debitorit"
                : "Emri i Kreditorit"
            }
            rules={[
              {
                required: true,
                message:
                  activeTab === "OwedToCompany"
                    ? "Ju lutem shkruani emrin e debitorit!"
                    : "Ju lutem shkruani emrin e kreditorit!",
              },
            ]}
          >
            <Input
              placeholder={
                activeTab === "OwedToCompany"
                  ? "Shkruani emrin e debitorit"
                  : "Shkruani emrin e kreditorit"
              }
            />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Shuma (MKD)"
            rules={[
              { required: true, message: "Ju lutem shkruani shumën!" },
              {
                type: "number",
                min: 0,
                message: "Shuma duhet të jetë pozitive!",
              },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="Shkruani shumën në MKD"
              min={0}
              step={0.01}
              formatter={(value) => {
                if (!value) return '';
                return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
              }}
              parser={(value) => {
                if (!value) return '';
                return value.replace(/[^\d.-]/g, '');
              }}
            />
          </Form.Item>

          <Form.Item
            name="dueDate"
            label="Data e Caktuar per te Paguar"
            rules={[
              {
                required: true,
                message: "Ju lutem zgjidhni datën e caktuar per te paguar!",
              },
            ]}
          >
            <DatePicker
              style={{ width: "100%" }}
              placeholder="Zgjidhni datën e caktuar per te paguar"
              format="YYYY-MM-DD"
            />
          </Form.Item>

          <Form.Item name="description" label="Përshkrimi">
            <TextArea
              rows={3}
              placeholder={
                activeTab === "OwedToCompany"
                  ? "Shkruani përshkrimin e borxhit (opsionale)"
                  : "Shkruani përshkrimin e borxhit që ka firma (opsionale)"
              }
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingDebt ? "Përditëso" : "Shto"}
              </Button>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingDebt(null);
                  form.resetFields();
                }}
              >
                Anulo
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Debts;
