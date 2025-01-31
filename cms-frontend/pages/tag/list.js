import React, { useEffect, useState } from 'react';
import { Table, Input, message, Button, Popconfirm, Form, Space, Tooltip } from 'antd';
import { SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, FireOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/Layout';

const ListTags = () => {
  const [tags, setTags] = useState([]);
  const [filteredTags, setFilteredTags] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();
  const [isTrendingTag, setIsTrendingTag] = useState(false); // Track if new tag should be trending
  const [showTrending, setShowTrending] = useState(false); // State to toggle showing only trending tags
  const [currentPage, setCurrentPage] = useState(1); // Track the current page
  const [pageSize, setPageSize] = useState(5); // Set a page size
  const router = useRouter();

  const fetchTags = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/tags/list-tags');
      if (response.ok) {
        const data = await response.json();
        setTags(data);
        setFilteredTags(data);
      } else {
        message.error('Failed to fetch tags');
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      message.error('Error fetching tags');
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    if (showTrending) {
      setFilteredTags(tags.filter(tag => tag.isTrending)); // Filter to show only trending tags
    } else {
      setFilteredTags(tags); // Show all tags
    }
  }, [showTrending, tags]);

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/tags/delete-tag/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('Tag deleted successfully');
        fetchTags(); // Refresh tag list
      } else {
        const errorData = await response.json();
        message.error(errorData.message || 'Failed to delete tag');
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      message.error('Error deleting tag');
    }
  };

  const handleCreateTag = async (values) => {
    const { name, slug, description } = values;
    const generatedSlug = slug || name.toLowerCase().replace(/ /g, "-");

    const payload = {
      name,
      slug: generatedSlug,
      description,
      isTrending: isTrendingTag, // Set trending status when creating tag
    };

    try {
      const response = await fetch('http://localhost:5000/api/tags/add-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        message.success(data.message);
        form.resetFields(); // Reset the form
        fetchTags(); // Refresh tags after creation
      } else {
        message.error(data.message || 'Failed to create tag');
      }
    } catch (error) {
      console.error('Error creating tag:', error);
      message.error('Error creating tag');
    }
  };

  const handleTrendingToggle = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/tags/mark-as-trending/${id}`, {
        method: 'PUT',
      });

      const data = await response.json();
      if (response.ok) {
        message.success(data.message);
        fetchTags(); // Refresh tags after toggling trending status
      } else {
        message.error('Failed to toggle trending status');
      }
    } catch (error) {
      console.error('Error toggling trending status:', error);
      message.error('Error toggling trending status');
    }
  };

  const columns = [
    {
      title: 'Tag Name',
      dataIndex: 'name',
      key: 'name',
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
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          {/* View Button */}
          <Tooltip title="View">
            <Button
              icon={<EyeOutlined />}
              onClick={() => message.info(`Viewing Tag: ${record.name}`)}
              style={actionButtonStyle}
            />
          </Tooltip>
          {/* Edit Button */}
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              onClick={() => router.push(`/tag/edit/${record._id}`)}
              style={actionButtonStyle}
            />
          </Tooltip>
          {/* Delete Button */}
          <Tooltip title="Delete">
            <Popconfirm
              title="Are you sure you want to delete this tag?"
              onConfirm={() => handleDelete(record._id)}
              okText="Yes"
              cancelText="No"
            >
              <Button
                icon={<DeleteOutlined />}
                style={ actionButtonStyle}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Trending',
      key: 'trending',
      render: (_, record) => (
        <Button
          type="text"
          icon={<FireOutlined />}
          style={{
            color: record.isTrending ? 'red' : 'gray',  // Change color based on trending status
            fontSize: '18px',
            border: 'none',
            background: 'transparent',
          }}
          onClick={() => handleTrendingToggle(record._id)} // Toggle trending status
        />
      ),
    },
  ];

  // Styling for action buttons
  const actionButtonStyle = {
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  };

  // Pagination handler
  const handlePaginationChange = (page, pageSize) => {
    setCurrentPage(page);
    setPageSize(pageSize);
  };

  return (
    <DashboardLayout>
      <div style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
        {/* Trending Filter, Search Bar, and Tag Count in One Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
          {/* Trending Filter Box */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '5px 7px',
                backgroundColor: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                cursor: 'pointer',
                marginRight: '16px',
              }}
              onClick={() => setShowTrending(!showTrending)} // Toggle the trending filter
            >
              <FireOutlined
                style={{
                  fontSize: '20px',
                  color: showTrending ? 'black' : 'gray',
                }}
              />
            </div>

            {/* Search Bar with Box Shadow */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '70%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', // Box shadow for the search bar
                borderRadius: '8px', // Rounded corners
              }}
            >
              <Input
                placeholder="Search tags..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  const filtered = tags.filter(
                    (tag) =>
                      tag.name.toLowerCase().includes(e.target.value.toLowerCase()) ||
                      tag.slug.toLowerCase().includes(e.target.value.toLowerCase())
                  );
                  setFilteredTags(filtered);
                }}
                allowClear // Add the built-in clear icon inside the input
                style={{ width: '100%' }} // Make search bar take available width
              />
            </div>
          </div>

          {/* Tag Count */}
          <span>Total Tags: {filteredTags.length}</span>
        </div>

        {/* Tags List Table with Box Shadow */}
        <div
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '8px',
          }}
        >
          <Table
            columns={columns}
            dataSource={filteredTags}
            rowKey="_id"
            pagination={{
              current: currentPage,
              pageSize,
              total: filteredTags.length,
              showTotal: (total) => `Total ${total} tags`,
              onChange: handlePaginationChange,
            }}
          />
        </div>

        {/* Tag Creation Form with Box Shadow */}
        <div
          style={{
            width: '100%',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #e8e8e8',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '8px',
          }}
        >
          <Form form={form} layout="inline" onFinish={handleCreateTag}>
            <Form.Item
              name="name"
              label="Tag Name"
              rules={[{ required: true, message: 'Please enter the tag name' }]}
            >
              <Input placeholder="Enter tag name" />
            </Form.Item>

            <Form.Item name="slug" label="Slug">
              <Input placeholder="Enter slug" />
            </Form.Item>

            <Form.Item name="description" label="Description">
              <Input.TextArea placeholder="Enter description" rows={1} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">
                Create Tag
              </Button>
            </Form.Item>

            {/* Fire Icon to Mark as Trending */}
            <Button
              type="text"
              icon={<FireOutlined />}
              style={{
                color: isTrendingTag ? '#1677ff' : 'gray',
                fontSize: '18px',
                border: 'none',
                backgroundColor: 'transparent', // Background color for the box
                padding: '5px 10px', // Padding around the button
                borderRadius: '8px', // Rounded corners
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', // Box shadow like the trending filter
                cursor: 'pointer',
              }}
              onClick={() => setIsTrendingTag(!isTrendingTag)} // Toggle isTrendingTag state
            />

          </Form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ListTags;
