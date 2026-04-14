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
} from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Option } = Select;

const EmployeeTable = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form] = Form.useForm();

  const API_BASE = "https://localhost:7001/api/employees";

  // Fetch employees
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_BASE);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      } else {
        message.error("Failed to fetch employees");
      }
    } catch (error) {
      message.error("Error fetching employees: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Create or Update employee
  const handleSubmit = async (values) => {
    try {
      const employeeData = {
        fullName: values.fullName,
        position: values.position,
        hireDate: values.hireDate.toISOString(),
        baseSalary: values.baseSalary,
        daysWorkedThisMonth: values.daysWorkedThisMonth || 0,
        bonuses: values.bonuses || 0,
        penalties: values.penalties || 0,
      };

      const url = editingEmployee
        ? `${API_BASE}/${editingEmployee.id}`
        : API_BASE;
      const method = editingEmployee ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(employeeData),
      });

      if (response.ok) {
        message.success(
          editingEmployee
            ? "Employee updated successfully"
            : "Employee created successfully"
        );
        setModalVisible(false);
        form.resetFields();
        setEditingEmployee(null);
        fetchEmployees();
      } else {
        const errorData = await response.json();
        message.error("Error: " + JSON.stringify(errorData));
      }
    } catch (error) {
      message.error("Error: " + error.message);
    }
  };

  // Delete employee
  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        message.success("Employee deleted successfully");
        fetchEmployees();
      } else {
        message.error("Failed to delete employee");
      }
    } catch (error) {
      message.error("Error deleting employee: " + error.message);
    }
  };

  // Edit employee
  const handleEdit = (record) => {
    setEditingEmployee(record);
    form.setFieldsValue({
      fullName: record.fullName,
      position: record.position,
      hireDate: dayjs(record.hireDate),
      baseSalary: record.baseSalary,
      daysWorkedThisMonth: record.daysWorkedThisMonth,
      bonuses: record.bonuses,
      penalties: record.penalties,
    });
    setModalVisible(true);
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
      title: "Emri i Plotë",
      dataIndex: "fullName",
      key: "fullName",
      sorter: (a, b) => a.fullName.localeCompare(b.fullName),
    },
    {
      title: "Pozita",
      dataIndex: "position",
      key: "position",
      filters: [
        { text: "Warehouse", value: "Warehouse" },
        { text: "Field", value: "Field" },
      ],
      onFilter: (value, record) => record.position === value,
    },
    {
      title: "Data e Punësimit",
      dataIndex: "hireDate",
      key: "hireDate",
      render: (date) => dayjs(date).format("DD/MM/YYYY"),
      sorter: (a, b) => new Date(a.hireDate) - new Date(b.hireDate),
    },
    {
      title: "Paga Bazë",
      dataIndex: "baseSalary",
      key: "baseSalary",
      render: (salary) => `${salary.toLocaleString("mk-MK")} MKD`,
      sorter: (a, b) => a.baseSalary - b.baseSalary,
    },
    {
      title: "Ditët e Numëruara",
      dataIndex: "daysWorkedThisMonth",
      key: "daysWorkedThisMonth",
      render: (days) => `${days} ditë`,
      sorter: (a, b) => a.daysWorkedThisMonth - b.daysWorkedThisMonth,
    },
    {
      title: "Bonuset",
      dataIndex: "bonuses",
      key: "bonuses",
      render: (bonus) => `${bonus.toLocaleString("mk-MK")} MKD`,
      sorter: (a, b) => a.bonuses - b.bonuses,
    },
    {
      title: "Gjobat",
      dataIndex: "penalties",
      key: "penalties",
      render: (penalty) => `${penalty.toLocaleString("mk-MK")} MKD`,
      sorter: (a, b) => a.penalties - b.penalties,
    },

    {
      title: "Veprime",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Menaxhimi i Punëtorëve</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingEmployee(null);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          Shto Punëtor
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={employees}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} items`,
        }}
        scroll={{ x: 1200 }}
      />

      <Modal
        title={editingEmployee ? "Edit Punëtor" : "Shto Punëtor të Ri"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingEmployee(null);
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
            daysWorkedThisMonth: 0,
            bonuses: 0,
            penalties: 0,
          }}
        >
          <Form.Item
            name="fullName"
            label="Emri i Plotë"
            rules={[
              { required: true, message: "Ju lutem shkruani emrin e plotë!" },
            ]}
          >
            <Input placeholder="Shkruani emrin e plotë" />
          </Form.Item>

          <Form.Item
            name="position"
            label="Pozita"
            rules={[{ required: true, message: "Ju lutem zgjidhni pozitën!" }]}
          >
            <Select placeholder="Zgjidhni pozitën">
              <Option value="Warehouse">Warehouse</Option>
              <Option value="Field">Field</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="hireDate"
            label="Data e Punësimit"
            rules={[
              {
                required: true,
                message: "Ju lutem zgjidhni datën e punësimit!",
              },
            ]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="baseSalary"
            label="Paga Bazë"
            rules={[
              { required: true, message: "Ju lutem shkruani pagën bazë!" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="Shkruani pagën bazë në MKD"
              min={0}
              step={0.01}
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/\s?|(,*)/g, "")}
            />
          </Form.Item>

          <Form.Item name="daysWorkedThisMonth" label="Ditët e Numëruara">
            <InputNumber
              style={{ width: "100%" }}
              placeholder="Numri i ditëve të punuara"
              min={0}
              max={31}
              step={1}
            />
          </Form.Item>

          <Form.Item name="bonuses" label="Bonuset">
            <InputNumber
              style={{ width: "100%" }}
              placeholder="Shkruani bonuset në MKD"
              min={0}
              step={0.01}
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/\s?|(,*)/g, "")}
            />
          </Form.Item>

          <Form.Item name="penalties" label="Gjobat">
            <InputNumber
              style={{ width: "100%" }}
              placeholder="Shkruani gjobat në MKD"
              min={0}
              step={0.01}
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value.replace(/\s?|(,*)/g, "")}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingEmployee ? "Përditëso" : "Shto"}
              </Button>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingEmployee(null);
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

export default EmployeeTable;
