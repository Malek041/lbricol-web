"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLanguage } from '@/context/LanguageContext';
import { Star, FileText, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function AdminReviewsView() {
    const { t } = useLanguage();
    const [reviews, setReviews] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filters state
    const [selectedCity, setSelectedCity] = useState<string>('all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all'); // format: YYYY-MM
    
    const cities = ['all', 'Marrakech', 'Casablanca', 'Essaouira', 'Agadir', 'Rabat', 'Tangier', 'Fes'];
    
    // Generate last 6 months for filtering
    const monthOptions = useMemo(() => {
        const options = [{ id: 'all', label: t({ en: 'All Time', fr: 'Tout le temps', ar: 'كل الأوقات' }) }];
        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const id = format(date, 'yyyy-MM');
            const label = format(date, 'MMMM yyyy');
            options.push({ id, label });
        }
        return options;
    }, [t]);

    useEffect(() => {
        // Query jobs that have been rated by either client or bricoler
        // We'll query for clientRating > 0 which is the most common "review" case.
        const q = query(
            collection(db, 'jobs'),
            where('clientRating', '>', 0),
            limit(200) // Increased limit to allow for better filtering
        );

        const unsub = onSnapshot(q, (snapshot) => {
            let data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
            
            // Sort to ensure newest reviews are prioritized
            data.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA; // descending
            });
            
            setReviews(data);
            setIsLoading(false);
        }, (error) => {
            console.error("AdminReviewsView error:", error);
            setIsLoading(false);
        });

        return unsub;
    }, []);

    const filteredReviews = useMemo(() => {
        return reviews.filter(review => {
            // City match
            const cityMatch = selectedCity === 'all' || (review.city && review.city.toLowerCase().includes(selectedCity.toLowerCase()));
            
            // Month match
            let monthMatch = true;
            if (selectedMonth !== 'all') {
                const reviewDate = review.createdAt?.seconds ? new Date(review.createdAt.seconds * 1000) : null;
                if (reviewDate) {
                    const reviewMonth = format(reviewDate, 'yyyy-MM');
                    monthMatch = reviewMonth === selectedMonth;
                } else {
                    monthMatch = false; // Cannot filter reviews without dates
                }
            }
            
            return cityMatch && monthMatch;
        });
    }, [reviews, selectedCity, selectedMonth]);

    const formatDateString = (ts: any) => {
        if (!ts) return '';
        try {
            const date = ts.toDate ? ts.toDate() : new Date(typeof ts === 'number' ? ts * 1000 : ts);
            return format(date, 'MMM dd, yyyy');
        } catch { return ''; }
    };

    return (
        <div className="flex flex-col min-h-screen bg-transparent pb-24">
            {/* Header Area */}
            <div className="px-5 pt-8 pb-6">
                <h1 className="text-[32px] font-black text-black leading-tight">
                    {t({ en: 'Member Reviews', fr: 'Avis des Membres', ar: 'تقييمات الأعضاء' })}
                </h1>
                <p className="text-neutral-400 font-bold mt-1 text-[15px]">
                    {filteredReviews.length} {t({ en: 'filtered reviews', fr: 'avis filtrés', ar: 'مراجعات مفلترة' })}
                </p>
                
                {/* Filter Controls */}
                <div className="mt-8 space-y-3">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        {cities.map(city => (
                            <button
                                key={city}
                                onClick={() => setSelectedCity(city)}
                                className={cn(
                                    "px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all border",
                                    selectedCity === city 
                                        ? "bg-black text-white border-black shadow-lg shadow-black/10 scale-105" 
                                        : "bg-white text-neutral-400 border-neutral-100 hover:border-neutral-200"
                                )}
                            >
                                {city === 'all' ? t({ en: 'All Cities', fr: 'Toutes les villes' }) : city}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        {monthOptions.map(month => (
                            <button
                                key={month.id}
                                onClick={() => setSelectedMonth(month.id)}
                                className={cn(
                                    "px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all border",
                                    selectedMonth === month.id 
                                        ? "bg-[#01A083] text-white border-[#01A083] shadow-lg shadow-[#01A083]/10 scale-105" 
                                        : "bg-white text-neutral-400 border-neutral-100 hover:border-neutral-200"
                                )}
                            >
                                {month.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="px-5 space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-[32px] h-32 animate-pulse border border-neutral-100 shadow-sm" />
                        ))}
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[40px] border border-neutral-100 mt-6 shadow-sm">
                        <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-6">
                            <Star size={40} className="text-neutral-200" />
                        </div>
                        <h3 className="text-xl font-black text-black text-center mb-2">{t({ en: 'No matching reviews', fr: 'Aucun avis correspondant' })}</h3>
                        <p className="text-neutral-400 font-bold text-center text-sm px-4">
                            {t({ en: 'Try adjusting your filters or city selection.', fr: 'Essayez d\'ajuster vos filtres ou votre choix de ville.' })}
                        </p>
                        <button 
                            onClick={() => { setSelectedCity('all'); setSelectedMonth('all'); }}
                            className="mt-6 text-[14px] font-black text-[#01A083] hover:underline"
                        >
                            {t({ en: 'Reset filters', fr: 'Réinitialiser les filtres' })}
                        </button>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filteredReviews.map((review, i) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                key={review.id}
                                className="bg-white p-6 rounded-[32px] shadow-sm border border-neutral-100 flex flex-col gap-4 hover:shadow-md transition-all active:scale-[0.98]"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-[#FFCC02]/10 flex items-center justify-center text-[#FFCC02] font-black border border-[#FFCC02]/20 overflow-hidden">
                                            {review.clientAvatar ? (
                                                <img src={review.clientAvatar} className="w-full h-full object-cover" alt={review.clientName} />
                                            ) : (
                                                review.clientName ? review.clientName[0] : 'C'
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[16px] font-black text-black">{review.clientName || 'Client'}</span>
                                            <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-400 lowercase tracking-wide">
                                                <CalendarIcon size={12} />
                                                <span>{formatDateString(review.createdAt || review.timestamp)} • {review.city || 'Casablanca'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-[#FFCC02]/10 px-3 py-1.5 rounded-full border border-[#FFCC02]/20">
                                        <Star size={14} className="text-[#FFCC02] fill-[#FFCC02]" strokeWidth={2.5} />
                                        <span className="text-[14px] font-black text-black">
                                            {(review.clientRating || review.rating || 0).toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                                
                                {review.comment ? (
                                    <p className="text-[15px] text-neutral-600 font-medium bg-neutral-50/50 p-4 rounded-[20px] leading-relaxed relative">
                                        <span className="absolute -top-2 -left-1 text-4xl text-neutral-200 opacity-50 font-serif">“</span>
                                        {review.comment}
                                    </p>
                                ) : (
                                    <p className="text-[14px] text-neutral-400 italic">No text comment provided.</p>
                                )}
                                
                                <div className="flex items-center justify-between pt-4 border-t border-neutral-50/50 mt-1">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t({ en: 'Provider', fr: 'Prestataire', ar: 'المحترف' })}</span>
                                        <span className="text-[14px] font-black text-[#01A083]">{review.bricolerName || review.providerName || 'Unknown'}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t({ en: 'Category', fr: 'Catégorie', ar: 'الفئة' })}</span>
                                        <span className="text-[14px] font-black text-black capitalize">{(review.serviceId || review.serviceType || 'Service').replace(/_/g, ' ')}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
