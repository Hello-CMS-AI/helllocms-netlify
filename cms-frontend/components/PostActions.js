import React, { useState, useEffect } from 'react';
import { Button, Card, DatePicker, TimePicker, Modal, Space, message } from 'antd';
import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import { DeleteOutlined } from '@ant-design/icons'; // For the trash icon

const PostActions = ({
  postId,
  status,             // 'draft' | 'published' | 'scheduled'
  scheduledAt,        // optional Date/ISO/string
  onSaveDraft,
  onPreview,
  onSchedule,
  onPublish,
  onTrash,            // <-- If provided, we'll show the Trash button
}) => {
  // Scheduling modal & date/time states
  const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false);

  // Default them to "now"
  const [scheduleDate, setScheduleDate] = useState(dayjs());
  const [scheduleTime, setScheduleTime] = useState(dayjs());

  // On mount or if status changes, set defaults for scheduling
  useEffect(() => {
    if (status === 'scheduled' && scheduledAt) {
      // Convert scheduledAt (string/Date) to dayjs
      const dt = dayjs(scheduledAt);
      if (dt.isValid()) {
        setScheduleDate(dt);
        setScheduleTime(dt);
      }
    } else {
      // If not scheduled, default to now
      setScheduleDate(dayjs());
      setScheduleTime(dayjs());
    }
  }, [status, scheduledAt]);

  // ====== HANDLERS ======
  const handleSaveDraft = () => {
    if (typeof onSaveDraft !== 'function') {
      console.error('onSaveDraft function is not defined!');
      return;
    }
    onSaveDraft({
      id: postId,
      status: 'draft',
    });
  };

  const handlePreview = () => {
    if (typeof onPreview !== 'function') {
      console.error('onPreview function is not defined!');
      return;
    }
    if (!postId) {
      console.error('Cannot preview: postId is missing!');
      return;
    }
    onPreview(postId);
  };

  // When user clicks "OK" in the schedule modal
  const handleScheduleModalOk = () => {
    if (typeof onSchedule !== 'function') {
      console.error('onSchedule function is not defined!');
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      console.error('Schedule date or time is missing!');
      return;
    }

    // Combine scheduleDate + scheduleTime into one Dayjs
    const chosenDateTime = scheduleDate
      .hour(scheduleTime.hour())
      .minute(scheduleTime.minute())
      .second(0);

    // FRONT-END CHECK: disallow picking a past time
    if (chosenDateTime.isBefore(dayjs())) {
      message.error('Cannot schedule a post in the past. Please pick a future time.');
      return;
    }

    // Convert to a string (e.g. ISO)
    const scheduledDateTime = chosenDateTime.toISOString();

    onSchedule({
      id: postId,
      status: 'scheduled',
      scheduledAt: scheduledDateTime,
    });

    setIsScheduleModalVisible(false);
  };

  // "Publish Now" sets status='published'
  const handlePublishNow = () => {
    if (typeof onPublish !== 'function') {
      console.error('onPublish function is not defined!');
      return;
    }
    onPublish({
      id: postId,
      status: 'published',
    });
  };

  // Trash button => only if `onTrash` prop exists (i.e. EditPost)
  const handleTrash = () => {
    if (typeof onTrash !== 'function') {
      console.error('onTrash function is not defined!');
      return;
    }
    onTrash({
      id: postId,
      status: 'trash',
    });
  };

  // ====== CONDITIONAL BUTTON LABELS ======
  let publishButtonLabel = 'Publish';
  let scheduleButtonLabel = 'Schedule';
  if (status === 'published') {
    publishButtonLabel = 'Update & Re-publish';
  } else if (status === 'scheduled') {
    publishButtonLabel = 'Publish Now';
    scheduleButtonLabel = 'Edit Schedule';
  }

  // Re-initialize date/time each time we open the modal
  const handleOpenScheduleModal = () => {
    setScheduleDate(dayjs());
    setScheduleTime(dayjs());
    setIsScheduleModalVisible(true);
  };

  return (
    <Card
      style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        position: 'relative', // We'll position trash absolutely
      }}
    >
      {/* SHOW CURRENT STATUS */}
      <div style={{ marginBottom: '16px' }}>
        <strong>Status: </strong>
        <span style={{ textTransform: 'capitalize' }}>
          {status || 'draft'}
        </span>
      </div>

      {/* Save Draft */}
      <Button
        type="default"
        style={{ marginBottom: '8px', width: '100%' }}
        onClick={handleSaveDraft}
      >
        Save Draft
      </Button>

      {/* Preview */}
      <Button
        type="default"
        style={{ marginBottom: '8px', width: '100%' }}
        onClick={handlePreview}
      >
        Preview
      </Button>

      {/* Schedule Button */}
      <Button
        type="primary"
        style={{ marginBottom: '8px', width: '100%' }}
        onClick={handleOpenScheduleModal}
      >
        {scheduleButtonLabel}
      </Button>

      {/* Publish Button */}
      <Button
        type="primary"
        style={{ width: '100%' }}
        onClick={handlePublishNow}
      >
        {publishButtonLabel}
      </Button>

      {/* SHOW SCHEDULED TIME IF status === 'scheduled' */}
      {status === 'scheduled' && (
        <p style={{ marginTop: '8px', color: '#777' }}>
          <strong>Scheduled For:</strong>{' '}
          {scheduledAt ? new Date(scheduledAt).toLocaleString() : '(no date)'}
        </p>
      )}

      {/* Trash button => only show if onTrash is provided (i.e. in EditPost) */}
      {typeof onTrash === 'function' && (
        <Button
          icon={<DeleteOutlined />}
          danger
          type="text"   
          style={{
            position: 'absolute',
            left: '7px',
            bottom: '7px',
          }}
          onClick={handleTrash}
        >
        </Button>
      )}

      {/* SCHEDULE MODAL */}
      <Modal
        title="Schedule Post"
        visible={isScheduleModalVisible}
        onCancel={() => setIsScheduleModalVisible(false)}
        footer={null}
      >
        <div style={{ marginBottom: '16px' }}>
          <strong>Publish Date:</strong>
          <DatePicker
            value={scheduleDate}
            onChange={(date) => setScheduleDate(date)}
            style={{ width: '100%' }}
            inputReadOnly
            allowClear={false}
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <strong>Publish Time:</strong>
          <TimePicker
            value={scheduleTime}
            onChange={(time) => setScheduleTime(time)}
            style={{ width: '100%' }}
            use12Hours
            format="h:mm A"
            inputReadOnly
            allowClear={false}
          />
        </div>
        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={() => setIsScheduleModalVisible(false)}>Cancel</Button>
          <Button type="primary" onClick={handleScheduleModalOk}>
            OK
          </Button>
        </Space>
      </Modal>
    </Card>
  );
};

PostActions.propTypes = {
  postId: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['draft', 'published', 'scheduled']),
  scheduledAt: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Date),
  ]),
  onSaveDraft: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired,
  onSchedule: PropTypes.func.isRequired,
  onPublish: PropTypes.func.isRequired,
  onTrash: PropTypes.func, // optional; only passed in edit page
};

PostActions.defaultProps = {
  status: 'draft',
  scheduledAt: null,
};

export default PostActions;
