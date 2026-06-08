import React from "react";
import {
  FISCAL_RECEIPT_PAPER_WIDTHS,
  formatFiscalReceiptDateTime,
  formatFiscalReceiptMoney,
  getFiscalLineTotal,
  hasFiscalReceiptLine,
  normalizeFiscalPaperWidth,
  textValue,
} from "../utils/fiscalReceipt";

const getLogoSrc = () => {
  const logoPath =
    process.env.NODE_ENV === "development" ? "/prolux-logo.png" : "./prolux-logo.png";

  if (typeof window === "undefined") {
    return logoPath;
  }

  try {
    return new URL(logoPath, window.location.href).toString();
  } catch {
    return logoPath;
  }
};

const escapeHtml = (value) =>
  textValue(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const getFiscalReceiptPrintStyles = (paperWidth) => {
  const normalizedWidth = normalizeFiscalPaperWidth(paperWidth);
  const widthMm =
    normalizedWidth === FISCAL_RECEIPT_PAPER_WIDTHS.FiftyEight ? 58 : 80;
  const fontSize = widthMm === 58 ? 10 : 11;

  return `
    @page {
      size: ${widthMm}mm auto;
      margin: 0;
    }

    .fiscal-receipt-print {
      width: ${widthMm}mm;
      max-width: 100%;
      margin: 0 auto;
      padding: ${widthMm === 58 ? "8px 7px" : "10px 12px"};
      box-sizing: border-box;
      background: #ffffff;
      color: #111827;
      border: 1px solid #e5e7eb;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
      font-family: Arial, Helvetica, sans-serif;
      font-size: ${fontSize}px;
      line-height: 1.28;
    }

    .fiscal-receipt-header {
      text-align: center;
      padding-bottom: 7px;
      border-bottom: 1px dashed #111827;
    }

    .fiscal-receipt-logo {
      width: ${widthMm === 58 ? 26 : 34}px;
      height: ${widthMm === 58 ? 26 : 34}px;
      object-fit: contain;
      margin-bottom: 3px;
    }

    .fiscal-receipt-business {
      margin: 0;
      font-size: ${widthMm === 58 ? 12 : 14}px;
      line-height: 1.12;
      font-weight: 700;
    }

    .fiscal-receipt-subtitle,
    .fiscal-receipt-company-line,
    .fiscal-receipt-meta {
      color: #374151;
    }

    .fiscal-receipt-subtitle {
      margin-top: 2px;
      font-size: ${widthMm === 58 ? 8 : 9}px;
      text-transform: uppercase;
    }

    .fiscal-receipt-company {
      margin-top: 5px;
      font-size: ${widthMm === 58 ? 8 : 9}px;
    }

    .fiscal-receipt-title {
      margin: 8px 0 6px;
      text-align: center;
      font-size: ${widthMm === 58 ? 12 : 14}px;
      font-weight: 700;
    }

    .fiscal-receipt-block {
      padding: 6px 0;
      border-top: 1px dashed #111827;
    }

    .fiscal-receipt-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      min-height: 15px;
    }

    .fiscal-receipt-row + .fiscal-receipt-row {
      margin-top: 2px;
    }

    .fiscal-receipt-label {
      color: #4b5563;
      white-space: nowrap;
    }

    .fiscal-receipt-value {
      min-width: 0;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .fiscal-receipt-item {
      padding: 5px 0;
      border-bottom: 1px dotted #d1d5db;
    }

    .fiscal-receipt-item-name {
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    .fiscal-receipt-item-meta {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 4px 8px;
      margin-top: 2px;
      color: #374151;
    }

    .fiscal-receipt-item-total {
      font-weight: 700;
      color: #111827;
      text-align: right;
    }

    .fiscal-receipt-total-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 4px;
      font-weight: 700;
    }

    .fiscal-receipt-grand-total {
      margin-top: 7px;
      padding-top: 7px;
      border-top: 2px solid #111827;
      font-size: ${widthMm === 58 ? 12 : 14}px;
    }

    .fiscal-receipt-footer {
      padding-top: 8px;
      border-top: 1px dashed #111827;
      text-align: center;
      color: #374151;
    }

    .fiscal-receipt-note {
      margin: 6px 0 0;
      overflow-wrap: anywhere;
    }

    @media screen and (max-width: 640px) {
      .fiscal-receipt-print {
        width: min(100%, ${widthMm}mm);
      }
    }

    @media print {
      html,
      body {
        width: ${widthMm}mm;
        min-height: auto;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }

      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .fiscal-receipt-print {
        width: ${widthMm}mm !important;
        max-width: none !important;
        margin: 0 !important;
        padding: ${widthMm === 58 ? "4mm 2.5mm" : "5mm 4mm"} !important;
        border: 0 !important;
        box-shadow: none !important;
      }
    }
  `;
};

const getReceiptTotals = (rows, subtotal, total) => {
  const visibleRows = rows.filter(hasFiscalReceiptLine);
  const subtotalValue =
    subtotal !== null && subtotal !== undefined
      ? subtotal
      : visibleRows.reduce((sum, row) => sum + getFiscalLineTotal(row), 0);
  const totalValue = total !== null && total !== undefined ? total : subtotalValue;

  return { visibleRows, subtotalValue, totalValue };
};

function FiscalReceiptPreview({
  receiptNumber,
  customerName,
  customerPhone,
  dateTime,
  rows = [],
  subtotal,
  total,
  notes,
  paperWidth = FISCAL_RECEIPT_PAPER_WIDTHS.Eighty,
}) {
  const normalizedWidth = normalizeFiscalPaperWidth(paperWidth);
  const { visibleRows, subtotalValue, totalValue } = getReceiptTotals(
    rows,
    subtotal,
    total
  );

  return (
    <div
      className="fiscal-receipt-print"
      data-paper-width={normalizedWidth}
    >
      <style>{getFiscalReceiptPrintStyles(normalizedWidth)}</style>
      <div className="fiscal-receipt-header">
        <img
          src={getLogoSrc()}
          alt="PROLUX Group"
          className="fiscal-receipt-logo"
        />
        <h2 className="fiscal-receipt-business">PROLUX GROUP</h2>
        <div className="fiscal-receipt-subtitle">Superior Natural Surfaces</div>
        <div className="fiscal-receipt-company">
          <div className="fiscal-receipt-company-line">
            Address: 11 Noemvri br.52
          </div>
          <div className="fiscal-receipt-company-line">
            Tel: 071/764/334
          </div>
        </div>
      </div>

      <div className="fiscal-receipt-title">LET\u00CBR FISKALE</div>

      <div className="fiscal-receipt-block">
        <div className="fiscal-receipt-row">
          <span className="fiscal-receipt-label">Nr.</span>
          <span className="fiscal-receipt-value">
            {receiptNumber || "Gjenerohet nga sistemi"}
          </span>
        </div>
        <div className="fiscal-receipt-row">
          <span className="fiscal-receipt-label">Data/Ora</span>
          <span className="fiscal-receipt-value">
            {formatFiscalReceiptDateTime(dateTime || new Date())}
          </span>
        </div>
        {customerName ? (
          <div className="fiscal-receipt-row">
            <span className="fiscal-receipt-label">Klienti</span>
            <span className="fiscal-receipt-value">{customerName}</span>
          </div>
        ) : null}
        {customerPhone ? (
          <div className="fiscal-receipt-row">
            <span className="fiscal-receipt-label">Tel.</span>
            <span className="fiscal-receipt-value">{customerPhone}</span>
          </div>
        ) : null}
      </div>

      <div className="fiscal-receipt-block">
        {visibleRows.length > 0 ? (
          visibleRows.map((row, index) => (
            <div className="fiscal-receipt-item" key={`${row.key ?? index}`}>
              <div className="fiscal-receipt-item-name">
                {index + 1}. {textValue(row.name)}
              </div>
              <div className="fiscal-receipt-item-meta">
                <span>
                  {textValue(row.quantity || row.m2pcs || "0")}{" "}
                  {textValue(row.unit || row.stockUnit || "")}
                </span>
                <span>
                  x {formatFiscalReceiptMoney(row.sellPrice || row.price)}
                </span>
                <span className="fiscal-receipt-item-total">
                  {formatFiscalReceiptMoney(getFiscalLineTotal(row))}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="fiscal-receipt-meta">Nuk ka artikuj.</div>
        )}
      </div>

      <div className="fiscal-receipt-block">
        <div className="fiscal-receipt-total-row">
          <span>N\u00EBntotali</span>
          <span>{formatFiscalReceiptMoney(subtotalValue)}</span>
        </div>
        <div className="fiscal-receipt-total-row fiscal-receipt-grand-total">
          <span>Totali</span>
          <span>{formatFiscalReceiptMoney(totalValue)}</span>
        </div>
      </div>

      <div className="fiscal-receipt-footer">
        <div>Faleminderit p\u00EBr blerjen!</div>
        <div>www.proluxgroup.com</div>
        {notes ? <p className="fiscal-receipt-note">{notes}</p> : null}
      </div>
    </div>
  );
}

export const buildFiscalReceiptPrintMarkup = ({
  receiptNumber,
  customerName,
  customerPhone,
  dateTime,
  rows = [],
  subtotal,
  total,
  notes,
  paperWidth = FISCAL_RECEIPT_PAPER_WIDTHS.Eighty,
}) => {
  const normalizedWidth = normalizeFiscalPaperWidth(paperWidth);
  const { visibleRows, subtotalValue, totalValue } = getReceiptTotals(
    rows,
    subtotal,
    total
  );
  const itemMarkup =
    visibleRows.length > 0
      ? visibleRows
          .map((row, index) => {
            const quantity = textValue(row.quantity || row.m2pcs || "0");
            const unit = textValue(row.unit || row.stockUnit || "");
            const price = formatFiscalReceiptMoney(row.sellPrice || row.price);
            const lineTotal = formatFiscalReceiptMoney(getFiscalLineTotal(row));

            return `
              <div class="fiscal-receipt-item">
                <div class="fiscal-receipt-item-name">
                  ${index + 1}. ${escapeHtml(row.name)}
                </div>
                <div class="fiscal-receipt-item-meta">
                  <span>${escapeHtml(quantity)} ${escapeHtml(unit)}</span>
                  <span>x ${escapeHtml(price)}</span>
                  <span class="fiscal-receipt-item-total">${escapeHtml(
                    lineTotal
                  )}</span>
                </div>
              </div>
            `;
          })
          .join("")
      : '<div class="fiscal-receipt-meta">Nuk ka artikuj.</div>';

  return `
    <div class="fiscal-receipt-print" data-paper-width="${escapeHtml(
      normalizedWidth
    )}">
      <style>${getFiscalReceiptPrintStyles(normalizedWidth)}</style>
      <div class="fiscal-receipt-header">
        <img src="${escapeHtml(getLogoSrc())}" alt="PROLUX Group" class="fiscal-receipt-logo" />
        <h2 class="fiscal-receipt-business">PROLUX GROUP</h2>
        <div class="fiscal-receipt-subtitle">Superior Natural Surfaces</div>
        <div class="fiscal-receipt-company">
          <div class="fiscal-receipt-company-line">Address: 11 Noemvri br.52</div>
          <div class="fiscal-receipt-company-line">Tel: 071/764/334</div>
        </div>
      </div>

      <div class="fiscal-receipt-title">LET&#203;R FISKALE</div>

      <div class="fiscal-receipt-block">
        <div class="fiscal-receipt-row">
          <span class="fiscal-receipt-label">Nr.</span>
          <span class="fiscal-receipt-value">${escapeHtml(
            receiptNumber || "Gjenerohet nga sistemi"
          )}</span>
        </div>
        <div class="fiscal-receipt-row">
          <span class="fiscal-receipt-label">Data/Ora</span>
          <span class="fiscal-receipt-value">${escapeHtml(
            formatFiscalReceiptDateTime(dateTime || new Date())
          )}</span>
        </div>
        ${
          customerName
            ? `<div class="fiscal-receipt-row">
                <span class="fiscal-receipt-label">Klienti</span>
                <span class="fiscal-receipt-value">${escapeHtml(
                  customerName
                )}</span>
              </div>`
            : ""
        }
        ${
          customerPhone
            ? `<div class="fiscal-receipt-row">
                <span class="fiscal-receipt-label">Tel.</span>
                <span class="fiscal-receipt-value">${escapeHtml(
                  customerPhone
                )}</span>
              </div>`
            : ""
        }
      </div>

      <div class="fiscal-receipt-block">${itemMarkup}</div>

      <div class="fiscal-receipt-block">
        <div class="fiscal-receipt-total-row">
          <span>N&#235;ntotali</span>
          <span>${escapeHtml(formatFiscalReceiptMoney(subtotalValue))}</span>
        </div>
        <div class="fiscal-receipt-total-row fiscal-receipt-grand-total">
          <span>Totali</span>
          <span>${escapeHtml(formatFiscalReceiptMoney(totalValue))}</span>
        </div>
      </div>

      <div class="fiscal-receipt-footer">
        <div>Faleminderit p&#235;r blerjen!</div>
        <div>www.proluxgroup.com</div>
        ${notes ? `<p class="fiscal-receipt-note">${escapeHtml(notes)}</p>` : ""}
      </div>
    </div>
  `;
};

export const openFiscalReceiptPrintWindow = (paperWidth) => {
  const normalizedWidth = normalizeFiscalPaperWidth(paperWidth);
  const widthPx =
    normalizedWidth === FISCAL_RECEIPT_PAPER_WIDTHS.FiftyEight ? 360 : 460;
  const win = window.open("", "", `height=900,width=${widthPx}`);

  if (!win) {
    return null;
  }

  win.document.open();
  win.document.write(
    "<!doctype html><html><head><title>Printo</title></head><body></body></html>"
  );
  win.document.close();
  win.focus();
  return win;
};

export const closeFiscalReceiptPrintWindow = (win) => {
  try {
    if (win && !win.closed) {
      win.close();
    }
  } catch {
    // The browser can deny access after the print window is closed.
  }
};

export const writeFiscalReceiptPrintWindow = (
  win,
  receiptProps,
  { title = "Let\u00EBr Fiskale", onPrintTriggered } = {}
) => {
  if (!win || win.closed) {
    return false;
  }

  const markup = buildFiscalReceiptPrintMarkup(receiptProps);
  win.document.open();
  win.document.write("<!doctype html><html><head><meta charset=\"utf-8\" />");
  win.document.write(`<title>${escapeHtml(title)}</title>`);
  win.document.write("</head><body>");
  win.document.write(markup);
  win.document.write("</body></html>");
  win.document.close();
  win.focus();

  setTimeout(() => {
    try {
      if (!win.closed) {
        win.focus();
        win.print();
      }
    } finally {
      onPrintTriggered?.();
    }
  }, 350);

  return true;
};

export default FiscalReceiptPreview;
