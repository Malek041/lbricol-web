"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, X, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export interface OrderDetails {
    id?: string;
    service: string;
    subService?: string;
    subServiceDisplayName?: string;
    city?: string;
    area?: string;

    location: string;
    date: string;
    time?: string;
    price: string;
    finalPrice?: number;
    status?: 'new' | 'confirmed' | 'pending' | 'cancelled' | 'done' | 'negotiating' | 'programmed';
    taskSize?: string;
    rating?: number;
    feedback?: string;
    rated?: boolean;
    bricolersCount?: number;
    duration?: string;
    comment?: string;
    images?: string[];
    craft?: string;
    description?: string;
    totalPrice?: number;
    createdAt?: any;
    tags?: string[];
    bankReceipt?: string;
    paymentMethod?: string;
    offers?: {
        bricolerId: string;
        bricolerName: string;
        rating: number;
        jobsCount: number;
        price: number;
        type: 'accept' | 'counter';
        comment?: string;
        avatar?: string;
        sender?: 'client' | 'provider';
        timestamp?: any;
    }[];
    bricolerId?: string;
    bricolerName?: string;
    bricolerAvatar?: string;
    bricolerRating?: number;
    bricolerJobsCount?: number;
    bricolerRank?: 'New' | 'Pro' | 'Elite';
    acceptedOffer?: any;
    clientName?: string;
    clientId?: string;
    clientAvatar?: string;
}

interface OrderCardProps {
    order: OrderDetails;
    onCancel: () => void;
}

const OrderCard = ({ order, onCancel }: OrderCardProps) => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth <= 968);
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const c = {
        bg: theme === 'light' ? '#F7F7F7' : '#1A1A1A',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#545454' : '#A0A0A0',
        border: theme === 'light' ? '#E2E2E2' : '#2D2D2D',
        card: theme === 'light' ? '#FFFFFF' : '#111111'
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                padding: isMobile ? '1.25rem' : '2rem',
                backgroundColor: c.bg,
                borderRadius: '24px',
                border: `1px solid ${c.border}`,
                overflow: 'hidden',
                width: '100%',
                gap: '1.25rem'
            }}
        >
            {/* Left Content Area */}
            <div style={{ flex: 1, position: 'relative', zIndex: 10 }}>
                <h3 style={{ fontSize: isMobile ? '1.15rem' : '1.5rem', fontWeight: 900, color: c.text, marginBottom: '0.4rem', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontFamily: 'Uber Move, var(--font-sans)' }}>
                    {order.service}{order.subServiceDisplayName && <span style={{ opacity: 0.6, fontWeight: 600, fontSize: '0.9em', marginLeft: '2px' }}> › {order.subServiceDisplayName}</span>}
                    {order.rating && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#FFC24422', padding: '4px 10px', borderRadius: '100px', fontSize: '14px', color: '#FFC244' }}>
                            <Star size={14} fill="#FFC244" />
                            {order.rating}
                        </div>
                    )}
                </h3>
                <p style={{ fontSize: '15px', color: c.textMuted, fontWeight: 500, lineHeight: 1.6, maxWidth: '440px' }}>
                    {t({
                        en: `Your request at ${order.location} for ${order.date} ${order.time ? 'at ' + order.time : ''} is being processed.`,
                        fr: `Votre demande à ${order.location} pour ${order.date} ${order.time ? 'à ' + order.time : ''} est en cours de traitement.`
                    })}
                    <br />
                    <span style={{ fontWeight: 800, color: c.text }}>
                        {t({ en: 'Offer', fr: 'Offre' })}: {order.price} MAD
                    </span>
                    {order.bricolersCount && order.bricolersCount > 1 && (
                        <span style={{ marginLeft: '12px', fontSize: '13px', backgroundColor: c.border, padding: '2px 8px', borderRadius: '4px', color: c.text }}>
                            {order.bricolersCount} Bricolers
                        </span>
                    )}
                    {order.images && order.images.length > 0 && (
                        <span style={{ marginLeft: '12px', fontSize: '13px', backgroundColor: '#06C16722', padding: '2px 8px', borderRadius: '4px', color: '#06C167' }}>
                            {order.images.length} {t({ en: 'Photos', fr: 'Photos' })}
                        </span>
                    )}
                    {order.comment && (
                        <span style={{ display: 'block', marginTop: '8px', fontStyle: 'italic', fontSize: '14px', borderLeft: `2px solid ${c.border}`, paddingLeft: '12px' }}>
                            "{order.comment}"
                        </span>
                    )}
                </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button style={{
                    padding: '0.625rem 1.75rem',
                    backgroundColor: (theme === 'light' ? '#FFFFFF' : '#000000'),
                    color: c.text,
                    fontSize: '14px',
                    fontWeight: 800,
                    borderRadius: '100px',
                    border: `1px solid ${c.border}`,
                    cursor: 'pointer',
                    boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                }}>
                    {t({ en: 'Details', fr: 'Détails' })}
                </button>
                <button
                    onClick={onCancel}
                    style={{
                        padding: '10px',
                        color: c.textMuted,
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s'
                    }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Right Illustration */}
            {!isMobile && (
                <div style={{ position: 'relative', width: '100px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <motion.div
                        animate={{ rotate: [-4, 0, -4] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            width: '70px',
                            height: '70px',
                            backgroundColor: c.card,
                            borderRadius: '14px',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: theme === 'light' ? '0 10px 30px rgba(0,0,0,0.1)' : '0 10px 30px rgba(0,0,0,0.5)',
                            border: `2px solid #FFF`,
                            position: 'relative'
                        }}
                    >
                        {order.images && order.images.length > 0 ? (
                            <img
                                src={order.images[0]}
                                alt="Service preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <Package size={32} color={c.textMuted} />
                        )}
                    </motion.div>
                    {order.images && order.images.length > 1 && (
                        <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: '10px',
                            backgroundColor: '#000',
                            color: '#FFF',
                            fontSize: '10px',
                            fontWeight: 900,
                            padding: '2px 6px',
                            borderRadius: '6px',
                            zIndex: 20
                        }}>
                            +{order.images.length - 1}
                        </div>
                    )}
                </div>
            )}

            {/* Progress Bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '3px', backgroundColor: theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)' }}>
                <motion.div
                    initial={{ width: '0%', opacity: 0.3 }}
                    animate={{ width: '40%', opacity: 0.3 }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                    style={{ height: '100%', backgroundColor: c.text }}
                />
            </div>
        </motion.div >
    );
};

export default OrderCard;
