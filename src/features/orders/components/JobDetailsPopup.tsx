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
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [job, onClose]);

    if (!job) return null;

    const breakdown = calculateOrderPrice(job.service, job.price || 80, job.details?.serviceDetails || job.details || {});

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[6000] bg-white flex flex-col h-screen overflow-hidden"
            >
                {/* Header */}
                <div className="flex-shrink-0 pt-[48px] px-6 bg-[#FFFFFF]">
                    <div className="flex items-center justify-between pb-4">
                        <button
                            onClick={onClose}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#01A083] active:scale-95 transition-all"
                        >
                            <ChevronLeft size={28} className="text-white" />
                        </button>
                        <div className="text-right">
                            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-widest block">
                                {t({ en: 'Job ID', fr: 'ID Mission', ar: 'رقم المهمة' })}
                            </span>
                            <span className="text-[17px] font-medium text-black">
                                #{job.id?.slice(-6).toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar pb-[200px]">
                    <div className="px-6">
                        {/* Hero Image & Title Section */}
                        <div className="text-center mt-8 mb-10">
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
                                    className="w-40 h-40 object-contain"
                                    alt="Service"
                                />
                            </motion.div>
                            <h2 className="text-[28px] font-medium text-black mb-2 tracking-tight">
                                {job.serviceName || t({ en: 'Mission Details', fr: 'Détails de la mission', ar: 'تفاصيل المهمة' })}
                            </h2>
                            <div className="text-[17px] font-medium text-neutral-500 flex items-center justify-center gap-2">
                                <span>{(() => {
                                    try { return format(parseISO(job.date), 'MMMM d, yyyy'); } 
                                    catch(e) { return job.date; }
                                })()}</span>
                                <span>•</span>
                                <span>{job.time || '09:00'}</span>
                            </div>
                        </div>

                        {/* Decorative Separator */}
                        <div className="mx-[-24px] mb-8 relative h-5 overflow-hidden">
                            <svg width="100%" height="20" viewBox="0 0 400 20" preserveAspectRatio="none">
                                <path d="M0 10 Q 5 0, 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10 T 110 10 T 120 10 T 130 10 T 140 10 T 150 10 T 160 10 T 170 10 T 180 10 T 190 10 T 200 10 T 210 10 T 220 10 T 230 10 T 240 10 T 250 10 T 260 10 T 270 10 T 280 10 T 290 10 T 300 10 T 310 10 T 320 10 T 330 10 T 340 10 T 350 10 T 360 10 T 370 10 T 380 10 T 390 10 T 400 10 V 20 H 0 Z" fill="#F9FAFB" />
                            </svg>
                        </div>

                        {/* Customer / Provider Details */}
                        <section className="mb-10">
                            <h3 className="text-[25px] font-medium text-black mb-6 flex items-center gap-3">
                                {t({ en: mode === 'provider' ? 'Customer' : 'Provider', fr: mode === 'provider' ? 'Client' : 'Prestataire', ar: mode === 'provider' ? 'عميل' : 'المزود' })} 
                                <span className="text-2xl">{mode === 'provider' ? '👤' : '👨‍🔧'}</span>
                            </h3>
                            <div className="bg-[#F9FAFB] rounded-[32px] p-4 sm:p-6 border border-neutral-100 flex flex-wrap items-center gap-4 sm:gap-6">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] bg-white flex-shrink-0 overflow-hidden relative border-2 border-white">
                                    <img
                                        src={(mode === 'provider' ? job.clientAvatar : job.bricolerAvatar) || "/Images/Vectors Illu/Avatar.png"}
                                        className="w-full h-full object-cover"
                                        alt="User"
                                    />
                                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#01A083] rounded-full border-2 border-white flex items-center justify-center">
                                        <CheckCircle2 size={10} className="text-white fill-white" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-[120px]">
                                    <h4 className="text-[20px] font-medium text-black mb-1 leading-tight">
                                        {(mode === 'provider' ? job.clientName : job.bricolerName)}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Star size={14} className="fill-yellow-400 text-yellow-400" />
                                            <span className="text-[14px] font-medium text-black">
                                                {(mode === 'provider' ? job.clientRating : job.bricolerRating)?.toFixed(1) || '5.0'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChat?.(job.id, job.bricolerId || '', job.bricolerName || job.clientName);
                                    }}
                                    className="w-14 h-14 rounded-[20px] bg-[#01A083] flex flex-shrink-0 items-center justify-center active:scale-90 transition-all "
                                >
                                    <MessageCircle size={28} className="text-white" />
                                </button>
                            </div>
                        </section>

                        {/* Setup Summary / Job Details */}
                        <section className="mb-10">
                            <h3 className="text-[25px] font-medium text-black mb-6">
                                {t({ en: 'Summary', fr: 'Résumé', ar: 'ملخص' })} <span className="text-2xl">📋</span>
                            </h3>

                            {/* Provider-only: Prominent schedule block */}
                            {mode === 'provider' && (
                                <div className="bg-[#F0FDF9] border border-[#01A083]/20 rounded-[20px] p-4 mb-4 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-[#01A083]/10 flex items-center justify-center flex-shrink-0">
                                        <Calendar size={22} className="text-[#01A083]" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[11px] font-bold text-[#01A083] uppercase tracking-wider mb-1">
                                            {t({ en: 'Scheduled for', fr: 'Prévu le', ar: 'موعد المهمة' })}
                                        </div>
                                        <div className="text-[18px] font-medium text-black">
                                            {(() => { try { return format(parseISO(job.date), 'MMMM d, yyyy'); } catch(e) { return job.date; } })()} &nbsp;·&nbsp; {job.time || '09:00'}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className=" bg-[#F9FAFB] rounded-[20px] p-4 space-y-6">
                                {(() => {
                                    const subId = ((job as any).subService || (job as any).subServiceId || (job as any).serviceType || job.service || 'car_rental');
                                    const details = job.details?.serviceDetails || job.details || {};
                                    const isHouseCleaning = ['standard_small', 'standard_large', 'family_home', 'deep_cleaning', 'hospitality_turnover'].includes(subId);
                                    const isOfficeCleaning = subId === 'office_cleaning';
                                    const isTvMounting = subId === 'tv_mounting';

                                    const currentBreakdown = calculateOrderPrice(
                                        subId,
                                        parseFloat(String(job.price || '80')),
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
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e4e4ff', paddingBottom: 16 }}>
                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Type', fr: 'Type', ar: 'النوع' })}</span>
                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#111827', textAlign: 'right' }}>
                                                    {(() => {
                                                        const { getSubServiceName } = require('@/config/services_config');
                                                        const subName = getSubServiceName(job.service, subId);
                                                        return subName ? t({ en: subName, fr: subName, ar: subName }) : (job.serviceName || job.service);
                                                    })()}
                                                </span>
                                            </div>

                                            {isHouseCleaning && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid #e4e4e4ff', paddingBottom: 16 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Place', fr: 'Lieu', ar: 'المكان' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{details.propertyType || 'Studio'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Rooms', fr: 'Pièces', ar: 'الغرف' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{details.rooms || 1}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {isOfficeCleaning && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid #e4e4e4ff', paddingBottom: 16 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Desks', fr: 'Bureaux', ar: 'المكاتب' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{details.officeDesks || 1}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Meeting Rooms', fr: 'Salles de réunion', ar: 'قاعات الاجتماعات' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{details.officeMeetingRooms || 0}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Bathrooms', fr: 'Salles de bain', ar: 'الحمامات' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{details.officeBathrooms || 0}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {isTvMounting && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid #e4e4e4ff', paddingBottom: 16 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'TV count', fr: 'Nombre de TV', ar: 'عدد التلفازات' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{details.tvCount || 1}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Wall', fr: 'Mur', ar: 'الجدار' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{details.wallMaterial}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Estimated Duration row - provider insight */}
                                            {mode === 'provider' && (() => {
                                                const { getSubService: getSubSvc } = require('@/config/services_config');
                                                const sub = getSubSvc(job.service || '', subId);
                                                const durHr = details.taskDuration || sub?.estimatedDurationHr;
                                                if (!durHr) return null;
                                                return (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e4e4e4ff', paddingBottom: 16 }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Est. Duration', fr: 'Durée estimée', ar: 'المدة التقديرية' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 500, color: '#01A083' }}>{durHr}h</span>
                                                    </div>
                                                );
                                            })()}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Base price', fr: 'Prix de base', ar: 'السعر الأساسي' })}</span>
                                                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 350 }}>i</div>
                                                </div>
                                                <span style={{ fontSize: 17, fontWeight: 450, color: '#111827' }}>
                                                    {Math.round(currentBreakdown.basePrice)} MAD/{currentBreakdown.unit === 'unit' ? (t({ en: 'unit', fr: 'unité', ar: 'وحدة' })) : currentBreakdown.unit === 'day' ? (t({ en: 'day', fr: 'jour', ar: 'يوم' })) : currentBreakdown.unit === 'office' ? (t({ en: 'office', fr: 'bureau', ar: 'مكتب' })) : (t({ en: 'hr', fr: 'h', ar: 'ساعة' }))}
                                                </span>
                                            </div>

                                            {currentBreakdown.details && currentBreakdown.details.map((detail: any, idx: number) => (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, borderLeft: '2px solid rgba(1, 160, 131, 0.2)' }}>
                                                    <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t(detail.label)}</span>
                                                    <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{detail.amount.toFixed(0)} MAD</span>
                                                </div>
                                            ))}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Services', fr: 'Services', ar: 'الخدمات' })}</span>
                                                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 350 }}>i</div>
                                                </div>
                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{currentBreakdown.subtotal.toFixed(2)} MAD</span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Lbricol Fee', fr: 'Frais Lbricol', ar: 'رسوم Lbricol' })}</span>
                                                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 350 }}>i</div>
                                                </div>
                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{currentBreakdown.serviceFee.toFixed(2)} MAD</span>
                                            </div>

                                            {currentBreakdown.travelFee > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Travel Fee', fr: 'Frais de déplacement', ar: 'رسوم التنقل' })}</span>
                                                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 350 }}>i</div>
                                                        </div>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#9CA3AF', marginTop: 4 }}>
                                                            {currentBreakdown.distanceKm?.toFixed(1)} km · ~{currentBreakdown.duration} min
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: 17, fontWeight: 350, color: '#111827' }}>{currentBreakdown.travelFee.toFixed(2)} MAD</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </section>

                        {/* Location Summaries */}
                        <section className="mb-10">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {/* Pickup Location or User Location */}
                                <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #F3F4F6', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <MapPin size={20} className="text-[#01A083]" />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                                            {(job.service === 'errands' || job.service?.includes('delivery')) ? t({ en: 'Pickup Location', fr: 'Lieu d\'enlèvement', ar: 'موقع الاستلام' }) : t({ en: 'Client Location', fr: 'Position du Client', ar: 'موقع العميل' })}
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
                            </div>
                        </section>

                        {/* Description Card */}
                        {job.description && (
                            <section className="mb-10">
                                <h3 className="text-[25px] font-medium text-black mb-6">
                                    {t({ en: 'Description', fr: 'Description', ar: 'الوصف' })} <span className="text-2xl">📝</span>
                                </h3>
                                <div className="bg-[#F9FAFB] rounded-[32px] p-8 border border-neutral-100">
                                    <p className="text-[16px] font-medium text-neutral-600 leading-relaxed italic">
                                        "{job.description}"
                                    </p>
                                </div>
                            </section>
                        )}

                        {/* Provider-only: task-specific notes from client */}
                        {mode === 'provider' && (job as any).notes && (
                            <section className="mb-10">
                                <h3 className="text-[25px] font-medium text-black mb-6">
                                    {t({ en: 'Client Notes', fr: 'Notes du Client', ar: 'ملاحظات العميل' })} <span className="text-2xl">💬</span>
                                </h3>
                                <div className="bg-amber-50 rounded-[20px] p-5 border border-amber-100">
                                    <p className="text-[15px] font-medium text-amber-900 leading-relaxed">
                                        {(job as any).notes}
                                    </p>
                                </div>
                            </section>
                        )}

                        {/* Attached Photos */}
                        {((job.photos && job.photos.length > 0) || (job.images && job.images.length > 0)) && (
                            <section className="mb-10">
                                <h3 className="text-[25px] font-medium text-black mb-6">
                                    {t({ en: 'Attached Photos', fr: 'Photos Jointes', ar: 'الصور المرفقة' })} <span className="text-2xl">📸</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {(job.photos || job.images || []).map((url, i) => (
                                        <div key={i} className="aspect-square bg-neutral-100 rounded-[12px] overflow-hidden border border-neutral-100/50 group relative">
                                            <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        
                        <div className="pt-2 pb-10 text-center">
                            <button
                                onClick={() => window.open('https://wa.me/212702814355', '_blank')}
                                className="inline-flex items-center gap-2 text-[15px] font-medium text-[#01A083] hover:underline"
                            >
                                <HelpCircle size={18} />
                                {t({ en: 'Need help with this order?', fr: 'Besoin d\'aide pour cette commande ?', ar: 'تحتاج مساعدة؟' })}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Fixed Bottom Total Footer (Yellow Signature) */}
                <div className="fixed bottom-0 left-0 right-0 bg-[#FFC244] z-[4005] px-8 pt-10 pb-[calc(24px+env(safe-area-inset-bottom))]">
                    {/* Wave Top Effect */}
                    <div className="absolute top-[-30px] left-0 right-0 h-[30px] pointer-events-none">
                        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full fill-[#FFC244]">
                            <path d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                        </svg>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                        <span className="text-[22px] font-medium text-black">
                            {mode === 'provider' ? t({ en: 'Your Net Earnings', fr: 'Gains Nets', ar: 'أرباحك الصافية' }) : t({ en: 'Total Price', fr: 'Prix Total', ar: 'الإجمالي' })}
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-[36px] font-[1000] text-black tracking-tighter">
                                {(mode === 'provider' ? (breakdown.total - breakdown.serviceFee) : breakdown.total).toFixed(0)}
                            </span>
                            <span className="text-[18px] font-medium text-black">MAD</span>
                        </div>
                    </div>

                    {/* Single CTA — Chat with Bricoler or Accept Job */}
                    {job.status === 'new' && mode === 'provider' ? (
                        <div className="flex gap-4">
                            <button
                                onClick={onClose}
                                className="w-[80px] h-[56px] text-black bg-black/5 hover:bg-black/10 rounded-[20px] font-bold text-[16px] flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <XCircle size={24} />
                            </button>
                            <button
                                onClick={() => onAccept?.(job.id)}
                                style={{ background: '#01A083' }}
                                className="flex-1 text-white h-[56px] rounded-[20px] font-bold text-[16px] flex items-center justify-center gap-2 active:scale-95 transition-transform border border-[#008f75]"
                            >
                                <CheckCircle2 size={20} />
                                {t({ en: 'Accept Job', fr: 'Accepter', ar: 'قبول' })}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => onChat?.(job.id, job.bricolerId || '', job.bricolerName || job.clientName)}
                            style={{ background: '#01A083' }}
                            className="w-full text-white h-[56px] rounded-[20px] font-bold text-[16px] flex items-center justify-center gap-2 active:scale-95 transition-transform border border-[#008f75]"
                        >
                            <MessageCircle size={20} />
                            {t({ en: mode === 'provider' ? 'Chat with Client' : 'Chat with Bricoler', fr: mode === 'provider' ? 'Chatter avec le Client' : 'Chatter avec le Bricoler', ar: 'الدردشة' })}
                        </button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default JobDetailsPopup;
