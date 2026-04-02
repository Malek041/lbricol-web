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
    Briefcase,
    Timer,
    Truck,
    ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import { useLanguage } from '@/context/LanguageContext';
import { format, parseISO } from 'date-fns';
import { WhatsAppBrandIcon } from '@/components/shared/WhatsAppIcon';
import { getServiceVector } from '@/config/services_config';

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
    status: 'new' | 'accepted' | 'declined' | 'completed' | 'programmed' | 'waiting' | 'pending';
    description?: string;
    photos?: string[];
    images?: string[];
    bricolerId?: string;
    bricolerName?: string;
    bricolerAvatar?: string;
    bricolerRating?: number;
    clientAvatar?: string;
    bricolerWhatsApp?: string;
    clientWhatsApp?: string;
    selectedCar?: any;
    carReturnDate?: string;
    carReturnTime?: string;
    totalPrice?: number;
    movingVehicle?: string;
    recipientName?: string;
    pickupAddress?: string;
    dropoffAddress?: string;
    details?: any;
    city?: string;
}

interface JobDetailsPopupProps {
    job: JobDetails | null;
    onClose: () => void;
    onAccept?: (jobId: string) => void;
    onDecline?: (jobId: string) => void;
    isAdmin?: boolean;
    onChat?: (jobId: string, bricolerId: string, bricolerName: string) => void;
    mode?: 'client' | 'provider';
}

