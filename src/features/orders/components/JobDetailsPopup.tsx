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
    Navigation,
    ArrowRight,
    Clock,
    UserCircle,
    Phone
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
    locationDetails?: any;
    providerAddress?: string;
    estimatedDuration?: number;
    fee?: number;
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
    
    const serviceCategoryName = catalogService 
        ? t({ en: catalogService.label, fr: catalogService.labelFr, ar: catalogService.labelAr || catalogService.label }) 
        : (job.serviceName || job.service);

    const subServiceName = catalogSub ? t({ en: catalogSub.en, fr: catalogSub.fr, ar: catalogSub.ar || catalogSub.en }) :
        (() => {
            const n = getSubServiceName(job.service, subId);
            return n ? t({ en: n, fr: n, ar: n }) : (job.serviceName || job.service);
        })();

    // --- STRATEGIC PRICING DATA EXTRACTION ---
    // We prioritize stored data (The 'True' values saved in orders) over re-calculation to avoid mismatches
    const hasStoredPricing = job.totalPrice !== undefined;
    const clientPay = hasStoredPricing ? (job.totalPrice || 0) : 0;
    const fee = hasStoredPricing ? (job.details?.fee || job.fee || (clientPay * 0.1)) : 0;
    const bricolerEarnings = hasStoredPricing ? (job.details?.basePrice || (clientPay - fee)) : 0;

    // Use calculateOrderPrice ONLY as a fallback for legacy items or purely UI estimations
    const breakdownFallback = calculateOrderPrice(job.service, job.price || 80, job.details?.serviceDetails || job.details || {});

    const finalClientPay = hasStoredPricing ? clientPay : breakdownFallback.total;
    const finalFee = hasStoredPricing ? fee : breakdownFallback.serviceFee;
    const finalEarnings = hasStoredPricing ? bricolerEarnings : (breakdownFallback.total - breakdownFallback.serviceFee);
    const finalDuration = job.estimatedDuration || (job.details?.serviceDetails as any)?.taskDuration || breakdownFallback.duration || 1;

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

                <div className="flex-1 overflow-y-auto no-scrollbar pb-[220px]">
                    {mode === 'provider' ? (
                        /* PROVIDER MISSION DASHBOARD */
                        <div className="px-6 space-y-8 mt-6">
                            {/* Mission Hero */}
                            <div className="bg-[#01A083]/5 rounded-[32px] p-6 border border-[#01A083]/10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#01A083]/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="px-3 py-1 bg-[#01A083] text-white text-[10px] font-black uppercase rounded-full tracking-wider">
                                            {job.status}
                                        </div>
                                        <div className="flex flex-col">
                                        <div className="px-3 py-1 w-fit bg-[#01A083]/10 border border-[#01A083]/20 text-[#01A083] text-[10px] font-black uppercase rounded-full tracking-wider mb-1">
                                            {serviceCategoryName}
                                        </div>
                                        <h2 className="text-[32px] font-black text-black leading-[1.1]">
                                            {subServiceName || t({ en: 'General Support', fr: 'Support Général', ar: 'دعم عام' })}
                                        </h2>
                                    </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-neutral-500">
                                            <Calendar size={18} className="text-[#01A083]" />
                                            <span className="text-[16px] font-bold">
                                                {(() => { try { return format(parseISO(job.date), 'MMM d, yyyy'); } catch (e) { return job.date; } })()}
                                            </span>
                                        </div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-200" />
                                        <div className="flex items-center gap-2 text-neutral-500">
                                            <Clock size={18} className="text-[#01A083]" />
                                            <span className="text-[16px] font-bold">{job.time || '09:00'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Earnings Card (The Money Shot) */}
                            <div className="bg-black rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl shadow-black/10">
                                <div className="absolute bottom-0 right-0 w-48 h-48 bg-[#01A083]/20 rounded-full blur-[80px] -mb-24 -mr-24" />
                                <div className="flex items-center justify-between mb-8 relative z-10">
                                    <div>
                                        <p className="text-[#01A083] text-[13px] font-black uppercase tracking-widest mb-1">
                                            {t({ en: 'Client Pays', fr: 'Le Client Paye', ar: 'العميل يدفع' })}
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-[54px] font-black tracking-tighter leading-none">
                                                {finalClientPay.toFixed(0)}
                                            </span>
                                            <span className="text-[20px] font-bold opacity-60">MAD</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/10">
                                        <DollarSign size={32} className="text-[#01A083]" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-6 border-t border-white/10 relative z-10">
                                    <div>
                                        <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                                            {t({ en: 'Your Net earnings', fr: 'Vos Gains Nets', ar: 'أرباحك الصافية' })}
                                        </p>
                                        <p className="text-[18px] font-bold opacity-80">{finalEarnings.toFixed(0)} MAD</p>
                                    </div>
                                    <ArrowRight className="text-neutral-700" size={24} />
                                    <div className="text-right">
                                        <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                                            {t({ en: 'Lbricol Fee', fr: 'Commission Lbricol', ar: 'عمولة Lbricol' })}
                                        </p>
                                        <p className="text-[18px] font-bold text-red-400">-{finalFee.toFixed(0)} MAD</p>
                                    </div>
                                </div>
                            </div>

                            {/* Logistics & Communication */}
                            <div className="space-y-4">
                                <h3 className="text-[20px] font-black text-black px-1">
                                    {t({ en: 'Logistics', fr: 'Logistique', ar: 'اللوجستيات' })}
                                </h3>

                                {/* Client & Chat Card */}
                                <div className="bg-[#F9FAFB] rounded-[28px] p-5 border border-neutral-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-100 p-0.5 relative">
                                            <img
                                                src={(job.clientAvatar && job.clientAvatar.length > 5) ? job.clientAvatar : "/Images/Vectors Illu/Avatar.png"}
                                                className="w-full h-full object-cover rounded-[14px]"
                                                alt="Client"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = "/Images/Vectors Illu/Avatar.png";
                                                }}
                                            />
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#01A083] rounded-full border-2 border-white flex items-center justify-center">
                                                <Star size={10} className="text-white fill-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-bold text-neutral-400 leading-none mb-1 uppercase tracking-tight">
                                                {t({ en: 'Customer', fr: 'Client', ar: 'عميل' })}
                                            </p>
                                            <h4 className="text-[18px] font-black text-black leading-tight">
                                                {job.clientName}
                                            </h4>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onChat?.(job.id, job.bricolerId || '', job.clientName)}
                                        className="w-14 h-14 rounded-2xl bg-[#01A083] flex items-center justify-center text-white shadow-lg shadow-[#01A083]/20 active:scale-95 transition-all"
                                    >
                                        <MessageCircle size={28} />
                                    </button>
                                </div>

                                {/* Address & Nav Card */}
                                <div className="bg-[#F9FAFB] rounded-[28px] p-5 border border-neutral-100 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center flex-shrink-0">
                                            <MapPin size={22} className="text-[#01A083]" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold text-neutral-400 leading-none mb-1 uppercase tracking-tight">
                                                {t({ en: 'Client Location', fr: 'Adresse du Client', ar: 'موقع العميل' })}
                                            </p>
                                            <p className="text-[16px] font-bold text-black leading-tight">
                                                {typeof job.location === 'object' ? (job.location as any).address : job.location}
                                            </p>
                                            {job.city && <p className="text-[14px] font-medium text-neutral-400 mt-1">{job.city}</p>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const loc = job.locationDetails || (typeof job.location === 'object' ? job.location : null);
                                            const lat = loc?.lat;
                                            const lng = loc?.lng;
                                            if (lat && lng) {
                                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                                            } else {
                                                alert(t({ en: "Coordinates not available for navigation.", fr: "Coordonnées de navigation non disponibles.", ar: "الإحداثيات غير متوفرة." }));
                                            }
                                        }}
                                        className="w-full py-4 rounded-[20px] bg-black text-white font-black text-[15px] flex items-center justify-center gap-3 active:scale-95 transition-all"
                                    >
                                        <Navigation size={20} />
                                        {t({ en: 'Navigate to Client', fr: 'Naviguer vers le Client', ar: 'الانتقال إلى الموقع' })}
                                    </button>
                                </div>
                            </div>

                            {/* Job Requirements Grid */}
                            <div className="space-y-4">
                                <h3 className="text-[20px] font-black text-black px-1">
                                    {t({ en: 'Job Details', fr: 'Détails du Job', ar: 'تفاصيل العمل' })}
                                </h3>

                                {(() => {
                                    const details = job.details?.serviceDetails || job.details || {};
                                    const isOffice = subId === 'office_cleaning' || job.service === 'office_cleaning';
                                    const isDish = subId === 'dish_cleaning';
                                    const isHospitality = subId === 'hospitality_turnover' || subId === 'hospitality';

                                    let specs = [];

                                    if (isOffice) {
                                        specs = [
                                            { icon: '🏢', label: t({ en: 'Desks', fr: 'Bureaux', ar: 'مكاتب' }), value: details.officeDesks || 1 },
                                            { icon: '🤝', label: t({ en: 'Meeting', fr: 'Réunion', ar: 'اجتماع' }), value: details.officeMeetingRooms || 0 },
                                            { icon: '🚽', label: t({ en: 'Bathrooms', fr: 'WC', ar: 'حمامات' }), value: details.officeBathrooms || 0 },
                                            { icon: '⏱️', label: t({ en: 'Duration', fr: 'Durée', ar: 'المدة' }), value: `${finalDuration}h` }
                                        ];
                                    } else if (isDish) {
                                        const h = details.hours || finalDuration;
                                        const label = h <= 1 ? t({ en: 'Quick', fr: 'Rapide' }) : (h <= 2 ? t({ en: 'Dinner', fr: 'Dîner' }) : t({ en: 'Event', fr: 'Événement' }));
                                        specs = [
                                            { icon: '🍽️', label: t({ en: 'Mode', fr: 'Mode', ar: 'الوضع' }), value: label },
                                            { icon: '⏱️', label: t({ en: 'Duration', fr: 'Durée', ar: 'المدة' }), value: `${h}h` },
                                            { icon: '🧼', label: t({ en: 'Task', fr: 'Tâche', ar: 'المهمة' }), value: t({ en: 'Dishes', fr: 'Vaisselle', ar: 'غسيل الأواني' }) }
                                        ];
                                    } else if (isHospitality) {
                                        specs = [
                                            { icon: '🏠', label: t({ en: 'Property', fr: 'Logement', ar: 'العقار' }), value: details.propertyType || t({ en: 'Apartment', fr: 'Appartement' }) },
                                            { icon: '🚪', label: t({ en: 'Rooms', fr: 'Pièces', ar: 'الغرف' }), value: details.rooms || 1 },
                                            { icon: '🚽', label: t({ en: 'Bathrooms', fr: 'SDB', ar: 'حمامات' }), value: details.bathrooms || 1 },
                                            { icon: '⏱️', label: t({ en: 'Duration', fr: 'Durée', ar: 'المدة' }), value: `${finalDuration}h` }
                                        ];
                                    } else {
                                        specs = [
                                            { icon: '🏠', label: t({ en: 'Place', fr: 'Lieu', ar: 'المكان' }), value: details.propertyType || 'Studio' },
                                            { icon: '🚪', label: t({ en: 'Rooms', fr: 'Pièces', ar: 'الغرف' }), value: details.rooms || 1 },
                                            { icon: '⏱️', label: t({ en: 'Duration', fr: 'Durée', ar: 'المدة' }), value: `${finalDuration}h` },
                                            { icon: '✨', label: t({ en: 'Type', fr: 'Type', ar: 'النوع' }), value: details.deepClean ? 'Deep' : 'Standard' }
                                        ];
                                    }

                                    return (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                {specs.map((s, i) => (
                                                    <div key={i} className="bg-[#F9FAFB] rounded-[24px] p-4 border border-neutral-100">
                                                        <span className="text-2xl mb-2 block">{s.icon}</span>
                                                        <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-1">{s.label}</p>
                                                        <p className="text-[17px] font-black text-black">{s.value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {isOffice && (details.hasKitchenette || details.hasReception) && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {details.hasKitchenette && (
                                                        <div className="bg-[#F9FAFB] px-3 py-2 rounded-xl border border-neutral-100 text-[12px] font-bold text-neutral-600 flex items-center gap-2">
                                                            <span>☕</span> {t({ en: 'Kitchenette', fr: 'Kitchenette', ar: 'مطبخ صغير' })}
                                                        </div>
                                                    )}
                                                    {details.hasReception && (
                                                        <div className="bg-[#F9FAFB] px-3 py-2 rounded-xl border border-neutral-100 text-[12px] font-bold text-neutral-600 flex items-center gap-2">
                                                            <span>🛋️</span> {t({ en: 'Reception', fr: 'Réception', ar: 'استقبال' })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Instructions & Photos */}
                            {(job.description || (job as any).notes) && (
                                <div className="space-y-4">
                                    <h3 className="text-[20px] font-black text-black px-1">
                                        {t({ en: 'Instructions', fr: 'Instructions', ar: 'التعليمات' })}
                                    </h3>
                                    <div className="bg-amber-50 rounded-[28px] p-6 border border-amber-100 shadow-sm shadow-amber-900/5">
                                        <p className="text-[17px] font-bold text-amber-900 leading-relaxed italic">
                                            "{job.description || (job as any).notes}"
                                        </p>
                                    </div>
                                </div>
                            )}

                            {(() => {
                                const allPhotos = [
                                    ...(job.photos || []),
                                    ...(job.images || []),
                                    ...(job.details?.serviceDetails?.photoUrls || [])
                                ];
                                if (allPhotos.length === 0) return null;

                                return (
                                    <div className="space-y-4">
                                        <h3 className="text-[20px] font-black text-black px-1">
                                            {t({ en: 'Visual Notes', fr: 'Notes Visuelles', ar: 'صور مساعدة' })}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3 pb-8">
                                            {allPhotos.filter(u => typeof u === 'string' && u.startsWith('http')).map((url, i) => (
                                                <div key={i} className="aspect-[4/3] bg-neutral-100 rounded-[24px] overflow-hidden border border-neutral-100/50 group relative">
                                                    <img 
                                                        src={url} 
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).parentElement?.style.setProperty('display', 'none');
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        /* CLIENT VIEW (Simplified current layout) */
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
                                        catch (e) { return job.date; }
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
                                    {t({ en: 'Provider', fr: 'Prestataire', ar: 'المزود' })}
                                    <span className="text-2xl">👨‍🔧</span>
                                </h3>
                                <div className="bg-[#F9FAFB] rounded-[32px] p-4 sm:p-6 border border-neutral-100 flex flex-wrap items-center gap-4 sm:gap-6">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] bg-white flex-shrink-0 overflow-hidden relative border-2 border-white">
                                        <img
                                            src={job.bricolerAvatar || "/Images/Vectors Illu/Avatar.png"}
                                            className="w-full h-full object-cover"
                                            alt="User"
                                        />
                                        <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#01A083] rounded-full border-2 border-white flex items-center justify-center">
                                            <CheckCircle2 size={10} className="text-white fill-white" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-[120px]">
                                        <h4 className="text-[20px] font-medium text-black mb-1 leading-tight">
                                            {job.bricolerName}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <Star size={14} className="fill-sky-400 text-sky-400" />
                                                <span className="text-[14px] font-medium text-black">
                                                    {job.bricolerRating?.toFixed(1) || '5.0'}
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

                            {/* Payment Method Section */}
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
                                </div>
                            </section>

                            {/* Client Setup Summary */}
                            <section className="mb-10">
                                <h3 className="text-[25px] font-medium text-black mb-6">
                                    {t({ en: 'Setup Summary', fr: 'Résumé', ar: 'ملخص' })} <span className="text-2xl">📋</span>
                                </h3>
                                <div className=" bg-[#F9FAFB] rounded-[32px] p-6 space-y-4">
                                    <div className="flex justify-between items-center pb-4 border-b border-neutral-100">
                                        <span className="text-neutral-500">{t({ en: 'Service', fr: 'Service', ar: 'الخدمة' })}</span>
                                        <span className="font-bold">{subServiceName}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-neutral-100">
                                        <span className="text-neutral-500">{t({ en: 'Date', fr: 'Date', ar: 'التاريخ' })}</span>
                                        <span className="font-bold">{(() => { try { return format(parseISO(job.date), 'MMM d, yyyy'); } catch (e) { return job.date; } })()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-4 border-b border-neutral-100">
                                        <span className="text-neutral-500">{t({ en: 'Time', fr: 'Heure', ar: 'الوقت' })}</span>
                                        <span className="font-bold">{job.time}</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </div>

                {/* Fixed Bottom Total Footer (Blue Signature) */}
                <div className="fixed bottom-0 left-0 right-0 bg-[#FFCC02] z-[4005] px-8 pt-10 pb-[calc(24px+env(safe-area-inset-bottom))]">
                    {/* Wave Top Effect */}
                    <div className="absolute top-[-30px] left-0 right-0 h-[30px] pointer-events-none">
                        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full fill-[#FFCC02]">
                            <path d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                        </svg>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                        <span className="text-[22px] font-medium text-black">
                            {mode === 'provider' ? t({ en: 'Your Net Earnings', fr: 'Gains Nets', ar: 'أرباحك الصافية' }) : t({ en: 'Total Price', fr: 'Prix Total', ar: 'الإجمالي' })}
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-[36px] font-[1000] text-black tracking-tighter">
                                {(mode === 'provider' ? finalEarnings : finalClientPay).toFixed(0)}
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
