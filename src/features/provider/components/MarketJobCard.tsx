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
    const dotColors = isWaiting
        ? ['#4ADE80', '#86EFAC', '#DCFCE7']
        : ['#AFAFAF', '#D1D1D1', '#E7E7E7'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-[36px] border p-6 md:p-7 transition-all duration-300 ${isWaiting ? 'border-[3px] border-[#4ADE80]' : 'border-neutral-200'}`}
        >
            <div className="flex items-start justify-between gap-6">
                <h3
                    className="text-[32px] md:text-[56px] font-black text-neutral-900 leading-[0.95] tracking-tight max-w-[340px]"
                    style={{ fontFamily: 'Uber Move, var(--font-sans)' }}
                >
                    {job.title}
                </h3>
                <div className="flex items-center gap-3 pt-2">
                    {dotColors.map((color, idx) => (
                        <span key={`${color}-${idx}`} className="w-5 h-5 rounded-full" style={{ backgroundColor: color }} />
                    ))}
                </div>
            </div>

            <div className="mt-4 flex flex-col items-start gap-1">
                <span className="text-[32px] md:text-[54px] font-black tracking-tight text-[#BDBDBD] leading-none uppercase">{t({ en: 'MAD', fr: 'MAD', ar: 'درهم' })} {cardPrice}</span>
                <span className="text-[13px] font-bold text-neutral-400 uppercase tracking-widest">{t({ en: 'Estimated Payout', fr: 'Paiement estimé', ar: 'المبلغ المقدر' })}</span>
            </div>

            <div className="mt-4 flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 flex-shrink-0">
                    {job.clientAvatar ? (
                        <img src={job.clientAvatar || undefined} alt={job.clientName} className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-neutral-500 font-bold">
                            {(job.clientName || 'C').slice(0, 1)}
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-extrabold text-neutral-900 truncate">{job.clientName || 'Client'}</div>
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500">
                        <Star size={13} className="fill-black text-black" />
                        <span>{job.rating || 'N/A'}</span>
                        <span className="text-neutral-300">•</span>
                        <span className="truncate">{job.timestamp}</span>
                    </div>
                </div>
            </div>

            <div className="mt-4 space-y-2">
                <div className="flex items-center gap-3 text-[15px] md:text-[18px] text-neutral-500 font-semibold">
                    <Calendar size={20} className="text-neutral-400 md:w-[26px] md:h-[26px]" />
                    <span>{dateLabel}</span>
                    {timeLabel ? <span className="text-neutral-300">•</span> : null}
                    {timeLabel ? <Clock size={20} className="text-neutral-400 md:w-[26px] md:h-[26px]" /> : null}
                    {timeLabel ? <span>{timeLabel}</span> : null}
                </div>
                <div className="flex items-center gap-3 text-[15px] md:text-[17px] text-neutral-500 font-semibold">
                    <MapPin size={20} className="text-neutral-400 md:w-[26px] md:h-[26px]" />
                    <span>{job.city}</span>
                </div>
            </div>

            <div className="mt-4">
                <p className="text-[14px] md:text-[15px] leading-relaxed text-neutral-700 line-clamp-3">{job.description || t({ en: 'No description provided.', fr: 'Aucune description fournie.', ar: 'لا يوجد وصف متاح.' })}</p>
                <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-500">{job.craft}</div>
            </div>

            <div className="mt-8 flex items-center gap-3">
                <button
                    onClick={() => onAccept(job)}
                    disabled={isSubmitting || isWaiting}
                    className="px-7 md:px-9 py-3 md:py-3.5 bg-[#01A083] text-white text-[15px] md:text-[17px] font-bold rounded-full transition-all disabled:opacity-50"
                >
                    {isSubmitting ? '...' : t({ en: 'Accept', fr: 'Accepter', ar: 'قبول' })}
                </button>
                <button
                    onClick={() => onCounter(job)}
                    disabled={isWaiting}
                    className="px-7 md:px-9 py-3 md:py-3.5 bg-neutral-100 text-neutral-900 text-[15px] md:text-[17px] font-bold rounded-full transition-all disabled:opacity-50"
                >
                    {t({ en: 'Counter Offer', fr: 'Contre-offre', ar: 'عرض مقابل' })}
                </button>
            </div>
        </motion.div>
    );
};
