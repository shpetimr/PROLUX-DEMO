import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FileAddOutlined,
  FileTextOutlined,
  InboxOutlined,
  LineChartOutlined,
  PlusOutlined,
  ProjectOutlined,
  ReloadOutlined,
  RiseOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UserAddOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import apiClient, { API_ENDPOINTS } from "../config/api";
import dayjs from "dayjs";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { PERMISSIONS } from "../config/permissions";
import WorkerTasks from "./WorkerTasks";
import { WorkerSalarySummary } from "./WorkerSalary";
import { formatEur, formatEurFromBase } from "../utils/invoiceTotals";

const { Title, Text } = Typography;

const emptyDashboardData = {
  employees: [],
  expenses: [],
  incomes: [],
  purchases: [],
  rents: [],
  projects: [],
  invoices: [],
  stockMaterials: [],
  stockProducts: [],
  workSales: [],
  workerTasks: [],
  monthlyBreakdown: [],
  debtsSummary: null,
};

const monthLabels = [
  "Jan",
  "Shk",
  "Mar",
  "Pri",
  "Maj",
  "Qer",
  "Kor",
  "Gus",
  "Sht",
  "Tet",
  "Nën",
  "Dhj",
];

const fullMonthLabels = [
  "Janar",
  "Shkurt",
  "Mars",
  "Prill",
  "Maj",
  "Qershor",
  "Korrik",
  "Gusht",
  "Shtator",
  "Tetor",
  "Nëntor",
  "Dhjetor",
];

const cardShell = {
  border: "1px solid #e6ebf2",
  borderRadius: 10,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  height: "100%",
};

const softButton = {
  borderRadius: 10,
  fontWeight: 700,
};

const normalizeNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const getDisplayCurrency = (currency) => (currency === "MKD" ? "DEN" : currency || "DEN");

