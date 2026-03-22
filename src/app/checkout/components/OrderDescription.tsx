import React from 'react';
import { Package } from 'lucide-react';

interface OrderDescriptionProps {
  value: string;
  onChange: (value: string) => void;
  errors: Record<string, string>;
}

export default function OrderDescription({ value, onChange, errors }: OrderDescriptionProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111827', marginBottom: 16 }}>Your order</h2>
      
      <div style={{
        display: 'flex',
        gap: 12,
        padding: '16px',
        background: '#fff',
        border: `1px solid ${errors.orderDescription ? '#FECACA' : '#F3F4F6'}`,
        borderRadius: '16px',
        alignItems: 'flex-start'
      }}>
        <div style={{ 
          width: 44, 
          height: 44, 
          background: '#F9FAFB', 
          borderRadius: 12, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Package size={20} color="#374151" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 4 }}>What do you need transporting?</div>
          <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500, marginBottom: 8 }}>Purchases aren't allowed</div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="E.g. I need to move a small table from A to B..."
            style={{
              width: '100%',
              minHeight: 80,
              border: 'none',
              outline: 'none',
              fontSize: 14,
              fontWeight: 600,
              color: '#374151',
              resize: 'none',
              padding: 0,
              background: 'transparent'
            }}
          />
        </div>
      </div>
      {errors.orderDescription && (
        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, marginLeft: 16, fontWeight: 500 }}>
          {errors.orderDescription}
        </div>
      )}
    </div>
  );
}
