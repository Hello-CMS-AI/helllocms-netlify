import React, { useState } from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import AppHeader from './Header';
import ProtectedRoute from './ProtectedRoute';

const { Content, Footer } = Layout;

const DashboardLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <Layout style={{ minHeight: '100vh', overflow: 'hidden' }}>
      {/* Sidebar Component */}
      <Sidebar collapsed={collapsed} />

      {/* Main Layout */}
      <Layout
        style={{
          // Adjust content margin based on whether the sidebar is collapsed
          marginLeft: collapsed ? 60 : 180, // <-- 180 for expanded, 60 for collapsed
          transition: 'margin-left 0.2s ease-in-out',
        }}
      >
        {/* Fixed Header */}
        <AppHeader
          collapsed={collapsed}
          toggle={toggleSidebar}
          style={{
            position: 'fixed',
            top: 0,
            // Match the same values used above for marginLeft
            left: collapsed ? 60 : 180, 
            width: `calc(100% - ${collapsed ? 60 : 180}px)`,
            height: 64,
            zIndex: 1050,
            transition: 'left 0.2s ease-in-out, width 0.2s ease-in-out',
          }}
        />

        {/* Content Section */}
        <Content
          style={{
            marginTop: 64, // Content starts below the 64px header
            padding: '24px',
            backgroundColor: '#f5f5f5',
            overflow: 'auto',
            minHeight: 'calc(100vh - 128px)', // Adjust for header and footer
          }}
        >
          {children}
        </Content>

        {/* Footer */}
        <Footer style={{ textAlign: 'center' }}>Dinasuvadu ©2024</Footer>
      </Layout>
    </Layout>
  );
};

export default ProtectedRoute(DashboardLayout);
