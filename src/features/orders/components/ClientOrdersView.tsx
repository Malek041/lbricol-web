"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderDetails } from '@/features/orders/components/OrderCard';
import { ChevronLeft, Info, MessageCircle, MessageSquare, Image, HelpCircle, X, MapPin, Clock, Calendar as CalendarIcon, Phone, User, Ban, Check, AlertTriangle, RefreshCw, CreditCard, Wrench, Banknote, Star } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { WhatsAppBrandIcon } from '@/components/shared/WhatsAppIcon';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, increment, serverTimestamp, getDoc, addDoc, collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { getServiceById, getSubServiceName, getServiceVector } from '@/config/services_config';
import { format, isToday, isThisWeek, parseISO, startOfDay, addDays } from 'date-fns';



interface ClientOrdersViewProps {
    orders: OrderDetails[];
    onViewMessages: (jobId: string) => void;
    initialShowHistory?: boolean;
    onResumeDraft?: (draft: any) => void;
}

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
                        <span className="text-[15px] font-black text-black tracking-tight">{weekLabel}</span>
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
                                        ? "bg-[#00A082] border-[#00A082]"
                                        : isTodayDay
                                            ? "bg-[#E6F7F4] border-[#E6F7F4]"
                                            : "bg-white border-transparent hover:border-neutral-100"
                                )}
                            >
                                <span className={cn("text-[10px] font-black uppercase tracking-wider mb-1", isSelected ? "text-white/70" : "text-neutral-400")}>
                                    {day.dayLabel}
                                </span>
                                <span className={cn("text-[18px] font-black", isSelected ? "text-white" : isTodayDay ? "text-[#00A082]" : "text-black")}>
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
                                    <span className="text-[11px] font-black text-neutral-400 uppercase tracking-tighter">
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
                                    className="absolute left-6 right-8 rounded-2xl bg-white border border-neutral-100 p-4 shadow-lg z-20 cursor-pointer hover:shadow-xl active:scale-[0.98] transition-all flex items-start gap-4"
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
                                            <span className="text-[16px] font-black text-black truncate uppercase tracking-tight">
                                                {order.subServiceDisplayName || order.service}
                                            </span>
                                            <div className="w-6 h-6 rounded-full bg-[#FFC244] flex items-center justify-center">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        </div>
                                        <p className="text-[13px] font-medium text-neutral-400 truncate">
                                            {order.bricolerName || t({ en: 'Matching...', fr: 'Recherche...', ar: 'جاري البحث...' })} • {order.city || order.location}
                                        </p>
                                        <p className="text-[12px] font-black text-[#00A082] mt-1">
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

