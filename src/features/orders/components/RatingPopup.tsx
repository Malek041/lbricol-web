"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Send, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, increment, getDoc } from 'firebase/firestore';
import { getServiceVector } from '@/config/services_config';

const cn = (...classes: (string | undefined | false | null)[]) => classes.filter(Boolean).join(' ');

interface RatingPopupProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    bricolerId: string;
    bricolerName: string;
    bricolerAvatar?: string;
    serviceName: string;
    serviceId?: string;
    subServiceName?: string;
    orderDate?: string;
    orderTime?: string;
}

const RatingPopup: React.FC<RatingPopupProps> = ({
    isOpen,
    onClose,
    jobId,
    bricolerId,
    bricolerName,
    bricolerAvatar,
    serviceName,
    serviceId,
    subServiceName,
    orderDate,
    orderTime,
}) => {
    const { t } = useLanguage();
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [review, setReview] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alreadySeen, setAlreadySeen] = useState(false);

    // Guard: only show once per job using localStorage
    useEffect(() => {
        if (isOpen && jobId) {
            const key = `lbricol_rated_${jobId}`;
            if (localStorage.getItem(key)) {
                setAlreadySeen(true);
                onClose();
                return;
            }
            setAlreadySeen(false);

            const swoosh = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
            swoosh.volume = 0.35;
            swoosh.play().catch(() => { });
        }
    }, [isOpen, jobId, onClose]);

    const handleClose = () => {
        if (jobId) {
            localStorage.setItem(`lbricol_rated_${jobId}`, '1');
        }
        onClose();
    };

    const handleSubmit = async () => {
        if (rating === 0 || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const currentUser = auth.currentUser;
            const reviewData = {
                id: jobId,
                rating,
                comment: review,
                serviceId: serviceId || serviceName,
                serviceName,
                date: new Date().toISOString(),
                clientName: currentUser?.displayName || 'Client',
                clientAvatar: currentUser?.photoURL || null,
            };

            // Update Bricoler's reviews and rating stats
            const bricolerRef = doc(db, 'bricolers', bricolerId);
            const bricolerSnap = await getDoc(bricolerRef);

            if (bricolerSnap.exists()) {
                const data = bricolerSnap.data();
                const totalRating = (data.totalRating || 0) + rating;
                const numReviews = (data.numReviews || 0) + 1;
                const averageRating = totalRating / numReviews;
                const jobsCount = (data.completedJobs || data.jobsCompleted || 0) + 1;

                // Compute the bricoler's score in sync with the distribution algorithm:
                // score = (avg_rating × 10) + (completed_jobs × 5)
                const newScore = Math.round((averageRating * 10) + (jobsCount * 5));

                await updateDoc(bricolerRef, {
                    reviews: arrayUnion(reviewData),
                    totalRating: totalRating,
                    numReviews: numReviews,
                    rating: averageRating,
                    jobsCompleted: jobsCount,
                    completedJobs: jobsCount,
                    score: newScore,
                });
            } else {
                // Fallback for missing profile (should not happen for active bricolers)
                await updateDoc(bricolerRef, {
                    reviews: arrayUnion(reviewData),
                    totalRating: increment(rating),
                    numReviews: increment(1),
                    rating: rating,
                    jobsCompleted: increment(1),
                    completedJobs: increment(1),
                    score: increment(5), // minimal bump for fallback path
                });
            }

            // Mark job as rated — prevents future pop-ups from Firestore side
            const jobRef = doc(db, 'jobs', jobId);
            await updateDoc(jobRef, { rated: true });

            // Also guard locally so it never re-appears in this session
            localStorage.setItem(`lbricol_rated_${jobId}`, '1');

            onClose();
        } catch (err) {
            console.error('Error submitting review:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const serviceVector = getServiceVector(serviceId || serviceName);

    // Format the order date/time for display
    const displayDate = (() => {
        if (!orderDate) return null;
        try {
            const d = new Date(orderDate);
            if (isNaN(d.getTime())) return orderDate;
            return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
        } catch {
            return orderDate;
        }
    })();

    const displayTime = (() => {
        if (!orderTime) return null;
        try {
            const [h, m] = orderTime.split(':').map(Number);
            if (isNaN(h)) return orderTime;
            const period = h >= 12 ? 'pm' : 'am';
            const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            return `${displayH}:${String(m || 0).padStart(2, '0')}${period}`;
        } catch {
            return orderTime;
        }
    })();

    return (
        <AnimatePresence>
            {isOpen && !alreadySeen && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* Card */}
                    <motion.div
                        initial={{ scale: 0.85, y: 60, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.85, y: 60, opacity: 0 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                        className="relative bg-white w-full max-w-[400px] rounded-[32px] shadow-2xl overflow-hidden"
                    >
                        {/* Decorative top accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FFC244] via-[#00A082] to-[#FFC244]" />

                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-5 right-5 z-10 w-9 h-9 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 hover:text-black transition-colors"
                        >
                            <X size={18} />
                        </button>

                        {/* ── Order Context Banner ── */}
                        <div className="px-6 pt-7 pb-5 border-b border-neutral-100 bg-neutral-50/60">
                            <div className="flex items-center gap-4">
                                {/* Service image */}
                                <div className="w-16 h-16 rounded-[18px] bg-white border border-neutral-100 shadow-sm flex items-center justify-center flex-shrink-0 p-2">
                                    <img
                                        src={serviceVector}
                                        alt={serviceName}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                {/* Service info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-[#00A082] mb-0.5">
                                        {t({ en: 'Completed Mission', fr: 'Mission terminée', ar: 'مهمة منجزة' })}
                                    </p>
                                    <h3 className="text-[17px] font-black text-black leading-tight truncate capitalize">
                                        {subServiceName ? `${serviceName} › ${subServiceName}` : serviceName}
                                    </h3>
                                    {(displayDate || displayTime) && (
                                        <p className="text-[13px] font-semibold text-neutral-400 mt-0.5">
                                            {[displayDate, displayTime].filter(Boolean).join(' · ')}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Bricoler strip */}
                            <div className="mt-4 flex items-center gap-3 bg-white rounded-[16px] px-4 py-3 border border-neutral-100">
                                {bricolerAvatar ? (
                                    <img
                                        src={bricolerAvatar}
                                        className="w-9 h-9 rounded-full object-cover"
                                        alt={bricolerName}
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-[#00A082]/10 flex items-center justify-center text-[#00A082] font-black text-[16px]">
                                        {bricolerName[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                                        {t({ en: 'Your Bricoler', fr: 'Votre Bricoler', ar: 'مقدم الخدمة' })}
                                    </p>
                                    <p className="text-[15px] font-black text-black leading-tight">{bricolerName}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── Rating Body ── */}
                        <div className="px-6 pt-6 pb-7 flex flex-col items-center gap-5">
                            <div className="text-center">
                                <h2 className="text-[22px] font-black text-black">
                                    {t({ en: 'Rate your experience', fr: 'Notez votre expérience', ar: 'قيّم تجربتك' })}
                                </h2>
                                <p className="text-[14px] font-medium text-neutral-500 mt-1">
                                    {t({
                                        en: 'Tap a star to rate this mission',
                                        fr: 'Appuyez sur une étoile pour évaluer',
                                        ar: 'اضغط على نجمة لتقييم المهمة',
                                    })}
                                </p>
                            </div>

                            {/* Stars */}
                            <div className="flex gap-1.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <motion.button
                                        key={star}
                                        whileHover={{ scale: 1.25 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHover(star)}
                                        onMouseLeave={() => setHover(0)}
                                        className="p-1"
                                    >
                                        <Star
                                            size={38}
                                            className={cn(
                                                'transition-colors drop-shadow-sm',
                                                (hover || rating) >= star
                                                    ? 'text-[#FFC244] fill-[#FFC244]'
                                                    : 'text-neutral-200 fill-neutral-100'
                                            )}
                                        />
                                    </motion.button>
                                ))}
                            </div>

                            {/* Optional review textarea */}
                            <div className="w-full relative">
                                <textarea
                                    value={review}
                                    onChange={(e) => setReview(e.target.value)}
                                    placeholder={t({
                                        en: 'Write a quick review (optional)...',
                                        fr: 'Écrivez un court avis (optionnel)...',
                                        ar: 'اكتب تقييماً سريعاً (اختياري)...',
                                    })}
                                    rows={3}
                                    className="w-full px-4 py-3.5 rounded-[18px] bg-neutral-50 border border-neutral-100 focus:ring-2 focus:ring-[#FFC244] focus:border-transparent text-[14px] font-medium resize-none outline-none transition-all"
                                />
                                <MessageSquare size={15} className="absolute top-4 right-4 text-neutral-300 pointer-events-none" />
                            </div>

                            {/* Submit button */}
                            <button
                                onClick={handleSubmit}
                                disabled={rating === 0 || isSubmitting}
                                className={cn(
                                    'w-full py-4 rounded-[20px] font-black text-[16px] flex items-center justify-center gap-2 transition-all active:scale-95',
                                    rating > 0 && !isSubmitting
                                        ? 'bg-[#00A082] text-white shadow-lg shadow-[#00A082]/20'
                                        : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                                )}
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send size={17} />
                                        {t({ en: 'Submit Review', fr: "Envoyer l'avis", ar: 'إرسال التقييم' })}
                                    </>
                                )}
                            </button>

                            {/* Hide button */}
                            <button
                                onClick={handleClose}
                                className="text-[12px] font-bold text-neutral-400 hover:text-neutral-600 transition-colors uppercase tracking-wider"
                            >
                                {t({ en: 'Skip & Hide', fr: 'Ignorer et masquer', ar: 'تجاهل وإخفاء' })}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default RatingPopup;
