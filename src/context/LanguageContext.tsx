"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { messages, MessageKey } from '@/i18n/messages';

export type Language = 'en' | 'fr' | 'ar';

export interface Translation {
    en: string;
    fr: string;
    ar?: string;
}

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (translation: Translation | MessageKey | string) => string;
    isRTL: boolean;
}



const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguage] = useState<Language>('fr');

    React.useEffect(() => {
        try {
            const savedLang = localStorage.getItem('lbricol_language');
            if (savedLang === 'en' || savedLang === 'fr' || savedLang === 'ar') {
                setLanguage(savedLang as Language);
            } else {
                setLanguage('fr');
            }
        } catch (e) {
            console.warn('localStorage access denied. Defaulting to fr.', e);
            setLanguage('fr');
        }
    }, []);

    React.useEffect(() => {
        try {
            localStorage.setItem('lbricol_language', language);
        } catch (e) {
            console.warn('Failed to save language to localStorage.', e);
        }

        const root = document.documentElement;
        const rtl = language === 'ar';

        root.setAttribute('lang', language);
        root.setAttribute('dir', rtl ? 'rtl' : 'ltr');
        root.classList.toggle('rtl', rtl);
        root.classList.toggle('ltr', !rtl);
    }, [language]);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
    };

    const t = (translation: Translation | MessageKey | string) => {
        // Handle Key-based translations (New System)
        if (typeof translation === 'string') {
            const langMessages = (messages as any)[language];
            return langMessages[translation] || translation;
        }

        // Handle Object-based translations (Legacy System)
        const trans = translation as Translation;
        if (language === 'ar') {
            if (trans.ar && trans.ar.trim().length > 0) return trans.ar;
            const msg = (messages.ar as any)[trans.en] || (messages.ar as any)[trans.fr];
            if (msg) return msg;
            return trans.en;
        }
        if (language === 'fr') {
            if (trans.fr && trans.fr.trim().length > 0 && trans.fr !== trans.en) return trans.fr;
            const msg = (messages.fr as any)[trans.en];
            if (msg) return msg;
            return trans.fr || trans.en;
        }
        return trans.en;
    };

    const isRTL = language === 'ar';

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t, isRTL }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
