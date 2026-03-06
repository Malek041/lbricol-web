"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { fluidMobilePx, useIsMobileViewport, useMobileTier, useViewportWidth } from '@/lib/mobileOnly';

interface ClientWhatsAppPopupProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (whatsappNumber: string, referralCode?: string) => void;
}

const ClientWhatsAppPopup = ({ isOpen, onClose, onSuccess }: ClientWhatsAppPopupProps) => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [referralCode, setReferralCode] = useState("");

    const isMobile = useIsMobileViewport(968);
    const mobileTier = useMobileTier();
    const viewportWidth = useViewportWidth();
    const isCompactPhone = isMobile && mobileTier === 'compact';

    const headerPadding = `${Math.round(fluidMobilePx(viewportWidth, 16, 20))}px`;
    const contentPaddingX = `${Math.round(fluidMobilePx(viewportWidth, 16, 32))}px`;
    const contentPaddingTop = `${Math.round(fluidMobilePx(viewportWidth, 24, 40))}px`;
    const titleSize = `${Math.round(fluidMobilePx(viewportWidth, 26, 32))}px`;
    const inputFontSize = `${Math.round(fluidMobilePx(viewportWidth, 16, 18))}px`;
    const footerPadding = `${Math.round(fluidMobilePx(viewportWidth, 20, 32))}px`;

    const c = {
        bg: theme === 'light' ? '#FFFFFF' : '#000000',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#545454' : '#A0A0A0',
        border: theme === 'light' ? '#EEEEEE' : '#2D2D2D',
        overlay: theme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.8)',
        inputBg: theme === 'light' ? '#F6F6F6' : '#1A1A1A',
    };

    const handleSubmit = () => {
        if (whatsappNumber.length === 9) {
            onSuccess(whatsappNumber, referralCode);
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

                    {/* Main Content */}
                    <div style={{ flex: 1, padding: `0 ${contentPaddingX}`, display: 'flex', flexDirection: 'column', paddingTop: contentPaddingTop }}>
                        <h2 style={{
                            fontSize: titleSize,
                            fontWeight: 900,
                            color: '#1D1D1D',
                            letterSpacing: '-1px',
                            lineHeight: 1.1,
                            marginBottom: isCompactPhone ? '30px' : '48px',
                        }}>
                            {t({ en: 'What\’s your number?', fr: 'Quel est ton numéro ?' })}
                        </h2>

                        {/* Phone Input Design matching Pic 2 */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: '#FDFCF6',
                            borderRadius: '12px',
                            padding: `${Math.round(fluidMobilePx(viewportWidth, 14, 16))}px ${Math.round(fluidMobilePx(viewportWidth, 14, 20))}px`,
                            border: '1px solid #F5F0E0',
                            gap: isCompactPhone ? '8px' : '12px',
                            marginBottom: isCompactPhone ? '16px' : '20px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid #E0DBCF', paddingRight: isCompactPhone ? '10px' : '12px', flexShrink: 0 }}>
                                <img src="https://flagcdn.com/w20/ma.png" width="20" alt="MA" style={{ borderRadius: '2px' }} />
                                <span style={{ fontSize: inputFontSize, fontWeight: 600, color: '#1D1D1D', whiteSpace: 'nowrap' }}>+212</span>
                                <div style={{ width: '0', height: '0', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1D1D1D', marginLeft: '2px', flexShrink: 0 }} />
                            </div>
                            <input
                                type="tel"
                                value={whatsappNumber}
                                onChange={(e) => {
                                    let val = e.target.value.replace(/\D/g, '');
                                    if (val.startsWith('212')) val = val.slice(3);
                                    if (val.startsWith('0')) val = val.slice(1);
                                    if (val.length > 0 && !val.startsWith('6') && !val.startsWith('7')) {
                                        val = val.slice(1);
                                    }
                                    val = val.slice(0, 9);
                                    setWhatsappNumber(val);
                                }}
                                placeholder={t({ en: 'Phone number', fr: 'Numéro de téléphone' })}
                                autoFocus
                                style={{
                                    flex: 1,
                                    background: 'none',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: inputFontSize,
                                    fontWeight: 600,
                                    color: '#1D1D1D',
                                }}
                            />
                        </div>

                        {/* Policy Text */}
                        <div style={{ padding: '0 8px' }}>
                            <p style={{
                                fontSize: isCompactPhone ? '13px' : '14px',
                                color: '#6B6B6B',
                                lineHeight: 1.6,
                                textAlign: 'center'
                            }}>
                                {t({
                                    en: "By providing your phone number, you accept our ",
                                    fr: "En renseignant votre numéro de téléphone, vous acceptez nos "
                                })}
                                <span style={{ color: '#00A082', textDecoration: 'underline' }}>{t({ en: 'Terms of Use', fr: 'Conditions d\'utilisation' })}</span>
                                {t({ en: ' and our ', fr: ' et notre ' })}
                                <span style={{ color: '#00A082', textDecoration: 'underline' }}>{t({ en: 'Privacy Policy', fr: 'Politique de confidentialité' })}</span>. {t({ en: 'Thank you!', fr: 'Merci !' })}
                            </p>
                        </div>

                        <div style={{ marginTop: isCompactPhone ? '24px' : '32px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#6B6B6B', marginBottom: '8px', textTransform: 'uppercase' }}>
                                {t({ en: "Referral Code (Optional)", fr: "Code de parrainage (Optionnel)" })}
                            </label>
                            <input
                                type="text"
                                value={referralCode}
                                onChange={(e) => setReferralCode(e.target.value)}
                                placeholder={t({ en: "Enter code for 50 MAD off", fr: "Code pour 50 MAD de réduction" })}
                                style={{
                                    width: '100%',
                                    padding: `${Math.round(fluidMobilePx(viewportWidth, 12, 14))}px ${Math.round(fluidMobilePx(viewportWidth, 14, 18))}px`,
                                    borderRadius: '12px',
                                    backgroundColor: '#F7F7F7',
                                    border: 'none',
                                    color: '#1D1D1D',
                                    fontSize: isCompactPhone ? '14px' : '15px',
                                    fontWeight: 700,
                                    outline: 'none',
                                }}
                            />
                        </div>
                    </div>

                    {/* Footer Button Design matching Pic 2 */}
                    <div style={{ padding: footerPadding, paddingBottom: `calc(${footerPadding} + env(safe-area-inset-bottom))` }}>
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSubmit}
                            disabled={whatsappNumber.length !== 9}
                            style={{
                                width: '100%',
                                padding: `${Math.round(fluidMobilePx(viewportWidth, 14, 16))}px 24px`,
                                borderRadius: '100px',
                                backgroundColor: whatsappNumber.length === 9 ? '#0CB380' : '#F0F0F0',
                                color: whatsappNumber.length === 9 ? '#ffffffff' : '#B3B3B3',
                                border: 'none',
                                fontSize: `${Math.round(fluidMobilePx(viewportWidth, 16, 18))}px`,
                                fontWeight: 800,
                                cursor: whatsappNumber.length !== 9 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <span style={{ flex: 1 }}>{t({ en: 'Next', fr: 'Suivant' })}</span>
                            <ArrowRight size={22} strokeWidth={3} />
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ClientWhatsAppPopup;
