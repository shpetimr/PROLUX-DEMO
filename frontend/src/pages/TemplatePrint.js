import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AutoComplete,
  Button,
  Table,
  Input,
  Card,
  Typography,
  Space,
  Row,
  Col,
  Select,
  message,
} from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import { useLocation } from "react-router-dom";
import { computeInvoiceTotals } from "../utils/invoiceTotals";
import apiClient, { API_ENDPOINTS } from "../config/api";

const { Title, Text } = Typography;

const INVOICE_LANGUAGES = {
  Albanian: "Albanian",
  Macedonian: "Macedonian",
};

const LANGUAGE_OPTIONS = [
  { value: INVOICE_LANGUAGES.Albanian, label: "Albanian" },
  { value: INVOICE_LANGUAGES.Macedonian, label: "Macedonian" },
];

const TEXT = {
  Albanian: {
    print: "Print",
    saveArchive: "Ruaj n\u00EB arkiv",
    language: "Gjuha",
    title: "INVOICE / FLET\u00CBFATUR\u00CB",
    customerPlaceholder: "Customer Name",
    datePlaceholder: "Date",
    invoicePlaceholder: "Invoice No.",
    description: "Description",
    discount: "Zbritja (%)",
    advance: "Avans / Parapagim (MKD)",
    subtotal: "N\u00EBntotali (shuma e rreshtave)",
    discountRow: (percent) => `Zbritja (${percent}%)`,
    totalAfterDiscount: "Total pas zbritjes",
    advanceRow: "Avans i klientit",
    balanceDue: "P\u00EBr t\u00EB paguar",
    currency: "MKD",
    footer: "For any further information you can contact us:",
    columns: {
      item: "ITEM",
      name: "Name",
      materials: "Materials",
      quantity: "m2/pcs",
      price: "Price",
      total: "Total",
    },
    archiveRequired: "Plot\u00EBsoni klientin dhe numrin e fatur\u00EBs para arkivimit.",
    archiveSaved: "Fatura u ruajt n\u00EB arkiv.",
    archiveFailed: "Fatura nuk u ruajt n\u00EB arkiv.",
    popupBlocked: "Dritarja e printimit u bllokua nga shfletuesi.",
    stockInfo:
      "Zbrit nga stoku para printimit: emri n\u00EB rresht duhet t\u00EB p\u00EBrputhet me emrin ose SKU t\u00EB artikullit n\u00EB stok; sasia merret nga m2/pcs. N\u00EBse stoku nuk mjafton, printimi anulohet. Riprintimi i s\u00EB nj\u00EBjt\u00EBs fatur\u00EB nuk zbrit stok p\u00EBrs\u00EBri.",
    stockDeducted: (details) => `Stoku u zbrit: ${details}`,
    stockAlreadyDeducted: "Stoku \u00EBsht\u00EB zbritur tashm\u00EB p\u00EBr k\u00EBt\u00EB fatur\u00EB.",
    noStockRows: "Nuk u gjet asnj\u00EB rresht q\u00EB p\u00EBrputhet me stokun.",
    stockFailed: "Zbritja nga stoku d\u00EBshtoi. Printimi u anulua.",
  },
  Macedonian: {
    print: "\u041F\u0435\u0447\u0430\u0442\u0438",
    saveArchive: "\u0417\u0430\u0447\u0443\u0432\u0430\u0458 \u0432\u043E \u0430\u0440\u0445\u0438\u0432\u0430",
    language: "\u0408\u0430\u0437\u0438\u043A",
    title: "\u0424\u0410\u041A\u0422\u0423\u0420\u0410",
    customerPlaceholder: "\u0418\u043C\u0435 \u043D\u0430 \u043A\u043B\u0438\u0435\u043D\u0442",
    datePlaceholder: "\u0414\u0430\u0442\u0443\u043C",
    invoicePlaceholder: "\u0411\u0440. \u0444\u0430\u043A\u0442\u0443\u0440\u0430",
    description: "\u041E\u043F\u0438\u0441",
    discount: "\u041F\u043E\u043F\u0443\u0441\u0442 (%)",
    advance: "\u0410\u0432\u0430\u043D\u0441 / \u043F\u0440\u0435\u0442\u043F\u043B\u0430\u0442\u0430 (MKD)",
    subtotal:
      "\u041C\u0435\u0453\u0443\u0437\u0431\u0438\u0440 (\u0441\u0443\u043C\u0430 \u043D\u0430 \u0440\u0435\u0434\u043E\u0432\u0438)",
    discountRow: (percent) => `\u041F\u043E\u043F\u0443\u0441\u0442 (${percent}%)`,
    totalAfterDiscount:
      "\u0412\u043A\u0443\u043F\u043D\u043E \u043F\u043E \u043F\u043E\u043F\u0443\u0441\u0442",
    advanceRow:
      "\u0410\u0432\u0430\u043D\u0441 \u043E\u0434 \u043A\u043B\u0438\u0435\u043D\u0442",
    balanceDue:
      "\u0417\u0430 \u043F\u043B\u0430\u045C\u0430\u045A\u0435",
    currency: "MKD",
    footer:
      "\u0417\u0430 \u043F\u043E\u0432\u0435\u045C\u0435 \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u0438 \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u0438\u0440\u0430\u0458\u0442\u0435 \u043D\u0435:",
    columns: {
      item: "\u0420.\u0411.",
      name: "\u0418\u043C\u0435",
      materials: "\u041C\u0430\u0442\u0435\u0440\u0438\u0458\u0430\u043B\u0438",
      quantity: "m2/\u043F\u0430\u0440\u0447\u0438\u045A\u0430",
      price: "\u0426\u0435\u043D\u0430",
      total: "\u0412\u043A\u0443\u043F\u043D\u043E",
    },
    archiveRequired:
      "\u041F\u043E\u043F\u043E\u043B\u043D\u0435\u0442\u0435 \u043A\u043B\u0438\u0435\u043D\u0442 \u0438 \u0431\u0440\u043E\u0458 \u043D\u0430 \u0444\u0430\u043A\u0442\u0443\u0440\u0430 \u043F\u0440\u0435\u0434 \u0430\u0440\u0445\u0438\u0432\u0438\u0440\u0430\u045A\u0435.",
    archiveSaved:
      "\u0424\u0430\u043A\u0442\u0443\u0440\u0430\u0442\u0430 \u0435 \u0437\u0430\u0447\u0443\u0432\u0430\u043D\u0430 \u0432\u043E \u0430\u0440\u0445\u0438\u0432\u0430.",
    archiveFailed:
      "\u0424\u0430\u043A\u0442\u0443\u0440\u0430\u0442\u0430 \u043D\u0435 \u0435 \u0437\u0430\u0447\u0443\u0432\u0430\u043D\u0430 \u0432\u043E \u0430\u0440\u0445\u0438\u0432\u0430.",
    popupBlocked:
      "\u041F\u0440\u043E\u0437\u043E\u0440\u0435\u0446\u043E\u0442 \u0437\u0430 \u043F\u0435\u0447\u0430\u0442\u0435\u045A\u0435 \u0435 \u0431\u043B\u043E\u043A\u0438\u0440\u0430\u043D.",
    stockInfo:
      "\u041E\u0434\u0437\u0435\u043C\u0438 \u043E\u0434 \u0441\u0442\u043E\u043A \u043F\u0440\u0435\u0434 \u043F\u0435\u0447\u0430\u0442\u0435\u045A\u0435: \u0438\u043C\u0435\u0442\u043E \u0432\u043E \u0440\u0435\u0434\u043E\u0442 \u0442\u0440\u0435\u0431\u0430 \u0434\u0430 \u0441\u0435 \u0441\u043E\u0432\u043F\u0430\u0453\u0430 \u0441\u043E \u0438\u043C\u0435\u0442\u043E \u0438\u043B\u0438 SKU \u043D\u0430 \u0430\u0440\u0442\u0438\u043A\u043B\u043E\u0442; \u043A\u043E\u043B\u0438\u0447\u0438\u043D\u0430\u0442\u0430 \u0441\u0435 \u0437\u0435\u043C\u0430 \u043E\u0434 m2/pcs. \u0410\u043A\u043E \u043D\u0435\u043C\u0430 \u0434\u043E\u0432\u043E\u043B\u043D\u043E \u0441\u0442\u043E\u043A, \u043F\u0435\u0447\u0430\u0442\u0435\u045A\u0435\u0442\u043E \u0441\u0435 \u043E\u0442\u043A\u0430\u0436\u0443\u0432\u0430.",
    stockDeducted: (details) =>
      `\u0421\u0442\u043E\u043A\u043E\u0442 \u0435 \u043E\u0434\u0437\u0435\u043C\u0435\u043D: ${details}`,
    stockAlreadyDeducted:
      "\u0421\u0442\u043E\u043A\u043E\u0442 \u0435 \u0432\u0435\u045C\u0435 \u043E\u0434\u0437\u0435\u043C\u0435\u043D \u0437\u0430 \u043E\u0432\u0430\u0430 \u0444\u0430\u043A\u0442\u0443\u0440\u0430.",
    noStockRows:
      "\u041D\u0435 \u0435 \u043D\u0430\u0458\u0434\u0435\u043D \u0440\u0435\u0434 \u0448\u0442\u043E \u0441\u0435 \u0441\u043E\u0432\u043F\u0430\u0453\u0430 \u0441\u043E \u0441\u0442\u043E\u043A\u043E\u0442.",
    stockFailed:
      "\u041E\u0434\u0437\u0435\u043C\u0430\u045A\u0435\u0442\u043E \u043E\u0434 \u0441\u0442\u043E\u043A \u043D\u0435 \u0443\u0441\u043F\u0435\u0430. \u041F\u0435\u0447\u0430\u0442\u0435\u045A\u0435\u0442\u043E \u0435 \u043E\u0442\u043A\u0430\u0436\u0430\u043D\u043E.",
  },
};

