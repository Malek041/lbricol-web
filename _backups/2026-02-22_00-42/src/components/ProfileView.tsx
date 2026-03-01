"use client";

import React from 'react';
import { Settings, Globe, BookOpen, HelpCircle, Users, Plus, UserPlus, LogOut, LogIn, Bell } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

interface ProfileViewProps {
    onLogout?: () => void;
    onLogin?: () => void;
    onOpenLanguage?: () => void;
    onBricolerAction?: () => void;
    isBricoler?: boolean;
    isAuthenticated?: boolean;
    onNavigate?: (path: string) => void;
    userAvatar?: string;
    userName?: string;
}

const ProfileView: React.FC<ProfileViewProps> = ({
    onLogout,
    onLogin,
    onOpenLanguage,
    onBricolerAction,
    isBricoler = false,
    isAuthenticated = false,
    onNavigate,
    userAvatar,
    userName
}) => {
    const { theme } = useTheme();
    const { t } = useLanguage();

    const c = {
        bg: theme === 'light' ? '#FFFFFF' : '#000000',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#717171' : '#B0B0B0',
        border: theme === 'light' ? '#EBEBEB' : '#2D2D2D',
        surface: theme === 'light' ? '#F7F7F7' : '#1A1A1A',
    };

    const menuItems = [
        ...(onBricolerAction
            ? [{
                icon: UserPlus,
                label: isBricoler ? t({ en: 'Switch to Bricoler Mode', fr: 'Passer en Mode Bricoleur' }) : t({ en: 'Become a Bricoler', fr: 'Devenir un Bricoleur' }),
                action: onBricolerAction
            }]
            : []),
        {
            icon: Settings,
            label: t({ en: 'Account settings', fr: 'Paramètres du compte' }),
            action: () => onNavigate?.('/settings'),
        },
        {
            icon: Globe,
            label: t({ en: 'Languages and currency', fr: 'Langues et devise' }),
            action: () => {
                if (onOpenLanguage) {
                    onOpenLanguage();
                    return;
                }
                onNavigate?.('/languages');
            },
        },
        {
            icon: HelpCircle,
            label: t({ en: 'Get help', fr: 'Obtenir de l\'aide' }),
            action: () => {
                const whatsappUrl = `https://wa.me/212702814355`;
                window.open(whatsappUrl, '_blank');
            },
        },
    ];

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                backgroundColor: c.bg,
                overflowY: 'auto',
                paddingBottom: '80px',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderBottom: `1px solid ${c.border}`,
                }}
            >
                <h1 style={{ fontSize: '32px', fontWeight: 600, color: c.text, margin: 0 }}>
                    {t({ en: 'Menu', fr: 'Menu' })}
                </h1>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: c.surface,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Bell size={20} color={c.text} />
                    </button>
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: c.surface,
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {userAvatar ? (
                            <img src={userAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '16px', fontWeight: 600, color: c.text }}>
                                {userName?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        )}
                    </div>
                </div>
            </div>



            {/* Menu Items */}
            <div style={{ padding: '0 16px' }}>
                {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={index}
                            onClick={item.action}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px 0',
                                background: 'none',
                                border: 'none',
                                borderBottom: `1px solid ${c.border}`,
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <Icon size={24} color={c.text} />
                                <span style={{ fontSize: '16px', color: c.text }}>{item.label}</span>
                            </div>
                            <span style={{ fontSize: '20px', color: c.textMuted }}>›</span>
                        </button>
                    );
                })}
            </div>

            {/* Logout */}
            <div style={{ padding: '0 16px', marginTop: '16px' }}>
                {isAuthenticated ? (
                    <button
                        onClick={onLogout}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 0',
                            background: 'none',
                            border: 'none',
                            borderBottom: `1px solid ${c.border}`,
                            cursor: 'pointer',
                            textAlign: 'left',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <LogIn size={24} color={c.text} />
                            <span style={{ fontSize: '16px', color: c.text }}>
                                {t({ en: 'Log out', fr: 'Déconnexion' })}
                            </span>
                        </div>
                        <span style={{ fontSize: '20px', color: c.textMuted }}>›</span>
                    </button>
                ) : (
                    <button
                        onClick={onLogin}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 0',
                            background: 'none',
                            border: 'none',
                            borderBottom: `1px solid ${c.border}`,
                            cursor: 'pointer',
                            textAlign: 'left',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <LogOut size={24} color={c.text} />
                            <span style={{ fontSize: '16px', color: c.text }}>
                                {t({ en: 'Log in or sign up', fr: 'Se connecter ou s\'inscrire' })}
                            </span>
                        </div>
                        <span style={{ fontSize: '20px', color: c.textMuted }}>›</span>
                    </button>
                )}
            </div>

            {/* Footer */}
            <div
                style={{
                    padding: '24px 16px',
                    marginTop: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    alignItems: 'center',
                    paddingBottom: '140px', // Extra padding for fixed button
                }}
            >
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                    <a href="#" style={{ color: c.textMuted, textDecoration: 'underline' }}>
                        {t({ en: 'Terms', fr: 'Conditions générales' })}
                    </a>
                    <span style={{ color: c.textMuted }}>·</span>
                    <a href="#" style={{ color: c.textMuted, textDecoration: 'underline' }}>
                        {t({ en: 'Privacy', fr: 'Politique de confidentialité' })}
                    </a>
                </div>
                <div style={{ fontSize: '12px', color: c.textMuted }}>
                    © 2026 Lbricol.ma. {t({ en: 'All rights reserved.', fr: 'Tous droits réservés.' })}
                </div>
            </div>

            {/* Fixed Bottom Action Button (Airbnb Style) */}
            <div style={{
                position: 'fixed',
                bottom: '100px', // Above bottom nav
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                padding: '0 16px',
                pointerEvents: 'none',
                zIndex: 100
            }}>
                <button
                    onClick={onBricolerAction}
                    style={{
                        pointerEvents: 'auto',
                        backgroundColor: '#222222',
                        color: '#FFFFFF',
                        padding: '14px 24px',
                        borderRadius: '100px',
                        fontSize: '16px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <UserPlus size={18} />
                    {isBricoler ? t({ en: 'Switch to Bricoler Mode', fr: 'Passer en Mode Bricoleur' }) : t({ en: 'Become a Bricoler', fr: 'Devenir un Bricoleur' })}
                </button>
            </div>
        </div>
    );
};

export default ProfileView;
