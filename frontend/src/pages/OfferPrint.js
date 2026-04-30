import React, { useRef, useMemo } from "react";
import {
  Button,
  Table,
  Input,
  Card,
  Typography,
  Space,
  Row,
  Col,
} from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import { computeInvoiceTotals, formatMkd } from "../utils/invoiceTotals";

const { Title, Text } = Typography;

const columns = [
  { title: "ITEM", dataIndex: "item", width: 60 },
  { title: "Name", dataIndex: "name" },
  { title: "Materials", dataIndex: "materials" },
  { title: "m2/pcs", dataIndex: "m2pcs", width: 80 },
  { title: "Price", dataIndex: "price", width: 80 },
  { title: "Total", dataIndex: "total", width: 80 },
];

const initialRows = Array.from({ length: 8 }, (_, i) => ({
  key: i,
  item: i + 1,
  name: "",
  materials: "",
  m2pcs: "",
  price: "",
  total: "",
}));

/** Same line table and totals logic as the invoice; title and wording for commercial offers. */
function OfferPrint() {
  const [rows, setRows] = React.useState(initialRows);
  const [header, setHeader] = React.useState({
    customer: "",
    date: "",
    offer: "",
  });
  const [discountPercent, setDiscountPercent] = React.useState("");
  const [advancePayment, setAdvancePayment] = React.useState("");
  const [description, setDescription] = React.useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const printRef = useRef();

  const totals = useMemo(
    () => computeInvoiceTotals(rows, discountPercent, advancePayment),
    [rows, discountPercent, advancePayment]
  );

  const handleRowChange = (idx, field, value) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
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
    const printContents = printRef.current.innerHTML;
    const win = window.open("", "", "height=900,width=1200");
    win.document.write("<html><head><title>Ofertë</title>");
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

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<PrinterOutlined />} type="primary" onClick={handlePrint}>
          Printo ofertën
        </Button>
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
            fontSize: "18px",
            letterSpacing: 1,
          }}
        >
          OFERTË TREGTARE / COMMERCIAL OFFER
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Input
            placeholder="Klienti / Customer"
            value={header.customer}
            onChange={(e) => handleHeaderChange("customer", e.target.value)}
            style={{ width: 250 }}
            bordered={false}
          />
          <Input
            placeholder="Data"
            value={header.date}
            onChange={(e) => handleHeaderChange("date", e.target.value)}
            style={{ width: 150 }}
            bordered={false}
          />
          <Input
            placeholder="Nr. oferte"
            value={header.offer}
            onChange={(e) => handleHeaderChange("offer", e.target.value)}
            style={{ width: 150 }}
            bordered={false}
          />
        </div>
        <Table
          columns={columns.map((col) => ({
            ...col,
            render: (text, record, idx) => (
              <Input
                value={rows[idx][col.dataIndex]}
                onChange={(e) =>
                  handleRowChange(idx, col.dataIndex, e.target.value)
                }
                bordered={false}
                style={{
                  background: "transparent",
                  borderBottom: "2px solid #000",
                  minWidth: 40,
                }}
              />
            ),
          }))}
          dataSource={rows}
          pagination={false}
          bordered
          style={{ marginBottom: 12 }}
        />
        <div style={{ marginBottom: 12 }}>
          <Card size="small" title={<b>Përshkrimi / Notes</b>} bordered={false}>
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
            <Text strong>Zbritja (%)</Text>
            <Input
              placeholder="0"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              suffix="%"
              style={{ marginTop: 4 }}
            />
          </Col>
          <Col xs={24} sm={12}>
            <Text strong>Avans i propozuar (MKD)</Text>
            <Input
              placeholder="0"
              value={advancePayment}
              onChange={(e) => setAdvancePayment(e.target.value)}
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
            <Text>Nëntotali</Text>
            <Text strong>{formatMkd(totals.lineSubtotal)}</Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Text>Zbritja ({totals.discountPercent}%)</Text>
            <Text strong>- {formatMkd(totals.discountAmount)}</Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Text>Total pas zbritjes</Text>
            <Text strong>{formatMkd(totals.totalAfterDiscount)}</Text>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <Text>Avans</Text>
            <Text strong>- {formatMkd(totals.advance)}</Text>
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
            <Text strong>Për të paguar (ofertë)</Text>
            <Text strong>{formatMkd(totals.balanceDue)}</Text>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 11,
            color: "#666",
            fontStyle: "italic",
          }}
        >
          Kjo ofertë nuk llogaritet si faturë derisa të konfirmohet porosia.
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
            <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
              <span>www.proluxgroup.com</span>
            </div>
          </div>
          <div>Mob: 071/764/334</div>
        </div>
      </div>
    </div>
  );
}

export default OfferPrint;
