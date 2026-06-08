import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Modal,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  EyeOutlined,
  FolderOpenOutlined,
  PrinterOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import FiscalReceiptPreview, {
  closeFiscalReceiptPrintWindow,
  openFiscalReceiptPrintWindow,
  writeFiscalReceiptPrintWindow,
} from "../components/FiscalReceiptPreview";
import apiClient, { API_ENDPOINTS } from "../config/api";
import {
  FISCAL_RECEIPT_PAPER_WIDTHS,
  formatFiscalReceiptMoney,
  normalizeFiscalReceiptForPreview,
  textValue,
} from "../utils/fiscalReceipt";

const { Search } = Input;
const { Title } = Typography;

const PAGE_STYLES = `
  .fiscal-archive-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .fiscal-archive-preview-shell {
    display: flex;
    justify-content: center;
    max-height: 70dvh;
    overflow: auto;
    padding: 12px;
    border-radius: 8px;
    background: #f9fafb;
  }

  @media (max-width: 767px) {
    .fiscal-archive-toolbar {
      align-items: stretch;
      flex-direction: column;
    }

    .fiscal-archive-toolbar .ant-space,
    .fiscal-archive-toolbar .ant-input-search,
    .fiscal-archive-toolbar .ant-btn,
    .fiscal-archive-toolbar .ant-segmented {
      width: 100%;
    }
  }
`;

const LABELS = {
  title: "Arkiva e Letrave Fiskale",
  search: "K\u00EBrko sipas numrit, klientit ose krijuesit",
  refresh: "Rifresko",
  view: "Detaje",
  reprint: "Riprinto",
  detailsTitle: "Detajet e letr\u00EBs fiskale",
  popupBlocked: "Dritarja e printimit u bllokua nga shfletuesi.",
  loadFailed: "Letrat fiskale nuk mund t\u00EB ngarkoheshin.",
  detailFailed: "Letra fiskale nuk mund t\u00EB hapej.",
  reprintFailed: "Letra fiskale nuk mund t\u00EB riprintohej.",
  reprintSuccess: "Riprintimi u hap. Stoku nuk u zbrit p\u00EBrs\u00EBri.",
  noStockRepeat: "Stoku nuk u zbrit p\u00EBrs\u00EBri.",
};

const getReceiptDate = (receipt) =>
  receipt?.archivedAt || receipt?.printedAt || receipt?.createdAt;

const formatDate = (value) => {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm") : "-";
};

