import React, { useState } from 'react';
import { Layout, Menu, Divider } from 'antd';
import dynamic from 'next/dynamic';
import Image from 'next/image'; // Import Next.js Image
import { useRouter } from 'next/router';

const { Sider } = Layout;

// Dynamic Imports for Icons
const HomeOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.HomeOutlined));
const FireOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.FireOutlined));
const FileAddOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.FileAddOutlined));
const NotificationOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.NotificationOutlined));
const FileOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.FileOutlined));
const FolderOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.FolderOutlined));
const VideoCameraOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.VideoCameraOutlined));
const TagsOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.TagsOutlined));
const ReadOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.ReadOutlined));
const AppstoreAddOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.AppstoreAddOutlined));
const AppstoreOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.AppstoreOutlined));
const BulbOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.BulbOutlined));
const UserOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.UserOutlined));
const CommentOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.CommentOutlined));
const CalendarOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.CalendarOutlined));
const ContactsOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.ContactsOutlined));
const SettingOutlined = dynamic(() => import('@ant-design/icons').then((mod) => mod.SettingOutlined));

const Sidebar = ({ collapsed }) => {
  const [openKeys, setOpenKeys] = useState([]);
  const router = useRouter();

  const handleOpenChange = (keys) => {
    setOpenKeys(keys.length ? [keys[keys.length - 1]] : []);
  };

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={200}
      collapsedWidth={80}
      style={{
        zIndex: 1100,
        height: '100vh',
        backgroundColor: '#001529',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        overflowY: 'auto',
        transition: 'width 0.3s ease-in-out, box-shadow 0.3s ease-in-out', // Added smooth transition for width and box-shadow
        boxShadow: collapsed ? '4px 0 10px rgba(0, 0, 0, 0.2)' : '4px 0 10px rgba(0, 0, 0, 0.2)', // Keep shadow on both collapsed and expanded states
      }}
    >
      <div style={{ textAlign: 'center', padding: '16px', color: 'white' }}>
        <Image src="/logo.png" alt="Logo" width={120} height={40} />
      </div>

      <Menu
        theme="dark"
        mode="inline"
        openKeys={openKeys}
        onOpenChange={handleOpenChange}
        onClick={(item) => router.push(item.item.props.path)}
        style={{ height: '100%', borderRight: 0 }}
      >
        <Menu.Item key="1" icon={<HomeOutlined />} path="/dashboard">Home</Menu.Item>
        <Menu.Item key="2" icon={<FireOutlined />} path="/LiveBlogPost">Live</Menu.Item>
        <Menu.Item key="3" icon={<FileAddOutlined />} path="/PostCreation">Add Post</Menu.Item>
        <Menu.Item key="4" icon={<NotificationOutlined />} path="/breaking-news">Breaking News</Menu.Item>

        <Menu.SubMenu key="sub1" icon={<FileOutlined />} title="Post">
          <Menu.Item key="5" path="/AllPosts">All Posts</Menu.Item>
          <Menu.Item key="6" path="/posts/scheduled">Scheduled Posts</Menu.Item>
          <Menu.Item key="7" path="/posts/pending">Pending Posts</Menu.Item>
          <Menu.Item key="8" path="/posts/drafts">Drafts</Menu.Item>
        </Menu.SubMenu>

        <Menu.SubMenu key="sub2" icon={<FolderOutlined />} title="Media">
          <Menu.Item key="9" path="/medialibrary">Library</Menu.Item>
          <Menu.Item key="10" path="/media/add-new">Add New</Menu.Item>
        </Menu.SubMenu>

        <Menu.Item key="11" icon={<VideoCameraOutlined />} path="/videos">Videos</Menu.Item>

        <Menu.SubMenu key="sub3" icon={<AppstoreAddOutlined />} title="Trending">
          <Menu.Item key="12" path="/trending/top-news">Top News</Menu.Item>
          <Menu.Item key="13" path="/trending/topics">Topics</Menu.Item>
        </Menu.SubMenu>

        <Menu.Item key="14" icon={<ReadOutlined />} path="/webstories">Webstories</Menu.Item>
        <Menu.Item key="15" icon={<TagsOutlined />} path="/category/list">Categories</Menu.Item>
        <Menu.Item key="16" icon={<AppstoreOutlined />} path="/category/list">Menus</Menu.Item>
        <Menu.Item key="17" icon={<BulbOutlined />} path="/notepad">Notepad</Menu.Item>
        <Menu.Item key="18" icon={<TagsOutlined />} path="/tag/list">Tags</Menu.Item>

        <Menu.SubMenu key="sub4" icon={<FileOutlined />} title="Pages">
          <Menu.Item key="19" path="/pages/all">All Pages</Menu.Item>
          <Menu.Item key="20" path="/pages/add-new">Add New</Menu.Item>
        </Menu.SubMenu>

        <Menu.SubMenu key="sub5" icon={<UserOutlined />} title="User">
          <Menu.Item key="21" path="/users/all-user">All Users</Menu.Item>
          <Menu.Item key="22" path="/users/add-user">Add New User</Menu.Item>
          <Menu.Item key="23" path="/users/my-profile">My Profile</Menu.Item>
        </Menu.SubMenu>

        <Menu.Item key="24" icon={<CommentOutlined />} path="/comments">Comments</Menu.Item>
        <Menu.Item key="25" icon={<NotificationOutlined />} path="/push-notifications">Push Notifications</Menu.Item>
        <Menu.Item key="26" icon={<AppstoreAddOutlined />} path="/newsletter">Newsletter</Menu.Item>
        <Menu.Item key="27" icon={<AppstoreOutlined />} path="/polls">Polls</Menu.Item>
        <Menu.Item key="28" icon={<FileAddOutlined />} path="/cards">Cards</Menu.Item>
        <Menu.Item key="29" icon={<AppstoreOutlined />} path="/add-spaces">Add Spaces</Menu.Item>

        <Divider style={{ margin: '10px 0', opacity: 0.8 }} />

        <Menu.Item key="30" icon={<BulbOutlined />} path="/hello">Hello</Menu.Item>
        <Menu.Item key="31" icon={<CalendarOutlined />} path="EventCalendar">Calendar</Menu.Item>
        <Menu.Item key="32" icon={<AppstoreAddOutlined />} path="/trends">Trends</Menu.Item>
        <Menu.Item key="33" icon={<BulbOutlined />} path="/genie">Genie</Menu.Item>
        <Menu.Item key="34" icon={<AppstoreOutlined />} path="/analytics">Analytics</Menu.Item>
        <Menu.Item key="35" icon={<FileOutlined />} path="/log">Log</Menu.Item>
        <Menu.Item key="36" icon={<SettingOutlined />} path="/settings">Settings</Menu.Item>
        <Menu.Item key="37" icon={<ContactsOutlined />} path="/contact">Contact</Menu.Item>
        <Menu.Item key="38" icon={<NotificationOutlined />} path="/support">Support</Menu.Item>
      </Menu>
    </Sider>
  );
};

export default Sidebar;
