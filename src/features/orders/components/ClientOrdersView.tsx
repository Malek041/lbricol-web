"use client";

import { safeStorage } from '@/lib/safeStorage';
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderDetails } from '@/features/orders/components/OrderCard';
import { ChevronLeft, Info, MessageCircle, MessageSquare, Image, HelpCircle, X, MapPin, Clock, Calendar as CalendarIcon, Phone, User, Ban, Check, AlertTriangle, RefreshCw, CreditCard, Wrench, Banknote, Star, Home, Layout, Sparkles, AlertCircle, Loader2, Calendar, Camera, Mic, Shield } from 'lucide-react';
import MessagesView from '@/features/messages/components/MessagesView';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { WhatsAppBrandIcon } from '@/components/shared/WhatsAppIcon';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, increment, serverTimestamp, getDoc, addDoc, collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { getServiceById, getSubServiceName, getServiceVector, getSubService } from '@/config/services_config';
import { format, isToday, isThisWeek, parseISO, startOfDay, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { arMA } from 'date-fns/locale/ar-MA';
import { calculateOrderPrice } from '@/lib/pricing';
import { formatForWhatsApp } from '@/lib/phoneUtils';



interface ClientOrdersViewProps {
    orders: OrderDetails[];
    onViewMessages: (jobId: string) => void;
    initialShowHistory?: boolean;
    onResumeDraft?: (draft: any) => void;
    onViewingOrderDetails?: (isViewing: boolean) => void;
}

// ── Shared Hook for Progress ────────────────────────────────────────────────
// Updated OrderDetails with car rental specific fields
export const useOrderProgress = () => {
    const { t } = useLanguage();
    const [currentTime, setCurrentTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const getProgress = (order: OrderDetails) => {
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

    const getReturnProgress = (order: OrderDetails) => {
        if (!order.carReturnDate || !order.carReturnTime || !order.date || !order.time) return 0;
        try {
            const rawStartTime = order.time.split('-')[0].trim();
            const startTimePart = rawStartTime.includes(':') ? (rawStartTime.split(':').length === 2 ? `${rawStartTime}:00` : rawStartTime) : `${rawStartTime}:00:00`;
            const startDatePart = order.date.split('T')[0];
            const startDate = new Date(`${startDatePart}T${startTimePart}`);

            const rawReturnTime = order.carReturnTime.split('-')[0].trim();
            const returnTimePart = rawReturnTime.includes(':') ? (rawReturnTime.split(':').length === 2 ? `${rawReturnTime}:00` : rawReturnTime) : `${rawReturnTime}:00:00`;
            const returnDatePart = order.carReturnDate.split('T')[0];
            const returnDate = new Date(`${returnDatePart}T${returnTimePart}`);

            if (isNaN(startDate.getTime()) || isNaN(returnDate.getTime())) return 0;

            const now = currentTime.getTime();
            const start = startDate.getTime();
            const end = returnDate.getTime();

            if (now >= end) return 100;
            if (now <= start) return 0;

            const totalDurationMs = end - start;
            const elapsedMs = now - start;
            return Math.min(100, Math.max(0, Math.floor((elapsedMs / totalDurationMs) * 100)));
        } catch (e) { return 0; }
    };

    const getTimeRemaining = (order: OrderDetails) => {
        if (!order.date || !order.time) return null;

        const isCarRental = order.service === 'car_rental';
        const isRentalInProgress = isCarRental && getProgress(order) === 100 && !['done', 'delivered', 'cancelled'].includes(order.status || '');

        let targetDate;
        try {
            if (isRentalInProgress && order.carReturnDate && order.carReturnTime) {
                const rawTime = order.carReturnTime.split('-')[0].trim();
                const timePart = rawTime.includes(':') ? (rawTime.split(':').length === 2 ? `${rawTime}:00` : rawTime) : `${rawTime}:00:00`;
                const datePart = order.carReturnDate.split('T')[0];
                targetDate = new Date(`${datePart}T${timePart}`);
            } else {
                const rawTime = order.time.split('-')[0].trim();
                const timePart = rawTime.includes(':') ? (rawTime.split(':').length === 2 ? `${rawTime}:00` : rawTime) : `${rawTime}:00:00`;
                const datePart = order.date.split('T')[0];
                targetDate = new Date(`${datePart}T${timePart}`);
            }

            if (isNaN(targetDate.getTime())) return null;
            const now = currentTime.getTime();
            const diffMs = targetDate.getTime() - now;
            if (diffMs <= 0) return null;
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            if (hours > 24) return `(${Math.floor(hours / 24)}${t({ en: 'd left', fr: 'j rest.', ar: 'ي متبقية' })})`;
            if (hours > 0) return `(${hours}h ${mins}m ${t({ en: 'left', fr: 'rest.', ar: 'متبقية' })})`;
            return `(${mins}m ${t({ en: 'left', fr: 'rest.', ar: 'متبقية' })})`;
        } catch (e) { return null; }
    };

    const getDynamicStatus = (order: OrderDetails) => {
        if (!order.date || !order.time) return order.status;

        const autoStatuses = ['confirmed', 'accepted', 'programmed', 'pending', 'in_progress'];
        if (!autoStatuses.includes(order.status || '')) return order.status;

        try {
            const start = getOrderStartTime(order);
            if (!start || isNaN(start.getTime())) return order.status;

            const now = currentTime.getTime();
            const startTime = start.getTime();

            // Use expectedEndTime if available, otherwise calculate fallback
            let endTime: number;
            if (order.expectedEndTime) {
                const end = order.expectedEndTime.toDate ? order.expectedEndTime.toDate() : new Date(order.expectedEndTime);
                endTime = end.getTime();
            } else {
                let durationHr = 2;
                // 1. Try to use explicit order duration if stored (e.g., "3h")
                if (order.duration) {
                    const parsed = parseFloat(String(order.duration).replace(/[^\d.]/g, ''));
                    if (!isNaN(parsed) && parsed > 0) durationHr = parsed;
                } else {
                    // 2. Try to get from config
                    const subServiceId = order.subService || '';
                    const subService = getSubService(order.service || '', subServiceId);
                    if (subService?.estimatedDurationHr) {
                        durationHr = subService.estimatedDurationHr;
                    }
                }
                endTime = startTime + (durationHr * 60 * 60 * 1000);
            }

            if (now < startTime) return 'on_time';
            if (now >= startTime && now < endTime) return 'in_progress';
            if (now >= endTime) return 'done';

            return order.status;
        } catch (e) {
            return order.status;
        }
    };

    const getOrderStartTime = (order: OrderDetails) => {
        try {
            const rawTime = order.time?.split('-')[0].trim();
            if (!rawTime) return null;
            const timePart = rawTime.includes(':') ? (rawTime.split(':').length === 2 ? `${rawTime}:00` : rawTime) : `${rawTime}:00:00`;
            const datePart = order.date.split('T')[0];
            return new Date(`${datePart}T${timePart}`);
        } catch (e) { return null; }
    };

    return { currentTime, getProgress, getReturnProgress, getTimeRemaining, getDynamicStatus };
};

// ── Calendar Tab Component ──────────────────────────────────────────────
function CalendarTab({
    orders,
    onSelectOrder,
    horizontalSelectedDate,
    setHorizontalSelectedDate
}: {
    orders: OrderDetails[],
    onSelectOrder: (o: OrderDetails) => void,
    horizontalSelectedDate: Date,
    setHorizontalSelectedDate: (d: Date) => void
}) {
    const { t, language } = useLanguage();
    const [viewMode, setViewMode] = useState<'day' | 'month'>('month');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const dateLocale = language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar-MA' : 'en-US';

    const getMonday = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return startOfDay(d);
    };

    const [weekStart, setWeekStart] = useState<Date>(() => getMonday(horizontalSelectedDate));
    const selectedDateStr = format(horizontalSelectedDate, 'yyyy-MM-dd');

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        return {
            date: d,
            dateStr: format(d, 'yyyy-MM-dd'),
            dayNum: d.toLocaleDateString(dateLocale, { day: 'numeric' }),
            dayLabel: d.toLocaleDateString(dateLocale, { weekday: 'short' })
        };
    });

    const validOrders = orders.filter(o => !(o.status as string)?.match(/cancelled|rejected/));
    const bookedDates = useMemo(() => {
        const set = new Set<string>();
        validOrders.forEach(o => set.add(o.date || ''));
        return set;
    }, [validOrders]);

    const weekLabel = `${weekStart.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' }).replace('2026', '').trim()}`;

    const hours = Array.from({ length: 15 }, (_, i) => 7 + i); // 7 AM to 9 PM

    const getTimePosition = (timeStr: string) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        const offsetHours = h - 7;
        const totalMins = offsetHours * 60 + (m || 0);
        return (totalMins / 60) * 100;
    };

    const getTimeHeight = (from: string, to: string) => {
        const start = getTimePosition(from);
        const end = getTimePosition(to);
        return Math.max(end - start, 110); // Min height 110 for mission visibility
    };

    const dayMissions = useMemo(() => {
        return validOrders.filter(o => o.date === selectedDateStr);
    }, [selectedDateStr, validOrders]);

    // Monthly View Helpers
    const [monthOffset, setMonthOffset] = useState(0);
    const viewMonth = useMemo(() => {
        const d = new Date();
        d.setMonth(d.getMonth() + monthOffset);
        return d;
    }, [monthOffset]);

    const monthDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [viewMonth]);

    const monthLabel = format(viewMonth, 'MMMM', {
        locale: language === 'fr' ? fr : language === 'ar' ? arMA : undefined
    });

    const weekdayShorts = language === 'ar'
        ? ['ح', 'ث', 'ر', 'خ', 'ج', 'س', 'ن'] // Starting Monday: ن, ث, ر, خ, ج, س, ح
        : language === 'fr'
            ? ['L', 'M', 'M', 'J', 'V', 'S', 'D']
            : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    const renderMonthView = () => (
        <div className="flex flex-col bg-white h-full overflow-y-auto no-scrollbar">
            <div className="p-4 sm:p-6 pb-24">
                {/* Minimal Header */}
                <div className="flex items-center justify-between mb-8 px-1">
                    <h2 className="text-[32px] font-bold text-black lowercase tracking-tight ">{monthLabel}</h2>
                    <div className="flex gap-4">
                        <button onClick={() => setMonthOffset(p => p - 1)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors active:scale-95">
                            <ChevronLeft size={24} />
                        </button>
                        <button onClick={() => setMonthOffset(p => p + 1)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors active:scale-95">
                            <ChevronLeft size={24} className="rotate-180" />
                        </button>
                    </div>
                </div>

                {/* Weekday Header */}
                <div className="grid grid-cols-7 mb-4">
                    {weekdayShorts.map((d, i) => (
                        <div key={i} className="text-center text-[12px] font-medium text-neutral-400 uppercase tracking-wider">{d}</div>
                    ))}
                </div>

                {/* Airbnb Style Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {monthDays.map((date, i) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const isCurrentMonth = isSameMonth(date, viewMonth);
                        const dayOrders = validOrders.filter(o => o.date === dateStr);
                        const isTodayDate = isSameDay(date, new Date());
                        const isSelected = isSameDay(date, horizontalSelectedDate);
                        const isPast = isBefore(date, startOfDay(new Date()));

                        return (
                            <div
                                key={i}
                                onClick={() => {
                                    setHorizontalSelectedDate(date);
                                    setWeekStart(getMonday(date));
                                    setViewMode('day');
                                }}
                                className={cn(
                                    "aspect-[1/1.5] sm:aspect-[1/1.2] border border-neutral-100 rounded-xl p-1.5 sm:p-2 flex flex-col items-start transition-all cursor-pointer relative",
                                    !isCurrentMonth && "opacity-0 pointer-events-none",
                                    isSelected && "border-black ring-[0.5px] ring-black shadow-sm bg-white",
                                    isPast && !isSelected && "bg-neutral-100/50",
                                    isTodayDate && !isSelected && "bg-neutral-50"
                                )}
                            >
                                <span className={cn(
                                    "text-[15px] font-bold mb-1.5 ml-0.5",
                                    isTodayDate ? "text-[#01A083]" : isPast ? "text-neutral-400 line-through" : "text-neutral-900",
                                    isSelected && "text-black no-underline"
                                )}>
                                    {format(date, 'd')}
                                </span>

                                {/* Order Pills (Airbnb style) */}
                                <div className="flex flex-col gap-1 w-full overflow-hidden mt-auto">
                                    {dayOrders.slice(0, 2).map((order: OrderDetails) => (
                                        <div
                                            key={order.id}
                                            className="w-full h-6 sm:h-7 rounded-lg bg-[#222222] flex items-center gap-1.5 px-1.5 shadow-sm overflow-hidden"
                                        >
                                            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-neutral-600 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                {order.bricolerAvatar ? (
                                                    <img src={order.bricolerAvatar} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={10} className="text-white/40" />
                                                )}
                                            </div>
                                            <span className="text-[9px] sm:text-[10px] font-bold text-white truncate leading-none">
                                                {order.bricolerName ? order.bricolerName.split(' ')[0] : t({ en: 'Matching', fr: 'Matching', ar: 'جاري' })}
                                            </span>
                                        </div>
                                    ))}
                                    {dayOrders.length > 2 && (
                                        <div className="text-[9px] font-bold text-neutral-400 ml-1">
                                            +{dayOrders.length - 2}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col bg-white h-full relative overflow-hidden">
            {/* Header with Jour/Mois Toggle - Tightened */}
            <div className="bg-white px-6 pt-4 pb-1 flex items-center justify-between sticky top-0 z-[40]">
                <div className="flex flex-col">
                    <span className="text-[26px] font-bold text-black leading-none tracking-tight">
                        {language === 'ar' ? 'الجدول الزمني' : language === 'fr' ? 'Planning' : 'Schedule'}
                    </span>
                    <span className="text-[12px] font-bold text-[#01A083] uppercase tracking-widest mt-1">
                        {viewMode === 'day' ? weekLabel : monthLabel}
                    </span>
                </div>

                <div className="flex bg-neutral-100 p-1 rounded-full">
                    <button
                        onClick={() => setViewMode('day')}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-[13px] font-bold transition-all",
                            viewMode === 'day' ? "bg-white text-[#000000]" : "text-neutral-400"
                        )}
                    >
                        {t({ en: 'Day', fr: 'Jour', ar: 'يوم' })}
                    </button>
                    <button
                        onClick={() => setViewMode('month')}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-[13px] font-bold transition-all",
                            viewMode === 'month' ? "bg-white text-[#01A083] shadow-sm" : "text-neutral-400"
                        )}
                    >
                        {t({ en: 'Month', fr: 'Mois', ar: 'شهر' })}
                    </button>
                </div>
            </div>

            {viewMode === 'month' ? renderMonthView() : (
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Horizontal Calendar strip - Tightened */}
                    <div className="bg-white px-4 pt-0 pb-3 flex-shrink-0 sticky top-[25px] z-30 mb-2 border-b border-neutral-50/50">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <button
                                onClick={() => setWeekStart(prev => addDays(prev, -7))}
                                className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center active:scale-95 transition-all"
                            >
                                <ChevronLeft size={16} className="text-black" />
                            </button>
                            <span className="text-[14px] font-bold text-black lowercase tracking-tight">{weekLabel}</span>
                            <button
                                onClick={() => setWeekStart(prev => addDays(prev, 7))}
                                className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center active:scale-95 transition-all"
                            >
                                <ChevronLeft size={16} className="text-black rotate-180" />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {weekDays.map(day => {
                                const isTodayDay = day.dateStr === todayStr;
                                const isSelected = day.dateStr === selectedDateStr;
                                const hasJobs = bookedDates.has(day.dateStr);
                                const isPast = isBefore(day.date, startOfDay(new Date()));

                                return (
                                    <button
                                        key={day.dateStr}
                                        onClick={() => setHorizontalSelectedDate(day.date)}
                                        className={cn(
                                            "flex flex-col items-center py-2.5 rounded-xl border border-black/10 transition-all relative overflow-hidden",
                                            isSelected
                                                ? "border-black ring-[0.5px] ring-black shadow-sm bg-white"
                                                : isPast
                                                    ? "bg-neutral-100/40"
                                                    : "bg-white hover:bg-neutral-50",
                                            isTodayDay && !isSelected && "bg-white"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-[9px] font-bold uppercase tracking-wider mb-1 opacity-60",
                                            isSelected ? "text-black opacity-100" : isPast ? "text-neutral-300" : "text-black",
                                            isTodayDay && !isSelected && "text-[#01A083] opacity-100"
                                        )}>
                                            {day.dayLabel.replace('.', '')}
                                        </span>
                                        <span className={cn(
                                            "text-[16px] font-bold leading-none",
                                            isSelected ? "text-black" : isPast ? "text-neutral-300 line-through" : isTodayDay ? "text-[#01A083]" : "text-black"
                                        )}>
                                            {day.dayNum}
                                        </span>
                                        {hasJobs && !isSelected && (
                                            <div className="absolute top-1.5 right-1.5 w-1 h-1 bg-[#222222] rounded-full" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar relative bg-[#FAFAFA] pb-32">
                        <div className="relative min-h-[1550px] w-full">
                            {/* Timeline Grid */}
                            <div className="absolute inset-0 pt-6 px-0">
                                {hours.map((h) => (
                                    <div key={h} className="flex h-[100px] border-b border-neutral-100/60 group">
                                        <div className="w-16 flex-none flex flex-col items-end justify-start pr-3 -mt-2.5">
                                            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-tighter">
                                                {new Date(2000, 0, 1, h, 0).toLocaleTimeString(dateLocale, { hour: 'numeric', hour12: true })}
                                            </span>
                                        </div>
                                        <div className="flex-1 border-l border-neutral-100/60 relative">
                                            <div className="absolute top-[50px] left-0 right-0 border-t border-[#FAFAFA] border-dashed" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Main Missions Layer */}
                            <div className="absolute inset-0 pt-6 left-16">
                                {dayMissions.map((order) => {
                                    const fromTime = order.time?.split('-')[0].trim() || "09:00";
                                    const toTime = order.time?.split('-')[1]?.trim() || "11:00";
                                    return (
                                        <motion.div
                                            key={order.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() => onSelectOrder(order)}
                                            className="absolute left-4 right-6 rounded-[24px] bg-white border border-neutral-100/80 p-5 z-20 cursor-pointer shadow-md shadow-neutral-200/30 hover:shadow-lg transition-all flex flex-col gap-3"
                                            style={{
                                                top: getTimePosition(fromTime) + 4,
                                                height: Math.max(getTimeHeight(fromTime, toTime) - 8, 140)
                                            }}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-neutral-50 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
                                                    {order.images && order.images.length > 0 ? (
                                                        <img src={order.images[0]} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <img src={getServiceVector(order.service)} alt={order.service} className="w-10 h-10 object-contain" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[18px] font-bold text-black truncate uppercase tracking-tight">
                                                            {order.subServiceDisplayName || order.service}
                                                        </span>
                                                        <div className="w-7 h-7 rounded-full bg-[#00BFA5] flex items-center justify-center shadow-sm">
                                                            <Check size={14} className="text-white fill-white" strokeWidth={3} />
                                                        </div>
                                                    </div>
                                                    <p className="text-[14px] font-medium text-neutral-400 truncate">
                                                        {order.bricolerName || t({ en: 'Matching...', fr: 'Matching...', ar: 'جاري البحث...' })} • {order.city || (typeof order.location === 'object' ? (order.location as any).address : order.location)}
                                                    </p>
                                                    <p className="text-[15px] font-bold text-[#01A083] mt-2 tracking-tight">
                                                        {fromTime}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ClientOrdersView({ orders, onViewMessages, initialShowHistory = false, onResumeDraft, onViewingOrderDetails }: ClientOrdersViewProps) {
    const { t, language } = useLanguage();
    const { showToast } = useToast();
    const { getDynamicStatus } = useOrderProgress();

    // ── Shared Helpers & State ──────────────────────────────────────────
    const [currentTime, setCurrentTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Use helpers from useOrderProgress for consistency
    const { getProgress, getReturnProgress, getTimeRemaining } = useOrderProgress();
    const [activeTab, setActiveTab] = useState<'activity' | 'calendar'>('calendar');
    const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
    const [liveBricolerInfo, setLiveBricolerInfo] = useState<{ rating: number, jobsCount: number } | null>(null);

    const openWhatsApp = async (number?: string | null, bricolerId?: string | null) => {
        let targetNumber = number;

        if (!targetNumber && bricolerId) {
            try {
                const bricolerSnap = await getDoc(doc(db, 'bricolers', bricolerId));
                if (bricolerSnap.exists()) {
                    targetNumber = bricolerSnap.data().whatsappNumber || bricolerSnap.data().phone;
                }
            } catch (err) {
                console.error("Error fetching bricoler contact for WhatsApp:", err);
            }
        }

        if (!targetNumber) {
            showToast({
                variant: 'error',
                title: t({ en: 'Error', fr: 'Erreur', ar: 'خطأ' }),
                description: t({ en: 'Bricoler WhatsApp number not found.', fr: 'Numéro WhatsApp du bricoleur introuvable.', ar: 'رقم واتساب البريكولر غير موجود.' })
            });
            return;
        }

        // Handle both old formats (9 digits) and new E.164 format (+212...)
        let finalNumber = '';
        if (targetNumber.startsWith('+')) {
            finalNumber = formatForWhatsApp(targetNumber);
        } else {
            const cleanNumber = targetNumber.replace(/\D/g, '');
            finalNumber = cleanNumber.startsWith('212') 
                ? cleanNumber 
                : '212' + (cleanNumber.startsWith('0') ? cleanNumber.slice(1) : cleanNumber);
        }
        
        window.open('https://wa.me/' + finalNumber, '_blank');
    };

    useEffect(() => {
        if (selectedOrder?.bricolerId) {
            const fetchLive = async () => {
                const bricolerId = selectedOrder.bricolerId as string;
                try {
                    const snap = await getDoc(doc(db, 'bricolers', bricolerId));
                    if (snap.exists()) {
                        const d = snap.data();
                        const reviews = d.reviews || [];
                        const jobsCount = d.jobsCompleted || d.completedJobs || d.numReviews || reviews.length || 0;
                        let rating = d.rating;
                        if (!rating && d.totalRating && reviews.length > 0) {
                            rating = d.totalRating / reviews.length;
                        } else if (!rating) {
                            rating = 0;
                        }

                        setLiveBricolerInfo({
                            rating,
                            jobsCount
                        });
                    }
                } catch (e) { }
            };
            fetchLive();
        } else {
            setLiveBricolerInfo(null);
        }
    }, [selectedOrder]);

    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [review, setReview] = useState('');
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);
    const [isRatedLocally, setIsRatedLocally] = useState<string[]>([]);
    const [showHistory, setShowHistory] = useState(initialShowHistory);
    const [horizontalSelectedDate, setHorizontalSelectedDate] = useState<Date>(new Date());
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isRedistributeCancellation, setIsRedistributeCancellation] = useState(false);

    useEffect(() => {
        if (onViewingOrderDetails) {
            onViewingOrderDetails(selectedOrder !== null && activeChatOrderId === null);
        }
    }, [selectedOrder, activeChatOrderId, onViewingOrderDetails]);

    // Filter orders for history (done and cancelled)
    const historyOrders = useMemo(() => {
        return orders.filter(o => {
            const status = getDynamicStatus(o);
            return ['done', 'cancelled', 'delivered'].includes(status || '');
        })
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [orders, getDynamicStatus]);

    // Cancel order
    const handleConfirmCancel = async () => {
        if (!selectedOrder?.id || isCancelling) return;
        if (!cancelReason.trim()) {
            alert(t({ en: 'Please provide a reason for cancellation.', fr: 'Veuillez indiquer une raison pour l\'annulation.', ar: 'يرجى تقديم سبب للإلغاء.' }));
            return;
        }

        setIsCancelling(true);
        try {
            await updateDoc(doc(db, 'jobs', selectedOrder.id), {
                status: 'cancelled',
                cancelReason,
                cancelledAt: serverTimestamp(),
                cancelledBy: 'client'
            });

            // Notify Bricoler if assigned
            if (selectedOrder.bricolerId) {
                await addDoc(collection(db, 'bricoler_notifications'), {
                    bricolerId: selectedOrder.bricolerId,
                    type: 'order_cancelled',
                    jobId: selectedOrder.id,
                    serviceName: selectedOrder.service,
                    text: t({
                        en: `Order for ${selectedOrder.service} was cancelled by the client. Reason: ${cancelReason}`,
                        fr: `La commande pour ${selectedOrder.service} a été annulée par le client. Raison : ${cancelReason}`,
                        ar: `تم إلغاء طلب ${selectedOrder.service} من قبل العميل. السبب: ${cancelReason}`
                    }),
                    read: false,
                    timestamp: serverTimestamp()
                });
            }

            setShowCancelModal(false);
            setCancelReason('');
            setSelectedOrder(null);
        } catch (error) {
            console.error('Error cancelling order:', error);
            alert('Error cancelling order. Please try again.');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleCancelOrder = (orderId: string, isFromRedistributed: boolean = false) => {
        const orderToCancel = orders.find(o => o.id === orderId);
        if (orderToCancel) {
            setSelectedOrder(orderToCancel);
            setIsRedistributeCancellation(isFromRedistributed);
            setCancelReason(isFromRedistributed ? "Redistributed order cancelled by client" : "");
            // Trigger with a tiny delay to ensure selectedOrder state is confirmed if called from outside
            setTimeout(() => setShowCancelModal(true), 10);
        }
    };

    const getHeroImage = (service: string) => {
        const serviceMap: Record<string, string> = {
            'cleaning': '/Images/Job Cards Images/Cleaning_job_card.webp',
            'electricity': '/Images/Job Cards Images/Electricity_job_card.webp',
            'plumbing': '/Images/Job Cards Images/Plumbing_job_card.webp',
            'painting': '/Images/Job Cards Images/Painting_job_card.webp',
            'home_repairs': '/Images/Job Cards Images/Handyman_job_card.webp',
            'furniture_assembly': '/Images/Job Cards Images/Furniture_Assembly_job_card.webp',
            'moving': '/Images/Job Cards Images/Moving Help_job_card.webp',
            'gardening': '/Images/Job Cards Images/Gardening_job_card.webp',
            'babysitting': '/Images/Job Cards Images/Babysetting_job_card.webp',
            'pool_cleaning': '/Images/Job Cards Images/Pool Cleaning_job_card.webp',
        };
        return serviceMap[service] || '/Images/Job Cards Images/Handyman_job_card.webp';
    };

    const handleRateBricoler = async (order: OrderDetails) => {
        if (rating === 0 || isSubmittingRating || !order.id || !order.bricolerId) return;
        setIsSubmittingRating(true);
        try {
            const currentUser = auth.currentUser;
            const reviewData = {
                id: order.id,
                rating,
                comment: review,
                serviceId: order.serviceId || order.service,
                serviceName: order.service,
                date: new Date().toISOString(),
                clientName: currentUser?.displayName || 'Client',
                clientAvatar: currentUser?.photoURL || null,
            };

            const bricolerRef = doc(db, 'bricolers', order.bricolerId);
            const bricolerSnap = await getDoc(bricolerRef);

            if (bricolerSnap.exists()) {
                const data = bricolerSnap.data();
                const newTotal = (data.totalRating || 0) + rating;
                const newCount = (data.numReviews || 0) + 1;
                const avgRating = newTotal / newCount;
                const jobsCount = (data.completedJobs || data.jobsCompleted || data.numReviews || data.jobsDone || 0);
                // Score formula: (avg_rating × 10) + (completed_jobs × 5)
                const newScore = Math.round((avgRating * 10) + (jobsCount * 5));

                await updateDoc(bricolerRef, {
                    reviews: arrayUnion(reviewData),
                    totalRating: newTotal,
                    numReviews: newCount,
                    rating: avgRating,
                    score: newScore,
                });
            } else {
                await updateDoc(bricolerRef, {
                    reviews: arrayUnion(reviewData),
                    totalRating: increment(rating),
                    numReviews: increment(1),
                    rating: rating,
                });
            }
            const jobRef = doc(db, 'jobs', order.id);
            await updateDoc(jobRef, {
                rated: true,
                clientRating: rating,
                clientReview: review,
                rating: rating
            });

            setIsRatedLocally(prev => [...prev, order.id!]);
            setRating(0);
            setReview('');
        } catch (err) {
            console.error('Error submitting review:', err);
        } finally {
            setIsSubmittingRating(false);
        }
    };

    const renderHistoryCard = (order: OrderDetails) => (
        <motion.div
            key={order.id}
            onClick={() => {
                setSelectedOrder(order);
                setShowHistory(false);
            }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-4 py-4 border-b border-[#F0F0F0] cursor-pointer group"
        >
            <div className="w-20 h-20 rounded-[15px] overflow-hidden bg-neutral-50 flex-shrink-0 border-2 border-black/5">
                {order.images && order.images.length > 0 ? (
                    <img
                        src={order.images[0]}
                        alt="Task photo"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <img
                        src={getServiceVector(order.service)}
                        alt={order.service}
                        className="w-full h-full object-contain p-2"
                    />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-[17px] font-medium text-black leading-tight truncate">
                    {order.subServiceDisplayName || order.service}
                </h3>
                <p className="text-[14px] font-medium text-neutral-400 mt-0.5 truncate">
                    {order.bricolerName ? `${order.bricolerName} • ` : ''}{t({ en: '1x task from', fr: '1x tâche de', ar: 'مهمة واحدة من' })} <span className="capitalize">{order.service}</span>
                </p>
                <p className="text-[14px] font-medium text-neutral-400 mt-1 capitalize">
                    {order.status === 'done' ? t({ en: 'Completed', fr: 'Terminée', ar: 'مكتملة' }) : order.status} • {order.city || (typeof order.location === 'object' ? (order.location as any).address : order.location)}
                </p>
            </div>
        </motion.div>
    );

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            {/* Top Tabs - Tightened */}
            <div className="px-6 pt-4 pb-2 bg-white border-b border-[#E6E6E6] sticky top-0 z-10">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={cn(
                            "pb-3 text-[16px] transition-all relative",
                            activeTab === 'calendar' ? "font-medium text-[#1D1D1D]" : "font-medium text-[#6B6B6B]"
                        )}
                    >
                        {t({ en: 'Calendar', fr: 'Calendrier', ar: 'التقويم' })}
                        {activeTab === 'calendar' && (
                            <motion.div layoutId="client-orders-tab" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#01A083] rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={cn(
                            "pb-3 text-[16px] transition-all relative",
                            activeTab === 'activity' ? "font-medium text-[#1D1D1D]" : "font-medium text-[#6B6B6B]"
                        )}
                    >
                        {t({ en: 'Activity', fr: 'Activité', ar: 'النشاط' })}
                        {activeTab === 'activity' && (
                            <motion.div layoutId="client-orders-tab" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#01A083] rounded-t-full" />
                        )}
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto relative w-full">
                {activeTab === 'calendar' ? (
                    <CalendarTab
                        orders={orders}
                        onSelectOrder={setSelectedOrder}
                        horizontalSelectedDate={horizontalSelectedDate}
                        setHorizontalSelectedDate={setHorizontalSelectedDate}
                    />
                ) : (
                    <ActivityTab
                        orders={orders}
                        onSelect={setSelectedOrder}
                        onShowHistory={() => setShowHistory(true)}
                        onResumeDraft={onResumeDraft}
                        onCancelOrder={handleCancelOrder}
                    />
                )}
            </div>

            {/* Orders History View Modal */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[3500] bg-white flex flex-col"
                    >
                        <div className="px-6 py-8 border-b border-[#F0F0F0] flex items-center gap-4">
                            <button
                                onClick={() => setShowHistory(false)}
                                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-neutral-50 active:scale-90 transition-transform"
                            >
                                <ChevronLeft size={28} className="text-black" />
                            </button>
                            <h1 className="text-[28px] font-medium text-black">{t({ en: 'Order history', fr: 'Historique des commandes', ar: 'سجل الطلبات' })}</h1>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 no-scrollbar">
                            {historyOrders.length > 0 ? (
                                <div className="py-2">
                                    {historyOrders.map(renderHistoryCard)}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center pb-20">
                                    <div className="w-34 h-34 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                                        <img
                                            src="/Images/Vectors Illu/NoOrdersYet.webp"
                                            alt="Lbricol"
                                            style={{ height: 230, objectFit: 'contain', paddingBottom: 20, paddingTop: 20 }}
                                        />
                                    </div>
                                    <h3 className="text-[20px] font-medium text-black">{t({ en: 'No history yet', fr: 'Aucun historique pour le moment', ar: 'لا يوجد سجل بعد' })}</h3>
                                    <p className="text-neutral-500 font-light">{t({ en: 'Your completed and cancelled orders will appear here.', fr: 'Vos commandes terminées et annulées apparaîtront ici.', ar: 'ستظهر هنا طلباتك المكتملة والملغاة.' })}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Full Order Details Modal */}
            <AnimatePresence>
                {selectedOrder && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[9100] bg-white"
                        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                    >
                        {/* Scrollable Content */}
                        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '200px' }} className="no-scrollbar">
                            {/* Header (Simplified Airbnb Style) */}
                            <div className="flex-shrink-0 w-full pt-12 pb-4 px-6 bg-white">
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => setSelectedOrder(null)}
                                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-50 active:scale-95 transition-all"
                                    >
                                        <ChevronLeft size={28} className="text-black" />
                                    </button>
                                    <div className="text-right">
                                        <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest block mb-0.5">
                                            {t({ en: 'Order ID', fr: 'ID Commande', ar: 'رقم الطلب' })}
                                        </span>
                                        <span className="text-[16px] font-bold text-black font-mono">
                                            #{selectedOrder.id?.slice(-6).toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6">
                                {/* Hero & Title Section - Minimalist */}
                                <div className="mt-6 mb-12">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-[28px] font-bold text-black leading-tight tracking-tight flex-1">
                                            {(() => {
                                                try {
                                                    const { SERVICES_CATALOGUE } = require("@/config/services_config");
                                                    const serviceId = selectedOrder.serviceId || selectedOrder.service;
                                                    const subServiceId = selectedOrder.subService || (selectedOrder as any).subServiceId || (selectedOrder as any).serviceType || selectedOrder.service;
                                                    
                                                    const catalogService = SERVICES_CATALOGUE.find((s: any) => s.id === serviceId);
                                                    const serviceName = catalogService ? t({ en: catalogService.en, fr: catalogService.fr, ar: catalogService.ar || catalogService.en }) : (selectedOrder.serviceName || selectedOrder.service);
                                                    
                                                    const catalogSub = catalogService?.subServices?.find((ss: any) => ss.id === subServiceId);
                                                    const subName = catalogSub ? t({ en: catalogSub.en, fr: catalogSub.fr, ar: catalogSub.ar || catalogSub.en }) : selectedOrder.subServiceDisplayName;

                                                    if (subName && subName !== serviceName) {
                                                        return <span className="capitalize">{serviceName} <span className="text-neutral-300 mx-1">›</span> <span className="text-neutral-500 font-medium">{subName}</span></span>;
                                                    }
                                                    return <span className="capitalize">{serviceName}</span>;
                                                } catch (e) {
                                                    return selectedOrder.subServiceDisplayName || selectedOrder.serviceName || selectedOrder.service;
                                                }
                                            })()}
                                        </h2>
                                        <div className="w-14 h-14 rounded-2xl bg-neutral-50 flex items-center justify-center flex-shrink-0 ml-4">
                                            <img
                                                src={selectedOrder.service === 'car_rental' ?
                                                    (selectedOrder.selectedCar?.modelImage || selectedOrder.selectedCar?.image || "/Images/Vectors Illu/carKey.png") :
                                                    getServiceVector(selectedOrder.service || '')
                                                }
                                                className="w-10 h-10 object-contain"
                                                alt="Service"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-3 text-neutral-500 font-medium">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 rounded-lg">
                                            <CalendarIcon size={16} className="text-neutral-400" />
                                            <span className="text-[14px]">{selectedOrder.date ? format(parseISO(selectedOrder.date), 'MMMM d, yyyy') : ''}</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 rounded-lg">
                                            <Clock size={16} className="text-neutral-400" />
                                            <span className="text-[14px]">{selectedOrder.time || '09:00'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mx-[-24px] h-2 bg-neutral-100/50 mb-12" />

                                {/* Simplified Professional Section */}
                                {selectedOrder.bricolerId && (
                                    <>
                                        <section className="mb-12">
                                            <h3 className="text-[22px] font-bold text-black mb-6">
                                                {t({ en: 'Professional', fr: 'Le Professionnel', ar: 'المحترف' })}
                                            </h3>
                                            <div className="flex items-center gap-5 pb-8 border-b border-neutral-100">
                                                <div className="w-16 h-16 rounded-full overflow-hidden relative ring-1 ring-neutral-100">
                                                    <img
                                                        src={(selectedOrder.bricolerAvatar && selectedOrder.bricolerAvatar.length > 5) ? selectedOrder.bricolerAvatar : "/Images/Vectors Illu/Avatar.png"}
                                                        className="w-full h-full object-cover"
                                                        alt="Pro"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[18px] font-bold text-black mb-1">{selectedOrder.bricolerName}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1">
                                                            <Star size={14} className="fill-black text-black" />
                                                            <span className="text-[14px] font-bold text-black">{selectedOrder.bricolerRating || '4.9'}</span>
                                                        </div>
                                                        <span className="text-neutral-200">·</span>
                                                        <span className="text-[14px] font-medium text-neutral-500">
                                                            {t({ en: 'Verified Pro', fr: 'Pro Vérifié', ar: 'محترف موثق' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openWhatsApp(selectedOrder.bricolerWhatsApp, selectedOrder.bricolerId);
                                                        }}
                                                        className="w-12 h-12 rounded-full border border-neutral-100 flex items-center justify-center active:scale-90 transition-all"
                                                    >
                                                        <WhatsAppBrandIcon className="w-6 h-6" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveChatOrderId(selectedOrder.id!);
                                                        }}
                                                        className="w-12 h-12 rounded-full bg-black flex items-center justify-center active:scale-90 transition-all"
                                                    >
                                                        <MessageCircle size={22} className="text-white" />
                                                    </button>
                                                </div>
                                            </div>
                                        </section>
                                        <div className="mx-[-24px] h-2 bg-neutral-100/50 mb-12" />
                                    </>
                                )}

                                {/* Simplified Payment Details */}
                                <section className="mb-12">
                                    <h3 className="text-[22px] font-bold text-black mb-6">
                                        {t({ en: 'Payment', fr: 'Paiement', ar: 'الدفع' })}
                                    </h3>
                                    <div className="flex items-center gap-4 pb-8 border-b border-neutral-100">
                                        <div className="w-12 h-12 rounded-xl bg-neutral-50 flex items-center justify-center text-2xl flex-shrink-0">
                                            {selectedOrder.paymentMethod === 'bank_transfer' ? '🏦' : '💵'}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[16px] font-bold text-black capitalize">
                                                {selectedOrder.paymentMethod === 'bank_transfer' ?
                                                    t({ en: 'Bank Transfer', fr: 'Virement Bancaire', ar: 'تحويل بنكي' }) :
                                                    t({ en: 'Cash', fr: 'Espèces', ar: 'كاش' })
                                                }
                                            </h4>
                                            <p className="text-[14px] font-medium text-neutral-400">
                                                {selectedOrder.paymentMethod === 'bank_transfer' ?
                                                    t({ en: 'Chat verify', fr: 'Vérification par Chat', ar: 'تأكيد عبر الدردشة' }) :
                                                    t({ en: 'On delivery', fr: 'À la livraison', ar: 'عند الاستلام' })
                                                }
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#01A083]/10 rounded-full">
                                            <Check size={14} className="text-[#01A083]" strokeWidth={3} />
                                            <span className="text-[12px] font-bold text-[#01A083] uppercase tracking-wider">{t({ en: 'Paid', fr: 'Payé', ar: 'مدفوع' })}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* Redesigned Setup Summary (Airbnb Style List) */}
                                <section className="mb-12">
                                    <h3 className="text-[22px] font-bold text-black mb-6">
                                        {t({ en: 'Reservation Details', fr: 'Détails de la réservation', ar: 'تفاصيل الحجز' })}
                                    </h3>
                                    <div className="space-y-4">
                                        {(() => {
                                            const subId = (selectedOrder.subService || (selectedOrder as any).subServiceId || (selectedOrder as any).serviceType || selectedOrder.service || 'car_rental');
                                            const details = selectedOrder.details?.serviceDetails || selectedOrder.details || {};
                                            const isHouseCleaning = ['standard_small', 'standard_large', 'family_home', 'deep_cleaning', 'hospitality_turnover'].includes(subId);
                                            const isOfficeCleaning = subId === 'office_cleaning';
                                            const isTvMounting = subId === 'tv_mounting';

                                            const breakdown = calculateOrderPrice(
                                                subId,
                                                parseFloat(String(selectedOrder.price || '80')),
                                                {
                                                    rooms: parseInt(String((selectedOrder.details?.serviceDetails as any)?.rooms || (selectedOrder.details as any)?.rooms || 1)),
                                                    hours: parseFloat(String((selectedOrder.details?.serviceDetails as any)?.taskDuration || (selectedOrder.details as any)?.taskDuration || (selectedOrder.details as any)?.hours || 1)),
                                                    days: parseInt(String((selectedOrder.details?.serviceDetails as any)?.days || (selectedOrder.details as any)?.days || 1)),
                                                    officeDesks: parseInt(String((selectedOrder.details?.serviceDetails as any)?.officeDesks || (selectedOrder.details as any)?.officeDesks || 0)),
                                                    officeMeetingRooms: parseInt(String((selectedOrder.details?.serviceDetails as any)?.officeMeetingRooms || (selectedOrder.details as any)?.officeMeetingRooms || 0)),
                                                    officeBathrooms: parseInt(String((selectedOrder.details?.serviceDetails as any)?.officeBathrooms || (selectedOrder.details as any)?.officeBathrooms || 0)),
                                                    hasKitchenette: (selectedOrder.details?.serviceDetails as any)?.hasKitchenette || (selectedOrder.details as any)?.hasKitchenette,
                                                    hasReception: (selectedOrder.details?.serviceDetails as any)?.hasReception || (selectedOrder.details as any)?.hasReception,
                                                    distanceKm: (selectedOrder.details?.serviceDetails as any)?.deliveryDistanceKm || (selectedOrder.details?.serviceDetails as any)?.distanceKm || 0,
                                                    deliveryDistanceKm: (selectedOrder.details?.serviceDetails as any)?.deliveryDistanceKm || 0,
                                                    deliveryDurationMinutes: (selectedOrder.details?.serviceDetails as any)?.deliveryDurationMinutes || 0,
                                                    propertyType: (selectedOrder.details?.serviceDetails as any)?.propertyType,
                                                    tvCount: (selectedOrder.details?.serviceDetails as any)?.tvCount,
                                                    mountTypes: (selectedOrder.details?.serviceDetails as any)?.mountTypes,
                                                    wallMaterial: (selectedOrder.details?.serviceDetails as any)?.wallMaterial,
                                                    liftingHelp: (selectedOrder.details?.serviceDetails as any)?.liftingHelp,
                                                    mountingAddOns: (selectedOrder.details?.serviceDetails as any)?.mountingAddOns,
                                                    taskSize: (selectedOrder.details?.serviceDetails as any)?.taskSize,
                                                }
                                            );

                                            return (
                                                <div className="divide-y divide-neutral-100">
                                                    <div className="flex justify-between items-center py-4">
                                                        <span className="text-[16px] font-medium text-neutral-500">{t({ en: 'Type', fr: 'Type', ar: 'النوع' })}</span>
                                                        <span className="text-[16px] font-bold text-black text-right">
                                                            {(() => {
                                                                try {
                                                                    const { SERVICES_CATALOGUE, getSubServiceName } = require("@/config/services_config");
                                                                    const catalogService = SERVICES_CATALOGUE.find((s: any) => s.id === (selectedOrder.serviceId || selectedOrder.service));
                                                                    const catalogSub = catalogService?.subServices?.find((ss: any) => ss.id === subId);

                                                                    if (selectedOrder.subServiceDisplayName && selectedOrder.subServiceDisplayName !== selectedOrder.serviceId) {
                                                                        return selectedOrder.subServiceDisplayName;
                                                                    }

                                                                    if (catalogSub) return t({ en: catalogSub.en, fr: catalogSub.fr, ar: catalogSub.ar || catalogSub.en });
                                                                    const subName = getSubServiceName(selectedOrder.service, subId);
                                                                    return subName ? t({ en: subName, fr: subName, ar: subName }) : (selectedOrder.serviceName || selectedOrder.service);
                                                                } catch (e) {
                                                                    return selectedOrder.subServiceDisplayName || selectedOrder.serviceName || selectedOrder.service;
                                                                }
                                                            })()}
                                                        </span>
                                                    </div>

                                                    {isHouseCleaning && (
                                                        <>
                                                            <div className="flex justify-between items-center py-4">
                                                                <span className="text-[16px] font-medium text-neutral-500">{t({ en: 'Place', fr: 'Lieu' })}</span>
                                                                <span className="text-[16px] font-bold text-black">{details.propertyType || 'Studio'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-4">
                                                                <span className="text-[16px] font-medium text-neutral-500">{t({ en: 'Rooms', fr: 'Pièces' })}</span>
                                                                <span className="text-[16px] font-bold text-black">{details.rooms || 1}</span>
                                                            </div>
                                                        </>
                                                    )}

                                                    {isOfficeCleaning && (
                                                        <>
                                                            <div className="flex justify-between items-center py-4">
                                                                <span className="text-[16px] font-medium text-neutral-500">{t({ en: 'Desks', fr: 'Bureaux' })}</span>
                                                                <span className="text-[16px] font-bold text-black">{details.officeDesks || 1}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-4">
                                                                <span className="text-[16px] font-medium text-neutral-500">{t({ en: 'Meeting Rooms', fr: 'Salles de réunion' })}</span>
                                                                <span className="text-[16px] font-bold text-black">{details.officeMeetingRooms || 0}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-4">
                                                                <span className="text-[16px] font-medium text-neutral-500">{t({ en: 'Bathrooms', fr: 'Salles de bain' })}</span>
                                                                <span className="text-[16px] font-bold text-black">{details.officeBathrooms || 0}</span>
                                                            </div>
                                                        </>
                                                    )}

                                                    {isTvMounting && (
                                                        <>
                                                            <div className="flex justify-between items-center py-4">
                                                                <span className="text-[16px] font-medium text-neutral-500">{t({ en: 'TV count', fr: 'Nombre de TV' })}</span>
                                                                <span className="text-[16px] font-bold text-black">{details.tvCount || 1}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-4">
                                                                <span className="text-[16px] font-medium text-neutral-500">{t({ en: 'Wall', fr: 'Mur' })}</span>
                                                                <span className="text-[16px] font-bold text-black">{details.wallMaterial}</span>
                                                            </div>
                                                        </>
                                                    )}

                                                    <div className="flex justify-between items-center py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[16px] font-medium text-neutral-500">{t({ en: 'Base price', fr: 'Prix de base', ar: 'السعر الأساسي' })}</span>
                                                            <div className="w-5 h-5 rounded-full border border-neutral-100 flex items-center justify-center text-[10px] text-neutral-400">i</div>
                                                        </div>
                                                        <span className="text-[16px] font-bold text-black">
                                                            {Math.round(breakdown.basePrice)} MAD/{breakdown.unit === 'unit' ? (t({ en: 'unit', fr: 'unité', ar: 'وحدة' })) : breakdown.unit === 'day' ? (t({ en: 'day', fr: 'jour', ar: 'يوم' })) : breakdown.unit === 'office' ? (t({ en: 'office', fr: 'bureau', ar: 'مكتب' })) : (t({ en: 'hr', fr: 'h', ar: 'ساعة' }))}
                                                        </span>
                                                    </div>

                                                    {breakdown.details && breakdown.details.map((detail, idx) => (
                                                        <div key={idx} className="flex justify-between items-center py-4">
                                                            <span className="text-[16px] font-medium text-neutral-500">{t(detail.label)}</span>
                                                            <span className="text-[16px] font-bold text-black">{detail.amount.toFixed(0)} MAD</span>
                                                        </div>
                                                    ))}

                                                    <div className="flex justify-between items-center py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[16px] font-medium text-neutral-500">{t({ en: 'Services', fr: 'Services', ar: 'الخدمات' })}</span>
                                                            <div className="w-5 h-5 rounded-full border border-neutral-100 flex items-center justify-center text-[10px] text-neutral-400">i</div>
                                                        </div>
                                                        <span className="text-[16px] font-bold text-black">{breakdown.subtotal.toFixed(2)} MAD</span>
                                                    </div>

                                                    <div className="flex justify-between items-center py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[16px] font-medium text-neutral-500">{t({ en: 'Lbricol Fee', fr: 'Frais Lbricol', ar: 'رسوم Lbricol' })}</span>
                                                            <div className="w-5 h-5 rounded-full border border-neutral-100 flex items-center justify-center text-[10px] text-neutral-400">i</div>
                                                        </div>
                                                        <span className="text-[16px] font-bold text-black">{breakdown.serviceFee.toFixed(2)} MAD</span>
                                                    </div>

                                                    {breakdown.travelFee > 0 && (
                                                        <div className="flex justify-between items-center py-4">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[16px] font-medium text-neutral-500">{t({ en: 'Travel Fee', fr: 'Frais de déplacement', ar: 'رسوم التنقل' })}</span>
                                                                    <div className="w-5 h-5 rounded-full border border-neutral-100 flex items-center justify-center text-[10px] text-neutral-400">i</div>
                                                                </div>
                                                                <span className="text-[12px] font-medium text-neutral-400 mt-1">
                                                                    {breakdown.distanceKm?.toFixed(1)} km · ~{breakdown.duration} min
                                                                </span>
                                                            </div>
                                                            <span className="text-[16px] font-bold text-black">{breakdown.travelFee.toFixed(2)} MAD</span>
                                                        </div>
                                                    )}

                                                    {selectedOrder.promoCode && (
                                                        <div className="flex justify-between items-center py-4 border-t border-dashed border-[#01A083]/30 bg-[#F0FDF9] -mx-4 px-4 rounded-xl mt-2">
                                                            <div className="flex flex-col">
                                                                <span className="text-[16px] font-bold text-[#01A083]">✨ {t({ en: 'Promo Code Applied', fr: 'Code Promo Appliqué', ar: 'تم تطبيق رمز ترويجي' })}</span>
                                                                <span className="text-[12px] font-bold text-[#01A083] mt-0.5">{selectedOrder.promoCode}</span>
                                                            </div>
                                                            <span className="text-[16px] font-bold text-[#01A083]">-{selectedOrder.totalPrice !== undefined ? Math.max(0, Math.round(breakdown.total - selectedOrder.totalPrice)) : 0} MAD</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </section>

                                <div className="mx-[-24px] h-2 bg-neutral-100/50 mb-12" />

                                {/* Redesigned Location Section */}
                                <section className="mb-12">
                                    <h3 className="text-[22px] font-bold text-black mb-6">
                                        {t({ en: 'Location', fr: 'Localisation', ar: 'الموقع' })}
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 py-4 border-b border-neutral-100">
                                            <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400">
                                                <MapPin size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest block mb-0.5">
                                                    {(selectedOrder.service === 'errands' || selectedOrder.service?.includes('delivery')) ? t({ en: 'Pickup', fr: 'Retrait', ar: 'الاستلام' }) : t({ en: 'Task Address', fr: 'Adresse de mission', ar: 'عنوان المهمة' })}
                                                </span>
                                                <p className="text-[16px] font-bold text-black truncate">
                                                    {typeof selectedOrder.location === 'object' ? (selectedOrder.location as any).address : selectedOrder.location}
                                                </p>
                                            </div>
                                        </div>

                                        {(selectedOrder.service === 'errands' || selectedOrder.service?.includes('delivery')) && selectedOrder.details?.serviceDetails?.dropoffAddress && (
                                            <div className="flex items-center gap-4 py-4 border-b border-neutral-100">
                                                <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400">
                                                    <MapPin size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest block mb-0.5">{t({ en: 'Delivery', fr: 'Livraison', ar: 'التسليم' })}</span>
                                                    <p className="text-[16px] font-bold text-black truncate">
                                                        {selectedOrder.details.serviceDetails.dropoffAddress}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <div className="mx-[-24px] h-2 bg-neutral-100/50 mb-12" />

                                {/* Redesigned Instructions */}
                                {(() => {
                                    const raw = (selectedOrder as any)?.raw || {};
                                    const details = selectedOrder.details || {};
                                    const note =
                                        raw.notes ||
                                        details.note ||
                                        details.serviceDetails?.note ||
                                        (selectedOrder as any).description ||
                                        (selectedOrder as any).notes;

                                    if (!note) return null;

                                    return (
                                        <>
                                            <section className="mb-12">
                                                <h3 className="text-[22px] font-bold text-black mb-6">
                                                    {t({ en: 'Instructions', fr: 'Instructions', ar: 'تعليمات' })}
                                                </h3>
                                                <div className="py-6 px-4 bg-neutral-50 rounded-2xl border border-neutral-100/50">
                                                    <p className="text-[15px] font-medium text-neutral-600 leading-relaxed italic">
                                                        "{note}"
                                                    </p>
                                                </div>
                                            </section>

                                            <div className="mx-[-24px] h-2 bg-neutral-100/50 mb-12" />
                                        </>
                                    );
                                })()}

                                {/* Redesigned Attached Photos */}
                                <section className="mb-12">
                                    <h3 className="text-[22px] font-bold text-black mb-6">
                                        {t({ en: 'Photos', fr: 'Photos', ar: 'الصور' })}
                                    </h3>
                                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 scroll-smooth">
                                        {(() => {
                                            const photosSet = new Set<string>();
                                            const sources = [
                                                selectedOrder.details?.serviceDetails?.photoUrls,
                                                (selectedOrder as any)?.images,
                                                (selectedOrder.details as any)?.photos,
                                                (selectedOrder as any)?.raw?.serviceDetails?.photoUrls,
                                                (selectedOrder as any)?.raw?.images
                                            ];

                                            sources.forEach(source => {
                                                if (Array.isArray(source)) {
                                                    source.forEach(item => {
                                                        if (typeof item === 'string' && item.startsWith('http')) {
                                                            photosSet.add(item);
                                                        }
                                                    });
                                                }
                                            });

                                            const allPhotos = Array.from(photosSet);

                                            if (allPhotos.length === 0) {
                                                return (
                                                    <div className="w-full py-8 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                                                        <span className="text-[14px] text-neutral-400 font-medium">{t({ en: 'No photos provided', fr: 'Aucune photo fournie', ar: 'لا توجد صور' })}</span>
                                                    </div>
                                                );
                                            }

                                            return allPhotos.map((url, i) => (
                                                <div key={i} className="w-40 h-40 flex-shrink-0 bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-100/50 relative">
                                                    <img
                                                        src={url}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </section>

                                {/* Cancel Order Button - Subtle */}
                                {!['done', 'cancelled', 'delivered'].includes(selectedOrder.status || '') && (
                                    <section className="mb-8">
                                        <button
                                            onClick={() => handleCancelOrder(selectedOrder.id!)}
                                            className="w-full py-3 text-red-500 font-bold text-[14px] underline decoration-red-200 underline-offset-4"
                                        >
                                            {t({ en: 'Cancel this order', fr: 'Annuler cette commande', ar: 'إلغاء هذا الطلب' })}
                                        </button>
                                    </section>
                                )}

                                {/* Help Link */}
                                <div className="pt-2 pb-32 text-center">
                                    <button
                                        onClick={() => window.open('https://wa.me/212702814355', '_blank')}
                                        className="inline-flex items-center gap-2 text-[14px] font-bold text-neutral-400 hover:text-black transition-colors"
                                    >
                                        <HelpCircle size={16} />
                                        {t({ en: 'I need help', fr: 'J\'ai besoin d\'aide', ar: 'أحتاج مساعدة' })}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Redesigned Bottom Footer - Minimal White Airbnb Style */}
                        {!activeChatOrderId && (
                            <div className="fixed bottom-0 left-0 right-0 bg-white z-[4005] px-6 pt-4 pb-[calc(24px+env(safe-area-inset-bottom))] border-t border-neutral-100 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest">{t({ en: 'Total Price', fr: 'Prix Total', ar: 'الإجمالي' })}</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[24px] font-[1000] text-black">
                                            {(selectedOrder.totalPrice !== undefined ? selectedOrder.totalPrice : parseFloat(String(selectedOrder.price || '0'))).toFixed(0)}
                                        </span>
                                        <span className="text-[14px] font-bold text-black uppercase tracking-wider">MAD</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setActiveChatOrderId(selectedOrder.id!)}
                                    className="px-10 py-4 bg-black text-white rounded-full font-bold text-[16px] active:scale-95 transition-transform"
                                >
                                    {t({ en: 'Chat', fr: 'Chatter', ar: 'دردشة' })}
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cancellation Reason Modal */}
            <AnimatePresence>
                {showCancelModal && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[9999] bg-[#FFFFFF] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 pt-16 px-6 pb-4 bg-[#FFFFFF]">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#01A083] active:scale-95 transition-all mb-6"
                            >
                                <ChevronLeft size={28} className="text-white" />
                            </button>
                            <h3 className="text-[32px] font-medium text-black leading-tight mb-2 tracking-tight">
                                {isRedistributeCancellation
                                    ? t({ en: 'Are you sure?', fr: 'Êtes-vous sûr ?', ar: 'هل أنت متأكد؟' })
                                    : t({ en: 'Wait! Why cancel?', fr: 'Attendez ! Pourquoi annuler ?', ar: 'انتظر! لماذا الإلغاء؟' })}
                            </h3>
                            <p className="text-neutral-500 font-medium text-[17px] leading-relaxed">
                                {isRedistributeCancellation
                                    ? t({
                                        en: 'This action will permanently remove your order.',
                                        fr: 'Cette action supprimera définitivement votre commande.',
                                        ar: 'سيؤدي هذا الإجراء إلى حذف طلبك بشكل دائم.'
                                    })
                                    : t({
                                        en: 'Your feedback helps us provide a better experience for everyone.',
                                        fr: 'Vos commentaires nous aident à offrir une meilleure expérience à tous.',
                                        ar: 'تساعدنا ملاحظاتك في تقديم تجربة أفضل للجميع.'
                                    })}
                            </p>
                        </div>

                        {/* Options */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 pb-32">
                            {!isRedistributeCancellation && (
                                <>
                                    {[
                                        { en: 'Found another solution', fr: 'J\'ai trouvé une autre solution', ar: 'وجدت حلاً آخر' },
                                        { en: 'Personal reasons', fr: 'Raisons personnelles', ar: 'أسباب شخصية' },
                                        { en: 'Scheduled by mistake', fr: 'Planifié par erreur', ar: 'تمت الجدولة عن طريق الخطأ' },
                                        { en: 'Professional didn\'t answer', fr: 'Le professionnel ne répond pas', ar: 'المحترف لا يرد' },
                                        { en: 'Change of plans', fr: 'Changement de programme', ar: 'تغيير في الخطط' }
                                    ].map((reason, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCancelReason(t(reason))}
                                            className={cn(
                                                "w-full p-5 rounded-2xl border-2 text-left font-medium transition-all active:scale-[0.99] flex items-center justify-between group",
                                                cancelReason === t(reason)
                                                    ? "border-[#007AFF] bg-[#007AFF08] text-[#007AFF]"
                                                    : "border-neutral-100 hover:border-neutral-200 text-neutral-600 bg-neutral-50/50"
                                            )}
                                        >
                                            <span className="text-[16px]">{t(reason)}</span>
                                            <div className={cn(
                                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                cancelReason === t(reason) ? "border-[#007AFF] bg-[#007AFF]" : "border-neutral-200"
                                            )}>
                                                {cancelReason === t(reason) && <Check size={14} className="text-white" strokeWidth={4} />}
                                            </div>
                                        </button>
                                    ))}

                                    <textarea
                                        value={cancelReason && ![
                                            t({ en: 'Found another solution', fr: 'J\'ai trouvé une autre solution', ar: 'وجدت حلاً آخر' }),
                                            t({ en: 'Personal reasons', fr: 'Raisons personnelles', ar: 'أسباب شخصية' }),
                                            t({ en: 'Scheduled by mistake', fr: 'Planifié par erreur', ar: 'تمت الجدولة عن طريق الخطأ' }),
                                            t({ en: 'Professional didn\'t answer', fr: 'Le professionnel ne répond pas', ar: 'المحترف لا يرد' }),
                                            t({ en: 'Change of plans', fr: 'Changement de programme', ar: 'تغيير في الخطط' })
                                        ].includes(cancelReason) ? cancelReason : ''}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        placeholder={t({ en: 'Other reason...', fr: 'Autre raison...', ar: 'سبب آخر...' })}
                                        className="w-full p-5 rounded-2xl bg-neutral-50/50 border-2 border-dashed border-neutral-200 focus:border-[#007AFF] focus:bg-white outline-none transition-all font-medium text-black"
                                        rows={3}
                                    />
                                </>
                            )}
                            {isRedistributeCancellation && (
                                <div className="py-10 text-center">
                                    <Ban size={64} className="mx-auto text-red-100 mb-4" />
                                    <p className="text-neutral-400 font-medium">
                                        {t({
                                            en: 'Cancelling this order will inform the system and clear it from your activity.',
                                            fr: 'L\'annulation de cette commande informera le système et l\'effacera de votre activité.',
                                            ar: 'سيؤدي إلغاء هذا الطلب إلى إبلاغ النظام ومسحه من نشاطك.'
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer - Optimized for Safe Areas and Navigation Bars */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-100 pb-[calc(110px+env(safe-area-inset-bottom))]">
                            <button
                                onClick={handleConfirmCancel}
                                disabled={(!isRedistributeCancellation && !cancelReason) || isCancelling}
                                className={cn(
                                    "w-full py-5 rounded-2xl font-medium text-[18px] text-white transition-all active:scale-95 flex items-center justify-center h-16",
                                    (!isRedistributeCancellation && !cancelReason) || isCancelling ? "bg-neutral-200 pointer-events-none" : "bg-red-500 hover:bg-red-600"
                                )}
                            >
                                {isCancelling ? (
                                    <RefreshCw className="animate-spin" size={24} />
                                ) : (
                                    isRedistributeCancellation
                                        ? t({ en: 'Cancel Order', fr: 'Annuler la commande', ar: 'إلغاء الطلب' })
                                        : t({ en: 'Confirm Cancellation', fr: 'Confirmer l\'annulation', ar: 'تأكيد الإلغاء' })
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Chat View Overlay — must be above order details (z-[4000]) */}
            <AnimatePresence>
                {activeChatOrderId && (
                    <motion.div
                        key="chat-overlay"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                        className="fixed inset-0 z-[9999] bg-white flex flex-col"
                    >
                        <MessagesView
                            orders={orders}
                            currentUser={auth.currentUser}
                            initialSelectedJobId={activeChatOrderId}
                            onBackToOrders={() => setActiveChatOrderId(null)}
                            isModal={true}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ── Activity Tab Component ──────────────────────────────────────────────
function ActivityTab({
    orders,
    onSelect,
    onShowHistory,
    onResumeDraft,
    onCancelOrder
}: {
    orders: OrderDetails[],
    onSelect: (o: OrderDetails) => void,
    onShowHistory: () => void,
    onResumeDraft?: (draft: any) => void,
    onCancelOrder: (id: string, isFromRedistributed?: boolean) => void
}) {
    const { t } = useLanguage();
    const { getProgress, getReturnProgress, getTimeRemaining, getDynamicStatus } = useOrderProgress();

    const pendingOrders = useMemo(() => {
        return orders.filter(o => {
            const isCarRental = o.service === 'car_rental';
            if (isCarRental) {
                const progress = getProgress(o);
                // For car rentals, only truly 'pending' (waiting for BRICOLER) if status is pending AND progress is 100 (time arrived)
                return o.status === 'pending' && !o.providerConfirmed && progress === 100;
            }
            const status = getDynamicStatus(o);
            return status === 'pending' && !o.providerConfirmed;
        })
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [orders, getDynamicStatus]);

    const redistributedOrders = useMemo(() => {
        return orders.filter(o => o.status === 'redistributed_by_provider')
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [orders]);

    const activeOrders = useMemo(() => {
        return orders.filter(o => {
            const status = getDynamicStatus(o);
            if (status === 'done') return false; // Moves to history

            const isCarRental = o.service === 'car_rental';
            if (isCarRental) {
                const progress = getProgress(o);
                // Active if status is confirmed/programmed OR if status is pending but time hasn't arrived
                return ['confirmed', 'accepted', 'programmed', 'on_time', 'in_progress'].includes(status || '') || (status === 'pending' && (o.providerConfirmed || progress < 100));
            }
            return ['confirmed', 'accepted', 'programmed', 'on_time', 'in_progress'].includes(status || '') || (status === 'pending' && o.providerConfirmed);
        })
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [orders, getDynamicStatus, getProgress]);

    const incompleteOrders = useMemo(() => {
        return orders.filter(o => ['new', 'negotiating'].includes(o.status || ''));
    }, [orders]);

    const [localDrafts, setLocalDrafts] = useState<any[]>([]);

    useEffect(() => {
        const loadDrafts = () => {
            try {
                const saved = safeStorage.getItem('lbricol_order_drafts');
                if (saved) {
                    const parsed: any[] = JSON.parse(saved);

                    // Deduplicate: keep only the most-recently updated draft per (service+subService) key
                    const seen = new Map<string, any>();
                    for (const draft of parsed) {
                        const key = `${draft.service}__${draft.subService || ''}`;
                        const existing = seen.get(key);
                        if (!existing || (draft.updatedAt || 0) > (existing.updatedAt || 0)) {
                            seen.set(key, draft);
                        }
                    }
                    const deduped = Array.from(seen.values());

                    // Persist deduplication back if we removed anything
                    if (deduped.length < parsed.length) {
                        safeStorage.setItem('lbricol_order_drafts', JSON.stringify(deduped));
                    }
                    setLocalDrafts(deduped);
                } else {
                    setLocalDrafts([]);
                }
            } catch (e) {
                setLocalDrafts([]);
            }
        };
        loadDrafts();
        // Check for updates periodically
        const interval = setInterval(loadDrafts, 3000);
        return () => clearInterval(interval);
    }, []);

    const removeDraft = (e: React.MouseEvent, draftId: string) => {
        e.stopPropagation();
        try {
            const updated = localDrafts.filter(d => d.id !== draftId);
            setLocalDrafts(updated);
            safeStorage.setItem('lbricol_order_drafts', JSON.stringify(updated));
        } catch (e) { }
    };


    const filteredOrders = useMemo(() => {
        return activeOrders;
    }, [activeOrders]);


    const renderEmptyState = (title: string, subtitle: string, icon: React.ReactNode) => (
        <div className="bg-white rounded-[20px] border-2 border-black/5 p-8 flex flex-col items-center text-center">
            <div className="flex items-center justify-center mb-6">
                {icon}
            </div>
            <h3 className="text-[20px] font-medium text-black mb-1">{title}</h3>
            <p className="text-[15px] font-medium text-neutral-500 max-w-[240px] leading-tight">
                {subtitle}
            </p>
        </div>
    );

    const renderDraftCard = (draft: any) => {
        return (
            <motion.div
                key={draft.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onResumeDraft?.(draft)}
                className="bg-white rounded-[24px] p-5 flex items-center gap-5 cursor-pointer transition-all mb-4 border border-neutral-100 relative overflow-hidden group hover:border-black/10"
            >
                {/* Draft Badge */}
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-black text-white text-[10px] font-bold rounded-bl-xl uppercase tracking-widest">
                    {t({ en: 'Draft', fr: 'Brouillon', ar: 'مسودة' })}
                </div>

                <div className="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center flex-shrink-0 p-3 grayscale opacity-60">
                    <img src={getServiceVector(draft.service)} className="w-full h-full object-contain" />
                </div>

                <div className="flex-1 min-w-0 pr-8">
                    <h3 className="text-[17px] font-bold text-black truncate leading-tight mb-1">
                        {draft.serviceDisplayName || draft.service} {draft.subService ? `› ${getSubServiceName(draft.service, draft.subService)}` : ''}
                    </h3>
                    <p className="text-[13px] font-medium text-neutral-400 line-clamp-1">
                        {draft.description || t({ en: 'Continue where you left off', fr: 'Continuez là où vous vous êtes arrêté', ar: 'أكمل من حيث توقفت' })}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                            <div className="h-full bg-black rounded-full" style={{ width: `${(draft.step / 4) * 100}%` }} />
                        </div>
                    </div>
                </div>

                <button
                    onClick={(e) => removeDraft(e, draft.id)}
                    className="absolute bottom-4 right-4 text-neutral-300 hover:text-red-500 transition-colors p-2"
                >
                    <X size={18} />
                </button>
            </motion.div>
        );
    };

    const renderOrderCard = (order: OrderDetails) => {
        const timeLeft = getTimeRemaining(order);
        const progress = getProgress(order);

        const isCarRental = order.service === 'car_rental';
        const isRentalInProgress = isCarRental && progress === 100 && !['done', 'delivered'].includes(order.status || '');
        const returnProgress = isRentalInProgress ? getReturnProgress(order) : 0;

        return (
            <motion.div
                key={order.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(order)}
                className="bg-white rounded-[30px_18px_35px_22px] p-4 flex items-center gap-4 cursor-pointer transition-all mb-4 border-2 border-black/5"
            >
                <div className="w-28 h-28 bg-white rounded-[22px_15px_28px_18px] flex items-center justify-center flex-shrink-0 p-0 overflow-hidden">
                    {order.images && order.images.length > 0 ? (
                        <img src={order.images[0]} className="w-full h-full object-cover" />
                    ) : (order.selectedCar || order.details?.car) ? (
                        <img
                            src={(order.selectedCar?.modelImage || order.selectedCar?.image) || (order.details?.car?.modelImage || order.details?.car?.image) || "/Images/Vectors Illu/carKey.png"}
                            className="w-full h-full object-contain p-2"
                        />
                    ) : (
                        <img src={getServiceVector(order.service)} className="w-full h-full object-contain p-1" />
                    )}
                </div>
                <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                            "px-2 py-0.5 text-[11px] font-medium rounded-md uppercase tracking-wider",
                            (order.status === 'pending' && !order.providerConfirmed && progress === 100) ? "bg-orange-100 text-orange-600" :
                                isRentalInProgress ? "bg-rose-50 text-rose-500" : "bg-[#E6F7F4] text-[#01A083]"
                        )}>
                            {(() => {
                                const status = getDynamicStatus(order);
                                const isDelayedStatus = order.status === 'pending' && !order.providerConfirmed && progress === 100;

                                if (isDelayedStatus) {
                                    return t({ en: 'Pending', fr: 'En attente', ar: 'قيد الانتظار' });
                                }
                                if (isRentalInProgress || status === 'in_progress') {
                                    return t({ en: 'In Progress', fr: 'En cours', ar: 'قيد التنفيذ' });
                                }
                                if (status === 'done') {
                                    return t({ en: 'Completed', fr: 'Terminée', ar: 'مكتملة' });
                                }

                                // For car rentals that are active
                                if (isCarRental && order.status === 'pending' && progress < 100) {
                                    return t({ en: 'New', fr: 'Nouveau', ar: 'جديد' });
                                }

                                return t({ en: 'On time', fr: 'À l’heure', ar: 'في الوقت' });
                            })()}
                        </span>
                    </div>

                    <h3 className="text-[17px] font-medium text-black leading-tight">
                        {(() => {
                            const { getSubServiceName, getServiceById } = require('@/config/services_config');
                            const subDisplay = getSubServiceName(order.service, order.subService || (order as any).subServiceId || '') || order.subServiceDisplayName;

                            const baseName = subDisplay ? t({ en: subDisplay, fr: subDisplay, ar: subDisplay }) : (getServiceById(order.service)?.name || order.serviceName || order.service);

                            const roomsCount = order.details?.serviceDetails?.rooms || order.details?.rooms;
                            if (order.service === 'cleaning' && roomsCount) {
                                return `${baseName} • ${roomsCount} ${roomsCount > 1 ? t({ en: 'Rooms', fr: 'Pièces', ar: 'غرف' }) : t({ en: 'Room', fr: 'Pièce', ar: 'غرفة' })}`;
                            }
                            return baseName;
                        })()}
                    </h3>
                    <div className="mt-2 text-[14px] font-medium text-black leading-tight">
                        {isCarRental && order.date && order.carReturnDate ? (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[16px]">{format(parseISO(order.date), 'MMM d')}</span>
                                    <span className="opacity-30">|</span>
                                    <span className="text-[16px]">{order.time?.split('-')[0] || '09:00'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-neutral-400">
                                    <span>{format(parseISO(order.carReturnDate), 'MMM d')}</span>
                                    <span className="opacity-30">|</span>
                                    <span>{order.carReturnTime?.split('-')[0] || '09:00'}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <div className="flex items-center gap-1 text-neutral-400 whitespace-nowrap">
                                    <CalendarIcon size={14} className="opacity-70" />
                                    <span className="text-[14px] font-medium">
                                        {order.date ? format(parseISO(order.date), 'MMM d') : ''}
                                    </span>
                                </div>
                                <span className="text-neutral-200">|</span>
                                <p className="text-[18px] font-medium">
                                    {order.time || '12:00-13:00'}
                                </p>
                                {timeLeft && (
                                    <span className={cn(
                                        "text-[14px] font-medium whitespace-nowrap pt-1",
                                        isRentalInProgress ? "text-rose-500" : "text-[#01A083]"
                                    )}>
                                        {timeLeft}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-end mt-2">
                        <p className="text-[13px] font-medium text-neutral-400 truncate pr-2 flex-1">
                            {order.service === 'cleaning' && order.details?.propertyType ? (
                                `${t({ en: order.details.propertyType, fr: order.details.propertyType, ar: order.details.propertyType })} • ${order.city || (typeof order.location === 'object' ? (order.location as any).address : order.location)}`
                            ) : (order.service === 'errands' || order.service?.includes('delivery')) && !order.bricolerName ?
                                (order.city || (typeof order.location === 'object' ? (order.location as any).address : order.location)) :
                                `${order.bricolerName || t({ en: 'Matching...', fr: 'Recherche...', ar: 'جاري البحث...' })} • ${order.city || (typeof order.location === 'object' ? (order.location as any).address : order.location)}`
                            }
                        </p>
                        {!!(order.totalPrice || order.price) && (
                            <div className="flex-shrink-0 bg-[#F9FAFB] border border-neutral-100 px-2 py-0.5 rounded-md flex items-center justify-center ml-2">
                                <span className="text-[13px] font-bold text-black">
                                    {(order.totalPrice || parseFloat(String(order.price || '0'))).toFixed(0)} MAD
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full mt-3 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: isRentalInProgress ? `${returnProgress}%` : `${progress}%`,
                                filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)']
                            }}
                            transition={{
                                width: { duration: 1, ease: "easeOut" },
                                filter: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                            }}
                            className={cn(
                                "h-full rounded-full relative",
                                isRentalInProgress ? "bg-rose-500" : "bg-[#01A083]"
                            )}
                        />
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="flex flex-col gap-10 p-6 pb-32 bg-[#FFFFFF]">
            {/* Redistributed by Provider Section */}
            {redistributedOrders.map(order => (
                <div key={`redistributed-${order.id}`} className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center shrink-0">
                            <Ban size={24} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-[18px] font-medium text-black mb-1">
                                {t({
                                    en: `${order.bricolerName} can't make it`,
                                    fr: `${order.bricolerName} ne peut plus venir`,
                                    ar: `${order.bricolerName} لا يمكنه الحضور`
                                })}
                            </h3>
                            <p className="text-[14px] font-medium text-neutral-600 leading-tight">
                                {t({
                                    en: 'The professional had to redistribute this job. You can either find another professional or cancel the order.',
                                    fr: 'Le professionnel a dû redistribuer cette mission. Vous pouvez soit trouver un autre professionnel, soit annuler la commande.',
                                    ar: 'اضطر المحترف لإعادة توزيع هذه المهمة. يمكنك إما العثور على محترف آخر أو إلغاء الطلب.'
                                })}
                            </p>
                            <div className="flex flex-col gap-2 mt-4">
                                <button
                                    onClick={() => {
                                        if (onResumeDraft) {
                                            onResumeDraft({
                                                id: order.id as string,
                                                service: order.service,
                                                subService: order.subService,
                                                city: order.city || '',
                                                area: order.area || '',
                                                taskSize: order.taskSize || null,
                                                description: order.description || '',
                                                selectedBricolerId: null,
                                                selectedDate: order.date || null,
                                                selectedTime: order.time || null,
                                                uploadedImages: order.images || [],
                                                paymentMethod: order.paymentMethod as any || 'cash',
                                                bankReceipt: order.bankReceipt || null,
                                                step: 2,
                                                subStep1: 'location',
                                                updatedAt: Date.now()
                                            });
                                        }
                                    }}
                                    className="w-full py-3 bg-[#01A083] text-white rounded-xl text-[14px] font-medium flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    <RefreshCw size={16} />
                                    {t({ en: 'Select New Bricoler', fr: 'Choisir un nouveau Bricoleur', ar: 'اختر بريكولر جديد' })}
                                </button>
                                <button
                                    onClick={() => onCancelOrder(order.id!, true)}
                                    className="w-full py-3 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-[14px] font-medium transition-all active:scale-95"
                                >
                                    {t({ en: 'Cancel Order', fr: 'Annuler la commande', ar: 'إلغاء الطلب' })}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}


            {/* Active Orders Section */}
            <div className="space-y-6">
                <div className="space-y-4">
                    <h2 className="text-[26px] font-medium text-black">{t({ en: 'Active Orders', fr: 'Commandes actives', ar: 'الطلبات النشطة' })}</h2>
                </div>

                {filteredOrders.length > 0 ? (
                    <div className="pt-2">{filteredOrders.map(renderOrderCard)}</div>
                ) : (
                    <div className="pt-2">
                        {renderEmptyState(
                            t({ en: 'Track your orders', fr: 'Suivez vos commandes', ar: 'تابع طلباتك' }),
                            t({ en: 'Your ongoing orders will be listed here', fr: 'Vos commandes en cours seront affichées ici', ar: 'ستظهر هنا طلباتك الجارية' }),
                            <img src="/Images/Vectors Illu/NewOrder.webp" className="w-28 h-28 object-contain grayscale opacity-40" />
                        )}
                    </div>
                )}
            </div>

            {/* Pending Orders Section */}
            {pendingOrders.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-[26px] font-medium text-black">{t({ en: 'Pending orders', fr: 'Commandes en attente', ar: 'طلبات قيد الانتظار' })}</h2>
                    <div className="pt-2">{pendingOrders.map(renderOrderCard)}</div>
                </div>
            )}

            {/* Continue Your Order Section */}
            <div className="space-y-4">
                <h2 className="text-[26px] font-medium text-black">{t({ en: 'Continue your order', fr: 'Continuer votre commande', ar: 'أكمل طلبك' })}</h2>
                {(incompleteOrders.length > 0 || localDrafts.length > 0) ? (
                    <div className="pt-2">
                        {localDrafts.map(renderDraftCard)}
                        {incompleteOrders.map(renderOrderCard)}
                    </div>
                ) : (
                    <div className="pt-2">
                        {renderEmptyState(
                            t({ en: 'No carts yet', fr: 'Pas encore de paniers', ar: 'لا توجد سلات بعد' }),
                            t({ en: "Orders you don't complete will appear here", fr: 'Les commandes non terminées apparaîtront ici', ar: 'الطلبات التي لم تُكملها ستظهر هنا' }),
                            <img src="/Images/Vectors Illu/DraftOrders2.webp" className="w-28 h-28 object-contain grayscale opacity-40" />
                        )}
                    </div>
                )}
            </div>

            {/* History Link */}
            <div className="bg-[#F2F2F2] rounded-[30px] border-2 border-black/5 p-6 flex items-center gap-5 mt-4">
                <div className="flex items-center justify-center flex-shrink-0">
                    <img src="/Images/Vectors Illu/OrdersHistory.webp" className="w-20 h-20 object-contain" />
                </div>
                <div className="flex flex-col">
                    <p className="text-[16px] font-light text-black leading-tight">{t({ en: 'Need to review past orders or reorder?', fr: 'Besoin de consulter vos commandes passées ?', ar: 'تريد مراجعة طلباتك السابقة أو إعادة الطلب؟' })}</p>
                    <button
                        onClick={onShowHistory}
                        className="text-[17px] font-medium text-[#01A083] mt-1 text-left decoration-[#01A083] decoration-2 underline-offset-4 hover:underline"
                    >
                        {t({ en: 'Check your order history', fr: 'Voir l\'historique de commandes', ar: 'عرض سجل الطلبات' })}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Calendar Tab Component ──────────────────────────────────────────────
