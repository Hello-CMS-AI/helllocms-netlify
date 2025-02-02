import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Input, Upload, Row, message, Select, } from 'antd';
import {
  UploadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  CloseOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import Image from 'next/image';
import DashboardLayout from '../components/Layout';
import { jwtDecode } from 'jwt-decode';

const { Option } = Select;

// Define allowed MIME types
const allowedMimeTypes = [
  'image/jpeg','image/png','image/gif','image/webp',
  'video/mp4','video/x-msvideo','video/quicktime','video/x-ms-wmv','video/x-flv','video/x-matroska',
  'audio/mpeg','audio/wav','audio/aac','audio/ogg','audio/flac',
  'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://api.dinasuvadu.in';

// Optional helper to decode the JWT token for 'uploadedBy'
const getUserInfoFromToken = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        return {
          username: decodedToken.username || '',
          role: decodedToken.role || '',
        };
      } catch (error) {
        console.error('Invalid token:', error);
      }
    }
  }
  return { username: '', role: '' };
};

const ImageGallery = () => {
  const [imageLibrary, setImageLibrary] = useState([]);
  const [filteredImages, setFilteredImages] = useState([]);
  const [mediaType, setMediaType] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [availableMonths, setAvailableMonths] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Extended metadata for display (including uploadedBy & usageCount)
  const [imageMetadata, setImageMetadata] = useState({
    name: '',
    uploadDate: '',
    size: '',
    dimensions: '',
    format: '',
    type: '',
    uploadedBy: '',    // New field
    usageCount: 0,     // New field
  });

  // We store 'title' in place of 'name' for user-friendly labeling
  const [editingDetails, setEditingDetails] = useState({
    title: '',
    altText: '',
    caption: '',
    description: '',
  });

  // Ref for debouncing auto-saves
  const saveTimeoutRef = useRef(null);

  // ---------------------
  // 1) Memoized Functions
  // ---------------------
  const filterImages = useCallback(() => {
    let filtered = imageLibrary;

    // Apply media type filter
    if (mediaType !== 'all') {
      filtered = filtered.filter((img) => (img.type || '').toLowerCase() === mediaType);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      filtered = filtered.filter((img) => {
        if (!img.createdAt) return false;
        const imgMonth = new Date(img.createdAt).toLocaleString('default', {
          year: 'numeric',
          month: 'long',
        });
        return imgMonth === dateFilter;
      });
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((img) => {
        const searchInName = (img.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const searchInTitle = (img.title || '').toLowerCase().includes(searchTerm.toLowerCase());
        return searchInName || searchInTitle;
      });
    }

    setFilteredImages(filtered); // Update filtered images
  }, [imageLibrary, mediaType, dateFilter, searchTerm]);
  

  const fetchImages = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/images`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch images');
      }
      const data = await response.json();
      setImageLibrary(data.images);
      updateAvailableMonths(data.images);
      // Initially show all media (no filters)
      filterImages('all', 'all', '', data.images);
    } catch (error) {
      console.error('Error fetching images:', error);
      message.error(`Failed to load media: ${error.message}`);
    }
  }, [filterImages]);

  const updateLocalDetails = useCallback((img) => {
    if (!img) return;

    const uploadDate = img.createdAt ? new Date(img.createdAt).toLocaleDateString() : '';
    const size = formatFileSize(img.size || 0);
    const dimensions = img.dimensions || 'Unknown';

    setImageMetadata({
      name: img.name || '',
      uploadDate,
      size,
      dimensions,
      format: img.format || '',
      type: img.type || '',
      uploadedBy: img.uploadedBy || 'Unknown',   // set author name
      usageCount: img.usageCount || 0,          // set usage count
    });

    const derivedTitle = img.title ? img.title : img.name;

    setEditingDetails({
      title: derivedTitle || '',
      altText: img.altText || '',
      caption: img.caption || '',
      description: img.description || '',
    });
  }, []);

  // --------------------------
  // 2) Effects Using Callbacks
  // --------------------------
  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  useEffect(() => {
    if (showOverlay && selectedImage) {
      updateLocalDetails(selectedImage);
    }
  }, [showOverlay, selectedImage, updateLocalDetails]);

  // -----------------
  //    Other Logic
  // -----------------
  const updateAvailableMonths = (images) => {
    const monthsSet = new Set();
    images.forEach((img) => {
      if (img.createdAt) {
        const month = new Date(img.createdAt).toLocaleString('default', {
          year: 'numeric',
          month: 'long',
        });
        monthsSet.add(month);
      }
    });
    setAvailableMonths([...monthsSet]);
  };

  const handleUpload = async ({ file }) => {
    setIsUploading(true);
    const formData = new FormData();

    // Get the uploadedBy value from the JWT token
    const { username } = getUserInfoFromToken();
    formData.append('uploadedBy', username || 'Unknown');
    formData.append('image', file);

    try {
      const response = await fetch(`${BACKEND_URL}/api/images/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Media upload failed.');
      }
      const data = await response.json();
      const newImage = data.imageDetails;
      const updatedLibrary = [newImage, ...imageLibrary];
      setImageLibrary(updatedLibrary);
      updateAvailableMonths(updatedLibrary);
      filterImages(mediaType, dateFilter, searchTerm, updatedLibrary);

      message.success('Media uploaded successfully!');
    } catch (error) {
      console.error('Upload Error:', error);
      message.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleSearch = (e) => {
    const term = (e.target.value || '').toLowerCase();
    setSearchTerm(term);
    filterImages(mediaType, dateFilter, term);
  };

  const handleFilterChange = (type, date) => {
    setMediaType(type);
    setDateFilter(date);
    filterImages(type, date, searchTerm);
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
    setShowOverlay(true);
  };

  const closeOverlay = () => {
    setShowOverlay(false);
    setSelectedImage(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} Bytes`;
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Renders the left side preview (image/video/audio/doc)
  const renderMediaPreview = () => {
    if (!selectedImage) return null;
    const fileUrl = selectedImage.url ? `${BACKEND_URL}${selectedImage.url}` : '';
    const imgType = (selectedImage.type || '').toLowerCase();

    if (imgType === 'image') {
      return (
        <Image
          src={fileUrl}
          alt={selectedImage.name || ''}
          width={800}
          height={600}
          style={{ objectFit: 'contain', maxWidth: '100%', maxHeight: '90vh' }}
        />
      );
    } else if (imgType === 'video') {
      return (
        <video controls style={{ maxWidth: '100%', maxHeight: '90vh' }}>
          <source src={fileUrl} type={`video/${selectedImage.format || 'mp4'}`} />
          Your browser does not support the video tag.
        </video>
      );
    } else if (imgType === 'audio') {
      return (
        <audio controls style={{ maxWidth: '90%' }}>
          <source src={fileUrl} type={`audio/${selectedImage.format || 'mpeg'}`} />
          Your browser does not support the audio element.
        </audio>
      );
    } else {
      // Document
      const ext = (selectedImage.format || '').toLowerCase();
      let IconComponent;
      if (ext === 'pdf') IconComponent = <FilePdfOutlined style={{ fontSize: '64px', color: '#f5222d' }} />;
      else if (ext === 'doc' || ext === 'docx') IconComponent = <FileWordOutlined style={{ fontSize: '64px', color: '#1890ff' }} />;
      else if (ext === 'xls' || ext === 'xlsx') IconComponent = <FileExcelOutlined style={{ fontSize: '64px', color: '#52c41a' }} />;
      else if (ext === 'ppt' || ext === 'pptx') IconComponent = <FilePptOutlined style={{ fontSize: '64px', color: '#fa8c16' }} />;
      else IconComponent = <FileTextOutlined style={{ fontSize: '64px', color: '#595959' }} />;

      return (
        <div style={{ textAlign: 'center', color: '#fff' }}>
          {IconComponent}
          <div style={{ marginTop: '16px' }}>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1890ff', textDecoration: 'underline', background: '#fff', padding: '4px 8px', borderRadius: '4px' }}
            >
              Download File
            </a>
          </div>
        </div>
      );
    }
  };

  const handleDetailChange = (field, value) => {
    setEditingDetails((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSaveDetails(field, value);
    }, 1000);
  };

  const autoSaveDetails = async (field, value) => {
    if (!selectedImage) return;
    const imageId = selectedImage._id || selectedImage.id;
    if (!imageId) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/images/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update media details.');
      }

      const updatedResponse = await response.json();
      const updatedImage = updatedResponse.imageDetails || updatedResponse;

      if (updatedImage && updatedImage.id) {
        // Update overlay
        setSelectedImage(updatedImage);

        // Update local details
        updateLocalDetails(updatedImage);

        // Overwrite old item in library
        const updatedLibrary = imageLibrary.map((img) =>
          img.id === updatedImage.id || img._id === updatedImage.id ? updatedImage : img
        );
        setImageLibrary(updatedLibrary);

        // Re-run filter
        filterImages(mediaType, dateFilter, searchTerm, updatedLibrary);
      }
    } catch (error) {
      console.error('Error in autoSaveDetails:', error);
      message.error(`Auto-save failed: ${error.message}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => message.success('Copied to clipboard!'))
      .catch((err) => {
        console.error('Failed to copy: ', err);
        message.error('Failed to copy to clipboard.');
      });
  };

  const handleDelete = async () => {
    if (!selectedImage) {
      message.error('No media item selected for deletion.');
      return;
    }
    try {
      let imagePath = selectedImage.url || '';
      imagePath = imagePath.replace(/^\/uploads\//, '');

      if (!imagePath) {
        message.error('Invalid image path. Cannot delete.');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/images/${imagePath}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete media.');
      }

      message.success('Media deleted successfully!');
      const imageId = selectedImage._id || selectedImage.id;
      const updatedLibrary = imageLibrary.filter(
        (img) => img.id !== imageId && img._id !== imageId
      );
      setImageLibrary(updatedLibrary);
      filterImages(mediaType, dateFilter, searchTerm, updatedLibrary);
      closeOverlay();
    } catch (error) {
      console.error('Error deleting media:', error);
      message.error(`Delete failed: ${error.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ padding: '20px' }}>
        {/* Header with Filters */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px',
          }}
        >
          {/* Media Type Filter */}
          <Select
            value={mediaType}
            style={{ width: 150, marginRight: '10px' }}
            onChange={(value) => handleFilterChange(value, dateFilter)}
          >
            <Option value="all">All Media Items</Option>
            <Option value="image">Images</Option>
            <Option value="video">Videos</Option>
            <Option value="audio">Audio</Option>
            <Option value="document">Documents</Option>
          </Select>

          {/* Date Filter */}
          <Select
            value={dateFilter}
            style={{ width: 150, marginRight: '10px' }}
            onChange={(value) => handleFilterChange(mediaType, value)}
          >
            <Option value="all">All Dates</Option>
            {availableMonths.map((month) => (
              <Option key={month} value={month}>
                {month}
              </Option>
            ))}
          </Select>

          {/* Search Bar */}
          <Input.Search
            placeholder="Search media"
            value={searchTerm}
            onChange={handleSearch}
            allowClear
            style={{ flex: 1, marginRight: '10px' }}
          />

          {/* Upload Button */}
          <Upload
            customRequest={handleUpload}
            showUploadList={false}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            multiple={false}
            beforeUpload={(file) => {
              const isAllowed = allowedMimeTypes.includes(file.type);
              if (!isAllowed) {
                message.error('You can only upload images, videos, audio files, and documents!');
              }
              return isAllowed || Upload.LIST_IGNORE;
            }}
          >
            <Button type="primary" icon={<UploadOutlined />} loading={isUploading}>
              {isUploading ? 'Uploading...' : 'Add Media'}
            </Button>
          </Upload>
        </div>

        {/* Media Grid */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px' }}>
          <Row
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '16px',
              padding: '0 16px',
            }}
          >
            {filteredImages.map((image) => (
              <div
                key={image.id || image._id}
                onClick={() => handleImageClick(image)}
                style={{
                  flex: '0 0 calc(10% - 16px)',
                  maxWidth: 'calc(10% - 16px)',
                  marginBottom: '16px',
                  cursor: 'pointer',
                  border: '1px solid #d9d9d9',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  position: 'relative',
                  height: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {(image.type || '').toLowerCase() === 'image' && (
                  <Image
                    src={`${BACKEND_URL}${image.url}`}
                    alt={image.name || ''}
                    width={100}
                    height={100}
                    style={{ width: '100%',height: '100%',objectFit: 'cover' }}
                  />
                )}

                {(image.type || '').toLowerCase() === 'video' && (
                  <div
                    style={{
                      backgroundColor: '#000',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <VideoCameraOutlined style={{ fontSize: '48px', color: '#fff' }} />
                  </div>
                )}

                {(image.type || '').toLowerCase() === 'audio' && (
                  <div
                    style={{
                      backgroundColor: '#f0f2f5',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AudioOutlined style={{ fontSize: '48px', color: '#000' }} />
                  </div>
                )}

                {(image.type || '').toLowerCase() === 'document' && (
                  <div
                    style={{
                      backgroundColor: '#fafafa',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {(() => {
                      const ext = (image.format || '').toLowerCase();
                      if (ext === 'pdf') return <FilePdfOutlined style={{ fontSize: '48px', color: '#f5222d' }} />;
                      if (ext === 'doc' || ext === 'docx') return <FileWordOutlined style={{ fontSize: '48px', color: '#1890ff' }} />;
                      if (ext === 'xls' || ext === 'xlsx') return <FileExcelOutlined style={{ fontSize: '48px', color: '#52c41a' }} />;
                      if (ext === 'ppt' || ext === 'pptx') return <FilePptOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />;
                      return <FileTextOutlined style={{ fontSize: '48px', color: '#595959' }} />;
                    })()}
                  </div>
                )}

                {/* Show either title or name at bottom */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    padding: '4px',
                    textAlign: 'center',
                  }}
                >
                  <span
                    style={{
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                      maxWidth: '100%',
                    }}
                    title={image.title || image.name || ''}
                  >
                    {(image.title || image.name || '').replace(/-/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </Row>
          {filteredImages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>No media items found.</div>
          )}
        </div>
      </div>

      {showOverlay && selectedImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={closeOverlay}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '90%',
              height: '90%',
              background: '#fff',
              borderRadius: '8px',
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            {/* Left Side (Preview) */}
            <div style={{ flex: '0 0 65%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {renderMediaPreview()}
            </div>

            {/* Right Side (Details) */}
            <div style={{ flex: '0 0 35%', background: '#fff', padding: '16px', overflowY: 'auto' }}>
              <h4 style={{ marginBottom: '16px' }}>Media Details</h4>
              <p><strong>Name:</strong> {imageMetadata.name.replace(/-/g, ' ')}</p>
              <p><strong>Upload Date:</strong> {imageMetadata.uploadDate}</p>
              <p><strong>Size:</strong> {imageMetadata.size}</p>
              <p><strong>Dimensions:</strong> {imageMetadata.dimensions}</p>
              <p><strong>Format:</strong> {imageMetadata.format}</p>
              <p><strong>Type:</strong> {
                imageMetadata.type
                  ? imageMetadata.type.charAt(0).toUpperCase() + imageMetadata.type.slice(1)
                  : ''
              }</p>

              {/* 3) Add "Uploaded By" and "Used in Posts" right after Type */}
              <p><strong>Uploaded By:</strong> {imageMetadata.uploadedBy}</p>
              <p><strong>Used in Posts:</strong> {imageMetadata.usageCount}</p>

              <h4 style={{ marginTop: '24px' }}>Editing Details</h4>
              <Input
                value={editingDetails.title}
                onChange={(e) => handleDetailChange('title', e.target.value)}
                placeholder="Title"
                style={{ marginBottom: '12px' }}
              />
              {(imageMetadata.type || '').toLowerCase() === 'image' && (
                <Input
                  value={editingDetails.altText || ''}
                  onChange={(e) => handleDetailChange('altText', e.target.value)}
                  placeholder="Alt Text"
                  style={{ marginBottom: '12px' }}
                />
              )}
              <Input
                value={editingDetails.caption || ''}
                onChange={(e) => handleDetailChange('caption', e.target.value)}
                placeholder="Caption"
                style={{ marginBottom: '12px' }}
              />
              <Input.TextArea
                value={editingDetails.description || ''}
                onChange={(e) => handleDetailChange('description', e.target.value)}
                placeholder="Description"
                rows={3}
                style={{ marginBottom: '12px' }}
              />

              <Input
                value={`${BACKEND_URL}${selectedImage.url || ''}`}
                readOnly
                style={{
                  height: '40px',
                  lineHeight: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
                addonAfter={
                  <Button
                    type="link"
                    onClick={() => copyToClipboard(`${BACKEND_URL}${selectedImage.url || ''}`)}
                    style={{
                      padding: '0 8px',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CopyOutlined />
                  </Button>
                }
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <Button danger onClick={handleDelete}>Delete</Button>
                <Button onClick={closeOverlay}>Cancel</Button>
              </div>
            </div>

            <Button
              type="text"
              icon={<CloseOutlined style={{ fontSize: '20px', color: '#fff' }} />}
              onClick={closeOverlay}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ImageGallery;
