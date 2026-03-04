"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    Calendar,
    User,
    ChevronRight,
    Star
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { OrderDetails } from './OrderCard';
import { useIsMobileViewport } from '@/lib/mobileOnly';

interface OrderHistoryCarouselProps {
    orders: OrderDetails[];
    onSelectOrder?: (order: OrderDetails) => void;
}

const OrderHistoryCarousel = ({ orders, onSelectOrder }: OrderHistoryCarouselProps) => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isMobile = useIsMobileViewport(968);

    const c = {
        bg: theme === 'light' ? '#FFFFFF' : '#1A1A1A',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#545454' : '#A0A0A0',
        border: theme === 'light' ? '#E2E2E2' : '#2D2D2D',
        surface: theme === 'light' ? '#F3F3F3' : '#111111',
        card: theme === 'light' ? '#FFFFFF' : '#1A1A1A',
        accent: '#007AFF'
    };

    return (
        <div style={{ width: '100%', marginBottom: '4rem' }}>
            <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: 950, color: c.text, letterSpacing: '-0.04em', fontFamily: 'Uber Move, var(--font-sans)', marginBottom: '0.5rem' }}>
                    {t({ en: 'Recent Activity', fr: 'Activité récente' })}
                </h3>
            </div>

            <div
                className="no-scrollbar"
                style={{
                    display: 'flex',
                    gap: '1.25rem',
                    overflowX: 'auto',
                    paddingBottom: '1.5rem',
                    scrollSnapType: 'x mandatory',
                    scrollBehavior: 'smooth',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {[...orders].reverse().map((order, idx) => {
                    const statusLabel = order.status || 'new';

                    return (
                        <motion.div
                            key={order.id || idx}
                            whileHover={{ y: -4 }}
                            onClick={() => onSelectOrder?.(order)}
                            style={{
                                flex: '0 0 auto',
                                width: isMobile ? '300px' : '340px',
                                backgroundColor: c.card,
                                borderRadius: '24px',
                                padding: '1.5rem',
                                border: `1px solid ${c.border}`,
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                scrollSnapAlign: 'start',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                <div>
                                    <h4 style={{ fontSize: '18px', fontWeight: 900, color: c.text, marginBottom: '4px', fontFamily: 'Uber Move, var(--font-sans)', letterSpacing: '-0.02em' }}>
                                        {order.service}
                                    </h4>
                                    <div style={{ fontSize: '13px', color: c.accent, fontWeight: 800 }}>
                                        {order.subServiceDisplayName}
                                    </div>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 950, color: c.text }}>
                                    {order.price} <span style={{ fontSize: '10px', color: c.textMuted }}>MAD</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: c.text, opacity: 0.8, fontSize: '14px', fontWeight: 600 }}>
                                    <Calendar size={14} strokeWidth={2.5} />
                                    {order.date}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: c.text, opacity: 0.8, fontSize: '14px', fontWeight: 600 }}>
                                    <Clock size={14} strokeWidth={2.5} />
                                    {order.time || '10:00'}
                                </div>
                            </div>

                            {/* Bricoler Info */}
                            <div style={{
                                marginTop: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingTop: '1.25rem',
                                borderTop: `1px solid ${c.border}66`
                            }}>
                                {order.bricolerId ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            backgroundColor: '#1C1C1E',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {order.bricolerAvatar ? (
                                                <img src={order.bricolerAvatar} alt="bricoler" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <User size={16} color="#FFF" />
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 800, color: c.text }}>{order.bricolerName}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                <Star size={10} fill="#FFC244" color="#FFC244" />
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: c.textMuted }}>{order.bricolerRating || '5.0'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: c.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FFC244', animation: 'pulse 2s infinite' }} />
                                        {t({ en: 'Matching...', fr: 'Recherche...' })}
                                    </div>
                                )}

                                <div style={{
                                    padding: '6px 14px',
                                    backgroundColor: c.surface,
                                    borderRadius: '100px',
                                    fontSize: '12px',
                                    fontWeight: 900,
                                    color: c.text
                                }}>
                                    {t({ en: 'Details', fr: 'Détails' })}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default OrderHistoryCarousel;
