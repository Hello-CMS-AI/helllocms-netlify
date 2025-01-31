// SlugField.jsx
import React, { useEffect, useState } from 'react';
import { Form, Input } from 'antd';

const SlugField = ({ initialSlug, onSlugChange }) => {
  const [slugMain, setSlugMain] = useState('');
  const [slugId, setSlugId] = useState('');

  // Helper function to parse the final segment as ID if it’s alphanumeric
  const parseSlug = (rawSlug) => {
    const lastDashIndex = rawSlug.lastIndexOf('-');
    if (lastDashIndex !== -1) {
      const mainPart = rawSlug.slice(0, lastDashIndex);
      const idPart = rawSlug.slice(lastDashIndex + 1);
      // Check if this part is strictly alphanumeric (adjust if you need another pattern)
      if (/^[a-zA-Z0-9]+$/.test(idPart)) {
        return [mainPart, idPart];
      }
    }
    return [rawSlug, ''];
  };

  // On mount or when `initialSlug` changes, parse into main + ID
  useEffect(() => {
    if (initialSlug) {
      const [main, id] = parseSlug(initialSlug);
      setSlugMain(main);
      setSlugId(id);
    }
  }, [initialSlug]);

  // Combine them whenever slugMain or slugId changes, notify parent
  useEffect(() => {
    const combinedSlug = slugId ? `${slugMain}-${slugId}` : slugMain;
    onSlugChange(combinedSlug);
  }, [slugMain, slugId, onSlugChange]);

  return (
    <div>
      {/* Editable main slug */}
      <Form.Item style={{ marginBottom: slugId ? 8 : 0 }}>
        <Input
          placeholder="Slug (Editable portion)"
          value={slugMain}
          onChange={(e) => setSlugMain(e.target.value)}
        />
      </Form.Item>

      {/* Read-only slug ID (if found) */}
      {slugId && (
        <Form.Item style={{ marginBottom: 0 }}>
          <Input
            placeholder="Slug ID"
            value={slugId}
            disabled
          />
        </Form.Item>
      )}
    </div>
  );
};

export default SlugField;
