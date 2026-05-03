"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { fluidMobilePx, useIsMobileViewport, useMobileTier, useViewportWidth } from '@/lib/mobileOnly';
import { COUNTRY_DATA, formatToE164, validatePhone, CountryConfig } from '@/lib/phoneUtils';
import CountrySelector from '@/components/phone/CountrySelector';
import { cn } from '@/lib/utils';
import WaveTop from '@/components/shared/WaveTop';

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
    const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(COUNTRY_DATA[0]); // Default to Morocco

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

    const isValid = validatePhone(whatsappNumber, selectedCountry);

    const handleSubmit = () => {
        if (isValid) {
            const e164 = formatToE164(whatsappNumber, selectedCountry.dialCode);
            onSuccess(e164, referralCode);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[4000] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
                        animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
                        exit={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className={cn(
                            "relative bg-white w-full shadow-2xl flex flex-col",
                            isMobile ? "rounded-t-[32px] min-h-0" : "max-w-md rounded-[32px] overflow-hidden"
                        )}
                        onClick={e => e.stopPropagation()}
                    >
                        {isMobile && <WaveTop />}

                        {/* Native Handle for Mobile */}
                        {isMobile && (
                            <div className="w-12 h-1.5 bg-neutral-200/50 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />
                        )}

                        {/* Header */}
                        <div style={{ padding: headerPadding, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    background: '#F5F5F5',
                                    border: 'none',
                                    cursor: 'pointer',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <ChevronLeft size={24} color="#1D1D1D" />
                            </button>
                        </div>

                    {/* Main Content */}
                    <div style={{ flex: 1, padding: `0 ${contentPaddingX}`, display: 'flex', flexDirection: 'column', paddingTop: contentPaddingTop }}>
                        <h2 style={{
                            fontSize: titleSize,
                            fontWeight: 700,
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
                            padding: `0 ${Math.round(fluidMobilePx(viewportWidth, 14, 20))}px`,
                            border: `2px solid ${isValid ? '#0CB380' : whatsappNumber.length > 0 ? '#FF5252' : '#F5F0E0'}`,
                            height: isCompactPhone ? '60px' : '70px',
                            gap: isCompactPhone ? '8px' : '12px',
                            marginBottom: isCompactPhone ? '16px' : '20px',
                            transition: 'all 0.2s ease'
                        }}>
                            <CountrySelector 
                                selectedCountry={selectedCountry} 
                                onSelect={setSelectedCountry}
                                isCompact={isCompactPhone}
                                fontSize={inputFontSize}
                            />
                            <input
                                type="tel"
                                value={whatsappNumber}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setWhatsappNumber(val);
                                }}
                                placeholder={selectedCountry.placeholder}
                                autoFocus
                                style={{
                                    flex: 1,
                                    background: 'none',
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: inputFontSize,
                                    fontWeight: 700,
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
                                <span style={{ color: '#01A083', textDecoration: 'underline' }}>{t({ en: 'Terms of Use', fr: 'Conditions d\'utilisation' })}</span>
                                {t({ en: ' and our ', fr: ' et notre ' })}
                                <span style={{ color: '#01A083', textDecoration: 'underline' }}>{t({ en: 'Privacy Policy', fr: 'Politique de confidentialité' })}</span>. {t({ en: 'Thank you!', fr: 'Merci !' })}
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
                            disabled={!isValid}
                            style={{
                                width: '100%',
                                padding: `${Math.round(fluidMobilePx(viewportWidth, 14, 16))}px 24px`,
                                borderRadius: '100px',
                                backgroundColor: isValid ? '#0CB380' : '#F0F0F0',
                                color: isValid ? '#ffffff' : '#B3B3B3',
                                border: 'none',
                                fontSize: `${Math.round(fluidMobilePx(viewportWidth, 16, 18))}px`,
                                fontWeight: 800,
                                cursor: !isValid ? 'not-allowed' : 'pointer',
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
                    </div>
                </motion.div>
            </motion.div>
            )}
        </AnimatePresence>
    );
};


export default ClientWhatsAppPopup;
