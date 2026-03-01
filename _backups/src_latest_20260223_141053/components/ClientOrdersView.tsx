"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderDetails } from '@/components/OrderCard';
import { ChevronLeft, Info, MessageCircle, HelpCircle, X, MapPin, Clock, Calendar as CalendarIcon, Phone, User, Ban } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format, isToday, isThisWeek, parseISO, isPast, isFuture, startOfDay, addDays, startOfMonth, endOfMonth, getDaysInMonth, getDay } from 'date-fns';

interface ClientOrdersViewProps {
    orders: OrderDetails[];
    onViewMessages: (jobId: string) => void;
}

export default function ClientOrdersView({ orders, onViewMessages }: ClientOrdersViewProps) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'activity' | 'calendar'>('activity');
    const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);

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

            <div className="flex-1 overflow-y-auto no-scrollbar relative w-full h-full">
                {activeTab === 'activity' ? (
                    <ActivityTab orders={orders} onSelect={setSelectedOrder} />
                ) : (
                    <CalendarTab orders={orders} onSelectOrder={setSelectedOrder} />
                )}
            </div>

            {/* Full Order Details Modal */}
            <AnimatePresence>
                {selectedOrder && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ type: "spring", damping: 26, stiffness: 260 }}
                        className="fixed inset-0 z-[2500] bg-[#FAFAFA] flex flex-col"
                    >
                        <div className="px-6 pt-6 pb-4 bg-white flex items-center justify-between border-b border-[#E6E6E6]">
                            <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center bg-neutral-100/50 hover:bg-neutral-100 transition-colors">
                                <ChevronLeft size={24} className="text-[#1D1D1D]" />
                            </button>
                            <h3 className="text-[18px] font-black text-[#1D1D1D] tracking-tight">Order #{selectedOrder.id?.slice(-4).toUpperCase() || 'DETAILS'}</h3>
                            <button onClick={() => window.open('https://wa.me/212702814355', '_blank')} className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center bg-neutral-100/50 hover:bg-neutral-100">
                                <HelpCircle size={20} className="text-[#1D1D1D]" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="bg-white p-5 rounded-[24px] border border-[#E6E6E6] shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h2 className="text-[22px] font-black text-[#1D1D1D] leading-tight capitalize">{selectedOrder.service}</h2>
                                        {selectedOrder.subServiceDisplayName && (
                                            <p className="text-[15px] text-[#6B6B6B] font-medium mt-0.5">{selectedOrder.subServiceDisplayName}</p>
                                        )}
                                    </div>
                                    <div className={cn(
                                        "px-3 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-wider",
                                        selectedOrder.status === 'done' ? "bg-[#00A082]/10 text-[#00A082]" :
                                            selectedOrder.status === 'cancelled' || (selectedOrder.status as string) === 'rejected' ? "bg-red-50 text-red-600" :
                                                "bg-[#FFC244]/20 text-[#D89B1A]"
                                    )}>
                                        {selectedOrder.status}
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-[#F0F0F0]">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-[14px] bg-[#F7F7F7] flex items-center justify-center flex-shrink-0">
                                            <CalendarIcon size={20} className="text-[#00A082]" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-bold text-[#6B6B6B] uppercase tracking-wide">Schedule</p>
                                            <p className="text-[16px] font-black text-[#1D1D1D] mt-0.5 whitespace-nowrap">{selectedOrder.date} • {selectedOrder.time || 'Flexible'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-[14px] bg-[#F7F7F7] flex items-center justify-center flex-shrink-0">
                                            <MapPin size={20} className="text-[#00A082]" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-bold text-[#6B6B6B] uppercase tracking-wide">Location</p>
                                            <p className="text-[16px] font-black text-[#1D1D1D] mt-0.5 truncate pr-4">{selectedOrder.location || selectedOrder.city}</p>
                                        </div>
                                    </div>

                                    {selectedOrder.bricolerName && (
                                        <div className="flex items-center gap-4">
                                            <img src={selectedOrder.bricolerAvatar || '/Images/Logo/GYLogo.png'} alt={selectedOrder.bricolerName} className="w-12 h-12 rounded-[14px] object-cover bg-neutral-100 border border-neutral-100 shrink-0" />
                                            <div>
                                                <p className="text-[13px] font-bold text-[#6B6B6B] uppercase tracking-wide">Provider</p>
                                                <p className="text-[16px] font-black text-[#1D1D1D] mt-0.5">{selectedOrder.bricolerName}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedOrder.description || selectedOrder.comment ? (
                                <div className="bg-white p-5 rounded-[24px] border border-[#E6E6E6]">
                                    <p className="text-[13px] font-bold text-[#6B6B6B] uppercase tracking-wide mb-2">Issue Description</p>
                                    <p className="text-[15px] font-medium text-[#1D1D1D] italic leading-relaxed">
                                        "{selectedOrder.description || selectedOrder.comment}"
                                    </p>
                                </div>
                            ) : null}

                            <div className="h-6" />
                        </div>

                        {/* Action Buttons */}
                        <div className="p-6 bg-white border-t border-[#E6E6E6] space-y-3 pb-8">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => window.open('https://wa.me/212702814355', '_blank')}
                                    className="flex-1 py-4 bg-[#F2F2F2] hover:bg-[#E6E6E6] text-[#1D1D1D] font-black text-[16px] rounded-[16px] transition-colors flex items-center justify-center gap-2"
                                >
                                    <Phone size={18} /> Support
                                </button>
                                {selectedOrder.bricolerId && (
                                    <button
                                        onClick={() => {
                                            selectedOrder.id && onViewMessages(selectedOrder.id);
                                            setSelectedOrder(null);
                                        }}
                                        className="flex-1 py-4 bg-[#FFC244] hover:bg-[#F2B330] text-[#1D1D1D] font-black text-[16px] rounded-[16px] transition-colors flex items-center justify-center gap-2"
                                    >
                                        <MessageCircle size={18} /> Chat
                                    </button>
                                )}
                            </div>

                            {!(selectedOrder.status as string)?.match(/done|cancelled|rejected/) && (
                                <button
                                    onClick={() => selectedOrder.id && handleCancelOrder(selectedOrder.id)}
                                    className="w-full py-4 border-2 border-[#1D1D1D] text-[#1D1D1D] font-black text-[16px] rounded-[16px] hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Ban size={18} /> Cancel Booking
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Activity Tab Component ──────────────────────────────────────────────
function ActivityTab({ orders, onSelect }: { orders: OrderDetails[], onSelect: (o: OrderDetails) => void }) {
    const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all');

    const activityOrders = useMemo(() => {
        let list = orders.filter(o => !(o.status as string)?.match(/cancelled|rejected/)); // hide cancelled completely from activity based on spec
        if (filter === 'today') {
            list = list.filter(o => o.date && isToday(parseISO(o.date)));
        } else if (filter === 'week') {
            list = list.filter(o => o.date && isThisWeek(parseISO(o.date)));
        }
        // sort by date desc
        return list.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
    }, [orders, filter]);

    const grouped = {
        pending: activityOrders.filter(o => ['new', 'pending', 'negotiating'].includes(o.status || '')),
        accepted: activityOrders.filter(o => ['confirmed', 'accepted'].includes((o.status as string) || '')),
        done: activityOrders.filter(o => ['done'].includes(o.status || '')),
    };

    const renderCard = (order: OrderDetails) => (
        <motion.div
            key={order.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(order)}
            className="flex flex-col bg-white rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden border border-[#E6E6E6] mb-4 cursor-pointer"
        >
            <div className="bg-[#FFC244] p-5 flex items-start justify-between relative">
                {/* ID/Lock mock badge top-right */}
                <div className="absolute top-4 right-4 w-7 h-7 bg-white/20 rounded-[8px] flex items-center justify-center">
                    <Info size={16} className="text-[#1D1D1D]" />
                </div>

                <div className="flex flex-col pr-8">
                    <span className="text-[18px] font-black text-[#1D1D1D] leading-tight mb-3 capitalize">{order.service}</span>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/50 border border-white/20">
                            {order.bricolerAvatar ? (
                                <img src={order.bricolerAvatar} alt={order.bricolerName} className="w-full h-full object-cover" />
                            ) : (
                                <User size={18} className="text-[#1D1D1D] m-auto mt-1.5" />
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[14px] font-black text-[#1D1D1D]">{order.bricolerName || 'Awaiting Pro'}</span>
                            {order.bricolerId && <span className="text-[11px] font-bold text-[#8C6B00]">Verified</span>}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end justify-center pt-8">
                    <span className="text-[24px] font-black text-[#1D1D1D] leading-none mb-1 tabular-nums">{order.time?.split(':')[0] || '--'} <span className="text-[14px]">:{order.time?.split(':')[1] || '--'}</span></span>
                    <span className="text-[12px] font-black text-[#8C6B00] uppercase tracking-wider">{order.date}</span>
                </div>
            </div>

            <div className="bg-[#1D1D1D] px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full",
                        order.status === 'done' ? 'bg-[#00A082]' :
                            order.status === 'confirmed' ? 'bg-[#00A082]' : 'bg-[#FFC244]'
                    )} />
                    <span className="text-[13px] font-bold text-white uppercase tracking-wider">
                        {order.status === 'pending' || order.status === 'negotiating' ? 'Awaiting Confirmation' :
                            order.status === 'confirmed' ? 'Scheduled & Ready' :
                                order.status === 'done' ? 'Job Completed' : order.status}
                    </span>
                </div>
                {order.totalPrice && <span className="text-white text-[13px] font-black">{order.totalPrice} MAD</span>}
            </div>
        </motion.div>
    );

    return (
        <div className="space-y-6 pt-4 pb-4 px-4 bg-[#f8f8f8]">
            <div className="flex gap-2 w-full overflow-x-auto no-scrollbar pb-2">
                <button
                    onClick={() => setFilter('all')}
                    className={cn("px-5 py-2.5 rounded-full text-[14px] font-black transition-all border whitespace-nowrap", filter === 'all' ? "bg-[#00A082] text-white border-[#00A082]" : "bg-white text-[#1D1D1D] border-[#E6E6E6]")}
                >All</button>
                <button
                    onClick={() => setFilter('today')}
                    className={cn("px-5 py-2.5 rounded-full text-[14px] font-black transition-all border whitespace-nowrap", filter === 'today' ? "bg-[#00A082] text-white border-[#00A082]" : "bg-white text-[#1D1D1D] border-[#E6E6E6]")}
                >Today</button>
                <button
                    onClick={() => setFilter('week')}
                    className={cn("px-5 py-2.5 rounded-full text-[14px] font-black transition-all border whitespace-nowrap", filter === 'week' ? "bg-[#00A082] text-white border-[#00A082]" : "bg-white text-[#1D1D1D] border-[#E6E6E6]")}
                >This Week</button>
            </div>

            {grouped.pending.length > 0 && (
                <div>
                    <h3 className="text-[16px] font-black text-[#1D1D1D] mb-3 ml-1">Pending ({grouped.pending.length})</h3>
                    {grouped.pending.map(renderCard)}
                </div>
            )}

            {grouped.accepted.length > 0 && (
                <div>
                    <h3 className="text-[16px] font-black text-[#1D1D1D] mb-3 ml-1">Accepted ({grouped.accepted.length})</h3>
                    {grouped.accepted.map(renderCard)}
                </div>
            )}

            {grouped.done.length > 0 && (
                <div>
                    <h3 className="text-[16px] font-black text-[#1D1D1D] mb-3 ml-1">Past / Done ({grouped.done.length})</h3>
                    {grouped.done.map(renderCard)}
                </div>
            )}

            {grouped.pending.length === 0 && grouped.accepted.length === 0 && grouped.done.length === 0 && (
                <div className="py-20 text-center">
                    <p className="text-[#6B6B6B] font-bold">No activity found for this filter.</p>
                </div>
            )}
        </div>
    );
}

// ── Calendar Tab Component ──────────────────────────────────────────────
function CalendarTab({ orders, onSelectOrder }: { orders: OrderDetails[], onSelectOrder: (o: OrderDetails) => void }) {
    const { t } = useLanguage();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null); // format: yyyy-MM-dd
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // Calendar grid logic
    const monthStart = startOfMonth(currentMonth);
    const daysInMonth = getDaysInMonth(currentMonth);
    const startOffset = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1; // 0=Mon, 6=Sun
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
        const d = addDays(monthStart, i);
        return {
            date: d,
            dateStr: format(d, 'yyyy-MM-dd'),
            dayNum: i + 1
        };
    });

    // Orders placed strictly in this month
    const validOrders = orders.filter(o => !(o.status as string)?.match(/cancelled|rejected/));

    const handlePrevMonth = () => setCurrentMonth(prev => addDays(startOfMonth(prev), -1));
    const handleNextMonth = () => setCurrentMonth(prev => addDays(endOfMonth(prev), 1));
    const handleToday = () => setCurrentMonth(new Date());

    const selectedOrders = useMemo(() => {
        if (!selectedDateStr) return [];
        return validOrders.filter(o => o.date === selectedDateStr);
    }, [selectedDateStr, validOrders]);

    return (
        <div className="pb-4 flex flex-col h-full bg-[#f8f8f8]">
            {/* Calendar Widget */}
            <div className="bg-white px-4 pb-6 border-b border-[#E6E6E6] shadow-sm flex-shrink-0">
                <div className="flex items-center justify-between py-4">
                    <button onClick={handlePrevMonth} className="px-3 py-1 bg-neutral-100 rounded-lg text-neutral-800 font-bold">Prev</button>
                    <h2 className="text-[18px] font-black uppercase text-[#1D1D1D] tracking-wider">{format(currentMonth, 'MMMM yyyy')}</h2>
                    <button onClick={handleNextMonth} className="px-3 py-1 bg-neutral-100 rounded-lg text-neutral-800 font-bold">Next</button>
                </div>

                <div className="grid grid-cols-7 gap-y-3 gap-x-1">
                    {/* Day labels */}
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                        <div key={i} className="text-center text-[12px] font-bold text-[#6B6B6B]">{d}</div>
                    ))}

                    {/* Empty offsets */}
                    {Array.from({ length: startOffset }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-10"></div>
                    ))}

                    {/* Day Cells */}
                    {daysArray.map(day => {
                        const isDayToday = day.dateStr === todayStr;
                        const isSelected = day.dateStr === selectedDateStr;
                        const dayOrders = validOrders.filter(o => o.date === day.dateStr);
                        const hasOrders = dayOrders.length > 0;
                        const isPastDate = new Date(day.dateStr).getTime() < startOfDay(new Date()).getTime();

                        // "represented by golden coins and Gone Days (silver coins)"
                        const isSilverCoin = hasOrders && isPastDate;
                        const isGoldenCoin = hasOrders && !isPastDate;

                        return (
                            <button
                                key={day.dateStr}
                                onClick={() => setSelectedDateStr(day.dateStr)}
                                className={cn(
                                    "flex flex-col items-center justify-center h-[46px] rounded-[14px] mx-0.5 relative transition-all outline-none",
                                    isSelected && !hasOrders ? "bg-[#1D1D1D] text-white" : "hover:bg-neutral-50",
                                    isGoldenCoin ? (isSelected ? "bg-[#FFC244] text-[#1D1D1D] shadow-[0_0_0_2px_#1D1D1D]" : "bg-[#FFC244] text-[#1D1D1D] shadow-[inset_0_-2px_0_rgba(200,150,0,0.4)]") : "",
                                    isSilverCoin ? (isSelected ? "bg-[#E6E6E6] text-[#1D1D1D] shadow-[0_0_0_2px_#1D1D1D]" : "bg-[#E6E6E6] text-[#6B6B6B] shadow-[inset_0_-2px_0_rgba(150,150,150,0.4)]") : ""
                                )}
                            >
                                <span className={cn(
                                    "text-[15px]",
                                    (isGoldenCoin || isSilverCoin || (isSelected && !hasOrders)) ? "font-black" : "font-bold",
                                    !isGoldenCoin && !isSilverCoin && !isSelected ? "text-[#1D1D1D]" : ""
                                )}>
                                    {day.dayNum}
                                </span>
                                {isDayToday && !isSelected && !isGoldenCoin && !isSilverCoin && (
                                    <div className="absolute bottom-1 w-1.5 h-1.5 bg-[#00A082] rounded-full" />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Day Time-Slots View */}
            <div className="flex-1 overflow-y-auto px-4 py-6 bg-[#f8f8f8]">
                {!selectedDateStr ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                        <CalendarIcon size={32} className="text-[#6B6B6B] mb-2" />
                        <p className="font-bold text-[#6B6B6B]">Select a day to view bookings.</p>
                    </div>
                ) : (
                    <div>
                        <h3 className="text-[18px] font-black text-[#1D1D1D] mb-4">
                            {format(new Date(selectedDateStr), 'EEEE, MMMM do')}
                        </h3>

                        {selectedOrders.length === 0 ? (
                            <div className="bg-white border-2 border-dashed border-[#E6E6E6] rounded-[20px] p-6 text-center">
                                <p className="font-bold text-[#6B6B6B]">No bookings on this day.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedOrders.map(order => (
                                    <motion.button
                                        key={order.id}
                                        onClick={() => onSelectOrder(order)}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full bg-[#00A082] text-left p-4 rounded-[16px] shadow-[0_4px_12px_rgba(0,160,130,0.15)] flex justify-between items-center"
                                    >
                                        <div className="flex flex-col">
                                            <span className="bg-white text-[#00A082] text-[12px] font-black px-2 py-0.5 rounded-md uppercase tracking-wide inline-flex w-max mb-2">
                                                {order.time || 'Flexible'} {order.duration ? `- ${order.duration}hr` : ''}
                                            </span>
                                            <span className="text-white text-[16px] font-black capitalize">{order.service}</span>
                                            <span className="text-white/80 text-[13px] font-bold mt-0.5 max-w-[200px] truncate">{order.bricolerName || 'Awaiting assignment'}</span>
                                        </div>
                                        <ChevronLeft className="text-white rotate-180" size={20} />
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
