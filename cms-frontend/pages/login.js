import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Form, Input, Button, message, Checkbox } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import Image from 'next/image'; // Import Next.js Image component
import API from '../services/api'; // Import the shared API service
import { jwtDecode } from 'jwt-decode'; // Import jwt-decode function

const Login = () => {
  const router = useRouter();
  const [formLoading, setFormLoading] = useState(false);

  const onFinish = async (values) => {
    setFormLoading(true);
    try {
      const { data } = await API.post('/auth/login', values);

      // Store only the token in localStorage (not role)
      localStorage.setItem('token', data.token);

      // Decode the token to extract the role and other information
      const decodedToken = jwtDecode(data.token);
      const userRole = decodedToken.role; // Extract role from decoded token

      // You can store the decoded role in a state or use it directly without storing in localStorage
      console.log('User role from decoded token:', userRole); // Debugging: log the decoded role

      message.success('Login successful!');
      router.push('/dashboard'); // Redirect to the dashboard
    } catch (error) {
      setFormLoading(false);

      if (error.isSessionExpired) {
        // Session expired handling
        localStorage.removeItem('token');
        message.error('Session expired. Please log in again.');
        router.push('/login');
      } else if (error.response && error.response.status === 401) {
        // Handle invalid credentials
        message.error(error.response.data.message || 'Invalid username or password');
      } else if (error.response && error.response.status === 403) {
        // Handle forbidden error (e.g., account lock)
        message.error(error.response.data.message || 'Account is temporarily locked. Please try again later.');
      } else if (error.response && error.response.status === 429) {
        // Rate limit exceeded
        message.error('Too many login attempts. Please try again later.');
      } else {
        // Handle other errors
        message.error('Login failed. Please try again.');
        console.error('Login error:', error);
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f0f2f5',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          width: '400px',
          padding: '40px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Updated to use Next.js Image */}
        <Image
          src="/logo.png"
          alt="Logo"
          width={80}
          height={80}
          style={{ marginBottom: '16px' }}
        />
        <h2>Hi! Hello CMS</h2>

        <Form name="login_form" onFinish={onFinish} layout="vertical" style={{ marginTop: '24px' }}>
          <Form.Item name="username" rules={[{ required: true, message: 'Please enter your username' }]}>
            <Input prefix={<UserOutlined />} placeholder="Username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Please enter your password' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>
          <Form.Item>
            <Checkbox name="remember">Remember me</Checkbox>
            <a href="/forgot-password" style={{ float: 'right' }}>Forgot password?</a>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={formLoading} style={{ width: '100%' }}>
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Login;
