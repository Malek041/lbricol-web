"use client";

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
import { format, isToday, isThisWeek, parseISO, startOfDay, addDays } from 'date-fns';
import { calculateOrderPrice } from '@/lib/pricing';



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

    const weekLabel = `${weekStart.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })} – ${addDays(weekStart, 6).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}`;

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

    return (
        <div className="flex flex-col bg-white h-full relative">
            {/* Horizontal Calendar */}
            <div className="bg-white border-b border-[#F5F5F5] px-4 pt-4 pb-4 flex-shrink-0 sticky top-0 z-30">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setWeekStart(prev => addDays(prev, -7))}
                        className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center active:bg-neutral-100 transition-colors"
                    >
                        <ChevronLeft size={20} className="text-black" />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[15px] font-medium text-black tracking-tight">{weekLabel}</span>
                    </div>
                    <button
                        onClick={() => setWeekStart(prev => addDays(prev, 7))}
                        className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center active:bg-neutral-100 transition-colors"
                    >
                        <ChevronLeft size={20} className="text-black rotate-180" />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {weekDays.map(day => {
                        const isTodayDay = day.dateStr === todayStr;
                        const isSelected = day.dateStr === selectedDateStr;
                        const hasJobs = bookedDates.has(day.dateStr);

                        return (
                            <button
                                key={day.dateStr}
                                onClick={() => setHorizontalSelectedDate(day.date)}
                                className={cn(
                                    "flex flex-col items-center py-3 rounded-2xl relative transition-all border",
                                    isSelected
                                        ? "bg-[#01A083] border-[#01A083]"
                                        : isTodayDay
                                            ? "bg-[#E6F7F4] border-[#E6F7F4]"
                                            : "bg-white border-transparent hover:border-neutral-100"
                                )}
                            >
                                <span className={cn("text-[10px] font-medium uppercase tracking-wider mb-1", isSelected ? "text-white/70" : "text-neutral-400")}>
                                    {day.dayLabel}
                                </span>
                                <span className={cn("text-[18px] font-medium", isSelected ? "text-white" : isTodayDay ? "text-[#01A083]" : "text-black")}>
                                    {day.dayNum}
                                </span>
                                {hasJobs && !isSelected && (
                                    <div className="absolute top-1.5 right-1.5">
                                        <div className="w-1.5 h-1.5 bg-[#FFC244] rounded-full" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar relative bg-[#FAFAFA] pb-24">
                <div className="relative min-h-[1550px] w-full">
                    {/* Timeline Grid */}
                    <div className="absolute inset-0 pt-6 px-0">
                        {hours.map((h) => (
                            <div key={h} className="flex h-[100px] border-b border-[#F0F0F0] group">
                                <div className="w-16 flex-none flex flex-col items-end justify-start pr-3 -mt-2.5">
                                    <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-tighter">
                                        {new Date(2000, 0, 1, h, 0).toLocaleTimeString(dateLocale, { hour: 'numeric', hour12: true })}
                                    </span>
                                </div>
                                <div className="flex-1 border-l border-[#F0F0F0] relative">
                                    <div className="absolute top-[50px] left-0 right-0 border-t border-[#FAFAFA] border-dashed" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Missions Layer */}
                    <div className="absolute inset-0 pt-6 left-16">
                        {dayMissions.map((order, idx) => {
                            const fromTime = order.time?.split('-')[0].trim() || "09:00";
                            const toTime = order.time?.split('-')[1]?.trim() || "11:00";
                            return (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={() => onSelectOrder(order)}
                                    className="absolute left-6 right-8 rounded-2xl bg-white border border-neutral-100 p-4 z-20 cursor-pointer active:scale-[0.98] transition-all flex items-start gap-4"
                                    style={{
                                        top: getTimePosition(fromTime) + 2,
                                        height: getTimeHeight(fromTime, toTime) - 4
                                    }}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-neutral-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {order.images && order.images.length > 0 ? (
                                            <img src={order.images[0]} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={getServiceVector(order.service)} alt={order.service} className="w-8 h-8 object-contain" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[16px] font-medium text-black truncate uppercase tracking-tight">
                                                {order.subServiceDisplayName || order.service}
                                            </span>
                                            <div className="w-6 h-6 rounded-full bg-[#FFC244] flex items-center justify-center">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        </div>
                                        <p className="text-[13px] font-medium text-neutral-400 truncate">
                                            {order.bricolerName || t({ en: 'Matching...', fr: 'Recherche...', ar: 'جاري البحث...' })} • {order.city || (typeof order.location === 'object' ? (order.location as any).address : order.location)}
                                        </p>
                                        <p className="text-[12px] font-medium text-[#01A083] mt-1">
                                            {order.time}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
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
            const startTimePart = rawStartTime.includes(':') && rawStartTime.split(':').length === 2 ? `${rawStartTime}:00` : rawStartTime;
            const startDatePart = order.date.substring(0, 10);
            const startDateTime = new Date(`${startDatePart}T${startTimePart}`);
            const rawEndTime = order.carReturnTime.split('-')[0].trim();
            const endTimePart = rawEndTime.includes(':') && rawEndTime.split(':').length === 2 ? `${rawEndTime}:00` : rawEndTime;
            const endDatePart = order.carReturnDate.substring(0, 10);
            const endDateTime = new Date(`${endDatePart}T${endTimePart}`);
            if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) return 0;
            const totalDuration = endDateTime.getTime() - startDateTime.getTime();
            const elapsed = currentTime.getTime() - startDateTime.getTime();
            if (elapsed <= 0) return 0;
            if (elapsed >= totalDuration) return 100;
            return Math.floor((elapsed / totalDuration) * 100);
        } catch (e) { return 0; }
    };

    const getTimeRemaining = (order: OrderDetails) => {
        if (!order.date || !order.time) return null;
        try {
            const isCarRental = order.service === 'car_rental';
            const pickupProgress = getProgress(order);
            const isRentalInProgress = isCarRental && pickupProgress === 100 && !['done', 'delivered'].includes(order.status || '');
            let rawTime = order.time.split('-')[0].trim();
            let datePart = order.date.substring(0, 10);
            if (isRentalInProgress && order.carReturnDate && order.carReturnTime) {
                rawTime = order.carReturnTime.split('-')[0].trim();
                datePart = order.carReturnDate.substring(0, 10);
            }
            const timePart = rawTime.includes(':') && rawTime.split(':').length === 2 ? `${rawTime}:00` : rawTime;
            const targetDate = new Date(`${datePart}T${timePart}`);
            if (isNaN(targetDate.getTime())) return null;
            const diffMs = targetDate.getTime() - currentTime.getTime();
            if (diffMs < 0) return null;
            const diffMins = Math.floor(diffMs / 60000);
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            if (hours > 24) return `(${Math.floor(hours / 24)} ${t({ en: 'd left', fr: 'j rest.', ar: 'ي متبقية' })})`;
            if (hours > 0) return `(${hours}h ${mins}m ${t({ en: 'left', fr: 'rest.', ar: 'متبقية' })})`;
            return `(${mins}m ${t({ en: 'left', fr: 'rest.', ar: 'متبقية' })})`;
        } catch (e) { return null; }
    };
    const [activeTab, setActiveTab] = useState<'activity' | 'calendar'>('activity');
    const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
    const [liveBricolerInfo, setLiveBricolerInfo] = useState<{ rating: number, jobsCount: number } | null>(null);

    const openWhatsApp = async (number?: string | null, bricolerId?: string) => {
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

        const cleanNumber = targetNumber.replace(/\D/g, '');
        const finalNumber = cleanNumber.startsWith('212') ? cleanNumber : `212${cleanNumber.startsWith('0') ? cleanNumber.slice(1) : cleanNumber}`;
        window.open(`https://wa.me/${finalNumber}`, '_blank');
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
            setShowCancelModal(true);
            if (isFromRedistributed) {
                setCancelReason("Redistributed order cancelled by client");
            } else {
                setCancelReason("");
            }
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
            {/* Top Tabs */}
            <div className="px-6 pt-8 pb-3 bg-white border-b border-[#E6E6E6] sticky top-0 z-10">
                <div className="flex items-center gap-6">
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
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto relative w-full">
                {activeTab === 'activity' ? (
                    <ActivityTab
                        orders={orders}
                        onSelect={setSelectedOrder}
                        onShowHistory={() => setShowHistory(true)}
                        onResumeDraft={onResumeDraft}
                        onCancelOrder={handleCancelOrder}
                    />
                ) : (
                    <CalendarTab
                        orders={orders}
                        onSelectOrder={setSelectedOrder}
                        horizontalSelectedDate={horizontalSelectedDate}
                        setHorizontalSelectedDate={setHorizontalSelectedDate}
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
                            {/* Header (Moved here to be scrollable) */}
                            <div style={{ flexShrink: 0, width: '100%', paddingTop: '48px', paddingBottom: '16px', paddingLeft: '24px', paddingRight: '24px', backgroundColor: '#fff', borderBottom: '1px solid #F0F0F0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <button
                                        onClick={() => setSelectedOrder(null)}
                                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#01A083] active:scale-95 transition-all"
                                    >
                                        <ChevronLeft size={28} className="text-white" />
                                    </button>
                                    <div className="text-right">
                                        <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-widest block">
                                            {t({ en: 'Order ID', fr: 'ID Commande', ar: 'رقم الطلب' })}
                                        </span>
                                        <span className="text-[17px] font-medium text-black">
                                            #{selectedOrder.id?.slice(-6).toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6">
                                {/* Hero Image & Title Section */}
                                <div className="text-center mt-8 mb-10">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="flex justify-center mb-6"
                                    >
                                        <img
                                            src={selectedOrder.service === 'car_rental' ?
                                                (selectedOrder.selectedCar?.modelImage || selectedOrder.selectedCar?.image || "/Images/Vectors Illu/carKey.png") :
                                                getServiceVector(selectedOrder.service || '')
                                            }
                                            className="w-40 h-40 object-contain"
                                            alt="Service"
                                        />
                                    </motion.div>
                                    <h2 className="text-[28px] font-medium text-black mb-2 tracking-tight">
                                        {t({ en: 'Order Details', fr: 'Détails de la mission', ar: 'تفاصيل المهمة' })}
                                    </h2>
                                    <div className="text-[17px] font-medium text-neutral-500 flex items-center justify-center gap-2">
                                        <span>{selectedOrder.date ? format(parseISO(selectedOrder.date), 'MMMM d, yyyy') : ''}</span>
                                        <span>•</span>
                                        <span>{selectedOrder.time || '09:00'}</span>
                                    </div>
                                </div>

                                {/* Decorative Separator */}
                                <div className="mx-[-24px] mb-8 relative h-5 overflow-hidden">
                                    <svg width="100%" height="20" viewBox="0 0 400 20" preserveAspectRatio="none">
                                        <path d="M0 10 Q 5 0, 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10 T 110 10 T 120 10 T 130 10 T 140 10 T 150 10 T 160 10 T 170 10 T 180 10 T 190 10 T 200 10 T 210 10 T 220 10 T 230 10 T 240 10 T 250 10 T 260 10 T 270 10 T 280 10 T 290 10 T 300 10 T 310 10 T 320 10 T 330 10 T 340 10 T 350 10 T 360 10 T 370 10 T 380 10 T 390 10 T 400 10 V 20 H 0 Z" fill="#F9FAFB" />
                                    </svg>
                                </div>

                                {/* Bricoler Details Section (REQUESTED TO KEEP) */}
                                {selectedOrder.bricolerId && (
                                    <section className="mb-10">
                                        <h3 className="text-[25px] font-medium text-black mb-6 flex items-center gap-3">
                                            Professional <span className="text-2xl">👨‍🔧</span>
                                        </h3>
                                        <div className="bg-[#F9FAFB] rounded-[32px] p-4 sm:p-6 border border-neutral-100 flex flex-wrap items-center gap-4 sm:gap-6">
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] bg-white flex-shrink-0 overflow-hidden relative border-2 border-white">
                                                <img
                                                    src={selectedOrder.bricolerAvatar || "/Images/Vectors Illu/Avatar.png"}
                                                    className="w-full h-full object-cover"
                                                    alt="Pro"
                                                />
                                                <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#01A083] rounded-full border-2 border-white flex items-center justify-center">
                                                    <Check size={10} className="text-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-[120px]">
                                                <h4 className="text-[20px] font-medium text-black mb-1 leading-tight">{selectedOrder.bricolerName}</h4>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <Star size={14} className="fill-yellow-400 text-yellow-400" />
                                                        <span className="text-[14px] font-medium text-black">{selectedOrder.bricolerRating || '4.9'}</span>
                                                    </div>
                                                    <span className="text-neutral-300 flex-shrink-0">|</span>
                                                    <span className="text-[13px] font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">
                                                        {t({ en: 'Verified Pro', fr: 'Pro Vérifié', ar: 'محترف موثق' })}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveChatOrderId(selectedOrder.id!);
                                                }}
                                                className="w-14 h-14 rounded-[20px] bg-[#01A083] flex flex-shrink-0 items-center justify-center active:scale-90 transition-all "
                                            >
                                                <MessageCircle size={28} className="text-white" />
                                            </button>
                                        </div>
                                    </section>
                                )}

                                {/* Payment Details Section */}
                                <section className="mb-10">
                                    <h3 className="text-[25px] font-medium text-black mb-2 flex items-center gap-3">
                                        Payment <span className="text-2xl">💳</span>
                                    </h3>
                                    <p className="text-[15px] font-medium text-neutral-400 mb-6">
                                        {t({ en: 'Method of payment', fr: 'Mode de paiement', ar: 'طريقة الدفع' })}
                                    </p>

                                    <div className="bg-[#F9FAFB] rounded-[32px] p-6 border border-neutral-100 flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-[24px] bg-white flex items-center justify-center text-3xl">
                                            {selectedOrder.paymentMethod === 'bank_transfer' ? '🏦' : '💵'}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[18px] font-medium text-black mb-1 capitalize">
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
                                        <div className="w-10 h-10 rounded-full bg-[#01A083]/10 flex items-center justify-center">
                                            <Check size={20} className="text-[#01A083]" />
                                        </div>
                                    </div>
                                </section>

                                {/* Setup Summary Section */}
                                <section className="mb-10">
                                    <h3 className="text-[25px] font-medium text-black mb-6">
                                        Setup Summary <span className="text-2xl">📋</span>
                                    </h3>
                                    <div className=" bg-[#F9FAFB]rounded-[20px] p-4 space-y-6">
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
                                                    rooms: parseInt(String((selectedOrder.details?.serviceDetails as any)?.rooms || 1)),
                                                    hours: parseFloat(String((selectedOrder.details?.serviceDetails as any)?.taskDuration || 1)),
                                                    days: parseInt(String((selectedOrder.details?.serviceDetails as any)?.days || 1)),
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
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e4e4ff', paddingBottom: 16 }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Type', fr: 'Type', ar: 'النوع' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#111827', textAlign: 'right' }}>
                                                            {(() => {
                                                                const { getSubServiceName } = require('@/config/services_config');
                                                                const subName = getSubServiceName(selectedOrder.service, subId);
                                                                return subName ? t({ en: subName, fr: subName, ar: subName }) : (selectedOrder.serviceName || selectedOrder.service);
                                                            })()}
                                                        </span>
                                                    </div>

                                                    {isHouseCleaning && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid #e4e4e4ff', paddingBottom: 16 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Place', fr: 'Lieu' })}</span>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{details.propertyType || 'Studio'}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Rooms', fr: 'Pièces' })}</span>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{details.rooms || 1}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isOfficeCleaning && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid #e4e4e4ff', paddingBottom: 16 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Desks', fr: 'Bureaux' })}</span>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{details.officeDesks || 1}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Meeting Rooms', fr: 'Salles de réunion' })}</span>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{details.officeMeetingRooms || 0}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Bathrooms', fr: 'Salles de bain' })}</span>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{details.officeBathrooms || 0}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isTvMounting && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid #e4e4e4ff', paddingBottom: 16 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'TV count', fr: 'Nombre de TV' })}</span>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{details.tvCount || 1}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Wall', fr: 'Mur' })}</span>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{details.wallMaterial}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Base price', fr: 'Prix de base', ar: 'السعر الأساسي' })}</span>
                                                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 350 }}>i</div>
                                                        </div>
                                                        <span style={{ fontSize: 17, fontWeight: 450, color: '#111827' }}>
                                                            {Math.round(breakdown.basePrice)} MAD/{breakdown.unit === 'unit' ? (t({ en: 'unit', fr: 'unité', ar: 'وحدة' })) : breakdown.unit === 'day' ? (t({ en: 'day', fr: 'jour', ar: 'يوم' })) : breakdown.unit === 'office' ? (t({ en: 'office', fr: 'bureau', ar: 'مكتب' })) : (t({ en: 'hr', fr: 'h', ar: 'ساعة' }))}
                                                        </span>
                                                    </div>

                                                    {breakdown.details && breakdown.details.map((detail, idx) => (
                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, borderLeft: '2px solid rgba(1, 160, 131, 0.2)' }}>
                                                            <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t(detail.label)}</span>
                                                            <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{detail.amount.toFixed(0)} MAD</span>
                                                        </div>
                                                    ))}

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Services', fr: 'Services', ar: 'الخدمات' })}</span>
                                                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 350 }}>i</div>
                                                        </div>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{breakdown.subtotal.toFixed(2)} MAD</span>
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Lbricol Fee', fr: 'Frais Lbricol', ar: 'رسوم Lbricol' })}</span>
                                                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 350 }}>i</div>
                                                        </div>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{breakdown.serviceFee.toFixed(2)} MAD</span>
                                                    </div>

                                                    {breakdown.travelFee > 0 && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                    <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Travel Fee', fr: 'Frais de déplacement', ar: 'رسوم التنقل' })}</span>
                                                                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 350 }}>i</div>
                                                                </div>
                                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#9CA3AF', marginTop: 4 }}>
                                                                    {breakdown.distanceKm?.toFixed(1)} km · ~{breakdown.duration} min
                                                                </span>
                                                            </div>
                                                            <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{breakdown.travelFee.toFixed(2)} MAD</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </section>

                                {/* Location Summaries */}
                                <section className="mb-10">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {/* Pickup Location or User Location */}
                                        <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #F3F4F6', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <MapPin size={20} className="text-[#01A083]" />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                                                    {(selectedOrder.service === 'errands' || selectedOrder.service?.includes('delivery')) ? t({ en: 'Pickup Location', fr: 'Lieu d\'enlèvement', ar: 'موقع الاستلام' }) : t({ en: 'Your Location', fr: 'Votre Position', ar: 'موقعك' })}
                                                </div>
                                                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {typeof selectedOrder.location === 'object' ? (selectedOrder.location as any).address : selectedOrder.location}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dropoff Location */}
                                        {(selectedOrder.service === 'errands' || selectedOrder.service?.includes('delivery')) && selectedOrder.details?.serviceDetails?.dropoffAddress && (
                                            <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #F3F4F6', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <MapPin size={20} className="text-[#01A083]" />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{t({ en: 'Dropoff Location', fr: 'Lieu de dépôt', ar: 'موقع التسليم' })}</div>
                                                    <div style={{ fontSize: 15, fontWeight: 900, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {selectedOrder.details.serviceDetails.dropoffAddress}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Bricoler Location */}
                                        {selectedOrder.providerAddress && (
                                            <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #F3F4F6', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <MapPin size={20} className="text-[#01A083]" />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{t({ en: 'Bricoler Location', fr: 'Position du Bricoleur', ar: 'موقع العامل' })}</div>
                                                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                                                        {selectedOrder.providerAddress || 'Essaouira, Morocco'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Description Card */}
                                {selectedOrder.details?.note && (
                                    <section className="mb-10">
                                        <h3 className="text-[25px] font-medium text-black mb-6">
                                            Description <span className="text-2xl">📝</span>
                                        </h3>
                                        <div className="bg-[#F9FAFB] rounded-[32px] p-8 border border-neutral-100">
                                            <p className="text-[16px] font-medium text-neutral-600 leading-relaxed italic">
                                                "{selectedOrder.details.note}"
                                            </p>
                                        </div>
                                    </section>
                                )}

                                {/* Attached Photos */}
                                <section className="mb-10">
                                    <h3 className="text-[25px] font-medium text-black mb-6">
                                        {t({ en: 'Attached Photos', fr: 'Photos Jointes', ar: 'الصور المرفقة' })} <span className="text-2xl">📸</span>
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {(selectedOrder.details?.serviceDetails?.photoUrls || (selectedOrder as any)?.images || [])?.map((url: string, i: number) => (
                                            <div key={i} className="aspect-square bg-neutral-100 rounded-[12px] overflow-hidden border border-neutral-100/50 group relative">
                                                <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Cancel Order — inside scrollable area */}
                                {!['done', 'cancelled', 'delivered'].includes(selectedOrder.status || '') && (
                                    <section className="mb-6">
                                        <button
                                            onClick={() => handleCancelOrder(selectedOrder.id!)}
                                            className="w-full py-4 rounded-2xl border-2 border-red-200 text-red-500 font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-red-50 active:scale-[0.98] transition-all"
                                        >
                                            <Ban size={18} />
                                            {t({ en: 'Cancel Order', fr: 'Annuler la commande', ar: 'إلغاء الطلب' })}
                                        </button>
                                    </section>
                                )}

                                {/* Help Link Footer Content */}
                                <div className="pt-2 pb-[160px] text-center">
                                    <button
                                        onClick={() => window.open('https://wa.me/212702814355', '_blank')}
                                        className="inline-flex items-center gap-2 text-[15px] font-medium text-[#01A083] hover:underline"
                                    >
                                        <HelpCircle size={18} />
                                        {t({ en: 'Need help with this order?', fr: 'Besoin d\'aide pour cette commande ?', ar: 'تحتاج مساعدة؟' })}
                                    </button>
                                </div>

                            </div>
                        </div>

                        {/* Fixed Bottom Total Footer (Yellow Signature) */}
                        {!activeChatOrderId && (
                            <div className="fixed bottom-0 left-0 right-0 bg-[#FFC244] z-[4005] px-8 pt-10 pb-[calc(24px+env(safe-area-inset-bottom))]">
                                {/* Wave Top Effect */}
                                <div className="absolute top-[-30px] left-0 right-0 h-[30px] pointer-events-none">
                                    <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full fill-[#FFC244]">
                                        <path d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                                    </svg>
                                </div>

                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-[22px] font-medium text-black">{t({ en: 'Total Price', fr: 'Prix Total', ar: 'الإجمالي' })}</span>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-[36px] font-[1000] text-black tracking-tighter">
                                            {(selectedOrder.totalPrice || parseFloat(String(selectedOrder.price || '0'))).toFixed(0)}
                                        </span>
                                        <span className="text-[18px] font-medium text-black">MAD</span>
                                    </div>
                                </div>

                                {/* Single CTA — Chat with Bricoler */}
                                <button
                                    onClick={() => setActiveChatOrderId(selectedOrder.id!)}
                                    style={{ background: '#01A083' }}
                                    className="w-full text-white py-4 rounded-full font-bold text-[16px] flex items-center justify-center gap-2 active:scale-95 transition-transform border border-[#008f75]"
                                >
                                    <MessageCircle size={20} />
                                    {t({ en: 'Chat with Bricoler', fr: 'Chatter avec le Bricoler', ar: 'الدردشة مع الصانع' })}
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
                        className="fixed inset-0 z-[5000] bg-[#FFFFFF] flex flex-col"
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

                        {/* Footer */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-100 pb-12">
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
                const saved = localStorage.getItem('lbricol_order_drafts');
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
                        localStorage.setItem('lbricol_order_drafts', JSON.stringify(deduped));
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
            localStorage.setItem('lbricol_order_drafts', JSON.stringify(updated));
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
                className="bg-white rounded-[35px_22px_45px_28px] p-5 flex items-center gap-5 cursor-pointer transition-all mb-4 border-2 border-black/5 relative overflow-hidden group hover:border-[#FFC244]/30"
            >
                {/* Draft Badge */}
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-[#FFC244] text-black text-[11px] font-medium rounded-bl-xl uppercase tracking-wider">
                    {t({ en: 'Resume', fr: 'Reprendre', ar: 'متابعة' })}
                </div>

                <div className="w-20 h-20 bg-neutral-50 rounded-2xl flex items-center justify-center flex-shrink-0 p-3">
                    <img src={getServiceVector(draft.service)} className="w-full h-full object-contain" />
                </div>

                <div className="flex-1 min-w-0 pr-8">
                    <h3 className="text-[18px] font-medium text-black truncate leading-tight mb-1">
                        {draft.service} {draft.subService ? `› ${getSubServiceName(draft.service, draft.subService)}` : ''}
                    </h3>
                    <p className="text-[14px] font-medium text-neutral-400 line-clamp-1">
                        {draft.description || t({ en: 'Continue where you left off', fr: 'Continuez là où vous vous êtes arrêté', ar: 'أكمل من حيث توقفت' })}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#FFC244] rounded-full" style={{ width: `${(draft.step / 4) * 100}%` }} />
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
