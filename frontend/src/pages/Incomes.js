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
import utc from "dayjs/plugin/utc";
import { useDataChange } from "../contexts/DataChangeContext";

dayjs.extend(utc);

const { Title } = Typography;
const { TextArea } = Input;

function Incomes() {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [form] = Form.useForm();
  const { notifyDataChanged } = useDataChange();

  useEffect(() => {
    fetchIncomes();
  }, []);

  const fetchIncomes = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.INCOMES);
      setIncomes(response.data);
    } catch (error) {
      console.error("Incomes page: Error fetching incomes:", error);
      message.error("Failed to fetch incomes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingIncome(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingIncome(record);
    form.setFieldsValue({
      ...record,
      date: dayjs(record.date),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`${API_ENDPOINTS.INCOMES}/${id}`);
      message.success("Të ardhura u fshi me sukses");
      fetchIncomes();
      notifyDataChanged();
    } catch (error) {
      message.error("Dështoi të fshihet të ardhura");
    }
  };

  const handleSubmit = async (values) => {
    try {
      
      // Fix timezone issue by using local date format instead of UTC
      const data = {
        ...values,
        date: values.date.format("YYYY-MM-DD"),
      };


      if (editingIncome) {
        await apiClient.put(
          `${API_ENDPOINTS.INCOMES}/${editingIncome.id}`,
          data
        );
        message.success("Të ardhura u përditësua me sukses");
      } else {
        await apiClient.post(API_ENDPOINTS.INCOMES, data);
        message.success("Të ardhura u krijua me sukses");
      }

      setModalVisible(false);
      fetchIncomes();
      notifyDataChanged();
    } catch (error) {
      message.error("Dështoi të ruhet të ardhura");
    }
  };

  // Statistika për kartat
  const today = dayjs.utc().startOf("day");
  const thisMonth = dayjs.utc().startOf("month");
  const thisYear = dayjs.utc().startOf("year");
  const totalIncome = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
  const todayIncome = incomes
    .filter((inc) => dayjs.utc(inc.date).isSame(today, "day"))
    .reduce((sum, inc) => sum + (inc.amount || 0), 0);
  const monthIncome = incomes
    .filter(
      (inc) =>
        dayjs.utc(inc.date).isAfter(thisMonth) ||
        dayjs.utc(inc.date).isSame(thisMonth, "day")
    )
    .reduce((sum, inc) => sum + (inc.amount || 0), 0);
  const yearIncome = incomes
    .filter(
      (inc) =>
        dayjs.utc(inc.date).isAfter(thisYear) ||
        dayjs.utc(inc.date).isSame(thisYear, "day")
    )
    .reduce((sum, inc) => sum + (inc.amount || 0), 0);

  const columns = [
    {
      title: "Burimi",
      dataIndex: "source",
      key: "source",
      render: (source) => <Tag color="green">{source}</Tag>,
      filters: [
        { text: "Shitja e Produkteve", value: "Product Sales" },
        { text: "Shërbimi i Dhënë", value: "Service Provided" },
        { text: "Konsultimi", value: "Consultation" },
      ],
      onFilter: (value, record) => record.source === value,
    },
    {
      title: "Data",
      dataIndex: "date",
      key: "date",
      render: (date) => dayjs(date).format("YYYY-MM-DD"),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: "Shuma",
      dataIndex: "amount",
      key: "amount",
      render: (amount) => <Tag color="green">{(amount || 0).toFixed(2)} ден</Tag>,
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
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            Redakto
          </Button>
          <Popconfirm
            title="A jeni të sigurt që dëshironi ta fshini këtë të ardhur?"
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
        <Title level={2}>Menaxhimi i Të Ardhurave</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Shto Të Ardhur
        </Button>
      </div>

      {/* Kartat e statistikave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card className="text-center border-0 shadow-none bg-transparent">
          <div className="text-gray-400 text-sm mb-1">
            Totali i Të Ardhurave
          </div>
          <div className="text-2xl font-bold text-orange-500">
            {(totalIncome || 0).toFixed(2)} ден
          </div>
        </Card>
        <Card className="text-center border-0 shadow-none bg-transparent">
          <div className="text-gray-400 text-sm mb-1">Të Ardhurat e Sotme</div>
          <div className="text-2xl font-bold text-green-500">
            {(todayIncome || 0).toFixed(2)} ден
          </div>
        </Card>
        <Card className="text-center border-0 shadow-none bg-transparent">
          <div className="text-gray-400 text-sm mb-1">
            Të Ardhurat e Këtij Muaji
          </div>
          <div className="text-2xl font-bold text-blue-500">
            {(monthIncome || 0).toFixed(2)} ден
          </div>
        </Card>
        <Card className="text-center border-0 shadow-none bg-transparent">
          <div className="text-gray-400 text-sm mb-1">
            Të Ardhurat e Këtij Viti
          </div>
          <div className="text-2xl font-bold text-red-500">
            {(yearIncome || 0).toFixed(2)} ден
          </div>
        </Card>
      </div>

      <Card className="bg-white border-0 shadow-lg">
        <Table
          columns={columns}
          dataSource={incomes}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} incomes`,
          }}
        />
      </Card>

      <Modal
        title={editingIncome ? "Redakto Të Ardhur" : "Shto Të Ardhur"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="source"
            label="Burimi"
            rules={[
              {
                required: true,
                message: "Ju lutemi shkruani burimin e të ardhurës!",
              },
            ]}
          >
            <Input placeholder="Shkruani burimin e të ardhurës" />
          </Form.Item>

          <Form.Item
            name="date"
            label="Data"
            rules={[{ required: true, message: "Ju lutemi zgjidhni datën" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="YYYY-MM-DD"
              placeholder="Zgjidh datën e të ardhurës"
            />
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
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item name="description" label="Përshkrimi">
            <TextArea
              rows={3}
              placeholder="Shkruani përshkrimin e të ardhurave"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                {editingIncome ? "Përditëso" : "Krijo"}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Anulo</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Incomes;
