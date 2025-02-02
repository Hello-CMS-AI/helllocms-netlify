import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Layout,
  Row,
  Col,
  Select,
  Input,
  Button,
  Table,
  DatePicker,
  message
} from 'antd';
import DashboardLayout from '../components/Layout';
import dayjs from 'dayjs';


const { Content } = Layout;
const { Search } = Input;
const { Option } = Select;
const { MonthPicker } = DatePicker;

/** Simple slugify helper for category names in the View URL */
function slugifyName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const AllPosts = () => {
  const router = useRouter();

  // ========== Filter States ==========
  const [status, setStatus] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [month, setMonth] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ========== Dropdown Data ==========
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [childrenByParent, setChildrenByParent] = useState({});

  // ========== Posts & Loading ==========
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  // -------------------------------------
  // 1) Fetch Authors & Categories
  // -------------------------------------
  useEffect(() => {
    // Distinct authors
    fetch('http://localhost:5000/api/posts/distinct-authors')
      .then((res) => res.json())
      .then((data) => {
        setAuthors(data.authors || []);
      })
      .catch(console.error);

    // Categories
    fetch('http://localhost:5000/api/categories/list-categories')
      .then((res) => res.json())
      .then((data) => {
        setCategories(data);

        // Build map of child categories keyed by parentCategory _id
        const map = {};
        data.forEach((cat) => {
          if (cat.parentCategory) {
            if (!map[cat.parentCategory]) map[cat.parentCategory] = [];
            map[cat.parentCategory].push(cat);
          }
        });
        setChildrenByParent(map);
      })
      .catch(console.error);
  }, []);

  // -------------------------------------
  // 2) Fetch Posts on mount or Filter
  // -------------------------------------
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);

      // Build query
      const queryParams = new URLSearchParams();

      // If user picks a status (incl "trash"), use it, else exclude trash
      if (status) {
        queryParams.set('status', status);
      } else {
        queryParams.set('status_ne', 'trash');
      }

      if (authorName) queryParams.set('authorName', authorName);
      if (month) queryParams.set('month', month.format('YYYY-MM'));
      if (searchTerm) queryParams.set('search', searchTerm);

      // If a subCategory is chosen => just that child
      // Otherwise, if parent is chosen => parent plus all children
      if (subCategory) {
        queryParams.set('categoryIn', subCategory);
      } else if (category) {
        const childArray = childrenByParent[category] || [];
        const allCatIds = [category, ...childArray.map((c) => c._id)];
        queryParams.set('categoryIn', allCatIds.join(','));
      }

      const res = await fetch(`http://localhost:5000/api/posts?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error(err);
      message.error('Error fetching posts');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------
  // 3) Filter Button => re-fetch
  // -------------------------------------
  const handleFilter = () => {
    fetchPosts();
  };

  // -------------------------------------
  // 4) Action Handlers (Edit, Trash, etc.)
  // -------------------------------------
  const handleEdit = (postId) => {
    router.push(`/posts/edit/${postId}`);
  };

  const handleTrash = async (postId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'trash' }),
      });
      if (!res.ok) throw new Error('Failed to move post to Trash');
      message.success('Moved to Trash');
      fetchPosts();
    } catch (err) {
      console.error(err);
      message.error('Error moving to trash');
    }
  };

  const handleRestore = async (postId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      if (!res.ok) throw new Error('Failed to restore post');
      message.success('Post restored to Draft');
      fetchPosts();
    } catch (err) {
      console.error(err);
      message.error('Error restoring post');
    }
  };

  const handleDeleteForever = async (postId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${postId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to permanently delete post');
      message.success('Post permanently deleted');
      fetchPosts();
    } catch (err) {
      console.error(err);
      message.error('Error deleting post');
    }
  };

  // If published => build category-based URL
  const handleView = (record) => {
    if (!record.slug) {
      message.error('No slug found for this post.');
      return;
    }

    let baseURL = 'http://localhost:3000'; 
    const cat = record.category; // e.g. cat.name, cat.parentCategory.name?

    if (cat?.parentCategory?.name) {
      // Child category => parent + child
      const parentSlug = slugifyName(cat.parentCategory.name);
      const childSlug = slugifyName(cat.name);
      baseURL += `/${parentSlug}/${childSlug}/${record.slug}`;
    } else if (cat?.name) {
      // Single-level category
      const catSlug = slugifyName(cat.name);
      baseURL += `/${catSlug}/${record.slug}`;
    } else {
      // No category
      baseURL += `/${record.slug}`;
    }

    window.open(baseURL, '_blank');
  };

  // If draft/scheduled => preview by _id
  const handlePreview = (postId) => {
    window.open(`http://localhost:3000/preview/${postId}`, '_blank');
  };

  // -------------------------------------
  // 5) Table Columns
  // -------------------------------------
  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => {
        const isDraft = record.status === 'draft';
        const isTrash = record.status === 'trash';

        return (
          <div style={{ position: 'relative' }}>
            {/* Title + blinking dot if draft */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{text}</span>
              {isDraft && (
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'green',
                    animation: 'blinker 1.5s linear infinite',
                  }}
                />
              )}
            </div>

            {/* Row actions => hidden unless hovered */}
            <div className="row-actions" style={{ marginTop: '4px' }}>
              {isTrash ? (
                <>
                  <Button size="small" onClick={() => handleRestore(record._id)}>
                    Restore
                  </Button>
                  <Button size="small" danger onClick={() => handleDeleteForever(record._id)}>
                    Delete
                  </Button>
                </>
              ) : (
                <>
                  <Button size="small" onClick={() => handleEdit(record._id)}>
                    Edit
                  </Button>
                  <Button size="small" danger onClick={() => handleTrash(record._id)}>
                    Trash
                  </Button>

                  {record.status === 'published' ? (
                    <Button size="small" onClick={() => handleView(record)}>
                      View
                    </Button>
                  ) : (
                    <Button size="small" onClick={() => handlePreview(record._id)}>
                      Preview
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Author',
      dataIndex: 'authorName',
      key: 'authorName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat) => {
        if (!cat || !cat.name) return '--';
    
        // If there's a parentCategory, show "parentName(parent), childName(child)"
        if (cat.parentCategory?.name) {
          return `${cat.parentCategory.name}, ${cat.name}`;
        }
        // Otherwise top-level category
        return `${cat.name}`;
      },
    },    
    {
      title: 'Date/Time',
      dataIndex: 'updatedAt',
      key: 'dateTime',
      render: (_, record) => {
        switch (record.status) {
          case 'published':
            return record.publishedAt
              ? dayjs(record.publishedAt).format('YYYY/MM/DD [at] h:mm a')
              : '--';
          case 'scheduled':
            return record.scheduledAt
              ? dayjs(record.scheduledAt).format('YYYY/MM/DD [at] h:mm a')
              : record.updatedAt
              ? dayjs(record.updatedAt).format('YYYY/MM/DD [at] h:mm a')
              : '--';
          case 'draft':
          default:
            return record.updatedAt
              ? dayjs(record.updatedAt).format('YYYY/MM/DD [at] h:mm a')
              : '--';
        }
      },
    },
  ];

  const dataSource = posts.map((p) => ({ ...p, key: p._id }));

  // -------------------------------------
  // 6) Render
  // -------------------------------------
  return (
    <DashboardLayout>
      <Content style={{ padding: '16px' }}>
        <h1>All Posts</h1>

        {/* Filter Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          {/* Month Picker */}
          <Col>
            <MonthPicker
              placeholder="Select Month"
              value={month}
              onChange={(val) => setMonth(val)}
              format="YYYY-MM"
            />
          </Col>

          {/* Post Status */}
          <Col>
            <Select
              placeholder="Post Status"
              style={{ width: 140 }}
              value={status || undefined}
              onChange={(val) => setStatus(val)}
              allowClear
            >
              <Option value="draft">Draft</Option>
              <Option value="published">Published</Option>
              <Option value="scheduled">Scheduled</Option>
              <Option value="trash">Trash</Option>
            </Select>
          </Col>

          {/* Author */}
          <Col>
            <Select
              placeholder="Author"
              style={{ width: 160 }}
              value={authorName || undefined}
              onChange={(val) => setAuthorName(val)}
              allowClear
            >
              {authors.map((auth) => (
                <Option key={auth} value={auth}>
                  {auth}
                </Option>
              ))}
            </Select>
          </Col>

          {/* Parent Category */}
          <Col>
            <Select
              placeholder="Parent Category"
              style={{ width: 160 }}
              value={category || undefined}
              onChange={(val) => {
                setCategory(val);
                setSubCategory('');
              }}
              allowClear
            >
              {categories
                .filter((cat) => !cat.parentCategory) // only parents
                .map((cat) => (
                  <Option key={cat._id} value={cat._id}>
                    {cat.name}
                  </Option>
                ))}
            </Select>
          </Col>

          {/* Subcategory (if any exist for chosen parent) */}
          <Col>
            {category && childrenByParent[category] && childrenByParent[category].length > 0 && (
              <Select
                placeholder="Subcategory"
                style={{ width: 160 }}
                value={subCategory || undefined}
                onChange={(val) => setSubCategory(val)}
                allowClear
              >
                {childrenByParent[category].map((child) => (
                  <Option key={child._id} value={child._id}>
                    {child.name}
                  </Option>
                ))}
              </Select>
            )}
          </Col>

          {/* Search (Enter triggers fetchPosts) */}
          <Col>
            <Search
              placeholder="Search Title/Content"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={() => fetchPosts()}
              onPressEnter={() => fetchPosts()} // Allow pressing Enter
              style={{ width: 180 }}
              allowClear
            />
          </Col>

          {/* Filter Button */}
          <Col>
            <Button type="primary" onClick={handleFilter}>
              Filter
            </Button>
          </Col>

          {/* Add Post */}
          <Col>
            <Button type="default" onClick={() => router.push('/posts/new')}>
              + Add Post
            </Button>
          </Col>
        </Row>

        <Table
          dataSource={dataSource}
          columns={columns}
          loading={loading}
          rowKey="_id"
          rowClassName="post-row" // needed for hover-based CSS
        />
      </Content>
    </DashboardLayout>
  );
};

export default AllPosts;