const createEmptyRows = () =>
  Array.from({ length: 8 }, (_, i) => ({
    key: i,
    item: i + 1,
    name: "",
    materials: "",
    m2pcs: "",
    stockItemId: null,
    stockSku: "",
    stockType: "",
    stockUnit: "",
    price: "",
    total: "",
  }));

const textValue = (value) => (value === null || value === undefined ? "" : String(value));

const readProperty = (source, keys) => {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  const entries = Object.entries(source);
  for (const key of keys) {
    const match = entries.find(
      ([entryKey]) => entryKey.toLowerCase() === key.toLowerCase()
    );
    if (match) {
      return match[1];
    }
  }

  return undefined;
};

const readText = (source, keys, fallback = "") => {
  const value = readProperty(source, keys);
  return value === null || value === undefined ? fallback : String(value);
};

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
    unit: readText(item, ["unit"]).trim(),
    stockType: readText(item, ["stockType"]).trim(),
    sellPrice: readProperty(item, ["sellPrice"]),
    currentQuantity: readProperty(item, ["currentQuantity"]),
  };
};

const stockMatchesSearch = (item, searchValue) => {
  const needle = textValue(searchValue).trim().toLowerCase();
  if (!needle) {
    return false;
  }

  return (
    item.name.toLowerCase().includes(needle) ||
    item.sku.toLowerCase().includes(needle)
  );
};

