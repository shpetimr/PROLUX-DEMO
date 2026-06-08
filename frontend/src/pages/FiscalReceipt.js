import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  AutoComplete,
  Button,
  Card,
  Col,
  Input,
  Row,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  PrinterOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import FiscalReceiptPreview, {
  closeFiscalReceiptPrintWindow,
  openFiscalReceiptPrintWindow,
  writeFiscalReceiptPrintWindow,
} from "../components/FiscalReceiptPreview";
import apiClient, { API_ENDPOINTS } from "../config/api";
import {
  FISCAL_RECEIPT_PAPER_WIDTHS,
  FISCAL_RECEIPT_ROW_COUNT,
  calculateFiscalLineTotal,
  createFiscalClientRequestId,
  formatFiscalLineTotal,
  getFiscalLineTotal,
  hasFiscalReceiptLine,
  normalizeFiscalReceiptForPreview,
  parseFiscalNumberInput,
  readProperty,
  readText,
  textValue,
} from "../utils/fiscalReceipt";

const { TextArea } = Input;
const { Text, Title } = Typography;

const PAGE_STYLES = `
  .fiscal-receipt-workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(270px, 360px);
    gap: 20px;
    align-items: start;
  }

  .fiscal-receipt-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  .fiscal-receipt-card .ant-card-body,
  .fiscal-receipt-preview-card .ant-card-body {
    padding: 16px;
  }

  .fiscal-receipt-preview-card {
    position: sticky;
    top: 84px;
  }

  .fiscal-receipt-table .ant-table-thead > tr > th,
  .fiscal-receipt-table .ant-table-tbody > tr > td {
    padding: 8px !important;
  }

  .fiscal-receipt-line-total {
    display: block;
    min-width: 88px;
    text-align: right;
    font-weight: 700;
  }

  .fiscal-receipt-total-panel {
    display: flex;
    justify-content: flex-end;
    margin-top: 14px;
  }

  .fiscal-receipt-total-box {
    width: min(100%, 320px);
    padding: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #f9fafb;
  }

  .fiscal-receipt-total-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .fiscal-receipt-total-row + .fiscal-receipt-total-row {
    margin-top: 8px;
  }

  .fiscal-receipt-total-row strong {
    font-size: 18px;
  }

  @media (max-width: 1100px) {
    .fiscal-receipt-workspace {
      grid-template-columns: 1fr;
    }

    .fiscal-receipt-preview-card {
      position: static;
    }
  }

  @media (max-width: 767px) {
    .fiscal-receipt-actions,
    .fiscal-receipt-actions .ant-space-item,
    .fiscal-receipt-actions .ant-btn,
    .fiscal-receipt-actions .ant-segmented {
      width: 100%;
    }

    .fiscal-receipt-actions .ant-space-item:last-child {
      width: 100%;
    }
  }
`;

const LABELS = {
  title: "Let\u00EBr Fiskale",
  customer: "Klienti",
  customerPlaceholder: "Emri i klientit (opsionale)",
  phone: "Telefoni",
  phonePlaceholder: "Telefoni (opsionale)",
  receiptNumber: "Nr. letre",
  receiptPending: "Gjenerohet nga backend",
  notes: "Sh\u00EBnim",
  notesPlaceholder: "Sh\u00EBnim opsional",
  items: "Artikujt",
  addRow: "Shto rresht",
  newReceipt: "E re",
  print: "Printo",
  paperWidth: "Letra",
  preview: "Pamja termale",
  subtotal: "N\u00EBntotali",
  total: "Totali",
  columns: {
    item: "Artikulli",
    quantity: "Sasia",
    unit: "Nj\u00EBsia",
    price: "\u00C7mimi",
    total: "Totali",
    actions: "",
  },
  noItems: "Shtoni t\u00EB pakt\u00EBn nj\u00EB artikull.",
  missingName: (rowNumber) => `Shkruani artikullin n\u00EB rreshtin ${rowNumber}.`,
  missingQuantity: (rowNumber) =>
    `Sasia duhet t\u00EB jet\u00EB m\u00EB e madhe se zero n\u00EB rreshtin ${rowNumber}.`,
  missingPrice: (rowNumber) =>
    `Shkruani \u00E7mimin e shitjes n\u00EB rreshtin ${rowNumber}.`,
  stockSuggestionsFailed:
    "Sugjerimet e stokut nuk mund t\u00EB ngarkoheshin. Vendosja manuale funksionon ende.",
  popupBlocked: "Dritarja e printimit u bllokua nga shfletuesi.",
  printSuccess: "Letra fiskale u arkivua dhe u hap p\u00EBr printim.",
  printFailed: "Letra fiskale nuk u printua.",
  stockDeducted: (details) => `Stoku u zbrit: ${details}`,
  stockAlreadyDeducted:
    "Stoku \u00EBsht\u00EB zbritur tashm\u00EB p\u00EBr k\u00EBt\u00EB let\u00EBr fiskale.",
};

