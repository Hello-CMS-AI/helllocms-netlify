import React, { useState, useEffect } from 'react';
import { Layout, Form, Input, Button, message, Progress, Select, AutoComplete } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { Editor } from '@tinymce/tinymce-react';
import DashboardLayout from '../components/Layout';
import PostActions from '../components/PostActions';
import FeatureImageUpload from '../components/FeatureImageUpload';

const { Content } = Layout;
const { Option } = Select;

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

const PostCreationPage = () => {
  const [form] = Form.useForm();

  // ===========================
  // 0) Retrieve username
  // ===========================
  // We'll store the localStorage username into a variable.
  const username = getUsernameFromToken();

  // ====== Editor / SEO State ======
  const [content, setContent] = useState('');
  const [metaTitleLength, setMetaTitleLength] = useState(0);
  const [metaDescriptionLength, setMetaDescriptionLength] = useState(0);

  // ====== Feature Image ======
  const [featureImage, setFeatureImage] = useState(null);

  // ====== Category Logic ======
  const [allCategories, setAllCategories] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);
  const [childrenByParent, setChildrenByParent] = useState({});
  const [selectedParent, setSelectedParent] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // ====== Tags ======
  const [allTags, setAllTags] = useState([]);   // from /api/tags/list-tags
  const [postTags, setPostTags] = useState([]); // array of strings the user has chosen
  const [tagInput, setTagInput] = useState(''); // typed text
  const [suggestions, setSuggestions] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);

  // ----------------------------------------------------------------
  // 1) Fetch Categories
  // ----------------------------------------------------------------
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await fetch('https://api.dinasuvadu.in/api/categories/list-categories');
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

  // Once we have all categories, split them into parent vs child
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

  // ----------------------------------------------------------------
  // 2) Fetch Tags
  // ----------------------------------------------------------------
  useEffect(() => {
    const fetchTags = async () => {
      setLoadingTags(true);
      try {
        const res = await fetch('https://api.dinasuvadu.in/api/tags/list-tags');
        if (!res.ok) throw new Error('Failed to fetch tags');
        const data = await res.json();
        setAllTags(data); // e.g. [ { _id, name }, ... ]
      } catch (error) {
        console.error(error);
        message.error('Error loading tags');
      } finally {
        setLoadingTags(false);
      }
    };
    fetchTags();
  }, []);

  // Tag suggestions
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
    const splitted = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    const merged = Array.from(new Set([...postTags, ...splitted]));
    setPostTags(merged);
    setTagInput('');
    setSuggestions([]);
  };

  const handleRemoveTag = (tag) => {
    setPostTags((prev) => prev.filter((t) => t !== tag));
  };

  // ----------------------------------------------------------------
  // 3) Editor
  // ----------------------------------------------------------------
  const handleEditorChange = (updatedContent) => {
    setContent(updatedContent);
  };

  // ----------------------------------------------------------------
  // 4) Post Action Handlers
  // ----------------------------------------------------------------
  // For "draft" => we POST to /api/posts
  // For "published"/"scheduled" => we POST to /api/posts/publish
  // because the publish endpoint in your backend handles scheduledAt logic

  const handlePublish = () => {
    form.validateFields().then((values) => {
      handleSubmitPost({ ...values, status: 'published' }, true); // second param => use /publish
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

  // If user hits the "Save Post" button at the bottom
  const handleSubmit = (values) => {
    handleSubmitPost({ ...values, status: 'published' }, false);
  };

  // ----------------------------------------------------------------
  // 5) handleSubmitPost => calls the correct endpoint
  // ----------------------------------------------------------------
  const handleSubmitPost = async (postValues, usePublishEndpoint) => {
    try {
      // figure out final category (parent or child)
      const finalCategory = selectedChild || selectedParent;
      // ensure tags => get IDs if needed
      const finalTagIds = await ensureTagsExist(postTags);

      // We add `authorName` from the localStorage above
      const data = {
        ...postValues,
        authorName: username,    // <-- Important: store the localStorage username
        content,
        featureImage,
        category: finalCategory,
        tags: finalTagIds,
      };

      // choose endpoint
      let endpoint = 'https://api.dinasuvadu.in/api/posts';
      if (usePublishEndpoint) {
        endpoint = 'https://api.dinasuvadu.in/api/posts/publish';
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to save post');
      }
      const result = await res.json();
      message.success(`Post saved successfully! Post ID: ${result.post._id}`);
      window.location.href = `/posts/edit/${result.post._id}`;
    } catch (error) {
      console.error('Error saving post:', error);
      message.error(error.message);
    }
  };

  // ----------------------------------------------------------------
  // 6) Tag Creation (auto-creating new tags if not existing)
  // ----------------------------------------------------------------
  const ensureTagsExist = async (tagNames) => {
    const finalIds = [];
    for (const name of tagNames) {
      const existing = allTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
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
      const res = await fetch('https://api.dinasuvadu.in/api/tags/add-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create tag');
      // push new tag to allTags state
      setAllTags((prev) => [...prev, data.tag]);
      return data.tag._id;
    } catch (err) {
      console.error('Error creating tag:', err);
      return null;
    }
  };

  // ----------------------------------------------------------------
  // 7) SEO Input with Character Count
  // ----------------------------------------------------------------
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
            { max: maxLength, message: `Max ${maxLength} characters allowed` },
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
                padding: '0 12px',
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
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              color: isLimitExceeded ? '#ff4d4f' : '#888',
              fontWeight: isLimitExceeded ? 'bold' : 'normal',
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
                    '100%': '#52c41a',
                  }
            }
            style={{ width: '120px' }}
          />
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <Content
        style={{
          display: 'flex',
          gap: '10px',
          padding: '10px',
          alignItems: 'flex-start',
        }}
      >
        {/* Left Section (80%) */}
        <div style={{ flex: '0 0 80%', maxWidth: '80%', padding: '5px' }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {/* 1) Title + Slug */}
            <div
              style={{
                background: '#fff',
                padding: '24px',
                marginBottom: '16px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
                    padding: '0 12px',
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
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <Form.Item label="Summary" name="summary">
                <Input.TextArea rows={3} placeholder="Enter a short summary" />
              </Form.Item>
            </div>

            {/* 3) Description (TinyMCE) */}
            <div
              style={{
                background: '#fff',
                padding: '24px',
                marginBottom: '16px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
                      'advlist', 'anchor', 'autolink', 'autosave', 'code', 'fullscreen',
                      'image', 'link', 'lists', 'media', 'table', 'preview',
                      'searchreplace', 'wordcount', 'visualblocks', 'visualchars'
                    ],
                    toolbar:
                      'fullscreen blocks bold italic underline strikethrough | ' +
                      'bullist numlist | alignleft aligncenter alignright alignjustify | code link | image media preview | ' +
                      'table outdent indent forecolor backcolor removeformat undo redo | ',
                    branding: false,
                    height: 500,
                  }}
                  onEditorChange={handleEditorChange}
                />
              </Form.Item>
            </div>

            {/* 4) SEO */}
            <div
              style={{
                background: '#fff',
                padding: '24px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
                rules={[{ required: true, message: 'Please enter at least one keyword.' }]}
              >
                <Select
                  mode="tags"
                  tokenSeparators={[',']}
                  style={{ width: '100%' }}
                  placeholder="Type or paste keywords, press Enter"
                />
              </Form.Item>
            </div>

            <Button type="primary" htmlType="submit" style={{ marginTop: '16px' }}>
              Save Post
            </Button>
          </Form>
        </div>

        {/* Right Section (20%) */}
        <div style={{ flex: '0 0 20%', maxWidth: '20%', padding: '5px' }}>
          {/* PostActions => draft => /api/posts, publish/schedule => /api/posts/publish */}
          <PostActions
            postId={null}
            onPublish={handlePublish}
            onSchedule={handleSchedule}
            onSaveDraft={handleSaveDraft}
          />

          {/* Feature Image */}
          <FeatureImageUpload
            featureImage={featureImage}
            onChange={(img) => setFeatureImage(img)}
          />

          {/* Category */}
          <div
            style={{
              background: '#fff',
              padding: '16px',
              marginTop: '16px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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

          {/* Tag Section */}
          <div
            style={{
              background: '#fff',
              padding: '16px',
              marginTop: '16px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                }}
                type="text"
              />
            </div>

            {/* Display chosen tags as chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {postTags.map((tag) => (
                <div
                  key={tag}
                  style={{
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 8px',
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

export default PostCreationPage;
