import React from 'react';

interface CheckoutButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  label?: string;
}

export default function CheckoutButton({ onClick, disabled, isLoading, label }: CheckoutButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      style={{
        width: '100%',
        height: 54,
        background: (disabled || isLoading) ? '#E5E7EB' : '#01A083',
        color: '#fff',
        borderRadius: '16px',
        fontSize: 16,
        fontWeight: 900,
        border: 'none',
        cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer',
        boxShadow: (disabled || isLoading) ? 'none' : '0 8px 16px rgba(1, 160, 131, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        transition: 'all 0.2s ease'
      }}
    >
      {isLoading ? (
        <div style={{
          width: 20,
          height: 20,
          border: '3px solid rgba(255,255,255,0.3)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      ) : (
        label || 'Pay to order'
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
