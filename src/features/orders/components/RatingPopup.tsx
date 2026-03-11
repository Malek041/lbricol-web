"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Send, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, increment, getDoc } from 'firebase/firestore';
import { getServiceVector } from '@/config/services_config';
import { writeCityIndex } from '@/lib/cityIndex';

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
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1);
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [review, setReview] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alreadySeen, setAlreadySeen] = useState(false);

    const setStepWithDirection = (s: number) => {
        setDirection(s > step ? 1 : -1);
        setStep(s);
    };

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

    const handleRatingSelect = (val: number) => {
        setRating(val);
        // Small delay for visual feedback before sliding
        setTimeout(() => setStepWithDirection(2), 300);
    };

    const handleSubmit = async (isSkip = false) => {
        if (rating === 0 || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const currentUser = auth.currentUser;
            const reviewData = {
                id: jobId,
                rating,
                comment: isSkip ? "" : review,
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
                const jobsCount = (data.completedJobs || data.jobsCompleted || data.numReviews || data.jobsDone || 0);

                // Compute the bricoler's score in sync with the distribution algorithm:
                // score = (avg_rating × 10) + (completed_jobs × 5)
                const newScore = Math.round((averageRating * 10) + (jobsCount * 5));

                await updateDoc(bricolerRef, {
                    reviews: arrayUnion(reviewData),
                    totalRating: totalRating,
                    numReviews: numReviews,
                    rating: averageRating,
                    score: newScore,
                });

                // Update city_index (non-blocking)
                if (data.city) {
                    writeCityIndex(bricolerId, data.city, {
                        ...data,
                        rating: averageRating,
                        numReviews: numReviews,
                        score: newScore,
                    } as any).catch(console.warn);
                }
            } else {
                await updateDoc(bricolerRef, {
                    reviews: arrayUnion(reviewData),
                    totalRating: increment(rating),
                    numReviews: increment(1),
                    rating: rating,
                });
            }

            const jobRef = doc(db, 'jobs', jobId);
            await updateDoc(jobRef, { rated: true });
            localStorage.setItem(`lbricol_rated_${jobId}`, '1');
            onClose();
        } catch (err) {
            console.error('Error submitting review:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const serviceVector = getServiceVector(serviceId || serviceName);

    const displayDate = (() => {
        if (!orderDate) return null;
        try {
            const d = new Date(orderDate);
            if (isNaN(d.getTime())) return orderDate;
            return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
        } catch { return orderDate; }
    })();

    const displayTime = (() => {
        if (!orderTime) return null;
        try {
            const [h, m] = orderTime.split(':').map(Number);
            if (isNaN(h)) return orderTime;
            const period = h >= 12 ? 'pm' : 'am';
            const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
            return `${displayH}:${String(m || 0).padStart(2, '0')}${period}`;
        } catch { return orderTime; }
    })();

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 300 : -300,
            opacity: 0
        })
    };

    return (
        <AnimatePresence>
            {isOpen && !alreadySeen && (
                <div className="fixed inset-0 z-[5000] flex items-end md:items-center justify-center">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* Bottom Sheet Container */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative bg-white w-full max-w-[450px] rounded-t-[40px] md:rounded-[40px] shadow-2xl overflow-hidden pb-10 md:pb-6"
                    >
                        {/* Drag indicator (mobile feel) */}
                        <div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto mt-4 mb-2 md:hidden" />

                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-6 right-6 z-10 w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 hover:text-black transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="relative overflow-hidden">
                            <AnimatePresence initial={false} mode="wait" custom={direction}>
                                {step === 1 ? (
                                    <motion.div
                                        key="step1"
                                        custom={direction}
                                        variants={variants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                        className="px-6 md:px-8 py-4"
                                    >
                                        <div className="mb-6">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 p-2 flex items-center justify-center">
                                                    <img src={serviceVector} alt={serviceName} className="w-full h-full object-contain" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-black text-[#00A082] uppercase tracking-[0.15em] mb-1">
                                                        {t({ en: 'Mission Completed', fr: 'Mission terminée' })}
                                                    </p>
                                                    <h3 className="text-[18px] font-black text-black leading-tight truncate capitalize">
                                                        {subServiceName || serviceName}
                                                    </h3>
                                                    <p className="text-[13px] font-bold text-neutral-400">
                                                        {[displayDate, displayTime].filter(Boolean).join(' · ')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-neutral-50 rounded-[28px] p-5 flex items-center gap-4 border border-neutral-100">
                                                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-neutral-200">
                                                    {bricolerAvatar ? (
                                                        <img src={bricolerAvatar} className="w-full h-full object-cover" alt={bricolerName} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[#00A082] font-black text-xl">
                                                            {bricolerName[0]?.toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">{t({ en: 'Your Pro', fr: 'Votre Pro' })}</p>
                                                    <p className="text-[17px] font-black text-black">{bricolerName}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-center space-y-4 mb-8">
                                            <h2 className="text-[24px] font-black text-black leading-tight">
                                                {t({ en: 'Rate your experience', fr: 'Notez votre expérience' })}
                                            </h2>
                                            <div className="flex justify-center gap-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <motion.button
                                                        key={star}
                                                        whileHover={{ scale: 1.2 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleRatingSelect(star)}
                                                        onMouseEnter={() => setHover(star)}
                                                        onMouseLeave={() => setHover(0)}
                                                        className="p-1"
                                                    >
                                                        <Star
                                                            size={44}
                                                            className={cn(
                                                                'transition-all duration-200',
                                                                (hover || rating) >= star
                                                                    ? 'text-[#FFC244] fill-[#FFC244] drop-shadow-[0_0_8px_rgba(255,194,68,0.3)]'
                                                                    : 'text-neutral-200 fill-neutral-100'
                                                            )}
                                                        />
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="step2"
                                        custom={direction}
                                        variants={variants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                        className="px-6 md:px-8 py-4"
                                    >
                                        <div className="flex items-center gap-4 mb-8">
                                            <button
                                                onClick={() => setStepWithDirection(1)}
                                                className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 text-black hover:bg-neutral-200 transition-colors"
                                            >
                                                <motion.div animate={{ rotate: 0 }} whileHover={{ x: -2 }}>
                                                    <Send className="rotate-180" size={18} />
                                                </motion.div>
                                            </button>
                                            <div className="flex-1">
                                                <p className="text-[13px] font-black text-[#00A082] uppercase tracking-widest">{t({ en: 'Write a review', fr: 'Écrire un avis' })}</p>
                                                <h2 className="text-[20px] font-black text-black leading-tight">
                                                    {t({ en: `How was your experience with ${bricolerName}?`, fr: `Comment était votre expérience avec ${bricolerName} ?` })}
                                                </h2>
                                            </div>
                                        </div>

                                        <div className="relative mb-6">
                                            <textarea
                                                autoFocus
                                                value={review}
                                                onChange={(e) => setReview(e.target.value)}
                                                placeholder={t({ en: 'Clean work? Great communication?', fr: 'Travail soigné ? Bonne communication ?' })}
                                                className="w-full bg-neutral-50 rounded-[32px] p-6 text-[16px] font-semibold border-2 border-transparent focus:border-[#FFC244] focus:bg-white transition-all outline-none resize-none min-h-[160px]"
                                            />
                                            <div className="absolute top-6 right-6 text-neutral-300">
                                                <MessageSquare size={20} />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={() => handleSubmit(false)}
                                                disabled={isSubmitting}
                                                className="w-full h-16 bg-black text-white rounded-[24px] font-black text-[18px] flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
                                            >
                                                {isSubmitting ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : (
                                                    <>
                                                        <Send size={20} />
                                                        {t({ en: 'Send Review', fr: 'Envoyer l\'avis' })}
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleSubmit(true)}
                                                disabled={isSubmitting}
                                                className="w-full h-14 bg-neutral-100 text-neutral-500 rounded-[20px] font-black text-[15px] uppercase tracking-widest active:scale-[0.98] transition-all"
                                            >
                                                {t({ en: 'Skip & Submit Stars', fr: 'Passer et envoyer les étoiles' })}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default RatingPopup;
