import React, { useEffect, useState, useCallback } from 'react';
import { Layout, Form, Input, Button, Select, message } from 'antd';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/Layout';

const { Content } = Layout;
const { Option } = Select;

const CreateCategory = () => {
  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const router = useRouter();

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dinasuvadu.in';

  // Build nested structure for hierarchical dropdown
  const buildNestedCategories = useCallback((categories, parentId = null) => {
    return categories
      .filter((category) => category.parentCategory === parentId)
      .map((category) => ({
        ...category,
        children: buildNestedCategories(categories, category._id),
      }));
  }, []);

  // Fetch categories for Parent Category dropdown
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/categories/list-categories`);
      if (response.ok) {
        const data = await response.json();
        const nestedCategories = buildNestedCategories(data);
        setCategories(nestedCategories);
      } else {
        message.error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      message.error('Error fetching categories');
    }
  }, [BACKEND_URL, buildNestedCategories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = async (values) => {
    const { name, parentCategory, slug, description, keywords } = values;

    const sanitizedName = name.trim().replace(/\s+/g, ' ');
    const sanitizedSlug = (slug || "").trim().replace(/\s+/g, '-').toLowerCase();

    const generatedSlug = slug
      ? sanitizedSlug
      : parentCategory === "none"
      ? sanitizedName.toLowerCase().replace(/\s+/g, '-')
      : `${sanitizedName.toLowerCase().replace(/\s+/g, '-')}-${categories.find(cat => cat._id === parentCategory)?.name.toLowerCase().replace(/\s+/g, '-')}`;

    const payload = {
      name: sanitizedName,
      parentCategory: parentCategory === "none" ? null : parentCategory,
      slug: generatedSlug,
      description: description || '',
      keywords: keywords || '',
    };

    try {
      const response = await fetch(`${BACKEND_URL}/api/categories/add-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        message.success(data.message);
        form.resetFields();
        fetchCategories();
      } else {
        message.error(data.message || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      message.error('Error creating category');
    }
  };

  return (
    <DashboardLayout>
      <Content style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Create New Category</h2>
            <a
              onClick={() => router.push('/category/list')}
              style={{ color: '#1890ff', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Category List
            </a>
          </div>
          <Form form={form} layout="vertical" onFinish={handleCreateCategory}>
            <Form.Item
              label="Category Name"
              name="name"
              rules={[{ required: true, message: 'Please enter the category name' }]}
            >
              <Input placeholder="Enter category name" />
            </Form.Item>

            <Form.Item
              label="Parent Category"
              name="parentCategory"
              initialValue="none"
            >
              <Select>
                <Option value="none">None</Option>
                {categories.map((category) => (
                  <Option key={category._id} value={category._id}>
                    {category.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Slug"
              name="slug"
              tooltip="If you leave it blank, it will be generated automatically."
            >
              <Input placeholder="Enter slug" />
            </Form.Item>

            <Form.Item
              label="Description (Meta Tag)"
              name="description"
            >
              <Input.TextArea placeholder="Enter description" rows={3} />
            </Form.Item>

            <Form.Item
              label="Keywords (Meta Tag)"
              name="keywords"
            >
              <Input placeholder="Enter keywords" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
                Create New Category
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Content>
    </DashboardLayout>
  );
};

export default CreateCategory;
