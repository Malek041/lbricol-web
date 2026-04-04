"use client";

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    MapPin,
    User,
    Star,
    Info,
    CheckCircle2,
    XCircle,
    DollarSign,
    Timer,
    ChevronLeft,
    MessageCircle,
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
    serviceName?: string; // Optional: name of the service for display
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
    providerAddress?: string;
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
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = React.useState<'details' | 'config'>('details');

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
    const breakdown = calculateOrderPrice(job.service, job.price || 80, job.details?.serviceDetails || job.details || {});

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[6000] bg-white flex flex-col h-screen overflow-hidden"
            >
                {/* Header (Sticky) */}
                <div className="flex-shrink-0 w-full pt-[48px] px-6 bg-white border-b border-neutral-50 sticky top-0 z-20">
                    <div className="flex items-center justify-between pb-4">
                        <button
                            onClick={onClose}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#01A083] active:scale-95 transition-all text-white"
                        >
                            <ChevronLeft size={28} />
                        </button>
                        <div className="text-right">
                            <span className="text-[11px] font-black text-neutral-300 uppercase tracking-widest block">
                                #{job.id?.slice(-6).toUpperCase()}
                            </span>
                        </div>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex border-b border-neutral-100">
                        {[
                            { id: 'details' as const, label: t({ en: 'Provider/Job', fr: 'Détails du Bricoleur' }) },
                            { id: 'config' as const, label: t({ en: 'Mission Config', fr: 'Configuration mission' }) }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex-1 py-4 text-[13px] font-black uppercase tracking-widest transition-all relative",
                                    activeTab === tab.id ? "text-[#01A083]" : "text-neutral-300"
                                )}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <motion.div 
                                        layoutId="tab-underline"
                                        className="absolute bottom-0 left-0 right-0 h-1 bg-[#01A083] rounded-t-full" 
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar pb-[250px]">
                    <div className="px-6">
                        {activeTab === 'details' ? (
                            <div className="pt-8">
                                {/* Hero Section */}
                                <div className="text-center mb-10">
                                    <div className="flex justify-center mb-6">
                                        <img
                                            src={job.service === 'car_rental' ? 
                                                (job.selectedCar?.modelImage || job.selectedCar?.image || "/Images/Vectors Illu/carKey.png") : 
                                                getServiceVector(job.service || '')
                                            }
                                            className="w-44 h-44 object-contain"
                                            alt="Service"
                                        />
                                    </div>
                                    <h2 className="text-[32px] font-black text-[#111827] mb-2 leading-tight tracking-tight">
                                        {job.serviceName || t({ en: 'Mission Details', fr: 'Détails de la mission' })}
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
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusConfig.color }} />
                                        {statusConfig.label}
                                     </div>
                                </div>

                                {/* Person Card (Provider or Client) */}
                                <section className="mb-10">
                                    <h3 className="text-[24px] font-black text-black mb-6 flex items-center gap-3">
                                        {t({ en: mode === 'provider' ? 'Customer' : 'Provider', fr: mode === 'provider' ? 'Client' : 'Prestataire' })} 
                                        <span className="text-2xl">{mode === 'provider' ? '👤' : '🛠️'}</span>
                                    </h3>
                                    <div className="bg-white rounded-[24px] p-6 border border-neutral-100 flex flex-col gap-6 shadow-sm">
                                        <div className="flex items-center gap-5">
                                            <div className="w-20 h-20 rounded-[24px] bg-neutral-50 flex-shrink-0 overflow-hidden relative border border-neutral-100">
                                                {((mode === 'provider' ? job.clientAvatar : job.bricolerAvatar)) ? (
                                                    <img src={(mode === 'provider' ? job.clientAvatar : job.bricolerAvatar)} className="w-full h-full object-cover" alt="User" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                                                        <User size={32} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-[22px] font-black text-black mb-1 leading-tight">
                                                    {(mode === 'provider' ? job.clientName : job.bricolerName)}
                                                </h4>
                                                <div className="flex items-center gap-1">
                                                    <Star size={16} fill="#FFC244" stroke="#FFC244" />
                                                    <span className="text-[15px] font-black text-black">
                                                        {(mode === 'provider' ? job.clientRating : job.bricolerRating)?.toFixed(1) || '5.0'}
                                                    </span>
                                                </div>
                                            </div>
                                            {isAdmin && (
                                                <button 
                                                    onClick={() => openWhatsApp((mode === 'provider' ? job.clientWhatsApp : job.bricolerWhatsApp) || '')}
                                                    className="w-14 h-14 rounded-2xl bg-[#25D366] flex items-center justify-center text-white active:scale-95 transition-all shadow-lg shadow-green-500/20"
                                                >
                                                    <WhatsAppBrandIcon className="w-7 h-7 fill-white" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* Instructions */}
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

                                {/* Work Photos */}
                                {((job.photos && job.photos.length > 0) || (job.images && job.images.length > 0)) && (
                                    <section className="mb-10">
                                        <h3 className="text-[24px] font-black text-black mb-6">
                                            {t({ en: 'Photos', fr: 'Photos du travail' })} <span className="text-2xl">📸</span>
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {(job.photos || job.images || []).map((url, i) => (
                                                <div key={i} className="aspect-square bg-white border border-neutral-100 rounded-[28px] overflow-hidden p-1 shadow-sm">
                                                    <img src={url} alt={`Task ${i}`} className="w-full h-full object-cover rounded-[24px]" />
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <div className="pt-2 pb-10 text-center">
                                    <button
                                        onClick={() => window.open('https://wa.me/212702814355', '_blank')}
                                        className="inline-flex items-center gap-2 text-[15px] font-black text-[#01A083] hover:underline uppercase tracking-wider"
                                    >
                                        <HelpCircle size={18} />
                                        {t({ en: 'Need help?', fr: 'Besoin d\'aide ?' })}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="pt-8">
                                {/* Configuration Tab Content */}
                                <h3 className="text-[24px] font-black text-[#111827] mb-8 flex items-center gap-3">
                                    {t({ en: 'Mission Config', fr: 'Configuration mission' })} <span className="text-2xl">⚙️</span>
                                </h3>

                                {/* Setup Details */}
                                <section className="mb-10">
                                    <div className="bg-[#F9FAFB] rounded-[24px] p-8 border border-neutral-100 space-y-4 shadow-sm">
                                        <div className="flex justify-between items-center pb-3 border-b border-neutral-200/50">
                                            <span className="text-[17px] font-bold text-neutral-400">{t({ en: 'Type', fr: 'Type' })}</span>
                                            <span className="text-[17px] font-black text-black">{job.serviceName || job.service}</span>
                                        </div>

                                        {(() => {
                                            const subId = (job as any).subService || (job as any).subServiceId || job.service || '';
                                            const details = job.details?.serviceDetails || job.details || {};
                                            const isHouseCleaning = ['standard_small', 'standard_large', 'family_home', 'deep_cleaning', 'hospitality_turnover'].includes(subId);
                                            const isOfficeCleaning = subId === 'office_cleaning';
                                            const isTvMounting = subId === 'tv_mounting';

                                            const currentBreakdown = calculateOrderPrice(
                                                subId,
                                                parseFloat(String(job.price || 80)),
                                                {
                                                    rooms: parseInt(String((job.details?.serviceDetails as any)?.rooms || 1)),
                                                    hours: parseFloat(String((job.details?.serviceDetails as any)?.taskDuration || 1)),
                                                    days: parseInt(String((job.details?.serviceDetails as any)?.days || 1)),
                                                    distanceKm: (job.details?.serviceDetails as any)?.deliveryDistanceKm || (job.details?.serviceDetails as any)?.distanceKm || 0,
                                                    deliveryDistanceKm: (job.details?.serviceDetails as any)?.deliveryDistanceKm || 0,
                                                    deliveryDurationMinutes: (job.details?.serviceDetails as any)?.deliveryDurationMinutes || 0,
                                                    propertyType: (job.details?.serviceDetails as any)?.propertyType,
                                                    tvCount: (job.details?.serviceDetails as any)?.tvCount,
                                                    mountTypes: (job.details?.serviceDetails as any)?.mountTypes,
                                                    wallMaterial: (job.details?.serviceDetails as any)?.wallMaterial,
                                                    liftingHelp: (job.details?.serviceDetails as any)?.liftingHelp,
                                                    mountingAddOns: (job.details?.serviceDetails as any)?.mountingAddOns,
                                                    taskSize: (job.details?.serviceDetails as any)?.taskSize,
                                                }
                                            );

                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F3F4F6', paddingBottom: 16 }}>
                                                        <span style={{ fontSize: 17, fontWeight: 500, color: '#6B7280' }}>{t({ en: 'Type', fr: 'Type', ar: 'النوع' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 600, color: '#111827', textAlign: 'right' }}>
                                                            {(() => {
                                                                const { getSubServiceName } = require('@/config/services_config');
                                                                const subName = getSubServiceName(job.service, subId);
                                                                return subName ? t({ en: subName, fr: subName, ar: subName }) : (job.serviceName || job.service);
                                                            })()}
                                                        </span>
                                                    </div>

                                                    {isHouseCleaning && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid #F3F4F6', paddingBottom: 16 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 17, fontWeight: 500, color: '#6B7280' }}>{t({ en: 'Place', fr: 'Lieu' })}</span>
                                                                <span style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>{details.propertyType || 'Studio'}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 17, fontWeight: 500, color: '#6B7280' }}>{t({ en: 'Rooms', fr: 'Pièces' })}</span>
                                                                <span style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>{details.rooms || 1}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isOfficeCleaning && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid #F3F4F6', paddingBottom: 16 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 17, fontWeight: 500, color: '#6B7280' }}>{t({ en: 'Desks', fr: 'Bureaux' })}</span>
                                                                <span style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>{details.officeDesks || 1}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 17, fontWeight: 500, color: '#6B7280' }}>{t({ en: 'Meeting Rooms', fr: 'Salles de réunion' })}</span>
                                                                <span style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>{details.officeMeetingRooms || 0}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 17, fontWeight: 500, color: '#6B7280' }}>{t({ en: 'Bathrooms', fr: 'Salles de bain' })}</span>
                                                                <span style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>{details.officeBathrooms || 0}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isTvMounting && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid #F3F4F6', paddingBottom: 16 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 17, fontWeight: 500, color: '#6B7280' }}>{t({ en: 'TV count', fr: 'Nombre de TV' })}</span>
                                                                <span style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>{details.tvCount || 1}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontSize: 17, fontWeight: 500, color: '#6B7280' }}>{t({ en: 'Wall', fr: 'Mur' })}</span>
                                                                <span style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>{details.wallMaterial}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <span style={{ fontSize: 17, fontWeight: 500, color: '#6B7280' }}>{t({ en: 'Base price', fr: 'Prix de base', ar: 'السعر الأساسي' })}</span>
                                                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>i</div>
                                                        </div>
                                                        <span style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>
                                                            {Math.round(currentBreakdown.basePrice)} MAD/{currentBreakdown.unit === 'unit' ? (t({ en: 'unit', fr: 'unité', ar: 'وحدة' })) : currentBreakdown.unit === 'day' ? (t({ en: 'day', fr: 'jour', ar: 'يوم' })) : currentBreakdown.unit === 'office' ? (t({ en: 'office', fr: 'bureau', ar: 'مكتب' })) : (t({ en: 'hr', fr: 'h', ar: 'ساعة' }))}
                                                        </span>
                                                    </div>

                                                    {currentBreakdown.details && currentBreakdown.details.map((detail: any, idx: number) => (
                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, borderLeft: '2px solid rgba(1, 160, 131, 0.2)' }}>
                                                            <span style={{ fontSize: 16, fontWeight: 600, color: '#6B7280' }}>{t(detail.label)}</span>
                                                            <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{detail.amount.toFixed(0)} MAD</span>
                                                        </div>
                                                    ))}

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <span style={{ fontSize: 17, fontWeight: 500, color: '#6B7280' }}>{t({ en: 'Services', fr: 'Services', ar: 'الخدمات' })}</span>
                                                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>i</div>
                                                        </div>
                                                        <span style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>{currentBreakdown.subtotal.toFixed(2)} MAD</span>
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <span style={{ fontSize: 17, fontWeight: 500, color: '#6B7280' }}>{t({ en: 'Lbricol Fee', fr: 'Frais Lbricol', ar: 'رسوم Lbricol' })}</span>
                                                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>i</div>
                                                        </div>
                                                        <span style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>{currentBreakdown.serviceFee.toFixed(2)} MAD</span>
                                                    </div>

                                                    {currentBreakdown.travelFee > 0 && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                    <span style={{ fontSize: 17, fontWeight: 500, color: '#6B7280' }}>{t({ en: 'Travel Fee', fr: 'Frais de déplacement', ar: 'رسوم التنقل' })}</span>
                                                                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>i</div>
                                                                </div>
                                                                <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', marginTop: 4 }}>
                                                                    {currentBreakdown.distanceKm?.toFixed(1)} km · ~{currentBreakdown.duration} min
                                                                </span>
                                                            </div>
                                                            <span style={{ fontSize: 17, fontWeight: 600, color: '#111827' }}>{currentBreakdown.travelFee.toFixed(2)} MAD</span>
                                                        </div>
                                                    )}

                                                    <div className="pt-6 border-t border-dashed border-neutral-200 flex justify-between items-center">
                                                        <span className="text-[18px] font-black text-black">{t({ en: mode === 'provider' ? 'Net Earnings' : 'Provider Gains', fr: mode === 'provider' ? 'Gains nets' : 'Gains Prestataire' })}</span>
                                                        <span className="text-[22px] font-[1000] text-[#01A083]">{(currentBreakdown.total - currentBreakdown.serviceFee).toFixed(2)} MAD</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </section>

                                {/* Location Summaries */}
                                <section className="mb-10">
                                    <h3 className="text-[24px] font-black text-[#111827] mb-6">
                                        {t({ en: 'Locations', fr: 'Emplacements' })} <span className="text-2xl">📍</span>
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {/* Pickup Location or User Location */}
                                        <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #F3F4F6', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <MapPin size={20} className="text-[#01A083]" />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                                                    {(job.service === 'errands' || job.service?.includes('delivery')) ? t({ en: 'Pickup Location', fr: 'Lieu d\'enlèvement', ar: 'موقع الاستلام' }) : t({ en: 'Client Location', fr: 'Position du Client', ar: 'موقعك' })}
                                                </div>
                                                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {typeof job.location === 'object' ? (job.location as any).address : job.location}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dropoff Location */}
                                        {(job.service === 'errands' || job.service?.includes('delivery')) && job.details?.serviceDetails?.dropoffAddress && (
                                            <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #F3F4F6', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <MapPin size={20} className="text-[#01A083]" />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{t({ en: 'Dropoff Location', fr: 'Lieu de dépôt', ar: 'موقع التسليم' })}</div>
                                                    <div style={{ fontSize: 15, fontWeight: 900, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {job.details.serviceDetails.dropoffAddress}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Bricoler Location */}
                                        {job.providerAddress && (
                                            <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #F3F4F6', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <MapPin size={20} className="text-[#01A083]" />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{t({ en: 'Bricoler Location', fr: 'Position du Bricoleur', ar: 'موقع العامل' })}</div>
                                                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                                                        {job.providerAddress || 'Essaouira, Morocco'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        )}
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
                                {mode === 'provider' ? t({ en: 'Your Net Earnings', fr: 'Gains Nets' }) : t({ en: 'Total Price', fr: 'Prix Total' })}
                            </span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-[44px] font-[1000] text-black leading-none tracking-tighter">
                                    {(mode === 'provider' ? (breakdown.total - breakdown.serviceFee) : breakdown.total).toFixed(2)}
                                </span>
                                <span className="text-[17px] font-black text-black uppercase">{t({ en: 'MAD', fr: 'MAD' })}</span>
                            </div>
                        </div>

                        {/* Action Plate */}
                        <div className="flex items-center gap-3">
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
