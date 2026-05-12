/**
 * Line subtotal = sum of row line totals. Discount % applies only to that subtotal.
 * Advance is a fixed amount in main currency (MKD). Balance due cannot go below zero for display.
 */
export function parseInvoiceNumberInput(value) {
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
}

export function calculateInvoiceLineTotal(row) {
  const quantity = parseInvoiceNumberInput(
    row?.m2pcs ?? row?.m2Pcs ?? row?.quantity ?? row?.qty
  );
  const price = parseInvoiceNumberInput(
    row?.price ?? row?.unitPrice ?? row?.sellPrice
  );

  if (!Number.isFinite(quantity) || !Number.isFinite(price)) {
    return null;
  }

  return Math.round(quantity * price * 100) / 100;
}

export function formatInvoiceLineTotal(row) {
  const total = calculateInvoiceLineTotal(row);
  return total === null ? "" : total.toFixed(2);
}

export function computeInvoiceTotals(rows, discountPercentStr, advanceStr) {
  const lineSubtotal = rows.reduce(
    (sum, r) => sum + (parseInvoiceNumberInput(r.total) || 0),
    0
  );
  const pctRaw = parseInvoiceNumberInput(discountPercentStr);
  const pct = Math.min(100, Math.max(0, Number.isFinite(pctRaw) ? pctRaw : 0));
  const discountAmount = lineSubtotal * (pct / 100);
  const totalAfterDiscount = lineSubtotal - discountAmount;
  const advanceRaw = parseInvoiceNumberInput(advanceStr);
  const advance = Math.max(0, Number.isFinite(advanceRaw) ? advanceRaw : 0);
  const balanceDue = Math.max(0, totalAfterDiscount - advance);
  return {
    lineSubtotal,
    discountPercent: pct,
    discountAmount,
    totalAfterDiscount,
    advance,
    balanceDue,
  };
}

export function formatMkd(value) {
  const n = Number(value) || 0;
  return `${n.toFixed(2)} ден`;
}
