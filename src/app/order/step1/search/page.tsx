'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchAddress } from '@/lib/reverseGeocode';
import { Search, ArrowLeft, X } from 'lucide-react';

export default function Step1SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const data = await searchAddress(q);
    setResults(data || []);
    setSearching(false);
  };

  const handleSelect = (result: any) => {
    // Pass selected coords back to step1 via query params
    router.push(
      `/order/step1?lat=${result.lat}&lng=${result.lon}&address=${encodeURIComponent(result.display_name)}`
    );
  };

  return (
    <div style={{ height: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>

      {/* Search bar */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', pt: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#F3F4F6', borderRadius: 50, padding: '12px 16px',
        }}>
          <button 
            onClick={() => router.back()} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeft size={20} className="text-neutral-700" />
          </button>
          <input
            autoFocus
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search street, city, district..."
            style={{
              flex: 1, border: 'none', background: 'transparent',
              fontSize: 15, outline: 'none', fontWeight: 500, color: '#111827'
            }}
          />
          {query && (
            <button 
              onClick={() => { setQuery(''); setResults([]); }} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {searching && (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14, fontWeight: 500 }}>
            Searching...
          </div>
        )}
        {!searching && query && results.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14, fontWeight: 500 }}>
            No results found
          </div>
        )}
        {results.map((r, i) => (
          <div
            key={i}
            onClick={() => handleSelect(r)}
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #F9FAFB',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
              {r.display_name.split(',')[0]}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#6B7280', lineHeight: 1.4 }}>
              {r.display_name.split(',').slice(1, 4).join(',')}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 16px 16px', textAlign: 'right' }}>
        <span style={{ fontSize: 11, color: '#D1D5DB' }}>© OpenStreetMap contributors</span>
      </div>
    </div>
  );
}
