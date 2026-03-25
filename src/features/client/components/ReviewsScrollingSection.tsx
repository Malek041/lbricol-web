"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export const ReviewsScrollingSection = () => {
    const { t } = useLanguage();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                // Fetch up to 10 reviews with rating >= 4
                const q = query(
                    collection(db, 'reviews'),
                    where('rating', '>=', 4),
                    orderBy('rating', 'desc'),
                    limit(10)
                );
                const snapshot = await getDocs(q);
                const fetched: any[] = [];
                snapshot.forEach(doc => {
                    fetched.push({ id: doc.id, ...doc.data() });
                });
                setReviews(fetched);
            } catch (error) {
                console.error('Error fetching reviews:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, []);

    if (loading) return null;
    if (reviews.length === 0) return null;

    // Use fetched reviews
    const displayReviews = reviews.map(r => ({
        id: r.id,
        name: r.clientName || t({ en: 'Client', fr: 'Client', ar: 'عميل' }),
        city: r.city || '',
        service: r.serviceName || 'Service',
        serviceFr: r.serviceName || 'Service',
        rating: r.rating || 5,
        comment: r.comment || '',
        commentEn: r.comment || ''
    }));

    // Duplicate reviews for seamless looping
    const duplicatedReviews = displayReviews.length >= 4
        ? [...displayReviews, ...displayReviews]
        : [...displayReviews, ...displayReviews, ...displayReviews, ...displayReviews];

    return (
        <div className="w-full overflow-hidden py-10 bg-neutral-50/30">
            <div className="px-6 mb-6">
                <h3 className="text-[20px] font-black text-neutral-900 flex items-center gap-2">
                    <Star size={20} className="text-[#FFC244] fill-[#FFC244]" />
                    {t({ en: 'What our clients say', fr: 'Ce que disent nos clients' })}
                </h3>
                <p className="text-[14px] font-medium text-neutral-400 mt-0.5">
                    {t({ en: 'Real feedback from real people', fr: 'Des retours réels de vraies personnes' })}
                </p>
            </div>

            <div className="flex relative">
                <motion.div
                    className="flex gap-4 px-4"
                    animate={{
                        x: [0, -1400], // Adjust based on content width
                    }}
                    transition={{
                        x: {
                            repeat: Infinity,
                            repeatType: "loop",
                            duration: 35,
                            ease: "linear",
                        },
                    }}
                >
                    {duplicatedReviews.map((review, idx) => (
                        <div
                            key={`${review.id}-${idx}`}
                            className="flex-shrink-0 w-[280px] p-6 bg-white/70 backdrop-blur-md rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white/40 flex flex-col gap-3"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <span className="text-[15px] font-black text-neutral-900">{review.name}</span>
                                    <span className="text-[12px] font-bold text-neutral-400">{review.city}</span>
                                </div>
                                <div className="flex items-center gap-1 bg-[#FFF8E7] px-2 py-1 rounded-full">
                                    <Star size={10} className="text-[#FFC244] fill-[#FFC244]" />
                                    <span className="text-[12px] font-black text-neutral-900">{review.rating}</span>
                                </div>
                            </div>

                            <div className="relative">
                                <Quote size={16} className="text-[#219178] opacity-20 absolute -top-1 -left-1" />
                                <p className="text-[14px] text-neutral-600 font-medium leading-relaxed indent-4 line-clamp-3">
                                    {t({ en: review.commentEn, fr: review.comment })}
                                </p>
                            </div>

                            <div className="mt-1 flex items-center gap-2">
                                <span className="px-2.5 py-1 bg-neutral-50 text-[11px] font-bold text-[#219178] rounded-lg uppercase tracking-wider border border-neutral-100">
                                    {t({ en: review.service, fr: review.serviceFr })}
                                </span>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};
