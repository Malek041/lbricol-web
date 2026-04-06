"use client";

import React from 'react';
import { ShoppingBag, Star, User, Home, Calendar, TrendingUp, MessageSquare, Search } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { fluidMobilePx, useMobileTier, useViewportWidth } from '@/lib/mobileOnly';

export type TabType = 'home' | 'search' | 'heroes' | 'orders' | 'profile' | 'jobs' | 'calendar' | 'messages' | 'performance' | 'services' | 'reviews';

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
        { id: 'performance' as TabType, icon: TrendingUp, label: t({ en: 'Activity', fr: 'Activité', ar: 'النشاط' }) },
        { id: 'services' as TabType, icon: Star, label: t({ en: 'Services', fr: 'Services', ar: 'الخدمات' }) },
        { id: 'profile' as TabType, icon: User, label: t({ en: 'Profile', fr: 'Profil', ar: 'الملف الشخصي' }) },
    ];

    const clientTabs = [
        { id: 'home' as TabType, icon: Home, label: t({ en: 'Home', fr: 'Accueil', ar: 'الرئيسية' }) },
        { id: 'search' as TabType, icon: Search, label: t({ en: 'Search', fr: 'Recherche', ar: 'بحث' }) },
        { id: 'calendar' as TabType, icon: ShoppingBag, label: t({ en: 'Orders', fr: 'Commandes', ar: 'الطلبات' }) },
        { id: 'profile' as TabType, icon: User, label: t({ en: 'Profile', fr: 'Profil', ar: 'الملف الشخصي' }) },
    ];

    const adminTabs = [
        { id: 'performance' as TabType, icon: TrendingUp, label: t({ en: 'Dashboard', fr: 'Tableau de bord', ar: 'لوحة التحكم' }) },
        { id: 'calendar' as TabType, icon: ShoppingBag, label: t({ en: 'All Orders', fr: 'Toutes les commandes', ar: 'كل الطلبات' }) },
        { id: 'reviews' as TabType, icon: MessageSquare, label: t({ en: 'Reviews', fr: 'Avis', ar: 'التقييمات' }) },
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
            if (id === 'reviews') return 'reviews';
            if (id === 'profile') return 'profile';
        } else {
            if (id === 'home') return 'home';
            if (id === 'search') return 'search';
            if (id === 'heroes') return 'heroes';
            if (id === 'calendar') return 'calendar';
            if (id === 'profile') return 'profile';
        }
        return id;
    };

    const effectiveActiveTab = getEffectiveActiveId(activeTab);

    // BRAND COLORS
    const activeColor = '#000000';
    const inactiveColor = theme === 'light' ? '#717171' : '#B0B0B0';
    const brandYellow = '#FFCC02';
    const softYellowBg = '#FFF9E5';

    // Circle sizing for the background
    const circleSize = Math.round(fluidMobilePx(viewportWidth, 38, 42));

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
                                width: circleSize,
                                height: circleSize,
                                borderRadius: '50%',
                                backgroundColor: isActive ? softYellowBg : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                marginBottom: '2px',
                                position: 'relative'
                            }}
                        >
                            {isActive ? (
                                <>
                                    {/* Sub-layer for the solid yellow fill */}
                                    <Icon
                                        size={iconSize}
                                        strokeWidth={0}
                                        fill={brandYellow}
                                        style={{ position: 'absolute' }}
                                    />
                                    {/* Top layer for the black outline and internal details */}
                                    <Icon
                                        size={iconSize}
                                        strokeWidth={2}
                                        color="#000000"
                                        fill="none"
                                        style={{ position: 'relative', zIndex: 1 }}
                                    />
                                </>
                            ) : (
                                <Icon
                                    size={iconSize}
                                    strokeWidth={2}
                                    color={inactiveColor}
                                    fill="none"
                                />
                            )}
                        </div>
                        <span
                            style={{
                                fontSize: labelSize,
                                fontWeight: isActive ? 500 : 500,
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
