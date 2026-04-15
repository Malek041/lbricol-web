"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Package, X, Star, Calendar } from 'lucide-react';
import { format } from 'date-fns';
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
    locationDetails?: any;
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
    carRentalNote?: string | null;
    providerAddress?: string | null;
    durationDays?: number;
    basePrice?: number;
    movingVehicle?: string | null;
    coords?: { lat: number; lng: number } | null;
    details?: any;
    providerStatus?: 'heading' | 'arrived' | 'working' | null;
    expectedEndTime?: any;
    distanceKm?: number;
    fee?: number;
    estimatedDuration?: number;
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

    const [currentTime, setCurrentTime] = React.useState(new Date());
    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const getProgress = () => {
        if (!order.date || !order.time) return 10;
        try {
            const rawTime = order.time.split('-')[0].trim();
            const timePart = rawTime.includes(':') ? (rawTime.split(':').length === 2 ? `${rawTime}:00` : rawTime) : `${rawTime}:00:00`;
            const datePart = order.date.split('T')[0];
            const targetDate = new Date(`${datePart}T${timePart}`);
            if (isNaN(targetDate.getTime())) return 10;
            const now = currentTime.getTime();
            const target = targetDate.getTime();
            const diffMs = target - now;
            if (diffMs <= 0) return 100;
            const windowMs = 24 * 60 * 60 * 1000;
            if (diffMs > windowMs) return 5;
            return Math.max(5, Math.floor(((windowMs - diffMs) / windowMs) * 100));
        } catch (e) { return 10; }
    };

    const getTimeRemaining = () => {
        if (!order.date || !order.time) return null;
        try {
            const rawTime = order.time.split('-')[0].trim();
            const timePart = rawTime.includes(':') ? (rawTime.split(':').length === 2 ? `${rawTime}:00` : rawTime) : `${rawTime}:00:00`;
            const datePart = order.date.split('T')[0];
            const targetDate = new Date(`${datePart}T${timePart}`);
            if (isNaN(targetDate.getTime())) return null;
            const diffMs = targetDate.getTime() - currentTime.getTime();
            if (diffMs < 0) return null;
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            if (hours > 24) return `(${Math.floor(hours / 24)}${t({ en: 'd left', fr: 'j rest.', ar: 'ي متبقية' })})`;
            if (hours > 0) return `(${hours}h ${mins}m ${t({ en: 'left', fr: 'rest.', ar: 'متبقية' })})`;
            return `(${mins}m ${t({ en: 'left', fr: 'rest.', ar: 'متبقية' })})`;
        } catch (e) { return null; }
    };

    const progress = getProgress();
    const timeLeft = getTimeRemaining();

    const cardStyles: React.CSSProperties = {
        position: 'relative',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'flex-start' : 'center',
        padding: isMobile ? `20px` : '24px',
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        border: `1.5px solid #F3F4F6`,
        overflow: 'hidden',
        width: '100%',
        gap: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            style={cardStyles}
        >
            {onCancel && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onCancel();
                    }}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90 z-[30]"
                >
                    <X size={18} strokeWidth={2.5} />
                </button>
            )}

            {/* Content Area */}
            <div style={{ flex: 1, position: 'relative', zIndex: 10 }}>
                {/* Top Metadata Row */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#01A083] bg-[#E6F6F2] px-2.5 py-1 rounded-full">
                        {order.status || 'New'}
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-200" />
                    <span className="text-[13px] font-bold text-neutral-400">
                        {order.date ? (typeof order.date === 'string' ? order.date : format(new Date(order.date), 'MMM d, yyyy')) : '---'}
                    </span>
                    {order.time && (
                        <>
                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-200" />
                            <span className="text-[13px] font-bold text-neutral-400">{order.time}</span>
                        </>
                    )}
                </div>

                {/* Main Heading */}
                <h3 style={{ 
                    fontSize: isMobile ? '20px' : '24px', 
                    fontWeight: 900, 
                    color: '#000000', 
                    marginBottom: '8px', 
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2
                }}>
                    {(() => {
                        const config = getServiceById(order.serviceId || order.service);
                        const stableBase = config ? config.name : formatServiceName(order.service);
                        const translatedBase = t({ en: stableBase, fr: stableBase });

                        const subDisplay = getSubServiceName(order.serviceId || order.service, order.subService || '') || order.subServiceDisplayName;
                        const translatedSub = subDisplay ? t({ en: subDisplay, fr: subDisplay }) : '';

                        return (
                            <>
                                {translatedBase}
                                {translatedSub && <span className="text-neutral-400 ml-1.5">› {translatedSub}</span>}
                            </>
                        );
                    })()}
                </h3>

                {/* Details Summary */}
                <div style={{ fontSize: '15px', color: '#6B7280', fontWeight: 500, lineHeight: 1.5 }}>
                   <p className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-neutral-400" />
                        {order.city ? t({ en: order.city, fr: order.city }) : (order.location ? t({ en: order.location, fr: order.location }) : 'Morocco')}
                   </p>
                   
                   <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-[18px] font-black text-black">{order.price} MAD</span>
                            <div className="w-1 h-1 rounded-full bg-neutral-200" />
                            <button className="text-[14px] font-bold text-[#01A083] hover:underline transition-all">
                                {t({ en: 'View details', fr: 'Détails', ar: 'تفاصيل' })}
                            </button>
                        </div>

                        {order.bricolerName && (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-neutral-100 overflow-hidden border border-neutral-100">
                                    <img
                                        src={order.bricolerAvatar || '/Images/DefaultAvatar.webp'}
                                        alt={order.bricolerName}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <span className="text-[14px] font-bold text-black">{order.bricolerName}</span>
                            </div>
                        )}
                   </div>
                </div>
            </div>

            {/* Right Side Illustration - Airbnb Style Pin */}
            {(!isMobile || order.images?.length || order.selectedCar) && (
                <div className="relative shrink-0 flex items-center justify-center">
                    <div style={{
                        width: isMobile ? '100%' : '80px',
                        height: isMobile ? '140px' : '80px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        border: '1px solid #F3F4F6'
                    }}>
                        {order.images && order.images.length > 0 ? (
                            <img
                                src={order.images[0]}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                        ) : order.selectedCar ? (
                            <img
                                src={order.selectedCar.modelImage || order.selectedCar.image}
                                alt="Car"
                                className="w-full h-full object-contain p-2"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                <Package size={32} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default OrderCard;
