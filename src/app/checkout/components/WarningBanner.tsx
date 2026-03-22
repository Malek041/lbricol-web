import React from 'react';

export default function WarningBanner() {
  return (
    <div style={{
      background: '#F9FAFB',
      border: '1px solid #F3F4F6',
      borderRadius: '16px',
      padding: '16px',
      marginBottom: '24px',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start'
    }}>
      <div style={{ 
        width: 24, 
        height: 24, 
        background: '#fff', 
        borderRadius: '50%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '1px solid #F3F4F6',
        fontSize: 14,
        flexShrink: 0
      }}>
        ℹ️
      </div>
      <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.5, fontWeight: 500 }}>
        The courier cannot purchase products for you. If you ask them to do so, the order will be cancelled.
      </div>
    </div>
  );
}
