"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, X, Loader2 } from 'lucide-react';

interface SearchResult {
  place_id: string | number;
  display_name: string;
  lat: number;
  lng: number;
}

interface AddressSearchProps {
  onSelect: (lat: number, lng: number, address: string) => void;
  onBack: () => void;
}

const AddressSearch: React.FC<AddressSearchProps> = ({ onSelect, onBack }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-focus input on open
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const searchAddress = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=fr,ar,en&countrycodes=ma`,
        { headers: { 'User-Agent': 'Lbricol/1.0' } }
      );
      const data = await res.json();
      if (!Array.isArray(data)) {
        setResults([]);
        return;
      }
      const mappedResults = data.map((r: any) => ({
        display_name: r.display_name.split(',').slice(0, 3).join(',').trim(),
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        place_id: r.place_id,
      }));
      setResults(mappedResults);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!query) {
      setResults([]);
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      searchAddress(query);
    }, 600);
  }, [query]);

  return (
    <div className="fixed inset-0 bg-white z-[10002] flex flex-col font-jakarta">
      {/* Search Header */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#F3F4F6]">
        <button onClick={onBack} className="p-2 -ml-2 text-[#111827] hover:bg-neutral-50 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        
        <div className="flex-1 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
            <Search size={18} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une adresse..."
            className="w-full h-11 pl-11 pr-24 bg-[#F9FAFB] border-none rounded-full outline-none text-[15px] font-medium placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="text-[#9CA3AF] p-1.5 hover:text-[#374151]"
              >
                <X size={18} />
              </button>
            )}
            <button 
              onClick={onBack}
              className="p-1.5 text-[#10B981] hover:bg-[#E6F6F2] rounded-full transition-colors flex items-center justify-center"
              title="Select on map"
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-full h-full" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-[#10B981]" size={24} />
          </div>
        )}

        <div className="divide-y divide-[#F3F4F6]">
          {(results || []).map((res) => {
            const parts = res.display_name.split(',');
            const primary = parts[0];
            const secondary = parts.slice(1).join(',').trim();
            
            return (
              <button
                key={res.place_id}
                onClick={() => onSelect(res.lat, res.lng, res.display_name)}
                className="w-full px-5 py-4 text-left active:bg-neutral-50 transition-colors"
              >
                <div className="flex flex-col">
                  <p className="text-[15px] font-bold text-[#111827] truncate">
                    {primary}
                  </p>
                  <p className="text-[13px] text-[#6B7280] truncate mt-0.5">
                    {secondary || 'Morocco'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {!isLoading && query && results.length === 0 && (
          <div className="px-5 py-10 text-center text-[#9CA3AF]">
            <p>No results found</p>
          </div>
        )}
      </div>

      {/* Footer Attribution */}
      <div className="p-4 bg-white border-t border-[#F3F4F6] text-right">
        <p className="text-[11px] text-[#9CA3AF]">
          © OpenStreetMap contributors
        </p>
      </div>
    </div>
  );
};

export default AddressSearch;