const normalizeRows = (items) => {
  const sourceItems = Array.isArray(items) ? items : [];
  const rowCount = Math.max(8, sourceItems.length);

  return Array.from({ length: rowCount }, (_, index) => {
    const item = sourceItems[index] || {};
    return {
      key: index,
      item: readText(item, ["item", "itemNumber", "number"], String(index + 1)),
      name: readText(item, ["name", "itemName", "description"]),
      materials: readText(item, ["materials", "material"]),
      m2pcs: readText(item, ["m2pcs", "m2Pcs", "quantity", "qty", "unit"]),
      stockItemId: readProperty(item, ["stockItemId", "stockId"]) ?? null,
      stockSku: readText(item, ["stockSku", "sku"]),
      stockType: readText(item, ["stockType"]),
      stockUnit: readText(item, ["stockUnit", "unitType", "unitLabel"]),
      price: readText(item, ["price", "unitPrice"]),
      total: readText(item, ["total", "lineTotal"]),
    };
  });
};

const normalizeDescription = (value, fallbackNotes) => {
  const lines = Array.isArray(value)
    ? value.map(textValue)
    : value
    ? [textValue(value)]
    : fallbackNotes
    ? [textValue(fallbackNotes)]
    : [];

  return Array.from({ length: 6 }, (_, index) => lines[index] || "");
};

