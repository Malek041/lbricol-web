"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowLeft, Clock, Star, ChevronRight } from 'lucide-react';
import { SERVICES_CATALOGUE } from '@/config/services_catalogue';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

interface SearchPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectSubService: (serviceId: string, subService: any) => void;
}

const G_GREEN = '#01A083';

export const SearchPopup: React.FC<SearchPopupProps> = ({
    isOpen,
    onClose,
    onSelectSubService,
}) => {
    const { t, language } = useLanguage();
    const [query, setQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load recent searches on mount
    useEffect(() => {
        const saved = localStorage.getItem('lbricol_recent_searches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse recent searches", e);
            }
        }
    }, []);

    // Autofocus input when open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery('');
        }
    }, [isOpen]);

    const allSubServices = useMemo(() => {
        const list: { serviceId: string; serviceLabel: string; subService: any }[] = [];
        const softBlocklist = ['car_wash', 'car_detailing', 'car_detail'];

        SERVICES_CATALOGUE.forEach(svc => {
            svc.subServices.forEach(sub => {
                if (sub.id && !softBlocklist.includes(sub.id)) {
                    const translation: any = { 
                        en: svc.label || '', 
                        fr: svc.labelFr || '', 
                        ar: svc.labelAr || svc.labelFr || '' 
                    };
                    list.push({
                        serviceId: svc.id,
                        serviceLabel: t(translation),
                        subService: sub
                    });
                }
            });
        });
        return list;
    }, [language, t]);

    const filteredResults = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase().trim();
        const isSearchingForCleaning = q.includes('ménage') || q.includes('menage');

        return allSubServices.filter(item => {
            const sub = item.subService;
            
            // Special check for "Ménage" keyword for Cleaning services
            const matchesCleaningSynonym = isSearchingForCleaning && item.serviceId === 'cleaning';
            
            const matchesStandard = (
                sub.en.toLowerCase().includes(q) ||
                sub.fr.toLowerCase().includes(q) ||
                (sub.ar && sub.ar.includes(q)) ||
                item.serviceLabel.toLowerCase().includes(q)
            );
            
            return matchesCleaningSynonym || matchesStandard;
        }).slice(0, 15);
    }, [query, allSubServices, language]);


    const handleSelect = (item: any) => {
        if (item.serviceId !== 'cleaning') {
            alert(t({
                en: 'This service is not yet enabled in your city. We are currently focusing on Cleaning services.',
                fr: 'Ce service n\'est pas encore activé dans votre ville. Nous nous concentrons actuellement sur les services de Nettoyage.',
                ar: 'هذه الخدمة غير مفعلة في مدينتك بعد. نحن نركز حاليًا على خدمات التنظيف.'
            }));
            return;
        }

        // Save to recent
        const term = t(item.subService);
        const updatedRecent = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
        setRecentSearches(updatedRecent);
        localStorage.setItem('lbricol_recent_searches', JSON.stringify(updatedRecent));

        onSelectSubService(item.serviceId, item.subService);
        onClose();
    };

    const handleRecentClick = (term: string) => {
        setQuery(term);
    };

    const popularTags = [
        { en: 'Cleaning', fr: 'Ménage', ar: 'تنظيف' },
        { en: 'Plumbing', fr: 'Plomberie', ar: 'سباكة' },
        { en: 'Moving', fr: 'Déménagement', ar: 'نقل' },
        { en: 'Electricity', fr: 'Électricité', ar: 'كهرباء' },
        { en: 'Painting', fr: 'Peinture', ar: 'صباغة' },
        { en: 'Assembly', fr: 'Montage', ar: 'تركيب' },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed inset-0 z-[150] bg-white flex flex-col font-jakarta"
                >
                    {/* Header */}
                    <div className="pt-[env(safe-area-inset-top)] border-b border-neutral-100">
                        <div className="px-4 py-3 flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center rounded-full active:bg-neutral-100 transition-colors"
                            >
                                <ArrowLeft size={24} className="text-neutral-900" />
                            </button>

                            <div className="flex-1 flex items-center bg-neutral-100 rounded-[25px_15px_30px_18px] border-2 border-black/5 px-4 py-2.5">
                                <Search size={18} className="text-neutral-400 mr-2" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={t({ en: 'Search services...', fr: 'Rechercher un service...', ar: 'ابحث عن خدمة...' })}
                                    className="flex-1 bg-transparent text-[16px] font-medium text-neutral-900 placeholder:text-neutral-400 outline-none"
                                />
                                {query && (
                                    <button onClick={() => setQuery('')}>
                                        <X size={18} className="text-neutral-400" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 pb-12">
                        {query.trim() === '' ? (
                            <div className="flex flex-col gap-8 pt-6">
                                {/* Recent Searches */}
                                {recentSearches.length > 0 && (
                                    <section>
                                        <h3 className="text-[17px] font-black text-neutral-900 mb-4">
                                            {t({ en: 'Recent searches', fr: 'Recherches récentes', ar: 'عمليات البحث الأخيرة' })}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {recentSearches.map((term, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleRecentClick(term)}
                                                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-[15px_10px_18px_12px] border-2 border-black/5 text-[14px] font-bold text-neutral-700 transition-colors flex items-center gap-2"
                                                >
                                                    <Clock size={14} className="text-neutral-400" />
                                                    {term}
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}


                                {/* Popular Search Tags */}
                                <section>
                                    <h3 className="text-[17px] font-black text-neutral-900 mb-4">
                                        {t({ en: 'Popular searches', fr: 'Recherches populaires', ar: 'عمليات بحث شائعة' })}
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {popularTags.map((tag, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleRecentClick(t(tag))}
                                                className="px-4 py-2 border-2 border-black/5 hover:border-neutral-300 rounded-[15px_20px_12px_18px] text-[14px] font-bold text-neutral-700 transition-colors"
                                            >
                                                {t(tag)}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        ) : (
                            /* Search Results */
                            <div className="pt-4 flex flex-col gap-1">
                                {filteredResults.length > 0 ? (
                                    filteredResults.map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelect(item)}
                                            className="w-full py-4 flex items-center gap-4 border-b border-neutral-50 active:bg-neutral-50 transition-colors text-left"
                                        >
                                            <div className="w-12 h-12 rounded-[18px_22px_15px_25px] bg-[#FFB700] flex items-center justify-center shrink-0">
                                                <img src={SERVICES_CATALOGUE.find(s => s.id === item.serviceId)?.iconPath} className="w-8 h-8 object-contain" alt="" />
                                            </div>
                                            <div className={cn("flex-1 flex flex-col", item.serviceId !== 'cleaning' && "opacity-40 grayscale")}>
                                                <span className="text-[16px] font-medium text-neutral-900">
                                                    {t(item.subService)}
                                                </span>
                                                <span className="text-[13px] font-light text-neutral-500">
                                                    {item.serviceLabel} {item.serviceId !== 'cleaning' && `(${t({ en: 'Coming soon', fr: 'Bientôt disponible', ar: 'قريباً' })})`}
                                                </span>
                                            </div>
                                            <ChevronRight size={20} className="text-neutral-300" />
                                        </button>
                                    ))
                                ) : (
                                    <div className="pt-20 flex flex-col items-center text-center px-6">
                                        <div className="w-40 h-40 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                                            <Search size={48} className="text-neutral-200" />
                                        </div>
                                        <h4 className="text-[18px] font-black text-neutral-900 mb-2">
                                            {t({ en: 'No matching services', fr: 'Aucun service correspondant', ar: 'لا توجد خدمات مطابقة' })}
                                        </h4>
                                        <p className="text-[14px] font-medium text-neutral-500 leading-relaxed">
                                            {t({
                                                en: 'Try searching with different keywords like "pipes", "cleaning", or "transport".',
                                                fr: 'Essayez de rechercher avec d\'autres mots-clés comme "tuyau", "nettoyage" ou "transport".',
                                                ar: 'جرب البحث بكلمات مختلفة مثل "أنابيب"، "تنظيف"، أو "نقل".'
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
