import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  AutoComplete,
  Button,
  Table,
  Input,
  Typography,
  Space,
  Select,
  message,
} from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import { useLocation } from "react-router-dom";
import {
  computeInvoiceTotals,
  EUR_EXCHANGE_RATE,
  formatEurFromBase,
  formatInvoiceLineTotal,
  parsePositiveExchangeRate,
} from "../utils/invoiceTotals";
import apiClient, { API_ENDPOINTS } from "../config/api";

const { Text } = Typography;

const INVOICE_LANGUAGES = {
  Albanian: "Albanian",
  Macedonian: "Macedonian",
};

const LANGUAGE_OPTIONS = [
  { value: INVOICE_LANGUAGES.Albanian, label: "Albanian" },
  { value: INVOICE_LANGUAGES.Macedonian, label: "Macedonian" },
];

const PRINT_INVOICE_ROW_COUNT = 14;
const DESCRIPTION_LINE_COUNT = 7;

const INVOICE_PRINT_STYLES = `
  @page {
    size: A4;
    margin: 0;
  }

  .print-container {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 12mm 13mm 10mm;
    box-sizing: border-box;
    background: #ffffff;
    color: #171717;
    border: 1px solid #d8d8d8;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.1);
    font-family: Arial, Helvetica, sans-serif;
  }

  .invoice-letterhead {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding-bottom: 8px;
    border-bottom: 2px solid #161616;
  }

  .invoice-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .invoice-logo {
    width: 58px;
    height: 50px;
    object-fit: contain;
    flex: 0 0 auto;
  }

  .invoice-company-name {
    margin: 0;
    font-size: 20px;
    line-height: 1.05;
    font-weight: 700;
  }

  .invoice-company-tagline {
    margin-top: 3px;
    font-size: 10px;
    color: #555555;
    text-transform: uppercase;
  }

  .invoice-company-details {
    text-align: right;
    font-size: 10px;
    line-height: 1.45;
    color: #333333;
  }

  .invoice-heading-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18px;
    margin: 11px 0 9px;
  }

  .invoice-title {
    margin: 0;
    font-size: 17px;
    line-height: 1.2;
    font-weight: 700;
  }

  .invoice-meta-grid {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) 130px 145px;
    gap: 10px;
    margin-bottom: 10px;
    padding: 8px 10px;
    border: 1px solid #d5d5d5;
    background: #fbfbfb;
  }

  .invoice-field-label {
    display: block;
    margin-bottom: 2px;
    font-size: 9px;
    font-weight: 700;
    color: #555555;
    text-transform: uppercase;
  }

  .invoice-field .ant-input,
  .invoice-adjustment-input.ant-input {
    height: 23px;
    padding: 1px 0 3px;
    border: 0 !important;
    border-bottom: 1px solid #444444 !important;
    border-radius: 0;
    background: transparent;
    font-size: 12px;
    line-height: 1.2;
    box-shadow: none !important;
  }

  .invoice-items-table {
    margin-bottom: 0;
  }

  .invoice-items-table .ant-table {
    font-size: 11px;
    line-height: 1.2;
    color: #171717;
  }

  .invoice-items-table .ant-table-container,
  .invoice-items-table .ant-table-content > table {
    border-color: #bdbdbd !important;
  }

  .invoice-items-table .ant-table-thead > tr > th {
    height: 27px;
    padding: 4px 6px !important;
    background: #f1f2f4 !important;
    border-color: #b9b9b9 !important;
    color: #1f1f1f;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .invoice-items-table .ant-table-tbody > tr > td {
    height: 26px;
    padding: 0 5px !important;
    border-color: #d2d2d2 !important;
    vertical-align: middle;
  }

  .invoice-items-table .ant-input,
  .invoice-items-table .ant-input-affix-wrapper {
    min-height: 22px;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0;
    background: transparent !important;
    font-size: 11px;
    line-height: 1.2;
    box-shadow: none !important;
  }

  .invoice-items-table .ant-input-affix-wrapper .ant-input {
    min-height: 20px;
  }

  .invoice-items-table .ant-input-suffix {
    margin-left: 3px;
    color: #666666;
    font-size: 9px;
  }

  .invoice-detail-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 215px;
    gap: 13px;
    align-items: start;
    margin-top: 10px;
  }

  .invoice-description-box,
  .invoice-totals-panel {
    border: 1px solid #c7c7c7;
    background: #ffffff;
  }

  .invoice-description-box {
    min-height: 132px;
    padding: 8px 10px 9px;
  }

  .invoice-section-title {
    margin-bottom: 4px;
    padding-bottom: 5px;
    border-bottom: 1px solid #dedede;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: #333333;
  }

  .invoice-description-line {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr);
    align-items: end;
    min-height: 15px;
    gap: 6px;
    margin-top: 3px;
  }

  .invoice-description-index {
    font-size: 9px;
    color: #777777;
  }

  .invoice-description-line .ant-input {
    height: 17px;
    padding: 0 0 2px;
    border: 0 !important;
    border-bottom: 1px solid #d2d2d2 !important;
    border-radius: 0;
    background: transparent;
    font-size: 11px;
    line-height: 1.2;
    box-shadow: none !important;
  }

  .invoice-totals-panel {
    padding: 8px 10px 9px;
  }

  .invoice-total-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 20px;
    font-size: 10px;
  }

  .invoice-total-row + .invoice-total-row {
    margin-top: 4px;
  }

  .invoice-total-label {
    color: #333333;
  }

  .invoice-total-value {
    min-width: 82px;
    text-align: right;
    font-weight: 700;
  }

  .invoice-adjustment-input.ant-input {
    width: 72px;
    text-align: right;
    font-size: 10px;
  }

  .invoice-grand-total {
    margin-top: 7px;
    padding-top: 7px;
    border-top: 2px solid #171717;
    font-size: 13px;
    font-weight: 700;
  }

  .invoice-eur-total {
    color: #475569;
  }

  .invoice-eur-total .invoice-total-value {
    color: #166534;
  }

  .invoice-footer {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 11px;
    padding-top: 8px;
    border-top: 1px solid #dddddd;
    color: #666666;
    font-size: 9px;
    line-height: 1.4;
  }

  .invoice-socials {
    display: flex;
    gap: 10px;
    margin-top: 2px;
    flex-wrap: wrap;
  }

  @media screen and (max-width: 920px) {
    .print-container {
      width: 100%;
      min-height: auto;
      padding: 18px;
    }

    .invoice-meta-grid,
    .invoice-detail-row {
      grid-template-columns: 1fr;
    }

    .invoice-company-details {
      text-align: left;
    }
  }

  @media print {
    html,
    body {
      width: 210mm;
      min-height: 297mm;
      background: #ffffff !important;
    }

    body {
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-container {
      width: 210mm !important;
      min-height: 297mm !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 11mm 12mm 8mm !important;
      border: 0 !important;
      box-shadow: none !important;
    }

    .invoice-items-table .ant-table-tbody > tr > td {
      height: 25px;
    }

    .ant-input,
    .ant-input-affix-wrapper {
      color: #171717 !important;
    }
  }
`;

