"use client";

import React from 'react';
import { ShoppingBag, Star, User, Home, Calendar, TrendingUp } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export type TabType = 'home' | 'heroes' | 'orders' | 'profile' | 'jobs' | 'calendar' | 'messages' | 'performance';

interface MobileBottomNavProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    variant?: 'client' | 'provider';
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
    activeTab,
    onTabChange,
    variant = 'client'
}) => {
    const { theme } = useTheme();

    const providerTabs = [
        { id: 'jobs' as TabType, icon: Home, label: 'Home' },
        { id: 'calendar' as TabType, icon: Calendar, label: 'Calendar' },
        { id: 'performance' as TabType, icon: TrendingUp, label: 'Stats' },
        { id: 'profile' as TabType, icon: User, label: 'Profile' },
    ];

    const clientTabs = [
        { id: 'home' as TabType, icon: Home, label: 'Home' },
        { id: 'heroes' as TabType, icon: Star, label: 'Ma Heroes' },
        { id: 'calendar' as TabType, icon: ShoppingBag, label: 'Orders' },
        { id: 'profile' as TabType, icon: User, label: 'Profile' },
    ];

    const tabs = variant === 'provider' ? providerTabs : clientTabs;

    const getEffectiveActiveId = (id: TabType) => {
        if (variant === 'provider') {
            if (id === 'jobs') return 'jobs';
            if (id === 'calendar') return 'calendar';
            if (id === 'performance') return 'performance';
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
    const activeBgColor = '#FFDC62'; // Glovo-style yellow circular background

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
                boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.08)',
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

