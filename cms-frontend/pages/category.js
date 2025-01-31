import React, { useEffect, useState, useCallback } from 'react';
import { Layout, Form, Input, Button, Select, Row, Col, message, Table, Tooltip, Space, Spin } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import DashboardLayout from '../components/Layout';

const { Content } = Layout;
const { Option } = Select;

const Category = () => {
  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Build nested structure
  const buildNestedCategories = useCallback((categories, parentId = null, level = 0) => {
    return categories
      .filter((category) => category.parentCategory === parentId)
      .map((category) => ({
        ...category,
        level,
        children: buildNestedCategories(categories, category._id, level + 1),
      }));
  }, []);

  // Fetch categories for Parent Category dropdown and display in the table
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/categories/list-categories`);
      if (response.ok) {
        const data = await response.json();
        const nestedCategories = buildNestedCategories(data);
        setCategories(nestedCategories);
        setFilteredCategories(nestedCategories); // Initialize filtered categories
      } else {
        message.error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      message.error('Error fetching categories');
    } finally {
      setLoading(false);
    }
  }, [buildNestedCategories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = async (values) => {
    const { name, parentCategory, slug, description, keywords } = values;

    // Generate slug if empty
    const generatedSlug = slug ||
      (parentCategory === "none"
        ? name.toLowerCase().replace(/ /g, "-")
        : `${name.toLowerCase().replace(/ /g, "-")}-${categories.find((cat) => cat._id === parentCategory)?.name.toLowerCase().replace(/ /g, "-")}`);

    const payload = {
      name,
      parentCategory: parentCategory === "none" ? null : parentCategory,
      slug: generatedSlug,
      description: description || '',
      keywords: keywords || '',
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/categories/add-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        message.success(data.message);
        form.resetFields();
        fetchCategories(); // Refresh categories
      } else {
        message.error(data.message || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      message.error('Error creating category');
    }
  };

  const handleView = (record) => {
    message.info(`View details of ${record.name}`);
  };

  const handleEdit = (record) => {
    message.info(`Edit category ${record.name}`);
  };

  const handleDelete = (record) => {
    message.info(`Delete category ${record.name}`);
  };

  const renderCategoryOptions = (categories) => {
    return categories.map((category) => (
      <React.Fragment key={category._id}>
        <Option
          value={category._id}
          style={{
            paddingLeft: `${category.level === 0 ? 20 : category.level * 20}px`,
            fontWeight: category.level === 0 ? 'bold' : 'normal',
          }}
        >
          {category.name}
        </Option>
        {category.children && renderCategoryOptions(category.children)}
      </React.Fragment>
    ));
  };

  // Define columns for the category table
  const columns = [
    {
      title: 'Category Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <span
          style={{
            paddingLeft: `${record.level * 20}px`,
            fontWeight: record.level === 0 ? 'bold' : 'normal',
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
    },
    {
      title: 'Post Count',
      dataIndex: 'postCount',
      key: 'postCount',
      render: (text) => text || 0,
    },
    {
      title: 'Last Updated',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      render: (text) => (text ? new Date(text).toLocaleString() : 'N/A'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="View">
            <Button icon={<EyeOutlined />} onClick={() => handleView(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="Delete">
            <Button icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleSearch = (searchTerm) => {
    const lowerCaseSearch = searchTerm.toLowerCase();
    const filtered = categories.filter(
      (category) =>
        category.name.toLowerCase().includes(lowerCaseSearch) ||
        category.slug.toLowerCase().includes(lowerCaseSearch)
    );
    setFilteredCategories(filtered);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Content style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
          <Spin size="large" />
        </Content>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Content style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
        <Row gutter={16}>
          <Col
            span={8}
            style={{
              backgroundColor: '#fff',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              height: 'fit-content',
              position: 'sticky',
              top: '24px',
            }}
          >
            <h2>Create New Category</h2>
            <Form form={form} layout="vertical" onFinish={handleCreateCategory}>
              <Form.Item
                label="Category Name"
                name="name"
                rules={[{ required: true, message: 'Please enter the category name' }]}
              >
                <Input placeholder="Enter category name" />
              </Form.Item>

              <Form.Item label="Parent Category" name="parentCategory" initialValue="none">
                <Select>
                  <Option value="none">None</Option>
                  {renderCategoryOptions(categories)}
                </Select>
              </Form.Item>

              <Form.Item label="Slug" name="slug">
                <Input placeholder="Enter slug" />
              </Form.Item>

              <Form.Item label="Description (Meta Tag)" name="description">
                <Input.TextArea placeholder="Enter description" rows={3} />
              </Form.Item>

              <Form.Item label="Keywords (Meta Tag)" name="keywords">
                <Input placeholder="Enter keywords" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
                  Create New Category
                </Button>
              </Form.Item>
            </Form>
          </Col>

          <Col span={16} style={{ padding: '24px' }}>
            <h2>Category List</h2>
            <Row gutter={16} align="middle" style={{ marginBottom: '16px' }}>
              <Col span={8}>
                <Input placeholder="Search categories" onChange={(e) => handleSearch(e.target.value)} allowClear />
              </Col>
              <Col span={8} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                Total Categories: {filteredCategories.length}
              </Col>
            </Row>
            <Table columns={columns} dataSource={filteredCategories} rowKey="_id" pagination={{ pageSize: 10 }} />
          </Col>
        </Row>
      </Content>
    </DashboardLayout>
  );
};

export default Category;
