import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Star, Calendar, MapPin, Clock } from 'lucide-react';
import { Job, MobileJobsViewItem } from '../types';
import { useLanguage } from '@/context/LanguageContext';

interface NewJobCardProps {
    job: MobileJobsViewItem;
    onClick: (job: MobileJobsViewItem) => void;
    onChat: (job: any) => void;
}

export const NewJobCard = ({ job, onClick, onChat }: NewJobCardProps) => {
    const { t } = useLanguage();
    const isNew = job.status === 'new';
    const isWaiting = job.status === 'waiting';
    const isDone = job.status === 'done';
    const isProgrammed = job.status === 'programmed';

    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => onClick(job)}
            className="bg-white rounded-[28px] p-4 flex items-center gap-4 border border-neutral-100 active:border-[#008C74]/20 transition-all cursor-pointer"
        >
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-100 flex-shrink-0">
                <img src={job.image || undefined} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-[17px] font-black text-neutral-900 truncate tracking-tight">{job.service}</h4>
                    <span className="text-[15px] font-black text-[#01A083] uppercase">{t({ en: 'MAD', fr: 'MAD' })} {job.priceLabel}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-400 text-[12px] font-bold">
                    <span className="truncate">{job.clientName}</span>
                    <span>•</span>
                    <span>{job.dateLabel} {job.timeLabel && (t({ en: 'at', fr: 'à', ar: 'على' }) + ` ${job.timeLabel}`)}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    {isNew && <span className="px-3 py-1 bg-red-50 text-red-500 text-[10px] font-black rounded-full uppercase">{t({ en: 'Action Required', fr: 'Action requise', ar: 'مهمة عاجلة' })}</span>}
                    {isWaiting && <span className="px-3 py-1 bg-amber-50 text-amber-500 text-[10px] font-black rounded-full uppercase">{t({ en: 'Waiting Client', fr: 'En attente du client', ar: 'في انتظار العميل' })}</span>}
                    {isProgrammed && <span className="px-3 py-1 bg-blue-50 text-blue-500 text-[10px] font-black rounded-full uppercase">{t({ en: 'Scheduled', fr: 'Programmée', ar: 'مبرمج' })}</span>}
                    {isDone && <span className="px-3 py-1 bg-emerald-50 text-emerald-500 text-[10px] font-black rounded-full uppercase">{t({ en: 'Completed', fr: 'Terminée', ar: 'مكتمل' })}</span>}

                    <div className="flex-1" />

                    {(isProgrammed || isWaiting || isDone) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onChat(job.rawAccepted || { id: job.id, clientName: job.clientName });
                            }}
                            className="w-9 h-9 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400 hover:text-[#01A083] transition-colors"
                        >
                            <MessageCircle size={18} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

interface JobCardProps {
    job: Job;
    isWaiting: boolean;
    isSubmitting: boolean;
    onAccept: (j: Job) => void;
    onCounter: (j: Job) => void;
    formatPrice: (p: any) => string;
    getJobDateTime: (d: any) => { dateLabel: string; timeLabel: string };
}

export const JobCard = ({ job, isWaiting, isSubmitting, onAccept, onCounter, formatPrice, getJobDateTime }: JobCardProps) => {
    const { t } = useLanguage();
    const cardPrice = formatPrice(job.basePrice || job.price);
    const { dateLabel, timeLabel } = getJobDateTime(job.date);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-[30px_18px_35px_22px] p-4 flex flex-col gap-4 transition-all mb-4 border-2 border-black/5 ${isWaiting ? 'border-[#4ADE80]' : ''}`}
        >
            <div className="flex items-center gap-4 w-full">
                <div className="w-28 h-28 bg-white rounded-[22px_15px_28px_18px] flex items-center justify-center flex-shrink-0 p-0 overflow-hidden border border-neutral-100">
                    {job.image || (job as any).rawAccepted?.images?.[0] ? (
                        <img src={job.image || (job as any).rawAccepted?.images?.[0]} className="w-full h-full object-cover" />
                    ) : (
                        <img src={"/Images/Vectors Illu/Tools.webp"} className="w-full h-full object-contain p-2 opacity-50" />
                    )}
                </div>
                <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-md uppercase tracking-wider bg-[#E6F7F4] text-[#01A083]">
                            {t({ en: 'New', fr: 'Nouveau', ar: 'جديد' })}
                        </span>
                    </div>

                    <h3 className="text-[17px] font-medium text-black leading-tight truncate">
                        {job.title || job.craft || (job as any).service || job.serviceId}
                    </h3>
                    <div className="mt-2 text-[14px] font-medium text-black leading-tight">
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-neutral-400 whitespace-nowrap">
                                <Calendar size={14} className="opacity-70" />
                                <span className="text-[14px] font-medium">
                                    {dateLabel}
                                </span>
                            </div>
                            <span className="text-neutral-200">|</span>
                            <p className="text-[18px] font-medium">
                                {timeLabel || '09:00'}
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                        <p className="text-[13px] font-medium text-neutral-400 flex items-center gap-1 truncate pr-2 flex-1">
                            <MapPin size={12} /> {job.city || 'Essaouira'}
                        </p>
                        <div className="text-right flex-shrink-0">
                            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">{t({ en: 'Offer', fr: 'Offre' })}</p>
                            <p className="text-[19px] font-bold text-black leading-none">
                                {cardPrice} <span className="text-[14px] font-medium text-neutral-500">MAD</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-4 border-t border-dashed border-neutral-100 w-full gap-3">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <div className="h-8 w-8 rounded-full overflow-hidden border border-neutral-200 flex-shrink-0">
                        {job.clientAvatar ? (
                            <img src={job.clientAvatar} alt={job.clientName} className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full bg-neutral-100 flex items-center justify-center text-neutral-500 font-bold text-xs">
                                {(job.clientName || 'C').slice(0, 1)}
                            </div>
                        )}
                    </div>
                    <div className="truncate min-w-0">
                        <div className="text-sm font-bold text-neutral-900 truncate">{job.clientName || 'Client'}</div>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500 truncate">
                            <Star size={10} className="fill-sky-400 text-sky-400 flex-shrink-0" />
                            <span className="flex-shrink-0">{job.rating || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onCounter(job)}
                        disabled={isWaiting}
                        className="px-4 py-2 bg-neutral-100 text-neutral-900 text-[13px] font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                        {t({ en: 'Counter', fr: 'Négocier', ar: 'عروض' })}
                    </button>
                    <button
                        onClick={() => onAccept(job)}
                        disabled={isSubmitting || isWaiting}
                        className="px-6 py-2 bg-[#01A083] text-white text-[14px] font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? '...' : t({ en: 'Accept', fr: 'Accepter', ar: 'قبول' })}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
