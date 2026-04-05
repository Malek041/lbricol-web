"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Check, RefreshCw, Calendar, Navigation, MapPin } from 'lucide-react';
import { format, isToday, parseISO, differenceInMinutes } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { getServiceById, getSubServiceName, getServiceVector, getSubService } from '@/config/services_config';
import { OrderDetails } from './OrderCard';

interface ProviderJobCardProps {
    order: OrderDetails;
    onSelect: (o: OrderDetails) => void;
    onConfirm?: (jobId: string) => void;
    onRedistribute?: (order: OrderDetails) => void;
    onStatusUpdate?: (jobId: string, status: string, subStatus?: string) => void;
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
    onStatusUpdate,
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

            if (hours > 24) return `${Math.floor(hours / 24)}${t({ en: 'd left', fr: 'j restants', ar: 'يوم متبقي' })}`;
            if (hours > 0) return `${hours}h${mins}min ${t({ en: 'left', fr: 'restant', ar: 'متبقي' })}`;
            return `${mins}min ${t({ en: 'left', fr: 'restant', ar: 'متبقي' })}`;
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

    const isUrgent = (() => {
        if (isDone || !order.date || !order.time) return false;
        const normDate = normalizeToDate(order.date);
        if (!normDate) return false;
        const timeStr = order.time.split('-')[0].trim();
        const dateStr = format(normDate, 'yyyy-MM-dd');
        const startTime = parseISO(`${dateStr}T${timeStr}:00`);
        const diffMins = differenceInMinutes(startTime, currentTime);
        return diffMins > 0 && diffMins < 120; // Within 2 hours
    })();