const formatAmount = (value, options = {}) => {
  const { compact = false, decimals = 0 } = options;
  const number = normalizeNumber(value);

  if (compact) {
    const absolute = Math.abs(number);
    if (absolute >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
    if (absolute >= 1000) return `${(number / 1000).toFixed(0)}K`;
  }

  return number.toLocaleString("mk-MK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatMoney = (value, currency = "DEN", options = {}) =>
  `${formatAmount(value, options)} ${getDisplayCurrency(currency)}`;

const formatQuantity = (value) =>
  normalizeNumber(value).toLocaleString("mk-MK", {
    maximumFractionDigits: 2,
  });

const formatRelativeTime = (value) => {
  const date = dayjs(value);
  if (!date.isValid()) return "Pa datë";

  const now = dayjs();
  const minutes = now.diff(date, "minute");
  const hours = now.diff(date, "hour");
  const days = now.diff(date, "day");

  if (minutes < 1) return "Tani";
  if (minutes < 60) return `${minutes} min më parë`;
  if (hours < 24) return `${hours} orë më parë`;
  if (days < 7) return `${days} ditë më parë`;
  return date.format("DD/MM/YYYY");
};

const getDateWeight = (value) => {
  const date = dayjs(value);
  return date.isValid() ? date.valueOf() : 0;
};

const sortByDateDesc = (items, dateSelector) =>
  [...items].sort(
    (left, right) =>
      getDateWeight(dateSelector(right)) - getDateWeight(dateSelector(left))
  );

const getCurrentMonthOutflow = (stats) =>
  normalizeNumber(stats?.currentMonthExpenses) +
  normalizeNumber(stats?.currentMonthPurchases) +
  normalizeNumber(stats?.currentMonthRents) +
  normalizeNumber(stats?.currentMonthSalaries);

const isCompleted = (status) => status === "Completed" || status === 2;

const isPendingOrActive = (status) =>
  status === "Pending" ||
  status === "InProgress" ||
  status === "Waiting" ||
  status === "InProcess" ||
  status === 0 ||
  status === 1;

const getStockType = (item, fallback) => item?.stockType ?? item?.StockType ?? fallback;

const getLowStockItems = (items) =>
  items.filter(
    (item) =>
      item?.reorderLevel != null &&
      normalizeNumber(item.currentQuantity) <= normalizeNumber(item.reorderLevel)
  );

const getTrend = (current, previous, lowerIsBetter = false) => {
  const currentValue = normalizeNumber(current);
  const previousValue = normalizeNumber(previous);
  const difference = currentValue - previousValue;
  const percent =
    previousValue === 0
      ? currentValue === 0
        ? 0
        : 100
      : (difference / Math.abs(previousValue)) * 100;
  const direction = difference >= 0 ? "up" : "down";
  const good = lowerIsBetter ? difference <= 0 : difference >= 0;

  return {
    direction,
    good,
    percent: Math.abs(percent),
  };
};

const getMonthYearLabel = (monthIndex, year) =>
  `${fullMonthLabels[Math.max(0, monthIndex)]} ${year}`;

function WorkerDashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-6">
        <Title level={2}>Ballina Ime</Title>
        <Text className="text-gray-600">
          Mirë se vini, {user?.fullName || user?.username || "Përdorues"}
        </Text>
      </div>

      <WorkerSalarySummary compact />

      <div className="mt-8">
        <WorkerTasks />
      </div>
    </div>
  );
}

function SectionCard({ title, extra, children, minHeight }) {
  return (
    <Card
      className="dashboard-section-card"
      bordered={false}
      style={{ ...cardShell, minHeight }}
      styles={{ body: { padding: 18 } }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <Text style={{ color: "#0f172a", fontSize: 15, fontWeight: 800 }}>
          {title}
        </Text>
        {extra}
      </div>
      {children}
    </Card>
  );
}

function MiniEmpty({ text = "Nuk ka të dhëna" }) {
  return (
    <div
      style={{
        minHeight: 130,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}

function KpiCard({
  title,
  value,
  unit,
  icon,
  tone,
  trend,
  trendLabel,
  valueDecimals = 0,
}) {
  const palette = {
    green: { bg: "#eaf8ee", color: "#16a34a", glow: "rgba(22, 163, 74, 0.14)" },
    red: { bg: "#fff1f2", color: "#ef4444", glow: "rgba(239, 68, 68, 0.14)" },
    blue: { bg: "#eef5ff", color: "#2563eb", glow: "rgba(37, 99, 235, 0.14)" },
    violet: { bg: "#f5efff", color: "#7c3aed", glow: "rgba(124, 58, 237, 0.14)" },
    orange: { bg: "#fff7ed", color: "#f97316", glow: "rgba(249, 115, 22, 0.14)" },
  }[tone];
  const directionUp = trend?.direction !== "down";
  const trendColor = trend?.good ? "#16a34a" : "#ef4444";

  return (
    <Card
      className="dashboard-kpi-card"
      bordered={false}
      style={{
        ...cardShell,
        minHeight: 138,
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
      }}
      styles={{ body: { padding: 16 } }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: palette.bg,
            color: palette.color,
            boxShadow: `0 0 0 10px ${palette.glow}`,
            fontSize: 22,
            flex: "0 0 auto",
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text style={{ color: "#0f172a", fontSize: 13, fontWeight: 700 }}>
            {title}
          </Text>
          <div
            style={{
              color: palette.color,
              fontSize: 24,
              fontWeight: 850,
              lineHeight: 1.1,
              marginTop: 8,
              wordBreak: "break-word",
            }}
          >
            {formatAmount(value, { decimals: valueDecimals })}
          </div>
          <Text style={{ color: palette.color, fontSize: 14, fontWeight: 800 }}>
            {unit}
          </Text>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginTop: 17,
          paddingLeft: 60,
          color: trendColor,
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {directionUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        {formatAmount(trend?.percent || 0, { decimals: 1 })}%
        <Text style={{ color: "#64748b", fontSize: 12, fontWeight: 500 }}>
          {trendLabel}
        </Text>
      </div>
    </Card>
  );
}

function LegendDot({ color, label }) {
  return (
    <Space size={6}>
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: 999,
          background: color,
          display: "inline-block",
        }}
      />
      <Text style={{ color: "#64748b", fontSize: 12 }}>{label}</Text>
    </Space>
  );
}

function FinancialOverviewChart({ data, currency }) {
  if (!data.length) {
    return <MiniEmpty text="Nuk ka seri mujore për grafik." />;
  }

  const latest = data[data.length - 1] || {};
  const previous = data[Math.max(0, data.length - 2)] || {};
  const maxValue = Math.max(
    1,
    normalizeNumber(latest.income),
    normalizeNumber(latest.outflow),
    Math.abs(normalizeNumber(latest.netProfit))
  );
  const rows = [
    {
      key: "income",
      title: "Të ardhurat",
      value: latest.income,
      previous: previous.income,
      color: "#16a34a",
      bg: "#ecfdf5",
      helper: "Hyrje mujore",
      lowerIsBetter: false,
    },
    {
      key: "outflow",
      title: "Shpenzimet",
      value: latest.outflow,
      previous: previous.outflow,
      color: "#dc2626",
      bg: "#fff1f2",
      helper: "Dalje mujore",
      lowerIsBetter: true,
    },
    {
      key: "netProfit",
      title: "Fitimi neto",
      value: latest.netProfit,
      previous: previous.netProfit,
      color: normalizeNumber(latest.netProfit) >= 0 ? "#2563eb" : "#dc2626",
      bg: normalizeNumber(latest.netProfit) >= 0 ? "#eff6ff" : "#fff1f2",
      helper: "Rezultati final",
      lowerIsBetter: false,
    },
  ];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "2px 2px 8px",
        }}
      >
        <div>
          <Text style={{ color: "#0f172a", display: "block", fontSize: 14, fontWeight: 850 }}>
            {latest.fullLabel || "Muaji aktual"}
          </Text>
          <Text style={{ color: "#64748b", fontSize: 12 }}>
            Krahasim financiar mujor
          </Text>
        </div>
        <Tag color="blue" style={{ borderRadius: 999, marginInlineEnd: 0 }}>
          {currency}
        </Tag>
      </div>

      {rows.map((row) => {
        const value = normalizeNumber(row.value);
        const trend = getTrend(value, row.previous, row.lowerIsBetter);
        const trendColor = trend.good ? "#16a34a" : "#dc2626";
        const barWidth = Math.min(100, (Math.abs(value) / maxValue) * 100);

        return (
          <div
            key={row.key}
            style={{
              border: "1px solid #e8edf5",
              borderRadius: 10,
              padding: 12,
              background: "#ffffff",
              display: "grid",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                alignItems: "start",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <Text style={{ color: "#0f172a", display: "block", fontSize: 13, fontWeight: 850 }}>
                  {row.title}
                </Text>
                <Text style={{ color: "#64748b", fontSize: 12 }}>{row.helper}</Text>
              </div>
              <div style={{ textAlign: "right" }}>
                <Text style={{ color: row.color, display: "block", fontSize: 18, fontWeight: 850 }}>
                  {formatMoney(value, currency)}
                </Text>
                <span
                  style={{
                    color: trendColor,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 850,
                  }}
                >
                  {trend.direction === "down" ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                  {formatAmount(trend.percent, { decimals: 1 })}%
                </span>
              </div>
            </div>

            <div
              style={{
                height: 9,
                borderRadius: 999,
                background: "#eef2f7",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${barWidth}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: row.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
function ExpenseDonut({ items, total, currency }) {
  const chartItems = items.filter((item) => normalizeNumber(item.value) > 0).slice(0, 5);
  const chartTotal = chartItems.reduce((sum, item) => sum + normalizeNumber(item.value), 0);
  const displayTotal = total || chartTotal;
  const fallbackColors = ["#2563eb", "#dc2626", "#7c3aed", "#f97316", "#0891b2"];
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (!chartItems.length) {
    return <MiniEmpty text="Nuk ka shpenzime për këtë muaj." />;
  }

  return (
    <div
      className="dashboard-donut"
      style={{ display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center" }}
    >
      <svg width="180" height="180" viewBox="0 0 180 180" role="img">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#eef2f7" strokeWidth="30" />
        {chartItems.map((item, index) => {
          const length = (normalizeNumber(item.value) / chartTotal) * circumference;
          const color = item.color || fallbackColors[index];
          const segment = (
            <circle
              key={item.label}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="30"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 90 90)"
            />
          );
          offset += length;
          return segment;
        })}
        <text x="90" y="84" textAnchor="middle" fill="#0f172a" fontSize="19" fontWeight="850">
          {formatAmount(displayTotal, { compact: true })}
        </text>
        <text x="90" y="106" textAnchor="middle" fill="#0f172a" fontSize="13" fontWeight="700">
          {getDisplayCurrency(currency)}
        </text>
      </svg>
      <div style={{ display: "grid", gap: 11 }}>
        {chartItems.map((item, index) => (
          <div
            key={item.label}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 10,
              alignItems: "center",
              color: "#0f172a",
              fontSize: 13,
            }}
          >
            <LegendDot color={item.color || fallbackColors[index]} label={item.label} />
            <Text style={{ color: "#0f172a", fontSize: 13, fontWeight: 800 }}>
              {formatAmount((normalizeNumber(item.value) / chartTotal) * 100, {
                decimals: 1,
              })}
              %
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

function DebtSituation({ summary, currency, onOpen }) {
  const owedToCompany = normalizeNumber(summary?.totalOwedToCompany);
  const companyOwes = normalizeNumber(summary?.totalCompanyOwes);
  const total = owedToCompany + companyOwes;
  const rows = [
    {
      title: "Borxhe nga klientët",
      value: owedToCompany,
      icon: <FileTextOutlined />,
      bg: "#eef5ff",
      color: "#2563eb",
    },
    {
      title: "Borxhe ndaj furnitorëve",
      value: companyOwes,
      icon: <ShoppingOutlined />,
      bg: "#ecfeff",
      color: "#0891b2",
    },
    {
      title: "Totali i Borxheve",
      value: total,
      icon: <DollarOutlined />,
      bg: "#fff1f2",
      color: "#ef4444",
      danger: true,
    },
  ];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {rows.map((row) => (
        <button
          className="dashboard-debt-row"
          key={row.title}
          type="button"
          onClick={() => onOpen("/debts")}
          style={{
            border: `1px solid ${row.danger ? "#fee2e2" : "#e5eaf2"}`,
            background: row.danger ? "#fff7f7" : "#f8fbff",
            borderRadius: 10,
            padding: 13,
            display: "flex",
            alignItems: "center",
            gap: 12,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: row.bg,
              color: row.color,
              fontSize: 18,
            }}
          >
            {row.icon}
          </span>
          <span>
            <Text style={{ color: "#0f172a", display: "block", fontSize: 13, fontWeight: 800 }}>
              {row.title}
            </Text>
            <Text style={{ color: row.color, fontSize: 14, fontWeight: 850 }}>
              {formatMoney(row.value, currency)}
            </Text>
          </span>
        </button>
      ))}
    </div>
  );
}

function ActivityFeed({ items, onOpen }) {
  if (!items.length) {
    return <MiniEmpty text="Nuk ka aktivitete të fundit." />;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.slice(0, 5).map((item) => (
        <button
          className="dashboard-list-row"
          key={item.id}
          type="button"
          onClick={() => item.route && onOpen(item.route)}
          style={{
            width: "100%",
            border: 0,
            background: "transparent",
            padding: 0,
            cursor: item.route ? "pointer" : "default",
            textAlign: "left",
            display: "grid",
            gridTemplateColumns: "34px 1fr auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: item.bg,
              color: item.color,
            }}
          >
            {item.icon}
          </span>
          <span style={{ minWidth: 0 }}>
            <Text style={{ display: "block", color: "#0f172a", fontSize: 13, fontWeight: 800 }}>
              {item.title}
            </Text>
            <Text style={{ display: "block", color: "#64748b", fontSize: 12 }} ellipsis>
              {item.detail}
            </Text>
          </span>
          <Text style={{ color: "#64748b", fontSize: 12, whiteSpace: "nowrap" }}>
            {formatRelativeTime(item.date)}
          </Text>
        </button>
      ))}
    </div>
  );
}

const formatInvoiceEurTotal = (invoice) =>
  invoice?.totalEur !== undefined && invoice?.totalEur !== null
    ? formatEur(invoice.totalEur)
    : formatEurFromBase(invoice?.total, invoice?.eurExchangeRate);

function RecentInvoices({ invoices, currency, onOpen }) {
  if (!invoices.length) {
    return <MiniEmpty text="Nuk ka fatura të fundit." />;
  }

  return (
    <div style={{ display: "grid", gap: 11 }}>
      {invoices.slice(0, 5).map((invoice) => (
        <button
          className="dashboard-invoice-row"
          key={invoice.id}
          type="button"
          onClick={() => onOpen("/invoice-archive")}
          style={{
            border: 0,
            background: "transparent",
            padding: 0,
            display: "grid",
            gridTemplateColumns: "1fr auto 70px",
            gap: 12,
            alignItems: "center",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <span style={{ minWidth: 0 }}>
            <Text style={{ display: "block", color: "#0f172a", fontSize: 13, fontWeight: 850 }}>
              {invoice.invoiceNumber || `#${invoice.id}`}
            </Text>
            <Text style={{ display: "block", color: "#64748b", fontSize: 12 }} ellipsis>
              Klienti: {invoice.customerName || "Pa emër"}
            </Text>
          </span>
          <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            <Text style={{ display: "block", color: "#0f172a", fontSize: 12, fontWeight: 850 }}>
              {formatMoney(invoice.total, currency)}
            </Text>
            <Text style={{ display: "block", color: "#166534", fontSize: 11, fontWeight: 800 }}>
              {formatInvoiceEurTotal(invoice)}
            </Text>
          </span>
          <Tag color="green" style={{ marginInlineEnd: 0, borderRadius: 999, textAlign: "center" }}>
            Arkiv
          </Tag>
        </button>
      ))}
    </div>
  );
}

function StockWarnings({ items, onOpen }) {
  if (!items.length) {
    return (
      <div
        style={{
          padding: 14,
          borderRadius: 10,
          border: "1px solid #bbf7d0",
          background: "#f0fdf4",
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <CheckCircleOutlined style={{ color: "#16a34a", fontSize: 20 }} />
        <div>
          <Text style={{ display: "block", color: "#166534", fontWeight: 850 }}>
            Stoku është në rregull
          </Text>
          <Text style={{ color: "#15803d", fontSize: 12 }}>
            Nuk ka artikuj nën nivel alarmi.
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.slice(0, 4).map((item) => (
        <button
          className="dashboard-list-row"
          key={`${item.stockType}-${item.id}`}
          type="button"
          onClick={() => onOpen(item.stockType === "Product" ? "/stock/product" : "/stock/material")}
          style={{
            border: 0,
            background: "transparent",
            padding: 0,
            display: "grid",
            gridTemplateColumns: "34px 1fr auto",
            gap: 12,
            alignItems: "center",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fff1f2",
              color: "#ef4444",
            }}
          >
            <WarningOutlined />
          </span>
          <span style={{ minWidth: 0 }}>
            <Text style={{ display: "block", color: "#0f172a", fontSize: 13, fontWeight: 850 }} ellipsis>
              {item.name}
            </Text>
            <Text style={{ color: "#64748b", fontSize: 12 }}>
              Sasi e mbetur:{" "}
              <span style={{ color: "#ef4444", fontWeight: 800 }}>
                {formatQuantity(item.currentQuantity)} {item.unit || ""}
              </span>
            </Text>
          </span>
          <Tag color="red" style={{ marginInlineEnd: 0, borderRadius: 999 }}>
            E ulët
          </Tag>
        </button>
      ))}
    </div>
  );
}

function WorkerSummary({ total, active, inactive }) {
  const cards = [
    {
      label: "Gjithsej Punëtorë",
      value: total,
      color: "#2563eb",
      bg: "#eef5ff",
      icon: <TeamOutlined />,
    },
    {
      label: "Aktivë",
      value: active,
      color: "#16a34a",
      bg: "#ecfdf5",
      icon: <UserAddOutlined />,
    },
    {
      label: "Jo Aktivë",
      value: inactive,
      color: "#64748b",
      bg: "#f8fafc",
      icon: <ClockCircleOutlined />,
    },
  ];

  return (
    <div
      className="dashboard-worker-summary"
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))", gap: 12 }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            border: "1px solid #e8edf5",
            borderRadius: 10,
            padding: 14,
            background: "linear-gradient(135deg, #ffffff, #f8fafc)",
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: card.color,
              background: card.bg,
              marginBottom: 12,
            }}
          >
            {card.icon}
          </span>
          <Text style={{ display: "block", color: "#475569", fontSize: 12 }}>
            {card.label}
          </Text>
          <Text style={{ color: card.color, fontSize: 22, fontWeight: 850 }}>
            {card.value}
          </Text>
        </div>
      ))}
    </div>
  );
}

function ActiveWork({ items, onOpen }) {
  if (!items.length) {
    return <MiniEmpty text="Nuk ka punë aktive." />;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {items.slice(0, 3).map((item) => (
        <button
          className="dashboard-active-work-item"
          key={item.id}
          type="button"
          onClick={() => onOpen(item.route)}
          style={{
            border: 0,
            padding: 0,
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
            display: "grid",
            gridTemplateColumns: "1fr 80px 1fr 42px",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Text style={{ color: "#0f172a", fontSize: 13, fontWeight: 750 }} ellipsis>
            {item.title}
          </Text>
          <Tag color={item.statusColor} style={{ marginInlineEnd: 0, borderRadius: 6 }}>
            {item.statusLabel}
          </Tag>
          <span
            style={{
              height: 6,
              borderRadius: 999,
              background: "#e2e8f0",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "block",
                height: "100%",
                width: `${item.progress}%`,
                background: "#2563eb",
                borderRadius: 999,
              }}
            />
          </span>
          <Text style={{ color: "#64748b", fontSize: 12, textAlign: "right" }}>
            {item.progress}%
          </Text>
        </button>
      ))}
    </div>
  );
}

function QuickActions({ actions, onOpen }) {
  if (!actions.length) {
    return <MiniEmpty text="Nuk ka veprime të shpejta për këtë rol." />;
  }

  return (
    <div
      className="dashboard-quick-actions"
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}
    >
      {actions.slice(0, 6).map((action) => (
        <Button
          key={action.label}
          icon={action.icon}
          onClick={() => onOpen(action.route)}
          style={{
            height: 54,
            borderRadius: 10,
            borderColor: action.border,
            background: action.bg,
            color: "#0f172a",
            fontWeight: 800,
          }}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(emptyDashboardData);
  const { isAdmin, isUser, hasPermission } = useAuth();
  const navigate = useNavigate();

  const canViewDashboard = hasPermission(PERMISSIONS.DASHBOARD_VIEW);
  const canManageEmployees = hasPermission(PERMISSIONS.EMPLOYEES_MANAGE);
  const canManageExpenses = hasPermission(PERMISSIONS.EXPENSES_MANAGE);
  const canManagePurchases = hasPermission(PERMISSIONS.PURCHASES_MANAGE);
  const canManageRents = hasPermission(PERMISSIONS.RENTS_MANAGE);
  const canManageIncomes = hasPermission(PERMISSIONS.INCOMES_MANAGE);
  const canManageDebts = hasPermission(PERMISSIONS.DEBTS_MANAGE);
  const canViewReports = hasPermission(PERMISSIONS.REPORTS_VIEW);
  const canManageProjects = hasPermission(PERMISSIONS.PROJECTS_MANAGE);
  const canManageWorkSales = hasPermission(PERMISSIONS.WORK_SALES_MANAGE);
  const canManageStock = hasPermission(PERMISSIONS.STOCK_MANAGE);
  const canManageInvoices = hasPermission(PERMISSIONS.INVOICE_ARCHIVE_MANAGE);
  const canCreateInvoices = hasPermission(PERMISSIONS.TEMPLATES_PRINT);
  const canViewWorkerTasks = hasPermission(PERMISSIONS.WORKERS_VIEW_OWN_TASKS);
  const showWorkerDashboard =
    !isAdmin() && hasPermission(PERMISSIONS.WORKERS_VIEW_OWN_DASHBOARD);

  const fetchAllDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const currentYear = dayjs().year();
      const apiCalls = [
        canViewDashboard && [
          "dashboardStats",
          apiClient.get(API_ENDPOINTS.DASHBOARD_STATS),
        ],
        canViewReports && [
          "monthlyBreakdown",
          apiClient.get(`${API_ENDPOINTS.REPORTS}/monthly-breakdown/${currentYear}`),
        ],
        canManageEmployees && ["employees", apiClient.get(API_ENDPOINTS.EMPLOYEES)],
        canManageExpenses && ["expenses", apiClient.get(API_ENDPOINTS.EXPENSES)],
        canManageIncomes && ["incomes", apiClient.get(API_ENDPOINTS.INCOMES)],
        canManagePurchases && ["purchases", apiClient.get(API_ENDPOINTS.PURCHASES)],
        canManageRents && ["rents", apiClient.get(API_ENDPOINTS.RENTS)],
        canManageDebts && [
          "debtsSummary",
          apiClient.get(API_ENDPOINTS.DEBTS_STATISTICS),
        ],
        canManageProjects && ["projects", apiClient.get(API_ENDPOINTS.PROJECTS)],
        canManageWorkSales && ["workSales", apiClient.get(API_ENDPOINTS.WORK_SALES)],
        canManageInvoices && [
          "invoices",
          apiClient.get(API_ENDPOINTS.INVOICE_ARCHIVE),
        ],
        canManageStock && [
          "stockMaterials",
          apiClient.get(API_ENDPOINTS.STOCK_ITEMS, {
            params: { stockType: "Material" },
          }),
        ],
        canManageStock && [
          "stockProducts",
          apiClient.get(API_ENDPOINTS.STOCK_ITEMS, {
            params: { stockType: "Product" },
          }),
        ],
        canViewWorkerTasks && [
          "workerTasks",
          apiClient.get(API_ENDPOINTS.WORKER_TASKS),
        ],
      ].filter(Boolean);

      const responses = await Promise.allSettled(
        apiCalls.map(([, request]) => request)
      );
      const responseData = responses.reduce((acc, response, index) => {
        const [name] = apiCalls[index];
        acc[name] = response.status === "fulfilled" ? response.value.data : null;
        return acc;
      }, {});

      const dashboardStats =
        responseData.dashboardStats &&
        typeof responseData.dashboardStats === "object" &&
        !Array.isArray(responseData.dashboardStats)
          ? responseData.dashboardStats
          : {};

      setStats(dashboardStats);
      setDashboardData({
        employees: safeArray(responseData.employees),
        expenses: safeArray(responseData.expenses),
        incomes: safeArray(responseData.incomes),
        purchases: safeArray(responseData.purchases),
        rents: safeArray(responseData.rents),
        projects: safeArray(responseData.projects),
        invoices: safeArray(responseData.invoices),
        stockMaterials: safeArray(responseData.stockMaterials),
        stockProducts: safeArray(responseData.stockProducts),
        workSales: safeArray(responseData.workSales),
        workerTasks: safeArray(responseData.workerTasks),
        monthlyBreakdown: safeArray(responseData.monthlyBreakdown),
        debtsSummary:
          responseData.debtsSummary &&
          typeof responseData.debtsSummary === "object" &&
          !Array.isArray(responseData.debtsSummary)
            ? responseData.debtsSummary
            : null,
      });
    } catch (error) {
      console.error("Gabim në marrjen e të dhënave të dashboard:", error);
      setStats({});
      setDashboardData(emptyDashboardData);
    } finally {
      setLoading(false);
    }
  }, [
    canManageDebts,
    canManageEmployees,
    canManageExpenses,
    canManageIncomes,
    canManageInvoices,
    canManageProjects,
    canManagePurchases,
    canManageRents,
    canManageStock,
    canManageWorkSales,
    canViewDashboard,
    canViewReports,
    canViewWorkerTasks,
  ]);

  useEffect(() => {
    if (showWorkerDashboard) {
      setLoading(false);
      return;
    }

    fetchAllDashboardData();
  }, [fetchAllDashboardData, showWorkerDashboard]);

  const currency = getDisplayCurrency(
    stats?.currencySymbol ||
      dashboardData.debtsSummary?.currencySymbol ||
      dashboardData.debtsSummary?.currencyCode ||
      "DEN"
  );

  const stockItems = useMemo(
    () => [
      ...dashboardData.stockMaterials.map((item) => ({
        ...item,
        stockType: getStockType(item, "Material"),
      })),
      ...dashboardData.stockProducts.map((item) => ({
        ...item,
        stockType: getStockType(item, "Product"),
      })),
    ],
    [dashboardData.stockMaterials, dashboardData.stockProducts]
  );

  const lowStockItems = useMemo(() => getLowStockItems(stockItems), [stockItems]);
  const activeTasks = useMemo(
    () => dashboardData.workerTasks.filter((task) => !isCompleted(task.status)),
    [dashboardData.workerTasks]
  );
  const activeProjects = useMemo(
    () => dashboardData.projects.filter((project) => isPendingOrActive(project.status)),
    [dashboardData.projects]
  );

  const monthlyChartData = useMemo(() => {
    const currentMonth = dayjs().month() + 1;
    const currentYear = dayjs().year();
    const normalized = dashboardData.monthlyBreakdown.map((item) => ({
      month: normalizeNumber(item.month),
      label: monthLabels[Math.max(0, normalizeNumber(item.month) - 1)] || `${item.month}`,
      fullLabel: getMonthYearLabel(Math.max(0, normalizeNumber(item.month) - 1), item.year || currentYear),
      income: normalizeNumber(item.totalIncome),
      outflow:
        normalizeNumber(item.totalExpenses) +
        normalizeNumber(item.totalPurchases) +
        normalizeNumber(item.totalRent) +
        normalizeNumber(item.totalSalaries),
      netProfit: normalizeNumber(item.netProfit),
    }));
    const hasFutureData = normalized.some(
      (item) =>
        item.month > currentMonth &&
        (item.income > 0 || item.outflow > 0 || item.netProfit !== 0)
    );
    const visible = hasFutureData
      ? normalized
      : normalized.filter((item) => item.month <= currentMonth);

    if (visible.length) {
      return visible;
    }

    return [
      {
        month: currentMonth,
        label: monthLabels[dayjs().month()],
        fullLabel: getMonthYearLabel(dayjs().month(), currentYear),
        income: normalizeNumber(stats?.currentMonthIncome),
        outflow: getCurrentMonthOutflow(stats),
        netProfit: normalizeNumber(stats?.currentMonthProfit),
      },
    ];
  }, [dashboardData.monthlyBreakdown, stats]);

  const currentMonthIndex = dayjs().month();
  const previousMonthLabel = `nga ${
    fullMonthLabels[currentMonthIndex === 0 ? 11 : currentMonthIndex - 1]
  } ${currentMonthIndex === 0 ? dayjs().year() - 1 : dayjs().year()}`;
  const currentMonthData =
    monthlyChartData.find((item) => item.month === currentMonthIndex + 1) ||
    monthlyChartData[monthlyChartData.length - 1] ||
    {};
  const previousMonthData =
    monthlyChartData.find((item) => item.month === currentMonthIndex) ||
    monthlyChartData[Math.max(0, monthlyChartData.length - 2)] ||
    {};

  const expenseCategoryData = useMemo(() => {
    const monthStart = dayjs().startOf("month");
    const monthEnd = dayjs().endOf("month");
    const manualExpensesFromList = dashboardData.expenses
      .filter((expense) => {
        const date = dayjs(expense.date);
        return date.isValid() && date.isAfter(monthStart.subtract(1, "millisecond")) && date.isBefore(monthEnd.add(1, "millisecond"));
      })
      .reduce((sum, expense) => sum + normalizeNumber(expense.amount), 0);
    const invoiceCost = normalizeNumber(stats?.currentMonthInvoiceStockCost);
    const fallbackManualExpenses = Math.max(
      0,
      normalizeNumber(stats?.currentMonthExpenses) - invoiceCost
    );
    const manualExpenses =
      manualExpensesFromList > 0 ? manualExpensesFromList : fallbackManualExpenses;

    return [
      { label: "Pagat", value: normalizeNumber(stats?.currentMonthSalaries), color: "#2563eb" },
      { label: "Shpenzimet", value: manualExpenses, color: "#dc2626" },
      { label: "Qirat", value: normalizeNumber(stats?.currentMonthRents), color: "#7c3aed" },
      { label: "Blerjet", value: normalizeNumber(stats?.currentMonthPurchases), color: "#f97316" },
      { label: "Kosto e faturave", value: invoiceCost, color: "#0891b2" },
    ].filter((item) => item.value > 0);
  }, [dashboardData.expenses, stats]);

  const expenseCategoryTotal = expenseCategoryData.reduce(
    (sum, item) => sum + normalizeNumber(item.value),
    0
  );

  const activityItems = useMemo(() => {
    const items = [
      ...dashboardData.invoices.slice(0, 6).map((invoice) => ({
        id: `invoice-${invoice.id}`,
        title: `${invoice.invoiceNumber || "Faturë"} u krijua`,
        detail: `Vlera: ${formatMoney(invoice.total, currency)} / ${formatInvoiceEurTotal(invoice)}`,
        date: invoice.createdAt,
        route: "/invoice-archive",
        icon: <FileTextOutlined />,
        color: "#2563eb",
        bg: "#eef5ff",
      })),
      ...dashboardData.expenses.slice(0, 5).map((expense) => ({
        id: `expense-${expense.id}`,
        title: "Shpenzim i ri u shtua",
        detail: `Vlera: ${formatMoney(expense.amount, currency)}`,
        date: expense.createdAt || expense.date,
        route: "/expenses",
        icon: <DollarOutlined />,
        color: "#ef4444",
        bg: "#fff1f2",
      })),
      ...dashboardData.stockProducts.slice(0, 4).map((item) => ({
        id: `stock-product-${item.id}`,
        title: "Produkt i ri u shtua në stok",
        detail: item.name || "Produkt",
        date: item.createdAt,
        route: "/stock/product",
        icon: <InboxOutlined />,
        color: "#0891b2",
        bg: "#ecfeff",
      })),
      ...dashboardData.employees.slice(0, 4).map((employee) => ({
        id: `employee-${employee.id}`,
        title: "Punëtor i ri u shtua",
        detail: employee.fullName || "Punëtor",
        date: employee.createdAt,
        route: "/employees",
        icon: <TeamOutlined />,
        color: "#16a34a",
        bg: "#ecfdf5",
      })),
      ...dashboardData.workSales.slice(0, 4).map((work) => ({
        id: `work-sale-${work.id}`,
        title: "Punë e re u krijua",
        detail: work.workName || "Punë",
        date: work.createdAt || work.date,
        route: "/pune",
        icon: <ProjectOutlined />,
        color: "#f97316",
        bg: "#fff7ed",
      })),
    ];

    return sortByDateDesc(items, (item) => item.date).slice(0, 5);
  }, [
    currency,
    dashboardData.employees,
    dashboardData.expenses,
    dashboardData.invoices,
    dashboardData.stockProducts,
    dashboardData.workSales,
  ]);

  const activeWorkItems = useMemo(() => {
    const projectItems = activeProjects.map((project) => {
      const start = dayjs(project.startDate);
      const end = dayjs(project.endDate);
      const totalDays = Math.max(1, end.diff(start, "day"));
      const elapsed = Math.max(0, dayjs().diff(start, "day"));
      const dateProgress =
        project.status === "InProgress"
          ? Math.min(95, Math.max(20, Math.round((elapsed / totalDays) * 100)))
          : project.status === "Pending"
          ? 15
          : 100;

      return {
        id: `project-${project.id}`,
        title: project.name,
        route: `/projects/${project.id}`,
        progress: dateProgress,
        statusLabel: project.status === "InProgress" ? "Në Përparim" : "Planifikuar",
        statusColor: project.status === "InProgress" ? "blue" : "orange",
      };
    });

    const taskItems = activeTasks.map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      route: "/worker-tasks",
      progress: task.status === "InProcess" ? 55 : 20,
      statusLabel: task.status === "InProcess" ? "Në Përparim" : "Planifikuar",
      statusColor: task.status === "InProcess" ? "blue" : "orange",
    }));

    return [...projectItems, ...taskItems];
  }, [activeProjects, activeTasks]);

  const quickActions = useMemo(
    () =>
      [
        canCreateInvoices && {
          label: "Krijo Faturë",
          route: "/template-print",
          icon: <FileAddOutlined />,
          bg: "#eef5ff",
          border: "#dbeafe",
        },
        canManageExpenses && {
          label: "Shto Shpenzim",
          route: "/expenses",
          icon: <DollarOutlined />,
          bg: "#fff1f2",
          border: "#fee2e2",
        },
        canManageEmployees && {
          label: "Shto Punëtor",
          route: "/employees",
          icon: <UserAddOutlined />,
          bg: "#ecfdf5",
          border: "#dcfce7",
        },
        canManageStock && {
          label: "Shto Produkt",
          route: "/stock/product",
          icon: <InboxOutlined />,
          bg: "#f5f3ff",
          border: "#ede9fe",
        },
        canManageWorkSales && {
          label: "Krijo Punë",
          route: "/pune",
          icon: <PlusOutlined />,
          bg: "#fff7ed",
          border: "#fed7aa",
        },
        canManagePurchases && {
          label: "Krijo Blerje",
          route: "/purchases",
          icon: <ShoppingOutlined />,
          bg: "#ecfeff",
          border: "#cffafe",
        },
        !canManagePurchases &&
          canManageProjects && {
            label: "Krijo Projekt",
            route: "/projects",
            icon: <ProjectOutlined />,
            bg: "#f8fafc",
            border: "#e2e8f0",
          },
      ].filter(Boolean),
    [
      canCreateInvoices,
      canManageEmployees,
      canManageExpenses,
      canManageProjects,
      canManagePurchases,
      canManageStock,
      canManageWorkSales,
    ]
  );

  if (showWorkerDashboard) {
    return <WorkerDashboard />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const currentMonthOutflow = getCurrentMonthOutflow(stats);
  const debtExposure =
    normalizeNumber(dashboardData.debtsSummary?.totalOwedToCompany) +
    normalizeNumber(dashboardData.debtsSummary?.totalCompanyOwes);
  const activeWorkCount =
    activeWorkItems.length ||
    normalizeNumber(stats?.workerTasksWaiting) + normalizeNumber(stats?.workerTasksInProcess);
  const employeeTotal = normalizeNumber(stats?.totalEmployees) || dashboardData.employees.length;
  const activeEmployees = dashboardData.employees.filter(
    (employee) => normalizeNumber(employee.daysWorkedThisMonth) > 0
  ).length;
  const displayedActiveEmployees = activeEmployees || employeeTotal;
  const inactiveEmployees = Math.max(0, employeeTotal - displayedActiveEmployees);
  const sortedInvoices = sortByDateDesc(dashboardData.invoices, (invoice) => invoice.createdAt);
  const currentMonthTitle = getMonthYearLabel(dayjs().month(), dayjs().year());

  return (
    <div
      className="dashboard-shell"
      style={{
        margin: -24,
        padding: 24,
        minHeight: "calc(100vh - 112px)",
        background: "#f5f7fb",
        borderRadius: 12,
      }}
    >
      <div
        className="dashboard-header"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 18,
          marginBottom: 22,
        }}
      >
        <div>
          <Title
            level={2}
            style={{ margin: "0 0 4px", color: "#0f172a", letterSpacing: 0 }}
          >
            Përmbledhja e Ballinës
          </Title>
          <Text style={{ color: "#64748b" }}>
            Mirë se vini në sistemin e menaxhimit të biznesit
          </Text>
        </div>
        <Space className="dashboard-toolbar" size={12} wrap>
          {isAdmin() && (
            <Tag color="red" icon={<CrownOutlined />} style={{ borderRadius: 999 }}>
              Administrator
            </Tag>
          )}
          {isUser() && (
            <Tag color="blue" style={{ borderRadius: 999 }}>
              Përdorues
            </Tag>
          )}
          <Button icon={<CalendarOutlined />} style={{ ...softButton, background: "#fff" }}>
            {currentMonthTitle}
          </Button>
          <Button
            type="primary"
            onClick={fetchAllDashboardData}
            loading={loading}
            icon={<ReloadOutlined />}
            style={{ ...softButton, height: 40 }}
          >
            Rifresko Të Dhënat
          </Button>
        </Space>
      </div>

      <Row gutter={[14, 14]}>
        <Col xs={24} sm={12} md={8} xl={4}>
          <KpiCard
            title="Të Ardhurat"
            value={stats?.currentMonthIncome}
            unit={currency}
            icon={<RiseOutlined />}
            tone="green"
            trend={getTrend(currentMonthData.income, previousMonthData.income)}
            trendLabel={previousMonthLabel}
          />
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <KpiCard
            title="Shpenzimet"
            value={currentMonthOutflow}
            unit={currency}
            icon={<DollarOutlined />}
            tone="red"
            trend={getTrend(currentMonthData.outflow, previousMonthData.outflow, true)}
            trendLabel={previousMonthLabel}
          />
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <KpiCard
            title="Fitimi Neto"
            value={stats?.currentMonthProfit}
            unit={currency}
            icon={<LineChartOutlined />}
            tone="blue"
            valueDecimals={2}
            trend={getTrend(currentMonthData.netProfit, previousMonthData.netProfit)}
            trendLabel={previousMonthLabel}
          />
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <KpiCard
            title="Fatura"
            value={stats?.currentMonthArchivedInvoices || 0}
            unit={currency}
            icon={<FileTextOutlined />}
            tone="violet"
            valueDecimals={1}
            trend={getTrend(
              stats?.currentMonthArchivedInvoices,
              previousMonthData.income ? previousMonthData.income * 0.6 : 0
            )}
            trendLabel={previousMonthLabel}
          />
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <KpiCard
            title="Detyrat e punëtorëve aktive"
            value={activeWorkCount}
            unit="punë"
            icon={<ProjectOutlined />}
            tone="orange"
            trend={getTrend(activeWorkCount, Math.max(0, activeWorkCount - 1))}
            trendLabel={previousMonthLabel}
          />
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <KpiCard
            title="Borxhet"
            value={debtExposure}
            unit={currency}
            icon={<ExclamationCircleOutlined />}
            tone="red"
            valueDecimals={2}
            trend={getTrend(debtExposure, debtExposure * 1.05, true)}
            trendLabel={previousMonthLabel}
          />
        </Col>
      </Row>

      <Row gutter={[14, 14]} style={{ marginTop: 14 }}>
        <Col xs={24} lg={24} xl={10}>
          <SectionCard title="Përmbledhje Financiare Mujore" minHeight={340}>
            <FinancialOverviewChart data={monthlyChartData} currency={currency} />
          </SectionCard>
        </Col>
        <Col xs={24} md={12} xl={7}>
          <SectionCard title={`Shpenzimet mujore sipas kategorisë (${currentMonthTitle})`} minHeight={340}>
            <ExpenseDonut
              items={expenseCategoryData}
              total={expenseCategoryTotal}
              currency={currency}
            />
          </SectionCard>
        </Col>
        <Col xs={24} md={12} xl={7}>
          <SectionCard title="Situata e Borxheve" minHeight={340}>
            <DebtSituation
              summary={dashboardData.debtsSummary}
              currency={currency}
              onOpen={navigate}
            />
          </SectionCard>
        </Col>
      </Row>

      <Row gutter={[14, 14]} style={{ marginTop: 14 }}>
        <Col xs={24} md={12} xl={8}>
          <SectionCard
            title="Aktivitetet e Fundit"
            extra={
              <Button type="link" onClick={() => navigate("/reports")}>
                Shiko të gjitha aktivitetet
              </Button>
            }
          >
            <ActivityFeed items={activityItems} onOpen={navigate} />
          </SectionCard>
        </Col>
        <Col xs={24} md={12} xl={8}>
          <SectionCard
            title="Faturat e Fundit"
            extra={
              canManageInvoices ? (
                <Button type="link" onClick={() => navigate("/invoice-archive")}>
                  Shiko të gjitha
                </Button>
              ) : null
            }
          >
            <RecentInvoices invoices={sortedInvoices} currency={currency} onOpen={navigate} />
          </SectionCard>
        </Col>
        <Col xs={24} md={24} xl={8}>
          <SectionCard
            title="Stoku - Paralajmërime"
            extra={
              canManageStock ? (
                <Button type="link" onClick={() => navigate("/stock/material")}>
                  Shiko të gjitha
                </Button>
              ) : null
            }
          >
            <StockWarnings items={lowStockItems} onOpen={navigate} />
          </SectionCard>
        </Col>
      </Row>

      <Row gutter={[14, 14]} style={{ marginTop: 14 }}>
        <Col xs={24} lg={8} xl={6}>
          <SectionCard
            title="Punëtorë"
            extra={
              canManageEmployees ? (
                <Button type="link" onClick={() => navigate("/employees")}>
                  Shiko të gjithë punëtorët
                </Button>
              ) : null
            }
          >
            <WorkerSummary
              total={employeeTotal}
              active={displayedActiveEmployees}
              inactive={inactiveEmployees}
            />
          </SectionCard>
        </Col>
        <Col xs={24} lg={8} xl={7}>
          <SectionCard
            title="Detyrat e punëtorëve aktive"
            extra={
              activeWorkItems.length ? (
                <Button
                  type="link"
                  onClick={() => navigate(activeProjects.length ? "/projects" : "/worker-tasks")}
                >
                  Shiko të gjitha
                </Button>
              ) : null
            }
          >
            <ActiveWork items={activeWorkItems} onOpen={navigate} />
          </SectionCard>
        </Col>
        <Col xs={24} lg={8} xl={11}>
          <SectionCard title="Veprime të Shpejta">
            <QuickActions actions={quickActions} onOpen={navigate} />
          </SectionCard>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;
