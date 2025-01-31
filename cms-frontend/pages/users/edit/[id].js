import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Form, Input, Button, Select, message } from 'antd';
import DashboardLayout from '../../../components/Layout';

const { Option } = Select;

const EditUser = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(false);

  // Memoize fetchUserData using useCallback
  const fetchUserData = useCallback(async () => {
    if (!id) return; // Return early if id is not available yet
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/users/${id}`);
      if (response.ok) {
        const userData = await response.json();
        form.setFieldsValue({ ...userData, password: '' }); // Set password field to empty
      } else {
        message.error('Failed to load user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, [id, form]); // Include id and form in the dependency array

  useEffect(() => {
    if (id) {
      fetchUserData();
    }
  }, [id, fetchUserData]); // Ensure that fetchUserData is included in the dependency array

  const onFinish = async (values) => {
    try {
      // Check if password is set
      const updateData = values.password ? values : { ...values, password: undefined };
  
      const response = await fetch(`http://localhost:5000/api/users/edit/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      if (response.ok) {
        message.success('User updated successfully!');
        router.push('/users/all-user');
      } else {
        message.error('Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      message.error('Error updating user');
    }
  };

  const generatePassword = () => {
    const newPassword = Math.random().toString(36).slice(-8); // Simple random password
    form.setFieldsValue({ password: newPassword }); // Set generated password in the form
    message.success('Generated new password');
  };

  return (
    <DashboardLayout>
      <div style={{
          maxWidth: '450px',
          backgroundColor: '#fff',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          marginLeft: '16px',
        }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Update User</h2>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Please enter username' }]}>
            <Input placeholder="Enter username" disabled={true} style={{ backgroundColor: '#f5f5f5', color: '#555', cursor: 'not-allowed' }} />
          </Form.Item>

          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}>
            <Input placeholder="Enter email" />
          </Form.Item>
          <Form.Item label="First Name" name="firstName" rules={[{ required: true, message: 'Please enter first name' }]}>
            <Input placeholder="Enter first name" />
          </Form.Item>
          <Form.Item label="Last Name" name="lastName" rules={[{ required: true, message: 'Please enter last name' }]}>
            <Input placeholder="Enter last name" />
          </Form.Item>
          <Form.Item label="Language" name="language" rules={[{ required: true, message: 'Please select a language' }]}>
            <Select placeholder="Select language">
              <Option value="English">English</Option>
              <Option value="Spanish">Spanish</Option>
              <Option value="French">French</Option>
              {/* Add other languages as needed */}
            </Select>
          </Form.Item>
          <Form.Item label="Password" name="password">
            <Input.Password placeholder="Enter new password " />
          </Form.Item>
          <Form.Item>
            <Button type="default" onClick={generatePassword}>
              Generate New Password
            </Button>
          </Form.Item>

          <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Please select a role' }]}>
            <Select placeholder="Select role">
              <Option value="admin">Admin</Option>
              <Option value="editor">Editor</Option>
              <Option value="subscriber">Subscriber</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>
              Update User
            </Button>
          </Form.Item>
        </Form>
      </div>
    </DashboardLayout>
  );
};

export default EditUser;