const JobDetailsPopup: React.FC<JobDetailsPopupProps> = ({ job, onClose, onAccept, onDecline, isAdmin, onChat, mode = 'client' }) => {
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

    const openWhatsApp = (number: string) => {
        if (!number) return;
        const cleanNumber = number.replace(/\D/g, '');
        const finalNumber = cleanNumber.startsWith('212') ? cleanNumber : `212${cleanNumber.startsWith('0') ? cleanNumber.slice(1) : cleanNumber}`;
        window.open(`https://wa.me/${finalNumber}`, '_blank');
    };

    if (!job) return null;

    const getStatusConfig = (status: JobDetails['status']) => {
        switch (status) {
            case 'new':
            case 'waiting':
            case 'pending':
                return { color: '#FF9500', bg: '#FFF9F0', icon: Timer, label: t({ en: 'PENDING', fr: 'EN ATTENTE', ar: 'قيد الانتظار' }) };
            case 'accepted':
                return { color: '#34C759', bg: '#EBF9EE', icon: CheckCircle2, label: t({ en: 'ACCEPTED', fr: 'ACCEPTÉE', ar: 'مقبول' }) };
            case 'programmed':
                return { color: '#01A083', bg: '#F0FDF9', icon: Calendar, label: t({ en: 'PROGRAMMED', fr: 'PROGRAMMÉE', ar: 'مبرمج' }) };
            case 'declined':
                return { color: '#FF3B30', bg: '#FFEBEA', icon: XCircle, label: t({ en: 'DECLINED', fr: 'REFUSÉE', ar: 'مرفوض' }) };
            case 'completed':
                return { color: '#5856D6', bg: '#EEEBFF', icon: CheckCircle2, label: t({ en: 'COMPLETED', fr: 'TERMINÉE', ar: 'مكتمل' }) };
            default:
                return { color: '#8E8E93', bg: '#F2F2F7', icon: Info, label: t({ en: 'UNKNOWN', fr: 'INCONNU', ar: 'غير معروف' }) };
        }
    };

    const statusConfig = getStatusConfig(job.status);

    const DetailItem = ({ icon: Icon, label, value, subValue }: { icon: any, label: string, value: string, subValue?: string }) => (
        <div className="flex items-start gap-4 py-4 border-b border-neutral-50 last:border-0">
            <div className="w-10 h-10 rounded-full border border-neutral-100 bg-[#F9FAFB] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={18} className="text-neutral-500" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-[17px] font-black text-[#111827] truncate leading-tight">{value}</p>
                {subValue && <p className="text-[12px] font-bold text-neutral-400 mt-0.5">{subValue}</p>}
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                    "fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex justify-center",
                    isMobile ? "items-end p-0" : "items-center p-6"
                )}
            >
                <motion.div
                    ref={popupRef}
                    initial={isMobile ? { y: '100%' } : { scale: 0.9, y: 20 }}
                    animate={isMobile ? { y: 0 } : { scale: 1, y: 0 }}
                    exit={isMobile ? { y: '100%' } : { scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    className={cn(
                        "bg-[#F9FAFB] w-full relative flex flex-col transition-all overflow-hidden",
                        isMobile ? "rounded-t-[40px] max-h-[96vh]" : "max-w-[500px] rounded-[32px] max-h-[90vh]"
                    )}
                >
                    {/* Header Bar */}
                    <div className="p-6 pb-0 flex items-center justify-between z-10 relative">
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black border border-neutral-100 active:scale-90 transition-all"
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>
                        <h2 className="text-[17px] font-black text-[#111827]">{t({ en: 'Order details', fr: 'Détails de commande' })}</h2>
                        <div className="w-10" /> {/* Spacer */}
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pt-4">
                        {/* Status Indicator */}
                        <div className="px-6 mb-8 flex justify-center">
                             <div 
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-black"
                                style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
                             >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig.color }} />
                                {statusConfig.label}
                             </div>
                        </div>

                        <div className="px-6 mb-10 flex justify-center">
                            <div className="bg-white p-6 rounded-[24px] border border-neutral-100 flex items-center gap-10 relative">
                                {/* From: Client */}
                                <div className="flex flex-col items-center gap-2 min-w-[100px]">
                                    <div className="w-[72px] h-[72px] rounded-full border-[3px] border-[#01A08315] p-1">
                                        <div className="w-full h-full rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center">
                                            {job.clientAvatar ? (
                                                <img src={job.clientAvatar} alt="Client" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={32} className="text-neutral-400" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[14px] font-black text-black leading-none mb-1">{job.clientName}</p>
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">Client</p>
                                    </div>
                                </div>

                                {/* Link Arrow */}
                                <div className="absolute left-1/2 top-[44px] -translate-x-1/2 w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center border border-white z-10">
                                    <ArrowRight size={16} className="text-neutral-400" />
                                </div>

                                {/* To: Bricoler */}
                                <div className="flex flex-col items-center gap-2 min-w-[100px]">
                                    <div className="w-[72px] h-[72px] rounded-full border-[3px] border-[#01A08315] p-1">
                                        <div className="w-full h-full rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center">
                                            {job.bricolerAvatar ? (
                                                <img src={job.bricolerAvatar} alt="Bricoler" className="w-full h-full object-cover" />
                                            ) : (
                                                <img src="/Images/DefaultAvatar.webp" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            <p className="text-[14px] font-black text-black leading-none">{job.bricolerName || t({ en: 'Searching...', fr: 'Recherche...' })}</p>
                                        </div>
                                        <div className="flex items-center justify-center gap-1">
                                            <Star size={10} fill="#FFC244" stroke="#FFC244" />
                                            <span className="text-[11px] font-black text-[#FFC244]">{job.bricolerRating?.toFixed(1) || '4.9'}</span>
                                            <span className="text-[11px] font-bold text-neutral-300 ml-1">· 1.2km</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Details List */}
                        <div className="px-6 mb-10">
                            <div className="bg-white rounded-[24px] border border-neutral-100 overflow-hidden px-5">
                                {/* Service */}
                                <DetailItem 
                                    icon={Briefcase} 
                                    label={t({ en: 'Service', fr: 'Service' })} 
                                    value={job.service}
                                    subValue={job.description}
                                />
                                
                                {/* Date & Time */}
                                <DetailItem 
                                    icon={Calendar} 
                                    label={t({ en: 'Scheduled', fr: 'Programmé' })} 
                                    value={(() => {
                                        try {
                                            return format(parseISO(job.date), 'EEEE, MMM d, yyyy');
                                        } catch(e) { return job.date; }
                                    })()}
                                    subValue={job.time}
                                />

                                {/* Location */}
                                <DetailItem 
                                    icon={MapPin} 
                                    label={t({ en: 'Address', fr: 'Adresse' })} 
                                    value={job.location || 'Essaouira'}
                                    subValue={job.city}
                                />

                                {/* Duration */}
                                <DetailItem 
                                    icon={Timer} 
                                    label={t({ en: 'Duration', fr: 'Durée' })} 
                                    value={job.duration || 'Flexible'}
                                />

                                {/* Delivery Specific User Request: "Who is delivering the order" */}
                                {job.recipientName && (
                                    <DetailItem 
                                        icon={Truck} 
                                        label={t({ en: 'Delivery for', fr: 'Livraison pour' })} 
                                        value={job.recipientName}
                                        subValue={job.dropoffAddress}
                                    />
                                )}

                                {/* Moving Specific */}
                                {job.movingVehicle && (
                                    <DetailItem 
                                        icon={Truck} 
                                        label={t({ en: 'Requested Transport', fr: 'Transport Demandé' })} 
                                        value={job.movingVehicle}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Photos Section */}
                        {((job.photos && job.photos.length > 0) || (job.images && job.images.length > 0)) && (
                            <div className="px-6 mb-10">
                                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3 ml-1">
                                    {t({ en: 'Work Photos', fr: 'Photos du travail' })}
                                </p>
                                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                    {(job.photos || job.images || []).map((url, i) => (
                                        <div key={i} className="w-24 h-24 rounded-2xl overflow-hidden border border-neutral-100 flex-shrink-0">
                                            <img src={url} alt="Task detail" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Payment / Pricing Wave Wrapper */}
                        <div className="bg-white pt-10 px-6 pb-20 relative">
                            <div className="absolute top-[-30px] left-0 right-0 h-8 pointer-events-none z-10">
                                <svg viewBox="0 0 1440 100" className="w-full h-full text-white fill-current">
                                    <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,100L1360,100C1280,100,1120,100,960,100C800,100,640,100,480,100C320,100,160,100,80,100L0,100Z" transform="scaleY(-1) translate(0, -100)"></path>
                                </svg>
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Standard Rate', fr: 'Tarif Standard' })}</p>
                                        <p className="text-[15px] font-bold text-neutral-500">{t({ en: 'Base Fee for task', fr: 'Frais de base' })}</p>
                                    </div>
                                    <p className="text-[17px] font-black text-black">{job.price} MAD</p>
                                </div>

                                {job.totalPrice && job.totalPrice > job.price && (
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Options', fr: 'Options' })}</p>
                                            <p className="text-[15px] font-bold text-neutral-500">{t({ en: 'Add-ons / Distance', fr: 'Options / Distance' })}</p>
                                        </div>
                                        <p className="text-[17px] font-black text-black">+{job.totalPrice - job.price} MAD</p>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-neutral-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Total Amount', fr: 'Montant Total' })}</p>
                                        <p className="text-[28px] font-black text-black leading-none">{job.totalPrice || job.price} MAD</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-[#F0FDF9] rounded-full border border-[#01A08322]">
                                            <DollarSign size={14} className="text-[#01A083]" />
                                            <span className="text-[12px] font-black text-[#01A083] uppercase">{t({ en: 'Unpaid', fr: 'Non payé' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-6 bg-white border-t border-neutral-100">
                        {job.status === 'new' && mode === 'provider' ? (
                            <div className="flex gap-4">
                                <button
                                    onClick={() => onDecline?.(job.id)}
                                    className="flex-1 py-5 rounded-[20px] bg-neutral-50 text-neutral-400 text-[15px] font-black hover:bg-neutral-100 active:scale-95 transition-all"
                                >
                                    {t({ en: 'Decline', fr: 'Refuser' })}
                                </button>
                                <button
                                    onClick={() => onAccept?.(job.id)}
                                    className="flex-[2] py-5 rounded-[20px] bg-[#01A083] text-white text-[15px] font-black hover:bg-[#008f75] active:scale-95 transition-all"
                                >
                                    {t({ en: 'Accept Mission', fr: 'Accepter Mission' })}
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {(job.bricolerWhatsApp || job.clientWhatsApp) && (
                                    <button
                                        onClick={() => openWhatsApp(job.bricolerWhatsApp || job.clientWhatsApp || '')}
                                        className="w-full py-5 bg-[#25D366] text-white rounded-[20px] text-[17px] font-black hover:bg-[#128C7E] active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        <WhatsAppBrandIcon size={24} fill="currentColor" />
                                        {t({ en: 'Chat on WhatsApp', fr: 'Discuter sur WhatsApp' })}
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="w-full py-5 bg-[#F3F4F6] text-neutral-900 rounded-[20px] text-[15px] font-black hover:bg-neutral-200 active:scale-95 transition-all"
                                >
                                    {t({ en: 'Back to Orders', fr: 'Retour aux Commandes' })}
                                </button>
                                {mode === 'client' && job.status === 'programmed' && (
                                     <button className="text-[13px] font-black text-red-500 uppercase tracking-tighter mt-2 opacity-60 hover:opacity-100 transition-opacity">
                                        Cancel Order
                                     </button>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default JobDetailsPopup;