    const handleNavigate = (e: React.MouseEvent) => {
        e.stopPropagation();
        const lat = order.locationDetails?.latitude || order.locationDetails?.lat;
        const lng = order.locationDetails?.longitude || order.locationDetails?.lng;
        
        if (lat && lng) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
        } else {
            const query = encodeURIComponent(`${order.area || ''} ${order.city || ''} Morocco`);
            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
        }
    };

    return (
        <motion.div
            key={order.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(order)}
            className="bg-white rounded-[30px_18px_35px_22px] p-4 flex flex-col gap-2 cursor-pointer transition-all border border-black/5 w-full relative overflow-hidden shadow-sm hover:shadow-md"
        >
            {isUrgent && (
                <div className="absolute top-[16px] xl:top-[20px] right-[16px] xl:right-[20px] p-2 z-10 w-fit">
                    <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                        <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="w-2 h-2 rounded-full bg-[#FFC244]"
                        />
                        <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider font-sans">{t({ en: 'Urgent', fr: 'Urgent', ar: 'عاجل' })}</span>
                    </div>
                </div>
            )}
            <div className="flex items-center gap-4 relative z-0">
                <div className="w-28 h-28 bg-white rounded-[22px_15px_28px_18px] flex items-center justify-center flex-shrink-0 p-0 overflow-hidden border border-neutral-100">
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
                            isOffer ? "bg-amber-50 text-amber-600" : (isInProgress ? "bg-[#E6F7F4] text-[#01A083]" : (isDone ? "bg-emerald-50 text-emerald-600" : (isUrgent ? 'bg-amber-50 text-amber-600' : "bg-blue-50 text-blue-600")))
                        )}>
                             {isOffer ? t({ en: 'Active Offer', fr: 'Offre active', ar: 'عرض نشط' }) : (isDone ? t({ en: 'Delivered', fr: 'Livrée', ar: 'تم التسليم' }) : (isInProgress ? t({ en: 'In Progress', fr: 'En cours', ar: 'قيد التنفيذ' }) : t({ en: 'On time', fr: 'À l’heure', ar: 'في الموعد' })))}
                        </span>
                    </div>

                    <h3 className="text-[17px] font-medium text-black leading-tight">
                        {(() => {
                            const config = getServiceById(order.serviceId || order.service);
                            const subDisplay = getSubServiceName(order.serviceId || order.service, order.subService || (order as any).subServiceId || '') || order.subServiceDisplayName;
                            const baseName = subDisplay ? t({ en: subDisplay, fr: subDisplay, ar: subDisplay }) : (config ? config.name : formatServiceName(order.service));
                            
                            const roomsCount = order.details?.serviceDetails?.rooms || order.details?.rooms;
                            if (order.service === 'cleaning' && roomsCount) {
                                return `${baseName} • ${roomsCount} ${roomsCount > 1 ? t({ en: 'Rooms', fr: 'Pièces', ar: 'غرف' }) : t({ en: 'Room', fr: 'Pièce', ar: 'غرفة' })}`;
                            }
                            return baseName;
                        })()}
                    </h3>
                    <div className="mt-2 text-[14px] font-medium text-black leading-tight">
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <div className="flex items-center gap-1 text-neutral-400 whitespace-nowrap">
                                    <Calendar size={14} className="opacity-70" />
                                    <span className="text-[14px] font-medium">
                                        {normalizeToDate(order.date) ? format(normalizeToDate(order.date)!, 'MMM d') : ''}
                                    </span>
                                </div>
                                <span className="text-neutral-200">|</span>
                                <p className="text-[18px] font-medium">
                                    {order.time?.split('-')[0] || '12:00'}
                                </p>
                                {timeLeft && (
                                    <span className={cn(
                                        "text-[14px] font-medium whitespace-nowrap pt-1",
                                        "text-[#01A083]"
                                    )}>
                                        {timeLeft}
                                    </span>
                                )}
                            </div>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                        <p className="text-[13px] font-medium text-neutral-400 truncate pr-2 flex-1">
                            {order.clientName || t({ en: 'Client', fr: 'Client', ar: 'عميل' })}
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
                                width: (() => {
                                    if (isDone) return '100%';
                                    // Calculate progress based on real timestamps
                                    try {
                                        const normDate = normalizeToDate(order.date);
                                        if (!normDate || !order.time) return isInProgress ? '50%' : '0%';
                                        const timeStr = order.time.split('-')[0].trim();
                                        const dateStr = format(normDate, 'yyyy-MM-dd');
                                        const startTime = parseISO(`${dateStr}T${timeStr}:00`).getTime();
                                        const now = currentTime.getTime();

                                        let durationHr = 2;
                                        const subService = getSubService(order.service || '', order.subService || '');
                                        if (subService?.estimatedDurationHr) durationHr = subService.estimatedDurationHr;
                                        const endTime = startTime + durationHr * 3600000;

                                        if (now >= endTime) return '100%';
                                        if (now >= startTime) {
                                            // In progress: % through the job
                                            const pct = Math.min(100, ((now - startTime) / (endTime - startTime)) * 100);
                                            return `${pct.toFixed(1)}%`;
                                        }
                                        // Upcoming: % of wait time elapsed from createdAt → startTime
                                        const createdAt = order.createdAt ? (typeof order.createdAt?.toDate === 'function' ? order.createdAt.toDate().getTime() : new Date(order.createdAt).getTime()) : null;
                                        if (createdAt && createdAt < startTime) {
                                            const pct = Math.min(95, Math.max(5, ((now - createdAt) / (startTime - createdAt)) * 100));
                                            return `${pct.toFixed(1)}%`;
                                        }
                                        return '5%';
                                    } catch(e) {
                                        return isInProgress ? '50%' : '5%';
                                    }
                                })(),
                                filter: isInProgress ? ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] : 'brightness(1)'
                            }}
                            transition={{
                                width: { duration: 1, ease: "easeOut" },
                                filter: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                            }}
                            className="h-full rounded-full bg-[#01A083]"
                        />
                    </div>
                </div>
            </div>

            {/* ACTION BUTTONS (Bricoler specific) */}
            <div className="flex items-center gap-2 mt-2 justify-end w-full border-t border-neutral-50 pt-2 relative z-10">
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
                            className="flex-1 py-2 h-10 rounded-full bg-[#01A083] text-white flex items-center justify-center font-bold border border-[#008f75] hover:bg-[#008f75] active:scale-95 transition-all text-[13px]"
                        >
                            {t({ en: 'Confirm Job', fr: 'Confirmer la mission', ar: 'تأكيد المهمة' })}
                        </button>
                    </>
                )}
                {(order.status === 'programmed' || order.status === 'accepted') && order.providerConfirmed && (
                    <div className="flex items-center gap-2 w-full justify-end">
                        {onStatusUpdate && !order.providerStatus && isUrgent && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (order.id) onStatusUpdate(order.id, 'in_progress', 'heading');
                                }}
                                className="flex-1 h-10 rounded-full bg-[#01A083] text-white text-[13px] font-black border border-[#008f75] hover:bg-[#008f75] active:scale-95 transition-all flex items-center justify-center gap-1.5"
                            >
                                <Navigation size={14} fill="currentColor" />
                                {t({ en: 'On My Way', fr: 'En chemin', ar: 'في الطريق' })}
                            </button>
                        )}
                        <button
                            onClick={handleNavigate}
                            className={cn(
                                "h-10 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-200 hover:bg-neutral-100 active:scale-95 transition-all",
                                (onStatusUpdate && !order.providerStatus && isUrgent) ? "w-10 text-neutral-600" : "flex-1 text-[#01A083] font-bold border-[#01A083]/20 gap-2 px-4"
                            )}
                        >
                            <Navigation size={18} strokeWidth={2.5} />
                            {(!onStatusUpdate || order.providerStatus || !isUrgent) && t({ en: 'Navigate', fr: 'Naviguer', ar: 'يتنقل' })}
                        </button>
                    </div>
                )}
                {(order.status === 'new' || order.status === 'waiting') && !order.providerConfirmed && onConfirm && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (order.id) onConfirm?.(order.id);
                        }}
                        className="flex-1 h-10 rounded-full bg-[#01A083] text-white text-[13px] font-black border border-[#008f75] hover:bg-[#008f75] active:scale-95 transition-all w-full"
                    >
                        {t({ en: 'Confirm Mission', fr: 'Confirmer la mission', ar: 'تأكيد المهمة' })}
                    </button>
                )}
            </div>
        </motion.div>
    );
}
