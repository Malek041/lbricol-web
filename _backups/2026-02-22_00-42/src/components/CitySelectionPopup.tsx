"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface CitySelectionPopupProps {
    isOpen: boolean;
    onSelectCity: (city: string) => void;
    onClose?: () => void;
}

const CitySelectionPopup = ({ isOpen, onSelectCity, onClose }: CitySelectionPopupProps) => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const [isMobile, setIsMobile] = useState(false);
    const [step, setStep] = useState<'city' | 'area'>('city');
    const [tempCity, setTempCity] = useState("");

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 968);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Reset steps when closed
    useEffect(() => {
        if (!isOpen) {
            setStep('city');
            setTempCity("");
        }
    }, [isOpen]);

    const c = {
        bg: theme === 'light' ? '#FFFFFF' : '#1A1A1A',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#545454' : '#A0A0A0',
        border: theme === 'light' ? '#E2E2E2' : '#2D2D2D',
        surface: theme === 'light' ? '#F5F5F5' : '#111111',
        card: theme === 'light' ? '#FFFFFF' : '#1A1A1A'
    };

    const cities = [
        { name: "Marrakech", code: "MA" },
        { name: "Casablanca", code: "MA" },
        { name: "Rabat", code: "MA" },
        { name: "Essaouira", code: "MA" },
        { name: "Agadir", code: "MA" },
        { name: "Tangier", code: "MA" },
        { name: "Fes", code: "MA" },
    ];

    const handleCityClick = (cityName: string) => {
        setTempCity(cityName);
        setStep('area');
    };

    const handleAreaSelect = (isCountryside: boolean) => {
        const areaSuffix = isCountryside ? ' (Countryside)' : ' (Inside)';
        onSelectCity(`${tempCity}${areaSuffix}`);
        setStep('city');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '1.5rem',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <motion.div
                        initial={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0, y: 20 }}
                        animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: 0 }}
                        exit={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        style={{
                            backgroundColor: c.bg,
                            borderRadius: isMobile ? '32px 32px 0 0' : '32px',
                            width: '100%',
                            maxWidth: isMobile ? 'none' : '480px',
                            padding: isMobile ? '1.5rem 2rem 3rem' : '3.5rem',
                            position: isMobile ? 'fixed' : 'relative',
                            bottom: isMobile ? 0 : 'auto',
                            left: isMobile ? 0 : 'auto',
                            maxHeight: isMobile ? '90vh' : 'none',
                            overflowY: 'auto',
                            boxShadow: theme === 'light' ? '0 -10px 25px rgba(0,0,0,0.1)' : '0 -10px 25px rgba(0,0,0,0.4)',
                            textAlign: 'center',
                            color: c.text,
                            zIndex: 2001
                        }}
                    >
                        {isMobile && (
                            <div style={{
                                width: '40px',
                                height: '4px',
                                backgroundColor: c.border,
                                borderRadius: '2px',
                                margin: '0 auto 1.5rem',
                                opacity: 0.5
                            }} />
                        )}
                        {onClose && (
                            <button
                                onClick={onClose}
                                style={{
                                    position: 'absolute',
                                    top: isMobile ? '1.5rem' : '1.5rem',
                                    right: '1.5rem',
                                    background: 'none',
                                    border: 'none',
                                    color: c.textMuted,
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: c.surface,
                                    zIndex: 10
                                }}
                            >
                                <X size={20} />
                            </button>
                        )}
                        <div style={{
                            width: isMobile ? '48px' : '64px',
                            height: isMobile ? '48px' : '64px',
                            backgroundColor: c.surface,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: isMobile ? '0 auto 1rem' : '0 auto 1.5rem'
                        }}>
                            <MapPin size={isMobile ? 24 : 32} color={c.text} />
                        </div>

                        {step === 'city' ? (
                            <>
                                <h2 style={{
                                    fontSize: isMobile ? '1.375rem' : '1.625rem',
                                    fontWeight: 600,
                                    marginBottom: '0.5rem',
                                    color: c.text,
                                    letterSpacing: '-0.02em',
                                    fontFamily: 'var(--font-sans)'
                                }}>
                                    {t({ en: 'Select your city', fr: 'Sélectionnez votre ville' })}
                                </h2>
                                <p style={{
                                    fontSize: '14px',
                                    color: c.textMuted,
                                    fontWeight: 400,
                                    lineHeight: 1.5,
                                    marginBottom: isMobile ? '1.5rem' : '2rem'
                                }}>
                                    {t({
                                        en: 'Choose your location to find local experts near you',
                                        fr: 'Choisissez votre emplacement pour trouver des experts locaux près de chez vous'
                                    })}
                                </p>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                                    gap: '12px',
                                    maxHeight: isMobile ? '40vh' : '360px',
                                    overflowY: 'auto',
                                    padding: '4px'
                                }}>
                                    {cities.map((city) => (
                                        <motion.button
                                            key={city.name}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleCityClick(city.name)}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                                padding: '14px 16px',
                                                borderRadius: '12px',
                                                border: `1px solid ${c.border}`,
                                                backgroundColor: c.card,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                textAlign: 'left'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.borderColor = c.text;
                                                e.currentTarget.style.backgroundColor = c.surface;
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.borderColor = c.border;
                                                e.currentTarget.style.backgroundColor = c.card;
                                            }}
                                        >
                                            <div style={{
                                                fontWeight: 600,
                                                fontSize: '16px',
                                                color: c.text,
                                                marginBottom: '2px',
                                                fontFamily: 'var(--font-sans)'
                                            }}>
                                                {city.name}
                                            </div>
                                            <div style={{
                                                fontSize: '14px',
                                                fontWeight: 400,
                                                color: c.textMuted
                                            }}>
                                                {city.code}
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                            >
                                <h2 style={{
                                    fontSize: isMobile ? '1.375rem' : '1.625rem',
                                    fontWeight: 600,
                                    color: c.text,
                                    letterSpacing: '-0.02em',
                                    fontFamily: 'var(--font-sans)'
                                }}>
                                    {t({ en: 'Where do you live?', fr: 'Où habitez-vous ?' })}
                                </h2>
                                <p style={{
                                    fontSize: '14px',
                                    color: c.textMuted,
                                    fontWeight: 400,
                                    marginBottom: '0.5rem'
                                }}>
                                    {t({
                                        en: `Help us match you with the right pro in ${tempCity}`,
                                        fr: `Aidez-nous à vous trouver le bon pro à ${tempCity}`
                                    })}
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleAreaSelect(false)}
                                        style={{
                                            padding: '16px 20px',
                                            borderRadius: '12px',
                                            border: `1px solid ${c.border}`,
                                            backgroundColor: c.card,
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            fontWeight: 600,
                                            fontSize: '16px',
                                            color: c.text,
                                            fontFamily: 'var(--font-sans)',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.borderColor = c.text;
                                            e.currentTarget.style.backgroundColor = c.surface;
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.borderColor = c.border;
                                            e.currentTarget.style.backgroundColor = c.card;
                                        }}
                                    >
                                        {t({ en: `Inside ${tempCity}`, fr: `Dans ${tempCity}` })}
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleAreaSelect(true)}
                                        style={{
                                            padding: '16px 20px',
                                            borderRadius: '12px',
                                            border: `1px solid ${c.border}`,
                                            backgroundColor: c.card,
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            fontWeight: 600,
                                            fontSize: '16px',
                                            color: c.text,
                                            fontFamily: 'var(--font-sans)',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.borderColor = c.text;
                                            e.currentTarget.style.backgroundColor = c.surface;
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.borderColor = c.border;
                                            e.currentTarget.style.backgroundColor = c.card;
                                        }}
                                    >
                                        {t({ en: `In the Countryside of ${tempCity}`, fr: `Dans la campagne de ${tempCity}` })}
                                    </motion.button>

                                    <button
                                        onClick={() => setStep('city')}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: c.textMuted,
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            marginTop: '0.5rem',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        {t({ en: 'Back to city selection', fr: 'Retour au choix de la ville' })}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CitySelectionPopup;
