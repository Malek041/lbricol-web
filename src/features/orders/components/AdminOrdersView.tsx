import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingBag, Search, Filter, MapPin,
    Calendar as CalendarIcon, Clock, ChevronRight,
    CheckCircle2, AlertCircle, RotateCcw, XCircle, Star
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from 'date-fns';
import JobDetailsPopup, { JobDetails } from '@/features/orders/components/JobDetailsPopup';
import { getSubService } from '@/config/services_config';
import { parseISO } from 'date-fns';

interface AdminOrdersViewProps {
    t: (vals: { en: string; fr: string }) => string;
    onViewMessages?: (jobId: string) => void;
    onChat?: (jobId: string, bricolerId: string, bricolerName: string) => void;
}

const AdminOrdersView: React.FC<AdminOrdersViewProps> = ({ t, onChat, onViewMessages }) => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCity, setSelectedCity] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'completed' | 'cancelled' | 'negotiating'>('all');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    const cities = ['all', 'Marrakech', 'Casablanca', 'Essaouira', 'Agadir', 'Rabat', 'Tangier'];
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const getDynamicStatus = (order: any) => {
        if (!order.date || !order.time) return order.status;
        const autoStatuses = ['confirmed', 'accepted', 'programmed', 'pending', 'in_progress'];
        if (!autoStatuses.includes(order.status || '')) return order.status;

        try {
            const timeStr = order.time.split('-')[0].trim();
            const dateStr = typeof order.date === 'string' ? order.date : format(new Date(order.date), 'yyyy-MM-dd');
            const startTime = parseISO(`${dateStr}T${timeStr}:00`).getTime();
            const now = currentTime.getTime();

            let durationHr = 2;
            const subService = getSubService(order.serviceId || order.service || '', order.subService || '');
            if (subService?.estimatedDurationHr) {
                durationHr = subService.estimatedDurationHr;
            }

            const endTime = startTime + (durationHr * 60 * 60 * 1000);

            if (now < startTime) return 'on_time';
            if (now >= startTime && now < endTime) return 'in_progress';
            if (now >= endTime) return 'done';
            return order.status;
        } catch (e) { return order.status; }
    };

    useEffect(() => {
        setLoading(true);

        // Avoid Firestore composite index requirement by only ordering globally,
        // and sorting client-side for city-scoped queries.
        let q;
        if (selectedCity === 'all') {
            q = query(collection(db, 'jobs'));
        } else {
            q = query(collection(db, 'jobs'), where('city', '==', selectedCity));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as any));

            // Sort by createdAt desc by default
            loadedOrders.sort((a, b) => {
                const aTs = a.createdAt?.seconds || 0;
                const bTs = b.createdAt?.seconds || 0;
                return bTs - aTs;
            });

            setOrders(loadedOrders);
            setLoading(false);
        }, (error) => {
            console.error("AdminOrdersView snapshot error", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [selectedCity]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed':
            case 'done':
                return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 };
            case 'pending':
            case 'waiting':
                return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock };
            case 'cancelled':
                return { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle };
            case 'negotiating':
                return { bg: 'bg-blue-100', text: 'text-blue-700', icon: RotateCcw };
            default:
                return { bg: 'bg-neutral-100', text: 'text-neutral-700', icon: AlertCircle };
        }
    };

    const filteredOrders = useMemo(() => {
        let result = orders.filter(order =>
            (order.service || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.clientId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            ((typeof order.location === 'object' ? order.location.address : order.location) || '').toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (statusFilter !== 'all') {
            result = result.filter(order => {
                const s = (getDynamicStatus(order) || '').toLowerCase();
                if (statusFilter === 'open') {
                    return ['pending', 'waiting', 'new', 'negotiating', 'accepted', 'matching', 'confirmed', 'in_progress', 'on_time'].includes(s);
                }
                if (statusFilter === 'completed') {
                    return ['done', 'completed', 'delivered'].includes(s);
                }
                if (statusFilter === 'cancelled') {
                    return ['cancelled', 'rejected'].includes(s);
                }
                if (statusFilter === 'negotiating') {
                    return ['negotiating'].includes(s);
                }
                return true;
            });
        }

        result.sort((a, b) => {
            if (sortBy === 'date_desc' || sortBy === 'date_asc') {
                const aTs = a.createdAt?.seconds || 0;
                const bTs = b.createdAt?.seconds || 0;
                return sortBy === 'date_desc' ? bTs - aTs : aTs - bTs;
            }
            const aAmount = Number(a.totalPrice ?? a.price ?? 0);
            const bAmount = Number(b.totalPrice ?? b.price ?? 0);
            return sortBy === 'amount_desc' ? bAmount - aAmount : aAmount - bAmount;
        });

        return result;
    }, [orders, searchQuery, statusFilter, sortBy]);

    const dailyCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredOrders.forEach(order => {
            const d = order.date
                ? new Date(order.date)
                : (order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000) : null);
            if (!d) return;
            const key = format(d, 'yyyy-MM-dd');
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }, [filteredOrders]);

    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
        <div className="flex flex-col h-[100dvh] bg-white pb-24">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl pt-12 pb-4 px-5 border-b border-neutral-100">
                <h1 className="text-2xl font-black text-black mb-6">
                    {t({ en: 'Platform Orders', fr: 'Commandes Plateforme' })}
                </h1>

                <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
                    {cities.map(city => (
                        <button
                            key={city}
                            onClick={() => setSelectedCity(city)}
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedCity === city
                                ? 'bg-black text-white'
                                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                                }`}
                        >
                            {city === 'all' ? t({ en: 'All Cities', fr: 'Toutes les villes' }) : city}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t({ en: 'Search orders, services...', fr: 'Rechercher commandes, services...' })}
                        className="w-full h-12 bg-neutral-100 rounded-2xl pl-12 pr-4 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-black transition-all outline-none"
                    />
                </div>

                {/* Filters row */}
                <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-neutral-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="h-9 rounded-full bg-neutral-100 px-3 text-xs font-bold text-neutral-700 outline-none"
                        >
                            <option value="all">{t({ en: 'All statuses', fr: 'Tous statuts' })}</option>
                            <option value="open">{t({ en: 'Open / In progress', fr: 'Ouvert / En cours' })}</option>
                            <option value="completed">{t({ en: 'Completed', fr: 'Terminées' })}</option>
                            <option value="cancelled">{t({ en: 'Cancelled', fr: 'Annulées' })}</option>
                            <option value="negotiating">{t({ en: 'Negotiating', fr: 'En négociation' })}</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                            {t({ en: 'Sort by', fr: 'Trier par' })}
                        </span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="h-9 rounded-full bg-neutral-100 px-3 text-xs font-bold text-neutral-700 outline-none"
                        >
                            <option value="date_desc">{t({ en: 'Newest first', fr: 'Plus récents' })}</option>
                            <option value="date_asc">{t({ en: 'Oldest first', fr: 'Plus anciens' })}</option>
                            <option value="amount_desc">{t({ en: 'Amount (high → low)', fr: 'Montant (haut → bas)' })}</option>
                            <option value="amount_asc">{t({ en: 'Amount (low → high)', fr: 'Montant (bas → haut)' })}</option>
                        </select>
                    </div>
                </div>

                {/* View mode toggle */}
                <div className="mt-3 inline-flex items-center bg-neutral-100 rounded-full p-1">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold ${viewMode === 'list' ? 'bg-white shadow-sm text-black' : 'text-neutral-500'}`}
                    >
                        {t({ en: 'List', fr: 'Liste' })}
                    </button>
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold ${viewMode === 'calendar' ? 'bg-white shadow-sm text-black' : 'text-neutral-500'}`}
                    >
                        {t({ en: 'Calendar', fr: 'Calendrier' })}
                    </button>
                </div>
            </div>

            {/* Main Content: either list or calendar */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
                {viewMode === 'list' ? (
                    <>
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                            </div>
                        ) : filteredOrders.length > 0 ? (
                            filteredOrders.map(order => {
                                const style = getStatusStyle(order.status);
                                const StatusIcon = style.icon;
                                const price = Number(order.totalPrice ?? order.price ?? 0);

                                return (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={order.id}
                                        className="bg-white rounded-[32px] p-6 border border-neutral-100 shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col gap-1">
                                                <div className={`w-fit px-3 py-1 rounded-full ${style.bg} ${style.text} text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5`}>
                                                    <StatusIcon size={12} />
                                                    {getDynamicStatus(order)}
                                                </div>
                                                <span className="text-neutral-400 text-[11px] font-bold uppercase tracking-widest mt-2">{order.city}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-black font-black text-xl leading-none">{price.toLocaleString(undefined, { maximumFractionDigits: 0 })} MAD</p>
                                                <p className="text-neutral-400 text-[11px] font-medium mt-1">
                                                    {order.createdAt?.seconds ? format(order.createdAt.seconds * 1000, 'MMM d, HH:mm') : t({ en: 'Recently', fr: 'Récemment' })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 mb-5">
                                            <div className="w-14 h-14 bg-neutral-50 rounded-2xl flex items-center justify-center p-2 group-hover:bg-[#FFC244]/10 transition-colors">
                                                <img 
                                                    src="/Images/Vectors Illu/LbricolFaceOY.webp" 
                                                    className="w-full h-full object-contain" 
                                                    alt="Service" 
                                                />
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <h3 className="text-[20px] font-black text-black leading-tight tracking-tight">{order.service}</h3>
                                                <div className="flex items-center gap-1.5 text-neutral-400 mt-1">
                                                    <MapPin size={12} />
                                                    <p className="text-[12px] font-bold truncate max-w-[180px]">
                                                        {typeof order.location === 'object' ? order.location.address : order.location}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-neutral-50">
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    <div className="w-8 h-8 rounded-full bg-neutral-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-neutral-400">
                                                        {order.clientName ? order.clientName[0] : 'C'}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <p className="text-[11px] font-black text-black">{order.clientName || 'Client'}</p>
                                                    <div className="flex items-center gap-1">
                                                        <Star size={10} className="text-[#FFC244] fill-[#FFC244]" />
                                                        <span className="text-[10px] font-bold text-neutral-500">{(order.clientRating || 5.0).toFixed(1)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-neutral-400">
                                                <span className="text-[11px] font-bold uppercase tracking-widest mt-0.5">Details</span>
                                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShoppingBag size={32} className="text-neutral-300" />
                                </div>
                                <p className="text-neutral-400 font-medium">{t({ en: 'No orders found', fr: 'Aucune commande trouvée' })}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-4">
                        {/* Calendar header */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setCalendarMonth(prev => addMonths(prev, -1))}
                                className="p-2 rounded-full hover:bg-neutral-100"
                            >
                                <ChevronRight size={18} className="rotate-180 text-neutral-600" />
                            </button>
                            <div className="text-sm font-black text-neutral-900">
                                {format(calendarMonth, 'MMMM yyyy')}
                            </div>
                            <button
                                onClick={() => setCalendarMonth(prev => addMonths(prev, 1))}
                                className="p-2 rounded-full hover:bg-neutral-100"
                            >
                                <ChevronRight size={18} className="text-neutral-600" />
                            </button>
                        </div>

                        {/* Weekday header */}
                        <div className="grid grid-cols-7 gap-1 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                                <div key={d} className="text-center">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Days grid */}
                        <div className="grid grid-cols-7 gap-2">
                            {/* Pad start of month */}
                            {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, idx) => (
                                <div key={`pad-${idx}`} />
                            ))}
                            {daysInMonth.map((day) => {
                                const key = format(day, 'yyyy-MM-dd');
                                const count = dailyCounts[key] || 0;
                                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                const intensity =
                                    count === 0 ? 'bg-neutral-50 border-neutral-100 text-neutral-400' :
                                        count < 3 ? 'bg-[#E6F6F2] border-[#B3E1D6] text-[#006A52]' :
                                            count < 7 ? 'bg-[#C7EFE4] border-[#7FD7BE] text-[#00513E]' :
                                                'bg-[#01A083] border-[#00846B] text-white';

                                return (
                                    <div
                                        key={key}
                                        className={`aspect-square rounded-2xl border flex flex-col items-center justify-center text-xs font-bold ${intensity}`}
                                    >
                                        <span className="text-[11px] mb-0.5">
                                            {day.getDate()}
                                        </span>
                                        <span className="text-[9px] opacity-80">
                                            {count > 0 ? `${count} ${t({ en: 'jobs', fr: 'jobs' })}` : ''}
                                        </span>
                                        {isToday && (
                                            <span className="mt-0.5 text-[8px] uppercase">
                                                {t({ en: 'Today', fr: 'Auj' })}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Order details */}
            <JobDetailsPopup
                job={
                    selectedOrder
                        ? {
                            id: selectedOrder.id,
                            service: selectedOrder.service || 'Service',
                            clientName: selectedOrder.clientName || 'Client',
                            clientRating: typeof selectedOrder.clientRating === 'number' ? selectedOrder.clientRating : 5.0,
                            location: selectedOrder.location || selectedOrder.city || '',
                            date: selectedOrder.date || (selectedOrder.createdAt?.seconds ? format(selectedOrder.createdAt.seconds * 1000, 'MMM d, yyyy') : ''),
                            time: selectedOrder.time || '',
                            duration: selectedOrder.duration ? `${selectedOrder.duration}h` : '',
                            price: Number(selectedOrder.totalPrice ?? selectedOrder.price ?? 0),
                            description: selectedOrder.description || '',
                            status: selectedOrder.status as any,
                            bricolerId: selectedOrder.bricolerId,
                            bricolerName: selectedOrder.bricolerName,
                            clientAvatar: selectedOrder.clientAvatar,
                            bricolerWhatsApp: selectedOrder.bricolerWhatsApp,
                            clientWhatsApp: selectedOrder.clientWhatsApp,
                        } as JobDetails
                        : null
                }
                onClose={() => setSelectedOrder(null)}
                isAdmin={true}
                onChat={onChat}
            />
        </div>
    );
};

export default AdminOrdersView;
