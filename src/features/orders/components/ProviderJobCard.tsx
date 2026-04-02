"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Check, RefreshCw, Calendar } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { getServiceById, getSubServiceName, getServiceVector, getSubService } from '@/config/services_config';
import { OrderDetails } from './OrderCard';

interface ProviderJobCardProps {
    order: OrderDetails;
    onSelect: (o: OrderDetails) => void;
    onConfirm?: (jobId: string) => void;
    onRedistribute?: (order: OrderDetails) => void;
    currentTime?: Date;
}

const formatServiceName = (name: string) => {
    if (!name) return '';
    return name
        .replace(/[_-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export default function ProviderJobCard({
    order,
    onSelect,
    onConfirm,
    onRedistribute,
    currentTime = new Date()
}: ProviderJobCardProps) {
    const { t } = useLanguage();

    const normalizeToDate = (d: any): Date | null => {
        if (!d) return null;
        if (d instanceof Date) return d;
        if (typeof d?.toDate === 'function') return d.toDate(); // Handle Firestore Timestamp
        if (typeof d === 'string') {
            const parsed = parseISO(d);
            return isNaN(parsed.getTime()) ? new Date(d) : parsed; // Fallback to native Date
        }
        return null;
    };

    const getTimeRemaining = (order: OrderDetails) => {
        if (!order.date || !order.time) return null;
        try {
            const normDate = normalizeToDate(order.date);
            if (!normDate) return null;

            const timeStr = order.time.split('-')[0].trim();
            const dateStr = format(normDate, 'yyyy-MM-dd');
            const targetDate = parseISO(`${dateStr}T${timeStr}:00`);

            const diffMs = targetDate.getTime() - currentTime.getTime();
            if (diffMs < 0) return null;

            const diffMins = Math.floor(diffMs / 60000);
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;

            if (hours > 24) return `${Math.floor(hours / 24)}d left`;
            if (hours > 0) return `${hours}h${mins}min left`;
            return `${mins}min left`;
        } catch (e) {
            return null;
        }
    };

    const getDynamicStatus = (order: OrderDetails) => {
        if (!order.date || !order.time) return order.status;

        const autoStatuses = ['confirmed', 'accepted', 'programmed', 'pending', 'in_progress'];
        if (!autoStatuses.includes(order.status || '')) return order.status;

        try {
            const normDate = normalizeToDate(order.date);
            if (!normDate) return order.status;

            const timeStr = order.time.split('-')[0].trim();
            const dateStr = format(normDate, 'yyyy-MM-dd');
            const startTime = parseISO(`${dateStr}T${timeStr}:00`).getTime();

            const now = currentTime.getTime();

            let durationHr = 2; 
            const subService = getSubService(order.service || '', order.subService || '');
            if (subService?.estimatedDurationHr) {
                durationHr = subService.estimatedDurationHr;
            }

            const endTime = startTime + (durationHr * 60 * 60 * 1000);

            if (now < startTime) return 'on_time';
            if (now >= startTime && now < endTime) return 'in_progress';
            if (now >= endTime) return 'done';

            return order.status;
        } catch (e) {
            return order.status;
        }
    };

    const timeLeft = getTimeRemaining(order);
    const dynamicStatus = getDynamicStatus(order);

    const isOffer = order.status === 'waiting' || order.status === 'pending' || order.status === 'new' || order.status === 'negotiating';
    const isDone = dynamicStatus === 'done' || order.status === 'done' || order.status === 'delivered';
    const isInProgress = dynamicStatus === 'in_progress';

    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(order)}
            className="bg-white rounded-[5px] p-3 flex items-center gap-5 cursor-pointer transition-all border border-neutral-100 w-full"
        >
            {/* Circular Service / Task Image */}
            <div className="w-[100px] h-[100px] bg-[#F7F7F7] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border border-neutral-50">
                {order.images && order.images.length > 0 ? (
                    <img src={order.images[0]} className="w-full h-full object-cover" />
                ) : (
                    <img src={getServiceVector(order.service)} className="w-[85%] h-[85%] object-contain" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                {/* Status Badge */}
                <div className="mb-1">
                    <span className={cn(
                        "px-2.5 py-0.5 text-[10px] font-black rounded-lg uppercase tracking-wider",
                        isOffer ? "bg-amber-50 text-amber-600" : (isInProgress ? "bg-[#E6F7F4] text-[#01A083]" : (isDone ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"))
                    )}>
                        {isOffer ? t({ en: 'Active Offer', fr: 'Offre active' }) : (isDone ? t({ en: 'Delivered', fr: 'Livrée' }) : (isInProgress ? t({ en: 'In Progress', fr: 'En cours' }) : t({ en: 'On time', fr: 'À l’heure' })))}
                    </span>
                </div>

                {/* Main Title (Subservice) */}
                <h3 className="text-[13px] font-black text-black leading-tight mb-1 tracking-tight">
                    {(() => {
                        const config = getServiceById(order.serviceId || order.service);
                        const subDisplay = getSubServiceName(order.serviceId || order.service, order.subService || '') || order.subServiceDisplayName;
                        const translatedSub = subDisplay ? t({ en: subDisplay, fr: subDisplay }) : '';

                        if (translatedSub) return translatedSub;
                        return config ? config.name : formatServiceName(order.service);
                    })()}
                </h3>

                 <div className="flex items-center gap-3 mb-1 flex-wrap">
                     <div className="flex items-baseline gap-1.5 ">
                        <Clock size={15} strokeWidth={2.5} className="text-neutral-400 translate-y-0.5" />
                        <span className="text-[18px] font-black text-neutral-600 tracking-tight">
                            {order.time?.split('-')[0] || '09:00'}
                        </span>
                     </div>
                     <div className="flex items-center gap-1.5 text-neutral-400 font-bold text-[13px]">
                        <Calendar size={14} strokeWidth={2.5} />
                        <span>{normalizeToDate(order.date) ? format(normalizeToDate(order.date)!, 'MMM d, yyyy') : '---'}</span>
                     </div>
                     {isDone && <Check size={16} className="text-emerald-500 ml-1" strokeWidth={3} />}
                 </div>
 
                 {/* Progress Bar & Actions Row */}
                 <div className="mt-4">
                     <div className="flex justify-between items-end mb-1">
                         <div className="text-[14px] font-bold text-neutral-300">
                              {order.clientName || t({ en: 'Client', fr: 'Client' })}
                         </div>
                         {timeLeft && !isDone && (
                             <span className="text-[12px] font-black text-[#01A083] tracking-tight">
                                 ({timeLeft.replace(' left', t({ en: ' left', fr: ' restant' }))})
                             </span>
                         )}
                     </div>
                     <div className="flex items-center justify-between gap-4">
                         <div className="flex-1 h-[4px] bg-neutral-50 rounded-full overflow-hidden">
                             <motion.div
                                 initial={{ width: 0 }}
                                 animate={{ width: `${isInProgress ? 100 : (isDone ? 100 : 0)}%` }}
                                 transition={{ duration: 1.5, ease: "easeOut" }}
                                 className="h-full bg-[#01A083] rounded-full relative overflow-hidden"
                             />
                         </div>
 
                         {/* Action Buttons */}
                         <div className="flex items-center gap-2 flex-shrink-0">
                         {((order.status === 'programmed' || order.status === 'accepted') && !order.providerConfirmed) && (
                             <>
                                 <button
                                     onClick={(e) => {
                                         e.stopPropagation();
                                         onRedistribute?.(order);
                                     }}
                                     className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 hover:bg-neutral-100 transition-all active:scale-90"
                                 >
                                     <RefreshCw size={18} strokeWidth={2.5} />
                                 </button>
                                 <button
                                     onClick={(e) => {
                                         e.stopPropagation();
                                         if (order.id) onConfirm?.(order.id);
                                     }}
                                     className="w-10 h-10 rounded-full bg-[#01A083] text-white flex items-center justify-center border border-[#008f75] hover:bg-[#008f75] active:scale-95 transition-all"
                                 >
                                     <Check size={18} strokeWidth={3} />
                                 </button>
                             </>
                         )}
                         {(order.status === 'new' || order.status === 'waiting') && !order.providerConfirmed && onConfirm && (
                             <button
                                 onClick={(e) => {
                                     e.stopPropagation();
                                     if (order.id) onConfirm?.(order.id);
                                 }}
                                 className="px-6 py-2.5 rounded-full bg-[#01A083] text-white text-[13px] font-black border border-[#008f75] hover:bg-[#008f75] active:scale-95 transition-all"
                             >
                                 {t({ en: 'Confirm Mission', fr: 'Confirmer la mission' })}
                             </button>
                         )}
                         </div>
                     </div>
                 </div>
             </div>
         </motion.div>
    );
}
