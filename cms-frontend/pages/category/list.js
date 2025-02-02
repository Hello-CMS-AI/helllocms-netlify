import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Layout, Table, Space, Button, Tooltip, Input, message } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router'; // For navigation
import DashboardLayout from '../../components/Layout';

const { Content } = Layout;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.dinasuvadu.in';

const CategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter(); // For navigation

  // Memoized function to flatten the categories
  const flattenCategories = useCallback((categories, parentId = null, level = 0) => {
    return categories
      .filter((category) => category.parentCategory === parentId)
      .reduce((acc, category) => {
        const currentCategory = {
          ...category,
          displayName: `${'-'.repeat(level)} ${category.name}`, // Add prefix for hierarchy
          level,
        };
        return [
          ...acc,
          currentCategory,
          ...flattenCategories(categories, category._id, level + 1),
        ];
      }, []);
  }, []);

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/categories/list-categories`);
      if (response.ok) {
        const data = await response.json();
        const flatCategories = flattenCategories(data);
        setCategories(flatCategories);
        setFilteredCategories(flatCategories); // Initialize filtered categories
      } else {
        message.error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      message.error('Error fetching categories');
    }
  }, [flattenCategories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Search function for filtering categories
  const handleSearch = (searchTerm) => {
    setSearchTerm(searchTerm);
    const lowerCaseSearch = searchTerm.toLowerCase();
    const filtered = categories.filter(
      (category) =>
        category.name.toLowerCase().includes(lowerCaseSearch) ||
        category.slug.toLowerCase().includes(lowerCaseSearch)
    );
    setFilteredCategories(filtered);
  };

  // Table columns with hierarchical display and action buttons
  const columns = [
    {
      title: 'Category Name',
      dataIndex: 'displayName', // Use displayName to include hierarchy indicators
      key: 'name',
      render: (text, record) => (
        <span
          style={{
            fontWeight: record.level === 0 ? 'bold' : 'normal', // Bold for parent categories
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
      render: (text) => text || 0, // Default to 0 if no posts
    },
    {
      title: 'Last Updated',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      render: (text) => (text ? new Date(text).toLocaleDateString() : 'N/A'), // Format date
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            title="View Category"
          />
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Edit Category"
          />
          <Button
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            title="Delete Category"
          />
        </Space>
      ),
    },
  ];

  // Placeholder handlers for action buttons
  const handleView = (record) => {
    message.info(`Viewing category: ${record.name}`);
  };

  const handleEdit = (record) => {
    router.push(`/category/edit/${record._id}`);
  };

  const handleDelete = (record) => {
    // Show Ant Design confirmation modal
    Modal.confirm({
      title: `Are you sure you want to delete the category: ${record.name}?`,
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const response = await fetch(
            `${BACKEND_URL}/api/categories/delete-category/${record._id}`,
            {
              method: 'DELETE',
            }
          );

          if (response.ok) {
            message.success('Category deleted successfully');
            fetchCategories(); // Refresh categories after deletion
          } else {
            const data = await response.json();
            message.error(data.message || 'Failed to delete category');
          }
        } catch (error) {
          console.error('Error deleting category:', error);
          message.error('Error deleting category');
        }
      },
      onCancel() {
        console.log('Deletion cancelled');
      },
    });
  };

  return (
    <DashboardLayout>
      <Content style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
        {/* Header Section */}
        <div
          style={{
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Category List</div>
          <Input
            placeholder="Search categories"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            allowClear
            style={{ width: '300px' }}
          />
          <div style={{ fontSize: '14px' }}>
            Total Categories: <b>{filteredCategories.length}</b>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/category/create')}
          >
            Add Category
          </Button>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={filteredCategories}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      </Content>
    </DashboardLayout>
  );
};

export default CategoryList;
