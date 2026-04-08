"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, PlusSquare, X, Download, Monitor, Smartphone, Chrome } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function PWAPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
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

    const dismiss = () => {
        setIsVisible(false);
    };

    const handleInstallClick = async () => {
        if (platform === 'ios') {
            // iOS doesn't support automatic install, we trigger share menu as the best shortcut
            try {
                if (navigator.share) {
                    await navigator.share({
                        title: 'Lbricol',
                        text: t({ en: 'Install Lbricol on your phone', fr: 'Installer Lbricol sur votre téléphone', ar: 'تثبيت Lbricol على هاتفك' }),
                        url: window.location.origin
                    });
                } else {
                    // Fallback if sharing is not supported
                    dismiss();
                }
            } catch (err) {
                console.log('Share failed:', err);
            }
            return;
        }

        if (!deferredPrompt && platform === 'android') {
            dismiss();
            return;
        }

        // Trigger the native install prompt for Android/Chrome
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install: ${outcome}`);
        setDeferredPrompt(null);
        dismiss();
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

                    {/* Close Button */}
                    <button 
                        onClick={dismiss}
                        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 active:scale-90 transition-all z-10"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <div className="w-40 h-40 bg-white rounded-2xl p-2 mb-4 flex items-center justify-center overflow-hidden">
                            <img
                                src="/Images/Logo/image-Photoroom (2) copy 5.png"
                                alt="Lbricol Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {platform === 'ios' && (
                            <div className="flex flex-col gap-4 text-left w-full mt-2 mb-6 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                                <p className="text-[14px] font-black text-[#111827]">
                                    {t({ en: 'To install Lbricol:', fr: 'Pour installer Lbricol :', ar: 'لتثبيت Lbricol:' })}
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-500">
                                            <Share size={18} />
                                        </div>
                                        <p className="text-[13px] font-medium text-neutral-600 leading-tight">
                                            1. {t({ en: 'Tap the Share button below', fr: 'Appuyez sur le bouton Partager en bas', ar: 'اضغط على زر المشاركة في الأسفل' })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-black">
                                            <PlusSquare size={18} />
                                        </div>
                                        <p className="text-[13px] font-medium text-neutral-600 leading-tight">
                                            2. {t({ en: 'Select "Add to Home Screen"', fr: 'Sélectionnez "Sur l\'écran d\'accueil"', ar: 'اختر "إضافة إلى الشاشة الرئيسية"' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleInstallClick}
                            className="w-full py-4 bg-[#FFB700] text-[#037B3E] font-black text-[18px] rounded-full hover:bg-[#FFD633] shadow-lg shadow-[#FFB700]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <Download size={22} strokeWidth={2.5} />
                            {t({ en: 'Install Now', fr: 'Installer maintenant', ar: 'تثبيت الآن' })}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