export default function ClientOrdersView({ orders, onViewMessages, initialShowHistory = false, onResumeDraft }: ClientOrdersViewProps) {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'activity' | 'calendar'>('activity');
    const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
    const [liveBricolerInfo, setLiveBricolerInfo] = useState<{ rating: number, jobsCount: number } | null>(null);

    const openWhatsApp = async (number?: string, bricolerId?: string) => {
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
    const [isCancelling, setIsCancelling] = useState(false);
    const [isRedistributeCancellation, setIsRedistributeCancellation] = useState(false);

    // Filter orders for history (done and cancelled)
    const historyOrders = useMemo(() => {
        return orders.filter(o => ['done', 'cancelled'].includes(o.status || ''))
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [orders]);

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
        setIsRedistributeCancellation(isFromRedistributed);
        setShowCancelModal(true);
        if (isFromRedistributed) {
            setCancelReason("Redistributed order cancelled by client");
        } else {
            setCancelReason('');
        }
    };

    const getHeroImage = (service: string) => {
        const serviceMap: Record<string, string> = {
            'cleaning': '/Images/Job Cards Images/Cleaning_job_card.webp',
            'electricity': '/Images/Job Cards Images/Electricity_job_card.webp',
            'plumbing': '/Images/Job Cards Images/Plumbing_job_card.webp',
            'painting': '/Images/Job Cards Images/Painting_job_card.webp',
            'handyman': '/Images/Job Cards Images/Handyman_job_card.webp',
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
            await updateDoc(jobRef, { rated: true });

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
            className="flex items-center gap-4 py-4 border-b border-[#F0F0F0] cursor-pointer"
        >
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                {order.images && order.images.length > 0 ? (
                    <img
                        src={order.images[0]}
                        alt="Task photo"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <img
                        src={getHeroImage(order.service)}
                        alt={order.service}
                        className="w-full h-full object-cover"
                    />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-[17px] font-black text-black leading-tight truncate">
                    {order.subServiceDisplayName || order.service}
                </h3>
                <p className="text-[14px] font-medium text-neutral-400 mt-0.5 truncate">
                    {order.bricolerName ? `${order.bricolerName} • ` : ''}{t({ en: '1x task from', fr: '1x tâche de', ar: 'مهمة واحدة من' })} <span className="capitalize">{order.service}</span>
                </p>
                <p className="text-[14px] font-bold text-neutral-400 mt-1 capitalize">
                    {order.status === 'done' ? t({ en: 'Completed', fr: 'Terminée', ar: 'مكتملة' }) : order.status} • {order.city || order.location}
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
                            activeTab === 'activity' ? "font-black text-[#1D1D1D]" : "font-bold text-[#6B6B6B]"
                        )}
                    >
                        {t({ en: 'Activity', fr: 'Activité', ar: 'النشاط' })}
                        {activeTab === 'activity' && (
                            <motion.div layoutId="client-orders-tab" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#00A082] rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={cn(
                            "pb-3 text-[16px] transition-all relative",
                            activeTab === 'calendar' ? "font-black text-[#1D1D1D]" : "font-bold text-[#6B6B6B]"
                        )}
                    >
                        {t({ en: 'Calendar', fr: 'Calendrier', ar: 'التقويم' })}
                        {activeTab === 'calendar' && (
                            <motion.div layoutId="client-orders-tab" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#00A082] rounded-t-full" />
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
                            <h1 className="text-[28px] font-black text-black">{t({ en: 'Order history', fr: 'Historique des commandes', ar: 'سجل الطلبات' })}</h1>
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
                                    <h3 className="text-[20px] font-black text-black">{t({ en: 'No history yet', fr: 'Aucun historique pour le moment', ar: 'لا يوجد سجل بعد' })}</h3>
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
                        className="fixed inset-0 z-[4000] bg-white flex flex-col"
                    >
                        <div className="flex items-center justify-between px-12 py-5 border-b border-neutral-50 sticky top-0 bg-white z-50">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-neutral-50 active:scale-90 transition-transform"
                                >
                                    <ChevronLeft size={28} className="text-black" />
                                </button>
                                <h1 className="text-[20px] font-black text-black">{t({ en: 'Order details', fr: 'Détails de la commande', ar: 'تفاصيل الطلب' })}</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedOrder.bricolerWhatsApp && (
                                    <button
                                        onClick={() => openWhatsApp(selectedOrder.bricolerWhatsApp)}
                                        className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-[#25D366] hover:scale-110 active:scale-95 transition-all group"
                                        title={t({ en: 'Contact Bricoler via WhatsApp', fr: 'Contacter le Bricoler via WhatsApp', ar: 'اتصل بالبريكولر عبر واتساب' })}
                                    >
                                        <WhatsAppBrandIcon size={32} className="drop-shadow-sm" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            <div className="pb-10">
                                <div className="px-6 md:px-12 pt-10 pb-6 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                                    <div className="w-32 h-32 md:w-35 md:h-50 flex-shrink-0 overflow-hidden rounded-2xl bg-neutral-100 flex items-center justify-center border border-neutral-100">
                                        {selectedOrder.images && selectedOrder.images.length > 0 ? (
                                            <img
                                                src={selectedOrder.images[0]}
                                                className="w-full h-full object-cover"
                                                alt="task preview"
                                            />
                                        ) : (
                                            <img
                                                src="/Images/Vectors Illu/NewOrder.webp"
                                                className="w-full h-full object-contain p-2"
                                                alt="illustration"
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <h2 className="text-[32px] md:text-[42px] font-black text-black leading-[1.1] tracking-tighter">
                                            {selectedOrder.status === 'done' ? t({ en: 'Completed', fr: 'Terminé', ar: 'مكتمل' }) :
                                                selectedOrder.status === 'delivered' ? t({ en: 'Job Delivered', fr: 'Job Livré', ar: 'تم التسليم' }) :
                                                    selectedOrder.status === 'cancelled' ? t({ en: 'Cancelled', fr: 'Annulé', ar: 'ملغى' }) :
                                                        selectedOrder.status === 'confirmed' || selectedOrder.status === 'programmed' ? t({ en: 'Programmed', fr: 'Programmé', ar: 'مجدول' }) :
                                                            t({ en: 'Ongoing', fr: 'En cours', ar: 'جاري' })}
                                        </h2>
                                        <div className="flex items-center gap-2 text-[18px] font-semibold text-black mt-1">
                                            <span>{selectedOrder.date ? format(parseISO(selectedOrder.date), 'MMM d, yyyy') : t({ en: 'Date TBD', fr: 'Date à définir', ar: 'التاريخ يحدد لاحقاً' })}</span>
                                            <span className="text-neutral-200">|</span>
                                            <span>{selectedOrder.time || t({ en: 'Flexible', fr: 'Flexible', ar: 'مرن' })}</span>
                                        </div>
                                        <p className="text-[12px] font-light text-black uppercase tracking-[0.2em] mt-2">
                                            {t({ en: 'ORDER ID', fr: 'ID DE COMMANDE', ar: 'رقم الطلب' })}: #{selectedOrder.id?.slice(-8).toUpperCase() || '---'}
                                        </p>
                                    </div>
                                </div>

                                {/* Key Details Grid */}
                                <div className="px-6 md:px-12 mb-8">
                                    <div className="grid grid-cols-1 gap-4">
                                        {/* Contact Bricoler CTA - shown when a bricoler is assigned */}
                                        {selectedOrder.bricolerWhatsApp && (
                                            <button
                                                onClick={() => openWhatsApp(selectedOrder.bricolerWhatsApp)}
                                                className="w-full flex items-center justify-center gap-4 py-6 rounded-[24px] bg-[#25D366] text-white font-[1000] text-[18px] hover:bg-[#128C7E] active:scale-95 transition-all shadow-xl shadow-[#25D366]/20 group relative overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <WhatsAppBrandIcon size={36} className="group-hover:scale-110 transition-transform drop-shadow-sm" />
                                                <span className="tracking-tight">{t({ en: 'Contact Bricoler', fr: 'Contacter le Bricoler', ar: 'اتصل بالبريكولر' })}</span>
                                            </button>
                                        )}
                                        <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-4 border border-neutral-100/50">
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                <Clock size={20} className="text-[#00A082]" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Duration', fr: 'Durée', ar: 'المدة' })}</span>
                                                <span className="text-[16px] font-black text-black">≈ {selectedOrder.duration || '2h-3h'}</span>
                                            </div>
                                        </div>
                                        <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-4 border border-neutral-100/50">
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                <Banknote size={20} className="text-[#00A082]" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Price', fr: 'Prix', ar: 'السعر' })}</span>
                                                <span className="text-[16px] font-black text-black">{(selectedOrder.totalPrice || 0).toFixed(0)} MAD</span>
                                            </div>
                                        </div>
                                        <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-4 border border-neutral-100/50">
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                <Wrench size={20} className="text-[#00A082]" />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Service', fr: 'Service', ar: 'الخدمة' })}</span>
                                                <span className="text-[16px] font-black text-black truncate">{selectedOrder.subServiceName || selectedOrder.serviceName || selectedOrder.service}</span>
                                            </div>
                                        </div>
                                        <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-4 border border-neutral-100/50">
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                <CreditCard size={20} className="text-[#00A082]" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Payment', fr: 'Paiement', ar: 'الدفع' })}</span>
                                                <span className="text-[16px] font-black text-black">{t({ en: 'Cash', fr: 'Espèces', ar: 'نقداً' })}</span>
                                            </div>
                                        </div>
                                        {/* Location */}
                                        <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-4 border border-neutral-100/50">
                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                <MapPin size={20} className="text-[#00A082]" />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Location', fr: 'Localisation', ar: 'الموقع' })}</span>
                                                <span className="text-[16px] font-black text-black">
                                                    {selectedOrder.city || t({ en: 'Unknown City', fr: 'Ville inconnue' })}{selectedOrder.location ? `, ${selectedOrder.location}` : ''}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Description */}
                                        <div className="bg-neutral-50 rounded-2xl p-4 flex items-start gap-4 border border-neutral-100/50">
                                            <div className="w-10 h-10 rounded-full bg-white flex-shrink-0 flex items-center justify-center shadow-sm">
                                                <Info size={20} className="text-[#00A082]" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Description', fr: 'Description', ar: 'الوصف' })}</span>
                                                <p className="text-[14px] font-semibold text-black leading-tight">
                                                    {selectedOrder.description || selectedOrder.comment || t({ en: 'No specific instructions.', fr: 'Aucune instruction spécifique.', ar: 'لا توجد تعليمات محددة.' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bricoler Info Section moved higher for better visibility */}
                                {(selectedOrder.bricolerId || selectedOrder.bricolerName) && (
                                    <div className="px-6 md:px-12 mb-10">
                                        <div className="bg-white rounded-[28px] p-5 flex items-center justify-between border-2 border-neutral-50 shadow-sm transition-all hover:border-[#00A082]/10">
                                            <div className="flex items-center gap-4">
                                                <div className="h-16 w-16 rounded-2xl overflow-hidden bg-neutral-100 shadow-sm border border-neutral-50">
                                                    {selectedOrder.bricolerAvatar ? (
                                                        <img src={selectedOrder.bricolerAvatar} alt={selectedOrder.bricolerName || ''} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center text-[24px] font-black text-[#00A082] bg-[#00A082]/5">
                                                            {(selectedOrder.bricolerName || 'B')[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">{t({ en: 'Selected Professional', fr: 'Professionnel sélectionné', ar: 'المحترف المختار' })}</p>
                                                    <p className="text-[20px] font-[1000] text-black leading-tight">{selectedOrder.bricolerName || 'Bricoler'}</p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <div className="flex items-center gap-0.5">
                                                            {[1, 2, 3, 4, 5].map((s) => {
                                                                const r = liveBricolerInfo?.rating ?? Number(selectedOrder.bricolerRating) ?? 0;
                                                                return (
                                                                    <Star
                                                                        key={s}
                                                                        size={14}
                                                                        className={cn(
                                                                            "transition-all",
                                                                            s <= Math.floor(r)
                                                                                ? "fill-[#FFC244] text-[#FFC244]"
                                                                                : "fill-neutral-100 text-neutral-200"
                                                                        )}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                        <span className="text-[15px] font-black text-[#D89B1A] ml-1">{(liveBricolerInfo?.rating ?? Number(selectedOrder.bricolerRating) ?? 0).toFixed(1)}</span>
                                                        <span className="text-[13px] text-neutral-400 font-bold ml-1">({liveBricolerInfo?.jobsCount ?? selectedOrder.bricolerJobsCount ?? 0} {t({ en: 'reviews', fr: 'avis', ar: 'تقييم' })})</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {selectedOrder.bricolerWhatsApp && (
                                                    <button
                                                        onClick={() => openWhatsApp(selectedOrder.bricolerWhatsApp)}
                                                        className="p-1 rounded-full flex items-center justify-center text-[#25D366] hover:scale-110 active:scale-90 transition-all group"
                                                    >
                                                        <WhatsAppBrandIcon size={48} className="md:w-[56px] md:h-[56px]" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Wide Light ZigZag */}
                                <div className="w-full relative h-[40px] flex items-center overflow-hidden">
                                    <div className="absolute w-full h-[2px] bg-neutral-100/50" />
                                    <div className="w-full h-full flex justify-center opacity-[0.08]" style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='10' viewBox='0 0 40 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10L20 0L40 10' stroke='black' stroke-width='2'/%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'repeat-x',
                                        backgroundPosition: 'center'
                                    }} />
                                </div>

                                <div className="px-6 py-8 space-y-10">
                                    {/* Your Order */}
                                    <div className="space-y-4">
                                        <div className="flex items-center  gap-2">
                                            <div className="flex items-center gap-2 min-w-0">

                                            </div>
                                            <div className="flex-shrink-0 px-3 py-1 bg-[#FFC244]/20 text-black text-[13px] font-black rounded-md whitespace-nowrap">
                                                ≈ {selectedOrder.duration || '2h-3h'}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[20px] font-semibold text-black">
                                                {selectedOrder.subServiceName || selectedOrder.serviceName || selectedOrder.service}
                                            </p>
                                            <p className="text-[14px] font-light text-black leading-relaxed">
                                                {t({ en: 'Our Bricoler, ', fr: 'Notre Bricoler, ', ar: 'مقدم الخدمة لدينا، ' })}<span className="text-black font-semibold">{selectedOrder.bricolerName || (selectedOrder.status === 'confirmed' || selectedOrder.status === 'programmed' ? 'Bricoler' : t({ en: 'Professional', fr: 'Professionnel', ar: 'محترف' }))}</span>{t({ en: ', will do the task for you. Feel free to chat for more details.', fr: ', fera la tâche pour vous. N\'hésitez pas à discuter pour plus de détails.', ar: '، سيقوم بالمهمة لك. يمكنك الدردشة لمزيد من التفاصيل.' })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Need Description */}
                                    <div className="space-y-3">
                                        <h3 className="text-[28px] font-black text-black">{t({ en: 'Need Description', fr: 'Description du besoin', ar: 'وصف الطلب' })}</h3>
                                        <div className="p-5 bg-neutral-50 rounded-[16px] text-neutral-500 text-[15px] font-light leading-relaxed">
                                            {selectedOrder.description || selectedOrder.comment || t({ en: 'No specific instructions provided for this task.', fr: 'Aucune instruction spécifique fournie pour cette tâche.', ar: 'لم يتم تقديم تعليمات محددة لهذه المهمة.' })}
                                        </div>
                                    </div>



                                    {/* Rating Section for completed orders */}
                                    {(selectedOrder.status === 'done' || selectedOrder.status === 'delivered') && !selectedOrder.rated && !isRatedLocally.includes(selectedOrder.id || '') && (
                                        <section className="space-y-4 pt-4 border-t border-neutral-100">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-[28px] font-black text-black">{t({ en: 'Rate Mission', fr: 'Noter la mission', ar: 'تقييم المهمة' })}</h3>
                                                <div className="px-3 py-1 bg-[#FFC244]/20 text-black text-[11px] font-black rounded-full uppercase tracking-wider">
                                                    {t({ en: 'Satisfaction', fr: 'Satisfaction' })}
                                                </div>
                                            </div>
                                            <div className="bg-neutral-50 rounded-[32px] p-6 flex flex-col items-center gap-6">
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <motion.button
                                                            key={s}
                                                            whileHover={{ scale: 1.2 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => setRating(s)}
                                                            onMouseEnter={() => setHover(s)}
                                                            onMouseLeave={() => setHover(0)}
                                                        >
                                                            <Star
                                                                size={36}
                                                                className={cn(
                                                                    "transition-all cursor-pointer",
                                                                    (hover || rating) >= s ? "fill-[#FFC244] text-[#FFC244]" : "fill-white text-neutral-200"
                                                                )}
                                                            />
                                                        </motion.button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    value={review}
                                                    onChange={(e) => setReview(e.target.value)}
                                                    placeholder={t({ en: 'Tell us about your experience...', fr: 'Partagez votre expérience...', ar: 'أخبرنا عن تجربتك...' })}
                                                    className="w-full h-24 p-4 rounded-2xl bg-white border border-neutral-100 text-[14px] outline-none focus:ring-2 focus:ring-[#FFC244]/50 transition-all font-medium resize-none shadow-sm"
                                                />
                                                <button
                                                    onClick={() => handleRateBricoler(selectedOrder)}
                                                    disabled={rating === 0 || isSubmittingRating}
                                                    className={cn(
                                                        "w-full py-4 rounded-2xl text-white font-black text-[16px] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[#00A082]/20",
                                                        rating > 0 ? "bg-[#00A082]" : "bg-neutral-300 pointer-events-none opacity-50 shadow-none"
                                                    )}
                                                >
                                                    {isSubmittingRating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t({ en: 'Submit Review', fr: 'Envoyer l\'avis', ar: 'إرسال التقييم' })}
                                                </button>
                                            </div>
                                        </section>
                                    )}

                                    {/* Bank Receipt Display */}
                                    {selectedOrder.bankReceipt && (
                                        <div className="mt-4 space-y-3">
                                            <p className="text-[14px] font-black text-[#00A082] flex items-center gap-2">
                                                <Check size={16} strokeWidth={3} />
                                                {t({ en: 'Bank receipt attached', fr: 'Reçu bancaire joint', ar: 'تم إرفاق وصل بنكي' })}
                                            </p>
                                            <div className="w-full max-w-[200px] aspect-[3/4] rounded-2xl overflow-hidden border border-neutral-100 bg-white">
                                                <img
                                                    src={selectedOrder.bankReceipt}
                                                    alt="Bank Receipt"
                                                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => window.open(selectedOrder.bankReceipt, '_blank')}
                                                />
                                            </div>
                                            <p className="text-[12px] text-neutral-400 italic">
                                                {t({ en: 'Tap image to view full size', fr: 'Appuyez sur l\'image pour l\'agrandir', ar: 'اضغط على الصورة لعرضها بالحجم الكامل' })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 bg-[#FFFFFF] relative">
                                {/* Top ZigZag for Summary */}
                                <div className="absolute top-0 left-0 right-0 h-[10px] -translate-y-[10px]">
                                    <div className="w-full h-full" style={{
                                        backgroundImage: 'linear-gradient(135deg, transparent 45%, #F5F5F5 45%, #F5F5F5 55%, transparent 55%), linear-gradient(-135deg, transparent 45%, #F5F5F5 45%, #F5F5F5 55%, transparent 55%)',
                                        backgroundSize: '20px 20px',
                                        backgroundRepeat: 'repeat-x'
                                    }} />
                                </div>

                                <div className="px-6 py-10 space-y-8">
                                    <h3 className="text-[28px] font-black text-black">{t({ en: 'Summary', fr: 'Résumé', ar: 'الملخص' })}</h3>
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <span className="text-[16px] font-semibold text-black">{t({ en: 'Task Fee', fr: 'Frais de tâche', ar: 'رسوم المهمة' })}</span>
                                                <span className="text-[14px] font-light text-black">≈ {selectedOrder.duration || '2h-3h'}</span>
                                            </div>
                                            <span className="text-[16px] font-bold text-black tracking-tight">{((selectedOrder.totalPrice || 0) * 0.85).toFixed(0)} MAD</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <span className="text-[16px] font-semibold text-black">{t({ en: 'Lbricol Fee', fr: 'Frais Lbricol', ar: 'رسوم لبريكول' })}</span>
                                                <span className="text-[14px] font-light text-black">15%</span>
                                            </div>
                                            <span className="text-[16px] font-bold text-black tracking-tight">{((selectedOrder.totalPrice || 0) * 0.15).toFixed(0)} MAD</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fixed Total Footer */}
                        <div className="px-6 md:px-12 py-8 bg-white border-t border-neutral-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[4001] flex flex-col gap-4">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-[28px] md:text-[32px] font-black text-black">{t({ en: 'Total', fr: 'Total', ar: 'الإجمالي' })}</span>
                                <span className="text-[28px] md:text-[32px] font-black text-black tracking-tighter truncate">{((selectedOrder?.totalPrice || 0)).toFixed(0)} MAD</span>
                            </div>

                            {/* Cancellation Button */}
                            {selectedOrder && !['done', 'cancelled', 'delivered'].includes(selectedOrder.status || '') && (
                                <button
                                    onClick={() => handleCancelOrder(selectedOrder.id!)}
                                    className="w-full py-4 rounded-xl border-2 border-red-50 text-red-500 font-bold text-[15px] hover:bg-red-50 transition-colors uppercase tracking-widest mt-2"
                                >
                                    {t({ en: 'Cancel Order', fr: 'Annuler la commande', ar: 'إلغاء الطلب' })}
                                </button>
                            )}

                            {/* Help link at the bottom */}
                            <button
                                onClick={() => window.open('https://wa.me/212702814355', '_blank')}
                                className="w-full text-center text-[15px] font-bold text-neutral-400 hover:text-[#00A082] transition-colors py-1"
                            >
                                {t({ en: '💬 Need help with this order?', fr: '💬 Besoin d\'aide pour cette commande ?', ar: '💬 تحتاج مساعدة في هذا الطلب؟' })}
                            </button>
                        </div>
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
                                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#000000] active:scale-95 transition-all shadow-md mb-6"
                            >
                                <ChevronLeft size={28} className="text-white" />
                            </button>
                            <h3 className="text-[32px] font-black text-black leading-tight mb-2 tracking-tight">
                                {isRedistributeCancellation
                                    ? t({ en: 'Are you sure?', fr: 'Êtes-vous sûr ?', ar: 'هل أنت متأكد؟' })
                                    : t({ en: 'Wait! Why cancel?', fr: 'Attendez ! Pourquoi annuler ?', ar: 'انتظر! لماذا الإلغاء؟' })}
                            </h3>
                            <p className="text-neutral-500 font-bold text-[17px] leading-relaxed">
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
                                                "w-full p-5 rounded-2xl border-2 text-left font-bold transition-all active:scale-[0.99] flex items-center justify-between group",
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
                                        className="w-full p-5 rounded-2xl bg-neutral-50/50 border-2 border-dashed border-neutral-200 focus:border-[#007AFF] focus:bg-white outline-none transition-all font-bold text-black"
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
                                disabled={!cancelReason || isCancelling}
                                className={cn(
                                    "w-full py-5 rounded-2xl font-black text-[18px] text-white shadow-xl transition-all active:scale-95 flex items-center justify-center h-16",
                                    cancelReason && !isCancelling ? "bg-red-500 shadow-red-200" : "bg-neutral-200 shadow-none pointer-events-none"
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

    const pendingOrders = useMemo(() => {
        return orders.filter(o => o.status === 'pending')
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [orders]);

    const redistributedOrders = useMemo(() => {
        return orders.filter(o => o.status === 'redistributed_by_provider')
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [orders]);

    const activeOrders = useMemo(() => {
        return orders.filter(o => ['confirmed', 'accepted', 'programmed'].includes(o.status || ''))
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [orders]);

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

    const [currentTime, setCurrentTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const getTimeRemaining = (order: OrderDetails) => {
        if (!order.date || !order.time) return null;
        try {
            // Extract the start time from "HH:MM" or "HH:MM-HH:MM" or "HH:MM:SS"
            const rawTime = order.time.split('-')[0].trim();
            // Ensure we have HH:MM:SS format for parseISO
            const timePart = rawTime.includes(':') && rawTime.split(':').length === 2
                ? `${rawTime}:00`  // HH:MM → HH:MM:00
                : rawTime;          // already has seconds or other form

            // Try to parse the date — works for yyyy-MM-dd
            // also handle dates like "2026-03-07" or "2026-3-7" 
            const datePart = order.date.substring(0, 10); // take first 10 chars
            const targetDate = new Date(`${datePart}T${timePart}`);
            if (isNaN(targetDate.getTime())) return null;

            const diffMs = targetDate.getTime() - currentTime.getTime();
            if (diffMs < 0) return null;

            const diffMins = Math.floor(diffMs / 60000);
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;

            if (hours > 24) return `${Math.floor(hours / 24)} ${t({ en: 'days left', fr: 'jours restants', ar: 'أيام متبقية' })}`;
            if (hours > 0) return `${hours}${t({ en: 'h', fr: 'h', ar: 'س' })} ${mins}${t({ en: 'm left', fr: 'min restantes', ar: 'د متبقية' })}`;
            return `${mins}${t({ en: 'm left', fr: 'min restantes', ar: 'د متبقية' })}`;
        } catch (e) {
            return null;
        }
    };

    const getProgress = (order: OrderDetails) => {
        if (!order.date || !order.time) return 10;
        try {
            const rawTime = order.time.split('-')[0].trim();
            const timePart = rawTime.includes(':') && rawTime.split(':').length === 2 ? `${rawTime}:00` : rawTime;
            const datePart = order.date.substring(0, 10);
            const targetDate = new Date(`${datePart}T${timePart}`);
            if (isNaN(targetDate.getTime())) return 10;
            const diffMs = targetDate.getTime() - currentTime.getTime();

            // Window of 24 hours for filling
            const windowMs = 24 * 60 * 60 * 1000;
            if (diffMs <= 0) return 100;
            if (diffMs > windowMs) return 5;

            return Math.floor(((windowMs - diffMs) / windowMs) * 100);
        } catch (e) {
            return 10;
        }
    };

    const renderEmptyState = (title: string, subtitle: string, icon: React.ReactNode) => (
        <div className="bg-white rounded-[16px] border border-[#BABABA] p-5 flex flex-col items-center text-center">
            <div className="flex items-center justify-center mb-6">
                {icon}
            </div>
            <h3 className="text-[20px] font-black text-black mb-1">{title}</h3>
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
                className="bg-white rounded-[24px] p-5 flex items-center gap-5 cursor-pointer transition-all mb-4 border-2 border-[#FFC244]/10 shadow-sm relative overflow-hidden group hover:border-[#FFC244]/30"
            >
                {/* Draft Badge */}
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-[#FFC244] text-black text-[11px] font-black rounded-bl-xl uppercase tracking-wider">
                    {t({ en: 'Resume', fr: 'Reprendre', ar: 'متابعة' })}
                </div>

                <div className="w-20 h-20 bg-neutral-50 rounded-2xl flex items-center justify-center flex-shrink-0 p-3">
                    <img src={getServiceVector(draft.service)} className="w-full h-full object-contain" />
                </div>

                <div className="flex-1 min-w-0 pr-8">
                    <h3 className="text-[18px] font-black text-black truncate leading-tight mb-1">
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

        return (
            <motion.div
                key={order.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(order)}
                className="bg-white rounded-[16px] p-4 flex items-center gap-4 cursor-pointer transition-all mb-4"
            >
                <div className="w-28 h-28 bg-white rounded-[16px] border border-[#F0F0F0] flex items-center justify-center flex-shrink-0 p-0 overflow-hidden">
                    {order.images && order.images.length > 0 ? (
                        <img src={order.images[0]} className="w-full h-full object-cover" />
                    ) : (
                        <img src={getServiceVector(order.service)} className="w-full h-full object-contain p-1" />
                    )}
                </div>
                <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                            "px-2 py-0.5 text-[11px] font-black rounded-md uppercase tracking-wider",
                            order.status === 'pending' ? "bg-orange-100 text-orange-600" : "bg-[#E6F7F4] text-[#00A082]"
                        )}>
                            {order.status === 'pending'
                                ? t({ en: 'In Progress', fr: 'En cours', ar: 'قيد التنفيذ' })
                                : t({ en: 'On time', fr: 'À l’heure', ar: 'في الوقت' })}
                        </span>
                    </div>

                    <h3 className="text-[17px] font-black text-black leading-tight">
                        {order.service} {order.subServiceDisplayName ? `› ${order.subServiceDisplayName}` : ''}
                    </h3>
                    <div className="flex items-end gap-2 mt-1">
                        <p className="text-[20px] font-black text-black">
                            {order.time || '12:00-13:00'}
                        </p>
                        {timeLeft && (
                            <span className="text-[14px] font-bold text-[#00A082] mb-[2px]">
                                ({timeLeft})
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[13px] font-medium text-neutral-400 truncate">
                            {order.bricolerName || t({ en: 'Matching...', fr: 'Recherche...', ar: 'جاري البحث...' })} • {order.city || order.location}
                        </p>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full mt-3 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: `${progress}%`,
                                filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)']
                            }}
                            transition={{
                                width: { duration: 1, ease: "easeOut" },
                                filter: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                            }}
                            className="h-full bg-[#00A082] rounded-full relative"
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
                            <h3 className="text-[18px] font-black text-black mb-1">
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
                                    className="w-full py-3 bg-[#00A082] text-white rounded-xl text-[14px] font-black flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    <RefreshCw size={16} />
                                    {t({ en: 'Select New Bricoler', fr: 'Choisir un nouveau Bricoleur', ar: 'اختر بريكولر جديد' })}
                                </button>
                                <button
                                    onClick={() => onCancelOrder(order.id!, true)}
                                    className="w-full py-3 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-[14px] font-bold transition-all active:scale-95"
                                >
                                    {t({ en: 'Cancel Order', fr: 'Annuler la commande', ar: 'إلغاء الطلب' })}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Delayed/Pending Warning Section */}
            {pendingOrders.map(order => {
                const createdAt = (order as any).createdAt?.seconds ? (order as any).createdAt.seconds * 1000 : Date.now();
                const isDelayed = Date.now() - createdAt > 3600000; // 1 hour

                if (!isDelayed) return null;

                return (
                    <div key={`delayed-${order.id}`} className="bg-[#FFF9E5] border-2 border-[#FFC244]/30 rounded-2xl p-6 mb-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-[#FFC244] rounded-2xl flex items-center justify-center shrink-0">
                                <AlertTriangle size={24} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[18px] font-black text-black mb-1">
                                    {t({
                                        en: `Still Waiting for ${order.bricolerName}?`,
                                        fr: `Toujours en attente de ${order.bricolerName} ?`,
                                        ar: `ما زلت تنتظر ${order.bricolerName}؟`
                                    })}
                                </h3>
                                <p className="text-[14px] font-medium text-neutral-600 leading-tight">
                                    {t({
                                        en: 'It has been over an hour. We can try matching you with another available professional right now.',
                                        fr: 'Cela fait plus d’une heure. Nous pouvons vous associer maintenant à un autre professionnel disponible.',
                                        ar: 'مرّ أكثر من ساعة. يمكننا الآن محاولة ربطك بمحترف آخر متاح.'
                                    })}
                                </p>
                                <div className="flex flex-col gap-2 mt-4">
                                    <button
                                        onClick={() => {
                                            // Take back to step 2 (bricoler list)
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
                                        className="w-full py-3 bg-[#00A082] text-white rounded-xl text-[14px] font-black flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        <RefreshCw size={16} />
                                        {t({ en: 'Redistribute Order', fr: 'Réattribuer la commande', ar: 'إعادة توزيع الطلب' })}
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={async () => {
                                                if (order.date && order.time) {
                                                    try {
                                                        const timeStr = order.time.split('-')[0].trim();
                                                        const targetDate = new Date(`${order.date}T${timeStr}:00`).getTime();
                                                        if (targetDate < Date.now()) {
                                                            alert(t({
                                                                en: 'Cannot extend wait time. The booked time slot has already passed.',
                                                                fr: 'Impossible de prolonger lattente. Le créneau horaire réservé est déjà passé.',
                                                                ar: 'لا يمكن تمديد وقت الانتظار. لقد مر الموعد المحجوز بالفعل.'
                                                            }));
                                                            return;
                                                        }
                                                    } catch (e) { }
                                                }
                                                try {
                                                    await updateDoc(doc(db, 'jobs', order.id!), {
                                                        createdAt: serverTimestamp()
                                                    });
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                            }}
                                            className="flex-1 py-3 bg-white border border-neutral-200 text-black hover:bg-neutral-50 rounded-xl text-[14px] font-bold transition-all active:scale-95"
                                        >
                                            {t({ en: 'Extend wait time', fr: 'Prolonger l\'attente', ar: 'تمديد وقت الانتظار' })}
                                        </button>
                                        <button
                                            onClick={() => onCancelOrder(order.id!, true)}
                                            className="flex-1 py-3 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-[14px] font-bold transition-all active:scale-95"
                                        >
                                            {t({ en: 'Cancel', fr: 'Annuler', ar: 'إلغاء' })}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Pending Orders Section */}
            {pendingOrders.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-[26px] font-black text-black">{t({ en: 'Pending orders', fr: 'Commandes en attente', ar: 'طلبات قيد الانتظار' })}</h2>
                    <div className="pt-2">{pendingOrders.map(renderOrderCard)}</div>
                </div>
            )}

            {/* Active Orders Section */}
            <div className="space-y-6">
                <div className="space-y-4">
                    <h2 className="text-[26px] font-black text-black">{t({ en: 'Active Orders', fr: 'Commandes actives', ar: 'الطلبات النشطة' })}</h2>
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

            {/* Continue Your Order Section */}
            <div className="space-y-4">
                <h2 className="text-[26px] font-black text-black">{t({ en: 'Continue your order', fr: 'Continuer votre commande', ar: 'أكمل طلبك' })}</h2>
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
            <div className="bg-[#F2F2F2] rounded-[16px] p-6 flex items-center gap-5 mt-4">
                <div className="flex items-center justify-center flex-shrink-0">
                    <img src="/Images/Vectors Illu/OrdersHistory.webp" className="w-20 h-20 object-contain" />
                </div>
                <div className="flex flex-col">
                    <p className="text-[16px] font-light text-black leading-tight">{t({ en: 'Need to review past orders or reorder?', fr: 'Besoin de consulter vos commandes passées ?', ar: 'تريد مراجعة طلباتك السابقة أو إعادة الطلب؟' })}</p>
                    <button
                        onClick={onShowHistory}
                        className="text-[17px] font-black text-[#00A082] mt-1 text-left decoration-[#00A082] decoration-2 underline-offset-4 hover:underline"
                    >
                        {t({ en: 'Check your order history', fr: 'Voir l\'historique de commandes', ar: 'عرض سجل الطلبات' })}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Calendar Tab Component ──────────────────────────────────────────────
