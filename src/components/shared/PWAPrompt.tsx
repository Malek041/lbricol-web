"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, X, Download, Monitor, Smartphone, Chrome } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function PWAPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstructions, setShowInstructions] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
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
        else return;

        // Check if user previously dismissed it
        const dismissed = localStorage.getItem('pwa_prompt_dismissed');
        if (dismissed) return;

        // Listen for browser install prompt (Android/Chrome)
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Show after a short delay
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const dismiss = (force = false) => {
        setIsVisible(false);
        if (force) {
            localStorage.setItem('pwa_prompt_dismissed', 'true');
        }
    };

    const handleInstallClick = async () => {
        if (platform === 'ios') {
            setShowInstructions(true);
            return;
        }

        if (!deferredPrompt) {
            dismiss();
            return;
        }

        // Trigger the native install prompt
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install: ${outcome}`);
        setDeferredPrompt(null);
        dismiss(true);
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10000] flex items-end justify-center px-4 pb-8 pointer-events-none">
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl shadow-black/30 border border-neutral-100 p-6 pointer-events-auto relative overflow-hidden"
                >
                    {/* Close Button */}
                    <button 
                        onClick={() => dismiss(true)}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 active:scale-90 transition-all z-10"
                    >
                        <X size={18} />
                    </button>

                    {/* Background Decorative Gradient */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFCC02]/20 rounded-full blur-3xl -mr-16 -mt-16" />

                    <div className="flex flex-col items-center text-center">
                        <AnimatePresence mode="wait">
                            {!showInstructions ? (
                                <motion.div 
                                    key="logo"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="w-40 h-40 bg-white rounded-3xl p-2 mb-4 flex items-center justify-center drop-shadow-sm">
                                        <img
                                            src="/Images/Logo/image-Photoroom (2) copy 5.png"
                                            alt="Lbricol Logo"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <h3 className="text-[20px] font-[900] text-[#111827] mb-2">
                                        {t({ en: 'Ibricol on your phone', fr: 'Ibricol sur votre téléphone', ar: 'Ibricol على هاتفك' })}
                                    </h3>
                                    <p className="text-[14px] font-medium text-neutral-500 leading-relaxed px-4">
                                        {t({ 
                                            en: 'Install our app for a faster and smoother experience.', 
                                            fr: 'Installez notre application pour une expérience plus rapide et fluide.',
                                            ar: 'قم بتثبيت تطبيقنا للحصول على تجربة أسرع وأكثر سلاسة.'
                                        })}
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="instructions"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="w-full text-left pt-2 pb-4"
                                >
                                    <h3 className="text-[18px] font-black text-[#111827] mb-6 text-center">
                                        {t({ en: 'How to install', fr: 'Comment installer', ar: 'كيفية التثبيت' })}
                                    </h3>
                                    
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4 bg-neutral-50 p-4 rounded-2xl">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-[#01A083]">
                                                <Share size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[14px] font-bold text-[#111827]">
                                                    1. {t({ en: 'Tap the Share button', fr: 'Appuyez sur Partager', ar: 'اضغط على زر المشاركة' })}
                                                </p>
                                                <p className="text-[12px] font-medium text-neutral-500">{t({ en: 'Found in the bottom browser bar', fr: 'Situé dans la barre du bas', ar: 'موجود في الشريط السفلي' })}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 bg-neutral-50 p-4 rounded-2xl">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-[#01A083]">
                                                <PlusSquare size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[14px] font-bold text-[#111827]">
                                                    2. {t({ en: 'Add to Home Screen', fr: 'Sur l\'écran d\'accueil', ar: 'إضافة إلى الشاشة الرئيسية' })}
                                                </p>
                                                <p className="text-[12px] font-medium text-neutral-500">{t({ en: 'Scroll down to find this option', fr: 'Faites défiler pour trouver cette option', ar: 'قم بالتمرير لأسفل للعثور على هذا الخيار' })}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>


                        <button
                            onClick={showInstructions ? () => dismiss(true) : handleInstallClick}
                            className="mt-6 w-full py-4 bg-[#FFCC00] text-[#166534] font-[900] rounded-2xl hover:bg-[#FFD633] transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-[#FFCC00]/20 text-[18px]"
                        >
                            {showInstructions ? (
                                t({ en: 'Understood', fr: 'Compris', ar: 'حسناً' })
                            ) : (
                                <>
                                    <Download size={20} className="stroke-[3]" />
                                    {t({ en: 'Install Now', fr: 'Installer maintenant', ar: 'تثبيت الآن' })}
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
