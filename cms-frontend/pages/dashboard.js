import React, { useState, useEffect } from 'react';
import { Layout, message } from 'antd';
import { useRouter } from 'next/router';
import DashboardLayout from '../components/Layout';
import { validateToken } from '../utils/auth'; // Utility function for token validation

const { Content, Footer } = Layout;

const Dashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [username, setUsername] = useState(''); // State to store the username
  const router = useRouter();
  const INACTIVITY_LIMIT = 10 * 60 * 60 * 1000; // 10 hours for testing, adjust as needed

  // Toggle the sidebar
  const toggleSidebar = () => setCollapsed(!collapsed);

  // Function to switch views based on menu selection
  const handleMenuClick = (view) => {
    setCurrentView(view);
  };

  useEffect(() => {
    const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('username');

      // Use Ant Design's message.warning for logout notification
      message.warning('You have been logged out due to inactivity.');
      router.push('/login'); // Redirect to login page
    };

    // Validate token on component mount
    const token = localStorage.getItem('token');
    if (!token || !validateToken(token)) {
      message.error('Your session has expired. Please log in again.');
      handleLogout();
      return;
    }

    // Decode token to extract the username
    const decodeToken = (token) => {
      try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload)); // Decode base64 payload
      } catch (error) {
        console.error('Failed to decode token:', error);
        return null;
      }
    };

    const decodedToken = decodeToken(token);
    if (decodedToken?.username) {
      setUsername(decodedToken.username); // Set the username from the token
    }

    // Reset the timer on user activity
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(handleLogout, INACTIVITY_LIMIT);
    };

    // Start the inactivity timer
    let timer = setTimeout(handleLogout, INACTIVITY_LIMIT);

    // Listen for user activity to reset the timer
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);

    // Cleanup on component unmount
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
    };
  }, [router, INACTIVITY_LIMIT]); // Added INACTIVITY_LIMIT to the dependency array

  return (
    <DashboardLayout>
      <Content>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 20px',
            backgroundColor: '#f0f2f5',
          }}
        >
          <h2>Welcome, {username || 'User'}!</h2>
        </header>
        {/* Add dashboard content here */}
      </Content>
      <Footer style={{ textAlign: 'center' }}>Your Footer Content Here</Footer>
    </DashboardLayout>
  );
};

export default Dashboard;
