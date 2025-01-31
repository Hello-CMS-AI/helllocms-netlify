import React from 'react';
import { Layout, Menu, Dropdown, Button, Avatar } from 'antd';
import { MenuUnfoldOutlined, UserOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { jwtDecode } from 'jwt-decode';

const { Header } = Layout;

const AppHeader = ({ collapsed, toggle, style }) => {
  const router = useRouter();

  // Decode the JWT token to extract user information
  const getUserInfoFromToken = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decodedToken = jwtDecode(token);
          console.log(decodedToken); // Log to inspect the token's payload
          return {
            username: decodedToken.username, // Assuming 'username' is part of the JWT payload
            role: decodedToken.role, // Assuming 'role' is part of the JWT payload
          };
        } catch (error) {
          console.error('Invalid token:', error);
        }
      }
    }
    return { username: '', role: '' }; // Default values
  };

  const { username, role } = getUserInfoFromToken(); // Get username and role from JWT token

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    router.push('/login');
  };

  const menu = (
    <Menu>
      <Menu.Item>
        <span onClick={() => router.push('/edit-profile')}>Edit Profile</span>
      </Menu.Item>
      <Menu.Item>
        <span onClick={handleLogout}>Logout</span>
      </Menu.Item>
    </Menu>
  );

  return (
    <Header
      style={{
        ...style, // Spread inline styles for dynamic positioning
        background: '#fff',
        padding: '0 30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', // Subtle shadow for header
      }}
    >
      <MenuUnfoldOutlined
        onClick={toggle}
        style={{ fontSize: '24px', cursor: 'pointer' }}
      />
      <Dropdown overlay={menu} trigger={['hover']}>
        <Button type="link" style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
          {username} ({role}) {/* Display username and role */}
        </Button>
      </Dropdown>
    </Header>
  );
};

export default AppHeader;
