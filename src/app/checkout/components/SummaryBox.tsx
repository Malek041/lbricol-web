import React from 'react';
import { PricingData } from '@/lib/checkoutTypes';

interface SummaryBoxProps {
  pricing: PricingData;
  roadDistance: number | null;
  roadDurationMinutes: number | null;
}

export default function SummaryBox({ pricing, roadDistance, roadDurationMinutes }: SummaryBoxProps) {
  return (
    <div style={{
      background: '#F9FAFB',
      borderRadius: '24px',
      padding: '24px',
      marginBottom: '24px',
      border: '1px solid #F3F4F6'
    }}>
      <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111827', marginBottom: 20 }}>Summary</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            Delivery {roadDistance !== null && (
              <span style={{ fontSize: 11, background: '#E5E7EB', color: '#374151', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                {roadDistance} km
              </span>
            )}
            <span style={{ cursor: 'help', color: '#9CA3AF' }}>ⓘ</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{pricing.baseDeliveryFee.toFixed(2)} MAD</div>
        </div>

        {pricing.schedulingPremium > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 600 }}>Scheduling Fee</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{pricing.schedulingPremium.toFixed(2)} MAD</div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#6B7280', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            Services <span style={{ cursor: 'help', color: '#9CA3AF' }}>ⓘ</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{pricing.serviceFee.toFixed(2)} MAD</div>
        </div>

        {pricing.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#219178' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Promo Discount</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>-{pricing.discount.toFixed(2)} MAD</div>
          </div>
        )}

        <div style={{ height: 1, background: '#E5E7EB', margin: '8px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>Total to pay</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#219178' }}>{pricing.total.toFixed(2)} MAD</div>
        </div>
      </div>
    </div>
  );
}
