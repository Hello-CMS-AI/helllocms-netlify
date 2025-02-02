import React, { useState, useEffect } from 'react';
import {
  Layout,
  Form,
  Input,
  Button,
  message,
  Progress,
  Select,
  AutoComplete,
  Tabs
} from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { Editor } from '@tinymce/tinymce-react';
import DashboardLayout from '../components/Layout';
import PostActions from '../components/PostActions';
import FeatureImageUpload from '../components/FeatureImageUpload';

const { Content } = Layout;
const { Option } = Select;
const { TabPane } = Tabs;

const MAX_META_TITLE = 60;
const MAX_META_DESCRIPTION = 160;

const getUsernameFromToken = () => {
  if (typeof window === 'undefined') return ''; // If running server-side, return empty string

  const token = localStorage.getItem('token'); // Get the JWT token from localStorage
  if (!token) return ''; // If no token exists, return empty string

  try {
    const payload = token.split('.')[1]; // Extract the payload part of the token
    const decodedPayload = JSON.parse(atob(payload)); // Decode Base64 payload
    return decodedPayload.username || ''; // Return the username from the payload
  } catch (error) {
    console.error('Error decoding token:', error); // Log any errors
    return ''; // Return empty string on failure
  }
};

const LiveBlogPost = (props) => {
  // -----------------------------------------
  // 1) POST ID: We assume you have it somehow
  // -----------------------------------------
  // For example, if you’re on `/posts/edit/:postId`, you might do:
  //    const { postId } = useParams();
  // Or if you set it after creating a new post:
  //    const [postId, setPostId] = useState(null);
  //
  // For now, let’s assume you either pass it via props or have a placeholder:
  const [postId, setPostId] = useState(props.postId || null);

  // AntD forms
  const [form] = Form.useForm();
  const [liveBlogForm] = Form.useForm();

  // Retrieve username from localStorage
  const username = getUsernameFromToken();

  // Tabs
  const [activeTab, setActiveTab] = useState('mainBlog');

  // -----------------------------------------
  // 2) MAIN BLOG STATE
  // -----------------------------------------
  const [content, setContent] = useState('');  // TinyMCE for Main Blog
  const [metaTitleLength, setMetaTitleLength] = useState(0);
  const [metaDescriptionLength, setMetaDescriptionLength] = useState(0);

  // Feature image
  const [featureImage, setFeatureImage] = useState(null);

  // Categories
  const [allCategories, setAllCategories] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);
  const [childrenByParent, setChildrenByParent] = useState({});
  const [selectedParent, setSelectedParent] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Tags
  const [allTags, setAllTags] = useState([]);
  const [postTags, setPostTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);

  // -----------------------------------------
  // 3) LIVE BLOG STATE
  // -----------------------------------------
  const [liveUpdates, setLiveUpdates] = useState([]);    // fetched from server
  const [liveBlogContent, setLiveBlogContent] = useState(''); // TinyMCE for new update

  // -----------------------------------------
  // 4) Fetch Categories
  // -----------------------------------------
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await fetch('http://localhost:5000/api/categories/list-categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        setAllCategories(data);
      } catch (err) {
        console.error(err);
        message.error('Error loading categories');
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!allCategories.length) return;
    const parents = allCategories.filter((cat) => !cat.parentCategory);
    setParentCategories(parents);

    const map = {};
    allCategories.forEach((cat) => {
      if (cat.parentCategory) {
        const pid = cat.parentCategory;
        if (!map[pid]) map[pid] = [];
        map[pid].push(cat);
      }
    });
    setChildrenByParent(map);
  }, [allCategories]);

  // -----------------------------------------
  // 5) Fetch Tags
  // -----------------------------------------
  useEffect(() => {
    const fetchTags = async () => {
      setLoadingTags(true);
      try {
        const res = await fetch('http://localhost:5000/api/tags/list-tags');
        if (!res.ok) throw new Error('Failed to fetch tags');
        const data = await res.json();
        setAllTags(data);
      } catch (error) {
        console.error(error);
        message.error('Error loading tags');
      } finally {
        setLoadingTags(false);
      }
    };
    fetchTags();
  }, []);

  // For Tag suggestions...
  const handleSearchTag = (inputValue) => {
    setTagInput(inputValue);
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }
    const filtered = allTags
      .filter((t) => t.name.toLowerCase().includes(inputValue.toLowerCase()))
      .map((t) => ({ value: t.name }));
    setSuggestions(filtered);
  };

  const handleSelectTag = (tagName) => {
    if (!postTags.includes(tagName)) {
      setPostTags([...postTags, tagName]);
    }
    setTagInput('');
    setSuggestions([]);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    const splitted = trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const merged = Array.from(new Set([...postTags, ...splitted]));
    setPostTags(merged);
    setTagInput('');
    setSuggestions([]);
  };

  const handleRemoveTag = (tag) => {
    setPostTags((prev) => prev.filter((t) => t !== tag));
  };

  // -----------------------------------------
  // 6) MAIN BLOG: Editor & Submit
  // -----------------------------------------
  const handleEditorChange = (updatedContent) => {
    setContent(updatedContent);
  };

  const handlePublish = () => {
    form.validateFields().then((values) => {
      handleSubmitPost({ ...values, status: 'published' }, true);
    });
  };

  const handleSaveDraft = () => {
    form.validateFields().then((values) => {
      handleSubmitPost({ ...values, status: 'draft' }, false);
    });
  };

  const handleSchedule = ({ scheduledAt }) => {
    form.validateFields().then((values) => {
      handleSubmitPost({ ...values, status: 'scheduled', scheduledAt }, true);
    });
  };

  const handleSubmit = (values) => {
    handleSubmitPost({ ...values, status: 'published' }, false);
  };

  const handleSubmitPost = async (postValues, usePublishEndpoint) => {
    try {
      const finalCategory = selectedChild || selectedParent;
      const finalTagIds = await ensureTagsExist(postTags);

      const data = {
        ...postValues,
        authorName: username,
        content,
        featureImage,
        category: finalCategory,
        tags: finalTagIds
      };

      let endpoint = 'http://localhost:5000/api/posts';
      if (usePublishEndpoint) {
        endpoint = 'http://localhost:5000/api/posts/publish';
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save post');
      }

      const result = await res.json();
      message.success(`Post saved successfully! Post ID: ${result.post._id}`);

      // Update local postId so we can do live updates
      setPostId(result.post._id);

      // Now redirect or do whatever you need
      window.location.href = `/posts/edit/liveblog/${result.post._id}`;
    } catch (error) {
      console.error('Error saving post:', error);
      message.error(error.message);
    }
  };

  // -----------------------------------------
  // 7) Create New Tags If Not Existing
  // -----------------------------------------
  const ensureTagsExist = async (tagNames) => {
    const finalIds = [];
    for (const name of tagNames) {
      const existing = allTags.find(
        (t) => t.name.toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        finalIds.push(existing._id);
      } else {
        const newId = await createNewTag(name);
        if (newId) finalIds.push(newId);
      }
    }
    return finalIds;
  };

  const createNewTag = async (name) => {
    try {
      const res = await fetch('http://localhost:5000/api/tags/add-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create tag');
      setAllTags((prev) => [...prev, data.tag]);
      return data.tag._id;
    } catch (err) {
      console.error('Error creating tag:', err);
      return null;
    }
  };

  // -----------------------------------------
  // 8) SEO Field with Character Count
  // -----------------------------------------
  const renderProgressWithInput = (
    label,
    name,
    maxLength,
    onChange,
    valueLength,
    isTextArea = false
  ) => {
    const isLimitExceeded = valueLength > maxLength;
    return (
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <Form.Item
          label={label}
          name={name}
          rules={[
            { required: true, message: `${label} is required` },
            { max: maxLength, message: `Max ${maxLength} characters allowed` }
          ]}
          style={{ marginBottom: 0 }}
        >
          {isTextArea ? (
            <Input.TextArea rows={3} placeholder={`Enter ${label}`} onChange={onChange} />
          ) : (
            <Input
              placeholder={`Enter ${label}`}
              onChange={onChange}
              style={{
                height: '40px',
                lineHeight: '40px',
                fontSize: '1.2em',
                fontWeight: 600,
                padding: '0 12px'
              }}
            />
          )}
        </Form.Item>

        <div
          style={{
            position: 'absolute',
            top: '-6px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span
            style={{
              fontSize: '12px',
              color: isLimitExceeded ? '#ff4d4f' : '#888',
              fontWeight: isLimitExceeded ? 'bold' : 'normal'
            }}
          >
            {valueLength} / {maxLength}
          </span>
          <Progress
            percent={Math.min((valueLength / maxLength) * 100, 100)}
            showInfo={false}
            size="small"
            strokeColor={
              isLimitExceeded
                ? '#ff4d4f'
                : {
                    '0%': '#faad14',
                    '100%': '#52c41a'
                  }
            }
            style={{ width: '120px' }}
          />
        </div>
      </div>
    );
  };

  // -----------------------------------------
  // 9) LIVE BLOG: Load Existing & Add Updates
  // -----------------------------------------
  // Load existing live updates whenever `postId` changes (e.g. once the post is created or on mount).
  useEffect(() => {
    if (!postId) return; // no post => skip
    const fetchLiveUpdates = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/live-updates/${postId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch live updates');
        }
        const updates = await res.json();
        setLiveUpdates(updates);
      } catch (error) {
        console.error(error);
        message.error(error.message);
      }
    };
    fetchLiveUpdates();
  }, [postId]);

  // This function calls POST /api/live-updates/:postId to create a new update
  const handleAddLiveUpdate = async (values) => {
    if (!postId) {
      return message.warning('Please save or create the post first!');
    }
    try {
      const payload = {
        title: values.liveBlogTitle || '',
        content: liveBlogContent, // from TinyMCE
        createdBy: username
      };

      const res = await fetch(`http://localhost:5000/api/live-updates/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to create live update');
      }
      const newUpdate = await res.json();

      // Add new update to local state
      setLiveUpdates((prev) => [...prev, newUpdate]);

      // Reset fields
      liveBlogForm.resetFields(['liveBlogTitle']);
      setLiveBlogContent('');
      message.success('Live update added!');
    } catch (error) {
      console.error(error);
      message.error(error.message);
    }
  };

  // If you still want to store it locally for a quick preview, you can:
  // but the final source of truth is the server.
  const handleLiveBlogFinish = (values) => {
    handleAddLiveUpdate(values);
  };

  const handleLiveEditorChange = (value) => {
    setLiveBlogContent(value);
  };

  // -----------------------------------------
  // 10) RENDER
  // -----------------------------------------
  return (
    <DashboardLayout>
      <Content
        style={{
          display: 'flex',
          gap: '10px',
          padding: '10px',
          alignItems: 'flex-start'
        }}
      >
        {/* LEFT: MAIN CONTENT (Tabs) */}
        <div style={{ flex: '0 0 80%', maxWidth: '80%', padding: '5px' }}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            {/* =============== Main Blog Tab =============== */}
            <TabPane tab="Main Blog" key="mainBlog">
              <Form form={form} layout="vertical" onFinish={handleSubmit}>
                {/* 1) Title + Slug */}
                <div
                  style={{
                    background: '#fff',
                    padding: '24px',
                    marginBottom: '16px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <Form.Item
                    label="Title"
                    name="title"
                    rules={[{ required: true, message: 'Title is required' }]}
                    style={{ marginBottom: 8 }}
                  >
                    <Input
                      placeholder="Enter the title"
                      style={{
                        height: '40px',
                        lineHeight: '40px',
                        fontSize: '1.2em',
                        fontWeight: 600,
                        padding: '0 12px'
                      }}
                    />
                  </Form.Item>
                  <Form.Item label="Slug" name="slug" style={{ marginBottom: 0 }}>
                    <Input placeholder="If blank, it will be auto-generated" />
                  </Form.Item>
                </div>

                {/* 2) Summary */}
                <div
                  style={{
                    background: '#fff',
                    padding: '24px',
                    marginBottom: '16px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <Form.Item label="Summary" name="summary">
                    <Input.TextArea rows={3} placeholder="Enter a short summary" />
                  </Form.Item>
                </div>

                {/* 3) Main Blog (TinyMCE) */}
                <div
                  style={{
                    background: '#fff',
                    padding: '24px',
                    marginBottom: '16px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <Form.Item
                    label="Description"
                    name="content"
                    rules={[{ required: true, message: 'Description is required' }]}
                  >
                    <Editor
                      tinymceScriptSrc="/tinymce/tinymce.min.js"
                      init={{
                        menubar: false,
                        plugins: [
                          'advlist',
                          'anchor',
                          'autolink',
                          'autosave',
                          'code',
                          'fullscreen',
                          'image',
                          'link',
                          'lists',
                          'media',
                          'table',
                          'preview',
                          'searchreplace',
                          'wordcount',
                          'visualblocks',
                          'visualchars'
                        ],
                        toolbar:
                          'fullscreen blocks bold italic underline strikethrough | ' +
                          'bullist numlist | alignleft aligncenter alignright alignjustify | code link | image media preview | ' +
                          'table outdent indent forecolor backcolor removeformat undo redo | ',
                        branding: false,
                        height: 500
                      }}
                      onEditorChange={handleEditorChange}
                    />
                  </Form.Item>
                </div>

                {/* 4) SEO Fields */}
                <div
                  style={{
                    background: '#fff',
                    padding: '24px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <h2>SEO Details</h2>

                  {renderProgressWithInput(
                    'Meta Title',
                    'metaTitle',
                    MAX_META_TITLE,
                    (e) => setMetaTitleLength(e.target.value.length),
                    metaTitleLength
                  )}

                  {renderProgressWithInput(
                    'Meta Description',
                    'metaDescription',
                    MAX_META_DESCRIPTION,
                    (e) => setMetaDescriptionLength(e.target.value.length),
                    metaDescriptionLength,
                    true
                  )}

                  <Form.Item
                    label="Meta Keywords"
                    name="metaKeywords"
                    rules={[
                      {
                        required: true,
                        message: 'Please enter at least one keyword.'
                      }
                    ]}
                  >
                    <Select
                      mode="tags"
                      tokenSeparators={[',']}
                      style={{ width: '100%' }}
                      placeholder="Type or paste keywords, press Enter"
                    />
                  </Form.Item>
                </div>

                {/* 5) Save Post Button */}
                <Button type="primary" htmlType="submit" style={{ marginTop: '16px' }}>
                  Save Post
                </Button>
              </Form>
            </TabPane>

            {/* =============== Live Blog Tab =============== */}
            <TabPane tab="Live Blog" key="liveBlog">
              <Form
                form={liveBlogForm}
                layout="vertical"
                onFinish={handleLiveBlogFinish}
                style={{
                  background: '#fff',
                  padding: '24px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                {/* Title Input */}
                <Form.Item label="Live Blog Title" name="liveBlogTitle">
                  <Input placeholder="Enter live blog title (optional)" />
                </Form.Item>

                {/* TinyMCE for update content */}
                <p style={{ marginBottom: 8 }}>Live Blog Description (TinyMCE):</p>
                <Editor
                  tinymceScriptSrc="/tinymce/tinymce.min.js"
                  init={{
                    menubar: false,
                    plugins: [
                      'advlist',
                      'anchor',
                      'autolink',
                      'autosave',
                      'code',
                      'fullscreen',
                      'image',
                      'link',
                      'lists',
                      'media',
                      'table',
                      'preview',
                      'searchreplace',
                      'wordcount',
                      'visualblocks',
                      'visualchars'
                    ],
                    toolbar:
                      'fullscreen blocks bold italic underline strikethrough | ' +
                      'bullist numlist | alignleft aligncenter alignright alignjustify | code link | image media preview | ' +
                      'table outdent indent forecolor backcolor removeformat undo redo | ',
                    branding: false,
                    height: 300
                  }}
                  onEditorChange={handleLiveEditorChange}
                  value={liveBlogContent}
                />

                <Button type="primary" htmlType="submit" style={{ marginTop: 16 }}>
                  Add Update
                </Button>
              </Form>

              {/* Display the list of Live Updates (fetched from server) */}
              <div style={{ marginTop: 24 }}>
                <h3>Live Updates</h3>
                {liveUpdates.length === 0 && (
                  <p style={{ color: '#999' }}>No live updates added yet.</p>
                )}
                {liveUpdates.map((update) => (
                  <div
                    key={update._id} // if your server returns _id
                    style={{
                      border: '1px solid #ccc',
                      borderRadius: 4,
                      padding: 8,
                      marginBottom: 16,
                      background: '#fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    <strong>
                      {update.title || 'Untitled'} –{' '}
                      {new Date(update.postedAt).toLocaleString()}
                    </strong>
                    <div
                      style={{ marginTop: 4 }}
                      dangerouslySetInnerHTML={{ __html: update.content }}
                    />
                  </div>
                ))}
              </div>
            </TabPane>
          </Tabs>
        </div>

        {/* RIGHT: SIDEBAR (Categories, Tags, Feature Image, Post Actions) */}
        <div style={{ flex: '0 0 20%', maxWidth: '20%', padding: '5px' }}>
          <PostActions
            postId={postId} // pass the actual postId (if you want the actions to do something)
            onPublish={handlePublish}
            onSchedule={handleSchedule}
            onSaveDraft={handleSaveDraft}
          />

          <FeatureImageUpload
            featureImage={featureImage}
            onChange={(img) => setFeatureImage(img)}
          />

          {/* Category Selection */}
          <div
            style={{
              background: '#fff',
              padding: '16px',
              marginTop: '16px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <h3>Category Selection</h3>
            <Select
              placeholder="Select Parent Category"
              style={{ width: '100%', marginBottom: '16px' }}
              loading={loadingCategories}
              value={selectedParent}
              onChange={(val) => {
                setSelectedParent(val);
                setSelectedChild(null);
              }}
              allowClear
            >
              {parentCategories.map((p) => (
                <Option key={p._id} value={p._id}>
                  {p.name}
                </Option>
              ))}
            </Select>

            {selectedParent &&
              childrenByParent[selectedParent] &&
              childrenByParent[selectedParent].length > 0 && (
                <Select
                  placeholder="Select Child Category"
                  style={{ width: '100%' }}
                  value={selectedChild}
                  onChange={(val) => setSelectedChild(val)}
                  allowClear
                >
                  {childrenByParent[selectedParent].map((c) => (
                    <Option key={c._id} value={c._id}>
                      {c.name}
                    </Option>
                  ))}
                </Select>
              )}
          </div>

          {/* Tags */}
          <div
            style={{
              background: '#fff',
              padding: '16px',
              marginTop: '16px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <h3>Tags</h3>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <AutoComplete
                style={{ flex: 1 }}
                value={tagInput}
                onChange={(val) => setTagInput(val)}
                onSearch={handleSearchTag}
                onSelect={handleSelectTag}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                options={suggestions}
                placeholder="Type tag name"
                allowClear
              />
              <Button
                icon={<PlusOutlined style={{ color: '#fff' }} />}
                onClick={handleAddTag}
                style={{
                  backgroundColor: '#1890ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }}
                type="text"
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {postTags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 8px'
                  }}
                >
                  <span style={{ marginRight: '8px' }}>{tag}</span>
                  <CloseOutlined
                    style={{ cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => handleRemoveTag(tag)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Content>
    </DashboardLayout>
  );
};

export default LiveBlogPost;
