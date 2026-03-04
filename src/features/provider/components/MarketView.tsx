"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import radarAnimation from '../../../../public/Lottifiles Animation/Radar.json';
import { cn } from '@/lib/utils';
import { Shield, Hammer, X, RefreshCw, Check, MapPin } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { formatJobPrice, formatJobDate } from '@/lib/format';

interface MarketViewProps {
    jobs: any[];
    isLoading: boolean;
    providerCity: string;
    onAcceptJob: (job: any) => void;
    onCounterClick: (job: any) => void;
    onViewDetails: (job: any) => void;
    dismissedJobIds: string[];
    onDismissJob: (jobId: string) => void;
}

export default function MarketView({
    jobs,
    isLoading,
    providerCity,
    onAcceptJob,
    onCounterClick,
    onViewDetails,
    dismissedJobIds,
    onDismissJob
}: MarketViewProps) {
    const { t } = useLanguage();
    const [exitingCard, setExitingCard] = useState<{ id: string; direction: 'left' | 'right' } | null>(null);

    const stackedMobileJobs = useMemo(() => {
        return jobs.filter(j => !dismissedJobIds.includes(j.id));
    }, [jobs, dismissedJobIds]);

    const triggerCardExit = useCallback(
        (jobId: string, direction: 'left' | 'right', callback?: () => void) => {
            setExitingCard({ id: jobId, direction });
            setTimeout(() => {
                setExitingCard(null);
                callback?.();
            }, 380);
        },
        []
    );

    if (isLoading) {
        return <div className="p-10 text-center">Loading Market...</div>;
    }

    if (stackedMobileJobs.length === 0) {
        return (
            <div className="h-[480px] rounded-[30px] border border-neutral-100 bg-[#FCFCFC] flex flex-col items-center justify-center text-center px-8 relative overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                <div className="relative mb-8 flex items-center justify-center w-48 h-48 mx-auto -mt-8">
                    <Lottie animationData={radarAnimation} loop={true} />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2 relative z-10"
                >
                    <h3 className="text-[20px] font-black text-black tracking-tight" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                        {t({ en: 'Searching for jobs', fr: 'Recherche de missions' })}
                    </h3>
                    <p className="text-[13px] font-medium text-neutral-400 max-w-[200px] mx-auto leading-relaxed">
                        {t({ en: 'Looking for the best matches in', fr: 'Recherche des meilleures correspondances à' })} <span className="text-black font-bold">{providerCity || t({ en: 'your area', fr: 'votre zone' })}</span>...
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="relative h-[540px] w-full px-5 mt-4">
            {[...stackedMobileJobs].reverse().map((job, index, stack) => {
                const depth = stack.length - index - 1;
                const isTop = depth === 0;
                const isExiting = exitingCard?.id === job.id;

                return (
                    <motion.article
                        key={job.id || `stacked-${index}`}
                        onClick={() => !isExiting && onViewDetails(job)}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={isExiting
                            ? {
                                x: exitingCard?.direction === 'right' ? 420 : -420,
                                opacity: 0,
                                rotate: exitingCard?.direction === 'right' ? 18 : -18,
                                scale: 0.85,
                            }
                            : {
                                opacity: isTop ? 1 : 0.9,
                                scale: 1,
                                y: 0,
                                x: 0,
                                rotate: 0,
                            }
                        }
                        transition={isExiting
                            ? { duration: 0.36, ease: [0.32, 0, 0.67, 0] }
                            : { duration: 0.3, ease: 'easeOut' }
                        }
                        className={cn(
                            "absolute inset-x-5 top-0 bottom-4 cursor-pointer"
                        )}
                        style={{
                            zIndex: 20 - depth,
                            transformOrigin: 'bottom center',
                            transform: isTop
                                ? undefined
                                : `translate3d(-${14 * depth}px, ${6 * depth}px, 0) rotate(-${3 * depth}deg) scale(${1 - 0.04 * depth})`,
                            pointerEvents: isTop ? 'auto' : 'none'
                        }}
                    >
                        <div className="h-full rounded-[32px] overflow-hidden bg-white shadow-[0_6px_18px_rgba(0,0,0,0.09)] flex flex-col border border-neutral-100">
                            <div className="px-5 py-4 flex items-start justify-between gap-3 bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-200 border border-neutral-100">
                                        {job.clientAvatar ? (
                                            <img src={job.clientAvatar} alt={job.clientName} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-neutral-500 text-sm font-black bg-neutral-100">
                                                {job.clientName?.[0] || 'C'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate text-[15px] leading-tight font-black text-neutral-900">
                                            {job.clientName || 'Client'}
                                        </p>
                                        <p className="truncate text-[11px] font-medium text-neutral-500">{job.city}</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                                    {t({ en: 'New Mission', fr: 'Nouvelle mission' })}
                                </span>
                            </div>

                            <div className="relative h-[220px] bg-neutral-100 overflow-hidden">
                                <img src={job.image || '/Images/Job Cards Images/Handyman_job_card.png'} alt={job.service} className="h-full w-full object-cover" />
                            </div>

                            <div className="px-6 pt-5 pb-8 bg-white flex-1 flex flex-col justify-between">
                                <div>
                                    <h4 className="text-[32px] leading-[1.05] tracking-tight font-black text-black">
                                        {job.service || job.title}
                                    </h4>
                                    <p className="mt-1 text-[15px] font-medium text-neutral-500">{job.subServiceDisplayName || job.subService}</p>

                                    <div className="mt-6 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[14px] font-bold text-neutral-600">
                                            <span>{formatJobDate(job.date)}</span>
                                            {job.time && <>
                                                <span className="text-neutral-300">|</span>
                                                <span>{job.time}</span>
                                            </>}
                                        </div>
                                        <span className="text-[20px] font-black text-black uppercase">
                                            {formatJobPrice(job.basePrice || job.price)} MAD
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-between gap-4">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            triggerCardExit(job.id, 'left', () => onDismissJob(job.id));
                                        }}
                                        className="h-14 w-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-90"
                                    >
                                        <X size={24} strokeWidth={2.5} />
                                    </button>

                                    <div className="flex-1 flex gap-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCounterClick(job);
                                            }}
                                            className="flex-1 h-14 rounded-2xl bg-neutral-100 text-black font-black text-[14px] uppercase tracking-wider hover:bg-neutral-200 transition-all active:scale-[0.98]"
                                        >
                                            {t({ en: 'Counter', fr: 'Contre-offre' })}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                triggerCardExit(job.id, 'right', () => onAcceptJob(job));
                                            }}
                                            className="flex-[1.5] h-14 rounded-2xl bg-black text-white font-black text-[14px] uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-lg active:scale-[0.98]"
                                        >
                                            {t({ en: 'Accept', fr: 'Accepter' })}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.article>
                );
            })}
        </div>
    );
}
