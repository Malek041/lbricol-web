"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface LanguagePreferencePopupProps {
    isOpen: boolean;
    onSelectLanguage: (language: 'en' | 'fr') => void;
    onClose?: () => void;
}

const LanguagePreferencePopup = ({ isOpen, onSelectLanguage, onClose }: LanguagePreferencePopupProps) => {
    const { theme } = useTheme();
    const { language } = useLanguage();
    const [isMobile, setIsMobile] = useState(false);
    const [activeTab, setActiveTab] = useState<'language' | 'currency'>('language');
    const [translateEnabled, setTranslateEnabled] = useState(true);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 768);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const c = {
        bg: '#FFFFFF', // Design seems always light/white based on screenshot, but let's stick to theme if possible or force specific style for this modal
        text: '#222222',
        textMuted: '#717171',
        border: '#DDDDDD',
        surface: '#F7F7F7',
        hover: '#F7F7F7',
        black: '#222222'
    };

    // Force light theme for this specific modal to match the screenshot exactly if desired, 
    // or adapt. The screenshot is light mode. I'll use hardcoded colors matching the screenshot for fidelity.
    // If dark mode is strict requirement, I'd map them. Assuming light mode for 'Airbnb style' accuracy.

    const suggestedLanguages = [
        { code: 'en', name: 'English', region: 'United Kingdom' },
        { code: 'fr', name: 'Français', region: 'France' },
    ];

    const allLanguages = [
        { code: 'en', name: 'English', region: 'United States' },
        { code: 'az', name: 'Azərbaycan dili', region: 'Azərbaycan', disabled: true },
        { code: 'id', name: 'Bahasa Indonesia', region: 'Indonesia', disabled: true },
        { code: 'bs', name: 'Bosanski', region: 'Bosna i Hercegovina', disabled: true },
        { code: 'ca', name: 'Català', region: 'Espanya', disabled: true },
        { code: 'cs', name: 'Čeština', region: 'Česká republika', disabled: true },
        { code: 'cnr', name: 'Crnogorski', region: 'Crna Gora', disabled: true },
        { code: 'da', name: 'Dansk', region: 'Danmark', disabled: true },
        { code: 'de', name: 'Deutsch', region: 'Deutschland', disabled: true },
        { code: 'de-at', name: 'Deutsch', region: 'Österreich', disabled: true },
        { code: 'de-ch', name: 'Deutsch', region: 'Schweiz', disabled: true },
        { code: 'de-lu', name: 'Deutsch', region: 'Luxemburg', disabled: true },
        { code: 'et', name: 'Eesti', region: 'Eesti', disabled: true },
        { code: 'en-au', name: 'English', region: 'Australia', disabled: true },
        { code: 'en-ca', name: 'English', region: 'Canada', disabled: true },
        { code: 'en-gy', name: 'English', region: 'Guyana', disabled: true },
        { code: 'en-in', name: 'English', region: 'India', disabled: true },
        { code: 'en-ie', name: 'English', region: 'Ireland', disabled: true },
        { code: 'en-nz', name: 'English', region: 'New Zealand', disabled: true },
        { code: 'en-sg', name: 'English', region: 'Singapore', disabled: true },
        { code: 'en-ae', name: 'English', region: 'United Arab Emirates', disabled: true },
        { code: 'es-ar', name: 'Español', region: 'Argentina', disabled: true },
        { code: 'es-bz', name: 'Español', region: 'Belice', disabled: true },
        { code: 'es-bo', name: 'Español', region: 'Bolivia', disabled: true },
        { code: 'es-cl', name: 'Español', region: 'Chile', disabled: true },
    ];

    const LanguageItem = ({ lang }: { lang: any }) => {
        const isSelected = language === lang.code; // Simple check, might need mapping en-US to en
        const isDisabled = lang.disabled;

        return (
            <div
                onClick={() => !isDisabled && onSelectLanguage(lang.code as any)}
                style={{
                    padding: '12px 16px',
                    cursor: isDisabled ? 'default' : 'pointer',
                    borderRadius: '16px',
                    backgroundColor: isSelected ? '#00A08215' : 'transparent',
                    border: isSelected ? '1.5px solid #00A082' : '1px solid transparent',
                    transition: 'all 0.2s',
                    opacity: isDisabled ? 0.5 : 1
                }}
                className={!isDisabled ? "hover:bg-neutral-50" : ""}
                onMouseOver={(e) => !isDisabled && !isSelected && (e.currentTarget.style.backgroundColor = '#FAFAFA')}
                onMouseOut={(e) => !isDisabled && !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
            >
                <div style={{ fontSize: '15px', fontWeight: isSelected ? 700 : 500, color: '#1D1D1D' }}>{lang.name}</div>
                <div style={{ fontSize: '14px', color: '#717171', marginTop: '2px' }}>{lang.region}</div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)'
                }} onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: '#FFFFFF',
                            width: '100%',
                            maxWidth: '1032px', // Large modal like screenshot
                            height: isMobile ? '100%' : 'auto',
                            maxHeight: isMobile ? '100%' : '85vh',
                            borderRadius: isMobile ? '0' : '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: '0 8px 28px rgba(0,0,0,0.28)',
                            position: 'relative'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '16px 24px',
                            borderBottom: '1px solid #EBEBEB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start', // Logo/Close left, Tabs center? No, screenshot shows close top left.
                            position: 'relative'
                        }}>
                            <button onClick={onClose} style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                marginRight: '16px'
                            }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#F7F7F7'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <X size={16} color="#000" />
                            </button>

                            <div style={{ display: 'flex', gap: '32px' }}>
                                <button
                                    onClick={() => setActiveTab('language')}
                                    style={{
                                        padding: '12px 0',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'language' ? '3px solid #00A082' : '3px solid transparent',
                                        fontSize: '16px',
                                        fontWeight: activeTab === 'language' ? 800 : 600,
                                        color: activeTab === 'language' ? '#00A082' : '#717171',
                                        cursor: 'pointer',
                                        marginRight: '20px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Language and region
                                </button>
                                <button
                                    onClick={() => setActiveTab('currency')}
                                    style={{
                                        padding: '12px 0',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'currency' ? '3px solid #00A082' : '3px solid transparent',
                                        fontSize: '16px',
                                        fontWeight: activeTab === 'currency' ? 800 : 600,
                                        color: activeTab === 'currency' ? '#00A082' : '#717171',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Currency
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{
                            padding: '24px',
                            overflowY: 'auto',
                            flex: 1
                        }}>
                            {activeTab === 'language' ? (
                                <div style={{ maxWidth: '100%' }}>
                                    {/* Translation Toggle */}
                                    <div style={{
                                        marginBottom: '32px',
                                        padding: '16px 20px',
                                        backgroundColor: '#FAFAFA',
                                        borderRadius: '16px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        maxWidth: '600px'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                <span style={{ fontSize: '16px', fontWeight: 800, color: '#1D1D1D' }}>Translation</span>
                                            </div>
                                            <span style={{ fontSize: '14px', color: '#717171' }}>Automatically translate descriptions and reviews to English.</span>
                                        </div>
                                        <div
                                            onClick={() => setTranslateEnabled(!translateEnabled)}
                                            style={{
                                                width: '52px',
                                                height: '32px',
                                                borderRadius: '32px',
                                                backgroundColor: translateEnabled ? '#00A082' : '#E6E6E6',
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '2px',
                                                cursor: 'pointer',
                                                justifyContent: translateEnabled ? 'flex-end' : 'flex-start',
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FFF', margin: '0 2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {translateEnabled && <Check size={16} color="#00A082" strokeWidth={3} />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Suggested Languages */}
                                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1D1D1D', marginBottom: '20px' }}>Suggested languages and regions</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '36px' }}>
                                        {suggestedLanguages.map((lang, idx) => <LanguageItem key={idx} lang={lang} />)}
                                    </div>

                                    {/* Choose a Language */}
                                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1D1D1D', marginBottom: '20px' }}>Choose a language and region</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
                                        {allLanguages.map((lang, idx) => <LanguageItem key={idx} lang={lang} />)}
                                    </div>

                                </div>
                            ) : (
                                <div>
                                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1D1D1D', marginBottom: '20px' }}>Choose a currency</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
                                        <div
                                            style={{
                                                padding: '12px 16px',
                                                cursor: 'pointer',
                                                borderRadius: '16px',
                                                backgroundColor: '#00A08215',
                                                border: '1.5px solid #00A082',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1D1D1D' }}>Moroccan Dirham</div>
                                            <div style={{ fontSize: '14px', color: '#717171', marginTop: '2px' }}>MAD</div>
                                        </div>
                                        {/* Future currencies can be added here */}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LanguagePreferencePopup;
