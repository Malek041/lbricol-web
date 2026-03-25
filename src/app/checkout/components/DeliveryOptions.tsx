import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface DeliveryOptionsProps {
  deliveryType: 'standard' | 'scheduled';
  scheduledTime: string | null;
  onDeliveryTypeChange: (type: 'standard' | 'scheduled') => void;
  onScheduledTimeChange: (time: string) => void;
  errors: Record<string, string>;
}

export default function DeliveryOptions({
  deliveryType,
  scheduledTime,
  onDeliveryTypeChange,
  onScheduledTimeChange,
  errors
}: DeliveryOptionsProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111827', marginBottom: 16 }}>Delivery options</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Standard option */}
        <div 
          onClick={() => onDeliveryTypeChange('standard')}
          style={{
            padding: '16px',
            background: deliveryType === 'standard' ? '#F0FDF4' : '#fff',
            border: `1px solid ${deliveryType === 'standard' ? '#219178' : '#F3F4F6'}`,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ 
            width: 20, 
            height: 20, 
            borderRadius: '50%', 
            border: `2px solid ${deliveryType === 'standard' ? '#219178' : '#D1D5DB'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: deliveryType === 'standard' ? '#219178' : 'transparent'
          }}>
            {deliveryType === 'standard' && <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>Standard</div>
            <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>As soon as possible</div>
          </div>
        </div>

        {/* Scheduled option */}
        <div 
          onClick={() => onDeliveryTypeChange('scheduled')}
          style={{
            padding: '16px',
            background: deliveryType === 'scheduled' ? '#F0FDF4' : '#fff',
            border: `1px solid ${deliveryType === 'scheduled' ? '#219178' : '#F3F4F6'}`,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ 
            width: 20, 
            height: 20, 
            borderRadius: '50%', 
            border: `2px solid ${deliveryType === 'scheduled' ? '#219178' : '#D1D5DB'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: deliveryType === 'scheduled' ? '#219178' : 'transparent'
          }}>
            {deliveryType === 'scheduled' && <div style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%' }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>Schedule</div>
            <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>Select time</div>
          </div>
          {deliveryType === 'scheduled' && (
            <input 
              type="datetime-local" 
              value={scheduledTime || ''}
              onChange={(e) => onScheduledTimeChange(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: 14,
                fontWeight: 700,
                color: '#219178',
                outline: 'none'
              }}
            />
          )}
        </div>
      </div>
      {errors.scheduledTime && (
        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 8, fontWeight: 600 }}>
          {errors.scheduledTime}
        </div>
      )}
    </div>
  );
}
