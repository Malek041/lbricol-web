import React from 'react';
import { User, Phone } from 'lucide-react';

interface RecipientDetailsProps {
  details: { name: string; phone: string; address?: string };
  onChange: (details: { name: string; phone: string; address?: string }) => void;
  errors: Record<string, string>;
}

export default function RecipientDetails({ details, onChange, errors }: RecipientDetailsProps) {
  return (
    <div style={{ marginBottom: 24, padding: 16, background: '#F9FAFB', borderRadius: '16px', border: '1px solid #F3F4F6' }}>
      <h3 style={{ fontSize: 14, fontWeight: 900, color: '#111827', marginBottom: 16 }}>Recipient Details</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          background: '#fff',
          border: `1px solid ${errors.recipientName ? '#FECACA' : '#F3F4F6'}`,
          borderRadius: 12
        }}>
          <User size={18} color="#9CA3AF" />
          <input 
            type="text"
            value={details.name}
            onChange={(e) => onChange({ ...details, name: e.target.value })}
            placeholder="Recipient Name"
            style={{ border: 'none', outline: 'none', fontSize: 14, fontWeight: 600, width: '100%' }}
          />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          background: '#fff',
          border: `1px solid ${errors.recipientPhone ? '#FECACA' : '#F3F4F6'}`,
          borderRadius: 12
        }}>
          <Phone size={18} color="#9CA3AF" />
          <input 
            type="text"
            value={details.phone}
            onChange={(e) => onChange({ ...details, phone: e.target.value })}
            placeholder="Phone Number (e.g. 06...)"
            style={{ border: 'none', outline: 'none', fontSize: 14, fontWeight: 600, width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}
