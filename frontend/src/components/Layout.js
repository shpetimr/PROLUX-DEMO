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
  CrownOutlined,
  PrinterOutlined,
  ProjectOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin, isUser } = useAuth();

  const handleLogout = () => {
    logout();
  };

  // Create menu items based on user role
  const getMenuItems = () => {
    const baseItems = [
      {
        key: "/",
        icon: <DashboardOutlined />,
        label: "Dashboard",
      },
      {
        key: "/template-print",
        icon: <PrinterOutlined />,
        label: "Fletpages",
      },
      {
        key: "/offer-print",
        icon: <FileTextOutlined />,
        label: "Ofertë",
      },
    ];

    // Admin can see all menu items
    if (isAdmin()) {
      return [
        ...baseItems,
        {
          key: "/employees",
          icon: <TeamOutlined />,
          label: "Punëtorët",
        },
        {
          key: "/expenses",
          icon: <DollarOutlined />,
          label: "Shpenzimet",
        },
        {
          key: "/purchases",
          icon: <ShoppingOutlined />,
          label: "Blerjet",
        },
        {
          key: "/rents",
          icon: <HomeOutlined />,
          label: "Qirat",
        },
        {
          key: "/incomes",
          icon: <RiseOutlined />,
          label: "Të Ardhurat",
        },
        {
          key: "/debts",
          icon: <ExclamationCircleOutlined />,
          label: "Borxhet",
        },
        {
          key: "/projects",
          icon: <ProjectOutlined />,
          label: "Projektet",
        },
        {
          key: "/reports",
          icon: <BarChartOutlined />,
          label: "Raportet",
        },
        {
          key: "/stock",
          icon: <InboxOutlined />,
          label: "Stoku",
        },
      ];
    }

    // User can only see expenses and purchases
    if (isUser()) {
      return [
        ...baseItems,
        {
          key: "/expenses",
          icon: <DollarOutlined />,
          label: "Shpenzimet",
        },
        {
          key: "/purchases",
          icon: <ShoppingOutlined />,
          label: "Blerjet",
        },
      ];
    }

    return baseItems;
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
              src={process.env.NODE_ENV === 'development' ? '/rio-logo.png' : './rio-logo.png'}
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
              PROLUX Group - Business Management System
            </Title>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
              <Avatar icon={<UserOutlined />} className="bg-blue-500" />
              <div className="flex flex-col">
                <span className="text-gray-700 font-medium text-sm">
                  {user?.username || user?.fullName || "User"}
                </span>
                <div className="flex items-center gap-1">
                  {isAdmin() ? (
                    <Tag
                      color="red"
                      icon={<CrownOutlined />}
                      className="text-xs"
                    >
                      Admin
                    </Tag>
                  ) : (
                    <Tag color="blue" className="text-xs">
                      User
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
