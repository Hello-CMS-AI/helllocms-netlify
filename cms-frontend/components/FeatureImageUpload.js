import React, { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { Modal, Upload, Button, Row, Col, Input, message } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CloseOutlined,
  EyeOutlined,
  CheckOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileTextOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import Image from 'next/image';

// Allowed MIME types
const allowedMimeTypes = [
  'image/jpeg','image/png','image/gif','image/webp',
  'video/mp4','video/x-msvideo','video/quicktime','video/x-ms-wmv','video/x-flv','video/x-matroska',
  'audio/mpeg','audio/wav','audio/aac','audio/ogg','audio/flac',
  'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

// Fallback or default URL
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Optional helper if you decode token for 'uploadedBy'
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

const FeatureImageUpload = ({ featureImage, onChange }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageLibrary, setImageLibrary] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Image metadata, now including usageCount
  const [imageMetadata, setImageMetadata] = useState({
    name: '',
    uploadDate: '',
    size: '',
    dimensions: '',
    format: '',
    type: '',
    uploadedBy: '',
    usageCount: 0, // New field
  });

  // Fields user can edit (title, altText, etc.)
  const [editingDetails, setEditingDetails] = useState({
    title: '',
    altText: '',
    caption: '',
    description: '',
  });

  const [showFullImage, setShowFullImage] = useState(false);
  const [displayedImagesCount, setDisplayedImagesCount] = useState(100);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce ref for auto-saving
  const saveTimeoutRef = useRef(null);

  // -----------------------------------------------------------
  // 1) When modal is open & image is selected, load details
  // -----------------------------------------------------------
  useEffect(() => {
    if (isModalVisible && selectedImage) {
      const selectedFile = imageLibrary.find((img) => img.url === selectedImage);
      if (selectedFile) {
        setImageMetadata({
          name: selectedFile.name,
          uploadDate: new Date(selectedFile.createdAt).toLocaleDateString(),
          size: formatFileSize(selectedFile.size),
          dimensions: selectedFile.dimensions || 'Unknown',
          format: selectedFile.format || 'Unknown',
          type: selectedFile.type || 'Unknown',
          uploadedBy: selectedFile.uploadedBy || 'Unknown',
          usageCount: selectedFile.usageCount || 0, // Capture usageCount here
        });

        const derivedTitle = selectedFile.title
          ? selectedFile.title
          : selectedFile.name;

        setEditingDetails({
          title: derivedTitle,
          altText: selectedFile.altText || '',
          caption: selectedFile.caption || '',
          description: selectedFile.description || '',
        });
      }
    }
  }, [isModalVisible, selectedImage, imageLibrary]);

  // Utility: format file sizes
  const formatFileSize = (sizeInBytes) => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} Bytes`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  };

  // -----------------------------------------------------------
  // 2) Open/Close the modal
  // -----------------------------------------------------------
  const handleOpenModal = () => {
    setIsModalVisible(true);
    fetchImageLibrary();
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSearchTerm('');
    setDisplayedImagesCount(100);
    setSelectedImage(null);
    resetImageData();
  };

  const resetImageData = () => {
    setImageMetadata({
      name: '',
      uploadDate: '',
      size: '',
      dimensions: '',
      format: '',
      type: '',
      uploadedBy: '',
      usageCount: 0,
    });
    setEditingDetails({
      title: '',
      altText: '',
      caption: '',
      description: '',
    });
  };

  // -----------------------------------------------------------
  // 3) Fetch entire media library
  // -----------------------------------------------------------
  const fetchImageLibrary = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/images`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch image library');
      }
      const data = await response.json();
      // "data.images" should have usageCount
      setImageLibrary(data.images);
    } catch (error) {
      console.error('Error fetching images:', error);
      message.error(`Could not load image library: ${error.message}`);
    }
  };

  // -----------------------------------------------------------
  // 4) Upload file => pass "uploadedBy"
  // -----------------------------------------------------------
  const handleUpload = async ({ file }) => {
    setIsUploading(true);

    // If using JWT for username
    const { username } = getUserInfoFromToken();

    const formData = new FormData();
    formData.append('uploadedBy', username || 'Unknown');
    formData.append('image', file);

    try {
      const response = await fetch(`${BACKEND_URL}/api/images/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload media');
      }

      const data = await response.json();
      const newImage = data.imageDetails;

      setImageLibrary((prev) => [newImage, ...prev]);
      setSelectedImage(newImage.url);

      setImageMetadata({
        name: newImage.name,
        uploadDate: new Date(newImage.createdAt).toLocaleDateString(),
        size: formatFileSize(newImage.size),
        dimensions: newImage.dimensions || 'Unknown',
        format: newImage.format || 'Unknown',
        type: newImage.type || 'Unknown',
        uploadedBy: newImage.uploadedBy || 'Unknown',
        usageCount: newImage.usageCount || 0, // Might be 0 on new uploads
      });

      const derivedTitle = newImage.title
        ? newImage.title
        : newImage.name;

      setEditingDetails({
        title: derivedTitle,
        altText: '',
        caption: '',
        description: '',
      });

      message.success('Media uploaded successfully!');
    } catch (error) {
      console.error('Error uploading media:', error);
      message.error(`Media upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // -----------------------------------------------------------
  // 5) Select an existing image from library
  // -----------------------------------------------------------
  const handleSelectImage = (imageUrl) => {
    const selectedFile = imageLibrary.find((img) => img.url === imageUrl);
    if (!selectedFile) {
      message.error('Failed to load media details.');
      return;
    }

    setSelectedImage(imageUrl);

    setImageMetadata({
      name: selectedFile.name,
      uploadDate: new Date(selectedFile.createdAt).toLocaleDateString(),
      size: formatFileSize(selectedFile.size),
      dimensions: selectedFile.dimensions || 'Unknown',
      format: selectedFile.format || 'Unknown',
      type: selectedFile.type || 'Unknown',
      uploadedBy: selectedFile.uploadedBy || 'Unknown',
      usageCount: selectedFile.usageCount || 0, // usageCount
    });

    const derivedTitle = selectedFile.title
      ? selectedFile.title
      : selectedFile.name;

    setEditingDetails({
      title: derivedTitle,
      altText: selectedFile.altText || '',
      caption: selectedFile.caption || '',
      description: selectedFile.description || '',
    });
  };

  // -----------------------------------------------------------
  // 6) Auto-save details after 1 second
  // -----------------------------------------------------------
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
    const imageObj = imageLibrary.find((img) => img.url === selectedImage);
    if (!imageObj) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/images/${imageObj.id}`, {
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
        setSelectedImage(updatedImage.url);
        updateLocalDetails(updatedImage);

        // Update the library array
        const newLibrary = imageLibrary.map((img) =>
          (img.id === updatedImage.id ? updatedImage : img)
        );
        setImageLibrary(newLibrary);
      }
    } catch (error) {
      console.error('Error in autoSaveDetails:', error);
      message.error(`Auto-save failed: ${error.message}`);
    }
  };

  const updateLocalDetails = (img) => {
    setImageMetadata((prev) => ({
      ...prev,
      name: img.name,
      size: formatFileSize(img.size),
      dimensions: img.dimensions || 'Unknown',
      format: img.format || 'Unknown',
      type: img.type || 'Unknown',
      uploadedBy: img.uploadedBy || 'Unknown',
      usageCount: img.usageCount || 0,
    }));

    const derivedTitle = img.title
      ? img.title
      : img.name;

    setEditingDetails({
      title: derivedTitle,
      altText: img.altText || '',
      caption: img.caption || '',
      description: img.description || '',
    });
  };

  // -----------------------------------------------------------
  // 7) Apply (confirm) the selected image
  // -----------------------------------------------------------
  const handleApplyImage = async () => {
    if (!onChange || !selectedImage) {
      message.error('Please select a media item first.');
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Force auto-save on each field
    await autoSaveDetails('title', editingDetails.title);
    await autoSaveDetails('altText', editingDetails.altText);
    await autoSaveDetails('caption', editingDetails.caption);
    await autoSaveDetails('description', editingDetails.description);

    // Pass data up to parent
    const updatedImageData = {
      url: selectedImage,
      title: editingDetails.title,
      altText: editingDetails.altText,
      caption: editingDetails.caption,
      description: editingDetails.description,
      type: imageMetadata.type,
      // You could also pass usageCount or uploadedBy if needed
    };

    onChange(updatedImageData);
    handleCloseModal();
  };

  // -----------------------------------------------------------
  // 8) Delete the selected image from the server
  // -----------------------------------------------------------
  const handleDeleteImage = () => {
    if (!selectedImage) {
      message.error('Please select a media item to delete.');
      return;
    }
    setIsDeleting(true);

    const imagePath = selectedImage.replace(/^\/uploads\//, '');

    fetch(`${BACKEND_URL}/api/images/${imagePath}`, {
      method: 'DELETE',
    })
      .then((response) => {
        if (response.ok) {
          setImageLibrary((prev) => prev.filter((img) => img.url !== selectedImage));
          setSelectedImage(null);
          resetImageData();
          message.success('Media deleted successfully!');
        } else {
          response.json().then((data) => {
            message.error(data.message || 'Failed to delete media.');
          });
        }
      })
      .catch((error) => {
        console.error('Error deleting media:', error);
        message.error('An error occurred while deleting the media.');
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  // -----------------------------------------------------------
  // 9) Remove the feature image from parent (not from server)
  // -----------------------------------------------------------
  const handleRemoveFeatureImage = () => {
    if (onChange) {
      onChange(null);
    }
  };

  // -----------------------------------------------------------
  // 10) Copy image URL
  // -----------------------------------------------------------
  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        message.success('Copied to clipboard!');
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
        message.error('Failed to copy to clipboard.');
      });
  };

  // -----------------------------------------------------------
  // 11) Fullscreen preview
  // -----------------------------------------------------------
  const handleImageThumbnailClick = () => {
    if (selectedImage) {
      setShowFullImage(true);
    }
  };

  const closeFullImageView = () => {
    setShowFullImage(false);
  };

  // -----------------------------------------------------------
  // 12) Load more images in the library
  // -----------------------------------------------------------
  const loadMoreImages = () => {
    setDisplayedImagesCount((prev) => prev + 100);
  };

  // -----------------------------------------------------------
  // 13) Searching (by name OR title)
  // -----------------------------------------------------------
  const filteredImages = imageLibrary.filter((image) => {
    const lowerSearch = searchTerm.toLowerCase();
    const searchInName = image.name.toLowerCase().includes(lowerSearch);
    const searchInTitle = (image.title || '').toLowerCase().includes(lowerSearch);
    return searchInName || searchInTitle;
  });

  const totalImages = filteredImages.length;
  const displayedImages = filteredImages.slice(0, displayedImagesCount);

  // -----------------------------------------------------------
  // 14) Full Image Overlay
  // -----------------------------------------------------------
  const FullImageOverlay = () => {
    if (!showFullImage || !selectedImage) return null;
    return (
      <div
        onClick={closeFullImageView}
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
          zIndex: 3000,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'relative', background: '#fff', padding: '20px', borderRadius: '8px' }}
        >
          {imageMetadata.type === 'image' ? (
            <Image
              src={`${BACKEND_URL}${selectedImage}`}
              alt="Full View"
              width={1000} 
              height={800}
              style={{ objectFit: 'contain', maxWidth: '90vw', maxHeight: '90vh' }}
            />
          ) : imageMetadata.type === 'video' ? (
            <video controls style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', background: '#000' }}>
              <source src={`${BACKEND_URL}${selectedImage}`} type={`video/${imageMetadata.format}`} />
              Your browser does not support the video tag.
            </video>
          ) : imageMetadata.type === 'audio' ? (
            <audio controls style={{ maxWidth: '90vw' }}>
              <source src={`${BACKEND_URL}${selectedImage}`} type={`audio/${imageMetadata.format}`} />
              Your browser does not support the audio element.
            </audio>
          ) : (
            <div style={{ textAlign: 'center', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', padding: '20px' }}>
              {imageMetadata.format === 'pdf' ? (
                <FilePdfOutlined style={{ fontSize: '64px', color: '#f5222d' }} />
              ) : (imageMetadata.format === 'doc' || imageMetadata.format === 'docx') ? (
                <FileWordOutlined style={{ fontSize: '64px', color: '#1890ff' }} />
              ) : (imageMetadata.format === 'xls' || imageMetadata.format === 'xlsx') ? (
                <FileExcelOutlined style={{ fontSize: '64px', color: '#52c41a' }} />
              ) : (imageMetadata.format === 'ppt' || imageMetadata.format === 'pptx') ? (
                <FilePptOutlined style={{ fontSize: '64px', color: '#fa8c16' }} />
              ) : (
                <FileTextOutlined style={{ fontSize: '64px', color: '#595959' }} />
              )}

              <div style={{ marginTop: '20px' }}>
                <a
                  href={`${BACKEND_URL}${selectedImage}`}
                  download
                  style={{
                    display: 'inline-block',
                    background: '#1890ff',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                  }}
                >
                  <DownloadOutlined style={{ marginRight: '8px' }} />
                  Download File
                </a>
              </div>
            </div>
          )}

          <Button
            type="text"
            icon={<CloseOutlined style={{ fontSize: '20px', color: '#fff' }} />}
            onClick={closeFullImageView}
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
    );
  };

  // -----------------------------------------------------------
  // 15) Modal Title
  // -----------------------------------------------------------
  const modalTitle = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginRight: '40px' }}>
      <span>Select Media</span>
      {imageLibrary.length > 0 && (
        <span style={{ fontSize: '0.9em', color: '#555' }}>
          Total: {imageLibrary.length} media items
        </span>
      )}
    </div>
  );

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
  return (
    <div style={{ marginTop: '16px' }}>
      {/* If there's already a featureImage, display it. Otherwise show + icon */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '16px',
          margin: '10px 0',
          textAlign: 'center',
          position: 'relative',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
        onClick={!featureImage ? handleOpenModal : undefined}
      >
        {featureImage ? (
          <>
            {featureImage.type === 'image' ? (
              <Image
                src={`${BACKEND_URL}${featureImage.url}`}
                alt="Feature"
                width={600}
                height={400}
                style={{ borderRadius: '8px', maxWidth: '100%', height: 'auto' }}
              />
            ) : featureImage.type === 'video' ? (
              <video controls style={{ maxWidth: '100%', borderRadius: '8px' }}>
                <source src={`${BACKEND_URL}${featureImage.url}`} type={`video/${featureImage.format}`} />
                Your browser does not support the video tag.
              </video>
            ) : featureImage.type === 'audio' ? (
              <audio controls style={{ width: '100%' }}>
                <source src={`${BACKEND_URL}${featureImage.url}`} type={`audio/${featureImage.format}`} />
                Your browser does not support the audio element.
              </audio>
            ) : (
              <a href={`${BACKEND_URL}${featureImage.url}`} target="_blank" rel="noopener noreferrer">
                Download {featureImage.type.charAt(0).toUpperCase() + featureImage.type.slice(1)}
              </a>
            )}
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                backgroundColor: 'white',
                borderRadius: '50%',
              }}
              onClick={handleRemoveFeatureImage}
            />
          </>
        ) : (
          <>
            <PlusOutlined style={{ fontSize: '24px', color: '#aaa' }} />
            <p>Select Media</p>
          </>
        )}
      </div>

      <Modal
        title={modalTitle}
        visible={isModalVisible}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {selectedImage && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteImage}
                  loading={isDeleting}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button onClick={handleCloseModal}>Cancel</Button>
              <Button type="primary" onClick={handleApplyImage} disabled={!selectedImage}>
                Apply
              </Button>
            </div>
          </div>
        }
        onCancel={handleCloseModal}
        width="100%"
        style={{ top: 20, padding: '20px' }}
        bodyStyle={{ padding: '20px' }}
        zIndex={2000}
      >
        <Row gutter={16} style={{ overflow: 'visible' }}>
          {/* Left Column: Upload + Media Details */}
          <Col span={6} style={{ overflow: 'visible' }}>
            {/* Upload Box */}
            <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'visible' }}>
              <h4>Upload Media</h4>
              <Upload
                customRequest={handleUpload}
                showUploadList={false}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                multiple={false}
                beforeUpload={(file) => {
                  const isAllowed = allowedMimeTypes.includes(file.type);
                  if (!isAllowed) {
                    message.error('You can only upload images, videos, audio, or documents!');
                  }
                  return isAllowed || Upload.LIST_IGNORE;
                }}
              >
                <Button icon={<PlusOutlined />} loading={isUploading} disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Upload Media'}
                </Button>
              </Upload>
            </div>

            {/* Media Details Box */}
            {selectedImage && (
              <div
                style={{
                  position: 'relative',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  marginTop: '16px',
                  paddingRight: '120px',
                  overflow: 'visible',
                }}
              >
                <h4 style={{ marginBottom: '16px' }}>Media Details</h4>
                {/* Small thumbnail at top-right */}
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '100px',
                    height: '100px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid #d9d9d9',
                    cursor: 'pointer',
                  }}
                  onClick={handleImageThumbnailClick}
                >
                  {imageMetadata.type === 'image' ? (
                    <Image
                      src={`${BACKEND_URL}${selectedImage}`}
                      alt="Thumbnail"
                      width={100}
                      height={100}
                      style={{ objectFit: 'cover' }}
                    />
                  ) : imageMetadata.type === 'video' ? (
                    <div
                      style={{
                        backgroundColor: '#000',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <VideoCameraOutlined style={{ fontSize: '48px', color: '#fff' }} />
                    </div>
                  ) : imageMetadata.type === 'audio' ? (
                    <div
                      style={{
                        backgroundColor: '#f0f2f5',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <AudioOutlined style={{ fontSize: '48px', color: '#000' }} />
                    </div>
                  ) : (
                    <div
                      style={{
                        backgroundColor: '#fafafa',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {(() => {
                        const ext = (imageMetadata.format || '').toLowerCase();
                        if (ext === 'pdf') return <FilePdfOutlined style={{ fontSize: '48px', color: '#f5222d' }} />;
                        if (ext === 'doc' || ext === 'docx') return <FileWordOutlined style={{ fontSize: '48px', color: '#1890ff' }} />;
                        if (ext === 'xls' || ext === 'xlsx') return <FileExcelOutlined style={{ fontSize: '48px', color: '#52c41a' }} />;
                        if (ext === 'ppt' || ext === 'pptx') return <FilePptOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />;
                        return <FileTextOutlined style={{ fontSize: '48px', color: '#595959' }} />;
                      })()}
                    </div>
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '5px',
                      left: '5px',
                      background: 'rgba(0,0,0,0.5)',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <EyeOutlined style={{ color: '#fff' }} />
                  </div>
                </div>

                <p style={{ marginBottom: '4px' }}><strong>Name:</strong> {imageMetadata.name.replace(/-/g, ' ')}</p>
                <p style={{ marginBottom: '4px' }}><strong>Upload Date:</strong> {imageMetadata.uploadDate}</p>
                <p style={{ marginBottom: '4px' }}><strong>Size:</strong> {imageMetadata.size}</p>
                <p style={{ marginBottom: '4px' }}><strong>Dimensions:</strong> {imageMetadata.dimensions}</p>
                <p style={{ marginBottom: '4px' }}><strong>Format:</strong> {imageMetadata.format}</p>
                <p style={{ marginBottom: '4px' }}><strong>Type:</strong> {
                  imageMetadata.type.charAt(0).toUpperCase() + imageMetadata.type.slice(1)
                }</p>
                <p style={{ marginBottom: '4px' }}><strong>Uploaded By:</strong> {imageMetadata.uploadedBy}</p>


                {/* 16) Show usage count just below the thumbnail */}
                <div
                  style={{
                    position: 'absolute',
                    top: '110px', // 100px for thumbnail + some offset
                    right: '10px',
                    width: '100px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    color: '#555',
                  }}
                >
                  used in {imageMetadata.usageCount} post{imageMetadata.usageCount === 1 ? '' : 's'}
                </div>
              </div>
            )}

            {/* Editing Details Box */}
            {selectedImage && (
              <div
                style={{
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  marginTop: '16px',
                }}
              >
                <h4>Editing Details</h4>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Input
                      value={editingDetails.title}
                      onChange={(e) => handleDetailChange('title', e.target.value)}
                      placeholder="Title"
                      style={{ marginBottom: '10px' }}
                    />
                  </Col>
                  {imageMetadata.type === 'image' && (
                    <Col span={24}>
                      <Input
                        value={editingDetails.altText}
                        onChange={(e) => handleDetailChange('altText', e.target.value)}
                        placeholder="Alt Text"
                        style={{ marginBottom: '10px' }}
                      />
                    </Col>
                  )}
                  <Col span={24}>
                    <Input
                      value={editingDetails.caption}
                      onChange={(e) => handleDetailChange('caption', e.target.value)}
                      placeholder="Caption"
                      style={{ marginBottom: '10px' }}
                    />
                  </Col>
                  <Col span={24}>
                    <Input.TextArea
                      value={editingDetails.description}
                      onChange={(e) => handleDetailChange('description', e.target.value)}
                      placeholder="Description"
                      rows={3}
                      style={{ marginBottom: '10px' }}
                    />
                  </Col>

                  <Col span={24}>
                    <Input
                      value={`${BACKEND_URL}${selectedImage}`}
                      readOnly
                      style={{
                        height: '40px',
                        lineHeight: '40px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      addonAfter={
                        <Button
                          type="link"
                          onClick={() => copyToClipboard(`${BACKEND_URL}${selectedImage}`)}
                          style={{
                            padding: '0 8px',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          Copy
                        </Button>
                      }
                    />
                  </Col>
                </Row>
              </div>
            )}
          </Col>

          {/* Right Column: Media Library Grid */}
          <Col span={18} style={{ overflow: 'visible' }}>
            <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'visible' }}>
              <h4>Media Library</h4>
              <Input
                placeholder="Search Media..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
                style={{ marginBottom: '16px' }}
              />
              <div
                style={{
                  maxHeight: '600px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  paddingRight: '10px',
                  marginTop: '20px',
                  borderRadius: '8px',
                }}
              >
                <Row gutter={[16, 16]} style={{ overflow: 'visible' }}>
                  {displayedImages.map((image) => {
                    const isSelected = (selectedImage === image.url);
                    return (
                      <Col span={3} key={image.id}>
                        <div
                          style={{
                            border: isSelected ? '4px solid #1890ff' : '1px solid #d9d9d9',
                            borderRadius: '8px',
                            textAlign: 'center',
                            height: '100px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            position: 'relative',
                            marginTop: '10px',
                            overflow: 'visible',
                          }}
                          onClick={() => handleSelectImage(image.url)}
                        >
                          {/* Render the thumbnail type */}
                          {image.type === 'image' && (
                            <Image
                              src={`${BACKEND_URL}${image.url}`}
                              alt={image.name.replace(/-/g, ' ')}
                              width={100}
                              height={100}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                            />
                          )}
                          {image.type === 'video' && (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#000',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <VideoCameraOutlined style={{ fontSize: '48px', color: '#fff' }} />
                            </div>
                          )}
                          {image.type === 'audio' && (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#f0f2f5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <AudioOutlined style={{ fontSize: '48px', color: '#000' }} />
                            </div>
                          )}
                          {image.type === 'document' && (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                backgroundColor: '#fafafa',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
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

                          {/* Checkmark if selected */}
                          {isSelected && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '-12px',
                                right: '-12px',
                                background: '#1890ff',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 9999,
                              }}
                            >
                              <CheckOutlined style={{ color: '#fff', fontSize: '16px' }} />
                            </div>
                          )}
                        </div>
                      </Col>
                    );
                  })}
                </Row>

                {/* "Load more" if needed */}
                {displayedImagesCount < totalImages && (
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <div
                      style={{
                        background: '#e6f7ff',
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        marginBottom: '8px',
                      }}
                    >
                      Showing {displayedImages.length} of {totalImages} media items
                    </div>
                    <br />
                    <Button onClick={loadMoreImages}>Load more</Button>
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Modal>

      {FullImageOverlay()}
    </div>
  );
};

export default FeatureImageUpload;