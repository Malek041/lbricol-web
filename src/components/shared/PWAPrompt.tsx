"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, X, Download, Monitor, Smartphone, Chrome } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function PWAPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
    const { t } = useLanguage();

    useEffect(() => {
        // Only show once per session or use localStorage for more persistence
        const shown = localStorage.getItem('pwa_prompt_dismissed');
        if (shown) return;

        // Detect platform
        const ua = window.navigator.userAgent.toLowerCase();
        const isIos = /iphone|ipad|ipod/.test(ua);
        const isAndroid = /android/.test(ua);
        
        // Don't show if already in standalone mode (already installed)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
            || (window.navigator as any).standalone 
            || document.referrer.includes('android-app://');

        if (isStandalone) return;

        if (isIos) setPlatform('ios');
        else if (isAndroid) setPlatform('android');
        else return; // Don't show on desktop for now unless requested

        // Show after a short delay
        const timer = setTimeout(() => setIsVisible(true), 3000);
        return () => clearTimeout(timer);
    }, []);

    const dismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10000] flex items-end justify-center px-4 pb-8 pointer-events-none">
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="w-full max-w-md bg-white rounded-[32px] shadow-2xl shadow-black/20 border border-neutral-100 p-6 pointer-events-auto relative overflow-hidden"
                >
                    {/* Background Decorative Gradient */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFCC02]/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    
                    <button 
                        onClick={dismiss}
                        className="absolute top-4 right-4 p-2 hover:bg-neutral-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-neutral-400" />
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-lg border border-neutral-50 p-2 mb-4 flex items-center justify-center overflow-hidden">
                            <img 
                                src="/Images/Logo/image-Photoroom (2) copy 5.png" 
                                alt="Lbricol Logo" 
                                className="w-full h-full object-contain"
                            />
                        </div>

                        <h3 className="text-[22px] font-black text-black leading-tight tracking-tight mb-2">
                            {t({ 
                                en: 'Install Lbricol App', 
                                fr: 'Installez l\'app Lbricol', 
                                ar: 'ثبت تطبيق لبريكول' 
                            })}
                        </h3>
                        <p className="text-[15px] text-neutral-500 font-medium px-4 mb-6">
                            {t({
                                en: 'Get the best experience with faster loading and offline access right from your home screen.',
                                fr: 'Profitez d\'une meilleure expérience avec un accès rapide depuis votre écran d\'accueil.',
                                ar: 'احصل على أفضل تجربة مع وصول سريع من شاشتك الرئيسية.'
                            })}
                        </p>

                        {/* Instructions Section */}
                        <div className="w-full bg-[#FAFAFA] rounded-2xl p-4 border border-neutral-100 text-left">
                            <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider mb-3 block">
                                {t({ en: 'Instructions', fr: 'Instructions', ar: 'التعليمات' })}
                            </span>

                            {platform === 'ios' ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white border border-neutral-100 flex items-center justify-center flex-shrink-0">
                                            <Share size={16} className="text-[#007AFF]" />
                                        </div>
                                        <p className="text-[14px] font-medium text-neutral-600">
                                            {t({ 
                                                en: '1. Tap the Share button at the bottom', 
                                                fr: '1. Appuyez sur le bouton "Partager"', 
                                                ar: '1. اضغط على زر المشاركة' 
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white border border-neutral-100 flex items-center justify-center flex-shrink-0">
                                            <PlusSquare size={16} className="text-black" />
                                        </div>
                                        <p className="text-[14px] font-medium text-neutral-600">
                                            {t({ 
                                                en: '2. Select "Add to Home Screen"', 
                                                fr: '2. Sélectionnez "Sur l\'écran d\'accueil"', 
                                                ar: '2. اختر "إضافة إلى الشاشة الرئيسية"' 
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white border border-neutral-100 flex items-center justify-center flex-shrink-0">
                                            <Chrome size={16} className="text-[#4285F4]" />
                                        </div>
                                        <p className="text-[14px] font-medium text-neutral-600">
                                            {t({ 
                                                en: '1. Tap the Menu (3 dots) icon', 
                                                fr: '1. Appuyez sur le menu (3 points)', 
                                                ar: '1. اضغط على زر القائمة' 
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white border border-neutral-100 flex items-center justify-center flex-shrink-0">
                                            <Download size={16} className="text-black" />
                                        </div>
                                        <p className="text-[14px] font-medium text-neutral-600">
                                            {t({ 
                                                en: '2. Select "Install App" or "Add to Home Screen"', 
                                                fr: '2. Sélectionnez "Installer l\'application"', 
                                                ar: '2. اختر "تثبيت التطبيق"' 
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={dismiss}
                            className="mt-6 w-full py-4 bg-[#FFCC02] text-black font-bold rounded-2xl hover:bg-[#FFD633] transition-colors active:scale-[0.98]"
                        >
                            {t({ en: 'Got it', fr: 'Compris', ar: 'حسناً' })}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
