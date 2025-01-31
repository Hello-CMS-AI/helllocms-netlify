import React, { useEffect, useState } from 'react';
import { Layout, Form, Input, Button, Table, message, Dropdown, Menu, Popconfirm } from 'antd';
import { SearchOutlined, SettingOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/Layout';

const { Content } = Layout;

const CreateTagPage = () => {
  const [form] = Form.useForm();
  const [tags, setTags] = useState([]);
  const [filteredTags, setFilteredTags] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [tagCount, setTagCount] = useState(0);
  const router = useRouter();

  // Fetch all tags from the API
  const fetchTags = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/tags/list-tags');
      if (response.ok) {
        const data = await response.json();
        setTags(data);
        setFilteredTags(data);
        setTagCount(data.length); // Set total tag count
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

  const handleCreateTag = async (values) => {
    const { name, slug, description } = values;
    const generatedSlug = slug || name.toLowerCase().replace(/ /g, "-");

    const payload = {
      name,
      slug: generatedSlug,
      description,
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

  const menu = (record) => (
    <Menu>
      <Menu.Item key="view" icon={<EyeOutlined />}>
        <Button type="text" onClick={() => message.info(`View Tag: ${record.name}`)}>
          View
        </Button>
      </Menu.Item>
      <Menu.Item key="edit" icon={<EditOutlined />}>
        <Button
          type="text"
          onClick={() => router.push(`/tag/edit/${record._id}`)} // Redirect to edit page
        >
          Edit
        </Button>
      </Menu.Item>
      <Menu.Item key="delete" icon={<DeleteOutlined />}>
        <Popconfirm
          title="Are you sure you want to delete this tag?"
          onConfirm={() => handleDelete(record._id)}
          okText="Yes"
          cancelText="No"
        >
          <Button type="text" style={{ color: 'red' }}>
            Delete
          </Button>
        </Popconfirm>
      </Menu.Item>
    </Menu>
  );

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
      render: (text) => text || 0, // Default to 0 if no post count is provided
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
        <Dropdown overlay={menu(record)} trigger={['hover']} placement="bottomRight">
          <Button type="text" shape="circle" icon={<SettingOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Content style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
          }}
        >
          {/* 35% Section: Tag Creation Form */}
          <div
            style={{
              width: '35%',
              padding: '24px',
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2>Create Tag</h2>
            <Form form={form} layout="vertical" onFinish={handleCreateTag}>
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
                tooltip="If you leave it blank, it will be generated automatically."
              >
                <Input placeholder="Enter slug" />
              </Form.Item>

              <Form.Item label="Description" name="description">
                <Input.TextArea placeholder="Enter description" rows={3} />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
                  Create Tag
                </Button>
              </Form.Item>
            </Form>
          </div>

          {/* 65% Section: Tags List */}
          <div
            style={{
              width: '65%',
              padding: '24px',
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
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
                style={{ width: '60%' }}
              />
              <span>Total Tags: {filteredTags.length}</span>
            </div>
            <Table
              columns={columns}
              dataSource={filteredTags}
              rowKey="_id"
            />
          </div>
        </div>
      </Content>
    </DashboardLayout>
  );
};

export default CreateTagPage;
