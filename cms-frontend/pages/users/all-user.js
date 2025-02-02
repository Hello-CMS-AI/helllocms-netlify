import React, { useEffect, useState } from 'react';
import { Table, message, Space, Button, Modal } from 'antd';
import DashboardLayout from '../../components/Layout';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { jwtDecode } from 'jwt-decode'; // Import the jwt-decode function

const AllUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [activeRole, setActiveRole] = useState('all');
  const [roleCounts, setRoleCounts] = useState({ all: 0, admin: 0, editor: 0, subscriber: 0 });
  const [userRole, setUserRole] = useState('');  // Store user role here
  const router = useRouter();

  useEffect(() => {
    // Get the JWT token from localStorage
    const token = localStorage.getItem('token');
    
    if (token) {
      try {
        // Decode the JWT token to get the user role
        const decodedToken = jwtDecode(token);
        const role = decodedToken.role; // Extract role from decoded token
        
        setUserRole(role); // Store the role in state
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }

    const fetchUsers = async () => {
      try {
        const response = await fetch('https://api.dinasuvadu.in/api/users/all-users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
        countRoles(data);
      } catch (error) {
        message.error('Error fetching users');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const countRoles = (data) => {
    const roleCount = data.reduce(
      (acc, user) => {
        acc.all += 1;
        acc[user.role.toLowerCase()] += 1;
        return acc;
      },
      { all: 0, admin: 0, editor: 0, subscriber: 0 }
    );
    setRoleCounts(roleCount);
  };

  const handleFilter = (role) => {
    setActiveRole(role);
    setFilteredUsers(role === 'all' ? users : users.filter(user => user.role.toLowerCase() === role));
  };

  const columns = [
    { title: 'Username', dataIndex: 'username', key: 'username' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'First Name', dataIndex: 'firstName', key: 'firstName' },
    { title: 'Last Name', dataIndex: 'lastName', key: 'lastName' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
    { title: 'Language', dataIndex: 'language', key: 'language' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button icon={<EyeOutlined />} onClick={() => handleView(record)} />
          {userRole === 'admin' && (
            <>
              <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
              <Button icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
            </>
          )}
        </Space>
      ),
    },
  ];

  const handleView = (record) => {
    message.info(`Viewing ${record.username}`);
  };

  const handleEdit = (record) => {
    router.push(`/users/edit/${record._id}`);
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this user?',
      content: `Username: ${record.username}`,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          const response = await fetch(`https://api.dinasuvadu.in/api/users/${record._id}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('Failed to delete user');
          
          // Update users and filteredUsers
          const updatedUsers = users.filter(user => user._id !== record._id);
          setUsers(updatedUsers);
          setFilteredUsers(activeRole === 'all' ? updatedUsers : updatedUsers.filter(user => user.role.toLowerCase() === activeRole));
          
          // Recount roles with the updated list
          countRoles(updatedUsers);

          message.success('User deleted successfully');
        } catch (error) {
          message.error('Error deleting user');
          console.error(error);
        }
      },
    });
  };

  return (
    <DashboardLayout>
      <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '8px' }}>
        <h2>
          All Users
          <Space size="middle" style={{ marginLeft: '16px' }}>
            <Button 
              type="text" 
              style={{ color: activeRole === 'all' ? '#1890ff' : '#000' }} 
              onClick={() => handleFilter('all')}
            >
              All ({roleCounts.all})
            </Button>
            <Button 
              type="text" 
              style={{ color: activeRole === 'admin' ? '#1890ff' : '#000' }} 
              onClick={() => handleFilter('admin')}
            >
              Administrator ({roleCounts.admin})
            </Button>
            <Button 
              type="text" 
              style={{ color: activeRole === 'editor' ? '#1890ff' : '#000' }} 
              onClick={() => handleFilter('editor')}
            >
              Editor ({roleCounts.editor})
            </Button>
            <Button 
              type="text" 
              style={{ color: activeRole === 'subscriber' ? '#1890ff' : '#000' }} 
              onClick={() => handleFilter('subscriber')}
            >
              Subscriber ({roleCounts.subscriber})
            </Button>
          </Space>
        </h2>
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </div>
    </DashboardLayout>
  );
};

export default AllUsers;