const parseArchiveSnapshot = (archivedInvoice) => {
  try {
    const parsed = JSON.parse(archivedInvoice?.itemsJson || "{}");
    const root = parsed && typeof parsed === "object" ? parsed : {};
    const items = Array.isArray(root)
      ? root
      : readProperty(root, ["items", "rows", "lines"]);
    const totals = readProperty(root, ["totals"]) || {};

    return {
      date: readText(root, ["date", "invoiceDate"]),
      items,
      description: readProperty(root, ["description", "descriptions", "notes"]),
      totals,
    };
  } catch {
    return {
      date: "",
      items: [],
      description: [],
      totals: {},
    };
  }
};

const normalizeLanguage = (language) =>
  language === INVOICE_LANGUAGES.Macedonian || language === 1
    ? INVOICE_LANGUAGES.Macedonian
    : INVOICE_LANGUAGES.Albanian;

const buildIssueSignature = (payload) => JSON.stringify(payload);

const readStockDeduction = (response) =>
  response?.data?.stockDeduction || response?.data?.StockDeduction || null;

function TemplatePrint() {
  const location = useLocation();
  const [rows, setRows] = useState(createEmptyRows);
  const [header, setHeader] = useState({
    customer: "",
    date: "",
    invoice: "",
  });
  const [language, setLanguage] = useState(INVOICE_LANGUAGES.Albanian);
  const [discountPercent, setDiscountPercent] = useState("");
  const [advancePayment, setAdvancePayment] = useState("");
  const [description, setDescription] = useState(["", "", "", "", "", ""]);
  const [stockItems, setStockItems] = useState([]);
  const [archivedSnapshotDirty, setArchivedSnapshotDirty] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const printRef = useRef();
  const issuedInvoiceSignatureRef = useRef(null);

  const labels = TEXT[language] || TEXT.Albanian;

  const totals = useMemo(
    () => computeInvoiceTotals(rows, discountPercent, advancePayment),
    [rows, discountPercent, advancePayment]
  );

  const columns = useMemo(
    () => [
      { title: labels.columns.item, dataIndex: "item", width: 60 },
      { title: labels.columns.name, dataIndex: "name" },
      { title: labels.columns.materials, dataIndex: "materials" },
      { title: labels.columns.quantity, dataIndex: "m2pcs", width: 80 },
      { title: labels.columns.price, dataIndex: "price", width: 80 },
      { title: labels.columns.total, dataIndex: "total", width: 80 },
    ],
    [labels]
  );

  useEffect(() => {
    let cancelled = false;

    const fetchStockItems = async () => {
      try {
        const response = await apiClient.get(API_ENDPOINTS.STOCK_ITEMS);
        if (cancelled) {
          return;
        }

        const items = Array.isArray(response.data)
          ? response.data.map(normalizeStockItem).filter((item) => item.name)
          : [];
        setStockItems(items);
      } catch {
        if (!cancelled) {
          setStockItems([]);
          message.warning(
            "Stock suggestions could not be loaded. Manual item entry still works."
          );
        }
      }
    };

    fetchStockItems();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const archivedInvoice = location.state?.archivedInvoice;
    if (!archivedInvoice) {
      return;
    }

    const snapshot = parseArchiveSnapshot(archivedInvoice);
    const snapshotTotals = snapshot.totals || {};

    setHeader({
      customer: archivedInvoice.customerName || "",
      date: snapshot.date || "",
      invoice: archivedInvoice.invoiceNumber || "",
    });
    setLanguage(normalizeLanguage(archivedInvoice.language));
    setRows(normalizeRows(snapshot.items));
    setDescription(normalizeDescription(snapshot.description, archivedInvoice.notes));
    setDiscountPercent(
      textValue(
        readProperty(snapshotTotals, ["discountPercentInput"]) ??
          readProperty(snapshotTotals, ["discountPercent"])
      )
    );
    setAdvancePayment(
      textValue(
        readProperty(snapshotTotals, ["advanceInput"]) ??
          readProperty(snapshotTotals, ["advance"])
      )
    );
    setArchivedSnapshotDirty(false);
    issuedInvoiceSignatureRef.current = null;
  }, [location.state]);

  const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    return `${amount.toFixed(2)} ${labels.currency}`;
  };

  const markInvoiceEdited = () => {
    setArchivedSnapshotDirty(true);
  };

  const handleRowChange = (idx, field, value) => {
    markInvoiceEdited();
    setRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[idx], [field]: value };
      if (field === "name") {
        row.stockItemId = null;
        row.stockSku = "";
        row.stockType = "";
        row.stockUnit = "";
      }
      updated[idx] = row;
      return updated;
    });
  };

  const handleStockItemSelect = (idx, selectedItem) => {
    if (!selectedItem) {
      return;
    }

    markInvoiceEdited();
    setRows((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        name: selectedItem.name,
        stockItemId: selectedItem.id ?? null,
        stockSku: selectedItem.sku,
        stockType: selectedItem.stockType,
        stockUnit: selectedItem.unit,
        price: formatStockPriceInput(selectedItem.sellPrice),
      };
      return updated;
    });
  };

  const getStockOptions = useCallback(
    (searchValue) =>
      stockItems
        .filter((item) => stockMatchesSearch(item, searchValue))
        .slice(0, 20)
        .map((item) => {
          const price = formatStockPriceInput(item.sellPrice);
          const details = [item.stockType, item.unit, price ? `${price} MKD` : ""]
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

  const handleHeaderChange = (field, value) => {
    markInvoiceEdited();
    setHeader((prev) => ({ ...prev, [field]: value }));
  };

  const handleDescriptionChange = (idx, value) => {
    markInvoiceEdited();
    setDescription((prev) => {
      const updated = [...prev];
      updated[idx] = value;
      return updated;
    });
  };

  const buildArchivePayload = () => ({
    invoiceNumber: header.invoice.trim(),
    customerName: header.customer.trim(),
    customerAddress: null,
    customerPhone: null,
    language,
    itemsJson: JSON.stringify({
      date: header.date.trim(),
      items: rows.map((row, index) => ({
        item: textValue(row.item || index + 1),
        name: textValue(row.name),
        materials: textValue(row.materials),
        m2pcs: textValue(row.m2pcs),
        stockItemId: row.stockItemId ?? null,
        stockSku: textValue(row.stockSku),
        stockType: textValue(row.stockType),
        stockUnit: textValue(row.stockUnit),
        price: textValue(row.price),
        total: textValue(row.total),
      })),
      description,
      totals: {
        lineSubtotal: totals.lineSubtotal,
        discountPercent: totals.discountPercent,
        discountPercentInput: discountPercent,
        discountAmount: totals.discountAmount,
        totalAfterDiscount: totals.totalAfterDiscount,
        advance: totals.advance,
        advanceInput: advancePayment,
        balanceDue: totals.balanceDue,
      },
    }),
    subtotal: totals.lineSubtotal,
    total: totals.balanceDue,
    notes: null,
  });

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
          labels.stockAlreadyDeducted
      );
    } else if (applied.length > 0) {
      message.success(
        labels.stockDeducted(
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

  const issueInvoice = async ({ showArchiveMessage = true } = {}) => {
    const payload = buildArchivePayload();

    if (!payload.invoiceNumber || !payload.customerName) {
      message.warning(labels.archiveRequired);
      return false;
    }

    const signature = buildIssueSignature(payload);
    if (issuedInvoiceSignatureRef.current === signature) {
      return true;
    }

    try {
      const response = await apiClient.post(API_ENDPOINTS.INVOICE_ARCHIVE, payload);
      issuedInvoiceSignatureRef.current = signature;
      setArchivedSnapshotDirty(false);
      if (showArchiveMessage) {
        message.success(labels.archiveSaved);
      }
      showStockDeductionFeedback(readStockDeduction(response));
      return true;
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (typeof e?.response?.data === "string" ? e.response.data : null);
      message.error(msg || labels.archiveFailed);
      return false;
    }
  };

  const openPrintWindow = () => {
    if (!printRef.current) {
      return;
    }

    const printContents = printRef.current.innerHTML;
    const win = window.open("", "", "height=900,width=1200");
    if (!win) {
      message.error(labels.popupBlocked);
      return;
    }

    win.document.write("<html><head><title>Print</title>");
    win.document.write(
      '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/antd/4.16.13/antd.min.css" />'
    );
    win.document.write(`
      <style>
        @media print {
          body { margin: 0; padding: 0; }
          .print-container {
            max-width: 100% !important;
            padding: 15px !important;
            margin: 0 !important;
            page-break-inside: avoid;
          }
          table { font-size: 12px; }
          .ant-table { font-size: 12px; }
          .ant-input { font-size: 12px; padding: 4px; }
        }
      </style>
    `);
    win.document.write("</head><body>");
    win.document.write(printContents);
    win.document.write("</body></html>");
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const handlePrint = async () => {
    const isArchivedReprint = Boolean(location.state?.archivedInvoice);
    const shouldIssueBeforePrint = !isArchivedReprint || archivedSnapshotDirty;
    if (shouldIssueBeforePrint) {
      setPrintLoading(true);
      try {
        const issued = await issueInvoice({ showArchiveMessage: false });
        if (!issued) {
          return;
        }
      } finally {
        setPrintLoading(false);
      }
    }

    openPrintWindow();
  };

  return (
    <div>
      <Space
        direction="vertical"
        size="middle"
        style={{ marginBottom: 24, width: "100%" }}
      >
        <Space wrap align="start">
          <Button
            icon={<PrinterOutlined />}
            type="primary"
            onClick={handlePrint}
            loading={printLoading}
          >
            {labels.print}
          </Button>
          <Space align="center">
            <Text>{labels.language}</Text>
            <Select
              value={language}
              options={LANGUAGE_OPTIONS}
              onChange={(value) => {
                markInvoiceEdited();
                setLanguage(value);
              }}
              style={{ width: 150 }}
            />
          </Space>
        </Space>
      </Space>
      <div
        ref={printRef}
        className="print-container"
        style={{
          background: "#fff",
          padding: "20px",
          maxWidth: "800px",
          margin: "0 auto",
          border: "2px solid #000",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <img
            src={
              process.env.NODE_ENV === "development"
                ? "/prolux-logo.png"
                : "./prolux-logo.png"
            }
            alt="ProLux Group Logo"
            style={{ height: 50 }}
          />
          <div style={{ textAlign: "right", fontSize: 12 }}>
            <div>PROLUX Group - Superior Natural Surfaces</div>
            <div>Address: 11 Noemvri br.52</div>
            <div>Email: proluxceramics01@gmail.com</div>
            <div>Tel: 071/764/334</div>
          </div>
        </div>
        <Title level={3} style={{ textAlign: "center", margin: "8px 0" }}>
          PROLUX GROUP
        </Title>
        <div
          style={{
            textAlign: "center",
            fontWeight: 500,
            color: "#555",
            marginBottom: 12,
            fontSize: "14px",
          }}
        >
          SUPERIOR NATURAL SURFACES
        </div>
        <div
          style={{
            textAlign: "center",
            fontWeight: 700,
            marginBottom: 8,
            fontSize: "16px",
          }}
        >
          {labels.title}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Input
            placeholder={labels.customerPlaceholder}
            value={header.customer}
            onChange={(e) => handleHeaderChange("customer", e.target.value)}
            style={{ width: 250 }}
            bordered={false}
          />
          <Input
            placeholder={labels.datePlaceholder}
            value={header.date}
            onChange={(e) => handleHeaderChange("date", e.target.value)}
            style={{ width: 150 }}
            bordered={false}
          />
          <Input
            placeholder={labels.invoicePlaceholder}
            value={header.invoice}
            onChange={(e) => handleHeaderChange("invoice", e.target.value)}
            style={{ width: 150 }}
            bordered={false}
          />
        </div>
        <Table
          columns={columns.map((col) => ({
            ...col,
            render: (text, record, idx) => {
              const row = rows[idx] || {};
              const inputStyle = {
                background: "transparent",
                borderBottom: "2px solid #000",
                minWidth: 40,
              };

              if (col.dataIndex === "name") {
                return (
                  <AutoComplete
                    value={textValue(row.name)}
                    options={getStockOptions(row.name)}
                    onChange={(value) => handleRowChange(idx, "name", value)}
                    onSelect={(...args) =>
                      handleStockItemSelect(idx, args[1]?.stockItem)
                    }
                    filterOption={false}
                    style={{ width: "100%" }}
                    popupMatchSelectWidth={360}
                  >
                    <Input bordered={false} style={inputStyle} />
                  </AutoComplete>
                );
              }

              return (
                <Input
                  value={textValue(row[col.dataIndex])}
                  onChange={(e) =>
                    handleRowChange(idx, col.dataIndex, e.target.value)
                  }
                  suffix={
                    col.dataIndex === "m2pcs" && row.stockUnit
                      ? row.stockUnit
                      : undefined
                  }
                  bordered={false}
                  style={inputStyle}
                />
              );
            },
          }))}
          dataSource={rows}
          pagination={false}
          bordered
          style={{ marginBottom: 12 }}
        />
        <div style={{ marginBottom: 12 }}>
          <Card size="small" title={<b>{labels.description}</b>} bordered={false}>
            {description.map((desc, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 2,
                }}
              >
                <span style={{ width: 20, color: "#888" }}>{idx + 1}</span>
                <Input
                  value={desc}
                  onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                  bordered={false}
                  style={{ borderBottom: "2px solid #000", flex: 1 }}
                />
              </div>
            ))}
          </Card>
        </div>

        <Row gutter={[16, 8]} style={{ marginBottom: 12 }}>
          <Col xs={24} sm={12}>
            <Text strong>{labels.discount}</Text>
            <Input
              placeholder="0"
              value={discountPercent}
              onChange={(e) => {
                markInvoiceEdited();
                setDiscountPercent(e.target.value);
              }}
              suffix="%"
              style={{ marginTop: 4 }}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Text strong>{labels.advance}</Text>
            <Input
              placeholder="0"
              value={advancePayment}
              onChange={(e) => {
                markInvoiceEdited();
                setAdvancePayment(e.target.value);
              }}
              style={{ marginTop: 4 }}
            />
          </Col>
        </Row>

        <div
          style={{
            maxWidth: 420,
            marginLeft: "auto",
            fontSize: 14,
            borderTop: "1px solid #ccc",
            paddingTop: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Text>{labels.subtotal}</Text>
            <Text strong>{formatCurrency(totals.lineSubtotal)}</Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Text>{labels.discountRow(totals.discountPercent)}</Text>
            <Text strong>- {formatCurrency(totals.discountAmount)}</Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Text>{labels.totalAfterDiscount}</Text>
            <Text strong>{formatCurrency(totals.totalAfterDiscount)}</Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Text>{labels.advanceRow}</Text>
            <Text strong>- {formatCurrency(totals.advance)}</Text>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            <Text strong>{labels.balanceDue}</Text>
            <Text strong>{formatCurrency(totals.balanceDue)}</Text>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 11,
            color: "#888",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            {labels.footer}
            <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
              <span>www.proluxgroup.com</span>
              <span>facebook.com/proluxgroup</span>
              <span>instagram.com/proluxgroup</span>
            </div>
          </div>
          <div>Mob: 071/764/334</div>
        </div>
      </div>
    </div>
  );
}

export default TemplatePrint;
