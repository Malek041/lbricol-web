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
        if (!deferredPrompt && platform === 'android') {
            // If Android but no prompt yet, just dismiss and hope for next time or show fallback
            dismiss();
            return;
        }

        if (platform === 'ios') {
            // iOS doesn't support automatic install, user must do manual share
            return;
        }

        // Trigger the native install prompt
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

                    <button
                        onClick={dismiss}
                        className="absolute top-4 right-4 p-2 hover:bg-neutral-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-neutral-400" />
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <div className="w-50 h-50 bg-white rounded-2xl shadow-lg border border-neutral-50 p-2 mb-4 flex items-center justify-center overflow-hidden">
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


                        <button
                            onClick={platform === 'android' ? handleInstallClick : dismiss}
                            className="mt-6 w-full py-3 bg-[#FFB700] text-[#037B3E] font-medium rounded-full hover:bg-[#FFD633] transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {platform === 'android' ? (
                                <>
                                    <Download size={20} />
                                    {t({ en: 'Install Now', fr: 'Installer maintenant', ar: 'تثبيت الآن' })}
                                </>
                            ) : (
                                t({ en: 'Got it', fr: 'Compris', ar: 'حسناً' })
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
