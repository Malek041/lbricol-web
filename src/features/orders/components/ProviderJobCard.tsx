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

    const timeLeft = getTimeRemaining(order);
    const progress = getProgress(order);

    const isOffer = order.status === 'waiting' || order.status === 'pending' || order.status === 'new' || order.status === 'negotiating';
    const isDone = order.status === 'done' || order.status === 'delivered';

    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(order)}
            className="bg-white rounded-[16px] p-4 flex items-start gap-4 cursor-pointer transition-all border border-transparent hover:border-neutral-100 shadow-sm w-full"
        >
            <div className="w-24 h-24 bg-[#F7F7F7] rounded-[16px] flex items-center justify-center flex-shrink-0 p-0 overflow-hidden">
                {order.images && order.images.length > 0 ? (
                    <img src={order.images[0]} className="w-full h-full object-cover" />
                ) : (
                    <img src={getServiceVector(order.service)} className="w-full h-full object-contain p-1" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                        "px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider",
                        isOffer ? "bg-amber-50 text-amber-600" : (isToday(parseISO(order.date || '')) && !isDone ? "bg-[#E6F7F4] text-[#00A082]" : (isDone ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"))
                    )}>
                        {isOffer ? t({ en: 'Active Offer', fr: 'Offre active' }) : (isDone ? t({ en: 'Delivered', fr: 'Livrée' }) : (isToday(parseISO(order.date || '')) ? t({ en: 'In Progress', fr: 'En cours' }) : t({ en: 'Scheduled', fr: 'Programmée' })))}
                    </span>
                    {order.providerConfirmed && (
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider bg-amber-50 text-amber-600">
                            {t({ en: 'Confirmed', fr: 'Confirmée' })}
                        </span>
                    )}
                </div>
                <h3 className="text-[17px] font-black text-black leading-tight">
                    {(() => {
                        const config = getServiceById(order.serviceId || order.service);
                        const stableBase = config ? config.name : formatServiceName(order.service);
                        const translatedBase = t({ en: stableBase, fr: stableBase });

                        const subDisplay = getSubServiceName(order.serviceId || order.service, order.subService || '') || order.subServiceDisplayName;
                        const translatedSub = subDisplay ? t({ en: subDisplay, fr: subDisplay }) : '';

                        return translatedSub ? `${translatedBase} › ${translatedSub}` : translatedBase;
                    })()}
                </h3>
                <div className="flex flex-col mt-1">
                    {order.service === 'car_rental' && order.date && order.carReturnDate ? (
                        <div className="flex flex-col gap-0.5 font-bold">
                            <div className="flex items-center gap-1.5 text-neutral-900">
                                <Clock size={12} strokeWidth={2.5} />
                                <span>{format(parseISO(order.date), 'MMM d')}</span>
                                <span className="opacity-30">|</span>
                                <span>{order.time?.split('-')[0] || '09:00'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-neutral-400 pl-4">
                                <span>{format(parseISO(order.carReturnDate), 'MMM d')}</span>
                                <span className="opacity-30">|</span>
                                <span>{order.carReturnTime?.split('-')[0] || '09:00'}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-neutral-500">
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
                    )}
                </div>

                <div className="flex items-center gap-1.5 mt-1">
                    <p className="text-[13px] font-medium text-neutral-400 truncate">
                        {order.clientName || t({ en: 'Client', fr: 'Client' })} • {order.city ? t({ en: order.city, fr: order.city }) : (order.location ? t({ en: order.location, fr: order.location }) : '')}
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
                {((order.status === 'programmed' || order.status === 'accepted') && !order.providerConfirmed) && (
                    <div className="mt-4 flex justify-end gap-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRedistribute?.(order);
                            }}
                            className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-all active:scale-90"
                        >
                            <RefreshCw size={18} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (order.id) onConfirm?.(order.id);
                            }}
                            className="w-10 h-10 rounded-full bg-[#00A082] text-white flex items-center justify-center shadow-md hover:bg-[#008f75] active:scale-95 transition-all"
                        >
                            <Check size={18} strokeWidth={3} />
                        </button>
                    </div>
                )}
                
                {/* MARKET JOBS ACTIONS (Confirm Button) */}
                {(order.status === 'new' || order.status === 'waiting') && !order.providerConfirmed && onConfirm && (
                     <div className="mt-4 flex justify-end">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (order.id) onConfirm?.(order.id);
                            }}
                            className="px-6 py-2 rounded-full bg-[#00A082] text-white text-[14px] font-black shadow-md hover:bg-[#008f75] active:scale-95 transition-all"
                        >
                            {t({ en: 'Confirm Mission', fr: 'Confirmer la mission' })}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
