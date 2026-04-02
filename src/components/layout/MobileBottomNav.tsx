"use client";

import React from 'react';
import { ShoppingBag, Star, User, Home, Calendar, TrendingUp, MessageSquare } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { fluidMobilePx, useMobileTier, useViewportWidth } from '@/lib/mobileOnly';

export type TabType = 'home' | 'heroes' | 'orders' | 'profile' | 'jobs' | 'calendar' | 'messages' | 'performance' | 'services';

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
    const mobileTier = useMobileTier();
    const viewportWidth = useViewportWidth();
    const isCompactPhone = mobileTier === 'compact';

    const navPadTop = `${Math.round(fluidMobilePx(viewportWidth, 6, 8))}px`;
    const navPadBottom = `${Math.round(fluidMobilePx(viewportWidth, 6, 8))}px`;
    const iconChipWidth = `${Math.round(fluidMobilePx(viewportWidth, 38, 42))}px`;
    const iconChipHeight = `${Math.round(fluidMobilePx(viewportWidth, 26, 28))}px`;
    const iconSize = Math.round(fluidMobilePx(viewportWidth, 19, 22));
    const labelSize = `${Math.round(fluidMobilePx(viewportWidth, 10, 12))}px`;

    const providerTabs = [
        { id: 'calendar' as TabType, icon: ShoppingBag, label: t({ en: 'Orders', fr: 'Commandes', ar: 'الطلبات' }) },
        { id: 'messages' as TabType, icon: MessageSquare, label: t({ en: 'Messages', fr: 'Messages', ar: 'الرسائل' }) },
        { id: 'performance' as TabType, icon: TrendingUp, label: t({ en: 'Activity', fr: 'Activité', ar: 'النشاط' }) },
        { id: 'services' as TabType, icon: Star, label: t({ en: 'Services', fr: 'Services', ar: 'الخدمات' }) },
        { id: 'profile' as TabType, icon: User, label: t({ en: 'Profile', fr: 'Profil', ar: 'الملف الشخصي' }) },
    ];

    const clientTabs = [
        { id: 'home' as TabType, icon: Home, label: t({ en: 'Home', fr: 'Accueil', ar: 'الرئيسية' }) },
        { id: 'calendar' as TabType, icon: ShoppingBag, label: t({ en: 'Orders', fr: 'Commandes', ar: 'الطلبات' }) },
        { id: 'messages' as TabType, icon: MessageSquare, label: t({ en: 'Messages', fr: 'Messages', ar: 'الرسائل' }) },
        // { id: 'heroes' as TabType, icon: Star, label: t({ en: 'My Heroes', fr: 'Mes Héros', ar: 'أبطالي' }) },
        { id: 'profile' as TabType, icon: User, label: t({ en: 'Profile', fr: 'Profil', ar: 'الملف الشخصي' }) },
    ];

    const adminTabs = [
        { id: 'performance' as TabType, icon: TrendingUp, label: t({ en: 'Dashboard', fr: 'Tableau de bord', ar: 'لوحة التحكم' }) },
        { id: 'calendar' as TabType, icon: ShoppingBag, label: t({ en: 'All Orders', fr: 'Toutes les commandes', ar: 'كل الطلبات' }) },
        { id: 'messages' as TabType, icon: MessageSquare, label: t({ en: 'Messages', fr: 'Messages', ar: 'الرسائل' }) },
        { id: 'services' as TabType, icon: Star, label: t({ en: 'Bricolers', fr: 'Bricoleurs', ar: 'المحترفون' }) },
        { id: 'profile' as TabType, icon: User, label: t({ en: 'Profile', fr: 'Profil', ar: 'الملف الشخصي' }) },
    ];

    const tabs = variant === 'provider' ? providerTabs : (variant === 'admin' ? adminTabs : clientTabs);

    const getEffectiveActiveId = (id: TabType) => {
        if (variant === 'provider') {
            if (id === 'jobs') return 'jobs';
            if (id === 'calendar') return 'calendar';
            if (id === 'performance') return 'performance';
            if (id === 'services') return 'services';
            if (id === 'profile') return 'profile';
        } else if (variant === 'admin') {
            if (id === 'performance') return 'performance';
            if (id === 'calendar') return 'calendar';
            if (id === 'services') return 'services';
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
                padding: `${navPadTop} 0 max(${navPadBottom}, env(safe-area-inset-bottom))`,
                zIndex: 9000,
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
                            gap: isCompactPhone ? '3px' : '4px',
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
                                width: iconChipWidth,
                                height: iconChipHeight,
                                borderRadius: '20px',
                                backgroundColor: isActive ? activeBgColor : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <Icon
                                size={iconSize}
                                strokeWidth={isActive ? 2.5 : 2}
                                color={isActive ? activeColor : inactiveColor}
                            />
                        </div>
                        <span
                            style={{
                                fontSize: labelSize,
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
