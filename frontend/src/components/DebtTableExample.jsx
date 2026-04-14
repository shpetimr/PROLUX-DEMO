import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Tag,
  Card,
  Row,
  Col,
  Statistic,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

const DebtTable = () => {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [summary, setSummary] = useState(null);
  const [form] = Form.useForm();

  const API_BASE = "https://localhost:7001/api/debts";

  // Fetch debts
  const fetchDebts = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_BASE);
      if (response.ok) {
        const data = await response.json();
        setDebts(data);
      } else {
        message.error("Failed to fetch debts");
      }
    } catch (error) {
      message.error("Error fetching debts: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch debt summary
  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_BASE}/summary`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  useEffect(() => {
    fetchDebts();
    fetchSummary();
  }, []);

  // Create or Update debt
  const handleSubmit = async (values) => {
    try {
      const debtData = {
        debtorName: values.debtorName,
        type: values.type,
        amount: values.amount,
        dueDate: values.dueDate.toISOString(),
        description: values.description,
      };

      const url = editingDebt ? `${API_BASE}/${editingDebt.id}` : API_BASE;
      const method = editingDebt ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(debtData),
      });

      if (response.ok) {
        message.success(
          editingDebt
            ? "Debt updated successfully"
            : "Debt created successfully"
        );
        setModalVisible(false);
        form.resetFields();
        setEditingDebt(null);
        fetchDebts();
        fetchSummary();
      } else {
        const errorData = await response.json();
        message.error("Error: " + JSON.stringify(errorData));
      }
    } catch (error) {
      message.error("Error: " + error.message);
    }
  };

  // Delete debt
  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        message.success("Debt deleted successfully");
        fetchDebts();
        fetchSummary();
      } else {
        message.error("Failed to delete debt");
      }
    } catch (error) {
      message.error("Error deleting debt: " + error.message);
    }
  };

  // Edit debt
  const handleEdit = (record) => {
    setEditingDebt(record);
    form.setFieldsValue({
      debtorName: record.debtorName,
      type: record.type,
      amount: record.amount,
      dueDate: dayjs(record.dueDate),
      description: record.description,
    });
    setModalVisible(true);
  };

  // Mark debt as paid/unpaid
  const handleTogglePaid = async (record) => {
    try {
      const response = await fetch(`${API_BASE}/${record.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isPaid: !record.isPaid,
          paidDate: !record.isPaid ? new Date().toISOString() : null,
        }),
      });

      if (response.ok) {
        message.success(`Debt marked as ${!record.isPaid ? "paid" : "unpaid"}`);
        fetchDebts();
        fetchSummary();
      } else {
        message.error("Failed to update debt status");
      }
    } catch (error) {
      message.error("Error updating debt status: " + error.message);
    }
  };

  // Table columns configuration
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
    },
    {
      title: "Emri i Debitorit",
      dataIndex: "debtorName",
      key: "debtorName",
      sorter: (a, b) => a.debtorName.localeCompare(b.debtorName),
    },
    {
      title: "Tipi",
      dataIndex: "type",
      key: "type",
      render: (type) => (
        <Tag color={type === "OwedToCompany" ? "red" : "green"}>
          {type === "OwedToCompany" ? "Borxh ndaj firmës" : "Firma ka borxh"}
        </Tag>
      ),
      filters: [
        { text: "Borxh ndaj firmës", value: "OwedToCompany" },
        { text: "Firma ka borxh", value: "CompanyOwes" },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: "Shuma (MKD)",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => `${amount.toLocaleString("mk-MK")} MKD`,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Data e Maturimit",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (date) => dayjs(date).format("DD/MM/YYYY"),
      sorter: (a, b) => new Date(a.dueDate) - new Date(b.dueDate),
    },
    {
      title: "Statusi",
      dataIndex: "isPaid",
      key: "isPaid",
      render: (isPaid, record) => {
        const isOverdue =
          !isPaid && dayjs(record.dueDate).isBefore(dayjs(), "day");
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
      onFilter: (value, record) => record.isPaid === value,
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
            type={record.isPaid ? "default" : "primary"}
            size="small"
            onClick={() => handleTogglePaid(record)}
          >
            {record.isPaid ? "Shëno si papaguar" : "Shëno si paguar"}
          </Button>
          <Button
            type="primary"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            Fshi
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <h1>Menaxhimi i Borxheve</h1>

      {/* Summary Cards */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: "24px" }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Borxhe ndaj Firmës"
                value={summary.totalOwedToCompany}
                precision={2}
                valueStyle={{ color: "#cf1322" }}
                suffix="MKD"
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Borxhe që ka Firma"
                value={summary.totalCompanyOwes}
                precision={2}
                valueStyle={{ color: "#3f8600" }}
                suffix="MKD"
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Borxh Neto"
                value={summary.netDebt}
                precision={2}
                valueStyle={{
                  color: summary.netDebt >= 0 ? "#cf1322" : "#3f8600",
                }}
                suffix="MKD"
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Borxhe të Vonuara"
                value={summary.overdueDebts}
                valueStyle={{ color: "#cf1322" }}
                suffix="borxhe"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Add New Debt Button */}
      <div style={{ marginBottom: "16px" }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingDebt(null);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          Shto Borxh të Ri
        </Button>
      </div>

      {/* Debts Table */}
      <Table
        columns={columns}
        dataSource={debts}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} nga ${total} borxhe`,
        }}
        scroll={{ x: 1200 }}
      />

      {/* Create/Edit Debt Modal */}
      <Modal
        title={editingDebt ? "Edito Borxhin" : "Shto Borxh të Ri"}
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
            type: "OwedToCompany",
            amount: 0,
          }}
        >
          <Form.Item
            name="debtorName"
            label="Emri i Debitorit"
            rules={[
              {
                required: true,
                message: "Ju lutem shkruani emrin e debitorit!",
              },
            ]}
          >
            <Input placeholder="Shkruani emrin e debitorit" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Tipi i Borxhit"
            rules={[
              { required: true, message: "Ju lutem zgjidhni tipin e borxhit!" },
            ]}
          >
            <Select placeholder="Zgjidhni tipin e borxhit">
              <Option value="OwedToCompany">Borxh ndaj firmës</Option>
              <Option value="CompanyOwes">Firma ka borxh</Option>
            </Select>
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
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/\s?|(,*)/g, "")}
            />
          </Form.Item>

          <Form.Item
            name="dueDate"
            label="Data e Maturimit"
            rules={[
              {
                required: true,
                message: "Ju lutem zgjidhni datën e maturimit!",
              },
            ]}
          >
            <DatePicker
              style={{ width: "100%" }}
              placeholder="Zgjidhni datën e maturimit"
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item name="description" label="Përshkrimi">
            <TextArea
              rows={3}
              placeholder="Shkruani përshkrimin e borxhit (opsionale)"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingDebt ? "Përditëso" : "Krijo"}
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
};

export default DebtTable;
