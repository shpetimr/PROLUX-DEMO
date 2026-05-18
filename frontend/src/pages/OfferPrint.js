import React, { useMemo, useRef, useState } from "react";
import { Button, Table, Input, Space, message } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import {
  computeInvoiceTotals,
  EUR_EXCHANGE_RATE,
  formatEurFromBase,
  formatInvoiceLineTotal,
  parsePositiveExchangeRate,
} from "../utils/invoiceTotals";

const PRINT_OFFER_ROW_COUNT = 14;
const DESCRIPTION_LINE_COUNT = 7;

const OFFER_PRINT_STYLES = `
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

  .offer-informational-note {
    margin-top: 9px;
    padding-top: 7px;
    border-top: 1px solid #e1e1e1;
    color: #555555;
    font-size: 9px;
    font-style: italic;
    line-height: 1.35;
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

const OFFER_LABELS = {
  print: "Printo ofertën",
  title: "OFERTË",
  customerPlaceholder: "Emri i klientit",
  datePlaceholder: "Data",
  offerPlaceholder: "Nr. oferte",
  description: "Përshkrimi / Shënime",
  discount: "Zbritja (%)",
  advance: "Avans i propozuar (MKD)",
  eurRate: "Kursi EUR/MKD",
  subtotal: "Nëntotali (shuma e rreshtave)",
  discountRow: (percent) => `Zbritja (${percent}%)`,
  totalAfterDiscount: "Totali pas zbritjes",
  totalInEur: "Totali i ofertës në EUR",
  advanceRow: "Avans i propozuar",
  balanceDue: "Për t'u paguar (ofertë)",
  currency: "MKD",
  footer: "Për çdo informacion shtesë mund të na kontaktoni:",
  informationalNote:
    "Kjo ofertë është informative dhe nuk llogaritet si faturë derisa të konfirmohet porosia.",
  popupBlocked: "Dritarja e printimit u bllokua nga shfletuesi.",
  columns: {
    item: "Nr.",
    name: "Emri",
    materials: "Materialet",
    quantity: "m2/pcs",
    price: "Çmimi",
    total: "Totali",
  },
};

const createEmptyRows = () =>
  Array.from({ length: PRINT_OFFER_ROW_COUNT }, (_, i) => ({
    key: i,
    item: i + 1,
    name: "",
    materials: "",
    m2pcs: "",
    price: "",
    total: "",
  }));

const createDescriptionLines = () =>
  Array.from({ length: DESCRIPTION_LINE_COUNT }, () => "");

const textValue = (value) =>
  value === null || value === undefined ? "" : String(value);

const recalculateRowTotal = (row) => ({
  ...row,
  total: formatInvoiceLineTotal(row),
});

const formatExchangeRateInput = (value) => {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? String(rate) : String(EUR_EXCHANGE_RATE);
};

function OfferPrint() {
  const labels = OFFER_LABELS;
  const [rows, setRows] = useState(createEmptyRows);
  const [header, setHeader] = useState({
    customer: "",
    date: "",
    offer: "",
  });
  const [discountPercent, setDiscountPercent] = useState("");
  const [advancePayment, setAdvancePayment] = useState("");
  const [eurExchangeRateInput, setEurExchangeRateInput] = useState(
    formatExchangeRateInput(EUR_EXCHANGE_RATE)
  );
  const [description, setDescription] = useState(createDescriptionLines);
  const printRef = useRef();

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

  const totals = useMemo(
    () => computeInvoiceTotals(rows, discountPercent, advancePayment),
    [rows, discountPercent, advancePayment]
  );

  const eurExchangeRate = useMemo(
    () => parsePositiveExchangeRate(eurExchangeRateInput, EUR_EXCHANGE_RATE),
    [eurExchangeRateInput]
  );

  const formatCurrency = (value) => {
    const amount = Number(value) || 0;
    return `${amount.toFixed(2)} ${labels.currency}`;
  };

  const handleRowChange = (idx, field, value) => {
    setRows((prev) => {
      const updated = [...prev];
      let row = { ...updated[idx], [field]: value };
      if (field === "m2pcs" || field === "price") {
        row = recalculateRowTotal(row);
      }
      updated[idx] = row;
      return updated;
    });
  };

  const handleHeaderChange = (field, value) => {
    setHeader((prev) => ({ ...prev, [field]: value }));
  };

  const handleDescriptionChange = (idx, value) => {
    setDescription((prev) => {
      const updated = [...prev];
      updated[idx] = value;
      return updated;
    });
  };

  const handlePrint = () => {
    if (!printRef.current) {
      return;
    }

    const win = window.open("", "", "height=900,width=1200");
    if (!win) {
      message.error(labels.popupBlocked);
      return;
    }

    const printContents = printRef.current.outerHTML;
    win.document.open();
    win.document.write("<html><head><title>Ofertë</title>");
    win.document.write(
      '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/antd/4.16.13/antd.min.css" />'
    );
    win.document.write(`
      <style>
        ${OFFER_PRINT_STYLES}
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
    setTimeout(() => {
      if (!win.closed) {
        win.focus();
        win.print();
      }
    }, 500);
  };

  return (
    <div>
      <Space
        direction="vertical"
        size="middle"
        style={{ marginBottom: 24, width: "100%" }}
      >
        <Space wrap align="start">
          <Button icon={<PrinterOutlined />} type="primary" onClick={handlePrint}>
            {labels.print}
          </Button>
        </Space>
      </Space>

      <div ref={printRef} className="print-container">
        <style>{OFFER_PRINT_STYLES}</style>
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
            <span className="invoice-field-label">{labels.offerPlaceholder}</span>
            <Input
              value={header.offer}
              onChange={(e) => handleHeaderChange("offer", e.target.value)}
              bordered={false}
            />
          </label>
        </div>

        <Table
          columns={columns.map((col) => ({
            ...col,
            render: (_text, _record, idx) => {
              const row = rows[idx] || {};

              return (
                <Input
                  value={textValue(row[col.dataIndex])}
                  onChange={(e) =>
                    handleRowChange(idx, col.dataIndex, e.target.value)
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
              <div key={idx} className="invoice-description-line">
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
                onChange={(e) => setDiscountPercent(e.target.value)}
                bordered={false}
              />
            </div>
            <div className="invoice-total-row">
              <span className="invoice-total-label">{labels.advance}</span>
              <Input
                className="invoice-adjustment-input"
                placeholder="0"
                value={advancePayment}
                onChange={(e) => setAdvancePayment(e.target.value)}
                bordered={false}
              />
            </div>
            <div className="invoice-total-row">
              <span className="invoice-total-label">{labels.eurRate}</span>
              <Input
                className="invoice-adjustment-input"
                placeholder={formatExchangeRateInput(EUR_EXCHANGE_RATE)}
                value={eurExchangeRateInput}
                onChange={(e) => setEurExchangeRateInput(e.target.value)}
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
            <div className="offer-informational-note">
              {labels.informationalNote}
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

export default OfferPrint;
