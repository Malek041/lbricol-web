import React from 'react';
import { CreditCard, Banknote, Gift, ChevronRight } from 'lucide-react';

interface PaymentSectionProps {
  paymentMethod: string;
  promoCode: string;
  promoCodeValid: boolean;
  isValidating: boolean;
  onPaymentMethodChange: (method: string) => void;
  onPromoCodeChange: (code: string) => void;
  onApplyPromoCode: (code: string) => void;
  errors: Record<string, string>;
}

export default function PaymentSection({
  paymentMethod,
  promoCode,
  promoCodeValid,
  isValidating,
  onPaymentMethodChange,
  onPromoCodeChange,
  onApplyPromoCode,
  errors
}: PaymentSectionProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111827', marginBottom: 16 }}>Payment method</h2>
      
      {/* Payment Method Selector */}
      <div 
        onClick={() => onPaymentMethodChange('cash')} // For now just toggle or open a sheet
        style={{
          padding: '16px',
          background: '#fff',
          border: '1px solid #F3F4F6',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          marginBottom: 12
        }}
      >
        <div style={{ padding: 8, background: '#F9FAFB', borderRadius: 10 }}>
          <Banknote size={20} color="#374151" />
        </div>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#374151' }}>
          {paymentMethod === 'cash' ? 'Cash on delivery' : (paymentMethod || 'Select a payment method')}
        </div>
        <ChevronRight size={18} color="#9CA3AF" />
      </div>

      {/* Promo Code Input */}
      <div style={{
        padding: '16px',
        background: '#fff',
        border: `1px solid ${errors.promoCode ? '#FECACA' : '#F3F4F6'}`,
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <div style={{ padding: 8, background: '#F9FAFB', borderRadius: 10 }}>
          <Gift size={20} color="#374151" />
        </div>
        <input 
          type="text"
          value={promoCode}
          onChange={(e) => onPromoCodeChange(e.target.value)}
          placeholder="Got a promo code?"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: 14,
            fontWeight: 700,
            color: '#374151',
            background: 'transparent'
          }}
        />
        <button
          onClick={() => onApplyPromoCode(promoCode)}
          disabled={!promoCode || isValidating || promoCodeValid}
          style={{
            padding: '8px 16px',
            background: promoCodeValid ? '#F0FDF4' : '#01A083',
            color: promoCodeValid ? '#01A083' : '#fff',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 800,
            border: 'none',
            cursor: (promoCodeValid || isValidating) ? 'default' : 'pointer'
          }}
        >
          {isValidating ? '...' : (promoCodeValid ? 'Applied' : 'Apply')}
        </button>
      </div>
      {errors.promoCode && (
        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, marginLeft: 16, fontWeight: 500 }}>
          {errors.promoCode}
        </div>
      )}
    </div>
  );
}
