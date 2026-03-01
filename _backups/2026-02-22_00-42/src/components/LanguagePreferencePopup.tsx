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
                    padding: '8px 12px',
                    cursor: isDisabled ? 'default' : 'pointer',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? '#F7F7F7' : 'transparent',
                    border: isSelected ? '1px solid #000' : '1px solid transparent',
                    transition: 'all 0.2s',
                    opacity: isDisabled ? 0.5 : 1
                }}
                className={!isDisabled ? "hover:bg-gray-100" : ""}
                onMouseOver={(e) => !isDisabled && !isSelected && (e.currentTarget.style.backgroundColor = '#F7F7F7')}
                onMouseOut={(e) => !isDisabled && !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
            >
                <div style={{ fontSize: '14px', fontWeight: 400, color: '#222' }}>{lang.name}</div>
                <div style={{ fontSize: '14px', color: '#717171' }}>{lang.region}</div>
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
                                        padding: '10px 0',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'language' ? '2px solid #000' : '2px solid transparent',
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        color: activeTab === 'language' ? '#000' : '#717171',
                                        cursor: 'pointer',
                                        marginRight: '16px'
                                    }}
                                >
                                    Language and region
                                </button>
                                <button
                                    onClick={() => setActiveTab('currency')}
                                    style={{
                                        padding: '10px 0',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'currency' ? '2px solid #000' : '2px solid transparent',
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        color: activeTab === 'currency' ? '#000' : '#717171',
                                        cursor: 'pointer'
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
                                        padding: '16px',
                                        backgroundColor: '#F7F7F7',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        maxWidth: '600px'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '16px', fontWeight: 600, color: '#222' }}>Translation</span>
                                                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="presentation" focusable="false" style={{ display: 'block', height: '16px', width: '16px', fill: 'currentcolor' }}><path d="M8.5 2.5a.5.5 0 0 1 .5.5v1H11a.5.5 0 0 1 0 1H9v3.5A2.5 2.5 0 0 1 6.5 11H5.41l3.3 3.29a.5.5 0 1 1-.7.71l-4-4a.5.5 0 0 1 0-.7l4-4a.5.5 0 1 1 .7.7L5.41 10H6.5a1.5 1.5 0 0 0 1.5-1.5V5H5.8a3.5 3.5 0 0 1-2.07-1.3l-.22-.3a.5.5 0 1 1 .8-.6 2.5 2.5 0 0 0 1.49.95V2.5a.5.5 0 0 1 .5-.5zM3.5 1h5a.5.5 0 0 1 .5.5v2H5.5V2h-2v1.5a.5.5 0 0 1-1 0V1.5a.5.5 0 0 1 .5-.5z"></path></svg>
                                            </div>
                                            <span style={{ fontSize: '14px', color: '#717171' }}>Automatically translate descriptions and reviews to English.</span>
                                        </div>
                                        <div
                                            onClick={() => setTranslateEnabled(!translateEnabled)}
                                            style={{
                                                width: '48px',
                                                height: '32px',
                                                borderRadius: '32px',
                                                backgroundColor: translateEnabled ? '#222' : '#B0B0B0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '2px',
                                                cursor: 'pointer',
                                                justifyContent: translateEnabled ? 'flex-end' : 'flex-start',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FFF', margin: '0 2px' }}>
                                                {translateEnabled && <Check size={16} color="#000" style={{ margin: '6px' }} />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Suggested Languages */}
                                    <h3 style={{ fontSize: '22px', fontWeight: 600, color: '#222', marginBottom: '24px' }}>Suggested languages and regions</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                                        {suggestedLanguages.map((lang, idx) => <LanguageItem key={idx} lang={lang} />)}
                                    </div>

                                    {/* Choose a Language */}
                                    <h3 style={{ fontSize: '22px', fontWeight: 600, color: '#222', marginBottom: '24px' }}>Choose a language and region</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
                                        {allLanguages.map((lang, idx) => <LanguageItem key={idx} lang={lang} />)}
                                    </div>

                                </div>
                            ) : (
                                <div>
                                    <h3 style={{ fontSize: '22px', fontWeight: 600, color: '#222', marginBottom: '24px' }}>Choose a currency</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
                                        <div
                                            style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                borderRadius: '8px',
                                                backgroundColor: '#F7F7F7',
                                                border: '1px solid #000',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ fontSize: '14px', fontWeight: 400, color: '#222' }}>Moroccan Dirham</div>
                                            <div style={{ fontSize: '14px', color: '#717171' }}>MAD</div>
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
