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
    Ban,
    Navigation
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import { useLanguage } from '@/context/LanguageContext';
import { format, parseISO } from 'date-fns';
import { WhatsAppBrandIcon } from '@/components/shared/WhatsAppIcon';
import { getServiceVector, getSubServiceName } from '@/config/services_config';
import { SERVICES_CATALOGUE } from '@/config/services_catalogue';
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

    const subId = ((job as any).subService || (job as any).subServiceId || (job as any).serviceType || job.service || 'car_rental');
    
    // Attempt localized name from catalog
    const catalogService = SERVICES_CATALOGUE.find(s => s.id === job.service);
    const catalogSub = catalogService?.subServices.find(ss => ss.id === subId);
    const subServiceName = catalogSub ? t({ en: catalogSub.en, fr: catalogSub.fr, ar: catalogSub.ar }) : 
                          (() => {
                            const n = getSubServiceName(job.service, subId);
                            return n ? t({ en: n, fr: n, ar: n }) : (job.serviceName || job.service);
                          })();

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
                                {subServiceName || job.serviceName || t({ en: 'Mission Details', fr: 'Détails de la mission', ar: 'تفاصيل المهمة' })}
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

                        {/* Payment Method Section (Pic 3 Style) */}
                        <section className="mb-10">
                            <h3 className="text-[25px] font-medium text-black mb-6 flex items-center gap-3">
                                {t({ en: 'Payment', fr: 'Paiement', ar: 'الدفع' })} <span className="text-2xl">💳</span>
                            </h3>
                            <div className="bg-[#F9FAFB] rounded-[24px] p-5 border border-neutral-100 flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center text-3xl shadow-sm">
                                    {(job as any).paymentMethod === 'bank_transfer' ? '🏦' : '💵'}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[17px] font-medium text-black">
                                        {(job as any).paymentMethod === 'bank_transfer' 
                                            ? t({ en: 'Bank Transfer', fr: 'Virement bancaire', ar: 'تحويل بنكي' })
                                            : t({ en: 'Cash', fr: 'Espèces', ar: 'نقدًا' })}
                                    </h4>
                                    <p className="text-[14px] font-medium text-neutral-400">
                                        {(job as any).paymentMethod === 'bank_transfer'
                                            ? t({ en: 'Direct to Lbricol', fr: 'Directement à Lbricol', ar: 'مباشرة إلى Lbricol' })
                                            : t({ en: 'On delivery', fr: 'À la livraison', ar: 'عند التسليم' })}
                                    </p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-[#01A083]/10 flex items-center justify-center">
                                    <CheckCircle2 size={18} className="text-[#01A083]" />
                                </div>
                            </div>
                        </section>

                        {/* Setup Summary / Job Details */}
                        <section className="mb-10">
                            <h3 className="text-[25px] font-medium text-black mb-6">
                                {t({ en: 'Setup Summary', fr: 'Résumé de la configuration', ar: 'ملخص الإعداد' })} <span className="text-2xl">📋</span>
                            </h3>

                            {/* Job schedule for provider */}
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

                            <div className=" bg-[#F9FAFB] rounded-[32px] p-6 space-y-6">
                                {(() => {
                                    const details = job.details?.serviceDetails || job.details || {};
                                    const isHouseCleaning = ['standard_small', 'standard_large', 'family_home', 'deep_cleaning', 'hospitality_turnover', 'hospitality'].includes(subId);
                                    const isOfficeCleaning = subId === 'office_cleaning';
                                    const isDishCleaning = subId === 'dish_cleaning';
                                    const isCarWash = ['car_washing', 'car_detailing', 'car_wash'].includes(subId);
                                    const isTvMounting = subId === 'tv_mounting';

                                    const currentBreakdown = calculateOrderPrice(
                                        subId,
                                        parseFloat(String(job.price || '80')),
                                        {
                                            rooms: parseInt(String(details.rooms || 1)),
                                            hours: parseFloat(String(details.taskDuration || 1)),
                                            officeDesks: parseInt(String(details.officeDesks || 1)),
                                            officeMeetingRooms: parseInt(String(details.officeMeetingRooms || 0)),
                                            officeBathrooms: parseInt(String(details.officeBathrooms || 0)),
                                            hasKitchenette: details.hasKitchenette,
                                            hasReception: details.hasReception,
                                            officeAddOns: details.officeAddOns,
                                            days: parseInt(String(details.days || 1)),
                                            distanceKm: details.deliveryDistanceKm || details.distanceKm || 0,
                                            deliveryDistanceKm: details.deliveryDistanceKm || 0,
                                            deliveryDurationMinutes: details.deliveryDurationMinutes || 0,
                                            propertyType: details.propertyType,
                                            tvCount: details.tvCount,
                                            mountTypes: details.mountTypes,
                                            wallMaterial: details.wallMaterial,
                                            liftingHelp: details.liftingHelp,
                                            mountingAddOns: details.mountingAddOns,
                                            taskSize: details.taskSize,
                                        }
                                    );

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F0F0F0', paddingBottom: 16 }}>
                                                <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Type', fr: 'Type', ar: 'النوع' })}</span>
                                                <span style={{ fontSize: 17, fontWeight: 500, color: '#111827', textAlign: 'right' }}>
                                                    {subServiceName}
                                                </span>
                                            </div>

                                            {isHouseCleaning && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid #F0F0F0', paddingBottom: 16 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Place', fr: 'Lieu', ar: 'المكان' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 500, color: '#111827' }}>{details.propertyType || 'Studio'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Rooms', fr: 'Pièces', ar: 'الغرف' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 500, color: '#111827' }}>{details.rooms || 1}</span>
                                                    </div>
                                                    {details.deepClean && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Deep Clean', fr: 'Nettoyage en profondeur', ar: 'تنظيف عميق' })}</span>
                                                            <span style={{ fontSize: 17, fontWeight: 500, color: '#01A083' }}>{t({ en: 'Yes', fr: 'Oui', ar: 'نعم' })}</span>
                                                        </div>
                                                    )}
                                                    {details.highCeiling && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'High Ceiling', fr: 'Haut plafond', ar: 'سقف مرتفع' })}</span>
                                                            <span style={{ fontSize: 17, fontWeight: 500, color: '#01A083' }}>{t({ en: 'Yes', fr: 'Oui', ar: 'نعم' })}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isOfficeCleaning && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid #F0F0F0', paddingBottom: 16 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Desks', fr: 'Bureaux', ar: 'المكاتب' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 500, color: '#111827' }}>{details.officeDesks || 1}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Meeting Rooms', fr: 'Salles de réunion', ar: 'قاعات الاجتماعات' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 500, color: '#111827' }}>{details.officeMeetingRooms || 0}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Bathrooms', fr: 'Salles de bain', ar: 'الحمامات' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 500, color: '#111827' }}>{details.officeBathrooms || 0}</span>
                                                    </div>
                                                    {details.hasKitchenette && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Kitchenette', fr: 'Kitchenette', ar: 'مطبخ صغير' })}</span>
                                                            <span style={{ fontSize: 17, fontWeight: 500, color: '#01A083' }}>{t({ en: 'Included', fr: 'Inclus', ar: 'مشمول' })}</span>
                                                        </div>
                                                    )}
                                                    {details.hasReception && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Reception area', fr: 'Zone de réception', ar: 'منطقة الاستقبال' })}</span>
                                                            <span style={{ fontSize: 17, fontWeight: 500, color: '#01A083' }}>{t({ en: 'Included', fr: 'Inclus', ar: 'مشمول' })}</span>
                                                        </div>
                                                    )}
                                                    {details.officeAddOns && details.officeAddOns.length > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>{t({ en: 'Add-ons', fr: 'Extras', ar: 'إضافات' })}</span>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                                {details.officeAddOns.map((id: string) => {
                                                                    const labelMap: Record<string, any> = {
                                                                        it_sanitization: { en: 'IT Sanitization', fr: 'Désinfection IT', ar: 'تعقيم الأجهزة' },
                                                                        glass_partitions: { en: 'Glass Walls', fr: 'Parois vitrées', ar: 'جدران زجاجية' },
                                                                        post_event: { en: 'Event Cleanup', fr: 'Nettoyage événement', ar: 'تنظيف بعد الفعالية' }
                                                                    };
                                                                    return (
                                                                        <div key={id} style={{ padding: '4px 12px', background: 'white', border: '1px solid #E5E7EB', borderRadius: 100, fontSize: 13, fontWeight: 600, color: '#4B5563' }}>
                                                                            {t(labelMap[id] || { en: id, fr: id, ar: id })}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isDishCleaning && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid #F0F0F0', paddingBottom: 16 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Load Size', fr: 'Taille de la charge', ar: 'حجم العمل' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 500, color: '#111827' }}>
                                                            {details.taskDuration === 1 ? t({ en: 'Quick Wash', fr: 'Lavage rapide', ar: 'غسل سريع' }) : 
                                                             details.taskDuration === 2 ? t({ en: 'Family Load', fr: 'Charge familiale', ar: 'حمل عائلي' }) : 
                                                             t({ en: 'Event / Party', fr: 'Événement / Fête', ar: 'فعالية / حفلة' })}
                                                        </span>
                                                    </div>
                                                    {details.mountingAddOns?.includes('supplies') && (
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Supplies', fr: 'Fournitures', ar: 'المعدات' })}</span>
                                                            <span style={{ fontSize: 17, fontWeight: 500, color: '#01A083' }}>{t({ en: 'Bring Soap/Sponges', fr: 'Apporter savon/éponges', ar: 'إحضار الصابون/الإسفنج' })}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isCarWash && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid #F0F0F0', paddingBottom: 16 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Service', fr: 'Service', ar: 'الخدمة' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 500, color: '#111827' }}>{subServiceName}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Type', fr: 'Type', ar: 'النوع' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 500, color: '#111827' }}>{t({ en: 'Hand Wash', fr: 'Lavage à la main', ar: 'غسيل يدوي' })}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {isTvMounting && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderBottom: '1px solid #F0F0F0', paddingBottom: 16 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'TV count', fr: 'Nombre de TV', ar: 'عدد التلفازات' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 500, color: '#111827' }}>{details.tvCount || 1}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Wall', fr: 'Mur', ar: 'الجدار' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 500, color: '#111827' }}>{details.wallMaterial}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {(() => {
                                                const { getSubService: getSubSvc } = require('@/config/services_config');
                                                const sub = getSubSvc(job.service || '', subId);
                                                const durHr = details.taskDuration || sub?.estimatedDurationHr;
                                                return (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F0F0F0', paddingBottom: 16 }}>
                                                        <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Est. Duration', fr: 'Durée estimée', ar: 'المدة التقديرية' })}</span>
                                                        <span style={{ fontSize: 17, fontWeight: 500, color: '#01A083' }}>{durHr || 1}h</span>
                                                    </div>
                                                );
                                            })()}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Base price', fr: 'Prix de base', ar: 'السعر الأساسي' })}</span>
                                                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 350 }}>i</div>
                                                </div>
                                                <span style={{ fontSize: 17, fontWeight: 500, color: '#111827' }}>
                                                    {Math.round(currentBreakdown.basePrice)} MAD/{currentBreakdown.unit === 'unit' ? (t({ en: 'unit', fr: 'unité', ar: 'وحدة' })) : currentBreakdown.unit === 'day' ? (t({ en: 'day', fr: 'jour', ar: 'يوم' })) : currentBreakdown.unit === 'office' ? (t({ en: 'office', fr: 'bureau', ar: 'مكتب' })) : (t({ en: 'hr', fr: 'h', ar: 'ساعة' }))}
                                                </span>
                                            </div>

                                            {currentBreakdown.details && currentBreakdown.details.map((detail: any, idx: number) => (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, borderLeft: '3px solid rgba(1, 160, 131, 1)' }}>
                                                    <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t(detail.label)}</span>
                                                    <span style={{ fontSize: 17, fontWeight: 500, color: '#111827' }}>{detail.amount.toFixed(0)} MAD</span>
                                                </div>
                                            ))}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: mode === 'provider' ? 'Total Earnings' : 'Services', fr: mode === 'provider' ? 'Gains Totaux' : 'Services', ar: mode === 'provider' ? 'إجمالي الأرباح' : 'الخدمات' })}</span>
                                                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 350 }}>i</div>
                                                </div>
                                                <span style={{ fontSize: 17, fontWeight: 500, color: '#111827' }}>{(mode === 'provider' ? (currentBreakdown.total - currentBreakdown.serviceFee) : currentBreakdown.total).toFixed(2)} MAD</span>
                                            </div>

                                            {currentBreakdown.travelFee > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <span style={{ fontSize: 17, fontWeight: 350, color: '#6B7280' }}>{t({ en: 'Travel Fee', fr: 'Frais de déplacement', ar: 'رسوم التنقل' })}</span>
                                                            <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 350 }}>i</div>
                                                        </div>
                                                        <span style={{ fontSize: 13, fontWeight: 350, color: '#9CA3AF', marginTop: 4 }}>
                                                            {currentBreakdown.distanceKm?.toFixed(1)} km · ~{currentBreakdown.duration} min
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: 17, fontWeight: 500, color: '#111827' }}>{currentBreakdown.travelFee.toFixed(2)} MAD</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </section>

                        {/* Location Summaries (Enriched) */}
                        <section className="mb-10">
                            <h3 className="text-[25px] font-medium text-black mb-6">
                                {t({ en: 'Position', fr: 'Position', ar: 'الموقع' })} <span className="text-2xl">🗺️</span>
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {/* Client Position Card */}
                                <div className="bg-[#F9FAFB] rounded-[24px] p-4 flex flex-col gap-5 border border-neutral-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center">
                                            <MapPin size={22} className="text-[#01A083]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                                                {(job.service === 'errands' || job.service?.includes('delivery')) ? t({ en: 'Pickup Location', fr: 'Lieu d\'enlèvement', ar: 'موقع الاستلام' }) : t({ en: 'Client Location', fr: 'Position du Client', ar: 'موقع العميل' })}
                                            </div>
                                            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {typeof job.location === 'object' ? (job.location as any).address : job.location}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Navigation Button for Provider */}
                                    {mode === 'provider' && (
                                        <button
                                            onClick={() => {
                                                const lat = (job as any).locationDetails?.lat || (typeof job.location === 'object' ? (job.location as any).lat : null);
                                                const lng = (job as any).locationDetails?.lng || (typeof job.location === 'object' ? (job.location as any).lng : null);
                                                if (lat && lng) {
                                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                                                } else {
                                                    alert(t({ en: "Location coordinates not available.", fr: "Coordonnées de l'emplacement non disponibles.", ar: "إحداثيات الموقع غير متوفرة." }));
                                                }
                                            }}
                                            className="w-full py-4 rounded-[20px] bg-black text-white font-bold text-[15px] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-black/10"
                                        >
                                            <Navigation size={20} />
                                            {t({ en: 'Navigate to Client', fr: 'Naviguer vers le Client', ar: 'الانتقال إلى موقع العميل' })}
                                        </button>
                                    )}
                                </div>

                                {/* Dropoff Location */}
                                {(job.service === 'errands' || job.service?.includes('delivery')) && job.details?.serviceDetails?.dropoffAddress && (
                                    <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 24, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid #F0F0F0' }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #F3F4F6', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <MapPin size={22} className="text-[#01A083]" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{t({ en: 'Dropoff Location', fr: 'Lieu de dépôt', ar: 'موقع التسليم' })}</div>
                                            <div style={{ fontSize: 16, fontWeight: 900, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {job.details.serviceDetails.dropoffAddress}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Description Section */}
                        {(job.description || (job as any).notes) && (
                            <section className="mb-10">
                                <h3 className="text-[25px] font-medium text-black mb-6">
                                    {t({ en: 'Description & Notes', fr: 'Description et Remarques', ar: 'الوصف والملاحظات' })} <span className="text-2xl">📝</span>
                                </h3>
                                <div className="space-y-4">
                                    {job.description && (
                                        <div className="bg-[#F9FAFB] rounded-[32px] p-8 border border-neutral-100">
                                            <p className="text-[17px] font-medium text-neutral-600 leading-relaxed italic">
                                                "{job.description}"
                                            </p>
                                        </div>
                                    )}
                                    {mode === 'provider' && (job as any).notes && (
                                        <div className="bg-amber-50 rounded-[24px] p-6 border border-amber-100 shadow-sm shadow-amber-900/5">
                                            <div className="flex items-center gap-2 mb-3 text-amber-900">
                                                <Info size={18} />
                                                <span className="text-[13px] font-black uppercase tracking-wider">{t({ en: 'Instructions from Client', fr: 'Instructions du Client', ar: 'تعليمات من العميل' })}</span>
                                            </div>
                                            <p className="text-[16px] font-medium text-amber-900 leading-relaxed">
                                                {(job as any).notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Attached Photos */}
                        {(() => {
                            const allPhotos = [
                                ...(job.photos || []),
                                ...(job.images || []),
                                ...(job.details?.serviceDetails?.photoUrls || [])
                            ];
                            if (allPhotos.length === 0) return null;

                            return (
                                <section className="mb-10">
                                    <h3 className="text-[25px] font-medium text-black mb-6">
                                        {t({ en: 'Attached Photos', fr: 'Photos Jointes', ar: 'الصور المرفقة' })} <span className="text-2xl">📸</span>
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {allPhotos.map((url, i) => (
                                            <div key={i} className="aspect-square bg-neutral-100 rounded-[20px] overflow-hidden border border-neutral-100/50 group relative">
                                                <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );
                        })()}
                        
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
