"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa6';
import { useLanguage } from '../context/LanguageContext';
import Image from 'next/image';

interface AuthPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AuthPopup = ({ isOpen, onClose, onSuccess }: AuthPopupProps) => {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 968);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

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
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 3000,
                        display: 'flex',
                        alignItems: isMobile ? 'flex-end' : 'center',
                        justifyContent: 'center',
                        padding: isMobile ? 0 : '1rem',
                    }}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!isLoading ? onClose : undefined}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.55)',
                            backdropFilter: 'blur(6px)',
                        }}
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 12 }}
                        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: isMobile ? 'none' : '420px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: isMobile ? '28px 28px 0 0' : '28px',
                            overflow: 'hidden',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
                            zIndex: 3001,
                        }}
                    >
                        {/* Yellow Header Section */}
                        <div
                            style={{
                                background: '#FFC244',
                                padding: isMobile ? '32px 24px 40px' : '36px 32px 44px',
                                textAlign: 'center',
                                position: 'relative',
                            }}
                        >
                            {/* Close button */}
                            {!isLoading && (
                                <button
                                    onClick={onClose}
                                    style={{
                                        position: 'absolute',
                                        top: '16px',
                                        right: '16px',
                                        background: 'rgba(0,0,0,0.08)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '36px',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: '#1D1D1D',
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            )}

                            {/* Logo */}
                            <div style={{ marginBottom: '16px' }}>
                                <Image
                                    src="/Images/Logo/GYLogo.png"
                                    alt="Lbricol"
                                    width={56}
                                    height={56}
                                    style={{ objectFit: 'contain', margin: '0 auto' }}
                                />
                            </div>

                            <h2 style={{
                                fontSize: '26px',
                                fontWeight: 900,
                                color: '#1D1D1D',
                                letterSpacing: '-0.5px',
                                lineHeight: 1.15,
                                margin: 0,
                            }}>
                                {t({ en: 'Welcome to Lbricol', fr: 'Bienvenue sur Lbricol' })}
                            </h2>
                        </div>

                        {/* White Content Section — pulled up over yellow */}
                        <div
                            style={{
                                background: '#FFFFFF',
                                borderRadius: '24px 24px 0 0',
                                marginTop: '-20px',
                                padding: isMobile ? '28px 24px 36px' : '28px 32px 36px',
                            }}
                        >
                            <p style={{
                                fontSize: '15px',
                                color: '#717171',
                                lineHeight: 1.55,
                                textAlign: 'center',
                                marginBottom: '24px',
                            }}>
                                {t({
                                    en: 'Sign in to book services, track orders, and unlock exclusive deals.',
                                    fr: 'Connectez-vous pour réserver des services, suivre vos commandes et accéder à des offres exclusives.',
                                })}
                            </p>

                            {/* Google Sign-In Button */}
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleAuth}
                                disabled={isLoading}
                                style={{
                                    width: '100%',
                                    padding: '16px 20px',
                                    borderRadius: '100px',
                                    border: '1.5px solid #E0E0E0',
                                    backgroundColor: isLoading ? '#F5F5F5' : '#FFFFFF',
                                    color: '#1D1D1D',
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    opacity: isLoading ? 0.7 : 1,
                                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                                    marginBottom: '20px',
                                }}
                            >
                                {isLoading ? (
                                    <div style={{
                                        width: '22px',
                                        height: '22px',
                                        border: '2.5px solid #E0E0E0',
                                        borderTopColor: '#00A082',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                    }} />
                                ) : (
                                    <>
                                        <FaGoogle size={20} color="#EA4335" />
                                        {t({ en: 'Continue with Google', fr: 'Continuer avec Google' })}
                                    </>
                                )}
                            </motion.button>

                            {/* Terms */}
                            <p style={{
                                fontSize: '12px',
                                color: '#B3B3B3',
                                textAlign: 'center',
                                lineHeight: 1.6,
                            }}>
                                {t({
                                    en: "By continuing, you agree to Lbricol's Terms of Service and Privacy Policy.",
                                    fr: "En continuant, vous acceptez les CGU de Lbricol et notre Politique de confidentialité.",
                                })}
                            </p>
                        </div>

                        <style>{`
                            @keyframes spin {
                                to { transform: rotate(360deg); }
                            }
                        `}</style>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AuthPopup;
