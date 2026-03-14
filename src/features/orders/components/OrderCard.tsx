"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Package, X, Star } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { fluidMobilePx, useIsMobileViewport, useMobileTier, useViewportWidth } from '@/lib/mobileOnly';
import { getServiceById, getSubServiceName } from '@/config/services_config';

export interface OrderDetails {
    id?: string;
    service: string;
    serviceId?: string;
    serviceName?: string;
    subService?: string;
    subServiceName?: string;
    subServiceDisplayName?: string;
    city?: string;
    area?: string;
    address?: string;


    location: string;
    date: string;
    time?: string;
    price: string;
    finalPrice?: number;
    status?: 'new' | 'confirmed' | 'pending' | 'cancelled' | 'done' | 'negotiating' | 'programmed' | 'waiting' | 'delivered' | 'accepted' | 'in_progress' | 'redistributed_by_provider' | 'matching';
    providerConfirmed?: boolean;
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
    frequency?: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
    nextRunDate?: string;
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
    bricolerId?: string | null;
    bricolerName?: string | null;
    bricolerAvatar?: string | null;
    bricolerRating?: number | null;
    bricolerJobsCount?: number | null;
    bricolerRank?: 'New' | 'Classic' | 'Pro' | 'Elite' | null;
    acceptedOffer?: any;
    clientName?: string;
    clientId?: string;
    clientAvatar?: string;
    confirmedAt?: any;
    responseTimeMinutes?: number;
    clientWhatsApp?: string;
    bricolerWhatsApp?: string | null;
    selectedCar?: any;
    carReturnDate?: string | null;
    carReturnTime?: string | null;
    durationDays?: number;
    basePrice?: number;
}

interface OrderCardProps {
    order: OrderDetails;
    onCancel: () => void;
}

