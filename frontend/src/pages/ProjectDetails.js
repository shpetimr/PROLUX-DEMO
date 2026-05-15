import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Timeline,
  Statistic,
  Row,
  Col,
  Divider,
  message,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  CalendarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import apiClient, { API_ENDPOINTS } from "../config/api";

const { TextArea } = Input;
const { Option } = Select;

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchProjectDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.PROJECT_BY_ID(id));
      setProject(response.data);
    } catch (error) {
      console.error("Error fetching project details:", error);
      message.error("Gabim në marrjen e detajeve të projektit");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  const handleEdit = () => {
    form.setFieldsValue({
      name: project.name,
      startDate: dayjs(project.startDate),
      endDate: dayjs(project.endDate),
      content: project.content,
      promet: project.promet,
      description: project.description,
      expenses: project.expenses,
      profit: project.profit,
      status: project.status,
    });
    setEditModalVisible(true);
  };

  const handleUpdate = async (values) => {
    try {
      const projectData = {
        ...values,
        startDate: values.startDate.toDate(),
        endDate: values.endDate.toDate(),
      };

      await apiClient.put(API_ENDPOINTS.PROJECT_BY_ID(id), projectData);
      message.success("Projekti u përditësua me sukses");
      setEditModalVisible(false);
      fetchProjectDetails();
    } catch (error) {
      console.error("Error updating project:", error);
      message.error("Gabim në përditësimin e projektit");
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

  const calculateProgress = () => {
    if (!project) return 0;

    const start = dayjs(project.startDate);
    const end = dayjs(project.endDate);
    const now = dayjs();

    if (now.isBefore(start)) return 0;
    if (now.isAfter(end)) return 100;

    const totalDuration = end.diff(start, "day");
    const elapsed = now.diff(start, "day");
    return Math.round((elapsed / totalDuration) * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Duke ngarkuar...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-8">
        <div className="text-lg text-gray-600">Projekti nuk u gjet</div>
        <Button onClick={() => navigate("/projects")} className="mt-4">
          Kthehu te Projektet
        </Button>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/projects")}
          >
            Kthehu
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600">Detajet e projektit</p>
          </div>
        </div>
        <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
          Edito Projekt
        </Button>
      </div>

      {/* Project Overview */}
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Prometi"
              value={project.promet}
              precision={2}
              valueStyle={{ color: "#52c41a" }}
              prefix="€"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Harxhimet"
              value={project.expenses || 0}
              precision={2}
              valueStyle={{ color: "#ff4d4f" }}
              prefix="€"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Fitimi"
              value={project.profit || 0}
              precision={2}
              valueStyle={{ color: "#52c41a" }}
              prefix="€"
            />
          </Card>
        </Col>
      </Row>

      {/* Project Details */}
      <Card title="Informacioni i Projektit">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Emri i Objektit" span={2}>
            {project.name}
          </Descriptions.Item>
          <Descriptions.Item label="Data e Fillimit">
            <div className="flex items-center gap-2">
              <CalendarOutlined className="text-blue-500" />
              {dayjs(project.startDate).format("DD MMMM YYYY")}
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="Data e Përfundimit">
            <div className="flex items-center gap-2">
              <CalendarOutlined className="text-green-500" />
              {dayjs(project.endDate).format("DD MMMM YYYY")}
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="Permbajtja" span={2}>
            {project.content}
          </Descriptions.Item>
          <Descriptions.Item label="Statusi">
            <Tag
              color={getStatusColor(project.status)}
              icon={getStatusIcon(project.status)}
            >
              {getStatusText(project.status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Progresi">
            <div className="flex items-center gap-2">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{progress}%</span>
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="Krijuar nga">
            <div className="flex items-center gap-2">
              <UserOutlined />
              {project.createdByFullName}
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="Data e krijimit">
            {dayjs(project.createdAt).format("DD MMMM YYYY HH:mm")}
          </Descriptions.Item>
          {project.description && (
            <Descriptions.Item label="Përshkrimi" span={2}>
              {project.description}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Financial Summary */}
      <Card title="Përmbledhje Financiare">
        <Row gutter={16}>
          <Col span={8}>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {project.promet?.toLocaleString()} €
              </div>
              <div className="text-sm text-gray-600">Prometi Gjithsej</div>
            </div>
          </Col>
          <Col span={8}>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {(project.expenses || 0).toLocaleString()} €
              </div>
              <div className="text-sm text-gray-600">Harxhimet</div>
            </div>
          </Col>
          <Col span={8}>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {(project.profit || 0).toLocaleString()} €
              </div>
              <div className="text-sm text-gray-600">Fitimi</div>
            </div>
          </Col>
        </Row>

        <Divider />

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700">
            Marzhi i Fitimit:{" "}
            {project.promet > 0
              ? (((project.profit || 0) / project.promet) * 100).toFixed(1)
              : 0}
            %
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <Card title="Historia e Projektit">
        <Timeline>
          <Timeline.Item color="green">
            <div className="font-medium">Projekti u krijua</div>
            <div className="text-sm text-gray-500">
              {dayjs(project.createdAt).format("DD MMMM YYYY HH:mm")}
            </div>
            <div className="text-sm">
              Krijuar nga: {project.createdByFullName}
            </div>
          </Timeline.Item>

          <Timeline.Item color="blue">
            <div className="font-medium">Projekti filloi</div>
            <div className="text-sm text-gray-500">
              {dayjs(project.startDate).format("DD MMMM YYYY")}
            </div>
          </Timeline.Item>

          {project.status === "Completed" && (
            <Timeline.Item color="green">
              <div className="font-medium">Projekti përfundoi</div>
              <div className="text-sm text-gray-500">
                {dayjs(project.endDate).format("DD MMMM YYYY")}
              </div>
            </Timeline.Item>
          )}

          {project.updatedAt && (
            <Timeline.Item color="orange">
              <div className="font-medium">Projekti u përditësua</div>
              <div className="text-sm text-gray-500">
                {dayjs(project.updatedAt).format("DD MMMM YYYY HH:mm")}
              </div>
            </Timeline.Item>
          )}
        </Timeline>
      </Card>

      {/* Edit Modal */}
      <Modal
        title="Edito Projekt"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
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
                <Input placeholder="Emri i objektit" />
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
                <Input placeholder="Përmbajtja e projektit" />
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
                  placeholder="Data e fillimit"
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
                  placeholder="Data e përfundimit"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="promet"
                label="Prometi (€)"
                rules={[
                  { required: true, message: "Ju lutem shkruani prometin!" },
                ]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  addonAfter="€"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="expenses" label="Harxhimet (€)">
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  addonAfter="€"
                  min={0}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="profit" label="Fitimi (€)">
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  addonAfter="€"
                  min={0}
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
            <TextArea
              rows={4}
              placeholder="Përshkrim i detajuar i projektit..."
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex justify-end gap-2">
              <Button onClick={() => setEditModalVisible(false)}>Anulo</Button>
              <Button type="primary" htmlType="submit">
                Përditëso
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectDetails;
