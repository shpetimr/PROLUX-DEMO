import React, { useCallback, useEffect, useState } from "react";
import { Button, Space, Table, Tag, Typography, message } from "antd";
import {
  DownloadOutlined,
  FilePdfOutlined,
  FolderOpenOutlined,
  PrinterOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import apiClient, { API_ENDPOINTS } from "../config/api";

const { Title } = Typography;

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} MKD`;

const buildFallbackFileName = (invoiceNumber) => {
  const safeInvoiceNumber = String(invoiceNumber || "fature")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim();

  return `FatureArkivuar-${safeInvoiceNumber || "fature"}.pdf`;
};

const getFileName = (response, invoiceNumber) => {
  const header = response.headers?.["content-disposition"];
  if (typeof header !== "string") {
    return buildFallbackFileName(invoiceNumber);
  }

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ""));
  }

  const fileNameMatch = header.match(/filename="?([^";]+)"?/i);
  return fileNameMatch?.[1] || buildFallbackFileName(invoiceNumber);
};

const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const getLanguageLabel = (language) =>
  language === "Macedonian" ? "Maqedonisht" : language === "Albanian" ? "Shqip" : language;

function InvoiceArchive() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportingId, setExportingId] = useState(null);
  const [printingId, setPrintingId] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.INVOICE_ARCHIVE);
      setInvoices(Array.isArray(response.data) ? response.data : []);
    } catch {
      message.error("Faturat e arkivuara nuk mund të ngarkoheshin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const exportPdf = async (invoice) => {
    setExportingId(invoice.id);
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.INVOICE_ARCHIVE_PDF(invoice.id),
        { responseType: "blob" }
      );
      downloadBlob(response.data, getFileName(response, invoice.invoiceNumber));
      message.success("PDF u eksportua.");
    } catch {
      message.error("Eksportimi i PDF dështoi.");
    } finally {
      setExportingId(null);
    }
  };

  const printPdf = async (invoice) => {
    setPrintingId(invoice.id);
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.INVOICE_ARCHIVE_PDF(invoice.id),
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(response.data);
      const iframe = document.createElement("iframe");

      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 300);
      };

      document.body.appendChild(iframe);
      iframe.src = url;
      setTimeout(() => {
        iframe.remove();
        window.URL.revokeObjectURL(url);
      }, 120000);
      message.success("Dritarja e printimit u hap.");
    } catch {
      message.error("Fatura e arkivuar nuk mund të printohej.");
    } finally {
      setPrintingId(null);
    }
  };

  const reopenInvoice = (invoice) => {
    navigate("/template-print", {
      state: {
        archivedInvoice: invoice,
      },
    });
  };

  const columns = [
    {
      title: "Fatura",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      ellipsis: true,
    },
    {
      title: "Klienti",
      dataIndex: "customerName",
      key: "customerName",
      ellipsis: true,
    },
    {
      title: "Gjuha",
      dataIndex: "language",
      key: "language",
      width: 130,
      render: (language) => (
        <Tag color={language === "Macedonian" ? "purple" : "blue"}>
          {getLanguageLabel(language)}
        </Tag>
      ),
    },
    {
      title: "Nëntotali",
      dataIndex: "subtotal",
      key: "subtotal",
      width: 130,
      align: "right",
      render: formatMoney,
    },
    {
      title: "Totali",
      dataIndex: "total",
      key: "total",
      width: 130,
      align: "right",
      render: formatMoney,
    },
    {
      title: "Arkivuar",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (value) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-"),
    },
    {
      title: "Krijuar nga",
      dataIndex: "createdByFullName",
      key: "createdByFullName",
      ellipsis: true,
    },
    {
      title: "Veprime",
      key: "actions",
      width: 260,
      render: (_, record) => (
        <Space wrap>
          <Button
            size="small"
            icon={<FolderOpenOutlined />}
            onClick={() => reopenInvoice(record)}
          >
            Hap
          </Button>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            loading={printingId === record.id}
            onClick={() => printPdf(record)}
          >
            Printo
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<DownloadOutlined />}
            loading={exportingId === record.id}
            onClick={() => exportPdf(record)}
          >
            PDF
          </Button>
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
        <Space align="center" size={12}>
          <FilePdfOutlined className="text-2xl text-red-600" />
          <Title level={2} style={{ margin: 0 }}>
            Faturat e Arkivuara
          </Title>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={fetchInvoices}>
          Rifresko
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={invoices}
        scroll={{ x: 980 }}
        pagination={{ pageSize: 15, showTotal: (total) => `${total} fatura` }}
      />
    </div>
  );
}

export default InvoiceArchive;
