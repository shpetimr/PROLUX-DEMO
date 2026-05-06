import React, { useCallback, useEffect, useState } from "react";
import { Button, Space, Table, Tag, Typography, message } from "antd";
import {
  DownloadOutlined,
  FilePdfOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import apiClient, { API_ENDPOINTS } from "../config/api";

const { Title } = Typography;

const formatMoney = (value) => `${Number(value || 0).toFixed(2)} MKD`;

const buildFallbackFileName = (invoiceNumber) => {
  const safeInvoiceNumber = String(invoiceNumber || "invoice")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim();

  return `ArchivedInvoice-${safeInvoiceNumber || "invoice"}.pdf`;
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

function InvoiceArchive() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportingId, setExportingId] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.INVOICE_ARCHIVE);
      setInvoices(Array.isArray(response.data) ? response.data : []);
    } catch {
      message.error("Archived invoices could not be loaded.");
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
      message.success("PDF exported.");
    } catch {
      message.error("PDF export failed.");
    } finally {
      setExportingId(null);
    }
  };

  const columns = [
    {
      title: "Invoice",
      dataIndex: "invoiceNumber",
      key: "invoiceNumber",
      ellipsis: true,
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      key: "customerName",
      ellipsis: true,
    },
    {
      title: "Language",
      dataIndex: "language",
      key: "language",
      width: 130,
      render: (language) => (
        <Tag color={language === "Macedonian" ? "purple" : "blue"}>
          {language}
        </Tag>
      ),
    },
    {
      title: "Subtotal",
      dataIndex: "subtotal",
      key: "subtotal",
      width: 130,
      align: "right",
      render: formatMoney,
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      width: 130,
      align: "right",
      render: formatMoney,
    },
    {
      title: "Archived",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (value) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-"),
    },
    {
      title: "Created by",
      dataIndex: "createdByFullName",
      key: "createdByFullName",
      ellipsis: true,
    },
    {
      title: "Actions",
      key: "actions",
      width: 130,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<DownloadOutlined />}
          loading={exportingId === record.id}
          onClick={() => exportPdf(record)}
        >
          PDF
        </Button>
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
            Archived Invoices
          </Title>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={fetchInvoices}>
          Refresh
        </Button>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={invoices}
        scroll={{ x: 980 }}
        pagination={{ pageSize: 15, showTotal: (total) => `${total} invoices` }}
      />
    </div>
  );
}

export default InvoiceArchive;
