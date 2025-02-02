import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Layout, Form, Input, Button, Select, message, Spin } from 'antd';
import DashboardLayout from '../../../components/Layout';

const { Content } = Layout;
const { Option } = Select;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

const EditCategory = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { id } = router.query; // Get category ID from URL
  const [categoryData, setCategoryData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Memoized function to fetch category details for editing
  const fetchCategoryDetails = useCallback(async () => {
    if (!id) return; // Ensure the ID is available before fetching
    try {
      const response = await fetch(`${BACKEND_URL}/api/categories/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCategoryData(data);

        // Pre-fill form values
        form.setFieldsValue({
          name: data.name,
          slug: data.slug,
          parentCategory: data.parentCategory || 'none',
          description: data.description,
          keywords: data.keywords,
        });
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to fetch category details');
      }
    } catch (error) {
      console.error('Error fetching category details:', error);
      message.error('Error fetching category details');
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  // Memoized function to fetch all categories for the parent dropdown
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/categories/list-categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        message.error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      message.error('Error fetching categories');
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchCategoryDetails();
      fetchCategories();
    }
  }, [id, fetchCategoryDetails, fetchCategories]);

  const handleUpdateCategory = async (values) => {
    // Ensure parentCategory is set to null if 'none' is selected
    if (values.parentCategory === 'none') {
      values.parentCategory = null;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/categories/update-category/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('Category updated successfully');
        router.push('/category/list'); // Redirect to category list
      } else {
        const data = await response.json();
        message.error(data.message || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      message.error('Error updating category');
    }
  };

  // Build nested structure for hierarchical dropdown
  const buildNestedCategories = useCallback((categories, parentId = null) => {
    return categories
      .filter((category) => category.parentCategory === parentId)
      .map((category) => ({
        ...category,
        children: buildNestedCategories(categories, category._id),
      }));
  }, []);

  // Render options with hierarchy prefixes
  const renderCategoryOptions = useCallback((categories, level = 0) => {
    return categories.map((category) => (
      <React.Fragment key={category._id}>
        <Option
          value={category._id}
          style={{
            paddingLeft: `${(level + 1) * 10}px`, // Adjust padding for alignment
            fontWeight: level === 0 ? 'bold' : 'normal', // Bold for parent categories
          }}
        >
          {`${'-'.repeat(level)} ${category.name}`}
        </Option>
        {category.children && renderCategoryOptions(category.children, level + 1)}
      </React.Fragment>
    ));
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <Content style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
          <Spin size="large" />
        </Content>
      </DashboardLayout>
    );
  }

  // Prepare categories for rendering
  const nestedCategories = buildNestedCategories(
    categories.filter((category) => category._id !== id) // Exclude current category
  );

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
          <h2>Edit Category</h2>
          <Form form={form} layout="vertical" onFinish={handleUpdateCategory}>
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
                {renderCategoryOptions(nestedCategories)}
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
                Update Category
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Content>
    </DashboardLayout>
  );
};

export default EditCategory;
