import React, { useState } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LocationInputProps {
  label: string;
  icon: string | React.ReactNode;
  value: string;
  results: Array<{ address: string; lat: number; lng: number; placeId?: string }>;
  onSearch: (query: string) => void;
  onSelect: (location: { address: string; lat: number; lng: number }) => void;
  error?: string;
  placeholder?: string;
}

export default function LocationInput({
  label,
  icon,
  value,
  results,
  onSearch,
  onSelect,
  error,
  placeholder
}: LocationInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value);

  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: '#fff',
        border: `1px solid ${error ? '#FECACA' : (isFocused ? '#219178' : '#F3F4F6')}`,
        borderRadius: '16px',
        transition: 'all 0.2s ease',
        boxShadow: isFocused ? '0 0 0 4px rgba(1, 160, 131, 0.05)' : 'none'
      }}>
        <div style={{ color: '#9CA3AF', flexShrink: 0 }}>
          {typeof icon === 'string' ? icon : icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
            {label}
          </div>
          <input
            type="text"
            value={isFocused ? internalValue : value}
            onChange={(e) => {
              setInternalValue(e.target.value);
              onSearch(e.target.value);
            }}
            onFocus={() => {
              setIsFocused(true);
              setInternalValue(value);
            }}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder={placeholder || "Search address..."}
            maxLength={60}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: 15,
              fontWeight: 600,
              color: '#111827',
              padding: 0,
              background: 'transparent',
              textOverflow: 'ellipsis'
            }}
          />
        </div>
        {value && (
          <button 
            onClick={() => {
              setInternalValue('');
              onSearch('');
              onSelect({ address: '', lat: 0, lng: 0 });
            }}
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: '#9CA3AF' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isFocused && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 100,
              background: '#fff',
              borderRadius: '16px',
              marginTop: 8,
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '1px solid #F3F4F6',
              maxHeight: 250,
              overflowY: 'auto'
            }}
          >
            {results.map((res, i) => (
              <div
                key={i}
                onClick={() => {
                  onSelect(res);
                  setIsFocused(false);
                }}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  borderBottom: i === results.length - 1 ? 'none' : '1px solid #F9FAFB'
                }}
              >
                <MapPin size={18} color="#9CA3AF" />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {res.address}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, marginLeft: 16, fontWeight: 500 }}>
          {error}
        </div>
      )}
    </div>
  );
}
