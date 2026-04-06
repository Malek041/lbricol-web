"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Send, ChevronLeft } from 'lucide-react';
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
            await updateDoc(jobRef, { 
                rated: true,
                rating: rating,
                feedback: isSkip ? "" : review, // backward compatibility
                clientRating: rating,
                clientReviewComment: isSkip ? "" : review,
                reviewedAt: new Date().toISOString()
            });
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
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
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
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative bg-white w-full max-w-[420px] rounded-[32px] overflow-hidden pb-8 shadow-2xl"
                    >


                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full flex items-center justify-center text-[#222222] hover:bg-neutral-100 transition-colors"
                        >
                            <X size={20} strokeWidth={2} />
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
                                        className="px-6 md:px-8 py-6 mt-8"
                                    >
                                        <div className="flex flex-col items-center mb-10 mt-2">
                                            <div className="w-[100px] h-[100px] rounded-full overflow-hidden flex-shrink-0 bg-neutral-100 mb-5 relative shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                                                {bricolerAvatar ? (
                                                    <img src={bricolerAvatar} className="w-full h-full object-cover" alt={bricolerName} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[#222222] font-semibold text-3xl">
                                                        {bricolerName[0]?.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-[28px] font-bold text-[#222222] leading-tight text-center tracking-tight">
                                                {t({ en: `Rate ${bricolerName.split(' ')[0]}`, fr: `Notez ${bricolerName.split(' ')[0]}` })}
                                            </h3>
                                            <p className="text-[15px] text-neutral-500 mt-1 font-medium">
                                                {subServiceName || serviceName} · {[displayDate].filter(Boolean).join(', ')}
                                            </p>
                                        </div>

                                        <div className="text-center space-y-4 mb-6">
                                            <div className="flex justify-center gap-3">
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
                                                                    ? 'text-[#222222] fill-[#222222]'
                                                                    : 'text-neutral-300 fill-transparent stroke-[1.5]'
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
                                        className="px-6 md:px-8 py-6 mt-6"
                                    >
                                        <div className="flex items-start gap-3 mb-8">
                                            <button
                                                onClick={() => setStepWithDirection(1)}
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-[#222222] hover:bg-neutral-100 transition-colors mt-0.5"
                                            >
                                                <motion.div animate={{ rotate: 0 }}>
                                                    <ChevronLeft size={24} strokeWidth={2.5} />
                                                </motion.div>
                                            </button>
                                            <div className="flex-1">
                                                <h2 className="text-[26px] font-bold text-[#222222] leading-tight tracking-tight">
                                                    {t({ en: `How was the service?`, fr: `Comment était le service ?` })}
                                                </h2>
                                                <p className="text-[15px] text-neutral-500 mt-2 font-medium pr-4">
                                                    {t({ en: `Share more about your experience with ${bricolerName.split(' ')[0]}.`, fr: `Partagez plus sur votre expérience avec ${bricolerName.split(' ')[0]}.` })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="relative mb-8">
                                            <textarea
                                                autoFocus
                                                value={review}
                                                onChange={(e) => setReview(e.target.value)}
                                                placeholder={t({ en: 'Did they arrive on time? Was the space left clean?', fr: 'Sont-ils arrivés à l\'heure ? L\'espace était-il propre ?' })}
                                                className="w-full bg-white rounded-[12px] p-4 text-[16px] border border-neutral-400 focus:border-[#222222] focus:ring-[1px] focus:ring-[#222222] transition-colors outline-none resize-none min-h-[140px] shadow-sm"
                                            />
                                        </div>

                                        <div className="flex flex-row items-center justify-between gap-4 mt-2">
                                            <button
                                                onClick={() => handleSubmit(true)}
                                                disabled={isSubmitting}
                                                className="text-[15px] font-semibold text-[#222222] underline decoration-[#222222]/30 decoration-1 underline-offset-4 hover:decoration-[#222222] transition-colors ml-2"
                                            >
                                                {t({ en: 'Skip', fr: 'Passer' })}
                                            </button>
                                            <button
                                                onClick={() => handleSubmit(false)}
                                                disabled={isSubmitting || review.length === 0}
                                                className="h-12 px-8 bg-[#222222] text-white rounded-[8px] font-semibold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-30"
                                            >
                                                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t({ en: 'Submit', fr: 'Envoyer' })}
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
