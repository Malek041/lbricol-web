"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { useLanguage } from '../context/LanguageContext';
import Image from 'next/image';
import { fluidMobilePx, useIsMobileViewport, useMobileTier, useViewportWidth } from '@/lib/mobileOnly';

interface AuthPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AuthPopup = ({ isOpen, onClose, onSuccess }: AuthPopupProps) => {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = React.useState(false);
    const isMobile = useIsMobileViewport(968);
    const mobileTier = useMobileTier();
    const viewportWidth = useViewportWidth();
    const isCompactPhone = isMobile && mobileTier === 'compact';

    const headerPadding = `${Math.round(fluidMobilePx(viewportWidth, 16, 20))}px`;
    const contentPaddingX = `${Math.round(fluidMobilePx(viewportWidth, 20, 32))}px`;
    const contentPaddingTop = `${Math.round(fluidMobilePx(viewportWidth, 24, 40))}px`;
    const titleSize = `${Math.round(fluidMobilePx(viewportWidth, 26, 32))}px`;
    const subtitleSize = `${Math.round(fluidMobilePx(viewportWidth, 15, 17))}px`;
    const primaryButtonFont = `${Math.round(fluidMobilePx(viewportWidth, 16, 18))}px`;
    const primaryButtonPaddingY = `${Math.round(fluidMobilePx(viewportWidth, 14, 18))}px`;
    const footerPadding = `${Math.round(fluidMobilePx(viewportWidth, 20, 32))}px`;

    const handleAuth = async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            await onSuccess();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 4000,
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Header */}
                    <div style={{ padding: headerPadding, display: 'flex', alignItems: 'center' }}>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                marginLeft: '-8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <ArrowLeft size={isCompactPhone ? 24 : 28} color="#1D1D1D" />
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, padding: `0 ${contentPaddingX}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: contentPaddingTop }}>
                        {/* Logo */}
                        <div style={{ marginBottom: isCompactPhone ? '24px' : '32px' }}>
                            <Image
                                src="/Images/Logo/GYLogo.png"
                                alt="Lbricol"
                                width={Math.round(fluidMobilePx(viewportWidth, 56, 72))}
                                height={Math.round(fluidMobilePx(viewportWidth, 56, 72))}
                                style={{ objectFit: 'contain' }}
                            />
                        </div>

                        <h2 style={{
                            fontSize: titleSize,
                            fontWeight: 500,
                            color: '#1D1D1D',
                            letterSpacing: '-1px',
                            lineHeight: 1.1,
                            textAlign: 'center',
                            marginBottom: '10px',
                        }}>
                            {t({ en: 'Welcome to Lbricol', fr: 'Bienvenue', ar: 'مرحباً بك في Lbricol' })}
                        </h2>

                        <p style={{
                            fontSize: subtitleSize,
                            color: '#6B6B6B',
                            fontWeight: 400,
                            lineHeight: 1.5,
                            textAlign: 'center',
                            marginBottom: isCompactPhone ? '24px' : '30px',
                            maxWidth: '300px'
                        }}>
                            {t({
                                en: 'Sign in to book.',
                                fr: 'Connectez-vous pour réserver.',
                                ar: 'سجل الدخول للحجز.'
                            })}
                        </p>

                        {/* Google Button */}
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={handleAuth}
                            disabled={isLoading}
                            style={{
                                width: isMobile ? '100%' : '70%',
                                maxWidth: '360px',
                                padding: `${primaryButtonPaddingY} 24px`,
                                borderRadius: '100px',
                                border: '2px solid #F0F0F0',
                                backgroundColor: '#FFFFFF',
                                color: '#1D1D1D',
                                fontSize: primaryButtonFont,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '14px',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                marginBottom: '24px'
                            }}
                        >
                            {isLoading ? (
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    border: '3px solid #F0F0F0',
                                    borderTopColor: '#00A082',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                }} />
                            ) : (
                                <>
                                    <FcGoogle size={24} />
                                    {t({ en: 'Google', fr: 'Google', ar: 'جوجل' })}
                                </>
                            )}
                        </motion.button>
                    </div>

                    {/* Footer Policy */}
                    <div style={{ padding: footerPadding, textAlign: 'center' }}>
                        <p style={{
                            fontSize: isCompactPhone ? '12px' : '13px',
                            color: '#B3B3B3',
                            lineHeight: 1.6,
                        }}>
                            {t({
                                en: "By continuing, you agree to Lbricol's Terms and Privacy Policy.",
                                fr: "En continuant, vous acceptez les CGU de Lbricol et notre Politique de confidentialité.",
                                ar: "من خلال المتابعة، فإنك توافق على شروط خدمة Lbricol وسياسة الخصوصية الخاصة بنا."
                            })}
                        </p>
                    </div>

                    <style>{`
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AuthPopup;