const createRowKey = () =>
  `fiscal-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyRow = () => ({
  key: createRowKey(),
  item: "",
  name: "",
  quantity: "",
  unit: "pcs",
  stockItemId: null,
  stockSku: "",
  stockType: "",
  stockUnit: "pcs",
  sellPrice: "",
  lineTotal: "",
});

const createEmptyRows = () =>
  Array.from({ length: FISCAL_RECEIPT_ROW_COUNT }, createEmptyRow);

const formatStockPriceInput = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? String(amount) : String(value);
};

const normalizeStockItem = (item) => {
  const id = readProperty(item, ["id"]);
  const name = readText(item, ["name"]).trim();

  return {
    id,
    name,
    sku: readText(item, ["sku"]).trim(),
    unit: readText(item, ["unit"], "pcs").trim() || "pcs",
    stockType: readText(item, ["stockType"]).trim(),
    sellPrice: readProperty(item, ["sellPrice"]),
    currentQuantity: readProperty(item, ["currentQuantity"]),
  };
};

const stockMatchesSearch = (item, searchValue) => {
  const needle = textValue(searchValue).trim().toLowerCase();
  if (!needle) {
    return true;
  }

  return (
    item.name.toLowerCase().includes(needle) ||
    item.sku.toLowerCase().includes(needle)
  );
};

const buildVisibleReceiptRows = (rows) =>
  rows.filter(hasFiscalReceiptLine).map((row, index) => ({
    ...row,
    item: String(index + 1),
    lineTotal: formatFiscalLineTotal(row) || textValue(row.lineTotal),
  }));

function FiscalReceipt() {
  const [rows, setRows] = useState(createEmptyRows);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [printedAt, setPrintedAt] = useState(null);
  const [paperWidth, setPaperWidth] = useState(FISCAL_RECEIPT_PAPER_WIDTHS.Eighty);
  const [stockItems, setStockItems] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [issuedArchive, setIssuedArchive] = useState(null);
  const clientRequestIdRef = useRef(createFiscalClientRequestId());
  const issuedArchiveRef = useRef(null);
  const printInProgressRef = useRef(false);

  const visibleRows = useMemo(() => buildVisibleReceiptRows(rows), [rows]);
  const subtotal = useMemo(
    () => visibleRows.reduce((sum, row) => sum + getFiscalLineTotal(row), 0),
    [visibleRows]
  );

  const previewProps = useMemo(
    () => ({
      receiptNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      dateTime: printedAt || new Date(),
      rows: visibleRows,
      subtotal,
      total: subtotal,
      notes: notes.trim(),
      paperWidth,
    }),
    [customerName, customerPhone, notes, paperWidth, printedAt, receiptNumber, subtotal, visibleRows]
  );

  const markDraftEdited = useCallback(() => {
    if (!issuedArchiveRef.current) {
      return;
    }

    issuedArchiveRef.current = null;
    clientRequestIdRef.current = createFiscalClientRequestId();
    setIssuedArchive(null);
    setReceiptNumber("");
    setPrintedAt(null);
  }, []);

  const fetchStockItems = useCallback(async () => {
    setLoadingStock(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.STOCK_ITEMS);
      const items = Array.isArray(response.data)
        ? response.data.map(normalizeStockItem).filter((item) => item.name)
        : [];
      setStockItems(items);
    } catch {
      setStockItems([]);
      message.warning(LABELS.stockSuggestionsFailed);
    } finally {
      setLoadingStock(false);
    }
  }, []);

  useEffect(() => {
    fetchStockItems();
  }, [fetchStockItems]);

  const getStockOptions = useCallback(
    (searchValue) =>
      stockItems
        .filter((item) => stockMatchesSearch(item, searchValue))
        .slice(0, 20)
        .map((item) => {
          const price = formatStockPriceInput(item.sellPrice);
          const stockQuantity =
            item.currentQuantity === null || item.currentQuantity === undefined
              ? ""
              : `${Number(item.currentQuantity).toFixed(2)} ${item.unit}`;
          const details = [item.stockType, stockQuantity, price ? `${price} MKD` : ""]
            .filter(Boolean)
            .join(" - ");

          return {
            key: String(item.id ?? item.name),
            value: item.name,
            stockItem: item,
            label: (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span>
                  {item.name}
                  {item.sku ? ` (${item.sku})` : ""}
                </span>
                {details ? (
                  <span style={{ color: "#666", whiteSpace: "nowrap" }}>
                    {details}
                  </span>
                ) : null}
              </div>
            ),
          };
        }),
    [stockItems]
  );

  const handleRowChange = (idx, field, value) => {
    markDraftEdited();
    setRows((prev) => {
      const updated = [...prev];
      let row = { ...updated[idx], [field]: value };

      if (field === "name") {
        row.stockItemId = null;
        row.stockSku = "";
        row.stockType = "";
      }

      if (field === "unit") {
        row.stockUnit = value;
      }

      if (field === "quantity" || field === "sellPrice") {
        row.lineTotal = formatFiscalLineTotal(row);
      }

      updated[idx] = row;
      return updated;
    });
  };

  const handleStockItemSelect = (idx, selectedItem) => {
    if (!selectedItem) {
      return;
    }

    markDraftEdited();
    setRows((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        name: selectedItem.name,
        stockItemId: selectedItem.id ?? null,
        stockSku: selectedItem.sku,
        stockType: selectedItem.stockType,
        unit: selectedItem.unit || "pcs",
        stockUnit: selectedItem.unit || "pcs",
        sellPrice: formatStockPriceInput(selectedItem.sellPrice),
      };
      updated[idx].lineTotal = formatFiscalLineTotal(updated[idx]);
      return updated;
    });
  };

  const addRow = () => {
    markDraftEdited();
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (rowKey) => {
    markDraftEdited();
    setRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((row) => row.key !== rowKey)
    );
  };

  const resetReceipt = () => {
    issuedArchiveRef.current = null;
    clientRequestIdRef.current = createFiscalClientRequestId();
    setRows(createEmptyRows());
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setReceiptNumber("");
    setPrintedAt(null);
    setIssuedArchive(null);
  };

  const validateReceiptRows = () => {
    if (visibleRows.length === 0) {
      message.warning(LABELS.noItems);
      return false;
    }

    for (const [index, row] of visibleRows.entries()) {
      if (!textValue(row.name).trim()) {
        message.warning(LABELS.missingName(index + 1));
        return false;
      }

      const quantity = parseFiscalNumberInput(row.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        message.warning(LABELS.missingQuantity(index + 1));
        return false;
      }

      const price = parseFiscalNumberInput(row.sellPrice);
      if (!Number.isFinite(price) || price < 0) {
        message.warning(LABELS.missingPrice(index + 1));
        return false;
      }
    }

    return true;
  };

  const buildPayload = () => {
    const now = new Date().toISOString();
    const items = visibleRows.map((row, index) => {
      const lineTotal = calculateFiscalLineTotal(row) ?? getFiscalLineTotal(row);
      return {
        item: String(index + 1),
        name: textValue(row.name).trim(),
        quantity: textValue(row.quantity).trim(),
        qty: textValue(row.quantity).trim(),
        m2pcs: textValue(row.quantity).trim(),
        unit: textValue(row.unit || row.stockUnit || "pcs").trim(),
        stockItemId: row.stockItemId ?? null,
        stockSku: textValue(row.stockSku).trim(),
        stockType: textValue(row.stockType).trim(),
        stockUnit: textValue(row.stockUnit || row.unit || "pcs").trim(),
        sellPrice: textValue(row.sellPrice).trim(),
        price: textValue(row.sellPrice).trim(),
        lineTotal: lineTotal.toFixed(2),
        total: lineTotal.toFixed(2),
      };
    });

    return {
      receiptNumber: receiptNumber.trim(),
      clientRequestId: clientRequestIdRef.current,
      customerName: customerName.trim() || null,
      customerPhone: customerPhone.trim() || null,
      itemsJson: JSON.stringify({
        date: now,
        paperWidth,
        items,
        totals: {
          subtotal,
          total: subtotal,
        },
        notes: notes.trim(),
      }),
      subtotal,
      total: subtotal,
      notes: notes.trim() || null,
    };
  };

  const showStockDeductionFeedback = (stockDeduction) => {
    if (!stockDeduction) {
      return;
    }

    const applied = stockDeduction.applied || stockDeduction.Applied || [];
    const skipped = stockDeduction.skipped || stockDeduction.Skipped || [];
    const alreadyApplied =
      stockDeduction.alreadyApplied || stockDeduction.AlreadyApplied;

    if (alreadyApplied) {
      message.info(
        stockDeduction.message ||
          stockDeduction.Message ||
          LABELS.stockAlreadyDeducted
      );
    } else if (applied.length > 0) {
      message.success(
        LABELS.stockDeducted(
          applied
            .map(
              (item) =>
                `${item.stockItemName || item.StockItemName} (-${
                  item.quantityDeducted ?? item.QuantityDeducted
                })`
            )
            .join(", ")
        )
      );
    }

    if (skipped.length > 0) {
      message.warning(skipped.slice(0, 5).join(" - "));
    }
  };

  const handlePrint = async () => {
    if (printInProgressRef.current || !validateReceiptRows()) {
      return;
    }

    const printWindow = openFiscalReceiptPrintWindow(paperWidth);
    if (!printWindow) {
      message.error(LABELS.popupBlocked);
      return;
    }

    printInProgressRef.current = true;
    setPrintLoading(true);

    try {
      const payload = buildPayload();
      const response = await apiClient.post(
        API_ENDPOINTS.FISCAL_RECEIPTS_PRINT,
        payload
      );
      const archive = response.data || {};
      const printProps = normalizeFiscalReceiptForPreview(archive, {
        fallbackRows: visibleRows,
        paperWidth,
      });

      issuedArchiveRef.current = archive;
      flushSync(() => {
        setIssuedArchive(archive);
        setReceiptNumber(printProps.receiptNumber);
        setPrintedAt(printProps.dateTime);
      });

      showStockDeductionFeedback(
        archive.stockDeduction || archive.StockDeduction || null
      );

      const rendered = writeFiscalReceiptPrintWindow(printWindow, printProps, {
        title: printProps.receiptNumber
          ? `Let\u00EBr Fiskale ${printProps.receiptNumber}`
          : LABELS.title,
        onPrintTriggered: () => {
          printInProgressRef.current = false;
        },
      });

      if (!rendered) {
        printInProgressRef.current = false;
        message.error(LABELS.popupBlocked);
        return;
      }

      message.success(LABELS.printSuccess);
    } catch (error) {
      closeFiscalReceiptPrintWindow(printWindow);
      printInProgressRef.current = false;
      const detail =
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        (typeof error?.response?.data === "string" ? error.response.data : null);
      message.error(detail || LABELS.printFailed);
    } finally {
      setPrintLoading(false);
    }
  };

  const columns = [
    {
      title: LABELS.columns.item,
      dataIndex: "name",
      key: "name",
      width: 260,
      render: (_value, row, idx) => (
        <AutoComplete
          value={textValue(row.name)}
          options={getStockOptions(row.name)}
          onChange={(value) => handleRowChange(idx, "name", value)}
          onSelect={(_value, option) =>
            handleStockItemSelect(idx, option?.stockItem)
          }
          filterOption={false}
          style={{ width: "100%" }}
          popupMatchSelectWidth={360}
        >
          <Input placeholder="Emri ose SKU" />
        </AutoComplete>
      ),
    },
    {
      title: LABELS.columns.quantity,
      dataIndex: "quantity",
      key: "quantity",
      width: 110,
      render: (_value, row, idx) => (
        <Input
          value={textValue(row.quantity)}
          onChange={(event) =>
            handleRowChange(idx, "quantity", event.target.value)
          }
          inputMode="decimal"
        />
      ),
    },
    {
      title: LABELS.columns.unit,
      dataIndex: "unit",
      key: "unit",
      width: 100,
      render: (_value, row, idx) => (
        <Input
          value={textValue(row.unit)}
          onChange={(event) => handleRowChange(idx, "unit", event.target.value)}
        />
      ),
    },
    {
      title: LABELS.columns.price,
      dataIndex: "sellPrice",
      key: "sellPrice",
      width: 130,
      render: (_value, row, idx) => (
        <Input
          value={textValue(row.sellPrice)}
          onChange={(event) =>
            handleRowChange(idx, "sellPrice", event.target.value)
          }
          inputMode="decimal"
          suffix="MKD"
        />
      ),
    },
    {
      title: LABELS.columns.total,
      dataIndex: "lineTotal",
      key: "lineTotal",
      width: 120,
      align: "right",
      render: (_value, row) => (
        <span className="fiscal-receipt-line-total">
          {hasFiscalReceiptLine(row)
            ? `${getFiscalLineTotal(row).toFixed(2)} MKD`
            : ""}
        </span>
      ),
    },
    {
      title: LABELS.columns.actions,
      key: "actions",
      width: 58,
      render: (_, row) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          disabled={rows.length <= 1}
          onClick={() => removeRow(row.key)}
          aria-label="Fshi rreshtin"
        />
      ),
    },
  ];

  return (
    <div>
      <style>{PAGE_STYLES}</style>
      <div
        className="responsive-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Space align="center" size={12}>
          <PrinterOutlined className="text-2xl text-blue-600" />
          <Title level={2} style={{ margin: 0 }}>
            {LABELS.title}
          </Title>
          {issuedArchive ? <Tag color="green">Arkivuar</Tag> : null}
        </Space>
        <Space wrap className="fiscal-receipt-actions">
          <Segmented
            aria-label={LABELS.paperWidth}
            value={paperWidth}
            options={[
              { label: "80mm", value: FISCAL_RECEIPT_PAPER_WIDTHS.Eighty },
              { label: "58mm", value: FISCAL_RECEIPT_PAPER_WIDTHS.FiftyEight },
            ]}
            onChange={setPaperWidth}
          />
          <Button icon={<ReloadOutlined />} onClick={resetReceipt}>
            {LABELS.newReceipt}
          </Button>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            loading={printLoading}
          >
            {LABELS.print}
          </Button>
        </Space>
      </div>

      <div className="fiscal-receipt-workspace">
        <div className="fiscal-receipt-stack">
          <Card className="fiscal-receipt-card" title={LABELS.customer}>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={10}>
                <Text>{LABELS.customer}</Text>
                <Input
                  value={customerName}
                  onChange={(event) => {
                    markDraftEdited();
                    setCustomerName(event.target.value);
                  }}
                  placeholder={LABELS.customerPlaceholder}
                />
              </Col>
              <Col xs={24} md={8}>
                <Text>{LABELS.phone}</Text>
                <Input
                  value={customerPhone}
                  onChange={(event) => {
                    markDraftEdited();
                    setCustomerPhone(event.target.value);
                  }}
                  placeholder={LABELS.phonePlaceholder}
                />
              </Col>
              <Col xs={24} md={6}>
                <Text>{LABELS.receiptNumber}</Text>
                <Input
                  value={receiptNumber || LABELS.receiptPending}
                  readOnly
                />
              </Col>
              <Col xs={24}>
                <Text>{LABELS.notes}</Text>
                <TextArea
                  rows={2}
                  value={notes}
                  onChange={(event) => {
                    markDraftEdited();
                    setNotes(event.target.value);
                  }}
                  placeholder={LABELS.notesPlaceholder}
                />
              </Col>
            </Row>
          </Card>

          <Card
            className="fiscal-receipt-card"
            title={LABELS.items}
            extra={
              <Space wrap>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchStockItems}
                  loading={loadingStock}
                >
                  Stoku
                </Button>
                <Button icon={<PlusOutlined />} onClick={addRow}>
                  {LABELS.addRow}
                </Button>
              </Space>
            }
          >
            <Table
              rowKey="key"
              columns={columns}
              dataSource={rows}
              pagination={false}
              size="small"
              scroll={{ x: 820 }}
              className="fiscal-receipt-table"
            />

            <div className="fiscal-receipt-total-panel">
              <div className="fiscal-receipt-total-box">
                <div className="fiscal-receipt-total-row">
                  <span>{LABELS.subtotal}</span>
                  <strong>{subtotal.toFixed(2)} MKD</strong>
                </div>
                <div className="fiscal-receipt-total-row">
                  <span>{LABELS.total}</span>
                  <strong>{subtotal.toFixed(2)} MKD</strong>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="fiscal-receipt-preview-card" title={LABELS.preview}>
          <FiscalReceiptPreview {...previewProps} />
        </Card>
      </div>
    </div>
  );
}

export default FiscalReceipt;
