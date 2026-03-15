"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface SearchBarProps {
  onSelect: (lat: number, lng: number, address: string) => void;
  onClose?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const searchAddress = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=en&countrycodes=ma`,
        {
          headers: {
            'User-Agent': 'Lbricol/1.0',
          },
        }
      );
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
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
    }, 800);
  }, [query]);

  return (
    <div className="absolute top-3 left-3 right-3 z-[1002]">
      <div className="relative">
        <div className="bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.12)] flex items-center px-[16px] h-[52px] gap-3">
          {onClose && (
            <button 
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center text-[#9CA3AF] hover:bg-neutral-50 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search street, city, district..."
            className="flex-1 bg-transparent border-none outline-none text-[15px] font-medium text-[#111827] placeholder:text-[#9CA3AF] placeholder:font-normal"
          />
          {isLoading ? (
            <Loader2 size={18} className="text-[#9CA3AF] animate-spin" />
          ) : (
            <Search size={18} className="text-[#9CA3AF]" />
          )}
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="ml-2"
            >
              <X size={18} className="text-[#9CA3AF]" />
            </button>
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-3 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-neutral-50 overflow-hidden animate-fade-in-down">
            {results.map((res) => (
              <button
                key={res.place_id}
                onClick={() => {
                  onSelect(parseFloat(res.lat), parseFloat(res.lon), res.display_name);
                  setQuery('');
                  setResults([]);
                }}
                className="w-full px-5 py-4 text-left hover:bg-neutral-50 border-b border-neutral-50 last:border-none transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center flex-shrink-0">
                    <Search size={14} className="text-neutral-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-neutral-900 truncate">
                      {res.display_name.split(',')[0]}
                    </p>
                    <p className="text-[12px] text-neutral-500 truncate mt-0.5">
                      {res.display_name.split(',').slice(1).join(',')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <style jsx>{`
        .animate-fade-in-down {
          animation: fadeInDown 0.2s ease-out;
        }
        @keyframes fadeInDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SearchBar;
