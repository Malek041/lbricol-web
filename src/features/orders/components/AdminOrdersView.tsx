"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, User, Search, MapPin, Check } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    startOfWeek, 
    endOfWeek, 
    isSameMonth, 
    isSameDay, 
    isBefore, 
    startOfDay, 
    addDays, 
    parseISO 
} from 'date-fns';
import { fr, arMA } from 'date-fns/locale';
import JobDetailsPopup, { JobDetails } from '@/features/orders/components/JobDetailsPopup';
import { getSubService, getServiceVector } from '@/config/services_config';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

interface AdminOrdersViewProps {
    t: (vals: { en: string; fr: string; ar?: string }) => string;
    onViewMessages?: (jobId: string) => void;
    onChat?: (jobId: string, bricolerId: string, bricolerName: string) => void;
    hideHeader?: boolean;
}

export default function AdminOrdersView({ t, onChat, onViewMessages, hideHeader }: AdminOrdersViewProps) {
    const { language } = useLanguage();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [viewMode, setViewMode] = useState<'day' | 'month'>('month');
    const [horizontalSelectedDate, setHorizontalSelectedDate] = useState<Date>(new Date());
    const [monthOffset, setMonthOffset] = useState(0);

    // Update time every minute for dynamic statuses
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Fetch Orders
    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'jobs'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as any));

            loadedOrders.sort((a, b) => {
                const aTs = (a.createdAt as any)?.seconds || (a.createdAt as any)?._seconds || 0;
                const bTs = (b.createdAt as any)?.seconds || (b.createdAt as any)?._seconds || 0;
                return bTs - aTs;
            });

            setOrders(loadedOrders);
            setLoading(false);
        }, (error) => {
            console.error("AdminOrdersView snapshot error", error);
            setLoading(false);
        });

        return () => {
            try { unsubscribe(); } catch (e) {}
        };
    }, []);

    // Safety Locale
    const dfLocale = language === 'fr' ? fr : language === 'ar' ? arMA : undefined;

    // Helper: Get Monday of a week
    const getMonday = (date: Date) => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return startOfDay(new Date());
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return startOfDay(d);
    };

    const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

    const safeFormat = (date: Date | any, pattern: string) => {
        try {
            const d = date instanceof Date ? date : new Date(date);
            if (isNaN(d.getTime())) return "";
            return format(d, pattern, { locale: dfLocale });
        } catch (e) { return ""; }
    };

    const getDynamicStatus = (order: any) => {
        if (!order || !order.date || !order.time) return order?.status || 'new';
        try {
            const autoStatuses = ['confirmed', 'accepted', 'programmed', 'pending', 'in_progress'];
            if (!autoStatuses.includes(order.status || '')) return order.status;

            const rawTime = String(order.time || '09:00').split('-')[0].trim();
            const timeStr = rawTime.includes(':') && rawTime.split(':')[0].length === 1 ? `0${rawTime}` : rawTime;
            
            let dateStr = '';
            if (typeof order.date === 'string') {
                dateStr = order.date.split('T')[0];
            } else if (order.date?.toDate) {
                dateStr = format(order.date.toDate(), 'yyyy-MM-dd');
            } else if (order.date instanceof Date) {
                dateStr = format(order.date, 'yyyy-MM-dd');
            } else {
                const d = new Date(order.date);
                dateStr = isNaN(d.getTime()) ? format(new Date(), 'yyyy-MM-dd') : format(d, 'yyyy-MM-dd');
            }
            
            const isoStr = `${dateStr}T${timeStr.includes(':') ? timeStr : '09:00'}:00`;
            const startTimeRaw = parseISO(isoStr);
            const startTime = isNaN(startTimeRaw.getTime()) ? new Date().getTime() : startTimeRaw.getTime();
            const now = currentTime.getTime();

            let durationHr = 2;
            const subService = getSubService(order.serviceId || order.service || '', order.subService || '');
            if (subService?.estimatedDurationHr) {
                durationHr = Number(subService.estimatedDurationHr) || 2;
            }

            const endTime = startTime + (durationHr * 60 * 60 * 1000);

            if (now < startTime) return 'on_time';
            if (now >= startTime && now < endTime) return 'in_progress';
            if (now >= endTime) return 'done';
            return order.status || 'new';
        } catch (e) { return order?.status || 'new'; }
    };

    const getOrderColor = (status: string) => {
        const lower = String(status || '').toLowerCase();
        if (['cancelled', 'rejected'].includes(lower)) return { raw: '#ef4444', class: 'bg-red-500 text-white' };
        if (['done', 'completed', 'delivered'].includes(lower)) return { raw: '#22c55e', class: 'bg-green-500 text-white' };
        if (['pending', 'waiting', 'new'].includes(lower)) return { raw: '#facc15', class: 'bg-yellow-400 text-black' };
        if (['confirmed', 'accepted', 'programmed', 'matching', 'in_progress', 'on_time', 'negotiating'].includes(lower)) return { raw: '#3b82f6', class: 'bg-blue-500 text-white' };
        return { raw: '#9ea5b1', class: 'bg-neutral-400 text-white' };
    };

    // Month View Data
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

    const monthLabel = safeFormat(viewMonth, 'MMMM');
    const weekdayShorts = language === 'ar' ? ['ح', 'ث', 'ر', 'خ', 'ج', 'س', 'ن'] : language === 'fr' ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    // Day View Data
    const selectedDateStr = safeFormat(horizontalSelectedDate, 'yyyy-MM-dd');
    const weekDaysArr = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        return {
            date: d,
            dateStr: safeFormat(d, 'yyyy-MM-dd'),
            dayNum: safeFormat(d, 'd'),
            dayLabel: safeFormat(d, 'EEEEEE')
        };
    });
    const weekLabel = `${safeFormat(weekStart, 'MMM d')} – ${safeFormat(addDays(weekStart, 6), 'MMM d, yyyy')}`;
    const hours = Array.from({ length: 15 }, (_, i) => 7 + i);
    const dayMissions = orders.filter(o => o.date === selectedDateStr);

    const getTimePosition = (timeStr: string) => {
        const [h, m] = String(timeStr || '09:00').split(':').map(Number);
        const offsetHours = (h || 9) - 7;
        return ((offsetHours * 60 + (m || 0)) / 60) * 100;
    };

    if (loading) {
        return (
            <div className="flex-1 flex justify-center py-20 bg-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-white h-full relative overflow-hidden">
            {/* Tab Bar */}
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
                    {['day', 'month'].map((m) => (
                        <button
                            key={m}
                            onClick={() => setViewMode(m as any)}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-[13px] font-bold transition-all capitalize",
                                viewMode === m ? "bg-white text-black shadow-sm" : "text-neutral-400"
                            )}
                        >
                            {t({ en: m, fr: m === 'day' ? 'Jour' : 'Mois', ar: m === 'day' ? 'يوم' : 'شهر' })}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {viewMode === 'month' ? (
                    /* MONTH VIEW */
                    <div className="h-full overflow-y-auto p-4 sm:p-6 pb-32 no-scrollbar">
                        <div className="flex items-center justify-between mb-8 px-1">
                            <h2 className="text-[32px] font-bold text-black lowercase tracking-tight">{monthLabel}</h2>
                            <div className="flex gap-4">
                                <button onClick={() => setMonthOffset(p => p - 1)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><ChevronLeft size={24} /></button>
                                <button onClick={() => setMonthOffset(p => p + 1)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><ChevronLeft size={24} className="rotate-180" /></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 mb-4">
                            {weekdayShorts.map((d, i) => <div key={i} className="text-center text-[12px] font-medium text-neutral-400 uppercase tracking-wider">{d}</div>)}
                        </div>

                        <div className="grid grid-cols-7 gap-1 sm:gap-2">
                            {monthDays.map((date, i) => {
                                const dateStr = format(date, 'yyyy-MM-dd');
                                const dayOrders = orders.filter(o => o.date === dateStr);
                                const isCurrentMonth = isSameMonth(date, viewMonth);
                                const isSelected = isSameDay(date, horizontalSelectedDate);
                                return (
                                    <div
                                        key={i}
                                        onClick={() => { setHorizontalSelectedDate(date); setWeekStart(getMonday(date)); setViewMode('day'); }}
                                        className={cn(
                                            "aspect-[1/1.5] border border-neutral-100 rounded-xl p-1.5 flex flex-col items-start transition-all cursor-pointer relative",
                                            !isCurrentMonth && "opacity-0 pointer-events-none",
                                            isSelected && "border-black ring-[0.5px] ring-black shadow-sm",
                                            isBefore(date, startOfDay(new Date())) && !isSelected && "bg-neutral-50/50"
                                        )}
                                    >
                                        <span className={cn("text-[15px] font-bold mb-1.5 ml-0.5", isSameDay(date, new Date()) ? "text-[#01A083]" : "text-neutral-900")}>
                                            {format(date, 'd')}
                                        </span>
                                        <div className="flex flex-col gap-1 w-full overflow-hidden mt-auto">
                                            {dayOrders.slice(0, 3).map((order) => {
                                                const color = getOrderColor(getDynamicStatus(order));
                                                return <div key={order.id} className={cn("w-full h-6 rounded-lg flex items-center px-1.5 shadow-sm overflow-hidden", color.class)}>
                                                    <span className="text-[9px] font-bold text-white truncate">{order.bricolerName?.split(' ')[0] || 'Matching'}</span>
                                                </div>
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    /* DAY VIEW */
                    <div className="flex flex-col h-full">
                        <div className="bg-white px-4 pb-3 flex-shrink-0 border-b border-neutral-50">
                            <div className="flex items-center justify-between mb-2">
                                <button onClick={() => setWeekStart(prev => addDays(prev, -7))} className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center"><ChevronLeft size={16} /></button>
                                <span className="text-[14px] font-bold text-black lowercase tracking-tight">{weekLabel}</span>
                                <button onClick={() => setWeekStart(prev => addDays(prev, 7))} className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center"><ChevronLeft size={16} className="rotate-180" /></button>
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {weekDaysArr.map(day => (
                                    <button
                                        key={day.dateStr}
                                        onClick={() => setHorizontalSelectedDate(day.date)}
                                        className={cn(
                                            "flex flex-col items-center py-2.5 rounded-xl border transition-all",
                                            day.dateStr === selectedDateStr ? "border-black bg-white shadow-sm" : "border-transparent text-neutral-400"
                                        )}
                                    >
                                        <span className="text-[9px] font-bold mb-1 uppercase opacity-60">{day.dayLabel.slice(0,1)}</span>
                                        <span className="text-[16px] font-bold">{day.dayNum}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto relative bg-[#FAFAFA] pb-32 no-scrollbar">
                            <div className="relative min-h-[1550px] w-full pt-6">
                                {hours.map((h) => (
                                    <div key={h} className="flex h-[100px] border-b border-neutral-100/60">
                                        <div className="w-16 pr-3 -mt-2.5 text-right"><span className="text-[11px] font-bold text-neutral-400 uppercase">{h}:00</span></div>
                                        <div className="flex-1 border-l border-neutral-100/60 relative" />
                                    </div>
                                ))}
                                <div className="absolute inset-0 pt-6 left-16">
                                    {dayMissions.map((order) => {
                                        const color = getOrderColor(getDynamicStatus(order));
                                        const startPos = getTimePosition(order.time?.split('-')[0] || '09:00');
                                        return (
                                            <motion.div
                                                key={order.id}
                                                onClick={() => setSelectedOrder(order)}
                                                className="absolute left-4 right-6 rounded-[24px] bg-white border border-neutral-100 p-5 z-20 cursor-pointer shadow-md flex flex-col gap-3"
                                                style={{ top: startPos + 4, height: 140, borderLeft: `6px solid ${color.raw}` }}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-neutral-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                        <img src={getServiceVector(order.service)} className="w-10 h-10 object-contain" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-[18px] font-bold text-black truncate block">{order.subServiceDisplayName || order.service}</span>
                                                        <p className="text-[14px] font-medium text-neutral-400 truncate">{order.bricolerName || 'Matching...'} • {order.city || 'Address'}</p>
                                                        <p className="text-[15px] font-bold text-[#01A083] mt-2">{order.time || '09:00'}</p>
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

            <JobDetailsPopup
                job={selectedOrder ? {
                    id: String(selectedOrder.id),
                    service: String(selectedOrder.service),
                    clientName: String(selectedOrder.clientName || 'Client'),
                    clientRating: 5.0,
                    location: String(selectedOrder.location || selectedOrder.city || ''),
                    date: String(selectedOrder.date || ''),
                    time: String(selectedOrder.time || ''),
                    duration: String(selectedOrder.duration || '2h'),
                    price: Number(selectedOrder.totalPrice || selectedOrder.price || 0),
                    status: (selectedOrder.status as any) || 'new',
                    description: String(selectedOrder.description || ''),
                    bricolerId: String(selectedOrder.bricolerId || ''),
                    bricolerName: String(selectedOrder.bricolerName || ''),
                    bricolerAvatar: String(selectedOrder.bricolerAvatar || ''),
                    bricolerRating: Number(selectedOrder.bricolerRating || 5.0)
                } as JobDetails : null}
                onClose={() => setSelectedOrder(null)}
                isAdmin={true}
                onChat={onChat}
            />
        </div>
    );
}
