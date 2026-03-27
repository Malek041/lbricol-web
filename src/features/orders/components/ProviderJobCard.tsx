"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Check, RefreshCw } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { getServiceById, getSubServiceName, getServiceVector } from '@/config/services_config';
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

    const getProgress = (order: OrderDetails) => {
        if (!order.date || !order.time) return 0;
        try {
            const normDate = normalizeToDate(order.date);
            if (!normDate) return 0;

            const timeStr = order.time.split('-')[0].trim();
            const dateStr = format(normDate, 'yyyy-MM-dd');
            const targetDate = parseISO(`${dateStr}T${timeStr}:00`);

            const diffMs = targetDate.getTime() - currentTime.getTime();

            // Progress represents the 24-hour lead-up to the start time.
            const totalWindowMs = 24 * 60 * 60 * 1000;

            if (diffMs <= 0) return 100; // Event starts or is in progress
            if (diffMs > totalWindowMs) return 0; // Way in the future, bar empty

            // As we get closer to 0 diffMs, progress goes from 0 to 100
            return Math.floor(((totalWindowMs - diffMs) / totalWindowMs) * 100);
        } catch (e) {
            return 0;
        }
    };

    const timeLeft = getTimeRemaining(order);
    const progress = getProgress(order);

    const isOffer = order.status === 'waiting' || order.status === 'pending' || order.status === 'new' || order.status === 'negotiating';
    const isDone = order.status === 'done' || order.status === 'delivered';

    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(order)}
            className="bg-white rounded-[5px] p-3 flex items-center gap-5 cursor-pointer transition-all border border-neutral-100 shadow-[0_2px_15px_rgba(0,0,0,0.03)] w-full"
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
                        isOffer ? "bg-amber-50 text-amber-600" : (isToday(normalizeToDate(order.date) || new Date()) && !isDone ? "bg-[#E6F7F4] text-[#219178]" : (isDone ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"))
                    )}>
                        {isOffer ? t({ en: 'Active Offer', fr: 'Offre active' }) : (isDone ? t({ en: 'Delivered', fr: 'Livrée' }) : (isToday(normalizeToDate(order.date) || new Date()) ? t({ en: 'In Progress', fr: 'En cours' }) : t({ en: 'Scheduled', fr: 'Programmée' })))}
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

                 {/* Time Row */}
                 <div className="flex items-baseline gap-2 mb-1">
                     <Clock size={15} strokeWidth={2.5} className="text-neutral-400 translate-y-0.5" />
                     <span className="text-[18px] font-black text-neutral-600 tracking-tight">
                         {order.time?.split('-')[0] || '09:00'}
                     </span>
                     {isDone && <Check size={16} className="text-emerald-500 ml-1" strokeWidth={3} />}
                 </div>
 
                 {/* Progress Bar & Actions Row */}
                 <div className="mt-4">
                     <div className="flex justify-between items-end mb-1">
                         <div className="text-[14px] font-bold text-neutral-300">
                              {order.clientName || t({ en: 'Client', fr: 'Client' })}
                         </div>
                         {timeLeft && !isDone && (
                             <span className="text-[12px] font-black text-[#219178] tracking-tight">
                                 ({timeLeft.replace(' left', t({ en: ' left', fr: ' restant' }))})
                             </span>
                         )}
                     </div>
                     <div className="flex items-center justify-between gap-4">
                         <div className="flex-1 h-[4px] bg-neutral-50 rounded-full overflow-hidden">
                             <motion.div
                                 initial={{ width: 0 }}
                                 animate={{ width: `${progress}%` }}
                                 transition={{ duration: 1.5, ease: "easeOut" }}
                                 className="h-full bg-[#219178] rounded-full relative overflow-hidden"
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
                                     className="w-10 h-10 rounded-full bg-[#219178] text-white flex items-center justify-center shadow-sm hover:bg-[#008f75] active:scale-95 transition-all"
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
                                 className="px-6 py-2.5 rounded-full bg-[#219178] text-white text-[13px] font-black shadow-[0_2px_10px_rgba(33,145,120,0.2)] hover:bg-[#008f75] active:scale-95 transition-all"
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
