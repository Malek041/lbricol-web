"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface ClientOnboardingProps {
    onComplete: () => void;
}

const STEPS = [
    {
        title: {
            en: "Welcome to Lbricol.ma",
            fr: "Bienvenue sur Lbricol.ma",
            ar: "مرحبا بكم في Lbricol.ma"
        },
        subtitle: {
            en: "Your new Home services partner",
            fr: "Votre nouveau partenaire de services à domicile",
            ar: "شريكك الجديد في خدمات المنزل"
        },
        color: "#00A082"
    },
    {
        title: {
            en: "Simplified Search",
            fr: "Recherche Simplifiée",
            ar: "بحث مبسط"
        },
        subtitle: {
            en: "Finding the right pro for your home needs has never been easier",
            fr: "Trouver le bon pro pour vos besoins n'a jamais été aussi simple",
            ar: "العثور على المحترف المنان لمهمتك صار أسهل من أي وقت مضى"
        },
        color: "#FFC244"
    },
    {
        title: {
            en: "Save Time",
            fr: "Gagnez du Temps",
            ar: "وفر وقتك"
        },
        subtitle: {
            en: "Enjoy your free time while we handle your tasks",
            fr: "Profitez de votre temps libre pendant que nous gérons vos tâches",
            ar: "استمتع بوقت فراغك بينما نتولى نحن مهامك"
        },
        color: "#9F7AEA"
    },
    {
        title: {
            en: "Ready?",
            fr: "Prêt ?",
            ar: "مستعد ؟"
        },
        subtitle: {
            en: "Let's Get Started!",
            fr: "C'est parti !",
            ar: "لنبدأ !"
        },
        color: "#00A082"
    }
];

export const ClientOnboarding = ({ onComplete }: ClientOnboardingProps) => {
    const [currentStep, setCurrentStep] = useState(0);
    const { t } = useLanguage();

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onComplete();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-white"
        >
            <div className="w-full h-full max-w-[500px] flex flex-col items-center justify-center p-8 relative overflow-hidden">

                {/* Decorative Animated Circles */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute top-[-10%] right-[-10%] w-64 h-64 rounded-full blur-3xl opacity-20"
                    style={{ backgroundColor: STEPS[currentStep].color }}
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        rotate: [0, -90, 0],
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute bottom-[-10%] left-[-10%] w-80 h-80 rounded-full blur-3xl opacity-10"
                    style={{ backgroundColor: STEPS[currentStep].color }}
                />

                <button
                    onClick={onComplete}
                    className="absolute top-12 right-6 p-2 text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 z-10 w-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 1.1, y: -20 }}
                            transition={{
                                type: "spring",
                                stiffness: 260,
                                damping: 20
                            }}
                            className="space-y-4 px-4"
                        >
                            <div
                                className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg"
                                style={{ backgroundColor: `${STEPS[currentStep].color}20`, color: STEPS[currentStep].color }}
                            >
                                <Sparkles size={32} />
                            </div>

                            <motion.h2
                                className="text-[32px] font-black text-neutral-900 leading-tight tracking-tighter"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                {t(STEPS[currentStep].title as any)}
                            </motion.h2>

                            <motion.p
                                className="text-[18px] font-medium text-neutral-500 leading-relaxed max-w-[300px] mx-auto"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                {t(STEPS[currentStep].subtitle as any)}
                            </motion.p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer with progress and button */}
                <div className="w-full space-y-8 z-10">
                    {/* Progress Dots */}
                    <div className="flex justify-center gap-2">
                        {STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                className="h-1.5 transition-all duration-300 rounded-full"
                                style={{
                                    width: idx === currentStep ? '24px' : '6px',
                                    backgroundColor: idx === currentStep ? STEPS[currentStep].color : '#E5E5E5'
                                }}
                            />
                        ))}
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleNext}
                        className="w-full py-5 rounded-[24px] text-[18px] font-black text-white shadow-xl shadow-black/5 flex items-center justify-center gap-2 group overflow-hidden relative"
                        style={{ backgroundColor: STEPS[currentStep].color }}
                    >
                        <motion.span
                            key={currentStep === STEPS.length - 1 ? 'start' : 'next'}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="flex items-center gap-2"
                        >
                            {currentStep === STEPS.length - 1 ? t({ en: "Let's Start", fr: "C'est parti !" }) : t({ en: "Next", fr: "Suivant" })}
                            {currentStep < STEPS.length - 1 && (
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            )}
                        </motion.span>
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};
