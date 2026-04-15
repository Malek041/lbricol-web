"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Check } from 'lucide-react';
import { COUNTRY_DATA, CountryConfig } from '@/lib/phoneUtils';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

interface CountrySelectorProps {
    selectedCountry: CountryConfig;
    onSelect: (country: CountryConfig) => void;
    fontSize?: string;
    isCompact?: boolean;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({ 
    selectedCountry, 
    onSelect, 
    fontSize = '16px',
    isCompact = false 
}) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredCountries = COUNTRY_DATA.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.dialCode.includes(searchQuery) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 pr-3 border-r border-neutral-200 h-full transition-all hover:bg-black/5 rounded-l-lg"
                style={{ minWidth: isCompact ? '85px' : '100px' }}
            >
                <span className="text-xl" role="img" aria-label={selectedCountry.name}>
                    {selectedCountry.flag}
                </span>
                <span style={{ fontSize, fontWeight: 700, color: '#1D1D1D' }}>
                    {selectedCountry.dialCode}
                </span>
                <ChevronDown size={14} className={cn("text-neutral-400 transition-transform", isOpen && "rotate-180")} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-neutral-100 z-[5000] overflow-hidden"
                    >
                        {/* Search Input */}
                        <div className="p-3 border-b border-neutral-50 bg-neutral-50/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                                <input
                                    autoFocus
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t({ en: 'Search country...', fr: 'Rechercher un pays...' })}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#01A083] transition-all"
                                />
                            </div>
                        </div>

                        {/* Country List */}
                        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                            {filteredCountries.length > 0 ? (
                                filteredCountries.map((country) => (
                                    <button
                                        key={country.code}
                                        onClick={() => {
                                            onSelect(country);
                                            setIsOpen(false);
                                            setSearchQuery('');
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between p-3 rounded-xl transition-all hover:bg-neutral-50",
                                            selectedCountry.code === country.code ? "bg-[#01A083]/5" : ""
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{country.flag}</span>
                                            <div className="flex flex-col items-start">
                                                <span className="text-sm font-bold text-neutral-900">{country.name}</span>
                                                <span className="text-xs text-neutral-500">{country.dialCode}</span>
                                            </div>
                                        </div>
                                        {selectedCountry.code === country.code && (
                                            <Check size={18} className="text-[#01A083]" />
                                        )}
                                    </button>
                                ))
                            ) : (
                                <div className="p-4 text-center text-sm text-neutral-400">
                                    {t({ en: 'No countries found', fr: 'Aucun pays trouvé' })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CountrySelector;