function FiscalReceiptArchive() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [paperWidth, setPaperWidth] = useState(FISCAL_RECEIPT_PAPER_WIDTHS.Eighty);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reprintingId, setReprintingId] = useState(null);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.FISCAL_RECEIPT_ARCHIVE);
      setReceipts(Array.isArray(response.data) ? response.data : []);
    } catch {
      message.error(LABELS.loadFailed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const filteredReceipts = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    if (!needle) {
      return receipts;
    }

    return receipts.filter((receipt) => {
      const values = [
        receipt.receiptNumber,
        receipt.customerName,
        receipt.createdByFullName,
        receipt.total,
      ];

      return values.some((value) =>
        textValue(value).toLowerCase().includes(needle)
      );
    });
  }, [receipts, searchText]);

  const openDetails = async (receipt) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedReceipt(receipt);

    try {
      const response = await apiClient.get(
        API_ENDPOINTS.FISCAL_RECEIPT_ARCHIVE_BY_ID(receipt.id)
      );
      setSelectedReceipt(response.data || receipt);
    } catch {
      message.error(LABELS.detailFailed);
    } finally {
      setDetailLoading(false);
    }
  };

  const showReprintFeedback = (stockDeduction) => {
    const alreadyApplied =
      stockDeduction?.alreadyApplied || stockDeduction?.AlreadyApplied;

    if (alreadyApplied || stockDeduction) {
      message.info(LABELS.noStockRepeat);
    }
  };

  const reprintReceipt = async (receipt) => {
    if (!receipt?.id) {
      return;
    }

    const printWindow = openFiscalReceiptPrintWindow(paperWidth);
    if (!printWindow) {
      message.error(LABELS.popupBlocked);
      return;
    }

    setReprintingId(receipt.id);
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.FISCAL_RECEIPT_ARCHIVE_REPRINT(receipt.id)
      );
      const archivedReceipt = response.data || receipt;
      const printProps = normalizeFiscalReceiptForPreview(archivedReceipt, {
        paperWidth,
      });
      const rendered = writeFiscalReceiptPrintWindow(printWindow, printProps, {
        title: printProps.receiptNumber
          ? `Let\u00EBr Fiskale ${printProps.receiptNumber}`
          : LABELS.detailsTitle,
      });

      if (!rendered) {
        message.error(LABELS.popupBlocked);
        return;
      }

      showReprintFeedback(
        archivedReceipt.stockDeduction || archivedReceipt.StockDeduction || null
      );
      message.success(LABELS.reprintSuccess);
    } catch (error) {
      closeFiscalReceiptPrintWindow(printWindow);
      const detail =
        error?.response?.data?.message ||
        error?.response?.data?.title ||
        (typeof error?.response?.data === "string" ? error.response.data : null);
      message.error(detail || LABELS.reprintFailed);
    } finally {
      setReprintingId(null);
    }
  };

  const columns = [
    {
      title: "Nr. letre",
      dataIndex: "receiptNumber",
      key: "receiptNumber",
      width: 180,
      ellipsis: true,
    },
    {
      title: "Data",
      key: "date",
      width: 170,
      render: (_, receipt) => formatDate(getReceiptDate(receipt)),
    },
    {
      title: "Klienti",
      dataIndex: "customerName",
      key: "customerName",
      ellipsis: true,
      render: (value) => value || "-",
    },
    {
      title: "Totali",
      dataIndex: "total",
      key: "total",
      width: 140,
      align: "right",
      render: formatFiscalReceiptMoney,
    },
    {
      title: "Krijuar nga",
      dataIndex: "createdByFullName",
      key: "createdByFullName",
      ellipsis: true,
      render: (value) => value || "-",
    },
    {
      title: "Statusi",
      key: "status",
      width: 110,
      render: () => <Tag color="green">Arkivuar</Tag>,
    },
    {
      title: "Veprime",
      key: "actions",
      width: 220,
      render: (_, receipt) => (
        <Space wrap>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openDetails(receipt)}
          >
            {LABELS.view}
          </Button>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            loading={reprintingId === receipt.id}
            onClick={() => reprintReceipt(receipt)}
          >
            {LABELS.reprint}
          </Button>
        </Space>
      ),
    },
  ];

  const selectedPreviewProps = selectedReceipt
    ? normalizeFiscalReceiptForPreview(selectedReceipt, { paperWidth })
    : null;

  return (
    <div>
      <style>{PAGE_STYLES}</style>
      <div
        className="responsive-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <Space align="center" size={12}>
          <FolderOpenOutlined className="text-2xl text-blue-600" />
          <Title level={2} style={{ margin: 0 }}>
            {LABELS.title}
          </Title>
        </Space>
      </div>

      <div className="fiscal-archive-toolbar">
        <Search
          allowClear
          placeholder={LABELS.search}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          style={{ maxWidth: 380 }}
        />
        <Space wrap>
          <Segmented
            value={paperWidth}
            options={[
              { label: "80mm", value: FISCAL_RECEIPT_PAPER_WIDTHS.Eighty },
              { label: "58mm", value: FISCAL_RECEIPT_PAPER_WIDTHS.FiftyEight },
            ]}
            onChange={setPaperWidth}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchReceipts}>
            {LABELS.refresh}
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filteredReceipts}
        scroll={{ x: 1080 }}
        pagination={{
          pageSize: 15,
          showTotal: (total) => `${total} letra fiskale`,
        }}
      />

      <Modal
        title={LABELS.detailsTitle}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        width={520}
        footer={[
          <Button key="close" onClick={() => setDetailOpen(false)}>
            Mbyll
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            loading={Boolean(selectedReceipt && reprintingId === selectedReceipt.id)}
            onClick={() => reprintReceipt(selectedReceipt)}
          >
            {LABELS.reprint}
          </Button>,
        ]}
      >
        <div className="fiscal-archive-preview-shell">
          {detailLoading || !selectedPreviewProps ? (
            <span>Duke ngarkuar...</span>
          ) : (
            <FiscalReceiptPreview {...selectedPreviewProps} />
          )}
        </div>
      </Modal>
    </div>
  );
}

export default FiscalReceiptArchive;
