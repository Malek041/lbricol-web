"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface ClientWhatsAppPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (whatsappNumber: string) => void;
}

const ClientWhatsAppPopup = ({ isOpen, onClose, onSuccess }: ClientWhatsAppPopupProps) => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const [whatsappNumber, setWhatsappNumber] = useState("");

    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 968);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const c = {
        bg: theme === 'light' ? '#FFFFFF' : '#000000',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#545454' : '#A0A0A0',
        border: theme === 'light' ? '#EEEEEE' : '#2D2D2D',
        overlay: theme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.8)',
        inputBg: theme === 'light' ? '#F6F6F6' : '#1A1A1A',
    };

    const handleSubmit = () => {
        if (whatsappNumber.length >= 8) {
            onSuccess(whatsappNumber);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 3000,
                    display: 'flex',
                    alignItems: isMobile ? 'flex-end' : 'center',
                    justifyContent: 'center',
                    padding: isMobile ? 0 : '1rem'
                }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
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
                            zIndex: 3001,
                            textAlign: 'left'
                        }}
                    >
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '1.5rem',
                                right: '1.5rem',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: c.text
                            }}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                backgroundColor: '#25D366',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.5rem',
                                color: '#FFFFFF'
                            }}>
                                <MessageSquare size={20} fill="white" />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: c.text, letterSpacing: '-0.5px' }}>
                                {t({ en: "Contact details", fr: "Coordonnées" })}
                            </h2>
                            <p style={{ color: c.textMuted, fontSize: '14px', fontWeight: 400, lineHeight: 1.4, maxWidth: '280px', margin: '0 auto' }}>
                                {t({
                                    en: "Providers need your WhatsApp to coordinate the service.",
                                    fr: "Les prestataires ont besoin de votre WhatsApp pour coordonner le service."
                                })}
                            </p>
                        </div>

                        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{
                                padding: '12px 18px',
                                backgroundColor: c.inputBg,
                                borderRadius: '12px',
                                fontSize: '16px',
                                fontWeight: 800,
                                color: c.text,
                                border: 'none'
                            }}>
                                +212
                            </div>
                            <input
                                type="tel"
                                value={whatsappNumber}
                                onChange={(e) => {
                                    let val = e.target.value.replace(/\D/g, '');
                                    if (val.startsWith('212')) val = val.slice(3);
                                    if (val.startsWith('0')) val = val.slice(1);
                                    setWhatsappNumber(val);
                                }}
                                placeholder="6 00 00 00 00"
                                autoFocus
                                style={{
                                    flex: 1,
                                    padding: '12px 18px',
                                    borderRadius: '12px',
                                    backgroundColor: c.inputBg,
                                    border: 'none',
                                    color: c.text,
                                    fontSize: '16px',
                                    fontWeight: 800,
                                    outline: 'none',
                                    transition: 'background-color 0.2s ease'
                                }}
                            />
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSubmit}
                            disabled={whatsappNumber.length < 8}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                backgroundColor: theme === 'light' ? '#000000' : '#FFFFFF',
                                color: theme === 'light' ? '#FFFFFF' : '#000000',
                                border: 'none',
                                fontSize: '16px',
                                fontWeight: 500,
                                cursor: whatsappNumber.length < 8 ? 'not-allowed' : 'pointer',
                                opacity: whatsappNumber.length < 8 ? 0.5 : 1,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {t({ en: "Continue", fr: "Continuer" })}
                        </motion.button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ClientWhatsAppPopup;
