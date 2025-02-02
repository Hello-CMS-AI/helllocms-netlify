import React, { useState } from 'react';
import { Form, Input, Select, Button, Checkbox, Typography, message, Space, Row, Col } from 'antd';
import { TranslationOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import DashboardLayout from '../../components/Layout';
import { useRouter } from 'next/router';


const { Title, Text } = Typography;
const { Option } = Select;

const AddUser = () => {
  const router = useRouter(); // Initialize the router

  const [password, setPassword] = useState('');

  const generatePassword = () => {
    const randomPassword = Math.random().toString(36).slice(-10) + '#Aa1';
    setPassword(randomPassword);
    message.success('Password generated!');
  };

  const onFinish = async (values) => {
    try {
      const response = await fetch('http://localhost:5000/api/users/add-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...values, password }),
      });

      if (response.ok) {
        message.success('New user has been added successfully!');
        router.push('/users/all-user'); // Redirect to all-user.js page after successful save
      } else {
        const errorData = await response.json();
        message.error(`Error: ${errorData.error || 'Failed to add user'}`);
      }
    } catch (error) {
      console.error('Error adding user:', error);
      message.error('Error adding user');
    }
  };


  return (
    <DashboardLayout>
      <div
        style={{
          maxWidth: '450px',
          backgroundColor: '#fff',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          marginLeft: '16px',
        }}
      >
        <Title level={4} style={{ marginBottom: '12px' }}>Add New User</Title>
        <Form layout="vertical" onFinish={onFinish} style={{ marginTop: '10px' }}>
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: 'Please input the username!' }]}
            style={{ marginBottom: '8px' }}
          >
            <Input placeholder="Enter username" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please input the email!' },
              { type: 'email', message: 'Please enter a valid email!' },
            ]}
            style={{ marginBottom: '8px' }}
          >
            <Input placeholder="Enter email" />
          </Form.Item>

          <Row gutter={8}>
            <Col span={12}>
              <Form.Item label="First Name" name="firstName" style={{ marginBottom: '8px' }}>
                <Input placeholder="Enter first name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Last Name" name="lastName" style={{ marginBottom: '8px' }}>
                <Input placeholder="Enter last name" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Language" name="language" style={{ marginBottom: '8px' }}>
            <Select placeholder="Select Language" suffixIcon={<TranslationOutlined />}>
              <Option value="default">Site Default</Option>
              <Option value="en">English</Option>
              <Option value="es">Spanish</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Password" style={{ marginBottom: '8px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input.Password
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
                placeholder="Enter password"
              />
              <Button type="dashed" onClick={generatePassword} size="small">
                Generate Password
              </Button>
              {password && <Text type="success" style={{ fontSize: '12px' }}>Password Strength: Strong</Text>}
            </Space>
          </Form.Item>

          <Form.Item name="sendNotification" valuePropName="checked" style={{ marginBottom: '8px' }}>
            <Checkbox>Send the new user an email about their account</Checkbox>
          </Form.Item>

          <Form.Item label="Role" name="role" style={{ marginBottom: '8px' }}>
            <Select placeholder="Select Role">
              <Option value="subscriber">Subscriber</Option>
              <Option value="editor">Editor</Option>
              <Option value="admin">Administrator</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="small">
              Add New User
            </Button>
          </Form.Item>
        </Form>
      </div>
    </DashboardLayout>
  );
};

export default AddUser;
