"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
import { getServiceById, getSubServiceName, getServiceVector } from '@/config/services_config';
import { Job } from '@/app/provider/page';
import ProviderJobCard from './ProviderJobCard';

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

    // Filter orders for history (done and cancelled)
    const historyOrders = useMemo(() => {
        return confirmedOrders.filter(o => ['done', 'cancelled', 'delivered'].includes(o.status || ''))
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    }, [confirmedOrders]);

    const getHeroImage = (service: string) => {
        const serviceMap: Record<string, string> = {
            'cleaning': '/Images/Job Cards Images/Cleaning_job_card.webp',
            'electricity': '/Images/Job Cards Images/Electricity_job_card.webp',
            'plumbing': '/Images/Job Cards Images/Plumbing_job_card.webp',
            'painting': '/Images/Job Cards Images/Painting_job_card.webp',
            'handyman': '/Images/Job Cards Images/Handyman_job_card.webp',
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
                <p className="text-[14px] font-bold text-neutral-400 mt-1 capitalize">
                    {order.status === 'done' ? t({ en: 'Completed', fr: 'Terminée' }) : order.status}
                </p>
            </div>
        </motion.div>
    );

    return (
        <div className="flex flex-col h-full bg-[#FFFFFF] relative overflow-hidden">
            {/* TOP HEADER (Activity View Title) */}
            <div className="px-6 pt-8 pb-3 bg-white border-b border-[#E6E6E6] sticky top-0 z-[110]">
                <div className="flex items-center gap-6">
                    <div className="pb-3 text-[16px] transition-all relative font-black text-[#1D1D1D]">
                        {t({ en: 'Activity', fr: 'Activité', ar: 'النشاط' })}
                        <motion.div layoutId="bricoler-activity-tab" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#00A082] rounded-t-full" />
                    </div>
                </div>
            </div>

            {/* TOP MAP CONTAINER (Full viewport minus header if needed, but here absolute) */}
            <div className="absolute inset-x-0 bottom-0 top-[68px] z-0">
                <LiveOrdersMap
                    city={userData?.city || ''}
                    onSelectOrder={onSelectOrder}
                    language={language}
                    notificationsCount={notificationsCount}
                    onShowNotifications={onShowNotifications}
                    onInteractionStart={() => setIsMapDragging(true)}
                    onInteractionEnd={() => setIsMapDragging(false)}
                    triggerGps={triggerGps}
                    currentUserPin={{
                        avatarUrl: userData?.avatar || userData?.photoURL
                    }}
                    broadcastPins={availableJobs.map(job => ({
                        id: job.id,
                        lat: (job as any).locationDetails?.lat || 31.5085,
                        lng: (job as any).locationDetails?.lng || -9.7595,
                        price: job.price || 0,
                        rating: 5.0, 
                        serviceIcon: getServiceVector(job.serviceId || job.craft || ''),
                        isSelected: false
                    }))}
                />
            </div>

            {/* FLOATING GPS BUTTON */}
            <motion.button
                onClick={() => setTriggerGps(Date.now())}
                initial={{ bottom: '24px' }}
                animate={{
                    bottom: (availableJobs.length > 0 && !isMapDragging) ? '250px' : '102px'
                }}
                className="absolute right-6 w-12 h-12 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#374151] active:scale-95 transition-all z-[100]"
            >
                <Navigation size={22} strokeWidth={2.5} />
            </motion.button>

            {/* HORIZONTAL ORDERS LIST (At the bottom of the map) */}
            <div className="absolute bottom-10 left-0 right-0 z-10">
                <AnimatePresence>
                    {!isMapDragging && availableJobs.length > 0 && (
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="flex gap-4 overflow-x-auto px-6 pb-6 no-scrollbar snap-x snap-mandatory"
                        >
                            {availableJobs.map((job) => (
                                <div key={job.id} className="flex-none w-[320px] snap-center">
                                    <ProviderJobCard
                                        order={{
                                            ...job,
                                            service: job.serviceId || job.craft || '',
                                            totalPrice: Number(job.price)
                                        } as any}
                                        onSelect={() => onSelectOrder(job as any)}
                                        onConfirm={onConfirmJob}
                                        onRedistribute={onRedistributeJob}
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