const OrderCard = ({ order, onCancel }: OrderCardProps) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const isMobile = useIsMobileViewport(968);
    const mobileTier = useMobileTier();
    const viewportWidth = useViewportWidth();
    const isCompactPhone = isMobile && mobileTier === 'compact';

    const cardPadding = `${Math.round(fluidMobilePx(viewportWidth, 14, 20))}px`;
    const titleSize = `${Math.round(fluidMobilePx(viewportWidth, 17, 19))}px`;
    const bodySize = `${Math.round(fluidMobilePx(viewportWidth, 13, 15))}px`;
    const badgeSize = `${Math.round(fluidMobilePx(viewportWidth, 12, 14))}px`;

    const c = {
        bg: theme === 'light' ? '#F7F7F7' : '#1A1A1A',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#545454' : '#A0A0A0',
        border: theme === 'light' ? '#E2E2E2' : '#2D2D2D',
        card: theme === 'light' ? '#FFFFFF' : '#111111'
    };

    const formatServiceName = (name: string) => {
        if (!name) return '';
        return name
            .replace(/[_-]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
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
                padding: isMobile ? cardPadding : '2rem',
                backgroundColor: c.bg,
                borderRadius: '24px',
                border: `1px solid ${c.border}`,
                overflow: 'hidden',
                width: '100%',
                gap: isCompactPhone ? '0.9rem' : '1.25rem'
            }}
        >
            {onCancel && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onCancel();
                    }}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur-md border border-neutral-100 shadow-sm flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-white transition-all active:scale-90 z-[30]"
                >
                    <X size={18} strokeWidth={2.5} />
                </button>
            )}

            {/* Left Content Area */}
            <div style={{ flex: 1, position: 'relative', zIndex: 10 }}>
                <h3 style={{ fontSize: isMobile ? titleSize : '1.5rem', fontWeight: 900, color: c.text, marginBottom: '0.4rem', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontFamily: 'Uber Move, var(--font-sans)', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                    {(() => {
                        const config = getServiceById(order.serviceId || order.service);
                        const stableBase = config ? config.name : formatServiceName(order.service);
                        const translatedBase = t({ en: stableBase, fr: stableBase });

                        const subDisplay = getSubServiceName(order.serviceId || order.service, order.subService || '') || order.subServiceDisplayName;
                        const translatedSub = subDisplay ? t({ en: subDisplay, fr: subDisplay }) : '';

                        return (
                            <>
                                {translatedBase}
                                {translatedSub && <span style={{ opacity: 0.6, fontWeight: 600, fontSize: '0.9em', marginLeft: '2px' }}> › {translatedSub}</span>}
                            </>
                        );
                    })()}
                    {order.rating && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#FFC24422', padding: '4px 10px', borderRadius: '100px', fontSize: badgeSize, color: '#FFC244' }}>
                            <Star size={14} fill="#FFC244" />
                            {order.rating}
                        </div>
                    )}
                </h3>
                <p style={{ fontSize: isMobile ? bodySize : '15px', color: c.textMuted, fontWeight: 500, lineHeight: 1.6, maxWidth: '440px', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                    {(() => {
                        const loc = order.city ? t({ en: order.city, fr: order.city }) : (order.location ? t({ en: order.location, fr: order.location }) : '');
                        const isCarRental = order.service === 'car_rental' || order.serviceId === 'car_rental';
                        
                        if (isCarRental && order.date && order.carReturnDate) {
                            return (
                                <div className="space-y-4">
                                    <p>{order.bricolerName ? (
                                        t({
                                            en: `${order.bricolerName} is scheduled for your car rental at ${loc}.`,
                                            fr: `${order.bricolerName} est prévu pour votre location de voiture à ${loc}.`,
                                            ar: `${order.bricolerName} مبرمج لتأجير سيارتك في ${loc}.`
                                        })
                                    ) : (
                                        t({
                                            en: `Your car rental request at ${loc} is being processed.`,
                                            fr: `Votre demande de location de voiture à ${loc} est en cours de traitement.`,
                                            ar: `طلب تأجير سيارتك في ${loc} قيد المعالجة.`
                                        })
                                    )}</p>
                                    
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: '15px', 
                                        padding: '12px 16px', 
                                        backgroundColor: theme === 'light' ? '#00A08208' : '#00A08215', 
                                        borderRadius: '16px', 
                                        border: `1px dashed ${theme === 'light' ? '#00A08233' : '#00A08255'}`,
                                        marginTop: '4px'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontSize: '10px', fontWeight: 900, color: '#00A082', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '2px' }}>{t({ en: 'Pickup', fr: 'Départ', ar: 'الاستلام' })}</span>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: c.text }}>{order.date} <span style={{ opacity: 0.6 }}>{order.time}</span></div>
                                        </div>
                                        <div style={{ width: '1px', backgroundColor: theme === 'light' ? '#00A08222' : '#00A08244' }} />
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontSize: '10px', fontWeight: 900, color: '#008C74', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '2px' }}>{t({ en: 'Return', fr: 'Retour', ar: 'الاسترجاع' })}</span>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: c.text }}>{order.carReturnDate} <span style={{ opacity: 0.6 }}>{order.carReturnTime}</span></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return order.bricolerName ? (
                            t({
                                en: `${order.bricolerName} is scheduled for your task at ${loc} on ${order.date} ${order.time ? 'at ' + order.time : ''}.`,
                                fr: `${order.bricolerName} est prévu pour votre tâche à ${loc} le ${order.date} ${order.time ? 'à ' + order.time : ''}.`,
                                ar: `${order.bricolerName} مبرمج لمهمتك في ${loc} يوم ${order.date} ${order.time ? 'على الساعة ' + order.time : ''}.`
                            })
                        ) : (
                            t({
                                en: `Your request at ${loc} for ${order.date} ${order.time ? 'at ' + order.time : ''} is being processed.`,
                                fr: `Votre demande à ${loc} pour ${order.date} ${order.time ? 'à ' + order.time : ''} est en cours de traitement.`,
                                ar: `طلبك في ${loc} ليوم ${order.date} ${order.time ? 'على الساعة ' + order.time : ''} قيد المعالجة.`
                            })
                        );
                    })()}
                    <br />
                    <span style={{ fontWeight: 800, color: c.text }}>
                        {t({ en: 'Offer', fr: 'Offre', ar: 'عرض' })}: {order.price} MAD
                    </span>
                    {order.bricolerName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c.border, overflow: 'hidden' }}>
                                <img
                                    src={order.bricolerAvatar || '/Images/DefaultAvatar.webp'}
                                    alt={order.bricolerName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e: any) => e.target.src = '/Images/DefaultAvatar.webp'}
                                />
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: c.text }}>
                                {order.bricolerName}
                            </span>
                        </div>
                    )}
                    {!order.bricolerName && order.bricolersCount && order.bricolersCount > 0 && (
                        <span style={{ marginLeft: '12px', fontSize: '13px', backgroundColor: c.border, padding: '2px 8px', borderRadius: '4px', color: c.text }}>
                            {order.bricolersCount} {t({ en: 'Bricolers', fr: 'Bricoleurs', ar: 'عمال' })}
                        </span>
                    )}
                    {order.images && order.images.length > 0 && (
                        <span style={{ marginLeft: '12px', fontSize: '13px', backgroundColor: '#06C16722', padding: '2px 8px', borderRadius: '4px', color: '#06C167' }}>
                            {order.images.length} {t({ en: 'Photos', fr: 'Photos', ar: 'صور' })}
                        </span>
                    )}
                    {order.comment && (
                        <span style={{ display: 'block', marginTop: '8px', fontStyle: 'italic', fontSize: '14px', borderLeft: `2px solid ${c.border}`, paddingLeft: '12px' }}>
                            "{order.comment}"
                        </span>
                    )}
                </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: isCompactPhone ? '0.65rem' : '1rem', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
                <button style={{
                    padding: isMobile ? `${Math.round(fluidMobilePx(viewportWidth, 9, 10))}px ${Math.round(fluidMobilePx(viewportWidth, 16, 22))}px` : '0.625rem 1.75rem',
                    backgroundColor: (theme === 'light' ? '#FFFFFF' : '#000000'),
                    color: c.text,
                    fontSize: isMobile ? badgeSize : '14px',
                    fontWeight: 800,
                    borderRadius: '100px',
                    border: `1px solid ${c.border}`,
                    cursor: 'pointer',
                    boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none'
                }}>
                    {t({ en: 'Details', fr: 'Détails', ar: 'تفاصيل' })}
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
                        ) : order.selectedCar ? (
                            <img
                                src={order.selectedCar.modelImage || order.selectedCar.image}
                                alt="Car preview"
                                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }}
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
