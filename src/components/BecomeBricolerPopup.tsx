"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface BecomeBricolerPopupProps {
    onStartOnboarding: () => void;
    isBricoler?: boolean;
}

const BecomeBricolerPopup: React.FC<BecomeBricolerPopupProps> = ({ onStartOnboarding, isBricoler = false }) => {
    const { t } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Don't show if user is already a Bricoler
        if (isBricoler) {
            setIsVisible(false);
            return;
        }

        // Check if dismissed permanently
        const isDismissed = localStorage.getItem('lbricol_become_pro_dismissed_perm');

        if (!isDismissed) {
            // Show after 5 seconds — giving time for language/city selection to complete
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isBricoler]);

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsVisible(false);
        localStorage.setItem('lbricol_become_pro_dismissed_perm', 'true');
    };

    const handleAction = () => {
        setIsVisible(false);
        onStartOnboarding();
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-x-0 bottom-24 z-[100] px-4 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: 80, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 80, scale: 0.92 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 180 }}
                        onClick={handleAction}
                        className="pointer-events-auto bg-[#027C3E] rounded-[10px] p-5  flex items-center gap-4 cursor-pointer relative overflow-hidden active:scale-[0.98] transition-transform"
                    >
                        {/* Illustration */}
                        <div className="w-[202px] h-[202px] flex-shrink-0 rounded-2xl overflow-hidden">
                            <img
                                src="/Images/Vectors Illu/moving helper.png"
                                alt="Become a Bricoler"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* Text */}
                        <div className="flex-1 pr-6">

                            <h3 className="text-[25px] font-bold text-white leading-tight">
                                {t({ en: 'Earn money with Lbricol!', fr: 'Gagnez de l\'argent avec Lbricol !', ar: 'اربح المال مع Lbricol!' })}
                            </h3>
                            <p className="text-[13px] font-medium text-white mt-0.5 leading-snug">
                                {t({ en: 'Become a Bricoler and start receiving jobs.', fr: 'Devenez Bricoler et recevez des missions.', ar: 'كن حرفياً وابدأ في استقبال المهام.' })}
                            </p>
                            <button
                                onClick={handleDismiss}
                                className="mt-4 px-4 py-2 border border-white/30 rounded-full text-[11px] font-black text-white hover:bg-white/10 transition-colors uppercase tracking-widest"
                            >
                                {t({ en: 'Hide', fr: 'Masquer', ar: 'إخفاء' })}
                            </button>
                        </div>

                        {/* Dismiss button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-white hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>

                        {/* Decorative glow */}
                        <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-[#FFC244]/15 rounded-full blur-2xl pointer-events-none" />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BecomeBricolerPopup;
