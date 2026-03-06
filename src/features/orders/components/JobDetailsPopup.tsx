"use client";

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Calendar,
    Clock,
    MapPin,
    User,
    Star,
    Info,
    CheckCircle2,
    XCircle,
    DollarSign,
    MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import { useLanguage } from '@/context/LanguageContext';

export interface JobDetails {
    id: string;
    service: string;
    clientName: string;
    clientRating: number;
    location: string;
    date: string;
    time: string;
    duration: string;
    price: number;
    status: 'new' | 'accepted' | 'declined' | 'completed';
    description?: string;
    photos?: string[];
    images?: string[];
    bricolerId?: string;
    bricolerName?: string;
}

interface JobDetailsPopupProps {
    job: JobDetails | null;
    onClose: () => void;
    onAccept?: (jobId: string) => void;
    onDecline?: (jobId: string) => void;
    isAdmin?: boolean;
    onChat?: (jobId: string, bricolerId: string, bricolerName: string) => void;
}

const JobDetailsPopup: React.FC<JobDetailsPopupProps> = ({ job, onClose, onAccept, onDecline, isAdmin, onChat }) => {
    const popupRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobileViewport(768);
    const { t } = useLanguage();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (job) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [job, onClose]);

    if (!job) return null;

    const getStatusConfig = (status: JobDetails['status']) => {
        switch (status) {
            case 'new':
                return { color: '#007AFF', bg: '#E5F1FF', icon: Info, label: t({ en: 'NEW', fr: 'NOUVEAU', ar: 'جديد' }) };
            case 'accepted':
                return { color: '#34C759', bg: '#EBF9EE', icon: CheckCircle2, label: t({ en: 'ACCEPTED', fr: 'ACCEPTÉE', ar: 'مقبول' }) };
            case 'declined':
                return { color: '#FF3B30', bg: '#FFEBEA', icon: XCircle, label: t({ en: 'DECLINED', fr: 'REFUSÉE', ar: 'مرفوض' }) };
            case 'completed':
                return { color: '#5856D6', bg: '#EEEBFF', icon: CheckCircle2, label: t({ en: 'COMPLETED', fr: 'TERMINÉE', ar: 'مكتمل' }) };
            default:
                return { color: '#8E8E93', bg: '#F2F2F7', icon: Info, label: t({ en: 'UNKNOWN', fr: 'INCONNU', ar: 'غير معروف' }) };
        }
    };

    const statusConfig = getStatusConfig(job.status);
    const StatusIcon = statusConfig.icon;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                    "fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000] flex justify-center",
                    isMobile ? "items-end p-0" : "items-center p-6"
                )}
            >
                <motion.div
                    ref={popupRef}
                    initial={isMobile ? { y: '100%' } : { scale: 0.9, y: 20 }}
                    animate={isMobile ? { y: 0 } : { scale: 1, y: 0 }}
                    exit={isMobile ? { y: '100%' } : { scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={cn(
                        "bg-white w-full shadow-2xl relative flex flex-col transition-all overflow-y-auto",
                        isMobile ? "rounded-t-[32px] max-h-[95vh]" : "max-w-[520px] rounded-2xl max-h-[90vh]"
                    )}
                >
                    {isMobile && (
                        <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mt-4 mb-2 flex-shrink-0" />
                    )}
                    {/* Close Button */}
                    <div className="absolute top-5 right-5 flex items-center gap-2 z-10">
                        {isAdmin && (
                            <button
                                onClick={() => onChat?.(job.id, job.bricolerId || '', job.bricolerName || 'Bricoler')}
                                className="w-10 h-10 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-colors"
                                title={t({ en: 'Chat with Client', fr: 'Chatter avec le client' })}
                            >
                                <MessageCircle size={20} className="text-[#00A082]" strokeWidth={2.5} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full hover:bg-neutral-100 flex items-center justify-center transition-colors"
                        >
                            <X size={20} className="text-neutral-900" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-8 pt-0">
                        {/* Status Badge */}
                        <div className="flex items-center gap-2 mb-4">
                            <div
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide"
                                style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                            >
                                <StatusIcon size={14} strokeWidth={3} />
                                {statusConfig.label}
                            </div>
                        </div>

                        {/* Job Title */}
                        <h2 className="text-3xl font-bold text-neutral-900 mb-6 leading-tight">
                            {job.service}
                        </h2>

                        {/* Date & Time */}
                        <div className="flex items-center gap-4 text-neutral-600 mb-6">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} />
                                <span className="text-sm font-semibold">{job.date}</span>
                            </div>
                            <span className="text-neutral-300">•</span>
                            <div className="flex items-center gap-2">
                                <Clock size={16} />
                                <span className="text-sm font-semibold">{job.time}</span>
                            </div>
                        </div>

                        {/* Client Info */}
                        <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl mb-6">
                            <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
                                <User size={24} className="text-neutral-500" />
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-neutral-900 text-base">{job.clientName}</div>
                                <div className="flex items-center gap-1 text-sm">
                                    <Star size={14} fill="#FFC244" stroke="#FFC244" />
                                    <span className="font-semibold text-neutral-900">{job.clientRating.toFixed(1)}</span>
                                    <span className="text-neutral-500 ml-1">{t({ en: '(Client)', fr: '(Client)', ar: '(عميل)' })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Budget Breakdown */}
                        <div className="mb-6">
                            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
                                {t({ en: 'Budget Breakdown', fr: 'Détail du budget', ar: 'تفاصيل الميزانية' })}
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-bold text-neutral-900">{job.price}</span>
                                <span className="text-xl font-semibold text-neutral-500">MAD</span>
                            </div>
                            <div className="text-sm text-neutral-500 mt-1">
                                {t({ en: `For ${job.duration}`, fr: `Pour ${job.duration}`, ar: `لمدة ${job.duration}` })}
                            </div>
                        </div>

                        {/* Additional Details */}
                        {job.description && (
                            <div className="mb-6">
                                <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
                                    {t({ en: 'Additional Details', fr: 'Détails supplémentaires', ar: 'تفاصيل إضافية' })}
                                </div>
                                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                                    <p className="text-sm text-neutral-700 italic">"{job.description}"</p>
                                </div>
                            </div>
                        )}

                        {/* Location */}
                        {job.location && (
                            <div className="flex items-center gap-2 text-neutral-600 mb-6">
                                <MapPin size={16} />
                                <span className="text-sm font-semibold">{job.location}</span>
                            </div>
                        )}

                        {/* Photos */}
                        {((job.photos && job.photos.length > 0) || (job.images && job.images.length > 0)) && (
                            <div className="mb-6">
                                <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
                                    {t({ en: `Photos (${(job.photos?.length || 0) + (job.images?.length || 0)})`, fr: `Photos (${(job.photos?.length || 0) + (job.images?.length || 0)})`, ar: `صور (${(job.photos?.length || 0) + (job.images?.length || 0)})` })}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[...(job.photos || []), ...(job.images || [])].map((photo, idx) => (
                                        <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-neutral-100">
                                            <img src={photo} alt={t({ en: `Photo ${idx + 1}`, fr: `Photo ${idx + 1}`, ar: `صورة ${idx + 1}` })} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {job.status === 'new' && (
                            <div className="space-y-3">
                                <button
                                    onClick={() => onAccept?.(job.id)}
                                    className="w-full py-4 bg-neutral-900 text-white rounded-xl font-bold text-base hover:bg-neutral-800 transition-all active:scale-[0.98]"
                                >
                                    {t({ en: 'Accept Job', fr: 'Accepter la mission', ar: 'قبول المهمة' })}
                                </button>
                                <button
                                    onClick={() => onDecline?.(job.id)}
                                    className="w-full py-4 bg-red-50 text-red-600 rounded-xl font-bold text-base hover:bg-red-100 transition-all active:scale-[0.98]"
                                >
                                    {t({ en: 'Decline', fr: 'Refuser', ar: 'رفض' })}
                                </button>
                            </div>
                        )}

                        {job.status === 'accepted' && (
                            <div className="space-y-3">
                                <button className="w-full py-4 bg-neutral-900 text-white rounded-xl font-bold text-base hover:bg-neutral-800 transition-all active:scale-[0.98]">
                                    {t({ en: 'Message Client', fr: 'Écrire au client', ar: 'مراسلة العميل' })}
                                </button>
                                <button className="w-full py-4 bg-neutral-100 text-neutral-900 rounded-xl font-bold text-base hover:bg-neutral-200 transition-all active:scale-[0.98]">
                                    {t({ en: 'View on Calendar', fr: 'Voir dans le calendrier', ar: 'عرض في التقويم' })}
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default JobDetailsPopup;
