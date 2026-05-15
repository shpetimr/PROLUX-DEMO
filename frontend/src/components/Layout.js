import React, { useState } from "react";
import {
  Layout as AntLayout,
  Menu,
  Button,
  Typography,
  Avatar,
  Tag,
} from "antd";
import {
  DashboardOutlined,
  TeamOutlined,
  DollarOutlined,
  ShoppingOutlined,
  HomeOutlined,
  RiseOutlined,
  BarChartOutlined,
  LogoutOutlined,
  UserOutlined,
  UserAddOutlined,
  CrownOutlined,
  PrinterOutlined,
  ProjectOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  InboxOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PERMISSIONS } from "../config/permissions";

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin, hasPermission } = useAuth();

  const handleLogout = () => {
    logout();
  };

  // Build the sidebar from the same permission names used by the API.
  const getMenuItems = () => {
    const items = [
      {
        key: "/",
        icon: <DashboardOutlined />,
        label: "Ballina",
        requiredPermission: PERMISSIONS.WORKERS_VIEW_OWN_DASHBOARD,
      },
      {
        key: "/template-print",
        icon: <PrinterOutlined />,
        label: "Fletpages",
        requiredPermission: PERMISSIONS.TEMPLATES_PRINT,
      },
      {
        key: "/offer-print",
        icon: <FileTextOutlined />,
        label: "Ofertë",
        requiredPermission: PERMISSIONS.OFFERS_PRINT,
      },
      {
        key: "/invoice-archive",
        icon: <FileTextOutlined />,
        label: "Faturat e Arkivuara",
        requiredPermission: PERMISSIONS.INVOICE_ARCHIVE_MANAGE,
      },
      {
        key: "/employees",
        icon: <TeamOutlined />,
        label: "Punëtorët",
        requiredPermission: PERMISSIONS.EMPLOYEES_MANAGE,
      },
      {
        key: "/expenses",
        icon: <DollarOutlined />,
        label: "Shpenzimet",
        requiredPermission: PERMISSIONS.EXPENSES_MANAGE,
      },
      {
        key: "/purchases",
        icon: <ShoppingOutlined />,
        label: "Blerjet",
        requiredPermission: PERMISSIONS.PURCHASES_MANAGE,
      },
      {
        key: "/rents",
        icon: <HomeOutlined />,
        label: "Qirat",
        requiredPermission: PERMISSIONS.RENTS_MANAGE,
      },
      {
        key: "/incomes",
        icon: <RiseOutlined />,
        label: "Të Ardhurat",
        requiredPermission: PERMISSIONS.INCOMES_MANAGE,
      },
      {
        key: "/debts",
        icon: <ExclamationCircleOutlined />,
        label: "Borxhet",
        requiredPermission: PERMISSIONS.DEBTS_MANAGE,
      },
      {
        key: "/projects",
        icon: <ProjectOutlined />,
        label: "Projektet",
        requiredPermission: PERMISSIONS.PROJECTS_MANAGE,
      },
      {
        key: "/reports",
        icon: <BarChartOutlined />,
        label: "Raportet",
        requiredPermission: PERMISSIONS.REPORTS_VIEW,
      },
      {
        key: "/pune",
        icon: <DollarOutlined />,
        label: "Punët",
        adminOnly: true,
        requiredPermission: PERMISSIONS.WORK_SALES_MANAGE,
      },
      {
        key: "/stock/material",
        icon: <InboxOutlined />,
        label: "Stoku i Materialeve",
        adminOnly: true,
        requiredPermission: PERMISSIONS.STOCK_MANAGE,
      },
      {
        key: "/stock/product",
        icon: <InboxOutlined />,
        label: "Stoku i Produkteve",
        adminOnly: true,
        requiredPermission: PERMISSIONS.STOCK_MANAGE,
      },
      {
        key: "/worker-tasks",
        icon: <CheckSquareOutlined />,
        label: isAdmin() ? "Detyrat e Punëtorëve" : "Detyrat e Mia",
        requiredPermission: PERMISSIONS.WORKERS_VIEW_OWN_TASKS,
      },
      ...(!isAdmin()
        ? [
            {
              key: "/my-salary",
              icon: <DollarOutlined />,
              label: "Paga Ime",
              requiredPermission: PERMISSIONS.WORKERS_VIEW_OWN_SALARY,
            },
          ]
        : []),
      {
        key: "/users",
        icon: <UserAddOutlined />,
        label: "Përdoruesit",
        requiredPermission: PERMISSIONS.USERS_MANAGE,
      },
    ];

    return items.filter(
      (item) =>
        (!item.adminOnly || isAdmin()) &&
        (!item.requiredPermission || hasPermission(item.requiredPermission))
    );
  };

  const menuItems = getMenuItems();

  return (
    <AntLayout style={{ minHeight: "100vh" }} className="bg-transparent">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        theme="dark"
        className="shadow-xl"
      >
        <div className="p-4 text-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="flex justify-center">
            <img
              src={
                process.env.NODE_ENV === "development"
                  ? "/prolux-logo.png"
                  : "./prolux-logo.png"
              }
              alt="ProLux Logo"
              className={collapsed ? "w-8 h-8" : "w-12 h-12"}
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="border-r-0"
        />
      </Sider>
      <AntLayout className="bg-transparent">
        <Header className="bg-white px-6 flex items-center justify-between border-b border-gray-200/50 shadow-sm">
          <div className="flex items-center">
            <Title level={4} className="m-0 text-gray-800 font-semibold">
              Menaxhimi i PROLUX Group
            </Title>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
              <Avatar icon={<UserOutlined />} className="bg-blue-500" />
              <div className="flex flex-col">
                <span className="text-gray-700 font-medium text-sm">
                  {user?.username || user?.fullName || "Përdorues"}
                </span>
                <div className="flex items-center gap-1">
                  {isAdmin() ? (
                    <Tag
                      color="red"
                      icon={<CrownOutlined />}
                      className="text-xs"
                    >
                      Administrator
                    </Tag>
                  ) : (
                    <Tag color="blue" className="text-xs">
                      Përdorues
                    </Tag>
                  )}
                </div>
              </div>
            </div>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              danger
              className="hover:bg-red-50"
            >
              Dil
            </Button>
          </div>
        </Header>
        <Content className="m-6 p-6 bg-white rounded-xl shadow-lg border border-white/20">
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
}

export default Layout;
