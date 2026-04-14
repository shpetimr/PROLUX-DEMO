/**
 * Line subtotal = sum of row line totals. Discount % applies only to that subtotal.
 * Advance is a fixed amount in main currency (MKD). Balance due cannot go below zero for display.
 */
export function computeInvoiceTotals(rows, discountPercentStr, advanceStr) {
  const lineSubtotal = rows.reduce(
    (sum, r) => sum + (parseFloat(r.total) || 0),
    0
  );
  const pctRaw = parseFloat(String(discountPercentStr).replace(",", "."));
  const pct = Math.min(100, Math.max(0, Number.isFinite(pctRaw) ? pctRaw : 0));
  const discountAmount = lineSubtotal * (pct / 100);
  const totalAfterDiscount = lineSubtotal - discountAmount;
  const advanceRaw = parseFloat(String(advanceStr).replace(",", "."));
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
