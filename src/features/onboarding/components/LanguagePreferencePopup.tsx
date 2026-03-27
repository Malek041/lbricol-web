"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import WaveTop from '@/components/shared/WaveTop';
import { cn } from '@/lib/utils';

interface LanguagePreferencePopupProps {
    isOpen: boolean;
    onSelectLanguage: (language: 'en' | 'fr' | 'ar') => void;
    onClose?: () => void;
}

const LanguagePreferencePopup = ({ isOpen, onSelectLanguage, onClose }: LanguagePreferencePopupProps) => {
    const { language, t } = useLanguage();
    const isMobile = useIsMobileViewport(768);
    const [activeTab, setActiveTab] = useState<'language' | 'currency'>('language');

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // Only the two languages the app actually supports
    const supportedLanguages = [
        {
            code: 'en',
            name: 'English',
            region: { en: 'United Kingdom', fr: 'Royaume-Uni', ar: 'المملكة المتحدة' },
            flag: '🇬🇧'
        },
        {
            code: 'fr',
            name: 'Français',
            region: { en: 'France', fr: 'France', ar: 'فرنسا' },
            flag: '🇫🇷'
        },
        {
            code: 'ar',
            name: 'العربية',
            region: { en: 'Morocco', fr: 'Maroc', ar: 'المغرب' },
            flag: '🇲🇦'
        },
    ];

    const LanguageItem = ({ lang }: { lang: typeof supportedLanguages[0] }) => {
        const isSelected = language === lang.code;

        return (
            <button
                onClick={() => onSelectLanguage(lang.code as 'en' | 'fr' | 'ar')}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${isSelected
                        ? 'bg-[#21917815] border-[#219178]'
                        : 'bg-white border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50'
                    }`}
            >
                <span className="text-3xl leading-none">{lang.flag}</span>
                <div className="flex-1">
                    <p className={`text-[16px] font-black ${isSelected ? 'text-[#219178]' : 'text-[#1D1D1D]'}`}>{lang.name}</p>
                    <p className="text-[13px] text-neutral-400 font-medium mt-0.5">{t({ en: lang.region.en, fr: lang.region.fr, ar: lang.region.ar })}</p>
                </div>
                {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#219178] flex items-center justify-center flex-shrink-0">
                        <Check size={14} className="text-white" strokeWidth={3} />
                    </div>
                )}
            </button>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 60 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        onClick={e => e.stopPropagation()}
                        className={cn(
                            "bg-white w-full shadow-2xl flex flex-col relative",
                            isMobile ? "rounded-none max-h-[85vh] min-h-0" : "max-w-sm rounded-[28px] overflow-hidden"
                        )}
                    >
                        {isMobile && <WaveTop />}

                        {/* Drag Handle (mobile) */}
                        {isMobile && <div className="mx-auto mt-3 w-10 h-1 bg-neutral-200 rounded-full flex-shrink-0" />}

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-5 pb-2 flex-shrink-0">
                            <h2 className="text-[20px] font-black text-black">
                                {activeTab === 'language'
                                    ? t({ en: 'Language', fr: 'Langue', ar: 'اللغة' })
                                    : t({ en: 'Currency', fr: 'Devise', ar: 'العملة' })}
                            </h2>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 rounded-full flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 transition-colors"
                            >
                                <X size={18} className="text-black" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-6 gap-6 border-b border-neutral-100 flex-shrink-0">
                            {(['language', 'currency'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`py-3 text-[15px] font-black capitalize border-b-2 transition-all ${activeTab === tab
                                            ? 'border-[#219178] text-[#219178]'
                                            : 'border-transparent text-neutral-400'
                                        }`}
                                >
                                    {tab === 'language'
                                        ? t({ en: 'Language', fr: 'Langue', ar: 'اللغة' })
                                        : t({ en: 'Currency', fr: 'Devise', ar: 'العملة' })}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">
                            {activeTab === 'language' ? (
                                <>
                                    <p className="text-[13px] font-medium text-neutral-400 mb-4">
                                        {t({
                                            en: 'Choose the language for the Lbricol app interface.',
                                            fr: 'Choisissez la langue de l’interface de l’application Lbricol.',
                                            ar: 'اختر لغة واجهة تطبيق لبريكول.'
                                        })}
                                    </p>
                                    {supportedLanguages.map(lang => (
                                        <LanguageItem key={lang.code} lang={lang} />
                                    ))}
                                    <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                        <p className="text-[13px] font-medium text-amber-700">
                                            {t({
                                                en: '🌍 More languages coming soon — Arabic (Darija), Spanish, and others.',
                                                fr: '🌍 D’autres langues arrivent bientôt — arabe (darija), espagnol et plus encore.',
                                                ar: '🌍 لغات إضافية قريبًا — الإسبانية ولغات أخرى.'
                                            })}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-[13px] font-medium text-neutral-400 mb-4">
                                        {t({
                                            en: 'All prices are shown in the local currency.',
                                            fr: 'Tous les prix sont affichés dans la devise locale.',
                                            ar: 'جميع الأسعار تظهر بالعملة المحلية.'
                                        })}
                                    </p>
                                    <div className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 bg-[#21917815] border-[#219178]">
                                        <span className="text-3xl leading-none">🇲🇦</span>
                                        <div className="flex-1">
                                            <p className="text-[16px] font-black text-[#219178]">{t({ en: 'Moroccan Dirham', fr: 'Dirham marocain', ar: 'الدرهم المغربي' })}</p>
                                            <p className="text-[13px] text-neutral-400 font-medium mt-0.5">{t({ en: 'MAD · Morocco', fr: 'MAD · Maroc', ar: 'MAD · المغرب' })}</p>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-[#219178] flex items-center justify-center flex-shrink-0">
                                            <Check size={14} className="text-white" strokeWidth={3} />
                                        </div>
                                    </div>
                                    <div className="mt-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                        <p className="text-[13px] font-medium text-neutral-400">
                                            {t({
                                                en: '💱 More currencies coming soon — EUR, USD, and others.',
                                                fr: '💱 D’autres devises arrivent bientôt — EUR, USD et plus encore.',
                                                ar: '💱 عملات إضافية قريبًا — EUR و USD وغيرها.'
                                            })}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LanguagePreferencePopup;
