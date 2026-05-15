import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SyncOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import apiClient, { API_ENDPOINTS } from "../config/api";
import { useAuth } from "../contexts/AuthContext";
import { PERMISSIONS } from "../config/permissions";

const { Title } = Typography;
const { TextArea } = Input;

const taskStatuses = [
  {
    value: "Waiting",
    label: "Në Pritje",
    color: "gold",
    icon: <ClockCircleOutlined />,
  },
  {
    value: "InProcess",
    label: "Në Proces",
    color: "blue",
    icon: <SyncOutlined spin />,
  },
  {
    value: "Completed",
    label: "Përfunduar",
    color: "green",
    icon: <CheckCircleOutlined />,
  },
];

const getStatusMeta = (status) =>
  taskStatuses.find((option) => option.value === status) ?? {
    value: status,
    label: status || "E panjohur",
    color: "default",
  };

const getApiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;

  if (data?.message) {
    return data.message;
  }

  const validationErrors = data?.errors
    ? Object.values(data.errors).flat()
    : [];

  if (validationErrors.length > 0) {
    return validationErrors[0];
  }

  if (data?.title) {
    return data.title;
  }

  if (typeof data === "string") {
    return data;
  }

  return fallback;
};

function WorkerTasks() {
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form] = Form.useForm();
  const { hasPermission } = useAuth();

  const canManageTasks = hasPermission(PERMISSIONS.WORKERS_MANAGE_TASKS);
  const canUpdateOwnTaskStatus = hasPermission(
    PERMISSIONS.WORKERS_UPDATE_OWN_TASK_STATUS
  );

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.WORKER_TASKS);
      setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      message.error(
        getApiErrorMessage(error, "Dështoi të ngarkohen detyrat e punëtorëve.")
      );
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const fetchWorkers = useCallback(async () => {
    setLoadingWorkers(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.WORKERS);
      setWorkers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      message.error(getApiErrorMessage(error, "Dështoi të ngarkohen punëtorët."));
    } finally {
      setLoadingWorkers(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    if (canManageTasks) {
      fetchWorkers();
    }
  }, [fetchTasks, fetchWorkers, canManageTasks]);

  const workerOptions = useMemo(
    () =>
      workers.map((worker) => ({
        value: worker.id,
        label: `${worker.employeeFullName || worker.fullName} (${worker.username})`,
      })),
    [workers]
  );

  const openCreateModal = () => {
    setEditingTask(null);
    form.resetFields();
    form.setFieldsValue({ status: "Waiting" });
    setModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    form.setFieldsValue({
      title: task.title,
      description: task.description,
      deadline: task.deadline ? dayjs(task.deadline) : null,
      status: task.status,
      assignedUserId: task.assignedUserId,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTask(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    if (!canManageTasks) {
      return;
    }

    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      deadline: values.deadline.endOf("day").toISOString(),
      status: values.status,
      assignedUserId: values.assignedUserId,
    };

    setSaving(true);
    try {
      if (editingTask) {
        await apiClient.put(
          API_ENDPOINTS.WORKER_TASK_BY_ID(editingTask.id),
          payload
        );
        message.success("Detyra u përditësua.");
      } else {
        await apiClient.post(API_ENDPOINTS.WORKER_TASKS, payload);
        message.success("Detyra u krijua.");
      }

      closeModal();
      await fetchTasks();
    } catch (error) {
      message.error(getApiErrorMessage(error, "Dështoi të ruhet detyra."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await apiClient.delete(API_ENDPOINTS.WORKER_TASK_BY_ID(taskId));
      message.success("Detyra u fshi.");
      await fetchTasks();
    } catch (error) {
      message.error(getApiErrorMessage(error, "Dështoi të fshihet detyra."));
    }
  };

  const handleStatusChange = async (taskId, status) => {
    setUpdatingStatusTaskId(taskId);
    try {
      await apiClient.patch(API_ENDPOINTS.WORKER_TASK_STATUS(taskId), {
        status,
      });
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId ? { ...task, status } : task
        )
      );
      message.success("Statusi i detyrës u përditësua.");
    } catch (error) {
      message.error(
        getApiErrorMessage(error, "Dështoi të përditësohet statusi i detyrës.")
      );
    } finally {
      setUpdatingStatusTaskId(null);
    }
  };

  const columns = [
    {
      title: "Titulli",
      dataIndex: "title",
      key: "title",
      width: 220,
      sorter: (a, b) => (a.title || "").localeCompare(b.title || ""),
    },
    {
      title: "Përshkrimi",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Caktuar për",
      dataIndex: "assignedUserFullName",
      key: "assignedUserFullName",
      width: 180,
      hidden: !canManageTasks,
      render: (name) => (
        <Space size={6}>
          <UserOutlined className="text-blue-500" />
          <span>{name || "-"}</span>
        </Space>
      ),
      sorter: (a, b) =>
        (a.assignedUserFullName || "").localeCompare(
          b.assignedUserFullName || ""
        ),
    },
    {
      title: "Afati",
      dataIndex: "deadline",
      key: "deadline",
      width: 140,
      render: (deadline) => (
        <Space size={6}>
          <CalendarOutlined className="text-green-500" />
          <span>{deadline ? dayjs(deadline).format("YYYY-MM-DD") : "-"}</span>
        </Space>
      ),
      sorter: (a, b) => dayjs(a.deadline).unix() - dayjs(b.deadline).unix(),
      defaultSortOrder: "ascend",
    },
    {
      title: "Statusi",
      dataIndex: "status",
      key: "status",
      width: canManageTasks ? 140 : 180,
      filters: taskStatuses.map((status) => ({
        text: status.label,
        value: status.value,
      })),
      onFilter: (value, record) => record.status === value,
      render: (status, record) => {
        const meta = getStatusMeta(status);
        if (!canManageTasks && canUpdateOwnTaskStatus) {
          return (
            <Select
              value={status}
              options={taskStatuses.map(({ value, label }) => ({
                value,
                label,
              }))}
              onChange={(nextStatus) =>
                handleStatusChange(record.id, nextStatus)
              }
              loading={updatingStatusTaskId === record.id}
              disabled={updatingStatusTaskId === record.id}
              style={{ width: 150 }}
            />
          );
        }

        return (
          <Tag color={meta.color} icon={meta.icon}>
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: "Krijuar nga",
      dataIndex: "createdByFullName",
      key: "createdByFullName",
      width: 160,
      hidden: !canManageTasks,
      render: (name) => name || "-",
    },
    {
      title: "Veprime",
      key: "actions",
      width: 120,
      hidden: !canManageTasks,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Redakto">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Fshi këtë detyrë?"
            okText="Fshi"
            cancelText="Anulo"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="Fshi">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Space align="center" size={12}>
          <CheckSquareOutlined className="text-2xl text-blue-600" />
          <Title level={2} className="m-0">
            {canManageTasks ? "Detyrat e Punëtorëve" : "Detyrat e Mia"}
          </Title>
        </Space>
        {canManageTasks && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Detyrë e Re
          </Button>
        )}
      </div>

      <Table
        rowKey="id"
        loading={loadingTasks}
        columns={columns.filter((column) => !column.hidden)}
        dataSource={tasks}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} nga ${total} detyra`,
        }}
        scroll={{ x: canManageTasks ? 1100 : 760 }}
      />

      <Modal
        title={editingTask ? "Redakto Detyrën" : "Detyrë e Re"}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={720}
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label="Titulli"
            rules={[
              { required: true, message: "Titulli është i detyrueshëm." },
              { max: 200, message: "Titulli nuk mund të kalojë 200 karaktere." },
              {
                transform: (value) => value?.trim(),
                whitespace: true,
                message: "Titulli është i detyrueshëm.",
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Përshkrimi"
            rules={[
              { required: true, message: "Përshkrimi është i detyrueshëm." },
              {
                max: 1000,
                message: "Përshkrimi nuk mund të kalojë 1000 karaktere.",
              },
              {
                transform: (value) => value?.trim(),
                whitespace: true,
                message: "Përshkrimi është i detyrueshëm.",
              },
            ]}
          >
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="assignedUserId"
            label="Punëtori i caktuar"
            rules={[
              { required: true, message: "Punëtori i caktuar është i detyrueshëm." },
            ]}
          >
            <Select
              showSearch
              loading={loadingWorkers}
              options={workerOptions}
              optionFilterProp="label"
              placeholder="Zgjidh punëtorin"
            />
          </Form.Item>

          <Form.Item
            name="deadline"
            label="Afati"
            rules={[{ required: true, message: "Afati është i detyrueshëm." }]}
          >
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Statusi"
            rules={[{ required: true, message: "Statusi është i detyrueshëm." }]}
          >
            <Select options={taskStatuses.map(({ value, label }) => ({ value, label }))} />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex justify-end gap-2">
              <Button onClick={closeModal}>Anulo</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                disabled={loadingWorkers}
              >
                {editingTask ? "Përditëso" : "Krijo"}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default WorkerTasks;
