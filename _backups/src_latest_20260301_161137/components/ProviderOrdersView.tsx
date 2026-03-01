"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderDetails } from '@/components/OrderCard';
import {
    ChevronLeft,
    MessageCircle,
    X,
    Sun,
    CloudSun,
    Moon,
    Calendar as CalendarIcon,
    Check,
    Star,
    Clock,
    MapPin,
    Briefcase,
    Plus,
    RefreshCw,
    CheckCircle2
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { getServiceVector, getSubServiceName } from '../config/services_config';
import { format, isToday, isThisWeek, parseISO, startOfDay, addDays } from 'date-fns';

interface ProviderOrdersViewProps {
    orders: OrderDetails[];
    onViewMessages: (jobId: string) => void;
    onSelectOrder: (order: OrderDetails) => void;
    userData: any;
    setUserData: React.Dispatch<React.SetStateAction<any>>;
    horizontalSelectedDate: Date;
    setHorizontalSelectedDate: (d: Date) => void;
    handleSaveSlotsManual: (dateKey: string, slots: any[]) => void;
    AVAILABILITY_SLOTS: any;
    TIME_SLOTS: string[];
    activeTab: 'activity' | 'calendar' | 'availability';
    setActiveTab: (tab: 'activity' | 'calendar' | 'availability') => void;
    onConfirmJob?: (jobId: string) => void;
    onRedistributeJob?: (order: OrderDetails) => void;
}


const formatServiceName = (name: string) => {
    if (!name) return '';
    return name
        .replace(/[_-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'Morning': return <Sun size={14} className="text-amber-500" />;
        case 'Afternoon': return <CloudSun size={14} className="text-orange-400" />;
        case 'Evening': return <Moon size={14} className="text-indigo-400" />;
        default: return null;
    }
};

export default function ProviderOrdersView({
    orders,
    onViewMessages,
    onSelectOrder,
    userData,
    setUserData,
    horizontalSelectedDate,
    setHorizontalSelectedDate,
    handleSaveSlotsManual,
    AVAILABILITY_SLOTS,
    TIME_SLOTS,
    activeTab,
    setActiveTab,
    onConfirmJob,
    onRedistributeJob
}: ProviderOrdersViewProps) {
    const { t } = useLanguage();
    const [showHistory, setShowHistory] = useState(false);

    // Filter orders for history (done and cancelled)
    const historyOrders = useMemo(() => {
        return orders.filter(o => ['done', 'cancelled', 'delivered'].includes(o.status || ''))
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [orders]);

    const getHeroImage = (service: string) => {
        const serviceMap: Record<string, string> = {
            'cleaning': '/Images/Job Cards Images/Cleaning_job_card.png',
            'electricity': '/Images/Job Cards Images/Electricity_job_card.png',
            'plumbing': '/Images/Job Cards Images/Plumbing_job_card.png',
            'painting': '/Images/Job Cards Images/Painting_job_card.png',
            'handyman': '/Images/Job Cards Images/Handyman_job_card.png',
            'furniture_assembly': '/Images/Job Cards Images/Furniture_Assembly_job_card.png',
            'moving': '/Images/Job Cards Images/Moving Help_job_card.png',
            'gardening': '/Images/Job Cards Images/Gardening_job_card.png',
            'babysitting': '/Images/Job Cards Images/Babysetting_job_card.png',
            'pool_cleaning': '/Images/Vectors Illu/Poolcleaning_VI.png',
            'pets_care': '/Images/Vectors Illu/PetsCare_VI.png',
            'errands': '/Images/Vectors Illu/Errands_VI.png',
            'elderly_care': '/Images/Vectors Illu/ElderlyCare_VI.png',
        };
        return serviceMap[service] || '/Images/Job Cards Images/Handyman_job_card.png';
    };

    const renderHistoryCard = (order: OrderDetails, index: number) => (
        <motion.div
            key={order.id || `hist-${index}`}
            onClick={() => {
                onSelectOrder(order);
                setShowHistory(false);
            }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-4 py-4 border-b border-[#F0F0F0] cursor-pointer"
        >
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                <img
                    src={getHeroImage(order.service)}
                    alt={order.service}
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-[17px] font-black text-black leading-tight truncate">
                    {order.subServiceDisplayName || order.service}
                </h3>
                <p className="text-[14px] font-medium text-neutral-400 mt-0.5 truncate">
                    {order.clientName || t({ en: 'Client', fr: 'Client' })} • {order.city || order.location}
                </p>
                <p className="text-[14px] font-bold text-neutral-400 mt-1 capitalize">
                    {order.status === 'done' ? t({ en: 'Completed', fr: 'Terminée' }) : order.status}
                </p>
            </div>
        </motion.div>
    );

    return (
        <div className="flex flex-col h-full bg-[#FFFFFF] relative">
            <div className="flex-1 min-h-0 overflow-y-auto relative w-full">
                {activeTab === 'activity' ? (
                    <ActivityTab
                        orders={orders}
                        onSelect={onSelectOrder}
                        onShowHistory={() => setShowHistory(true)}
                        onConfirmJob={onConfirmJob}
                        onRedistributeJob={onRedistributeJob}
                        setActiveTab={setActiveTab}
                    />
                ) : activeTab === 'calendar' ? (
                    <CalendarTab
                        orders={orders}
                        onSelectOrder={onSelectOrder}
                        userData={userData}
                        horizontalSelectedDate={horizontalSelectedDate}
                        setHorizontalSelectedDate={setHorizontalSelectedDate}
                        onConfirmJob={onConfirmJob}
                        onRedistributeJob={onRedistributeJob}
                        setActiveTab={setActiveTab}
                    />
                ) : (
                    <AvailabilityTab
                        userData={userData}
                        setUserData={setUserData}
                        horizontalSelectedDate={horizontalSelectedDate}
                        setHorizontalSelectedDate={setHorizontalSelectedDate}
                        handleSaveSlotsManual={handleSaveSlotsManual}
                        AVAILABILITY_SLOTS={AVAILABILITY_SLOTS}
                        TIME_SLOTS={TIME_SLOTS}
                        orders={orders}
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
                        className="fixed inset-0 z-[5000] bg-white flex flex-col"
                    >
                        <div className="px-6 py-8 border-b border-[#F0F0F0] flex items-center gap-4">
                            <button
                                onClick={() => setShowHistory(false)}
                                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-neutral-50 active:scale-90 transition-transform"
                            >
                                <ChevronLeft size={28} className="text-black" />
                            </button>
                            <h1 className="text-[28px] font-black text-black">{t({ en: 'Order history', fr: 'Historique des commandes' })}</h1>
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
                                            src="/Images/Vectors Illu/NoOrdersYet.png"
                                            alt="Lbricol"
                                            style={{ height: 230, objectFit: 'contain', paddingBottom: 20, paddingTop: 20 }}
                                        />
                                    </div>
                                    <h3 className="text-[20px] font-black text-black">{t({ en: 'No history yet', fr: 'Aucun historique pour le moment' })}</h3>
                                    <p className="text-neutral-500 font-light">{t({ en: 'Your completed and cancelled orders will appear here.', fr: 'Vos commandes terminées et annulées apparaîtront ici.' })}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Activity Tab Component ──────────────────────────────────────────────
function ActivityTab({
    orders,
    onSelect,
    onShowHistory,
    onConfirmJob,
    onRedistributeJob,
    setActiveTab
}: {
    orders: OrderDetails[],
    onSelect: (o: OrderDetails) => void,
    onShowHistory: () => void,
    onConfirmJob?: (jobId: string) => void,
    onRedistributeJob?: (order: OrderDetails) => void,
    setActiveTab?: (tab: 'activity' | 'calendar' | 'availability') => void
}) {
    const { t } = useLanguage();

    const [currentTime, setCurrentTime] = React.useState(new Date());
    const [showGetJobsBanner, setShowGetJobsBanner] = React.useState(() => {
        if (typeof window !== 'undefined') {
            return !localStorage.getItem('lbricol_hide_get_jobs_banner');
        }
        return true;
    });

    const handleHideBanner = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowGetJobsBanner(false);
        localStorage.setItem('lbricol_hide_get_jobs_banner', 'true');
    };

    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const hasJobStarted = (date: string, time: string) => {
        if (!date || !time) return false;
        try {
            const timeStr = time.split('-')[0].trim();
            const targetDate = parseISO(`${date}T${timeStr}:00`);
            return currentTime >= targetDate;
        } catch (e) {
            return false;
        }
    };

    const scheduledJobs = useMemo(() => {
        return orders.filter(order => {
            const isAssigned = ['confirmed', 'accepted', 'programmed'].includes(order.status || '');
            if (!isAssigned || !order.date) return false;

            try {
                const orderDate = parseISO(order.date);
                const isTodayJob = isToday(orderDate);

                if (isTodayJob) {
                    if (hasJobStarted(order.date as string, order.time as string)) return false;
                }

                // Show all future/today jobs
                return true;
            } catch (e) {
                return false;
            }
        });
    }, [orders, currentTime]);

    const pendingJobs = useMemo(() => {
        return orders.filter(order => {
            const isAssigned = ['confirmed', 'accepted', 'programmed'].includes(order.status || '');
            if (!isAssigned || !order.date || !order.time) return false;
            try {
                const orderDate = parseISO(order.date);
                if (!isToday(orderDate)) return false;
                return hasJobStarted(order.date as string, order.time as string);
            } catch (e) {
                return false;
            }
        });
    }, [orders, currentTime]);

    const deliveredJobs = useMemo(() => {
        return orders.filter(order => {
            if (!['done', 'delivered'].includes(order.status || '') || !order.date) return false;
            try {
                // Return all delivered jobs (or could filter for today only if preferred)
                // The user requested a "Jobs Delivered" section below "Pending Jobs"
                return true;
            } catch (e) {
                return false;
            }
        });
    }, [orders]);

    const getTimeRemaining = (order: OrderDetails) => {
        if (!order.date || !order.time) return null;
        try {
            const timeStr = order.time.split('-')[0].trim();
            const targetDate = parseISO(`${order.date}T${timeStr}:00`);
            const diffMs = targetDate.getTime() - currentTime.getTime();
            if (diffMs < 0) return null;

            const diffMins = Math.floor(diffMs / 60000);
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;

            if (hours > 24) return `${Math.floor(hours / 24)}d left`;
            if (hours > 0) return `${hours}h ${mins}m left`;
            return `${mins}m left`;
        } catch (e) {
            return null;
        }
    };

    const getProgress = (order: OrderDetails) => {
        if (!order.date || !order.time) return 10;
        try {
            const timeStr = order.time.split('-')[0].trim();
            const targetDate = parseISO(`${order.date}T${timeStr}:00`);
            const diffMs = targetDate.getTime() - currentTime.getTime();

            const windowMs = 24 * 60 * 60 * 1000;
            if (diffMs <= 0) return 100;
            if (diffMs > windowMs) return 5;

            return Math.floor(((windowMs - diffMs) / windowMs) * 100);
        } catch (e) {
            return 10;
        }
    };

    const renderEmptyState = (title: string, subtitle: string, icon: React.ReactNode) => (
        <div className="bg-white rounded-[10px] border border-[#939393] p-5 flex flex-col items-center text-center">
            <div className="flex items-center justify-center mb-6">
                {icon}
            </div>
            <h3 className="text-[20px] font-black text-black mb-1">{title}</h3>
            <p className="text-[15px] font-medium text-neutral-500 max-w-[240px] leading-tight">
                {subtitle}
            </p>
        </div>
    );

    const renderOrderCard = (order: OrderDetails, index: number) => {
        const timeLeft = getTimeRemaining(order);
        const progress = getProgress(order);

        const isOffer = order.status === 'waiting' || order.status === 'pending';
        const isDone = order.status === 'done' || order.status === 'delivered';

        return (
            <motion.div
                key={order.id || `order-${index}`}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(order)}
                className="bg-white rounded-[16px] p-4 flex items-start gap-4 cursor-pointer transition-all mb-4 border border-transparent hover:border-neutral-100 shadow-sm"
            >
                <div className="w-24 h-24 bg-[#F7F7F7] rounded-[16px] flex items-center justify-center flex-shrink-0 p-1 overflow-hidden">
                    <img src={getServiceVector(order.service)} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                            "px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider",
                            isOffer ? "bg-amber-50 text-amber-600" : (isToday(parseISO(order.date)) && !isDone ? "bg-[#E6F7F4] text-[#00A082]" : (isDone ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"))
                        )}>
                            {isOffer ? 'Active Offer' : (isDone ? 'Delivered' : (isToday(parseISO(order.date)) ? 'In Progress' : 'Scheduled'))}
                        </span>
                        {order.providerConfirmed && (
                            <span className="px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider bg-amber-50 text-amber-600">
                                Confirmed
                            </span>
                        )}
                    </div>
                    <h3 className="text-[17px] font-black text-black leading-tight">
                        {formatServiceName(order.service)} {order.subServiceDisplayName ? `› ${order.subServiceDisplayName}` : ''}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-neutral-500">
                        <Clock size={12} strokeWidth={2.5} />
                        <p className="text-[14px] font-bold">
                            {order.time || '12:00-13:00'}
                        </p>
                        {timeLeft && !isDone && (
                            <span className="text-[12px] font-bold text-[#00A082]">
                                ({timeLeft})
                            </span>
                        )}
                        {isDone && <Check size={14} className="text-emerald-500 ml-1" />}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                        <p className="text-[13px] font-medium text-neutral-400 truncate">
                            {order.clientName || t({ en: 'Client', fr: 'Client' })} • {order.city || order.location}
                        </p>
                    </div>
                    {!isOffer && !isDone && (
                        <div className="w-full h-1.5 bg-neutral-100 rounded-full mt-3 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                    width: `${progress}%`,
                                }}
                                transition={{
                                    width: { duration: 1, ease: "easeOut" }
                                }}
                                className="h-full bg-[#00A082] rounded-full relative overflow-hidden"
                            >
                                <motion.div
                                    animate={{ x: ['-200%', '200%'] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                    className="absolute inset-0 w-full h-full"
                                    style={{
                                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)'
                                    }}
                                />
                            </motion.div>
                        </div>
                    )}

                    {/* CONFIRM & REDISTRIBUTE BUTTONS */}
                    {(order.status === 'programmed' || order.status === 'accepted') && !order.providerConfirmed && (
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRedistributeJob?.(order);
                                }}
                                className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-all active:scale-90"
                            >
                                <RefreshCw size={18} strokeWidth={2.5} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (order.id) onConfirmJob?.(order.id);
                                }}
                                className="w-10 h-10 rounded-full bg-[#00A082] text-white flex items-center justify-center shadow-md hover:bg-[#008f75] active:scale-95 transition-all"
                            >
                                <Check size={18} strokeWidth={3} />
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="flex flex-col gap-10 p-6 pb-32 bg-[#FFFFFF]">
            <div className="space-y-4">
                {showGetJobsBanner && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#FFC244] rounded-[5px] p-6 relative overflow-hidden group shadow-lg shadow-amber-100/50"
                    >
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-16 h-16 bg-transparent rounded-1xl flex items-center justify-center  shadow-md">
                                <img src="/Images/Vectors Illu/LbricolFaceOY.png" className="w-full h-full object-contain rounded-1xl" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[20px] font-[1000] text-black leading-tight mb-1">{t({ en: 'Get Jobs Today!', fr: 'Trouvez une mission !' })}</h3>
                                <p className="text-[13px] font-bold text-black/70 leading-snug">{t({ en: 'Set your availability now to appear in client searches for today.', fr: 'Réglez vos dispo pour apparaître dans les recherches aujourd’hui.' })}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4 relative z-10">
                            <button
                                onClick={() => setActiveTab?.('availability')}
                                className="px-6 py-2.5 bg-[#F55802] text-white text-[14px] font-black rounded-full active:scale-95 transition-all"
                            >
                                {t({ en: 'Go to Calendar', fr: 'Aller au calendrier' })}
                            </button>
                            <button
                                onClick={handleHideBanner}
                                className="px-6 py-2.5 bg-white/20 hover:bg-white/30 text-black text-[14px] font-black rounded-full transition-all"
                            >
                                {t({ en: 'Hide', fr: 'Masquer' })}
                            </button>
                        </div>
                        {/* Decorative circle */}
                        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700" />
                    </motion.div>
                )}

                <h2 className="text-[26px] font-black text-black">
                    {t({ en: 'New Jobs', fr: 'Nouvelles missions' })}
                </h2>
                {scheduledJobs.length > 0 ? (
                    <div className="pt-2">{scheduledJobs.map(renderOrderCard)}</div>
                ) : (
                    <div className="pt-2">
                        {renderEmptyState(
                            t({ en: 'No missions scheduled', fr: 'Aucune mission programmée' }),
                            t({ en: 'Your upcoming missions will be listed here', fr: 'Vos prochaines missions seront affichées ici' }),
                            <img src="/Images/Vectors Illu/NewOrder.png" className="w-28 h-28 object-contain grayscale opacity-40" />
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <h2 className="text-[26px] font-black text-black">{t({ en: 'Pending Jobs', fr: 'Missions en cours' })}</h2>
                {pendingJobs.length > 0 ? (
                    <div className="pt-2">{pendingJobs.map(renderOrderCard)}</div>
                ) : (
                    <div className="pt-2">
                        {renderEmptyState(
                            t({ en: 'No jobs in progress', fr: 'Aucune mission en cours' }),
                            t({ en: 'Missions you are currently executing will appear here', fr: 'Les missions que vous exécutez actuellement apparaîtront ici' }),
                            <img src="/Images/Vectors Illu/DraftOrders2.png" className="w-28 h-28 object-contain grayscale opacity-40" />
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <h2 className="text-[26px] font-black text-black">{t({ en: 'Jobs Delivered', fr: 'Missions livrées' })}</h2>
                {deliveredJobs.length > 0 ? (
                    <div className="pt-2">{deliveredJobs.map(renderOrderCard)}</div>
                ) : (
                    <div className="pt-2">
                        {renderEmptyState(
                            t({ en: 'No jobs delivered yet', fr: 'Aucune mission livrée pour le moment' }),
                            t({ en: 'Missions you successfully complete will appear here', fr: 'Les missions que vous terminez avec succès apparaîtront ici' }),
                            <div className="w-28 h-28  rounded-full flex items-center justify-center">
                                <img src="/Images/Vectors Illu/LocationFlag_VI.png" className="w-20 h-20 object-contain" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-[#F2F2F2] rounded-[16px] p-6 flex items-center gap-5 mt-4">
                <div className="flex items-center justify-center flex-shrink-0">
                    <img src="/Images/Vectors Illu/OrdersHistory.png" className="w-20 h-20 object-contain" />
                </div>
                <div className="flex flex-col">
                    <p className="text-[16px] font-light text-black leading-tight">{t({ en: 'Need to review past missions?', fr: 'Besoin de revoir vos missions passées ?' })}</p>
                    <button
                        onClick={onShowHistory}
                        className="text-[17px] font-black text-[#00A082] mt-1 text-left decoration-[#00A082] decoration-2 underline-offset-4 hover:underline"
                    >
                        {t({ en: 'Check my mission history', fr: 'Voir l’historique de mes missions' })}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Calendar Tab Component ──────────────────────────────────────────────
function CalendarTab({
    orders,
    onSelectOrder,
    userData,
    horizontalSelectedDate,
    setHorizontalSelectedDate,
    onConfirmJob,
    onRedistributeJob,
    setActiveTab
}: {
    orders: OrderDetails[],
    onSelectOrder: (o: OrderDetails) => void,
    userData: any,
    horizontalSelectedDate: Date,
    setHorizontalSelectedDate: (d: Date) => void,
    onConfirmJob?: (jobId: string) => void,
    onRedistributeJob?: (order: OrderDetails) => void,
    setActiveTab?: (tab: 'activity' | 'calendar' | 'availability') => void
}) {
    const { t } = useLanguage();
    const todayStr = format(new Date(), 'yyyy-MM-dd');

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
        return { date: d, dateStr: format(d, 'yyyy-MM-dd'), dayNum: format(d, 'd'), dayLabel: format(d, 'EEE') };
    });

    const validOrders = orders.filter(o => !(o.status as string)?.match(/cancelled|rejected/));
    const bookedDates = useMemo(() => {
        const set = new Set<string>();
        validOrders.forEach(o => set.add(o.date));
        return set;
    }, [validOrders]);

    const weekLabel = `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`;

    const hours = Array.from({ length: 15 }, (_, i) => 7 + i); // 7 AM to 9 PM

    const getTimePosition = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        const offsetHours = h - 7;
        const totalMins = offsetHours * 60 + m;
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

    // Availability slots for context
    const savedSlots = useMemo(() => {
        return (userData?.calendarSlots || {})[selectedDateStr] || [];
    }, [userData, selectedDateStr]);

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
                                        {h === 12 ? '12 pm' : h > 12 ? `${h - 12} pm` : `${h} am`}
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
                                    <div className="w-12 h-12 rounded-xl bg-neutral-50 flex items-center justify-center flex-shrink-0">
                                        <img src={getServiceVector(order.service)} alt={order.service} className="w-8 h-8 object-contain" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[16px] font-black text-black truncate uppercase tracking-tight">
                                                {order.service}
                                            </span>
                                            <div className="w-6 h-6 rounded-full bg-[#FFC244] flex items-center justify-center">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        </div>
                                        <p className="text-[13px] font-medium text-neutral-500 truncate">
                                            {order.clientName} • {order.city}
                                        </p>
                                        <p className="text-[12px] font-black text-[#00A082] mt-1">
                                            {order.time}
                                        </p>

                                        {/* Action Icons for Calendar View */}
                                        {(order.status === 'programmed' || order.status === 'accepted') && !order.providerConfirmed && (
                                            <div className="flex gap-2 mt-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRedistributeJob?.(order);
                                                    }}
                                                    className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-all active:scale-90"
                                                >
                                                    <RefreshCw size={14} strokeWidth={2.5} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (order.id) onConfirmJob?.(order.id);
                                                    }}
                                                    className="w-8 h-8 rounded-full bg-[#FFC244] flex items-center justify-center text-white hover:bg-[#ffb31a] active:scale-90 transition-all shadow-sm"
                                                >
                                                    <Check size={14} strokeWidth={3} />
                                                </button>
                                            </div>
                                        )}
                                        {order.providerConfirmed && (
                                            <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 rounded-lg w-fit">
                                                <CheckCircle2 size={10} className="text-amber-600" />
                                                <span className="text-[9px] font-black text-amber-600 uppercase">{t({ en: 'Confirmed', fr: 'Confirmée' })}</span>
                                            </div>
                                        )}
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

// ── Availability Tab Component ──────────────────────────────────────────────
function AvailabilityTab({
    userData,
    setUserData,
    horizontalSelectedDate,
    setHorizontalSelectedDate,
    handleSaveSlotsManual,
    AVAILABILITY_SLOTS,
    TIME_SLOTS,
    orders
}: {
    userData: any,
    setUserData: React.Dispatch<React.SetStateAction<any>>,
    horizontalSelectedDate: Date,
    setHorizontalSelectedDate: (d: Date) => void,
    handleSaveSlotsManual: (dateKey: string, slots: any[]) => void,
    AVAILABILITY_SLOTS: any,
    TIME_SLOTS: string[],
    orders: OrderDetails[]
}) {
    const { t } = useLanguage();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const selectedDateStr = format(horizontalSelectedDate, 'yyyy-MM-dd');
    const [isAdding, setIsAdding] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const savedSlots = useMemo(() => {
        const slots = userData?.calendarSlots?.[selectedDateStr] || [];
        // Filter out slots that overlap with booked missions
        const dayMissions = orders.filter(o => o.date === selectedDateStr && o.status !== 'cancelled');
        return slots.filter((slot: any) => {
            const slotStart = slot.from;
            return !dayMissions.some(order => {
                const missionFrom = order.time?.split('-')[0].trim() || "09:00";
                return missionFrom === slotStart;
            });
        });
    }, [userData?.calendarSlots, selectedDateStr, orders]);

    const getMonday = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return startOfDay(d);
    };

    const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        return { date: d, dateStr: format(d, 'yyyy-MM-dd'), dayNum: format(d, 'd'), dayLabel: format(d, 'EEE') };
    });

    const bookedDates = useMemo(() => {
        const set = new Set<string>();
        orders.forEach(o => {
            if (o.date) set.add(o.date);
        });
        return set;
    }, [orders]);

    const weekLabel = `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`;

    const [localSlots, setLocalSlots] = useState<any[]>([]);

    const handleAllDay = () => {
        const allDaySlotsList = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
        const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
        const filteredAllDay = allDaySlotsList.filter(time => {
            if (selectedDateStr !== todayStr) return true;
            const [h, m] = time.split(':').map(Number);
            return (h * 60 + m) > (nowMins + 15);
        });
        const newSlots = filteredAllDay.map(time => ({
            from: time,
            to: TIME_SLOTS[TIME_SLOTS.indexOf(time) + 2] || time
        }));
        setLocalSlots(newSlots);
    };

    const handleProgram = () => {
        setUserData((p: any) => p ? { ...p, calendarSlots: { ...(p.calendarSlots || {}), [selectedDateStr]: localSlots } } : null);
        handleSaveSlotsManual(selectedDateStr, localSlots);
        setIsAdding(false);
    };

    const isTodaySelected = selectedDateStr === todayStr;
    const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();

    const hours = Array.from({ length: 15 }, (_, i) => 7 + i); // 7 AM to 9 PM

    const getTimePosition = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        const offsetHours = h - 7;
        const totalMins = offsetHours * 60 + m;
        return (totalMins / 60) * 100; // 100px per hour for better readability
    };

    const getTimeHeight = (from: string, to: string) => {
        const start = getTimePosition(from);
        const end = getTimePosition(to);
        return Math.max(end - start, 50);
    };

    const handleDeleteSlot = async (slotToDelete: any) => {
        const newSlots = savedSlots.filter((s: any) => s.from !== slotToDelete.from);
        const updatedCalendarSlots = {
            ...(userData?.calendarSlots || {}),
            [selectedDateStr]: newSlots
        };

        // Optimistic update
        setUserData((p: any) => p ? { ...p, calendarSlots: updatedCalendarSlots } : null);

        // Persist
        try {
            const providerId = userData?.id || auth.currentUser?.uid;
            if (!providerId) {
                console.error("Cannot delete slot: No provider ID found (userData.id or auth.currentUser.uid)");
                return;
            }
            const providerRef = doc(db, 'bricolers', providerId);
            await updateDoc(providerRef, { calendarSlots: updatedCalendarSlots });
        } catch (error) {
            console.error("Error deleting slot:", error);
        }
    };

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
                                onClick={() => {
                                    setHorizontalSelectedDate(day.date);
                                    setIsAdding(false);
                                }}
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

            <div className="flex-1 overflow-y-auto no-scrollbar relative bg-[#FAFAFA]">
                <div className="relative min-h-[1550px] w-full">
                    {/* Timeline Grid */}
                    <div className="absolute inset-0 pt-6 px-0">
                        {hours.map((h) => (
                            <div key={h} className="flex h-[100px] border-b border-[#F0F0F0] group">
                                <div className="w-16 flex-none flex flex-col items-end justify-start pr-3 -mt-2.5">
                                    <span className="text-[11px] font-black text-neutral-400 uppercase tracking-tighter">
                                        {h === 12 ? '12 pm' : h > 12 ? `${h - 12} pm` : `${h} am`}
                                    </span>
                                </div>
                                <div className="flex-1 border-l border-[#F0F0F0] relative">
                                    {/* Half-hour line */}
                                    <div className="absolute top-[50px] left-0 right-0 border-t border-[#FAFAFA] border-dashed" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Overlaid Availability Slots */}
                    <div className="absolute inset-0 pt-6 left-16">
                        <AnimatePresence>
                            {savedSlots.map((slot: any, idx: number) => (
                                <motion.div
                                    key={`${slot.from}-${idx}`}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute left-2 right-4 rounded-xl bg-[#E6F7F4] border-l-4 border-[#00A082] p-3 shadow-sm z-10 group"
                                    style={{
                                        top: getTimePosition(slot.from) + 2,
                                        height: getTimeHeight(slot.from, slot.to) - 4
                                    }}
                                >
                                    <div className="flex flex-col h-full relative">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[14px] font-black text-[#00A082]">{t({ en: 'Available', fr: 'Disponible' })}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSlot(slot);
                                                }}
                                                className="w-6 h-6 rounded-full bg-white/50 flex items-center justify-center text-[#00A082] hover:bg-[#00A082] hover:text-white transition-all active:scale-90"
                                            >
                                                <X size={14} strokeWidth={3} />
                                            </button>
                                        </div>
                                        <span className="text-[12px] font-bold text-[#00A082]/80 mt-1">
                                            {slot.from} - {slot.to}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                </div>
            </div>

            {/* Floating Action Button */}
            <button
                onClick={() => {
                    setLocalSlots(savedSlots);
                    setIsAdding(true);
                }}
                className="fixed bottom-24 right-6 w-14 h-14 bg-[#0CB380] rounded-full shadow-2xl flex items-center justify-center text-white active:scale-95 transition-transform z-50"
            >
                <Plus size={32} strokeWidth={3} />
            </button>

            {/* Add Availability Drawer/Modal */}
            <AnimatePresence>
                {isAdding && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAdding(false)}
                            className="fixed inset-0 bg-black/40 z-[1100] backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 pb-12 z-[1101] max-h-[85vh] overflow-y-auto no-scrollbar"
                        >
                            <div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto mb-6" />

                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[22px] font-black text-black">{t({ en: 'New Availability', fr: 'Nouvelle disponibilité' })}</h3>
                                <button
                                    onClick={handleAllDay}
                                    className="px-4 py-2 bg-[#E6F7F4] text-[#00A082] text-[14px] font-black rounded-xl"
                                >
                                    {t({ en: 'All day', fr: 'Toute la journée' })}
                                </button>
                            </div>

                            <div className="space-y-6">
                                {(Object.entries(AVAILABILITY_SLOTS) as [string, string[]][]).map(([category, slots]) => (
                                    <div key={category} className="space-y-4">
                                        <h4 className="text-[12px] font-black text-neutral-400 uppercase tracking-widest">{category}</h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            {slots.map((time) => {
                                                const isSelected = localSlots.some((s: any) => s.from === time);
                                                const [h, m] = time.split(':').map(Number);
                                                const isPast = isTodaySelected && (h * 60 + m) <= (nowMins + 15);

                                                return (
                                                    <button
                                                        key={time}
                                                        disabled={isPast}
                                                        onClick={() => {
                                                            const newSlots = isSelected
                                                                ? localSlots.filter((s: any) => s.from !== time)
                                                                : [...localSlots, { from: time, to: TIME_SLOTS[TIME_SLOTS.indexOf(time) + 2] || time }].sort((a, b) => a.from.localeCompare(b.from));
                                                            setLocalSlots(newSlots);
                                                        }}
                                                        className={cn(
                                                            "h-12 rounded-xl border flex items-center justify-center text-[14px] font-black transition-all",
                                                            isSelected
                                                                ? "bg-[#00A082] border-[#00A082] text-white"
                                                                : isPast
                                                                    ? "bg-neutral-50 border-neutral-100 text-neutral-300 opacity-50"
                                                                    : "bg-white border-[#F0F0F0] text-black"
                                                        )}
                                                    >
                                                        {time}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-8 pb-10">
                                <button
                                    onClick={handleProgram}
                                    className="w-full py-4 bg-[#00A082] text-white rounded-2xl text-[18px] font-black shadow-lg shadow-[#00A082]/20 active:scale-95 transition-transform"
                                >
                                    {t({ en: 'Save Availability', fr: 'Enregistrer la disponibilité' })}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
