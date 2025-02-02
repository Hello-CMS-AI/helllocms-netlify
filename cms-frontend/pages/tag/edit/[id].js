import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Layout, Form, Input, Button, message } from 'antd';
import DashboardLayout from '../../../components/Layout';

const { Content } = Layout;

const EditTagPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { id } = router.query; // Get the tag ID from the URL

  // Use useCallback to memoize fetchTagDetails function
  const fetchTagDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await fetch(`https://api.dinasuvadu.in/api/tags/${id}`);
      if (response.ok) {
        const data = await response.json();
        form.setFieldsValue({
          name: data.name,
          slug: data.slug,
          description: data.description,
        });
      } else {
        message.error('Failed to fetch tag details');
      }
    } catch (error) {
      console.error('Error fetching tag details:', error);
      message.error('Error fetching tag details');
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  useEffect(() => {
    if (id) {
      fetchTagDetails();
    }
  }, [id, fetchTagDetails]); // Added fetchTagDetails as a dependency

  // Handle form submission
  const handleUpdateTag = async (values) => {
    try {
      setLoading(true);
      const response = await fetch(`https://api.dinasuvadu.in/api/tags/update-tag/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      if (response.ok) {
        message.success(data.message || 'Tag updated successfully');
        router.push('/tag/list'); // Redirect to Tag List page after successful update
      } else {
        message.error(data.message || 'Failed to update tag');
      }
    } catch (error) {
      console.error('Error updating tag:', error);
      message.error('Error updating tag');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Content style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <h2>Edit Tag</h2>
          <Form form={form} layout="vertical" onFinish={handleUpdateTag}>
            <Form.Item
              label="Tag Name"
              name="name"
              rules={[{ required: true, message: 'Please enter the tag name' }]}
            >
              <Input placeholder="Enter tag name" />
            </Form.Item>

            <Form.Item
              label="Slug"
              name="slug"
              rules={[{ required: true, message: 'Please enter the slug' }]}
            >
              <Input placeholder="Enter slug" />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
            >
              <Input.TextArea placeholder="Enter description" rows={3} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" style={{ width: '100%' }} loading={loading}>
                Update Tag
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Content>
    </DashboardLayout>
  );
};

export default EditTagPage;
