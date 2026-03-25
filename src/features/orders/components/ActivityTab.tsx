"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
    Clock, 
    Check, 
    RefreshCw, 
    ChevronLeft 
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { getServiceById, getSubServiceName, getServiceVector } from '@/config/services_config';
import { OrderDetails } from './OrderCard';
import ProviderJobCard from './ProviderJobCard';

interface ActivityTabProps {
    orders: OrderDetails[];
    onSelect: (o: OrderDetails) => void;
    onShowHistory: () => void;
    onConfirmJob?: (jobId: string) => void;
    onRedistributeJob?: (order: OrderDetails) => void;
    userData: any;
}

const formatServiceName = (name: string) => {
    if (!name) return '';
    return name
        .replace(/[_-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export default function ActivityTab({
    orders,
    onSelect,
    onShowHistory,
    onConfirmJob,
    onRedistributeJob,
    userData
}: ActivityTabProps) {
    const { t, language } = useLanguage();
    const [currentTime, setCurrentTime] = React.useState(new Date());

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
            const isAssigned = ['confirmed', 'accepted', 'programmed', 'pending'].includes(order.status || '');
            if (!isAssigned || !order.date) return false;

            try {
                const orderDate = parseISO(order.date);
                const isTodayJob = isToday(orderDate);

                if (isTodayJob) {
                    if (hasJobStarted(order.date as string, order.time as string)) return false;
                }
                return true;
            } catch (e) {
                return false;
            }
        });
    }, [orders, currentTime]);

    const pendingJobs = useMemo(() => {
        return orders.filter(order => {
            const isAssigned = ['confirmed', 'accepted', 'programmed', 'pending'].includes(order.status || '');
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
            return true;
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
        return (
            <div key={order.id || `order-${index}`} className="mb-4">
                <ProviderJobCard
                    order={order}
                    onSelect={onSelect}
                    onConfirm={onConfirmJob}
                    onRedistribute={onRedistributeJob}
                    currentTime={currentTime}
                />
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-10 p-6 pb-32 bg-[#FFFFFF]">
            <div className="space-y-4">
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
                            <img src="/Images/Vectors Illu/NewOrder.webp" className="w-28 h-28 object-contain grayscale opacity-40" />
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
                            <img src="/Images/Vectors Illu/DraftOrders2.webp" className="w-28 h-28 object-contain grayscale opacity-40" />
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
                                <img src="/Images/Vectors Illu/LocationFlag_VI.webp" className="w-20 h-20 object-contain" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-[#F2F2F2] rounded-[16px] p-6 flex items-center gap-5 mt-4">
                <div className="flex items-center justify-center flex-shrink-0">
                    <img src="/Images/Vectors Illu/OrdersHistory.webp" className="w-20 h-20 object-contain" />
                </div>
                <div className="flex flex-col">
                    <p className="text-[16px] font-light text-black leading-tight">{t({ en: 'Need to review past missions?', fr: 'Besoin de revoir vos missions passées ?' })}</p>
                    <button
                        onClick={onShowHistory}
                        className="text-[17px] font-black text-[#219178] mt-1 text-left decoration-[#219178] decoration-2 underline-offset-4 hover:underline"
                    >
                        {t({ en: 'Check my mission history', fr: 'Voir l’historique de mes missions' })}
                    </button>
                </div>
            </div>
        </div>
    );
}
