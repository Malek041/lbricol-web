"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderDetails } from '@/components/OrderCard';
import { ChevronLeft, Info, MessageCircle, HelpCircle, X, MapPin, Clock, Calendar as CalendarIcon, Phone, User, Ban, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { getServiceVector, getSubServiceName } from '../config/services_config';
import { format, isToday, isThisWeek, parseISO, startOfDay, addDays } from 'date-fns';


interface ClientOrdersViewProps {
    orders: OrderDetails[];
    onViewMessages: (jobId: string) => void;
    initialShowHistory?: boolean;
    onResumeDraft?: (draft: any) => void;
}

export default function ClientOrdersView({ orders, onViewMessages, initialShowHistory = false, onResumeDraft }: ClientOrdersViewProps) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'activity' | 'calendar'>('activity');
    const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
    const [showHistory, setShowHistory] = useState(initialShowHistory);

    // Filter orders for history (done and cancelled)
    const historyOrders = useMemo(() => {
        return orders.filter(o => ['done', 'cancelled'].includes(o.status || ''))
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [orders]);

    // Cancel order
    const handleCancelOrder = async (orderId: string) => {
        if (!orderId) return;
        const confirmResult = window.confirm('Are you sure you want to cancel this order?');
        if (!confirmResult) return;
        try {
            await updateDoc(doc(db, 'jobs', orderId), { status: 'cancelled' });
            setSelectedOrder(null);
        } catch (error) {
            console.error('Error cancelling order:', error);
        }
    };

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
            'pool_cleaning': '/Images/Job Cards Images/Pool Cleaning_job_card.png',
        };
        return serviceMap[service] || '/Images/Job Cards Images/Handyman_job_card.png';
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
                    1x task from <span className="capitalize">{order.service}</span>
                </p>
                <p className="text-[14px] font-bold text-neutral-400 mt-1 capitalize">
                    {order.status === 'done' ? 'Completed' : order.status}
                </p>
            </div>
        </motion.div>
    );

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] relative">
            {/* Top Tabs */}
            <div className="px-6 pt-8 pb-3 bg-white border-b border-[#E6E6E6] sticky top-0 z-10">
                <h1 className="text-[28px] font-black text-[#1D1D1D] mb-4">Orders</h1>
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={cn(
                            "pb-3 text-[16px] transition-all relative",
                            activeTab === 'activity' ? "font-black text-[#1D1D1D]" : "font-bold text-[#6B6B6B]"
                        )}
                    >
                        Activity
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
                        Calendar
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
                    />
                ) : (
                    <CalendarTab orders={orders} onSelectOrder={setSelectedOrder} />
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
                            <h1 className="text-[28px] font-black text-black">Order history</h1>
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
                                    <h3 className="text-[20px] font-black text-black">No history yet</h3>
                                    <p className="text-neutral-500 font-light">Your completed and cancelled orders will appear here.</p>
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
                                <h1 className="text-[20px] font-black text-black">{t({ en: 'Order details', fr: 'Détails de la commande' })}</h1>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => {
                                        selectedOrder.id && onViewMessages(selectedOrder.id);
                                        setSelectedOrder(null);
                                    }}
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-[#00A082] hover:bg-neutral-50 active:scale-90 transition-all"
                                >
                                    <MessageCircle size={24} strokeWidth={2.5} />
                                </button>
                                <button
                                    onClick={() => window.open('https://wa.me/212702814355', '_blank')}
                                    className="text-[17px] font-black text-[#00A082] hover:opacity-80 transition-opacity"
                                >
                                    {t({ en: 'Help', fr: 'Aide' })}
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                            <div className="px-12 pt-10 pb-6 flex items-center gap-6">
                                <div className="w-35 h-50 flex-shrink-0">
                                    <img
                                        src="/Images/Vectors Illu/NewOrder.png"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-[42px] font-black text-black leading-[1.1] tracking-tighter">
                                        {selectedOrder.status === 'done' ? t({ en: 'Completed', fr: 'Terminé' }) :
                                            selectedOrder.status === 'cancelled' ? t({ en: 'Cancelled', fr: 'Annulé' }) :
                                                selectedOrder.status === 'confirmed' || selectedOrder.status === 'programmed' ? t({ en: 'Programmed', fr: 'Programmé' }) :
                                                    t({ en: 'Ongoing', fr: 'En cours' })}
                                    </h2>
                                    <div className="flex items-center gap-2 text-[18px] font-semibold text-black mt-1">
                                        <span>{selectedOrder.date ? format(parseISO(selectedOrder.date), 'MMM d, yyyy') : t({ en: 'Date TBD', fr: 'Date à définir' })}</span>
                                        <span className="text-neutral-200">|</span>
                                        <span>{selectedOrder.time || t({ en: 'Flexible', fr: 'Flexible' })}</span>
                                    </div>
                                    <p className="text-[12px] font-light text-black uppercase tracking-[0.2em] mt-2">
                                        {t({ en: 'ORDER ID', fr: 'ID DE COMMANDE' })}: #{selectedOrder.id?.slice(-8).toUpperCase() || '---'}
                                    </p>
                                </div>
                            </div>

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
                                            {selectedOrder.service} {selectedOrder.subServiceDisplayName ? `› ${selectedOrder.subServiceDisplayName}` : ''}
                                        </p>
                                        <p className="text-[14px] font-light text-black leading-relaxed">
                                            {t({ en: 'Our Bricoler, ', fr: 'Notre Bricoler, ' })}<span className="text-black font-semibold">{selectedOrder.bricolerName || (selectedOrder.status === 'confirmed' || selectedOrder.status === 'programmed' ? 'Bricoler' : t({ en: 'Professional', fr: 'Professionnel' }))}</span>{t({ en: ', will do the task for you. Feel free to chat for more details.', fr: ', fera la tâche pour vous. N\'hésitez pas à discuter pour plus de détails.' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Need Description */}
                                <div className="space-y-3">
                                    <h3 className="text-[28px] font-black text-black">{t({ en: 'Need Description', fr: 'Description du besoin' })}</h3>
                                    <div className="p-5 bg-neutral-50 rounded-[16px] text-neutral-500 text-[15px] font-light leading-relaxed">
                                        {selectedOrder.description || selectedOrder.comment || t({ en: 'No specific instructions provided for this task.', fr: 'Aucune instruction spécifique fournie pour cette tâche.' })}
                                    </div>
                                </div>

                                {/* Task Photos */}
                                {selectedOrder.images && selectedOrder.images.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-[28px] font-black text-black">{t({ en: 'Photos', fr: 'Photos' })}</h3>
                                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                            {selectedOrder.images.map((img, i) => (
                                                <div key={i} className="relative w-40 h-40 flex-shrink-0 rounded-[20px] overflow-hidden border border-neutral-100 shadow-sm">
                                                    <img
                                                        src={img}
                                                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                        alt="Task"
                                                        onClick={() => window.open(img, '_blank')}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Payment Method */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-[28px] font-black text-black">{t({ en: 'Payment Method', fr: 'Mode de paiement' })}</h3>
                                        <div className="w-12 h-12 flex-shrink-0">
                                            <img src="/Images/Vectors Illu/Screenshot 2026-02-23 at 11.36.49-Photoroom.png" className="w-full h-full object-contain" />
                                        </div>
                                    </div>
                                    <div className="inline-flex px-4 py-2 bg-[#FFC244] text-black text-[15px] font-semibold rounded-[8px]">
                                        {selectedOrder.paymentMethod === 'Cash on delivery' || selectedOrder.paymentMethod === 'cash' ? t({ en: 'Cash on delivery', fr: 'Paiement à la livraison' }) : (selectedOrder.paymentMethod || t({ en: 'Cash on delivery', fr: 'Paiement à la livraison' }))}
                                    </div>

                                    {/* Bank Receipt Display */}
                                    {selectedOrder.bankReceipt && (
                                        <div className="mt-4 space-y-3">
                                            <p className="text-[14px] font-black text-[#00A082] flex items-center gap-2">
                                                <Check size={16} strokeWidth={3} />
                                                {t({ en: 'Bank receipt attached', fr: 'Reçu bancaire joint' })}
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
                                                {t({ en: 'Tap image to view full size', fr: 'Appuyez sur l\'image pour l\'agrandir' })}
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
                                    <h3 className="text-[28px] font-black text-black">{t({ en: 'Summary', fr: 'Résumé' })}</h3>
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <span className="text-[16px] font-semibold text-black">{t({ en: 'Task Fee', fr: 'Frais de tâche' })}</span>
                                                <span className="text-[14px] font-light text-black">≈ {selectedOrder.duration || '2h-3h'}</span>
                                            </div>
                                            <span className="text-[16px] font-bold text-black tracking-tight">{((selectedOrder.totalPrice || 0) * 0.85).toFixed(0)} MAD</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <span className="text-[16px] font-semibold text-black">{t({ en: 'Lbricol Fee', fr: 'Frais Lbricol' })}</span>
                                                <span className="text-[14px] font-light text-black">15%</span>
                                            </div>
                                            <span className="text-[16px] font-bold text-black tracking-tight">{((selectedOrder.totalPrice || 0) * 0.15).toFixed(0)} MAD</span>
                                        </div>
                                        <div className="pt-6 flex justify-between items-center border-t border-neutral-200">
                                            <span className="text-[28px] font-black text-black">{t({ en: 'Total', fr: 'Total' })}</span>
                                            <span className="text-[28px] font-black text-black tracking-tighter">{(selectedOrder.totalPrice || 0).toFixed(0)} MAD</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
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
    onResumeDraft
}: {
    orders: OrderDetails[],
    onSelect: (o: OrderDetails) => void,
    onShowHistory: () => void,
    onResumeDraft?: (draft: any) => void
}) {
    const { t } = useLanguage();

    const activeOrders = useMemo(() => {
        return orders.filter(o => ['confirmed', 'accepted', 'programmed'].includes(o.status || ''))
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [orders]);

    const incompleteOrders = useMemo(() => {
        return orders.filter(o => ['new', 'pending', 'negotiating'].includes(o.status || ''));
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

    const [dateFilter, setDateFilter] = React.useState<'all' | 'today' | 'week'>('all');

    const filteredOrders = useMemo(() => {
        return activeOrders.filter(order => {
            if (dateFilter === 'all') return true;
            if (!order.date) return false;
            try {
                const orderDate = new Date(order.date);
                if (dateFilter === 'today') return isToday(orderDate);
                if (dateFilter === 'week') return isThisWeek(orderDate, { weekStartsOn: 1 });
                return true;
            } catch (e) {
                return true;
            }
        });
    }, [activeOrders, dateFilter]);

    const [currentTime, setCurrentTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

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
        <div className="bg-white rounded-[16px] border border-[#F0F0F0] p-10 flex flex-col items-center text-center">
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
                    {t({ en: 'Resume', fr: 'Reprendre' })}
                </div>

                <div className="w-20 h-20 bg-neutral-50 rounded-2xl flex items-center justify-center flex-shrink-0 p-3">
                    <img src={getServiceVector(draft.service)} className="w-full h-full object-contain" />
                </div>

                <div className="flex-1 min-w-0 pr-8">
                    <h3 className="text-[18px] font-black text-black truncate leading-tight mb-1">
                        {draft.service} {draft.subService ? `› ${getSubServiceName(draft.service, draft.subService)}` : ''}
                    </h3>
                    <p className="text-[14px] font-medium text-neutral-400 line-clamp-1">
                        {draft.description || t({ en: 'Continue where you left off', fr: 'Continuez là où vous vous êtes arrêté' })}
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
                <div className="w-28 h-28 bg-white rounded-[16px] border border-[#F0F0F0] flex items-center justify-center flex-shrink-0 p-1 overflow-hidden">
                    <img src={getServiceVector(order.service)} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-[#E6F7F4] text-[#00A082] text-[11px] font-black rounded-md uppercase tracking-wider">On time</span>
                    </div>
                    <h3 className="text-[17px] font-black text-black truncate leading-tight">
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
            {/* Active Orders Section */}
            <div className="space-y-6">
                <div className="flex flex-col gap-4">
                    <h2 className="text-[26px] font-bold text-black">Orders</h2>

                    {/* Filters */}
                    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'today', label: 'Today' },
                            { id: 'week', label: 'This Week' }
                        ].map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setDateFilter(f.id as any)}
                                className={cn(
                                    "px-7 py-3.5 rounded-full text-[17px] font-black transition-all border shrink-0",
                                    dateFilter === f.id
                                        ? "bg-[#00A082] text-white border-[#00A082]"
                                        : "bg-white text-black border-[#F0F0F0]"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {filteredOrders.length > 0 ? (
                    <div className="pt-2">{filteredOrders.map(renderOrderCard)}</div>
                ) : (
                    <div className="pt-2">
                        {renderEmptyState(
                            dateFilter === 'all' ? "Track your orders" : "No orders found",
                            dateFilter === 'all' ? "Your ongoing orders will be listed here" : "No orders match this date filter",
                            <img src="/Images/Vectors Illu/NewOrder.png" className="w-28 h-28 object-contain grayscale opacity-40" />
                        )}
                    </div>
                )}
            </div>

            {/* Continue Your Order Section */}
            <div className="space-y-4">
                <h2 className="text-[26px] font-black text-black">{t({ en: 'Continue your order', fr: 'Continuer votre commande' })}</h2>
                {(incompleteOrders.length > 0 || localDrafts.length > 0) ? (
                    <div className="pt-2">
                        {localDrafts.map(renderDraftCard)}
                        {incompleteOrders.map(renderOrderCard)}
                    </div>
                ) : (
                    <div className="pt-2">
                        {renderEmptyState(
                            t({ en: 'No carts yet', fr: 'Pas encore de paniers' }),
                            t({ en: "Orders you don't complete will appear here", fr: 'Les commandes non terminées apparaîtront ici' }),
                            <img src="/Images/Vectors Illu/DraftOrders2.png" className="w-28 h-28 object-contain grayscale opacity-40" />
                        )}
                    </div>
                )}
            </div>

            {/* History Link */}
            <div className="bg-[#F2F2F2] rounded-[16px] p-6 flex items-center gap-5 mt-4">
                <div className="flex items-center justify-center flex-shrink-0">
                    <img src="/Images/Vectors Illu/OrdersHistory.png" className="w-20 h-20 object-contain" />
                </div>
                <div className="flex flex-col">
                    <p className="text-[16px] font-light text-black leading-tight">{t({ en: 'Need to review past orders or reorder?', fr: 'Besoin de consulter vos commandes passées ?' })}</p>
                    <button
                        onClick={onShowHistory}
                        className="text-[17px] font-black text-[#00A082] mt-1 text-left decoration-[#00A082] decoration-2 underline-offset-4 hover:underline"
                    >
                        {t({ en: 'Check your order history', fr: 'Voir l\'historique de commandes' })}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Calendar Tab Component ──────────────────────────────────────────────
function CalendarTab({ orders, onSelectOrder }: { orders: OrderDetails[], onSelectOrder: (o: OrderDetails) => void }) {
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // Week state: anchor is start of current week (Monday)
    const getMonday = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day; // bring to Monday
        d.setDate(d.getDate() + diff);
        return startOfDay(d);
    };

    const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
    const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        return { date: d, dateStr: format(d, 'yyyy-MM-dd'), dayNum: format(d, 'd'), dayLabel: format(d, 'EEE') };
    });

    const validOrders = orders.filter(o => !(o.status as string)?.match(/cancelled|rejected/));

    const selectedOrders = useMemo(() => {
        return validOrders.filter(o => o.date === selectedDateStr);
    }, [selectedDateStr, validOrders]);

    const weekLabel = `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`;

    return (
        <div className="flex flex-col bg-[#F7F7F7] pb-24 h-full">
            {/* Week Strip Header */}
            <div className="bg-white border-b border-[#E6E6E6] px-4 pt-4 pb-4 flex-shrink-0">
                {/* Week Nav */}
                <div className="flex items-center justify-between mb-3">
                    <button
                        onClick={() => setWeekStart(prev => addDays(prev, -7))}
                        className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center active:bg-neutral-200 transition-colors"
                    >
                        <ChevronLeft size={18} className="text-[#1D1D1D]" />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[13px] font-semibold text-[#6B6B6B]">{weekLabel}</span>
                        {weekStart <= new Date() && addDays(weekStart, 6) >= new Date() && (
                            <span className="text-[10px] font-bold text-[#00A082] uppercase tracking-widest mt-0.5">This Week</span>
                        )}
                    </div>
                    <button
                        onClick={() => setWeekStart(prev => addDays(prev, 7))}
                        className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center active:bg-neutral-200 transition-colors"
                    >
                        <ChevronLeft size={18} className="text-[#1D1D1D] rotate-180" />
                    </button>
                </div>

                {/* 7-Day Strip */}
                <div className="grid grid-cols-7 gap-1">
                    {weekDays.map(day => {
                        const isTodayStr = day.dateStr === todayStr;
                        const isSelected = day.dateStr === selectedDateStr;
                        const dayOrders = validOrders.filter(o => o.date === day.dateStr);
                        const hasOrders = dayOrders.length > 0;
                        const isPast = new Date(day.dateStr).getTime() < startOfDay(new Date()).getTime();

                        return (
                            <button
                                key={day.dateStr}
                                onClick={() => setSelectedDateStr(day.dateStr)}
                                className={cn(
                                    "flex flex-col items-center py-2.5 rounded-[16px] relative transition-all",
                                    isSelected ? "bg-[#00A082]" : isTodayStr ? "bg-[#E6F7F4]" : "bg-transparent hover:bg-neutral-50"
                                )}
                            >
                                <span className={cn("text-[11px] font-semibold mb-1", isSelected ? "text-white/80" : "text-[#6B6B6B]")}>
                                    {day.dayLabel}
                                </span>
                                <span className={cn("text-[16px] font-bold", isSelected ? "text-white" : isTodayStr ? "text-[#00A082]" : "text-[#1D1D1D]")}>
                                    {day.dayNum}
                                </span>
                                {/* Order dot indicator */}
                                {hasOrders && !isSelected && (
                                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1", isPast ? "bg-[#BDBDBD]" : "bg-[#FFC244]")} />
                                )}
                                {isSelected && hasOrders && (
                                    <div className="w-1.5 h-1.5 rounded-full mt-1 bg-white/60" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Orders */}
            <div className="flex-1 px-4 py-5 overflow-y-auto">
                <h3 className="text-[15px] font-semibold text-[#6B6B6B] uppercase tracking-wide mb-3">
                    {format(new Date(selectedDateStr + 'T12:00:00'), 'EEEE, MMMM do')}
                </h3>

                {selectedOrders.length === 0 ? (
                    <div className="bg-white border border-[#F0F0F0] rounded-[16px] p-6 text-center">
                        <CalendarIcon size={28} className="text-[#BDBDBD] mb-2 mx-auto" />
                        <p className="text-[14px] font-medium text-[#6B6B6B]">No bookings on this day.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {selectedOrders.map(order => (
                            <motion.button
                                key={order.id}
                                onClick={() => onSelectOrder(order)}
                                whileTap={{ scale: 0.97 }}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                className="w-full bg-white text-left p-4 rounded-[16px] border border-[#F0F0F0] flex items-center gap-4"
                            >
                                <div className="w-12 h-12 rounded-[16px] overflow-hidden bg-white border border-[#F0F0F0] flex-shrink-0">
                                    <img src={getServiceVector(order.service)} alt={order.service} className="w-full h-full object-contain p-1" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[15px] font-bold text-[#1D1D1D] block capitalize truncate">{order.service}</span>
                                    <span className="text-[13px] font-medium text-[#6B6B6B] truncate block">{order.bricolerName || 'Awaiting Pro'}</span>
                                    <span className="text-[12px] font-semibold text-[#00A082]">{order.time || 'Flexible'}{order.duration ? ` · ${order.duration}h` : ''}</span>
                                </div>
                                <ChevronLeft className="text-[#BDBDBD] rotate-180 flex-shrink-0" size={18} />
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
