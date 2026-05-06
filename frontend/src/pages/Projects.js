import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Tag,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  message,
  Popconfirm,
  Tooltip,
  Badge,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CalendarOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import apiClient, { API_ENDPOINTS } from "../config/api";
import { useDataChange } from "../contexts/DataChangeContext";
import { useAuth } from "../contexts/AuthContext";

const { TextArea } = Input;
const { Option } = Select;

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState("all");
  const { notifyDataChanged } = useDataChange();
  const { isAuthenticated, user } = useAuth();

  // Statistics state
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    totalPromet: 0,
    totalExpenses: 0,
    totalProfit: 0,
  });

  useEffect(() => {
    // Check authentication before fetching data
    if (!isAuthenticated()) {
      message.error("Ju nuk jeni të autorizuar. Ju lutemi identifikohuni.");
      navigate("/login");
      return;
    }


    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, navigate]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.PROJECTS);
      const projectsData = response.data;
      setProjects(projectsData);
      calculateStats(projectsData);
    } catch (error) {
      console.error("Error fetching projects:", error);

      // Handle different error types
      if (error.response?.status === 401) {
        message.error("Ju nuk jeni të autorizuar. Ju lutemi identifikohuni.");
        // The API interceptor should handle redirect to login
      } else if (error.response?.status === 403) {
        message.error("Ju nuk keni të drejta për të parë projektet.");
      } else if (error.response?.status >= 500) {
        message.error("Gabim në server. Provoni përsëri më vonë.");
      } else {
        message.error("Gabim në marrjen e projekteve. Kontrolloni lidhjen.");
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (projectsData) => {
    const stats = {
      total: projectsData.length,
      pending: projectsData.filter((p) => p.status === "Pending").length,
      inProgress: projectsData.filter((p) => p.status === "InProgress").length,
      completed: projectsData.filter((p) => p.status === "Completed").length,
      cancelled: projectsData.filter((p) => p.status === "Cancelled").length,
      totalPromet: projectsData.reduce((sum, p) => sum + (p.promet || 0), 0),
      totalExpenses: projectsData.reduce(
        (sum, p) => sum + (p.expenses || 0),
        0
      ),
      // Llogarit fitimin total bazuar në prometin dhe harxhimet
      totalProfit: projectsData.reduce((sum, p) => {
        const projectProfit = (p.promet || 0) - (p.expenses || 0);
        return sum + projectProfit;
      }, 0),
    };
    setStats(stats);
  };

  const handleCreate = () => {
    setEditingProject(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleViewDetails = (record) => {
    navigate(`/projects/${record.id}`);
  };

  const handleEdit = (record) => {
    setEditingProject(record);
    form.setFieldsValue({
      name: record.name,
      startDate: dayjs(record.startDate),
      endDate: dayjs(record.endDate),
      content: record.content,
      promet: record.promet,
      description: record.description,
      expenses: record.expenses,
      profit: record.profit,
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {

      await apiClient.delete(API_ENDPOINTS.PROJECT_BY_ID(id));
      message.success("Projekti u fshi me sukses");
      fetchProjects();
      notifyDataChanged();
    } catch (error) {
      console.error("Error deleting project:", error);

      // Handle different error types
      if (error.response?.status === 401) {
        message.error("Ju nuk jeni të autorizuar. Ju lutemi identifikohuni.");
      } else if (error.response?.status === 403) {
        message.error("Ju nuk keni të drejta për të fshirë projektet.");
      } else if (error.response?.status === 404) {
        message.error("Projekti nuk u gjet.");
      } else if (error.response?.status >= 500) {
        message.error("Gabim në server. Provoni përsëri më vonë.");
      } else {
        message.error("Gabim në fshirjen e projektit. Kontrolloni lidhjen.");
      }
    }
  };

  const handleSubmit = async (values) => {
    try {

      // Llogarit fitimin automatikisht
      const calculatedProfit = (values.promet || 0) - (values.expenses || 0);

      const projectData = {
        ...values,
        startDate: values.startDate.format("YYYY-MM-DD"),
        endDate: values.endDate.format("YYYY-MM-DD"),
        profit: calculatedProfit, // Shto fitimin e llogaritur
      };


      if (editingProject) {
        await apiClient.put(
          API_ENDPOINTS.PROJECT_BY_ID(editingProject.id),
          projectData
        );
        message.success("Projekti u përditësua me sukses");
      } else {
        await apiClient.post(API_ENDPOINTS.PROJECTS, projectData);
        message.success("Projekti u krijua me sukses");
      }

      setModalVisible(false);
      fetchProjects();
      notifyDataChanged();
    } catch (error) {
      console.error("Error saving project:", error);

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
        message.error("Gabim në ruajtjen e projektit. Kontrolloni lidhjen.");
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "orange";
      case "InProgress":
        return "blue";
      case "Completed":
        return "green";
      case "Cancelled":
        return "red";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending":
        return <ClockCircleOutlined />;
      case "InProgress":
        return <ExclamationCircleOutlined />;
      case "Completed":
        return <CheckCircleOutlined />;
      case "Cancelled":
        return <StopOutlined />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "Pending":
        return "Në Pritje";
      case "InProgress":
        return "Në Progres";
      case "Completed":
        return "Përfunduar";
      case "Cancelled":
        return "Anuluar";
      default:
        return status;
    }
  };

  const filteredProjects =
    statusFilter === "all"
      ? projects
      : projects.filter((p) => p.status === statusFilter);

  const columns = [
    {
      title: "Objekti",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (text, record) => (
        <div>
          <div className="font-medium text-gray-900">{text}</div>
          <div className="text-xs text-gray-500">
            Krijuar nga: {record.createdByFullName}
          </div>
        </div>
      ),
    },
    {
      title: "Data Start",
      dataIndex: "startDate",
      key: "startDate",
      width: 120,
      render: (date) => (
        <div className="flex items-center gap-1">
          <CalendarOutlined className="text-blue-500" />
          <span>{dayjs(date).format("DD MMM")}</span>
        </div>
      ),
    },
    {
      title: "Finish",
      dataIndex: "endDate",
      key: "endDate",
      width: 120,
      render: (date) => (
        <div className="flex items-center gap-1">
          <CalendarOutlined className="text-green-500" />
          <span>{dayjs(date).format("DD MMM")}</span>
        </div>
      ),
    },
    {
      title: "Permbajtja",
      dataIndex: "content",
      key: "content",
      width: 200,
      render: (text) => (
        <div className="max-w-xs truncate" title={text}>
          {text}
        </div>
      ),
    },
    {
      title: "Totali",
      dataIndex: "promet",
      key: "promet",
      width: 120,
      render: (value) => (
        <div className="flex items-center gap-1">
          <DollarOutlined className="text-green-500" />
          <span className="font-medium">{value?.toLocaleString()} MKD</span>
        </div>
      ),
    },
    {
      title: "Pershkrimi",
      dataIndex: "description",
      key: "description",
      width: 250,
      render: (text) => (
        <div className="max-w-xs truncate" title={text}>
          {text || "-"}
        </div>
      ),
    },
    {
      title: "Harxhime",
      dataIndex: "expenses",
      key: "expenses",
      width: 120,
      render: (value) => (
        <div className="flex items-center gap-1">
          <DollarOutlined className="text-red-500" />
          <span className="font-medium">
            {value?.toLocaleString() || "0"} MKD
          </span>
        </div>
      ),
    },
    {
      title: "Fitim",
      dataIndex: "profit",
      key: "profit",
      width: 120,
      render: (value, record) => {
        // Llogarit fitimin automatikisht: Prometi - Harxhimet
        const calculatedProfit = (record.promet || 0) - (record.expenses || 0);
        const isProfitable = calculatedProfit >= 0;

        return (
          <div className="flex items-center gap-1">
            <DollarOutlined
              className={isProfitable ? "text-green-500" : "text-red-500"}
            />
            <span
              className={`font-medium ${
                isProfitable ? "text-green-600" : "text-red-600"
              }`}
            >
              {calculatedProfit.toLocaleString()} MKD
            </span>
          </div>
        );
      },
    },
    {
      title: "Marzha",
      key: "margin",
      width: 100,
      render: (value, record) => {
        // Llogarit marzhën: (Fitimi / Prometi) × 100%
        const calculatedProfit = (record.promet || 0) - (record.expenses || 0);
        const margin =
          record.promet > 0 ? (calculatedProfit / record.promet) * 100 : 0;
        const isProfitable = margin >= 0;

        return (
          <div className="flex items-center gap-1">
            <span
              className={`font-medium ${
                isProfitable ? "text-green-600" : "text-red-600"
              }`}
            >
              {margin.toFixed(1)}%
            </span>
          </div>
        );
      },
    },
    {
      title: "Statusi",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: "Veprime",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Shiko detajet">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Edito">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="A jeni të sigurt që doni ta fshini këtë projekt?"
            onConfirm={() => handleDelete(record.id)}
            okText="Po"
            cancelText="Jo"
          >
            <Tooltip title="Fshi">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Objektet e Rradhës 2025/26
          </h1>
          <p className="text-gray-600">Menaxhimi i projekteve dhe punëve</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleCreate}
        >
          Shto Projekt
        </Button>
      </div>

      {/* Statistics Cards */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Projekte"
              value={stats.total}
              prefix={
                <Badge
                  count={stats.total}
                  style={{ backgroundColor: "#1890ff" }}
                />
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Në Progres"
              value={stats.inProgress}
              valueStyle={{ color: "#1890ff" }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Përfunduar"
              value={stats.completed}
              valueStyle={{ color: "#52c41a" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Promet"
              value={stats.totalPromet}
              precision={2}
              valueStyle={{ color: "#52c41a" }}
              prefix="MKD"
            />
          </Card>
        </Col>
      </Row>

      {/* Status Filter */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <Button
              type={statusFilter === "all" ? "primary" : "default"}
              onClick={() => setStatusFilter("all")}
            >
              Të Gjitha ({stats.total})
            </Button>
            <Button
              type={statusFilter === "Pending" ? "primary" : "default"}
              onClick={() => setStatusFilter("Pending")}
            >
              Në Pritje ({stats.pending})
            </Button>
            <Button
              type={statusFilter === "InProgress" ? "primary" : "default"}
              onClick={() => setStatusFilter("InProgress")}
            >
              Në Progres ({stats.inProgress})
            </Button>
            <Button
              type={statusFilter === "Completed" ? "primary" : "default"}
              onClick={() => setStatusFilter("Completed")}
            >
              Përfunduar ({stats.completed})
            </Button>
            <Button
              type={statusFilter === "Cancelled" ? "primary" : "default"}
              onClick={() => setStatusFilter("Cancelled")}
            >
              Anuluar ({stats.cancelled})
            </Button>
          </div>
        </div>

        {/* Projects Table */}
        <Table
          columns={columns}
          dataSource={filteredProjects}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} nga ${total} projekte`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingProject ? "Edito Projekt" : "Shto Projekt të Ri"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            status: "Pending",
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Emri i Objektit"
                rules={[
                  {
                    required: true,
                    message: "Ju lutem shkruani emrin e objektit!",
                  },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="content"
                label="Permbajtja"
                rules={[
                  { required: true, message: "Ju lutem shkruani përmbajtjen!" },
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="Data e Fillimit"
                rules={[
                  {
                    required: true,
                    message: "Ju lutem zgjidhni datën e fillimit!",
                  },
                ]}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  placeholder="Zgjidh datën e fillimit"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="Data e Përfundimit"
                rules={[
                  {
                    required: true,
                    message: "Ju lutem zgjidhni datën e përfundimit!",
                  },
                ]}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  placeholder="Zgjidh datën e përfundimit"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="promet"
                label="Totali (MKD)"
                rules={[
                  { required: true, message: "Ju lutem shkruani totalin!" },
                ]}
              >
                <Input type="number" placeholder="0.00" addonAfter="MKD" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="expenses" label="Harxhimet (MKD)">
                <Input type="number" placeholder="0.00" addonAfter="MKD" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Fitimi (MKD)">
                <Input
                  disabled
                  placeholder="Llogaritet automatikisht"
                  addonAfter="MKD"
                  value={(() => {
                    const promet = form.getFieldValue("promet") || 0;
                    const expenses = form.getFieldValue("expenses") || 0;
                    return (promet - expenses).toLocaleString();
                  })()}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="status"
            label="Statusi"
            rules={[{ required: true, message: "Ju lutem zgjidhni statusin!" }]}
          >
            <Select placeholder="Zgjidh statusin">
              <Option value="Pending">Në Pritje</Option>
              <Option value="InProgress">Në Progres</Option>
              <Option value="Completed">Përfunduar</Option>
              <Option value="Cancelled">Anuluar</Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Përshkrimi">
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex justify-end gap-2">
              <Button onClick={() => setModalVisible(false)}>Anulo</Button>
              <Button type="primary" htmlType="submit">
                {editingProject ? "Përditëso" : "Krijo"}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Projects;
