import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useRouter } from 'next/router';
import {
  Layout,
  Form,
  Input,
  Button,
  message,
  Progress,
  Select,
  AutoComplete,
  Tabs,
  Modal,
  Checkbox,
  Dropdown,
  Menu,
} from 'antd';
import { Editor } from '@tinymce/tinymce-react';
import {
  PlusOutlined,
  CloseOutlined,
  MoreOutlined, // For vertical dots menu
} from '@ant-design/icons';

import DashboardLayout from '/components/Layout';
import PostActions from '/components/PostActions';
import FeatureImageUpload from '/components/FeatureImageUpload';

const { Content } = Layout;
const { Option } = Select;
const { TabPane } = Tabs;

const MAX_META_TITLE = 60;
const MAX_META_DESCRIPTION = 160;

/** Helper to extract username from localStorage token */
const getUsernameFromToken = () => {
  if (typeof window === 'undefined') return '';
  const token = localStorage.getItem('token');
  if (!token) return '';

  try {
    const payload = token.split('.')[1];
    const decodedPayload = JSON.parse(atob(payload));
    return decodedPayload.username || '';
  } catch (error) {
    console.error('Error decoding token:', error);
    return '';
  }
};

function LiveBlogEditor() {
  const router = useRouter();
  const { id } = router.query;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mainBlog');

  // ====================== Basic Post State ======================
  const [content, setContent] = useState('');
  const [featureImage, setFeatureImage] = useState(null);
  const [postStatus, setPostStatus] = useState('draft');
  const [scheduledAt, setScheduledAt] = useState(null);

  // SEO counters
  const [metaTitleLength, setMetaTitleLength] = useState(0);
  const [metaDescriptionLength, setMetaDescriptionLength] = useState(0);
  const [slugSuffix, setSlugSuffix] = useState('');

  // =============== TAGS / CATEGORIES ===============
  const [allTags, setAllTags] = useState([]);
  const [postTags, setPostTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);

  const [allCategories, setAllCategories] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);
  const [childrenByParent, setChildrenByParent] = useState({});
  const [selectedParent, setSelectedParent] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [postCategoryId, setPostCategoryId] = useState(null);

  const [rawTagIds, setRawTagIds] = useState([]);

  /** Tracks unsaved changes for auto-save. */
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveIntervalRef = useRef(null);

  // ====================== Live Blog State ======================
  const [liveUpdates, setLiveUpdates] = useState([]);
  const [liveBlogForm] = Form.useForm();
  const [liveBlogContent, setLiveBlogContent] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUpdate, setEditUpdate] = useState(null);

  // username from localStorage
  const username = getUsernameFromToken();

  // -------------------------------------------------------------
  // 1) Fetch Tags
  // -------------------------------------------------------------
  useEffect(() => {
    const fetchTags = async () => {
      setLoadingTags(true);
      try {
        const res = await fetch('http://localhost:5000/api/tags/list-tags');
        if (!res.ok) throw new Error('Failed to fetch tags');
        const data = await res.json();
        setAllTags(data);
      } catch (err) {
        console.error('Error loading tags:', err);
        message.error('Error loading tags');
      } finally {
        setLoadingTags(false);
      }
    };
    fetchTags();
  }, []);

  // -------------------------------------------------------------
  // 2) Fetch Categories
  // -------------------------------------------------------------
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await fetch(
          'http://localhost:5000/api/categories/list-categories'
        );
        if (!res.ok) throw new Error('Failed to fetch categories');
        const cats = await res.json();
        setAllCategories(cats);
      } catch (err) {
        console.error('Error loading categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Once categories are loaded, separate them
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

    // If we have postCategoryId => figure out parent or child
    if (postCategoryId) {
      const catObj = allCategories.find((c) => c._id === postCategoryId);
      if (catObj) {
        if (!catObj.parentCategory) {
          setSelectedParent(catObj._id);
        } else {
          setSelectedChild(catObj._id);
          setSelectedParent(catObj.parentCategory);
        }
      }
    }
  }, [allCategories, postCategoryId]);

  // -------------------------------------------------------------
  // 3) Fetch the Post
  // -------------------------------------------------------------
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchPost = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5000/api/posts/${id}`);
        if (!res.ok) {
          message.error('Failed to load post data.');
          setLoading(false);
          return;
        }
        const postData = await res.json();

        // metaKeywords
        let metaKeywordsArr = [];
        if (Array.isArray(postData.metaKeywords)) {
          metaKeywordsArr = postData.metaKeywords;
        } else if (typeof postData.metaKeywords === 'string') {
          metaKeywordsArr = postData.metaKeywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean);
        }

        // Tag IDs
        const rawIds = Array.isArray(postData.tags) ? postData.tags : [];

        // Slug => parse suffix
        const loadedSlug = postData.slug || '';
        let baseSlug = loadedSlug;
        let suffixPart = '';
        const lastDash = loadedSlug.lastIndexOf('-');
        if (lastDash !== -1) {
          suffixPart = loadedSlug.substring(lastDash);
          baseSlug = loadedSlug.substring(0, lastDash);
        }

        // Fill form
        form.setFieldsValue({
          title: postData.title || '',
          slug: baseSlug,
          summary: postData.summary || '',
          metaTitle: postData.metaTitle || '',
          metaDescription: postData.metaDescription || '',
          metaKeywords: metaKeywordsArr,
          content: postData.content || '',
        });
        setSlugSuffix(suffixPart);
        setContent(postData.content || '');
        setFeatureImage(postData.featureImage || null);
        setPostStatus(postData.status || 'draft');
        setScheduledAt(postData.scheduledAt || null);

        if (postData.metaTitle) {
          setMetaTitleLength(postData.metaTitle.length);
        }
        if (postData.metaDescription) {
          setMetaDescriptionLength(postData.metaDescription.length);
        }

        // Category
        if (postData.category) {
          setPostCategoryId(postData.category);
        }

        // Tag IDs
        setRawTagIds(rawIds);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching post:', err);
        message.error('Error fetching post');
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, form]);

  // Once tags are loaded + we have rawTagIds => map them to tag names
  useEffect(() => {
    if (!allTags.length || !rawTagIds.length) return;
    const mappedNames = rawTagIds
      .map((tid) => {
        const found = allTags.find((t) => t._id === tid);
        return found ? found.name : null;
      })
      .filter(Boolean);
    setPostTags(mappedNames);
    setRawTagIds([]);
  }, [allTags, rawTagIds]);

  // -------------------------------------------------------------
  // 4) Tag Input Logic
  // -------------------------------------------------------------
  const handleSearchTag = (inputValue) => {
    setTagInput(inputValue);
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
    if (!postTags.includes(tagName)) {
      setPostTags([...postTags, tagName]);
    }
    setTagInput('');
    setSuggestions([]);
  };

  const handleAddTag = () => {
    setHasUnsavedChanges(true);
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    const splitted = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    const merged = Array.from(new Set([...postTags, ...splitted]));
    setPostTags(merged);
    setTagInput('');
    setSuggestions([]);
  };

  const handleRemoveTag = (tag) => {
    setHasUnsavedChanges(true);
    setPostTags((prev) => prev.filter((t) => t !== tag));
  };

  // -------------------------------------------------------------
  // 5) Editor for Main Blog
  // -------------------------------------------------------------
  const handleEditorChange = (value) => {
    setHasUnsavedChanges(true);
    setContent(value);
  };

  // -------------------------------------------------------------
  // (A) createNewTag => ensureTagsExist => memoize with useCallback
  // -------------------------------------------------------------
  const createNewTag = useCallback(
    async (name) => {
      try {
        const res = await fetch('http://localhost:5000/api/tags/add-tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to create tag');
        // add new tag to local list
        setAllTags((prev) => [...prev, data.tag]);
        return data.tag._id;
      } catch (err) {
        console.error('Error creating tag:', err);
        return null;
      }
    },
    [setAllTags]
  );

  const ensureTagsExist = useCallback(
    async (tagNames) => {
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
    },
    [allTags, createNewTag]
  );

  // -------------------------------------------------------------
  // 6) Update Post => PUT /:id => memoize with useCallback
  // -------------------------------------------------------------
  const updatePostInDB = useCallback(
    async (values, shouldReload = false) => {
      try {
        let finalKeywords = [];
        if (Array.isArray(values.metaKeywords)) {
          finalKeywords = values.metaKeywords;
        }

        const finalTagIds = await ensureTagsExist(postTags);
        const finalCategory = selectedChild || selectedParent;
        const finalSlug = `${values.slug || ''}${slugSuffix}`;
        const user = username || '';

        const updatedData = {
          ...values,
          authorName: user,
          slug: finalSlug,
          content,
          featureImage,
          metaKeywords: finalKeywords,
          tags: finalTagIds,
          category: finalCategory,
        };

        const res = await fetch(`http://localhost:5000/api/posts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Failed to update post');
        }
        message.success('Post updated successfully!');

        if (shouldReload) {
          router.reload(window.location.pathname);
        }
      } catch (err) {
        console.error('Error updating post:', err);
        message.error(err.message);
      } finally {
        setHasUnsavedChanges(false);
      }
    },
    [
      id,
      router,
      slugSuffix,
      username,
      content,
      featureImage,
      postTags,
      ensureTagsExist,
      selectedChild,
      selectedParent,
    ]
  );

  // -------------------------------------------------------------
  // 8) SEO Input with char count
  // -------------------------------------------------------------
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
            <Input.TextArea rows={3} onChange={onChange} />
          ) : (
            <Input
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

  // -------------------------------------------------------------
  // 9) AUTOSAVE LOGIC => 30s => includes form + updatePostInDB in dependencies
  // -------------------------------------------------------------
  useEffect(() => {
    if (postStatus === 'draft') {
      autoSaveIntervalRef.current = setInterval(() => {
        if (hasUnsavedChanges) {
          form.validateFields().then((values) => {
            updatePostInDB({ ...values, status: 'draft' }, false);
          });
        }
      }, 30000);
    }

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  // Add form, updatePostInDB to deps
  }, [postStatus, hasUnsavedChanges, form, updatePostInDB]);

  // -------------------------------------------------------------
  // 10) LIVE BLOG: Fetch + Add + Edit/Delete/Pin
  // -------------------------------------------------------------

  useEffect(() => {
    if (!id) return;
    const fetchLiveUpdates = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/live-updates/${id}`);
        if (!res.ok) {
          throw new Error('Failed to fetch live updates');
        }
        const data = await res.json();
        setLiveUpdates(data);
      } catch (error) {
        console.error(error);
        message.error(error.message);
      }
    };
    fetchLiveUpdates();
  }, [id]);

  // Create new live update
  const handleLiveEditorChange = (val) => {
    setLiveBlogContent(val);
  };

  const handleAddLiveUpdate = async (fields) => {
    if (!id) {
      return message.warning('You must save/create the post first!');
    }
    try {
      const payload = {
        title: fields.liveBlogTitle || '',
        content: liveBlogContent,
        createdBy: username,
      };

      const res = await fetch(`http://localhost:5000/api/live-updates/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create live update');
      }
      const newUpdate = await res.json();
      setLiveUpdates((prev) => [...prev, newUpdate]);
      message.success('Live update added!');

      // reset fields
      liveBlogForm.resetFields(['liveBlogTitle']);
      setLiveBlogContent('');
    } catch (error) {
      console.error(error);
      message.error(error.message);
    }
  };

  const onFinishLiveBlog = (fields) => {
    handleAddLiveUpdate(fields);
  };

  // Editing / Deleting / Pinning
  const openEditModal = (update) => {
    setEditUpdate(update);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditUpdate(null);
    setEditModalVisible(false);
  };

  const handleSaveEditUpdate = async ({ title, content, pinned }) => {
    if (!editUpdate?._id) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/live-updates/${editUpdate._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, pinned }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to edit live update');
      }
      const data = await res.json();
      setLiveUpdates((prev) =>
        prev.map((u) => (u._id === editUpdate._id ? data.liveUpdate : u))
      );
      message.success(data.message);
      closeEditModal();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleDeleteUpdate = async (updateId) => {
    if (!updateId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/live-updates/${updateId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete live update');
      }
      const data = await res.json();
      setLiveUpdates((prev) => prev.filter((u) => u._id !== updateId));
      message.success(data.message);
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleTogglePin = async (update) => {
    try {
      const newPinned = !update.pinned;
      const res = await fetch(
        `http://localhost:5000/api/live-updates/${update._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pinned: newPinned }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to pin/unpin live update');
      }
      const data = await res.json();
      setLiveUpdates((prev) =>
        prev.map((u) => (u._id === update._id ? data.liveUpdate : u))
      );
      message.success(data.message);
    } catch (error) {
      message.error(error.message);
    }
  };

  // Sort pinned updates on top, then by postedAt desc
  const sortedUpdates = [...liveUpdates].sort((a, b) => {
    if (a.pinned === b.pinned) {
      return new Date(b.postedAt) - new Date(a.postedAt);
    }
    return a.pinned ? -1 : 1;
  });

  return (
    <DashboardLayout>
      {!loading && (
        <Content
          style={{
            display: 'flex',
            gap: '10px',
            padding: '10px',
          }}
        >
          {/* LEFT: MAIN CONTENT (Tabs) */}
          <div style={{ flex: '0 0 80%', maxWidth: '80%', padding: '5px' }}>
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              {/* ====================== MAIN BLOG TAB ====================== */}
              <TabPane tab="Main Blog" key="mainBlog">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={(values) => updatePostInDB(values, false)}
                  onChange={() => setHasUnsavedChanges(true)}
                >
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
                        style={{ height: '40px', fontSize: '1.2em', fontWeight: 600 }}
                      />
                    </Form.Item>

                    <Form.Item label="Slug" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex' }}>
                        <Form.Item name="slug" style={{ marginBottom: 0, flex: 1 }}>
                          <Input placeholder="Base slug" />
                        </Form.Item>
                        <Input
                          readOnly
                          value={slugSuffix}
                          style={{ width: '120px', borderLeft: 'none' }}
                        />
                      </div>
                      <small style={{ color: '#888' }}>
                        Suffix (<strong>{slugSuffix}</strong>) is locked.
                      </small>
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
                      <Input.TextArea rows={3} placeholder="Short summary" />
                    </Form.Item>
                  </div>

                  {/* 3) Main Blog Description (TinyMCE) */}
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
                            'paste',
                            'preview',
                            'searchreplace',
                            'wordcount',
                            'visualblocks',
                            'visualchars',
                          ],
                          toolbar:
                            'fullscreen blocks bold italic underline strikethrough | ' +
                            'bullist numlist | alignleft aligncenter alignright alignjustify | ' +
                            'code link | image media preview | ' +
                            'table outdent indent forecolor backcolor removeformat undo redo | ',
                          branding: false,
                          height: 500,
                        }}
                        value={content}
                        onEditorChange={(val) => {
                          setHasUnsavedChanges(true);
                          setContent(val);
                        }}
                      />
                    </Form.Item>
                  </div>

                  {/* 4) SEO Fields */}
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
                      (e) => {
                        setMetaTitleLength(e.target.value.length);
                        setHasUnsavedChanges(true);
                      },
                      metaTitleLength
                    )}

                    {renderProgressWithInput(
                      'Meta Description',
                      'metaDescription',
                      MAX_META_DESCRIPTION,
                      (e) => {
                        setMetaDescriptionLength(e.target.value.length);
                        setHasUnsavedChanges(true);
                      },
                      metaDescriptionLength,
                      true
                    )}

                    <Form.Item
                      label="Meta Keywords"
                      name="metaKeywords"
                      rules={[
                        {
                          required: true,
                          message: 'Please add at least one keyword',
                        },
                      ]}
                    >
                      <Select
                        mode="tags"
                        tokenSeparators={[',']}
                        style={{ width: '100%' }}
                        placeholder="Add or paste keywords, press Enter"
                        onChange={() => setHasUnsavedChanges(true)}
                      />
                    </Form.Item>
                  </div>

                  <Button type="primary" htmlType="submit" style={{ marginTop: 16 }}>
                    Update Post
                  </Button>
                </Form>
              </TabPane>

              {/* ====================== LIVE BLOG TAB ====================== */}
              <TabPane tab="Live Blog" key="liveBlog">
                <Form
                  form={liveBlogForm}
                  layout="vertical"
                  onFinish={onFinishLiveBlog}
                  style={{ background: '#fff', padding: '24px' }}
                >
                  <Form.Item label="Live Blog Title" name="liveBlogTitle">
                    <Input placeholder="Short title (optional)" />
                  </Form.Item>

                  <p style={{ marginBottom: 8 }}>Live Blog Content (TinyMCE):</p>
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
                        'paste',
                        'preview',
                        'searchreplace',
                        'wordcount',
                        'visualblocks',
                        'visualchars',
                      ],
                      toolbar:
                        'fullscreen blocks bold italic underline strikethrough | ' +
                        'bullist numlist | alignleft aligncenter alignright alignjustify | ' +
                        'code link | image media preview | ' +
                        'table outdent indent forecolor backcolor removeformat undo redo | ',
                      branding: false,
                      height: 300,
                    }}
                    onEditorChange={handleLiveEditorChange}
                    value={liveBlogContent}
                  />

                  <Button type="primary" htmlType="submit" style={{ marginTop: 16 }}>
                    Add Live Update
                  </Button>
                </Form>

                {/* Existing Live Updates */}
                <div style={{ marginTop: 24 }}>
                  <h3>Existing Live Updates</h3>
                  {sortedUpdates.length === 0 && (
                    <p style={{ color: '#999' }}>No live updates yet.</p>
                  )}
                  {sortedUpdates.map((update) => (
                    <div
                      key={update._id}
                      style={{
                        border: '1px solid #ccc',
                        borderRadius: 4,
                        padding: 8,
                        marginBottom: 16,
                        background: '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>
                          {update.title || 'Untitled'}{' '}
                          {update.pinned && (
                            <span style={{ color: 'red', marginLeft: 8 }}>
                              (Pinned)
                            </span>
                          )}
                          {' — '}
                          {new Date(update.postedAt).toLocaleString()}
                        </strong>

                        {/* VERTICAL DOTS => show Edit, Delete, Pin */}
                        <Dropdown
                          trigger={['click']}
                          overlay={
                            <Menu>
                              <Menu.Item onClick={() => openEditModal(update)}>
                                Edit
                              </Menu.Item>
                              <Menu.Item danger onClick={() => handleDeleteUpdate(update._id)}>
                                Delete
                              </Menu.Item>
                              <Menu.Item onClick={() => handleTogglePin(update)}>
                                {update.pinned ? 'Unpin' : 'Pin'}
                              </Menu.Item>
                            </Menu>
                          }
                        >
                          <MoreOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
                        </Dropdown>
                      </div>

                      <div
                        style={{ marginTop: 4 }}
                        dangerouslySetInnerHTML={{ __html: update.content }}
                      />

                      {update.createdBy && (
                        <div
                          style={{
                            marginTop: 8,
                            textAlign: 'right',
                            fontStyle: 'italic',
                            color: '#888',
                          }}
                        >
                          by: {update.createdBy}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabPane>
            </Tabs>
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ flex: '0 0 20%', maxWidth: '20%', padding: '5px' }}>
            <PostActions
              postId={id}
              status={postStatus}
              scheduledAt={scheduledAt}
              onSaveDraft={() => {
                form.validateFields().then((values) => {
                  updatePostInDB({ ...values, status: 'draft' }, true);
                });
              }}
              onPublish={() => {
                form.validateFields().then((values) => {
                  updatePostInDB({ ...values, status: 'published' }, true);
                });
              }}
              onSchedule={({ scheduledAt }) => {
                form.validateFields().then((values) => {
                  updatePostInDB({ ...values, status: 'scheduled', scheduledAt }, true);
                });
              }}
              onPreview={(postId) => window.open(`/preview/${postId}`, '_blank')}
              onTrash={({ id, status }) => handleTrash({ id, status })}
            />

            <FeatureImageUpload
              featureImage={featureImage}
              onChange={(img) => {
                setHasUnsavedChanges(true);
                setFeatureImage(img);
              }}
            />

            {/* Category Selection */}
            <div style={{ background: '#fff', padding: 16, marginTop: 16 }}>
              <h3>Category</h3>
              <Select
                placeholder="Select Parent Category"
                style={{ width: '100%', marginBottom: 16 }}
                loading={loadingCategories}
                value={selectedParent}
                onChange={(val) => {
                  setHasUnsavedChanges(true);
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
                    onChange={(val) => {
                      setHasUnsavedChanges(true);
                      setSelectedChild(val);
                    }}
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
            <div style={{ background: '#fff', padding: 16, marginTop: 16 }}>
              <h3>Tags</h3>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <AutoComplete
                  style={{ flex: 1 }}
                  value={tagInput}
                  onChange={(val) => {
                    setHasUnsavedChanges(true);
                    setTagInput(val);
                  }}
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
                  }}
                  type="text"
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {postTags.map((tagName) => (
                  <div
                    key={tagName}
                    style={{
                      background: '#f0f0f0',
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 8px',
                    }}
                  >
                    <span style={{ marginRight: 8 }}>{tagName}</span>
                    <CloseOutlined
                      style={{ cursor: 'pointer', fontSize: 12 }}
                      onClick={() => {
                        setHasUnsavedChanges(true);
                        setPostTags((prev) => prev.filter((t) => t !== tagName));
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Content>
      )}

      {/* ======================= EDIT MODAL ======================= */}
      {editModalVisible && editUpdate && (
        <EditLiveUpdateModal
          update={editUpdate}
          onSave={handleSaveEditUpdate}
          onCancel={closeEditModal}
        />
      )}
    </DashboardLayout>
  );
}

/**
 * EditLiveUpdateModal => uses TinyMCE & sets the modal width to 1200
 */
function EditLiveUpdateModal({ update, onSave, onCancel }) {
  const [title, setTitle] = useState(update.title || '');
  const [editorContent, setEditorContent] = useState(update.content || '');
  const [pinned, setPinned] = useState(update.pinned || false);

  return (
    <Modal
      visible
      title="Edit Live Update"
      onOk={() => onSave({ title, content: editorContent, pinned })}
      onCancel={onCancel}
      okText="Save"
      width={1200}
    >
      <div style={{ marginBottom: 16 }}>
        <label>Title:</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ marginTop: 8 }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4 }}>
          Content (TinyMCE):
        </label>
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
              'paste',
              'preview',
              'searchreplace',
              'wordcount',
              'visualblocks',
              'visualchars',
            ],
            toolbar:
              'fullscreen blocks bold italic underline strikethrough | ' +
              'bullist numlist | alignleft aligncenter alignright alignjustify | ' +
              'code link | image media preview | ' +
              'table outdent indent forecolor backcolor removeformat undo redo | ',
            branding: false,
            height: 400,
          }}
          value={editorContent}
          onEditorChange={(val) => setEditorContent(val)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <Checkbox checked={pinned} onChange={(e) => setPinned(e.target.checked)}>
          Pin Update
        </Checkbox>
      </div>
    </Modal>
  );
}

export default LiveBlogEditor;
