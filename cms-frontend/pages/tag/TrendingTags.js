import React, { useEffect, useState } from 'react';
import { Card, message } from 'antd';
import DashboardLayout from '../../components/Layout';

const TrendingTags = () => {
  const [trendingTags, setTrendingTags] = useState([]);

  const fetchTrendingTags = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/tags/trending-tags');
      if (response.ok) {
        const data = await response.json();
        setTrendingTags(data);
      } else {
        message.error('Failed to fetch trending tags');
      }
    } catch (error) {
      console.error('Error fetching trending tags:', error);
      message.error('Error fetching trending tags');
    }
  };

  useEffect(() => {
    fetchTrendingTags();
  }, []);

  return (
    <DashboardLayout>
      <div style={{ padding: '24px', backgroundColor: '#f0f2f5' }}>
        <h2>Trending Tags</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {trendingTags.length > 0 ? (
            trendingTags.map((tag) => (
              <Card
                key={tag._id}
                title={tag.name}
                bordered={false}
                style={{ width: '250px' }}
              >
                <p>{tag.description || 'No description'}</p>
                <p><strong>Post Count: </strong>{tag.postCount}</p>
              </Card>
            ))
          ) : (
            <p>No trending tags available</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TrendingTags;
