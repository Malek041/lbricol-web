"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa6';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface AuthPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AuthPopup = ({ isOpen, onClose, onSuccess }: AuthPopupProps) => {
    const { t } = useLanguage();
    const { theme } = useTheme();
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

    const c = {
        bg: theme === 'light' ? '#FFFFFF' : '#000000',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#545454' : '#A0A0A0',
        border: theme === 'light' ? '#EEEEEE' : '#2D2D2D',
        overlay: theme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.8)',
        buttonBg: theme === 'light' ? '#EEEEEE' : '#1A1A1A',
        buttonHover: theme === 'light' ? '#E2E2E2' : '#2D2D2D',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: isMobile ? 'flex-end' : 'center',
                    justifyContent: 'center',
                    padding: isMobile ? 0 : '1rem'
                }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!isLoading ? onClose : undefined}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundColor: c.overlay,
                            backdropFilter: 'blur(4px)'
                        }}
                    />

                    <motion.div
                        initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
                        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: isMobile ? 'none' : '400px',
                            backgroundColor: c.bg,
                            borderRadius: isMobile ? '24px 24px 0 0' : '12px',
                            padding: isMobile ? '2rem 1.5rem 3rem' : '2.5rem',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            zIndex: 2001,
                            textAlign: 'left'
                        }}
                    >
                        {!isLoading && (
                            <button
                                onClick={onClose}
                                style={{
                                    position: 'absolute',
                                    top: '1.5rem',
                                    right: '1.5rem',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: c.text,
                                    zIndex: 10
                                }}
                            >
                                <X size={20} />
                            </button>
                        )}

                        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px', color: c.text, letterSpacing: '-1px', lineHeight: 1.1 }}>
                                {t({ en: "Continue with Google", fr: "Continuer avec Google" })}
                            </h2>
                            <p style={{ color: c.textMuted, fontSize: '14px', fontWeight: 400, lineHeight: 1.4, maxWidth: '280px', margin: '0 auto' }}>
                                {t({
                                    en: "Sign in to access your account and save your progress.",
                                    fr: "Connectez-vous pour accéder à votre compte et enregistrer votre progression."
                                })}
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={handleAuth}
                                disabled={isLoading}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: c.buttonBg,
                                    color: c.text,
                                    fontSize: '16px',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s ease',
                                    opacity: isLoading ? 0.7 : 1
                                }}
                            >
                                {isLoading ? (
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        border: `2px solid ${c.textMuted}`,
                                        borderTopColor: c.text,
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite'
                                    }} />
                                ) : (
                                    <>
                                        <FaGoogle size={18} />
                                        {t({ en: "Continue with Google", fr: "Continuer avec Google" })}
                                    </>
                                )}
                            </motion.button>

                            <p style={{ fontSize: '13px', color: c.textMuted, marginTop: '1rem', lineHeight: 1.5 }}>
                                {t({
                                    en: "By continuing, you agree to Lbricol's Terms of Service and acknowledge you've read our Privacy Policy.",
                                    fr: "En continuant, vous acceptez les Conditions d'utilisation de Lbricol et reconnaissez avoir lu notre Politique de confidentialité."
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
