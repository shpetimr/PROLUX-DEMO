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
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import apiClient, { API_ENDPOINTS } from "../config/api";
import dayjs from "dayjs";
import { useDataChange } from "../contexts/DataChangeContext";

const { Title } = Typography;
const { TextArea } = Input;

function Rents() {
  const [rents, setRents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRent, setEditingRent] = useState(null);
  const [form] = Form.useForm();
  const { notifyDataChanged } = useDataChange();

  useEffect(() => {
    fetchRents();
  }, []);

  const fetchRents = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.RENTS);
      setRents(response.data);
    } catch (error) {
      message.error("Dështoi të merren qiratë");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRent(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingRent(record);
    form.setFieldsValue({
      ...record,
      paymentDate: dayjs(record.paymentDate),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`${API_ENDPOINTS.RENTS}/${id}`);
      message.success("Qira u fshi me sukses");
      fetchRents();
      notifyDataChanged();
    } catch (error) {
      message.error("Dështoi të fshihet qira");
    }
  };

  const handleSubmit = async (values) => {
    try {
      // Fix timezone issue by using local date format instead of UTC
      const data = {
        ...values,
        paymentDate: values.paymentDate.format("YYYY-MM-DD"),
      };

      if (editingRent) {
        await apiClient.put(`${API_ENDPOINTS.RENTS}/${editingRent.id}`, data);
        message.success("Qira u përditësua me sukses");
      } else {
        await apiClient.post(API_ENDPOINTS.RENTS, data);
        message.success("Qira u krijua me sukses");
      }

      setModalVisible(false);
      fetchRents();
      notifyDataChanged();
    } catch (error) {
      message.error("Dështoi të ruhet qira");
    }
  };

  const columns = [
    {
      title: "Vendndodhja",
      dataIndex: "location",
      key: "location",
      sorter: (a, b) => a.location.localeCompare(b.location),
    },
    {
      title: "Data e Pagesës",
      dataIndex: "paymentDate",
      key: "paymentDate",
      render: (date) => dayjs(date).format("YYYY-MM-DD"),
      sorter: (a, b) =>
        dayjs(a.paymentDate).unix() - dayjs(b.paymentDate).unix(),
    },
    {
      title: "Shuma Mujore",
      dataIndex: "monthlyAmount",
      key: "monthlyAmount",
      render: (amount) => (
        <Tag color="orange">{(amount || 0).toFixed(2)} ден</Tag>
      ),
      sorter: (a, b) => a.monthlyAmount - b.monthlyAmount,
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
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            Redakto
          </Button>
          <Popconfirm
            title="A jeni të sigurt që dëshironi ta fshini këtë qira?"
            onConfirm={() => handleDelete(record.id)}
            okText="Po"
            cancelText="Jo"
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
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
        <Title level={2}>Menaxhimi i Qirave</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Shto Qira
        </Button>
      </div>

      <Card className="bg-white border-0 shadow-lg">
        <Table
          columns={columns}
          dataSource={rents}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} nga ${total} qira`,
          }}
        />
      </Card>

      <Modal
        title={editingRent ? "Redakto Qira" : "Shto Qira"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="location"
            label="Vendndodhja"
            rules={[
              { required: true, message: "Ju lutemi shkruani vendndodhjen" },
            ]}
          >
            <Input placeholder="p.sh., Magazina Kryesore, Hapësira e Zyrës" />
          </Form.Item>

          <Form.Item
            name="paymentDate"
            label="Data e Pagesës"
            rules={[
              { required: true, message: "Ju lutemi zgjidhni datën e pagesës" },
            ]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="monthlyAmount"
            label="Shuma Mujore"
            rules={[
              { required: true, message: "Ju lutemi shkruani shumën mujore" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              formatter={(value) =>
                `${value} ден`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/ден\s?|,*/g, "")}
              min={0}
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item name="description" label="Përshkrimi">
            <TextArea rows={3} placeholder="Shkruani përshkrimin e qirasë" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                {editingRent ? "Përditëso" : "Krijo"}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Anulo</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Rents;
