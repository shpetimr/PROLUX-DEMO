import dayjs from "dayjs";

export const FISCAL_RECEIPT_ROW_COUNT = 8;
export const FISCAL_RECEIPT_PAPER_WIDTHS = {
  FiftyEight: "58",
  Eighty: "80",
};

export const textValue = (value) =>
  value === null || value === undefined ? "" : String(value);

export const readProperty = (source, keys) => {
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

export const readText = (source, keys, fallback = "") => {
  const value = readProperty(source, keys);
  return value === null || value === undefined ? fallback : String(value);
};

export const createFiscalClientRequestId = () => {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `fiscal-receipt-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

export const parseFiscalNumberInput = (value) => {
  if (value === null || value === undefined) {
    return NaN;
  }

  const normalized = String(value).trim().replace(/,/g, ".");
  const matches = normalized.matchAll(/[-+]?(?:\d+\.?\d*|\.\d+)/g);

  for (const match of matches) {
    const previous = match.index > 0 ? normalized[match.index - 1] : "";
    const previousIsLetter =
      previous && previous.toLowerCase() !== previous.toUpperCase();
    if (!previousIsLetter) {
      return Number(match[0]);
    }
  }

  return NaN;
};

export const calculateFiscalLineTotal = (row) => {
  const quantity = parseFiscalNumberInput(
    row?.quantity ?? row?.qty ?? row?.m2pcs ?? row?.m2Pcs
  );
  const price = parseFiscalNumberInput(
    row?.sellPrice ?? row?.price ?? row?.unitPrice
  );

  if (!Number.isFinite(quantity) || !Number.isFinite(price)) {
    return null;
  }

  return Math.round(quantity * price * 100) / 100;
};

export const getFiscalLineTotal = (row) => {
  const stored = parseFiscalNumberInput(row?.lineTotal ?? row?.total);
  if (Number.isFinite(stored)) {
    return stored;
  }

  return calculateFiscalLineTotal(row) ?? 0;
};

export const formatFiscalLineTotal = (row) => {
  const total = calculateFiscalLineTotal(row);
  return total === null ? "" : total.toFixed(2);
};

export const formatFiscalReceiptMoney = (value) =>
  `${Number(value || 0).toFixed(2)} MKD`;

export const formatFiscalReceiptDateTime = (value) => {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm") : "-";
};

export const hasFiscalReceiptLine = (row) =>
  Boolean(
    textValue(row?.name).trim() ||
      textValue(row?.quantity ?? row?.m2pcs).trim() ||
      textValue(row?.sellPrice ?? row?.price).trim() ||
      textValue(row?.lineTotal ?? row?.total).trim()
  );

export const normalizeFiscalPaperWidth = (value) =>
  value === FISCAL_RECEIPT_PAPER_WIDTHS.FiftyEight
    ? FISCAL_RECEIPT_PAPER_WIDTHS.FiftyEight
    : FISCAL_RECEIPT_PAPER_WIDTHS.Eighty;

export const normalizeFiscalReceiptRows = (items, minCount = 0) => {
  const sourceItems = Array.isArray(items) ? items : [];
  const rowCount = Math.max(minCount, sourceItems.length);

  return Array.from({ length: rowCount }, (_, index) => {
    const item = sourceItems[index] || {};
    const stockUnit = readText(item, ["stockUnit", "unitType", "unitLabel"]);
    const unit = readText(item, ["unit"], stockUnit || "pcs");
    const row = {
      key: index,
      item: readText(item, ["item", "itemNumber", "number"], String(index + 1)),
      name: readText(item, ["name", "itemName", "description"]),
      quantity: readText(item, ["quantity", "qty", "m2pcs", "m2Pcs"]),
      unit,
      stockItemId: readProperty(item, ["stockItemId", "stockId"]) ?? null,
      stockSku: readText(item, ["stockSku", "sku"]),
      stockType: readText(item, ["stockType"]),
      stockUnit: stockUnit || unit,
      sellPrice: readText(item, ["sellPrice", "price", "unitPrice"]),
      lineTotal: readText(item, ["lineTotal", "total"]),
    };

    if (!row.lineTotal) {
      row.lineTotal = formatFiscalLineTotal(row);
    }

    return row;
  });
};

export const parseFiscalReceiptSnapshot = (receipt) => {
  try {
    const parsed = JSON.parse(receipt?.itemsJson || "{}");
    const root = parsed && typeof parsed === "object" ? parsed : {};
    const items = Array.isArray(root)
      ? root
      : readProperty(root, ["items", "rows", "lines"]);
    const totals = readProperty(root, ["totals"]) || {};

    return {
      date: readText(root, ["date", "receiptDate", "printedAt"]),
      items,
      notes: readText(root, ["notes", "description"]),
      paperWidth: readText(root, ["paperWidth"]),
      totals,
    };
  } catch {
    return {
      date: "",
      items: [],
      notes: "",
      paperWidth: "",
      totals: {},
    };
  }
};

export const normalizeFiscalReceiptForPreview = (
  receipt,
  { fallbackRows = [], paperWidth = FISCAL_RECEIPT_PAPER_WIDTHS.Eighty } = {}
) => {
  const snapshot = parseFiscalReceiptSnapshot(receipt);
  const rows = normalizeFiscalReceiptRows(snapshot.items, 0).filter(
    hasFiscalReceiptLine
  );
  const fallbackTotal = fallbackRows.reduce(
    (sum, row) => sum + getFiscalLineTotal(row),
    0
  );
  const subtotal =
    readProperty(snapshot.totals, ["subtotal", "lineSubtotal"]) ??
    receipt?.subtotal ??
    receipt?.Subtotal ??
    fallbackTotal;
  const total =
    readProperty(snapshot.totals, ["total"]) ??
    receipt?.total ??
    receipt?.Total ??
    subtotal;

  return {
    receiptNumber: readText(receipt, ["receiptNumber", "ReceiptNumber"]),
    customerName: readText(receipt, ["customerName", "CustomerName"]),
    customerPhone: readText(receipt, ["customerPhone", "CustomerPhone"]),
    dateTime:
      snapshot.date ||
      readProperty(receipt, ["printedAt", "PrintedAt"]) ||
      readProperty(receipt, ["archivedAt", "ArchivedAt"]) ||
      readProperty(receipt, ["createdAt", "CreatedAt"]),
    rows: rows.length > 0 ? rows : fallbackRows.filter(hasFiscalReceiptLine),
    subtotal,
    total,
    notes:
      snapshot.notes ||
      readText(receipt, ["notes", "Notes"]) ||
      readText(receipt, ["description", "Description"]),
    paperWidth: normalizeFiscalPaperWidth(snapshot.paperWidth || paperWidth),
  };
};
