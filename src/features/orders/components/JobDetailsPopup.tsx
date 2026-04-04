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
    ArrowRight,
    ChevronLeft,
    Check,
    MessageCircle,
    Plus,
    Minus,
    Camera,
    CreditCard,
    MoreHorizontal,
    HelpCircle,
    Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import { useLanguage } from '@/context/LanguageContext';
import { format, parseISO } from 'date-fns';
import { WhatsAppBrandIcon } from '@/components/shared/WhatsAppIcon';
import { getServiceVector } from '@/config/services_config';
import { calculateOrderPrice } from '@/lib/pricing';

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

    const getStatusConfig = (status: any) => {
        const s = (status || '').toLowerCase();
        switch (s) {
            case 'new':
            case 'waiting':
            case 'pending':
            case 'matching':
                return { color: '#FF9500', bg: '#FFF9F0', icon: Timer, label: t({ en: 'PENDING', fr: 'EN ATTENTE', ar: 'قيد الانتظار' }) };
            case 'accepted':
            case 'confirmed':
            case 'on_time':
                return { color: '#34C759', bg: '#EBF9EE', icon: CheckCircle2, label: t({ en: 'ACCEPTED', fr: 'ACCEPTÉE', ar: 'مقبول' }) };
            case 'programmed':
                return { color: '#01A083', bg: '#F0FDF9', icon: Calendar, label: t({ en: 'PROGRAMMED', fr: 'PROGRAMMÉE', ar: 'مبرمج' }) };
            case 'in_progress':
                return { color: '#01A083', bg: '#F0FDF9', icon: Timer, label: t({ en: 'IN PROGRESS', fr: 'EN COURS', ar: 'قيد التنفيذ' }) };
            case 'declined':
            case 'rejected':
                return { color: '#FF3B30', bg: '#FFEBEA', icon: XCircle, label: t({ en: 'DECLINED', fr: 'REFUSÉE', ar: 'مرفوض' }) };
            case 'cancelled':
                return { color: '#FF3B30', bg: '#FFEBEA', icon: Ban, label: t({ en: 'CANCELLED', fr: 'ANNULÉE', ar: 'ملغى' }) };
            case 'completed':
            case 'done':
            case 'delivered':
                return { color: '#5856D6', bg: '#EEEBFF', icon: CheckCircle2, label: t({ en: 'COMPLETED', fr: 'TERMINÉE', ar: 'مكتمل' }) };
            case 'negotiating':
                return { color: '#007AFF', bg: '#E5F1FF', icon: DollarSign, label: t({ en: 'NEGOTIATING', fr: 'NÉGOCIATION', ar: 'تفاوض' }) };
            default:
                return { color: '#8E8E93', bg: '#F2F2F7', icon: Info, label: (status || 'UNKNOWN').toUpperCase() };
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

    // Standardize to the premium Client view design
    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[6000] bg-white flex flex-col h-screen overflow-hidden"
            >
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar pb-[250px]">
                    {/* Header: Back Button & ID */}
                    <div className="flex-shrink-0 w-full pt-[48px] pb-4 px-6 bg-white border-b border-neutral-50 sticky top-0 z-20">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={onClose}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#01A083] active:scale-95 transition-all text-white"
                            >
                                <ChevronLeft size={28} />
                            </button>
                            <div className="text-right">
                                <span className="text-[11px] font-black text-neutral-300 uppercase tracking-widest block">
                                    {t({ en: 'Order ID', fr: 'ID Commande', ar: 'رقم الطلب' })}
                                </span>
                                <span className="text-[17px] font-black text-black">
                                    #{job.id?.slice(-6).toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="px-6">
                        {/* Hero Image & Title Section */}
                        <div className="text-center mt-10 mb-10">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex justify-center mb-6"
                            >
                                <img
                                    src={job.service === 'car_rental' ? 
                                        (job.selectedCar?.modelImage || job.selectedCar?.image || "/Images/Vectors Illu/carKey.png") : 
                                        getServiceVector(job.service || '')
                                    }
                                    className="w-44 h-44 object-contain"
                                    alt="Service"
                                />
                            </motion.div>
                            <h2 className="text-[32px] font-black text-[#111827] mb-2 leading-tight tracking-tight">
                                {t({ en: 'Job Details', fr: 'Détails de la mission' })}
                            </h2>
                            <div className="text-[17px] font-bold text-neutral-400 flex items-center justify-center gap-2">
                                <span>{(() => {
                                    try { return format(parseISO(job.date), 'MMMM d, yyyy'); } 
                                    catch(e) { return job.date; }
                                })()}</span>
                                <span className="opacity-40">•</span>
                                <span>{job.time}</span>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex justify-center mb-10">
                            <div 
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-black tracking-wide border-2"
                                style={{ backgroundColor: statusConfig.bg, color: statusConfig.color, borderColor: statusConfig.color + '15' }}
                             >
                                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: statusConfig.color }} />
                                {statusConfig.label}
                             </div>
                        </div>

                        {/* Client Info Section */}
                        <section className="mb-10">
                            <h3 className="text-[24px] font-black text-black mb-6 flex items-center gap-3">
                                {t({ en: 'Customer', fr: 'Client' })} <span className="text-2xl">👤</span>
                            </h3>
                            <div className="bg-white rounded-[24px] p-6 border border-neutral-100 flex flex-col gap-6 shadow-sm">
                                <div className="flex items-center gap-5">
                                    <div className="w-20 h-20 rounded-[24px] bg-white flex-shrink-0 overflow-hidden relative border-2 border-white shadow-sm">
                                        {job.clientAvatar ? (
                                            <img src={job.clientAvatar} className="w-full h-full object-cover" alt="Client" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-neutral-50 text-neutral-300">
                                                <User size={32} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[22px] font-black text-black mb-1 leading-tight">{job.clientName}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex items-center gap-1">
                                                <Star size={16} fill="#FFC244" stroke="#FFC244" />
                                                <span className="text-[15px] font-black text-black">{job.clientRating?.toFixed(1) || '5.0'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                        <button 
                                            onClick={() => openWhatsApp(job.clientWhatsApp || '')}
                                            className="w-14 h-14 rounded-2xl bg-[#25D366] flex items-center justify-center text-white active:scale-95 transition-all shadow-lg shadow-green-500/20"
                                        >
                                            <WhatsAppBrandIcon className="w-7 h-7 fill-white" />
                                        </button>
                                    )}
                                </div>
                                {isAdmin && (
                                    <div className="pt-4 border-t border-neutral-50 flex flex-col gap-2">
                                        <p className="text-[11px] font-black text-neutral-300 uppercase tracking-widest">{t({ en: 'Client ID', fr: 'ID Client' })}</p>
                                        <p className="text-[13px] font-bold text-neutral-500 break-all">{job.id}</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Bricoler Info Section (Admin or Assigned) */}
                        {(isAdmin || job.bricolerId) && job.bricolerName && (
                             <section className="mb-10">
                             <h3 className="text-[24px] font-black text-black mb-6 flex items-center gap-3">
                                 {t({ en: 'Assigned Provider', fr: 'Prestataire Assigné' })} <span className="text-2xl">🛠️</span>
                             </h3>
                             <div className="bg-white rounded-[24px] p-6 border border-neutral-100 flex flex-col gap-6 shadow-sm">
                                 <div className="flex items-center gap-5">
                                     <div className="w-20 h-20 rounded-[24px] bg-white flex-shrink-0 overflow-hidden relative border-2 border-white shadow-sm">
                                         {job.bricolerAvatar ? (
                                             <img src={job.bricolerAvatar} className="w-full h-full object-cover" alt="Bricoler" />
                                         ) : (
                                             <div className="w-full h-full flex items-center justify-center bg-neutral-50 text-neutral-300">
                                                 <User size={32} />
                                             </div>
                                         )}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                         <h4 className="text-[22px] font-black text-black mb-1 leading-tight">{job.bricolerName}</h4>
                                         <div className="flex items-center gap-2 mt-1">
                                             <div className="flex items-center gap-1">
                                                 <Star size={16} fill="#FFC244" stroke="#FFC244" />
                                                 <span className="text-[15px] font-black text-black">{job.bricolerRating?.toFixed(1) || '5.0'}</span>
                                             </div>
                                         </div>
                                     </div>
                                     {isAdmin && (
                                         <button 
                                             onClick={() => openWhatsApp(job.bricolerWhatsApp || '')}
                                             className="w-14 h-14 rounded-2xl bg-[#25D366] flex items-center justify-center text-white active:scale-95 transition-all shadow-lg shadow-green-500/20"
                                         >
                                             <WhatsAppBrandIcon className="w-7 h-7 fill-white" />
                                         </button>
                                     )}
                                 </div>
                             </div>
                         </section>
                        )}

                        {/* Setup Summary Section */}
                        <section className="mb-10">
                            <h3 className="text-[24px] font-black text-black mb-6">
                                {t({ en: 'Financial Details', fr: 'Détails Financiers' })} <span className="text-2xl">💰</span>
                            </h3>
                            <div className="bg-white rounded-[24px] p-8 border border-neutral-100 space-y-6 shadow-sm">
                                {(() => {
                                    const breakdown = calculateOrderPrice(job.service, job.price || 80, job.details?.serviceDetails || job.details || {});
                                    const netEarnings = breakdown.total - breakdown.serviceFee;
                                    
                                    return (
                                        <>
                                            <div className="flex justify-between items-center text-neutral-500">
                                                <span className="text-[17px] font-bold">{t({ en: 'Base price', fr: 'Prix de base', ar: 'السعر الأساسي' })}</span>
                                                <span className="text-[17px] font-black text-black">
                                                    {breakdown.basePrice.toFixed(0)} MAD/{breakdown.unit === 'unit' ? (t({ en: 'unit', fr: 'unité', ar: 'وحدة' })) : breakdown.unit === 'day' ? (t({ en: 'day', fr: 'jour', ar: 'يوم' })) : breakdown.unit === 'office' ? (t({ en: 'office', fr: 'bureau', ar: 'مكتب' })) : (t({ en: 'hr', fr: 'h', ar: 'ساعة' }))}
                                                </span>
                                            </div>

                                            {breakdown.details && breakdown.details.map((detail: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center pl-4 border-l-2 border-[#01A083]/20 py-1">
                                                    <span className="text-[16px] font-bold text-neutral-500">{t(detail.label)}</span>
                                                    <span className="text-[16px] font-black text-black">{detail.amount.toFixed(0)} MAD</span>
                                                </div>
                                            ))}

                                            <div className="flex justify-between items-center text-neutral-500">
                                                <span className="text-[17px] font-bold">{t({ en: 'Services', fr: 'Services', ar: 'الخدمات' })} <span className="text-[14px] text-black/40 font-medium">({breakdown.quantity} {t({ en: breakdown.unit, fr: breakdown.unit, ar: breakdown.unit === 'unit' ? 'وحدة' : breakdown.unit === 'day' ? 'يوم' : breakdown.unit === 'room' ? 'غرفة' : breakdown.unit === 'office' ? 'مكتب' : 'ساعة' })}{breakdown.quantity > 1 && breakdown.unit !== 'hr' && breakdown.unit !== 'office' ? 's' : ''})</span></span>
                                                <span className="text-[17px] font-black text-black">{breakdown.subtotal.toFixed(2)} MAD</span>
                                            </div>
                                            
                                            <div className="flex justify-between items-center text-neutral-500">
                                                <span className="text-[17px] font-bold">{t({ en: 'Platform fee', fr: 'Frais plateforme' })}</span>
                                                <span className="text-[17px] font-black text-red-500">-{breakdown.serviceFee} MAD</span>
                                            </div>

                                            <div className="pt-6 border-t border-dashed border-neutral-200 flex justify-between items-center">
                                                <span className="text-[18px] font-black text-black">{t({ en: mode === 'provider' ? 'Your Net Earnings' : 'Provider Earnings', fr: mode === 'provider' ? 'Vos gains nets' : 'Gains Prestataire' })}</span>
                                                <span className="text-[22px] font-[1000] text-[#01A083]">{netEarnings.toFixed(2)} MAD</span>
                                            </div>
                                            
                                            <div className="pt-8 space-y-6 border-t border-neutral-100">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center flex-shrink-0 group hover:bg-[#FFC244]/10 transition-colors cursor-pointer"
                                                         onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location)}`, '_blank')}
                                                    >
                                                        <MapPin size={24} className="text-[#01A083]" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="text-[11px] font-black text-neutral-300 uppercase tracking-widest block mb-1">
                                                            {t({ en: 'Task Location', fr: 'Lieu de mission' })}
                                                        </span>
                                                        <p className="text-[16px] font-bold text-[#111827] leading-tight break-words">
                                                            {job.location}
                                                        </p>
                                                        {job.city && <p className="text-[13px] font-bold text-neutral-400 mt-1">{job.city}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </section>

                        {/* Description Section */}
                        {job.description && (
                            <section className="mb-10">
                                <h3 className="text-[24px] font-black text-black mb-6">
                                    {t({ en: 'Instructions', fr: 'Instructions' })} <span className="text-2xl">📝</span>
                                </h3>
                                <div className="bg-white rounded-[24px] p-8 border border-neutral-100 italic shadow-sm">
                                    <p className="text-[16px] font-bold text-neutral-500 leading-relaxed">
                                        "{job.description}"
                                    </p>
                                </div>
                            </section>
                        )}

                        {/* Attached Photos */}
                        {((job.photos && job.photos.length > 0) || (job.images && job.images.length > 0)) && (
                            <section className="mb-10">
                                <h3 className="text-[24px] font-black text-black mb-6">
                                    {t({ en: 'Work Photos', fr: 'Photos du travail' })} <span className="text-2xl">📸</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {(job.photos || job.images || []).map((url, i) => (
                                        <div key={i} className="aspect-square bg-white border border-neutral-100 rounded-[28px] overflow-hidden p-1">
                                            <img src={url} alt={`Task ${i}`} className="w-full h-full object-cover rounded-[24px]" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Admin Action Section */}
                        {isAdmin && (
                            <section className="mb-10 pt-6 border-t border-neutral-100">
                                <h3 className="text-[24px] font-black text-black mb-6 flex items-center gap-3">
                                    {t({ en: 'Admin Controls', fr: 'Contrôles Admin' })} <span className="text-2xl">⚙️</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        className="h-14 rounded-[18px] bg-red-50 text-red-600 font-black text-[14px] uppercase tracking-widest border border-red-100 active:scale-95 transition-all"
                                        onClick={() => {
                                            if (confirm('Cancel this order?')) {
                                                // Handle cancellation
                                            }
                                        }}
                                    >
                                        {t({ en: 'Cancel Order', fr: 'Annuler' })}
                                    </button>
                                    <button 
                                        className="h-14 rounded-[18px] bg-black text-white font-black text-[14px] uppercase tracking-widest active:scale-95 transition-all"
                                        onClick={() => {
                                            // Handle reassignment or status update
                                        }}
                                    >
                                        {t({ en: 'Mark Completed', fr: 'Terminer' })}
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* Help Link Footer */}
                        <div className="pt-2 pb-10 text-center">
                            <button
                                onClick={() => window.open('https://wa.me/212702814355', '_blank')}
                                className="inline-flex items-center gap-2 text-[15px] font-black text-[#01A083] hover:underline uppercase tracking-wider"
                            >
                                <HelpCircle size={18} />
                                {t({ en: 'Need help with this job?', fr: 'Besoin d\'aide pour cette mission ?' })}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Signature Footer with Total (Yellow Wave) */}
                <div className="fixed bottom-0 left-0 right-0 bg-[#FFC244] z-[4005] px-8 pt-12 pb-[calc(32px+env(safe-area-inset-bottom))]">
                    {/* Top Wave Effect */}
                    <div className="absolute top-[-35px] left-0 right-0 h-[35px] pointer-events-none overflow-hidden">
                        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full fill-[#FFC244] scale-[2.2] translate-y-[-10px]">
                            <path d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                        </svg>
                    </div>

                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[12px] font-black text-black uppercase tracking-[0.2em] mb-1 opacity-60">
                                {mode === 'provider' ? t({ en: 'Net Earnings', fr: 'Gains Nets' }) : t({ en: 'Total Price', fr: 'Prix Total' })}
                            </span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-[44px] font-[1000] text-black leading-none tracking-tighter">
                                    {(() => {
                                        const breakdown = calculateOrderPrice(job.service, job.price || 80, job.details?.serviceDetails || job.details || {});
                                        return mode === 'provider' ? (breakdown.total - breakdown.serviceFee).toFixed(2) : breakdown.total.toFixed(2);
                                    })()}
                                </span>
                                <span className="text-[17px] font-black text-black uppercase">{t({ en: 'MAD', fr: 'MAD' })}</span>
                            </div>
                        </div>

                        {/* Action Plate */}
                        <div className="flex items-center gap-3">
                            {/* Always show Chat if possible, even for new jobs to allow questions */}
                            {mode === 'provider' && (
                                <button
                                    onClick={() => onChat?.(job.id, job.bricolerId || '', job.bricolerName || job.clientName)}
                                    className="w-16 h-16 rounded-2xl bg-[#01A083] flex items-center justify-center text-white active:scale-95 transition-all shadow-lg shadow-[#01A083]/20"
                                >
                                    <MessageCircle size={32} />
                                </button>
                            )}

                            {job.status === 'new' && mode === 'provider' ? (
                                <button
                                    onClick={() => onAccept?.(job.id)}
                                    className="h-16 px-8 rounded-2xl bg-black text-white text-[15px] font-black active:scale-95 transition-all flex items-center justify-center uppercase tracking-widest"
                                >
                                    {t({ en: 'Accept', fr: 'Accepter' })}
                                </button>
                            ) : (
                                <button
                                    onClick={onClose}
                                    className="h-16 px-10 rounded-2xl bg-black text-white text-[15px] font-black active:scale-95 transition-all flex items-center justify-center uppercase tracking-widest"
                                >
                                    {t({ en: 'Close', fr: 'Fermer' })}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default JobDetailsPopup;
