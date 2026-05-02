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
    label: "Waiting",
    color: "gold",
    icon: <ClockCircleOutlined />,
  },
  {
    value: "InProcess",
    label: "In Process",
    color: "blue",
    icon: <SyncOutlined spin />,
  },
  {
    value: "Completed",
    label: "Completed",
    color: "green",
    icon: <CheckCircleOutlined />,
  },
];

const getStatusMeta = (status) =>
  taskStatuses.find((option) => option.value === status) ?? {
    value: status,
    label: status || "Unknown",
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
  const [users, setUsers] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
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
        getApiErrorMessage(error, "Failed to load worker tasks.")
      );
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS);
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      message.error(getApiErrorMessage(error, "Failed to load users."));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    if (canManageTasks) {
      fetchUsers();
    }
  }, [fetchTasks, fetchUsers, canManageTasks]);

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        value: user.id,
        label: `${user.fullName} (${user.username})`,
      })),
    [users]
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
        message.success("Task updated.");
      } else {
        await apiClient.post(API_ENDPOINTS.WORKER_TASKS, payload);
        message.success("Task created.");
      }

      closeModal();
      await fetchTasks();
    } catch (error) {
      message.error(getApiErrorMessage(error, "Failed to save task."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await apiClient.delete(API_ENDPOINTS.WORKER_TASK_BY_ID(taskId));
      message.success("Task deleted.");
      await fetchTasks();
    } catch (error) {
      message.error(getApiErrorMessage(error, "Failed to delete task."));
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
      message.success("Task status updated.");
    } catch (error) {
      message.error(
        getApiErrorMessage(error, "Failed to update task status.")
      );
    } finally {
      setUpdatingStatusTaskId(null);
    }
  };

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      width: 220,
      sorter: (a, b) => (a.title || "").localeCompare(b.title || ""),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Assigned To",
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
      title: "Deadline",
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
      title: "Status",
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
      title: "Created By",
      dataIndex: "createdByFullName",
      key: "createdByFullName",
      width: 160,
      hidden: !canManageTasks,
      render: (name) => name || "-",
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      hidden: !canManageTasks,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this task?"
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="Delete">
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
            {canManageTasks ? "Worker Tasks" : "My Tasks"}
          </Title>
        </Space>
        {canManageTasks && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            New Task
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
            `${range[0]}-${range[1]} of ${total} tasks`,
        }}
        scroll={{ x: canManageTasks ? 1100 : 760 }}
      />

      <Modal
        title={editingTask ? "Edit Task" : "New Task"}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        width={720}
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="title"
            label="Title"
            rules={[
              { required: true, message: "Title is required." },
              { max: 200, message: "Title cannot exceed 200 characters." },
              {
                transform: (value) => value?.trim(),
                whitespace: true,
                message: "Title is required.",
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, message: "Description is required." },
              {
                max: 1000,
                message: "Description cannot exceed 1000 characters.",
              },
              {
                transform: (value) => value?.trim(),
                whitespace: true,
                message: "Description is required.",
              },
            ]}
          >
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="assignedUserId"
            label="Assigned worker/user"
            rules={[
              { required: true, message: "Assigned worker/user is required." },
            ]}
          >
            <Select
              showSearch
              loading={loadingUsers}
              options={userOptions}
              optionFilterProp="label"
              placeholder="Select user"
            />
          </Form.Item>

          <Form.Item
            name="deadline"
            label="Deadline"
            rules={[{ required: true, message: "Deadline is required." }]}
          >
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: "Status is required." }]}
          >
            <Select options={taskStatuses.map(({ value, label }) => ({ value, label }))} />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex justify-end gap-2">
              <Button onClick={closeModal}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                disabled={loadingUsers}
              >
                {editingTask ? "Update" : "Create"}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default WorkerTasks;
