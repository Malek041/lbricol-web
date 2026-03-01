"use client";

import React from 'react';
import { ShoppingBag, Star, User, Home, Calendar, TrendingUp } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export type TabType = 'home' | 'heroes' | 'orders' | 'profile' | 'jobs' | 'calendar' | 'messages' | 'performance';

interface MobileBottomNavProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    variant?: 'client' | 'provider' | 'admin';
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
    activeTab,
    onTabChange,
    variant = 'client'
}) => {
    const { theme } = useTheme();
    const { t } = useLanguage();

    const providerTabs = [
        { id: 'jobs' as TabType, icon: Home, label: t({ en: 'Home', fr: 'Accueil' }) },
        { id: 'calendar' as TabType, icon: Calendar, label: t({ en: 'Calendar', fr: 'Calendrier' }) },
        { id: 'performance' as TabType, icon: TrendingUp, label: t({ en: 'Stats', fr: 'Statistiques' }) },
        { id: 'profile' as TabType, icon: User, label: t({ en: 'Profile', fr: 'Profil' }) },
    ];

    const clientTabs = [
        { id: 'home' as TabType, icon: Home, label: t({ en: 'Home', fr: 'Accueil' }) },
        { id: 'calendar' as TabType, icon: ShoppingBag, label: t({ en: 'Orders', fr: 'Commandes' }) },
        { id: 'heroes' as TabType, icon: Star, label: 'Ma Heroes' },
        { id: 'profile' as TabType, icon: User, label: t({ en: 'Profile', fr: 'Profil' }) },
    ];

    const adminTabs = [
        { id: 'performance' as TabType, icon: TrendingUp, label: t({ en: 'Dashboard', fr: 'Tableau de bord' }) },
        { id: 'calendar' as TabType, icon: ShoppingBag, label: t({ en: 'All Orders', fr: 'Toutes les commandes' }) },
        { id: 'profile' as TabType, icon: User, label: t({ en: 'Profile', fr: 'Profil' }) },
    ];

    const tabs = variant === 'provider' ? providerTabs : (variant === 'admin' ? adminTabs : clientTabs);

    const getEffectiveActiveId = (id: TabType) => {
        if (variant === 'provider') {
            if (id === 'jobs') return 'jobs';
            if (id === 'calendar') return 'calendar';
            if (id === 'performance') return 'performance';
            if (id === 'profile') return 'profile';
        } else if (variant === 'admin') {
            if (id === 'performance') return 'performance';
            if (id === 'calendar') return 'calendar';
            if (id === 'profile') return 'profile';
        } else {
            if (id === 'home') return 'home';
            if (id === 'heroes') return 'heroes';
            if (id === 'calendar') return 'calendar';
            if (id === 'profile') return 'profile';
        }
        return id;
    };

    const effectiveActiveTab = getEffectiveActiveId(activeTab);

    const activeColor = '#000000';
    const inactiveColor = theme === 'light' ? '#717171' : '#B0B0B0';
    const activeBgColor = '#FFC244'; // Glovo-style yellow circular background

    return (
        <nav
            data-mobile-bottom-nav="true"
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: theme === 'light' ? '#FFFFFF' : '#1A1A1A',
                borderTop: `1px solid ${theme === 'light' ? '#EBEBEB' : '#2D2D2D'}`,
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
                zIndex: 1000,
            }}
        >
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = effectiveActiveTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 0',
                            transition: 'all 0.2s ease',
                            flex: 1,
                        }}
                    >
                        <div
                            style={{
                                width: '42px',
                                height: '28px',
                                borderRadius: '20px',
                                backgroundColor: isActive ? activeBgColor : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <Icon
                                size={22}
                                strokeWidth={isActive ? 2.5 : 2}
                                color={isActive ? activeColor : inactiveColor}
                            />
                        </div>
                        <span
                            style={{
                                fontSize: '12px',
                                fontWeight: isActive ? 700 : 500,
                                color: isActive ? activeColor : inactiveColor,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
};

export default MobileBottomNav;

