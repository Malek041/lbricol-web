"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { OrderDetails } from '@/features/orders/components/OrderCard';
import { ChevronLeft, User, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { getServiceVector } from '@/config/services_config';
import { format, startOfDay, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { arMA } from 'date-fns/locale/ar-MA';

export function BricolerCalendarTab({
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
                                                {order.clientAvatar ? (
                                                    <img src={order.clientAvatar} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={10} className="text-white/40" />
                                                )}
                                            </div>

                                            <span className="text-[9px] sm:text-[10px] font-bold text-white truncate leading-none">
                                                {order.clientName ? order.clientName.split(' ')[0] : t({ en: 'Matching', fr: 'Matching', ar: 'جاري' })}
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
                                                    ) : order.clientAvatar ? (
                                                        <img src={order.clientAvatar} className="w-full h-full object-cover" />
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
                                                        {order.clientName || 'Client'} • {order.city || (typeof order.location === 'object' ? (order.location as any).address : order.location)}
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
