import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface ClientOnboardingProps {
    onComplete: () => void;
}

const BRAND_YELLOW = "#FFC244";
const BRAND_GREEN = "#01A083";

const HERO_IMAGES = [
    "/Images/Desktop hero section images/Driver.gif",
    "/Images/Desktop hero section images/Errands.webp",
    "/Images/Desktop hero section images/Gardening.webp",
    "/Images/Desktop hero section images/baybsetting.webp",
    "/Images/Desktop hero section images/petsCare.webp",
    "/Images/Desktop hero section images/andMore.webp",
];

const STEPS = [
    {
        title: {
            en: "Welcome to Lbricol",
            fr: "Bienvenue sur Lbricol",
            ar: "مرحبا بكم في لبريكول"
        },
        subtitle: {
            en: "Your trusted partner for all home services in Morocco.",
            fr: "Votre partenaire de confiance pour tous les services à domicile au Maroc.",
            ar: "شريكك الموثوق لجميع خدمات المنزل في المغرب."
        },
    },
    {
        title: {
            en: "Service with a Smile",
            fr: "Service avec le Sourire",
            ar: "خدمة مع ابتسامة"
        },
        subtitle: {
            en: "Handpicked professionals ready to handle your tasks today.",
            fr: "Des professionnels sélectionnés pour s'occuper de vos tâches aujourd'hui.",
            ar: "محترفون مختارون بعناية جاهزون للقيام بمهامك اليوم."
        },
    },
    {
        title: {
            en: "Ready to Explore?",
            fr: "Prêt à explorer ?",
            ar: "مستعد للاستكشاف؟"
        },
        subtitle: {
            en: "Let's find the perfect helper for your needs!",
            fr: "Trouvons l'aide parfaite pour vos besoins !",
            ar: "لنبحث عن المساعد المثالي لاحتياجاتك!"
        },
    }
];

const AutoScrollingBanner = () => {
    return (
        <div className="w-full overflow-hidden py-10 relative">
            <motion.div
                className="flex gap-4"
                animate={{
                    x: [0, -1200],
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "linear",
                }}
                style={{ width: "fit-content" }}
            >
                {[...HERO_IMAGES, ...HERO_IMAGES].map((img, i) => (
                    <div
                        key={i}
                        className="w-[280px] h-[240px] flex-shrink-0 rounded-[24px] overflow-hidden"
                    >
                        <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    </div>
                ))}
            </motion.div>
        </div>
    );
};

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
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-white safe-bottom"
        >
            <div className="w-full h-full max-w-[500px] flex flex-col items-center justify-between py-12 relative overflow-hidden bg-[#FFFFFF]">                {/* Header Section: Wavering Text */}


                {/* Autoscrolling Hero Section */}
                <div className="w-full z-10">
                    <AutoScrollingBanner />
                </div>

                {/* Content Area */}
                <div className="w-full text-center space-y-4 z-10 px-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{
                                type: "spring",
                                damping: 25,
                                stiffness: 200,
                                opacity: { duration: 0.2 }
                            }}
                            className="min-h-[140px] flex flex-col justify-center"
                        >
                            <h2 className="text-[34px] font-black text-neutral-900 leading-[1.1] mb-2 tracking-tighter">
                                {t(STEPS[currentStep].title as any)}
                            </h2>
                            <p className="text-[17px] font-light text-neutral-500 leading-relaxed max-w-[320px] mx-auto">
                                {t(STEPS[currentStep].subtitle as any)}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    {/* Simple Pagination Dots */}
                    <div className="flex justify-center gap-1.5 pb-2">
                        {STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                className="h-1.5 rounded-full transition-all duration-300"
                                style={{
                                    width: idx === currentStep ? '20px' : '6px',
                                    backgroundColor: idx === currentStep ? BRAND_GREEN : '#EAEAEA'
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Action Button */}
                <div className="w-full z-10 mt-auto pb-6 px-6">
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleNext}
                        className="w-full py-5 rounded-full text-[18px] font-black text-white flex items-center justify-center gap-2 transition-all active:brightness-95"
                        style={{ backgroundColor: BRAND_GREEN }}
                    >
                        {currentStep === STEPS.length - 1 ? t({ en: "Get Started", fr: "Commencer" }) : t({ en: "Next", fr: "Suivant" })}
                        <ArrowRight size={22} strokeWidth={3} />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};
