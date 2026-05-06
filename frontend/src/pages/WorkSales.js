import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import apiClient, { API_ENDPOINTS } from "../config/api";
import { useDataChange } from "../contexts/DataChangeContext";

const { TextArea } = Input;
const { Title } = Typography;

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} MKD`;
const formatNumber = (value) => Number(value || 0).toFixed(2);
const formatInputMoney = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return `${value} MKD`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
const parseInputMoney = (value) => (value || "").replace(/MKD\s?|,/g, "");

function WorkSales() {
  const [workSales, setWorkSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorkSale, setEditingWorkSale] = useState(null);
  const [form] = Form.useForm();
  const { notifyDataChanged } = useDataChange();

  useEffect(() => {
    fetchWorkSales();
  }, []);

  const fetchWorkSales = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.WORK_SALES);
      setWorkSales(response.data);
    } catch (error) {
      message.error("Failed to fetch work sales");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingWorkSale(null);
    form.resetFields();
    form.setFieldsValue({ date: dayjs() });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingWorkSale(record);
    form.setFieldsValue({
      workName: record.workName,
      totalWorkM2: record.totalWorkM2,
      clientPricePerM2: record.clientPricePerM2,
      subcontractorPricePerM2: record.subcontractorPricePerM2,
      date: dayjs(record.date),
      notes: record.notes,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(API_ENDPOINTS.WORK_SALE_BY_ID(id));
      message.success("Work sale deleted successfully");
      fetchWorkSales();
      notifyDataChanged();
    } catch (error) {
      message.error("Failed to delete work sale");
    }
  };

  const handleSubmit = async (values) => {
    try {
      const data = {
        workName: values.workName,
        totalWorkM2: values.totalWorkM2,
        clientPricePerM2: values.clientPricePerM2,
        subcontractorPricePerM2: values.subcontractorPricePerM2,
        date: values.date.format("YYYY-MM-DD"),
        notes: values.notes,
      };

      if (editingWorkSale) {
        await apiClient.put(API_ENDPOINTS.WORK_SALE_BY_ID(editingWorkSale.id), data);
        message.success("Work sale updated successfully");
      } else {
        await apiClient.post(API_ENDPOINTS.WORK_SALES, data);
        message.success("Work sale created successfully");
      }

      setModalVisible(false);
      fetchWorkSales();
      notifyDataChanged();
    } catch (error) {
      message.error("Failed to save work sale");
    }
  };

  const totalRevenue = workSales.reduce(
    (sum, item) => sum + Number(item.totalRevenue || 0),
    0
  );
  const totalCost = workSales.reduce(
    (sum, item) => sum + Number(item.totalCost || 0),
    0
  );
  const totalProfit = workSales.reduce(
    (sum, item) => sum + Number(item.profit || 0),
    0
  );

  const columns = [
    {
      title: "Work Name",
      dataIndex: "workName",
      key: "workName",
      fixed: "left",
      width: 180,
      sorter: (a, b) => a.workName.localeCompare(b.workName),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 130,
      render: (date) => dayjs(date).format("YYYY-MM-DD"),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: "Total Work M2",
      dataIndex: "totalWorkM2",
      key: "totalWorkM2",
      width: 140,
      render: (value) => formatNumber(value),
      sorter: (a, b) => a.totalWorkM2 - b.totalWorkM2,
    },
    {
      title: "Client / M2",
      dataIndex: "clientPricePerM2",
      key: "clientPricePerM2",
      width: 140,
      render: (value) => formatMoney(value),
      sorter: (a, b) => a.clientPricePerM2 - b.clientPricePerM2,
    },
    {
      title: "Subcontractor / M2",
      dataIndex: "subcontractorPricePerM2",
      key: "subcontractorPricePerM2",
      width: 170,
      render: (value) => formatMoney(value),
      sorter: (a, b) => a.subcontractorPricePerM2 - b.subcontractorPricePerM2,
    },
    {
      title: "Total Revenue",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      width: 150,
      render: (value) => <Tag color="green">{formatMoney(value)}</Tag>,
      sorter: (a, b) => a.totalRevenue - b.totalRevenue,
    },
    {
      title: "Total Cost",
      dataIndex: "totalCost",
      key: "totalCost",
      width: 140,
      render: (value) => <Tag color="orange">{formatMoney(value)}</Tag>,
      sorter: (a, b) => a.totalCost - b.totalCost,
    },
    {
      title: "Profit",
      dataIndex: "profit",
      key: "profit",
      width: 130,
      render: (value) => (
        <Tag color={Number(value || 0) >= 0 ? "blue" : "red"}>
          {formatMoney(value)}
        </Tag>
      ),
      sorter: (a, b) => a.profit - b.profit,
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
      width: 220,
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 170,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this work sale?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>Work Sales</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add Work Sale
        </Button>
      </div>

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="bg-white border-0 shadow-lg">
            <Statistic
              title="Total Revenue"
              value={totalRevenue}
              precision={2}
              suffix="MKD"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="bg-white border-0 shadow-lg">
            <Statistic
              title="Total Cost"
              value={totalCost}
              precision={2}
              suffix="MKD"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="bg-white border-0 shadow-lg">
            <Statistic
              title="Profit"
              value={totalProfit}
              precision={2}
              suffix="MKD"
              valueStyle={{ color: totalProfit >= 0 ? "#1890ff" : "#cf1322" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="bg-white border-0 shadow-lg">
            <Statistic title="Works" value={workSales.length} />
          </Card>
        </Col>
      </Row>

      <Card className="bg-white border-0 shadow-lg">
        <Table
          columns={columns}
          dataSource={workSales}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} work sales`,
          }}
        />
      </Card>

      <Modal
        title={editingWorkSale ? "Edit Work Sale" : "Add Work Sale"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="workName"
            label="Work Name"
            rules={[{ required: true, message: "Please enter work name" }]}
          >
            <Input placeholder="Work name" />
          </Form.Item>

          <Form.Item
            name="totalWorkM2"
            label="Total Work M2"
            rules={[{ required: true, message: "Please enter total work M2" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0.01}
              precision={2}
              step={0.01}
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item
            name="clientPricePerM2"
            label="Client Price Per M2"
            rules={[
              { required: true, message: "Please enter client price per M2" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              formatter={formatInputMoney}
              parser={parseInputMoney}
              min={0}
              precision={2}
              step={0.01}
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item
            name="subcontractorPricePerM2"
            label="Subcontractor Price Per M2"
            rules={[
              {
                required: true,
                message: "Please enter subcontractor price per M2",
              },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              formatter={formatInputMoney}
              parser={parseInputMoney}
              min={0}
              precision={2}
              step={0.01}
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: "Please select date" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="YYYY-MM-DD"
              placeholder="Select date"
            />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Notes" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                {editingWorkSale ? "Update" : "Create"}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default WorkSales;
