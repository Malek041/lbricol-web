"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Send, MessageSquare } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';

interface RatingPopupProps {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    bricolerId: string;
    bricolerName: string;
    serviceName: string;
}

const RatingPopup: React.FC<RatingPopupProps> = ({
    isOpen,
    onClose,
    jobId,
    bricolerId,
    bricolerName,
    serviceName
}) => {
    const { t } = useLanguage();
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [review, setReview] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const swoosh = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
            swoosh.volume = 0.4;
            swoosh.play().catch(e => console.warn("Swoosh sound blocked:", e));
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (rating === 0 || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const reviewData = {
                id: jobId,
                rating,
                comment: review,
                serviceName,
                date: new Date().toISOString(),
                clientName: 'Client' // Ideally pull from auth, but using placeholder for now
            };

            // Update Bricoler's reviews and stats
            const bricolerRef = doc(db, 'bricolers', bricolerId);
            await updateDoc(bricolerRef, {
                reviews: arrayUnion(reviewData),
                totalRating: increment(rating),
                jobsCompleted: increment(1)
            });

            // Mark job as rated so it doesn't pop up again
            const jobRef = doc(db, 'jobs', jobId);
            await updateDoc(jobRef, {
                rated: true
            });

            onClose();
        } catch (err) {
            console.error("Error submitting review:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.8, y: 50, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.8, y: 50, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative bg-white w-full max-w-[420px] rounded-[32px] p-8 shadow-2xl overflow-hidden"
                    >
                        {/* Decorative Background Element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFC244]/10 rounded-full -mr-16 -mt-16" />

                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 bg-neutral-50 rounded-full text-neutral-400 hover:text-black transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 bg-[#FFC244] rounded-[24px] flex items-center justify-center shadow-lg shadow-[#FFC244]/20 rotate-3">
                                <Star size={40} className="text-white fill-white" />
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-[24px] font-black text-black leading-tight">
                                    {t({ en: 'Rate your experience', fr: 'Notez votre expérience' })}
                                </h2>
                                <p className="text-[15px] font-medium text-neutral-500">
                                    {t({
                                        en: `How was your task with ${bricolerName}?`,
                                        fr: `Comment s'est passée votre mission avec ${bricolerName} ?`
                                    })}
                                </p>
                            </div>

                            {/* Stars */}
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <motion.button
                                        key={star}
                                        whileHover={{ scale: 1.2 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHover(star)}
                                        onMouseLeave={() => setHover(0)}
                                        className="p-1"
                                    >
                                        <Star
                                            size={36}
                                            className={cn(
                                                "transition-colors",
                                                (hover || rating) >= star ? "text-[#FFC244] fill-[#FFC244]" : "text-neutral-200"
                                            )}
                                        />
                                    </motion.button>
                                ))}
                            </div>

                            {/* Review Box */}
                            <div className="w-full space-y-3">
                                <div className="relative">
                                    <textarea
                                        value={review}
                                        onChange={(e) => setReview(e.target.value)}
                                        placeholder={t({
                                            en: 'Write a quick review (optional)...',
                                            fr: 'Écrivez un court avis (optionnel)...'
                                        })}
                                        className="w-full p-4 pt-4 rounded-2xl bg-neutral-50 border-none focus:ring-2 focus:ring-[#FFC244] text-[15px] font-medium min-h-[100px] resize-none"
                                    />
                                    <MessageSquare size={16} className="absolute top-4 right-4 text-neutral-300" />
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={rating === 0 || isSubmitting}
                                className="w-full py-4 bg-black text-white rounded-[20px] font-bold text-[16px] flex items-center justify-center gap-2 disabled:bg-neutral-200 disabled:text-neutral-400 transition-all active:scale-95 shadow-lg shadow-black/10"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send size={18} />
                                        {t({ en: 'Submit Review', fr: 'Envoyer l\'avis' })}
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default RatingPopup;

const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');
