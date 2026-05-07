import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Typography,
  Tag,
  Select,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  HistoryOutlined,
  SwapOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import apiClient, { API_ENDPOINTS } from "../config/api";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const movementKindOptions = [
  { value: "In", label: "Hyrje (stok +)" },
  { value: "Out", label: "Dalje (stok −)" },
  { value: "Adjustment", label: "Korrigjim" },
];


const STOCK_TYPES = {
  All: "All",
  Material: "Material",
  Product: "Product",
};

const stockTypeOptions = [
  { value: STOCK_TYPES.Material, label: "Material" },
  { value: STOCK_TYPES.Product, label: "Produkt" },
];

const stockPageTitles = {
  [STOCK_TYPES.Material]: "Material Stock",
  [STOCK_TYPES.Product]: "Product Stock",
};

const normalizeStockType = (value) =>
  stockTypeOptions.some((option) => option.value === value)
    ? value
    : STOCK_TYPES.Material;

const getStockTypeLabel = (value) =>
  stockTypeOptions.find((option) => option.value === value)?.label || "Material";

function Stock({ stockType = STOCK_TYPES.Material, title }) {
  const activeStockType = normalizeStockType(stockType);
  const pageTitle = title || stockPageTitles[activeStockType];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [movements, setMovements] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [itemForm] = Form.useForm();
  const [moveForm] = Form.useForm();
  const [savingItem, setSavingItem] = useState(false);
  const [savingMovement, setSavingMovement] = useState(false);
  /** Avoid stale state when submitting movement form (Modal + async batching). */
  const movementTargetItemIdRef = useRef(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(API_ENDPOINTS.STOCK_ITEMS, {
        params: { stockType: activeStockType },
      });
      const data = res.data;
      setItems(
        Array.isArray(data)
          ? data.map((row) => ({
              ...row,
              stockType: row.stockType || activeStockType,
            }))
          : []
      );
    } catch {
      message.error("Nuk u lexua stoku.");
    } finally {
      setLoading(false);
    }
  }, [activeStockType]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) => (item.stockType || activeStockType) === activeStockType
      ),
    [items, activeStockType]
  );

  const openCreateItem = () => {
    setEditingItem(null);
    itemForm.resetFields();
    itemForm.setFieldsValue({
      unit: "pcs",
      stockType: activeStockType,
      initialQuantity: 0,
    });
    setItemModalOpen(true);
  };

  const openEditItem = (record) => {
    setEditingItem(record);
    itemForm.resetFields();
    itemForm.setFieldsValue({
      name: record.name,
      sku: record.sku,
      unit: record.unit || "pcs",
      stockType: activeStockType,
      description: record.description,
      reorderLevel: record.reorderLevel,
      initialQuantity: undefined,
    });
    setItemModalOpen(true);
  };

  const onItemFormFinishFailed = ({ errorFields }) => {
    const first = errorFields?.[0]?.errors?.[0];
    message.error(first || "Plotësoni fushat e detyrueshme.");
  };

  const onItemFormFinish = async (values) => {
    setSavingItem(true);
    const { initialQuantity, ...itemValues } = values;
    const payload = { ...itemValues, stockType: activeStockType };
    try {
      if (editingItem) {
        await apiClient.put(API_ENDPOINTS.STOCK_ITEM_BY_ID(editingItem.id), payload);
        message.success("Artikulli u përditësua.");
      } else {
        const res = await apiClient.post(API_ENDPOINTS.STOCK_ITEMS, {
          ...payload,
          initialQuantity: initialQuantity == null ? 0 : initialQuantity,
        });
        message.success("Artikulli u shtua.");
        const row = res.data;
        if (row && row.id != null) {
          setItems((prev) => {
            if (prev.some((p) => p.id === row.id)) return prev;
            return [
              ...prev,
              {
                ...row,
                stockType: row.stockType || activeStockType,
                currentQuantity:
                  row.currentQuantity != null ? Number(row.currentQuantity) : 0,
              },
            ];
          });
        }
      }
      setItemModalOpen(false);
      await fetchItems();
    } catch (e) {
      const detail =
        e?.response?.data?.message ||
        e?.response?.data?.title ||
        (typeof e?.response?.data === "string" ? e.response.data : null);
      message.error(detail || "Ruajtja dështoi.");
    } finally {
      setSavingItem(false);
    }
  };

  const deleteItem = async (id) => {
    try {
      await apiClient.delete(API_ENDPOINTS.STOCK_ITEM_BY_ID(id));
      message.success("U fshi.");
      fetchItems();
    } catch {
      message.error("Fshirja dështoi.");
    }
  };

  const openMovement = (record) => {
    movementTargetItemIdRef.current = record.id;
    setSelectedItem(record);
    setMoveModalOpen(true);
    queueMicrotask(() => {
      moveForm.resetFields();
      moveForm.setFieldsValue({ movementKind: "In", quantityChange: undefined, note: "" });
    });
  };

  const onMovementFormFinishFailed = ({ errorFields }) => {
    const first = errorFields?.[0]?.errors?.[0];
    message.error(first || "Plotësoni fushat e detyrueshme.");
  };

  const onMovementFormFinish = async (values) => {
    const itemId = movementTargetItemIdRef.current ?? selectedItem?.id;
    if (!itemId) {
      message.error("Mungon artikulli. Mbyllni modalin dhe provoni përsëri.");
      return;
    }
    const raw = values.quantityChange;
    if (raw == null || raw === "") {
      message.error("Shkruani sasinë.");
      return;
    }
    let q = Number(raw);
    if (!Number.isFinite(q) || q === 0) {
      message.error("Sasia duhet të jetë një numër dhe jo zero.");
      return;
    }

    if (values.movementKind === "Out") q = -Math.abs(q);
    else if (values.movementKind === "In") q = Math.abs(q);

    setSavingMovement(true);
    try {
      await apiClient.post(
        API_ENDPOINTS.STOCK_ITEM_MOVEMENTS(itemId),
        {
          quantityChange: q,
          movementKind: values.movementKind,
          note: values.note,
        }
      );
      message.success("Lëvizja u regjistrua.");
      movementTargetItemIdRef.current = null;
      setMoveModalOpen(false);
      await fetchItems();
    } catch (e) {
      const data = e?.response?.data;
      const msg =
        (typeof data?.message === "string" && data.message) ||
        (typeof data === "string" ? data : null);
      message.error(msg || "Lëvizja dështoi (kontrollo stokun).");
    } finally {
      setSavingMovement(false);
    }
  };

  const openHistory = async (record) => {
    setSelectedItem(record);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    setMovements([]);
    try {
      const res = await apiClient.get(
        API_ENDPOINTS.STOCK_ITEM_MOVEMENTS(record.id)
      );
      setMovements(res.data || []);
    } catch {
      message.error("Nuk u lexua historia.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const columns = [
    { title: "Emri", dataIndex: "name", key: "name" },
    { title: "SKU", dataIndex: "sku", key: "sku", render: (t) => t || "—" },
    {
      title: "Tipi",
      dataIndex: "stockType",
      key: "stockType",
      width: 110,
      render: (value) => {
        const type = value || STOCK_TYPES.Material;
        return (
          <Tag color={type === STOCK_TYPES.Product ? "volcano" : "blue"}>
            {getStockTypeLabel(type)}
          </Tag>
        );
      },
    },
    { title: "Njësia", dataIndex: "unit", key: "unit", width: 90 },
    {
      title: "Sasia",
      dataIndex: "currentQuantity",
      key: "qty",
      width: 110,
      render: (q, row) => {
        const low =
          row.reorderLevel != null &&
          Number(q) <= Number(row.reorderLevel);
        return (
          <Tag color={low ? "orange" : "green"}>{Number(q).toFixed(2)}</Tag>
        );
      },
    },
    {
      title: "Alarm",
      dataIndex: "reorderLevel",
      key: "reorderLevel",
      width: 100,
      render: (v) => (v != null ? Number(v).toFixed(2) : "—"),
    },
    {
      title: "Veprime",
      key: "actions",
      width: 280,
      render: (_, record) => (
        <Space size="small" wrap>
          <Button
            size="small"
            icon={<SwapOutlined />}
            onClick={() => openMovement(record)}
          >
            Lëvizje
          </Button>
          <Button
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => openHistory(record)}
          >
            Histori
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditItem(record)}
          />
          <Popconfirm
            title="Fshi artikullin dhe historinë?"
            onConfirm={() => deleteItem(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          {pageTitle}
        </Title>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateItem}>
            Artikull i ri
          </Button>
        </Space>
      </div>
      <Text type="secondary">
        Sasia llogaritet nga shuma e të gjitha lëvizjeve (hyrje +, dalje −).
        Për dalje përdorni vlera negative ose zgjidhni llojin dhe shkruani
        sasinë me shenjë.
      </Text>
      <Table
        style={{ marginTop: 16 }}
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={visibleItems}
        pagination={{ pageSize: 15, showTotal: (t) => `${t} artikuj` }}
      />

      <Modal
        title={editingItem ? "Ndrysho artikullin" : "Artikull i ri"}
        open={itemModalOpen}
        onCancel={() => setItemModalOpen(false)}
        destroyOnClose={false}
        footer={null}
        forceRender
      >
        <Form
          form={itemForm}
          layout="vertical"
          onFinish={onItemFormFinish}
          onFinishFailed={onItemFormFinishFailed}
        >
          <Form.Item
            name="name"
            label="Emri"
            rules={[{ required: true, message: "Shkruani emrin" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="sku" label="SKU (opsionale)">
            <Input />
          </Form.Item>
          <Form.Item name="unit" label="Njësia">
            <Input placeholder="pcs, m2, kg..." />
          </Form.Item>
          <Form.Item name="stockType" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Përshkrimi">
            <Input.TextArea rows={2} />
          </Form.Item>
          {!editingItem && (
            <Form.Item
              name="initialQuantity"
              label="Sasia fillestare"
              rules={[
                {
                  type: "number",
                  min: 0,
                  message: "Sasia fillestare nuk mund te jete negative.",
                },
              ]}
            >
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          )}
          <Form.Item name="reorderLevel" label="Nivel alarmi (sasi minimale)">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button type="default" htmlType="button" onClick={() => setItemModalOpen(false)}>
                Anulo
              </Button>
              <Button
                type="primary"
                htmlType="button"
                loading={savingItem}
                onClick={() => itemForm.submit()}
              >
                Ruaj
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={selectedItem ? `Lëvizje: ${selectedItem.name}` : "Lëvizje"}
        open={moveModalOpen}
        onCancel={() => setMoveModalOpen(false)}
        destroyOnClose={false}
        footer={null}
      >
        <Form
          form={moveForm}
          layout="vertical"
          initialValues={{ movementKind: "In" }}
          onFinish={onMovementFormFinish}
          onFinishFailed={onMovementFormFinishFailed}
        >
          <Form.Item
            name="movementKind"
            label="Lloji"
            rules={[{ required: true, message: "Zgjidhni llojin" }]}
          >
            <Select options={movementKindOptions} />
          </Form.Item>
          <Form.Item
            name="quantityChange"
            label="Sasia (numër pozitiv për Hyrje/Dalje; Korrigjim lejon + ose −)"
            rules={[{ required: true, message: "Shkruani sasinë" }]}
          >
            <InputNumber style={{ width: "100%" }} step={0.01} />
          </Form.Item>
          <Form.Item name="note" label="Shënim">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button type="default" htmlType="button" onClick={() => setMoveModalOpen(false)}>
                Anulo
              </Button>
              <Button
                type="primary"
                htmlType="button"
                loading={savingMovement}
                onClick={() => moveForm.submit()}
              >
                Ruaj
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={selectedItem ? `Histori: ${selectedItem.name}` : "Histori"}
        open={historyModalOpen}
        onCancel={() => setHistoryModalOpen(false)}
        footer={null}
        width={720}
      >
        <Table
          size="small"
          loading={historyLoading}
          rowKey="id"
          dataSource={movements}
          pagination={false}
          columns={[
            {
              title: "Data",
              dataIndex: "occurredAt",
              render: (d) => dayjs(d).format("YYYY-MM-DD HH:mm"),
            },
            {
              title: "Ndryshimi",
              dataIndex: "quantityChange",
              render: (v) => (
                <Tag color={Number(v) >= 0 ? "green" : "red"}>
                  {Number(v).toFixed(2)}
                </Tag>
              ),
            },
            { title: "Lloji", dataIndex: "movementKind", render: (t) => t || "—" },
            { title: "Shënim", dataIndex: "note", ellipsis: true },
          ]}
        />
      </Modal>
    </div>
  );
}

export default Stock;
