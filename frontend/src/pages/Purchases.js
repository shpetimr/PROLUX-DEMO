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
  Row,
  Col,
  Statistic,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import apiClient, { API_ENDPOINTS } from "../config/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useDataChange } from "../contexts/DataChangeContext";
dayjs.extend(utc);

const { Title } = Typography;
const { TextArea } = Input;

function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [form] = Form.useForm();
  const { notifyDataChanged } = useDataChange();

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.PURCHASES);
      setPurchases(response.data);
    } catch (error) {
      message.error("Failed to fetch purchases");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPurchase(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingPurchase(record);
    form.setFieldsValue({
      ...record,
      purchaseDate: dayjs(record.purchaseDate),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`${API_ENDPOINTS.PURCHASES}/${id}`);
      message.success("Blerja u fshi me sukses");
      fetchPurchases();
      notifyDataChanged();
    } catch (error) {
      message.error("Dështoi të fshihet blerja");
    }
  };

  const handleSubmit = async (values) => {
    try {
      
      // Fix timezone issue by using local date format instead of UTC
      const data = {
        ...values,
        purchaseDate: values.purchaseDate.format("YYYY-MM-DD"),
      };


      if (editingPurchase) {
        await apiClient.put(
          `${API_ENDPOINTS.PURCHASES}/${editingPurchase.id}`,
          data
        );
        message.success("Blerja u përditësua me sukses");
      } else {
        await apiClient.post(API_ENDPOINTS.PURCHASES, data);
        message.success("Blerja u krijua me sukses");
      }

      setModalVisible(false);
      fetchPurchases();
      notifyDataChanged();
    } catch (error) {
      message.error("Dështoi të ruhet blerja");
    }
  };

  // Calculate summary statistics
  const totalPurchases = purchases.reduce(
    (sum, purchase) => sum + (purchase.totalPrice || 0),
    0
  );
  const todayPurchases = purchases
    .filter((purchase) =>
      dayjs.utc(purchase.purchaseDate).isSame(dayjs.utc(), "day")
    )
    .reduce((sum, purchase) => sum + (purchase.totalPrice || 0), 0);
  const thisMonthPurchases = purchases
    .filter((purchase) =>
      dayjs.utc(purchase.purchaseDate).isSame(dayjs.utc(), "month")
    )
    .reduce((sum, purchase) => sum + (purchase.totalPrice || 0), 0);
  const thisYearPurchases = purchases
    .filter((purchase) =>
      dayjs.utc(purchase.purchaseDate).isSame(dayjs.utc(), "year")
    )
    .reduce((sum, purchase) => sum + (purchase.totalPrice || 0), 0);

  const columns = [
    {
      title: "Emri i Artikullit",
      dataIndex: "itemName",
      key: "itemName",
      sorter: (a, b) => a.itemName.localeCompare(b.itemName),
    },
    {
      title: "Sasia",
      dataIndex: "quantity",
      key: "quantity",
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: "Çmimi i Njësisë",
      dataIndex: "unitPrice",
      key: "unitPrice",
      render: (price) => `${(price || 0).toFixed(2)} ден`,
      sorter: (a, b) => a.unitPrice - b.unitPrice,
    },
    {
      title: "Çmimi Total",
      dataIndex: "totalPrice",
      key: "totalPrice",
      render: (price) => <Tag color="blue">{(price || 0).toFixed(2)} ден</Tag>,
      sorter: (a, b) => a.totalPrice - b.totalPrice,
    },
    {
      title: "Data e Blerjes",
      dataIndex: "purchaseDate",
      key: "purchaseDate",
      render: (date) => dayjs(date).format("YYYY-MM-DD"),
      sorter: (a, b) =>
        dayjs(a.purchaseDate).unix() - dayjs(b.purchaseDate).unix(),
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
            title="A jeni të sigurt që dëshironi ta fshini këtë blerje?"
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
        <Title level={2}>Menaxhimi i Blerjeve</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Shto Blerje
        </Button>
      </div>

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="bg-white border-0 shadow-lg">
            <Statistic
              title="Totali i Blerjeve"
              value={totalPurchases}
              precision={2}
              valueStyle={{ color: "#fa8c16" }}
              suffix="ден"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="bg-white border-0 shadow-lg">
            <Statistic
              title="Blerjet e Sotme"
              value={todayPurchases}
              precision={2}
              valueStyle={{ color: "#52c41a" }}
              suffix="ден"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="bg-white border-0 shadow-lg">
            <Statistic
              title="Blerjet e Këtij Muaji"
              value={thisMonthPurchases}
              precision={2}
              valueStyle={{ color: "#1890ff" }}
              suffix="ден"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="bg-white border-0 shadow-lg">
            <Statistic
              title="Blerjet e Këtij Viti"
              value={thisYearPurchases}
              precision={2}
              valueStyle={{ color: "#cf1322" }}
              suffix="ден"
            />
          </Card>
        </Col>
      </Row>

      <Card className="bg-white border-0 shadow-lg">
        <Table
          columns={columns}
          dataSource={purchases}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} purchases`,
          }}
        />
      </Card>

      <Modal
        title={editingPurchase ? "Redakto Blerje" : "Shto Blerje"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="itemName"
            label="Emri i Artikullit"
            rules={[
              {
                required: true,
                message: "Ju lutemi shkruani emrin e artikullit",
              },
            ]}
          >
            <Input placeholder="Shkruani emrin e artikullit" />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="Sasia"
            rules={[{ required: true, message: "Ju lutemi shkruani sasinë" }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} placeholder="1" />
          </Form.Item>

          <Form.Item
            name="unitPrice"
            label="Çmimi i Njësisë"
            rules={[
              {
                required: true,
                message: "Ju lutemi shkruani çmimin e njësisë",
              },
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

          <Form.Item
            name="purchaseDate"
            label="Data e Blerjes"
            rules={[
              { required: true, message: "Ju lutemi zgjidhni datën e blerjes" },
            ]}
          >
            <DatePicker 
              style={{ width: "100%" }} 
              format="YYYY-MM-DD"
              placeholder="Zgjidh datën e blerjes"
            />
          </Form.Item>

          <Form.Item name="description" label="Përshkrimi">
            <TextArea rows={3} placeholder="Shkruani përshkrimin e blerjes" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                {editingPurchase ? "Përditëso" : "Krijo"}
              </Button>
              <Button onClick={() => setModalVisible(false)}>Anulo</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Purchases;
