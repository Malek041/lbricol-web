"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, User, Menu, Globe, HelpCircle, Gift, LogIn, LogOut, Home, Truck } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import OnboardingPopup from './OnboardingPopup';
import LanguagePreferencePopup from './LanguagePreferencePopup';

interface HeaderProps {
    activeTab: 'domestic' | 'go';
    onTabChange: (tab: 'domestic' | 'go') => void;
    isBricoler?: boolean;
    user?: any;
}

const Header = ({ activeTab, onTabChange, isBricoler = false, user = null }: HeaderProps) => {
    const { language, setLanguage, t } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const [isMobile, setIsMobile] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showLanguagePopup, setShowLanguagePopup] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 968);
        const onScroll = () => setScrolled(window.scrollY > 20);
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        onResize();
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onScroll);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('scroll', onScroll);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'fr' : 'en');
    };

    const colors = {
        light: {
            bg: '#FFFFFF',
            text: '#000000',
            border: '#E2E2E2',
            muted: '#717171',
            surface: '#F7F7F7',
            navItemHover: '#F5F5F5',
            shadow: '0 2px 16px rgba(0,0,0,0.12)'
        },
        dark: {
            bg: '#000000',
            text: '#FFFFFF',
            border: '#2D2D2D',
            muted: '#A0A0A0',
            surface: '#1A1A1A',
            navItemHover: '#1A1A1A',
            shadow: '0 2px 16px rgba(255,255,255,0.08)'
        }
    };

    const c = colors[theme];

    const MenuOption = ({ icon: Icon, label, onClick, sublabel, bordered, image }: any) => (
        <div
            onClick={onClick}
            style={{
                padding: sublabel ? '12px 20px' : '12px 20px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                borderBottom: bordered ? `1px solid ${c.border}` : 'none'
            }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = c.surface)}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {Icon && <Icon size={18} color={c.text} />}
                    <span style={{
                        fontSize: '14px',
                        fontWeight: sublabel ? 700 : 500,
                        color: c.text
                    }}>
                        {label}
                    </span>
                </div>
                {sublabel && (
                    <span style={{ fontSize: '13px', color: c.muted, marginLeft: Icon ? '30px' : '0' }}>
                        {sublabel}
                    </span>
                )}
            </div>
            {image && (
                <img src={image} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            )}
        </div>
    );

    return (
        <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            width: '100%',
            backgroundColor: c.bg,
            borderBottom: scrolled ? `1px solid ${c.border}` : 'none',
            padding: '0',
            transition: 'all 0.3s ease',
            boxShadow: scrolled ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
        }}>
            <div style={{
                maxWidth: '1280px',
                margin: '0 auto',
                padding: isMobile ? '0.75rem 1.5rem' : '1rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                {/* Left: Logo */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    {!isMobile && (
                        <img
                            src={theme === 'light' ? "/Images/Logo/Black Lbrico Logo.png" : "/Images/Logo/White Lbrico Logo.png"}
                            alt="Lbricol"
                            style={{
                                height: '2rem',
                                cursor: 'pointer',
                                flexShrink: 0
                            }}
                            onClick={() => window.location.href = '/'}
                        />
                    )}
                </div>

                {/* Center: Tabs */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '16px' : '2.5rem',
                        overflowX: isMobile ? 'auto' : 'visible',
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        padding: isMobile ? '4px 0' : '0'
                    }} className="no-scrollbar">
                        {[
                            { id: 'domestic', label: t({ en: 'Domestic Help', fr: 'Aide Ménagère' }), icon: Home },
                            { id: 'go', label: t({ en: 'Mobility & Logistics', fr: 'Mobilité & Logistique' }), icon: Truck }
                        ].map(tab => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange(tab.id as any)}
                                    style={{
                                        padding: '0.5rem 0',
                                        fontSize: isMobile ? '14px' : '15px',
                                        fontWeight: 800,
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        color: isActive ? c.text : c.muted,
                                        position: 'relative',
                                        transition: 'color 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <tab.icon size={isMobile ? 24 : 20} strokeWidth={isActive ? 2.5 : 2} />
                                    <span>{tab.label}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="header-active-tab"
                                            style={{
                                                position: 'absolute',
                                                bottom: '-2px',
                                                left: 0,
                                                width: '100%',
                                                height: '2.5px',
                                                backgroundColor: c.text,
                                                borderRadius: '2px'
                                            }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Actions */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: isMobile ? '0.5rem' : '1rem',
                    flex: 1
                }}>
                    {!isMobile && (
                        <button
                            onClick={() => {
                                if (isBricoler) {
                                    window.location.href = '/provider';
                                } else {
                                    setShowOnboarding(true);
                                }
                            }}
                            style={{
                                background: '#000000',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#FFFFFF',
                                fontSize: '13px',
                                fontWeight: 800,
                                padding: '10px 14px',
                                borderRadius: '50px',
                                transition: 'background-color 0.2s ease',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseOver={e => (e.currentTarget.style.backgroundColor = '#333333')}
                            onMouseOut={e => (e.currentTarget.style.backgroundColor = '#000000')}
                        >
                            {isBricoler ? t({ en: 'Switch to Bricoler Mode', fr: 'Passer en Mode Bricoleur' }) : t({ en: 'Become a Bricoler', fr: 'Devenir un Bricoleur' })}
                        </button>
                    )}


                    {!isMobile && (
                        <>
                            <div
                                onClick={() => setShowLanguagePopup(true)}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s ease',
                                    backgroundColor: '#F3F3F3',
                                    marginRight: '-4px'
                                }}
                                onMouseOver={e => (e.currentTarget.style.backgroundColor = c.surface)}
                                onMouseOut={e => (e.currentTarget.style.backgroundColor = '#F3F3F3')}
                            >
                                <Globe size={18} color={c.text} strokeWidth={2} />
                            </div>

                            <div ref={menuRef} style={{ position: 'relative' }}>
                                <div
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '5px 5px 5px 5px',
                                        borderRadius: '100px',
                                        backgroundColor: c.bg,
                                        cursor: 'pointer',
                                        transition: 'box-shadow 0.2s ease',
                                        boxShadow: isMenuOpen ? '0 2px 4px rgba(0,0,0,0.18)' : 'none'
                                    }}
                                    onMouseOver={e => !isMenuOpen && (e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.18)')}
                                    onMouseOut={e => !isMenuOpen && (e.currentTarget.style.boxShadow = 'none')}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: '#F3F3F3',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#030303ff'
                                    }}>
                                        <User size={18} fill="currentColor" />
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isMenuOpen && (
                                        <motion.div
                                            key="user-menu"
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            style={{
                                                position: 'absolute',
                                                top: 'calc(100% + 10px)',
                                                right: isMobile ? '-10px' : 0,
                                                width: isMobile ? 'calc(100vw - 32px)' : '300px',
                                                maxWidth: '360px',
                                                backgroundColor: c.bg,
                                                borderRadius: '12px',
                                                border: `1px solid ${c.border}`,
                                                boxShadow: c.shadow,
                                                overflow: 'hidden',
                                                zIndex: 1100,
                                                padding: '8px 0'
                                            }}
                                        >
                                            <MenuOption
                                                icon={HelpCircle}
                                                label={t({ en: 'Help Center', fr: 'Centre d\'aide' })}
                                                onClick={() => window.open('https://wa.me/212702814355', '_blank')}
                                                bordered
                                            />

                                            <MenuOption
                                                label={isBricoler ? t({ en: 'Switch to Bricoler Mode', fr: 'Passer en Mode Bricoleur' }) : t({ en: 'Become a Bricoler', fr: 'Devenir un Bricoleur' })}
                                                sublabel={isBricoler ? t({ en: 'Manage your profile and jobs.', fr: 'Gérez votre profil et vos missions.' }) : t({ en: 'Start earning extra income.', fr: 'Commencez à gagner un revenu extra.' })}
                                                onClick={() => {
                                                    if (isBricoler) {
                                                        window.location.href = '/provider';
                                                    } else {
                                                        setShowOnboarding(true);
                                                    }
                                                    setIsMenuOpen(false);
                                                }}
                                                image="/Images/Logo/Black Lbricol Avatar Face.png"
                                                bordered
                                            />

                                            {user ? (
                                                <MenuOption
                                                    icon={LogOut}
                                                    label={t({ en: 'Log out', fr: 'Se déconnecter' })}
                                                    onClick={() => {
                                                        signOut(auth);
                                                        setIsMenuOpen(false);
                                                    }}
                                                />
                                            ) : (
                                                <MenuOption
                                                    icon={LogIn}
                                                    label={t({ en: 'Log in or sign up', fr: 'Se connecter ou s\'inscrire' })}
                                                    onClick={() => {
                                                        // Trigger auth popup logic from parent if needed, 
                                                        // or just log click for now as it was
                                                        console.log('Login clicked');
                                                    }}
                                                />
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Onboarding Popup */}
            <OnboardingPopup
                isOpen={showOnboarding}
                onClose={() => setShowOnboarding(false)}
                onComplete={(data) => {
                    setShowOnboarding(false);
                    // Redirect to provider page with data
                    const serviceIds = data.services.map((s: any) => s.serviceId).join(',');
                    window.location.href = `/provider?services=${serviceIds}&city=${data.city}`;
                }}
            />

            <LanguagePreferencePopup
                isOpen={showLanguagePopup}
                onSelectLanguage={(lang) => {
                    setLanguage(lang);
                    setShowLanguagePopup(false);
                }}
                onClose={() => setShowLanguagePopup(false)}
            />
        </header>
    );
};

export default Header;