const TEXT = {
  Albanian: {
    print: "Printo",
    saveArchive: "Ruaj n\u00EB arkiv",
    language: "Gjuha",
    title: "FLET\u00CBFATUR\u00CB",
    customerPlaceholder: "Emri i klientit",
    datePlaceholder: "Data",
    invoicePlaceholder: "Nr. fature",
    description: "P\u00EBrshkrimi",
    discount: "Zbritja (%)",
    advance: "Avans / Parapagim (MKD)",
    eurRate: "Kursi EUR/MKD",
    subtotal: "N\u00EBntotali (shuma e rreshtave)",
    discountRow: (percent) => `Zbritja (${percent}%)`,
    totalAfterDiscount: "Totali pas zbritjes",
    totalInEur: "Totali n\u00EB EUR",
    advanceRow: "Avans i klientit",
    balanceDue: "P\u00EBr t\u00EB paguar",
    currency: "MKD",
    footer: "P\u00EBr \u00E7do informacion shtes\u00EB mund t\u00EB na kontaktoni:",
    columns: {
      item: "Nr.",
      name: "Emri",
      materials: "Materialet",
      quantity: "m2/pcs",
      price: "\u00C7mimi",
      total: "Totali",
    },
    archiveRequired: "Plot\u00EBsoni klientin para arkivimit.",
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
    eurRate: "\u041A\u0443\u0440\u0441 EUR/MKD",
    subtotal:
      "\u041C\u0435\u0453\u0443\u0437\u0431\u0438\u0440 (\u0441\u0443\u043C\u0430 \u043D\u0430 \u0440\u0435\u0434\u043E\u0432\u0438)",
    discountRow: (percent) => `\u041F\u043E\u043F\u0443\u0441\u0442 (${percent}%)`,
    totalAfterDiscount:
      "\u0412\u043A\u0443\u043F\u043D\u043E \u043F\u043E \u043F\u043E\u043F\u0443\u0441\u0442",
    totalInEur:
      "\u0412\u043A\u0443\u043F\u043D\u043E \u0432\u043E EUR",
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
      "\u041F\u043E\u043F\u043E\u043B\u043D\u0435\u0442\u0435 \u043A\u043B\u0438\u0435\u043D\u0442 \u043F\u0440\u0435\u0434 \u0430\u0440\u0445\u0438\u0432\u0438\u0440\u0430\u045A\u0435.",
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
  Array.from({ length: PRINT_INVOICE_ROW_COUNT }, (_, i) => ({
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
  const rowCount = Math.max(PRINT_INVOICE_ROW_COUNT, sourceItems.length);

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

  return Array.from({ length: DESCRIPTION_LINE_COUNT }, (_, index) => lines[index] || "");
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

const recalculateRowTotal = (row) => ({
  ...row,
  total: formatInvoiceLineTotal(row),
});

const buildIssueSignature = (payload) => JSON.stringify(payload);

const readStockDeduction = (response) =>
  response?.data?.stockDeduction || response?.data?.StockDeduction || null;

const readIssuedInvoiceNumber = (response) =>
  response?.data?.invoiceNumber || response?.data?.InvoiceNumber || "";

const getInvoiceNumberMode = (invoiceNumber) =>
  invoiceNumber ? "provided" : "auto";

const formatExchangeRateInput = (value) => {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? String(rate) : String(EUR_EXCHANGE_RATE);
};

const PRINT_DIAGNOSTIC_PREFIX = "[TemplatePrint:print]";

const logPrintDiagnostic = (step, details = {}) => {
  console.debug(PRINT_DIAGNOSTIC_PREFIX, step, details);
};

const logPrintDiagnosticError = (step, error, details = {}) => {
  console.error(PRINT_DIAGNOSTIC_PREFIX, step, {
    ...details,
    message: error?.message,
    status: error?.response?.status,
    response: error?.response?.data,
    code: error?.code,
  });
};

const createClientRequestId = () => {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `invoice-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

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
  const [description, setDescription] = useState(() =>
    Array.from({ length: DESCRIPTION_LINE_COUNT }, () => "")
  );
  const [stockItems, setStockItems] = useState([]);
  const [eurExchangeRateInput, setEurExchangeRateInput] = useState(
    formatExchangeRateInput(EUR_EXCHANGE_RATE)
  );
  const [archivedSnapshotDirty, setArchivedSnapshotDirty] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const printRef = useRef();
  const issuedInvoiceSignatureRef = useRef(null);
  const invoiceRequestIdRef = useRef(createClientRequestId());
  const printInProgressRef = useRef(false);
  const eurExchangeRateEditedRef = useRef(false);

  const labels = TEXT[language] || TEXT.Albanian;

  const totals = useMemo(
    () => computeInvoiceTotals(rows, discountPercent, advancePayment),
    [rows, discountPercent, advancePayment]
  );

  const eurExchangeRate = useMemo(
    () => parsePositiveExchangeRate(eurExchangeRateInput, EUR_EXCHANGE_RATE),
    [eurExchangeRateInput]
  );

  const columns = useMemo(
    () => [
      { title: labels.columns.item, dataIndex: "item", width: 46 },
      { title: labels.columns.name, dataIndex: "name", width: 190 },
      { title: labels.columns.materials, dataIndex: "materials", width: 160 },
      { title: labels.columns.quantity, dataIndex: "m2pcs", width: 74 },
      { title: labels.columns.price, dataIndex: "price", width: 78 },
      { title: labels.columns.total, dataIndex: "total", width: 84 },
    ],
    [labels]
  );

  useEffect(() => {
    let cancelled = false;

    const fetchCurrency = async () => {
      try {
        const response = await apiClient.get(API_ENDPOINTS.CURRENCY);
        const rate = Number(response.data?.conversion?.eurToMkdRate);
        if (
          !cancelled &&
          !eurExchangeRateEditedRef.current &&
          Number.isFinite(rate) &&
          rate > 0
        ) {
          setEurExchangeRateInput(formatExchangeRateInput(rate));
        }
      } catch {
        // Keep the local fallback rate; invoice calculations remain in base currency.
      }
    };

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
            "Sugjerimet e stokut nuk mund t\u00EB ngarkoheshin. Vendosja manuale e artikujve funksionon ende."
          );
        }
      }
    };

    fetchCurrency();
    fetchStockItems();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const archivedInvoice = location.state?.archivedInvoice;
    if (!archivedInvoice) {
      if (!invoiceRequestIdRef.current) {
        invoiceRequestIdRef.current = createClientRequestId();
      }
      return;
    }

    invoiceRequestIdRef.current = null;
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
    setEurExchangeRateInput(
      textValue(
        readProperty(snapshotTotals, ["eurExchangeRateInput"]) ??
          readProperty(snapshotTotals, ["eurExchangeRate"]) ??
          archivedInvoice.eurExchangeRate ??
          archivedInvoice.EurExchangeRate ??
          EUR_EXCHANGE_RATE
      )
    );
    eurExchangeRateEditedRef.current = false;
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
      let row = { ...updated[idx], [field]: value };
      if (field === "name") {
        row.stockItemId = null;
        row.stockSku = "";
        row.stockType = "";
        row.stockUnit = "";
      }
      if (field === "m2pcs" || field === "price") {
        row = recalculateRowTotal(row);
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
      updated[idx] = recalculateRowTotal({
        ...updated[idx],
        name: selectedItem.name,
        stockItemId: selectedItem.id ?? null,
        stockSku: selectedItem.sku,
        stockType: selectedItem.stockType,
        stockUnit: selectedItem.unit,
        price: formatStockPriceInput(selectedItem.sellPrice),
      });
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

  const handleEurExchangeRateChange = (value) => {
    eurExchangeRateEditedRef.current = true;
    markInvoiceEdited();
    setEurExchangeRateInput(value);
  };

  const buildArchivePayload = () => ({
    invoiceNumber: header.invoice.trim(),
    clientRequestId: invoiceRequestIdRef.current,
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
        eurExchangeRate,
        eurExchangeRateInput,
        advance: totals.advance,
        advanceInput: advancePayment,
        balanceDue: totals.balanceDue,
      },
    }),
    subtotal: totals.lineSubtotal,
    total: totals.totalAfterDiscount,
    notes: null,
  });

  const summarizeArchivePayload = (payload) => ({
    hasCustomerName: Boolean(payload.customerName),
    requestedInvoiceNumber: payload.invoiceNumber || "(auto)",
    invoiceNumberMode: getInvoiceNumberMode(payload.invoiceNumber),
    clientRequestId: payload.clientRequestId || null,
    itemCount: rows.length,
    subtotal: payload.subtotal,
    total: payload.total,
  });

  const getIssueBlockReason = (payload) => {
    if (!payload.customerName) {
      return "missing customer name";
    }

    return null;
  };

  const warnIssueBlocked = (reason) => {
    if (reason === "missing customer name") {
      message.warning(labels.archiveRequired);
    }
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
    const payloadSummary = summarizeArchivePayload(payload);

    logPrintDiagnostic("issueInvoice:start", payloadSummary);

    const blockReason = getIssueBlockReason(payload);
    if (blockReason) {
      logPrintDiagnostic("issueInvoice:blocked", {
        reason: blockReason,
        ...payloadSummary,
      });
      warnIssueBlocked(blockReason);
      return false;
    }

    const signature = buildIssueSignature(payload);
    if (issuedInvoiceSignatureRef.current === signature) {
      logPrintDiagnostic("issueInvoice:skipped", {
        reason: "signature already issued",
        requestedInvoiceNumber: payload.invoiceNumber || "(auto)",
      });
      return true;
    }

    try {
      logPrintDiagnostic("archiveApi:request", payloadSummary);
      const response = await apiClient.post(API_ENDPOINTS.INVOICE_ARCHIVE, payload);
      const issuedInvoiceNumber = readIssuedInvoiceNumber(response) || payload.invoiceNumber;
      const stockDeduction = readStockDeduction(response);
      logPrintDiagnostic("archiveApi:response", {
        status: response.status,
        archiveId: response?.data?.id || response?.data?.Id,
        requestedInvoiceNumber: payload.invoiceNumber || "(auto)",
        issuedInvoiceNumber: issuedInvoiceNumber || "(empty)",
      });
      logPrintDiagnostic("invoiceNumber:response", {
        requestedInvoiceNumber: payload.invoiceNumber || "(auto)",
        issuedInvoiceNumber: issuedInvoiceNumber || "(empty)",
      });
      logPrintDiagnostic("stockDeduction:response", {
        alreadyApplied:
          stockDeduction?.alreadyApplied || stockDeduction?.AlreadyApplied || false,
        appliedCount:
          stockDeduction?.applied?.length || stockDeduction?.Applied?.length || 0,
        skippedCount:
          stockDeduction?.skipped?.length || stockDeduction?.Skipped?.length || 0,
        message: stockDeduction?.message || stockDeduction?.Message || null,
      });
      if (issuedInvoiceNumber && issuedInvoiceNumber !== header.invoice) {
        flushSync(() => {
          setHeader((prev) =>
            prev.invoice === issuedInvoiceNumber
              ? prev
              : { ...prev, invoice: issuedInvoiceNumber }
          );
        });
      }
      issuedInvoiceSignatureRef.current = buildIssueSignature({
        ...payload,
        invoiceNumber: issuedInvoiceNumber,
      });
      setArchivedSnapshotDirty(false);
      if (showArchiveMessage) {
        message.success(labels.archiveSaved);
      }
      showStockDeductionFeedback(stockDeduction);
      logPrintDiagnostic("issueInvoice:success", {
        issuedInvoiceNumber: issuedInvoiceNumber || "(empty)",
      });
      return true;
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (typeof e?.response?.data === "string" ? e.response.data : null);
      logPrintDiagnosticError("issueInvoice:failed", e, {
        archiveMessage: msg || null,
        requestedInvoiceNumber: payload.invoiceNumber || "(auto)",
      });
      message.error(msg || labels.archiveFailed);
      return false;
    }
  };

  const closePrintWindow = (win, reason = "unspecified") => {
    try {
      if (win && !win.closed) {
        logPrintDiagnostic("printWindow:close", { reason });
        win.close();
      } else {
        logPrintDiagnostic("printWindow:closeSkipped", {
          reason,
          alreadyClosed: Boolean(win?.closed),
        });
      }
    } catch (e) {
      logPrintDiagnosticError("printWindow:closeFailed", e, { reason });
      // The browser can deny access if the window was already closed.
    }
  };

  const openBlankPrintWindow = () => {
    logPrintDiagnostic("printWindow:open:start");
    const win = window.open("", "", "height=900,width=1200");
    if (!win) {
      logPrintDiagnostic("printWindow:open:blocked");
      message.error(labels.popupBlocked);
      return null;
    }

    logPrintDiagnostic("printWindow:open:success", { closed: win.closed });
    win.document.open();
    win.document.write("<html><head><title>Printo</title></head><body></body></html>");
    win.document.close();
    win.focus();
    logPrintDiagnostic("printWindow:placeholderWritten", { closed: win.closed });
    return win;
  };

  const renderPrintWindow = (win, onPrintTriggered) => {
    logPrintDiagnostic("renderPrintWindow:start", {
      hasWindow: Boolean(win),
      closed: Boolean(win?.closed),
      hasPrintRef: Boolean(printRef.current),
    });

    if (!win || win.closed) {
      logPrintDiagnostic("renderPrintWindow:blocked", {
        reason: "window missing or closed",
      });
      message.error(labels.popupBlocked);
      return false;
    }

    if (!printRef.current) {
      logPrintDiagnostic("renderPrintWindow:blocked", {
        reason: "printRef missing",
      });
      closePrintWindow(win, "printRef missing");
      return false;
    }

    const printContents = printRef.current.outerHTML;
    logPrintDiagnostic("printHtml:generated", {
      htmlLength: printContents.length,
      startsWithContainer: printContents.includes("print-container"),
    });

    logPrintDiagnostic("printWindow:write:start", { closed: win.closed });
    win.document.open();
    win.document.write("<html><head><title>Printo</title>");
    win.document.write(
      '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/antd/4.16.13/antd.min.css" />'
    );
    win.document.write(`
      <style>
        ${INVOICE_PRINT_STYLES}
        @media print {
          .print-container { page-break-inside: avoid; }
        }
      </style>
    `);
    win.document.write("</head><body>");
    win.document.write(printContents);
    win.document.write("</body></html>");
    win.document.close();
    win.focus();
    logPrintDiagnostic("printWindow:write:complete", {
      closed: win.closed,
      htmlLength: printContents.length,
    });
    setTimeout(() => {
      try {
        if (!win.closed) {
          logPrintDiagnostic("printWindow:print:trigger", { closed: win.closed });
          win.focus();
          win.print();
        } else {
          logPrintDiagnostic("printWindow:print:skipped", {
            reason: "window already closed",
          });
        }
      } finally {
        logPrintDiagnostic("printWindow:print:finally");
        onPrintTriggered?.();
      }
    }, 500);

    return true;
  };

  const handlePrint = async () => {
    if (printInProgressRef.current) {
      logPrintDiagnostic("handlePrint:blocked", {
        reason: "print already in progress",
      });
      return;
    }

    logPrintDiagnostic("handlePrint:start");
    const isArchivedReprint = Boolean(location.state?.archivedInvoice);
    const shouldIssueBeforePrint = !isArchivedReprint || archivedSnapshotDirty;

    logPrintDiagnostic("handlePrint:flow", {
      isArchivedReprint,
      archivedSnapshotDirty,
      shouldIssueBeforePrint,
    });

    if (shouldIssueBeforePrint) {
      const preflightPayload = buildArchivePayload();
      const blockReason = getIssueBlockReason(preflightPayload);
      if (blockReason) {
        logPrintDiagnostic("handlePrint:preflightBlocked", {
          reason: blockReason,
          ...summarizeArchivePayload(preflightPayload),
        });
        warnIssueBlocked(blockReason);
        return;
      }
    }

    const printWindow = openBlankPrintWindow();
    if (!printWindow) {
      logPrintDiagnostic("handlePrint:aborted", {
        reason: "popup unavailable",
      });
      return;
    }

    printInProgressRef.current = true;
    let releasePrintLock = true;

    if (shouldIssueBeforePrint) {
      setPrintLoading(true);
    }

    try {
      if (shouldIssueBeforePrint) {
        const issued = await issueInvoice({ showArchiveMessage: false });
        logPrintDiagnostic("handlePrint:issueResult", { issued });
        if (!issued) {
          closePrintWindow(printWindow, "issueInvoice returned false");
          return;
        }
      }

      const rendered = renderPrintWindow(printWindow, () => {
        logPrintDiagnostic("handlePrint:printCallback");
        printInProgressRef.current = false;
      });

      releasePrintLock = !rendered;
      logPrintDiagnostic("handlePrint:renderResult", {
        rendered,
        releasePrintLock,
      });
    } finally {
      if (shouldIssueBeforePrint) {
        setPrintLoading(false);
      }

      if (releasePrintLock) {
        printInProgressRef.current = false;
      }
      logPrintDiagnostic("handlePrint:cleanup", {
        releasePrintLock,
        shouldIssueBeforePrint,
        windowClosed: Boolean(printWindow.closed),
      });
    }
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
      >
        <style>{INVOICE_PRINT_STYLES}</style>
        <div className="invoice-letterhead">
          <div className="invoice-brand">
            <img
              src={
                process.env.NODE_ENV === "development"
                  ? "/prolux-logo.png"
                  : "./prolux-logo.png"
              }
              alt="ProLux Group Logo"
              className="invoice-logo"
            />
            <div>
              <h2 className="invoice-company-name">PROLUX GROUP</h2>
              <div className="invoice-company-tagline">
                Superior Natural Surfaces
              </div>
            </div>
          </div>
          <div className="invoice-company-details">
            <div>PROLUX Group - Superior Natural Surfaces</div>
            <div>Address: 11 Noemvri br.52</div>
            <div>Email: proluxceramics01@gmail.com</div>
            <div>Tel: 071/764/334</div>
          </div>
        </div>

        <div className="invoice-heading-row">
          <h1 className="invoice-title">{labels.title}</h1>
        </div>

        <div className="invoice-meta-grid">
          <label className="invoice-field">
            <span className="invoice-field-label">
              {labels.customerPlaceholder}
            </span>
            <Input
              value={header.customer}
              onChange={(e) => handleHeaderChange("customer", e.target.value)}
              bordered={false}
            />
          </label>
          <label className="invoice-field">
            <span className="invoice-field-label">{labels.datePlaceholder}</span>
            <Input
              value={header.date}
              onChange={(e) => handleHeaderChange("date", e.target.value)}
              bordered={false}
            />
          </label>
          <label className="invoice-field">
            <span className="invoice-field-label">
              {labels.invoicePlaceholder}
            </span>
            <Input value={header.invoice} readOnly bordered={false} />
          </label>
        </div>

        <Table
          columns={columns.map((col) => ({
            ...col,
            render: (text, _record, idx) => {
              const row = rows[idx] || {};

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
                    <Input bordered={false} />
                  </AutoComplete>
                );
              }

              const isAutoTotal = col.dataIndex === "total";
              return (
                <Input
                  value={textValue(row[col.dataIndex])}
                  onChange={
                    isAutoTotal
                      ? undefined
                      : (e) =>
                          handleRowChange(idx, col.dataIndex, e.target.value)
                  }
                  readOnly={isAutoTotal}
                  suffix={
                    col.dataIndex === "m2pcs" && row.stockUnit
                      ? row.stockUnit
                      : undefined
                  }
                  bordered={false}
                />
              );
            },
          }))}
          dataSource={rows}
          pagination={false}
          bordered
          size="small"
          tableLayout="fixed"
          className="invoice-items-table"
        />

        <div className="invoice-detail-row">
          <div className="invoice-description-box">
            <div className="invoice-section-title">{labels.description}</div>
            {description.map((desc, idx) => (
              <div
                key={idx}
                className="invoice-description-line"
              >
                <span className="invoice-description-index">{idx + 1}</span>
                <Input
                  value={desc}
                  onChange={(e) => handleDescriptionChange(idx, e.target.value)}
                  bordered={false}
                />
              </div>
            ))}
          </div>

          <div className="invoice-totals-panel">
            <div className="invoice-section-title">{labels.columns.total}</div>
            <div className="invoice-total-row">
              <span className="invoice-total-label">{labels.discount}</span>
              <Input
                className="invoice-adjustment-input"
                placeholder="0"
                value={discountPercent}
                onChange={(e) => {
                  markInvoiceEdited();
                  setDiscountPercent(e.target.value);
                }}
                bordered={false}
              />
            </div>
            <div className="invoice-total-row">
              <span className="invoice-total-label">{labels.advance}</span>
              <Input
                className="invoice-adjustment-input"
                placeholder="0"
                value={advancePayment}
                onChange={(e) => {
                  markInvoiceEdited();
                  setAdvancePayment(e.target.value);
                }}
                bordered={false}
              />
            </div>
            <div className="invoice-total-row">
              <span className="invoice-total-label">{labels.eurRate}</span>
              <Input
                className="invoice-adjustment-input"
                placeholder={formatExchangeRateInput(EUR_EXCHANGE_RATE)}
                value={eurExchangeRateInput}
                onChange={(e) => handleEurExchangeRateChange(e.target.value)}
                bordered={false}
              />
            </div>
            <div className="invoice-total-row">
              <span className="invoice-total-label">{labels.subtotal}</span>
              <span className="invoice-total-value">
                {formatCurrency(totals.lineSubtotal)}
              </span>
            </div>
            <div className="invoice-total-row">
              <span className="invoice-total-label">
                {labels.discountRow(totals.discountPercent)}
              </span>
              <span className="invoice-total-value">
                - {formatCurrency(totals.discountAmount)}
              </span>
            </div>
            <div className="invoice-total-row">
              <span className="invoice-total-label">
                {labels.totalAfterDiscount}
              </span>
              <span className="invoice-total-value">
                {formatCurrency(totals.totalAfterDiscount)}
              </span>
            </div>
            <div className="invoice-total-row invoice-eur-total">
              <span className="invoice-total-label">{labels.totalInEur}</span>
              <span className="invoice-total-value">
                {formatEurFromBase(totals.totalAfterDiscount, eurExchangeRate)}
              </span>
            </div>
            <div className="invoice-total-row">
              <span className="invoice-total-label">{labels.advanceRow}</span>
              <span className="invoice-total-value">
                - {formatCurrency(totals.advance)}
              </span>
            </div>
            <div className="invoice-total-row invoice-grand-total">
              <span>{labels.balanceDue}</span>
              <span>{formatCurrency(totals.balanceDue)}</span>
            </div>
          </div>
        </div>

        <div className="invoice-footer">
          <div>
            {labels.footer}
            <div className="invoice-socials">
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
