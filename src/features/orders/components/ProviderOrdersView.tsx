"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderDetails } from '@/features/orders/components/OrderCard';
import OrderCard from '@/features/orders/components/OrderCard';
import {
    ChevronLeft,
    Navigation,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import LiveOrdersMap from './LiveOrdersMap';
import { getServiceById, getSubServiceName, getServiceVector, getSubService } from '@/config/services_config';
import { Job } from '@/features/provider/types';
import ProviderJobCard from './ProviderJobCard';
import { format, parseISO, isValid } from 'date-fns';

const normalizeDate = (d: any): Date => {
    if (d instanceof Date) return d;
    if (d?.toDate && typeof d.toDate === 'function') return d.toDate();
    if (typeof d === 'string') {
        const parsed = parseISO(d);
        if (isValid(parsed)) return parsed;
        const native = new Date(d);
        if (isValid(native)) return native;
    }
    return new Date();
};

interface ProviderOrdersViewProps {
    confirmedOrders: OrderDetails[];
    availableJobs: Job[];
    onViewMessages: (jobId: string) => void;
    onSelectOrder: (order: OrderDetails) => void;
    userData: any;
    setUserData: React.Dispatch<React.SetStateAction<any>>;
    onConfirmJob?: (jobId: string) => void;
    onRedistributeJob?: (order: OrderDetails) => void;
    notificationsCount?: number;
    onShowNotifications?: () => void;
}

const formatServiceName = (name: string) => {
    if (!name) return '';
    return name
        .replace(/[_-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export default function ProviderOrdersView({
    confirmedOrders,
    availableJobs,
    onViewMessages,
    onSelectOrder,
    userData,
    setUserData,
    onConfirmJob,
    onRedistributeJob,
    notificationsCount,
    onShowNotifications
}: ProviderOrdersViewProps) {
    const { t, language } = useLanguage();
    const [showHistory, setShowHistory] = useState(false);
    const [isMapDragging, setIsMapDragging] = useState(false);
    const [triggerGps, setTriggerGps] = useState(0);
    const [currentTime, setCurrentTime] = useState(new Date());
    const prevJobsCountRef = useRef(availableJobs.length);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isFirstLoadRef = useRef(true);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const getDynamicStatus = (order: OrderDetails) => {
        if (!order.date || !order.time) return order.status;
        const autoStatuses = ['confirmed', 'accepted', 'programmed', 'pending', 'in_progress'];
        if (!autoStatuses.includes(order.status || '')) return order.status;

        try {
            const timeStr = order.time.split('-')[0].trim();
            const dateStr = format(normalizeDate(order.date), 'yyyy-MM-dd');
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
        if (typeof window !== 'undefined' && !audioRef.current) {
            audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            audioRef.current.preload = 'auto';
        }
    }, []);

    useEffect(() => {
        // Skip sound on initial empty->populated transition
        if (isFirstLoadRef.current) {
            if (availableJobs.length > 0) isFirstLoadRef.current = false;
            prevJobsCountRef.current = availableJobs.length;
            return;
        }

        if (availableJobs.length > prevJobsCountRef.current && audioRef.current) {
            // Only play if the increase is meaningful (new items added)
            audioRef.current.play().catch(() => {}); 
        }
        prevJobsCountRef.current = availableJobs.length;
    }, [availableJobs.length]);

    // Filter orders for history (done and cancelled)
    const historyOrders = useMemo(() => {
        return confirmedOrders.filter(o => {
            const status = getDynamicStatus(o);
            return ['done', 'cancelled', 'delivered'].includes(status || '');
        })
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [confirmedOrders, getDynamicStatus]);

    const getHeroImage = (service: string) => {
        const serviceMap: Record<string, string> = {
            'cleaning': '/Images/Job Cards Images/Cleaning_job_card.webp',
            'electricity': '/Images/Job Cards Images/Electricity_job_card.webp',
            'plumbing': '/Images/Job Cards Images/Plumbing_job_card.webp',
            'painting': '/Images/Job Cards Images/Painting_job_card.webp',
            'home_repairs': '/Images/Job Cards Images/Handyman_job_card.webp',
            'furniture_assembly': '/Images/Job Cards Images/Furniture_Assembly_job_card.webp',
            'moving': '/Images/Job Cards Images/Moving Help_job_card.webp',
            'private_driver': '/Images/Vectors Illu/BWCardirever.webp',
            'gardening': '/Images/Job Cards Images/Gardening_job_card.webp',
            'babysitting': '/Images/Job Cards Images/Babysetting_job_card.webp',
            'pool_cleaning': '/Images/Vectors Illu/Poolcleaning_VI.webp',
            'pets_care': '/Images/Vectors Illu/PetsCare_VI.webp',
            'errands': '/Images/Vectors Illu/Errands_VI.webp',
            'elderly_care': '/Images/Vectors Illu/ElderlyCare_VI.webp',
            'car_rental': '/Images/Cars.png',
        };
        return serviceMap[service] || '/Images/Job Cards Images/Handyman_job_card.webp';
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
                    {(() => {
                        const config = getServiceById(order.serviceId || order.service);
                        const stableBase = (config ? config.name : formatServiceName(order.service));
                        const translatedBase = t({ en: stableBase, fr: stableBase });

                        const subDisplay = getSubServiceName(order.serviceId || order.service, order.subService || '') || order.subServiceDisplayName;
                        const translatedSub = subDisplay ? t({ en: subDisplay, fr: subDisplay }) : '';

                        return translatedSub ? `${translatedBase} › ${translatedSub}` : translatedBase;
                    })()}
                </h3>
                <p className="text-[14px] font-medium text-neutral-400 mt-0.5 truncate">
                    {order.clientName || t({ en: 'Client', fr: 'Client' })} • {order.city ? t({ en: order.city, fr: order.city }) : (order.location ? t({ en: order.location, fr: order.location }) : '')}
                </p>
                <div className="flex items-center justify-between mt-1">
                    <p className="text-[12px] font-black text-[#01A083] bg-[#E6F7F4] px-2 py-0.5 rounded-lg shrink-0 capitalize">
                        {order.status === 'done' ? t({ en: 'Completed', fr: 'Terminée' }) : (order.status === 'delivered' ? t({ en: 'Delivered', fr: 'Livrée' }) : order.status)}
                    </p>
                    <p className="text-[12px] font-bold text-neutral-400">
                        {order.date ? format(normalizeDate(order.date), 'MMM d, yyyy') : ''}
                    </p>
                </div>
            </div>
        </motion.div>
    );

    const scrollRef = useRef<HTMLDivElement>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Scroll sync: When an order is selected (e.g. from map pin), scroll the list to it
    const handleSelectFromMap = (order: OrderDetails) => {
        setSelectedId(order.id || null);
        onSelectOrder(order);
        
        if (order.id && scrollRef.current) {
            const cardElement = document.getElementById(`job-card-${order.id}`);
            if (cardElement) {
                cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#FFFFFF] relative overflow-hidden">
            {/* TOP MAP CONTAINER */}
            <div className="absolute inset-x-0 bottom-0 top-0 z-0">
                <LiveOrdersMap
                    city={userData?.city || ''}
                    onSelectOrder={handleSelectFromMap}
                    language={language}
                    notificationsCount={notificationsCount}
                    onShowNotifications={onShowNotifications}
                    onInteractionStart={() => setIsMapDragging(true)}
                    onInteractionEnd={() => setIsMapDragging(false)}
                    triggerGps={triggerGps}
                    currentUserPin={{
                        avatarUrl: userData?.profilePhotoURL || userData?.avatar || userData?.photoURL
                    }}
                    broadcastPins={[
                        ...availableJobs.map(job => ({
                            id: job.id,
                            lat: (job as any).locationDetails?.lat || 31.5085,
                            lng: (job as any).locationDetails?.lng || -9.7595,
                            price: job.price || 0,
                            date: (job as any).date,
                            time: (job as any).time,
                            serviceIcon: getServiceVector(job.serviceId || job.craft || ''),
                            isSelected: selectedId === job.id,
                            isMarketplace: true
                        })),
                        ...confirmedOrders
                            .filter(o => {
                                const status = getDynamicStatus(o);
                                return ['programmed', 'accepted', 'in_progress', 'waiting', 'on_time'].includes(status || '');
                            })
                            .map(order => ({
                                id: order.id,
                                lat: (order as any).locationDetails?.lat || (order.coords?.lat) || 31.5085,
                                lng: (order as any).locationDetails?.lng || (order.coords?.lng) || -9.7595,
                                price: order.totalPrice || Number(order.price) || 0,
                                date: order.date,
                                time: order.time,
                                serviceIcon: getServiceVector(order.serviceId || order.service || ''),
                                isSelected: selectedId === order.id,
                                isConfirmed: true
                            }))
                    ]}
                    orderData={[
                        ...availableJobs,
                        ...confirmedOrders
                    ]}
                />
            </div>

            {/* FLOATING GPS BUTTON */}
            <motion.button
                onClick={() => setTriggerGps(Date.now())}
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 108px)' }}
                animate={{
                    y: (!isMapDragging && (availableJobs.length > 0 || confirmedOrders.some(o => ['programmed', 'accepted', 'in_progress', 'waiting'].includes(o.status || '')))) ? -210 : 0
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute right-6 w-12 h-12 bg-white rounded-full border border-neutral-100 flex items-center justify-center text-[#374151] active:scale-95 transition-colors z-[100] shadow-sm"
            >
                <Navigation size={22} strokeWidth={2.5} />
            </motion.button>

            {/* HORIZONTAL ORDERS LIST (At the bottom of the map) */}
            <div className="absolute bottom-[92px] left-0 right-0 z-10">
                <AnimatePresence>
                    {(!isMapDragging && (availableJobs.length > 0 || confirmedOrders.some(o => ['programmed', 'accepted', 'in_progress', 'waiting'].includes(o.status || '')))) && (
                        <motion.div
                            ref={scrollRef}
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="flex gap-4 overflow-x-auto px-6 pb-6 no-scrollbar snap-x snap-mandatory"
                        >
                            {/* Available Marketplace Jobs ONLY */}
                            {availableJobs.map((job) => (
                                <div key={job.id} id={`job-card-${job.id}`} className="flex-none w-[350px] snap-center">
                                    <ProviderJobCard
                                        order={{
                                            ...job,
                                            id: job.id,
                                            service: job.serviceId || job.craft || '',
                                            totalPrice: Number(job.price)
                                        } as any}
                                        onSelect={() => onSelectOrder(job as any)}
                                        onConfirm={onConfirmJob}
                                        onRedistribute={onRedistributeJob}
                                        currentTime={currentTime}
                                    />
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
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
                                            src="/Images/Vectors Illu/NoOrdersYet.webp"
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
