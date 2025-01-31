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
} from 'antd';
import { Editor } from '@tinymce/tinymce-react';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';

import DashboardLayout from '../../../components/Layout';
import PostActions from '../../../components/PostActions';
import FeatureImageUpload from '../../../components/FeatureImageUpload';

const { Content } = Layout;
const { Option } = Select;

const MAX_META_TITLE = 60;
const MAX_META_DESCRIPTION = 160;

// Extract username from JWT
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

const EditPost = () => {
  const router = useRouter();
  const { id } = router.query;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);

  // =========================== Author Name ===========================
  const username = getUsernameFromToken();

  // =========================== Basic Post Fields ===========================
  const [content, setContent] = useState('');
  const [featureImage, setFeatureImage] = useState(null);
  const [postStatus, setPostStatus] = useState('draft');
  const [scheduledAt, setScheduledAt] = useState(null);

  // SEO counters
  const [metaTitleLength, setMetaTitleLength] = useState(0);
  const [metaDescriptionLength, setMetaDescriptionLength] = useState(0);

  // Slug suffix logic (e.g., "-20251225")
  const [slugSuffix, setSlugSuffix] = useState('');

  // =========================== Tags ===========================
  const [allTags, setAllTags] = useState([]);
  const [postTags, setPostTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);

  // =========================== Categories ===========================
  const [allCategories, setAllCategories] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);
  const [childrenByParent, setChildrenByParent] = useState({});
  const [selectedParent, setSelectedParent] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [postCategoryId, setPostCategoryId] = useState(null);

  // We'll store the post's "raw" tag IDs until we map them to names
  const [rawTagIds, setRawTagIds] = useState([]);

  // =========================== "Unsaved Changes" for Autosave ===========================
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveIntervalRef = useRef(null);

  // ----------------------------------------------------------------
  // 1) FETCH ALL TAGS
  // ----------------------------------------------------------------
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

  // ----------------------------------------------------------------
  // 2) FETCH ALL CATEGORIES
  // ----------------------------------------------------------------
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await fetch('http://localhost:5000/api/categories/list-categories');
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

  // Once categories are loaded, separate parent vs child
  useEffect(() => {
    if (!allCategories.length) return;

    const parents = allCategories.filter((cat) => !cat.parentCategory);
    setParentCategories(parents);

    const map = {};
    allCategories.forEach((cat) => {
      if (cat.parentCategory) {
        const pid = cat.parentCategory;
        if (!map[pid]) {
          map[pid] = [];
        }
        map[pid].push(cat);
      }
    });
    setChildrenByParent(map);

    if (postCategoryId) {
      const catObj = allCategories.find((c) => c._id === postCategoryId);
      if (catObj) {
        if (!catObj.parentCategory) {
          // It's a parent
          setSelectedParent(catObj._id);
        } else {
          // It's a child
          setSelectedChild(catObj._id);
          setSelectedParent(catObj.parentCategory);
        }
      }
    }
  }, [allCategories, postCategoryId]);

  // ----------------------------------------------------------------
  // 3) FETCH THE POST => parse slug suffix
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!id) return;
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

        // ========== metaKeywords ==========
        let metaKeywordsArr = [];
        if (Array.isArray(postData.metaKeywords)) {
          metaKeywordsArr = postData.metaKeywords;
        } else if (typeof postData.metaKeywords === 'string') {
          metaKeywordsArr = postData.metaKeywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean);
        }

        // ========== TAGS => rawTagIds
        const rawIds = Array.isArray(postData.tags) ? postData.tags : [];

        // ========== SLUG => parse suffix
        const loadedSlug = postData.slug || '';
        let baseSlug = loadedSlug;
        let suffixPart = '';
        const lastDash = loadedSlug.lastIndexOf('-');
        if (lastDash !== -1) {
          suffixPart = loadedSlug.substring(lastDash);
          baseSlug = loadedSlug.substring(0, lastDash);
        }

        // Fill form fields
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

        // Update counters
        if (postData.metaTitle) {
          setMetaTitleLength(postData.metaTitle.length);
        }
        if (postData.metaDescription) {
          setMetaDescriptionLength(postData.metaDescription.length);
        }

        // category => store for later
        if (postData.category) {
          setPostCategoryId(postData.category);
        }

        // store raw tags
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

  // Once we have allTags and rawTagIds => map them to NAMES
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

  // ----------------------------------------------------------------
  // 4) TAG Input Logic
  // ----------------------------------------------------------------
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

  // ----------------------------------------------------------------
  // 5) Editor
  // ----------------------------------------------------------------
  const handleEditorChange = (value) => {
    setHasUnsavedChanges(true);
    setContent(value);
  };

  // ----------------------------------------------------------------
  // 7) Create Tag if needed => name => objectId
  //    Wrap with useCallback to keep stable references
  // ----------------------------------------------------------------
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
        setAllTags((prev) => [...prev, data.tag]);
        return data.tag._id;
      } catch (err) {
        console.error('Error creating tag:', err);
        return null;
      }
    },
    []
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

  // ----------------------------------------------------------------
  // 6) Update Post => PUT /:id
  //    Now stable references for ensureTagsExist
  // ----------------------------------------------------------------
  const updatePostInDB = useCallback(
    async (values, shouldReload = false) => {
      try {
        let finalKeywords = [];
        if (Array.isArray(values.metaKeywords)) {
          finalKeywords = values.metaKeywords;
        }

        // Convert postTags => array of object IDs
        const finalTagIds = await ensureTagsExist(postTags);

        // figure out final category => from selectedChild or selectedParent
        const finalCategory = selectedChild || selectedParent;

        // Recombine base slug + suffix
        const finalSlug = `${values.slug || ''}${slugSuffix}`;

        // authorName from localStorage
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
      slugSuffix,
      username,
      content,
      featureImage,
      selectedChild,
      selectedParent,
      postTags,
      ensureTagsExist,
      router,
    ]
  );

  // ----------------------------------------------------------------
  // 8) SEO Input with char count
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
            <Input.TextArea
              rows={3}
              placeholder={`Enter ${label}`}
              onChange={onChange}
            />
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

  // ----------------------------------------------------------------
  // 9) AUTOSAVE LOGIC: every 30 seconds => if hasUnsavedChanges & postStatus==='draft'
  // ----------------------------------------------------------------
  useEffect(() => {
    if (postStatus === 'draft') {
      autoSaveIntervalRef.current = setInterval(() => {
        if (hasUnsavedChanges) {
          form.validateFields().then((values) => {
            updatePostInDB({ ...values, status: 'draft' }, false);
          });
        }
      }, 30_000);
    }

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [postStatus, hasUnsavedChanges, form, updatePostInDB]);

  // ----------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------
  const handleSaveDraft = () => {
    form.validateFields().then((values) => {
      updatePostInDB({ ...values, status: 'draft' }, true);
    });
  };

  const handlePublish = () => {
    form.validateFields().then((values) => {
      updatePostInDB({ ...values, status: 'published' }, true);
    });
  };

  const handleSchedule = ({ scheduledAt }) => {
    form.validateFields().then((values) => {
      updatePostInDB({ ...values, status: 'scheduled', scheduledAt }, true);
    });
  };

  const handlePreview = (postId) => {
    window.open(`/preview/${postId}`, '_blank');
  };

  const handleTrash = async ({ id }) => {
    try {
      const response = await fetch(`http://localhost:5000/api/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'trash' }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to trash post.');
      }
      message.success('Post moved to trash!');
      router.push('/AllPosts');
    } catch (error) {
      message.error(error.message);
    }
  };

  return (
    <DashboardLayout>
      {!loading && (
        <Content
          style={{
            display: 'flex',
            gap: '10px',
            padding: '10px',
            alignItems: 'flex-start',
          }}
        >
          {/* LEFT: Main Form */}
          <div
            style={{
              flex: '0 0 80%',
              maxWidth: '80%',
              padding: '5px',
            }}
          >
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
                    placeholder="Enter the title of the article"
                    style={{
                      height: '40px',
                      lineHeight: '40px',
                      fontSize: '1.2em',
                      fontWeight: 600,
                      padding: '0 12px',
                    }}
                  />
                </Form.Item>

                <Form.Item label="Slug" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex' }}>
                    <Form.Item
                      name="slug"
                      style={{ marginBottom: 0, flex: 1 }}
                    >
                      <Input
                        placeholder="Base portion of slug"
                        style={{
                          borderTopRightRadius: 0,
                          borderBottomRightRadius: 0,
                        }}
                      />
                    </Form.Item>

                    <Input
                      readOnly
                      value={slugSuffix}
                      style={{
                        width: '120px',
                        borderLeft: 'none',
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                      }}
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
                    onEditorChange={(val) => {
                      setHasUnsavedChanges(true);
                      setContent(val);
                    }}
                  />
                </Form.Item>
              </div>

              {/* 4) SEO => metaTitle, metaDescription, metaKeywords */}
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

              {/* Update Button => calls onFinish => updatePostInDB (no reload) */}
              <Button
                type="primary"
                htmlType="submit"
                style={{ marginTop: '16px' }}
              >
                Update Post
              </Button>
            </Form>
          </div>

          {/* RIGHT: 20% */}
          <div
            style={{
              flex: '0 0 20%',
              maxWidth: '20%',
              padding: '5px',
            }}
          >
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
                  updatePostInDB(
                    { ...values, status: 'scheduled', scheduledAt },
                    true
                  );
                });
              }}
              onPreview={(postId) => {
                window.open(`/preview/${postId}`, '_blank');
              }}
              onTrash={async ({ id }) => {
                try {
                  const response = await fetch(
                    `http://localhost:5000/api/posts/${id}`,
                    {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'trash' }),
                    }
                  );
                  if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.message || 'Failed to trash post.');
                  }
                  message.success('Post moved to trash!');
                  router.push('/AllPosts');
                } catch (error) {
                  message.error(error.message);
                }
              }}
            />

            {/* Feature Image */}
            <FeatureImageUpload
              featureImage={featureImage}
              onChange={(img) => {
                setHasUnsavedChanges(true);
                setFeatureImage(img);
              }}
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
              <h3>Category</h3>
              <Select
                placeholder="Select Parent Category"
                style={{ width: '100%', marginBottom: '16px' }}
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

            {/* Tag Section => show NAMES, not _id */}
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
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  }}
                  type="text"
                />
              </div>

              {/* Show chosen tags => name-based chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {postTags.map((tagName) => (
                  <div
                    key={tagName}
                    style={{
                      background: '#f0f0f0',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 8px',
                    }}
                  >
                    <span style={{ marginRight: '8px' }}>{tagName}</span>
                    <CloseOutlined
                      style={{ cursor: 'pointer', fontSize: '12px' }}
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
    </DashboardLayout>
  );
};

export default EditPost;
