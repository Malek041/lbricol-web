"use client";

import React from 'react';
import { Briefcase, Calendar, MessageCircle, User, Home, Menu } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export type TabType = 'home' | 'jobs' | 'calendar' | 'messages' | 'performance' | 'profile';

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
        { id: 'jobs' as TabType, icon: Briefcase, label: 'Jobs' },
        { id: 'calendar' as TabType, icon: Calendar, label: 'Calendar' },
        { id: 'messages' as TabType, icon: MessageCircle, label: 'Messages' },
        { id: 'profile' as TabType, icon: Menu, label: 'Menu' },
    ];

    const clientTabs = [
        { id: 'home' as TabType, icon: Home, label: 'Home' },
        { id: 'calendar' as TabType, icon: Calendar, label: 'Calendar' },
        { id: 'messages' as TabType, icon: MessageCircle, label: 'Messages' },
        { id: 'profile' as TabType, icon: User, label: 'Profile' },
    ];

    const tabs = variant === 'provider' ? providerTabs : clientTabs;

    const activeColor = theme === 'light' ? '#000000' : '#FFFFFF';
    const inactiveColor = theme === 'light' ? '#717171' : '#B0B0B0';

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
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: variant === 'provider' ? '0px' : '4px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: variant === 'provider' ? '10px 12px' : '4px 12px',
                            transition: 'all 0.2s ease',
                            flex: 1,
                        }}
                    >
                        <Icon
                            size={variant === 'provider' ? 34 : 24}
                            strokeWidth={isActive ? 2.5 : 2}
                            color={isActive ? activeColor : inactiveColor}
                            style={{ transition: 'all 0.2s ease' }}
                        />
                        {variant !== 'provider' && (
                            <span
                                style={{
                                    fontSize: '10px',
                                    fontWeight: isActive ? 600 : 500,
                                    color: isActive ? activeColor : inactiveColor,
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {tab.label}
                            </span>
                        )}
                    </button>
                );
            })}
        </nav>
    );
};

export default MobileBottomNav;
