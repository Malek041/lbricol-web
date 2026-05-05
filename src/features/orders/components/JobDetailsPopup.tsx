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
import { formatForWhatsApp } from '@/lib/phoneUtils';

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
    const { t, language } = useLanguage();

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
            if (n) return t({ en: n, fr: n, ar: n });
            return (job as any).subServiceDisplayName || job.serviceName || job.service;
        })();

    // --- STRATEGIC PRICING DATA EXTRACTION ---
    // We prioritize stored data (The 'True' values saved in orders) over re-calculation to avoid mismatches
    const storedBreakdown = job.details?.pricing;
    
    // Use calculateOrderPrice ONLY as a fallback for legacy items or purely UI estimations
    const finalPricingBreakdown = storedBreakdown || calculateOrderPrice(job.service, job.price || 80, job.details?.serviceDetails || job.details || {});

    const hasStoredPricing = job.totalPrice !== undefined;
    const clientPay = hasStoredPricing ? (job.totalPrice || 0) : finalPricingBreakdown.total;
    const fee = hasStoredPricing ? (job.details?.fee || job.fee || (clientPay * 0.1)) : finalPricingBreakdown.serviceFee;
    const bricolerEarnings = hasStoredPricing ? (job.details?.basePrice || (clientPay - fee)) : (finalPricingBreakdown.total - finalPricingBreakdown.serviceFee);

    const finalClientPay = clientPay;
    const finalFee = fee;
    const finalEarnings = bricolerEarnings;
    const finalDuration = job.estimatedDuration || (job.details?.serviceDetails as any)?.taskDuration || finalPricingBreakdown.duration || 1;
    
    const handleWhatsApp = (number?: string | null) => {
        if (!number) return;
        const finalNumber = formatForWhatsApp(number);
        window.open(`https://wa.me/${finalNumber}`, '_blank');
    };

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
                                            {serviceCategoryName.toLowerCase() !== subServiceName.toLowerCase() && (
                                                <div className="px-3 py-1 w-fit bg-[#01A083]/10 border border-[#01A083]/20 text-[#01A083] text-[10px] font-black uppercase rounded-full tracking-wider mb-1">
                                                    {serviceCategoryName}
                                                </div>
                                            )}
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
                                            {t({ en: 'Total Client Payment', fr: 'Paiement Total Client', ar: 'إجمالي دفع العميل' })}
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

                            {/* Precise Price Breakdown for Provider */}
                            {finalPricingBreakdown.details && finalPricingBreakdown.details.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-[20px] font-black text-black px-1">
                                        {t({ en: 'Price Breakdown', fr: 'Détails du Prix', ar: 'تفاصيل السعر' })}
                                    </h3>
                                    <div className="bg-[#F9FAFB] rounded-[28px] p-6 border border-neutral-100 space-y-4">
                                        {finalPricingBreakdown.details.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-[15px]">
                                                <span className="text-neutral-500 font-medium">
                                                    {typeof item.label === 'object' ? (item.label[language] || item.label.en) : item.label}
                                                </span>
                                                <span className="font-bold text-black">{item.amount.toFixed(2)} MAD</span>
                                            </div>
                                        ))}
                                        <div className="pt-4 border-t border-neutral-200 flex justify-between items-center">
                                            <span className="text-black font-black uppercase text-[12px] tracking-widest">{t({ en: 'Subtotal', fr: 'Sous-total', ar: 'المجموع الفرعي' })}</span>
                                            <span className="text-[18px] font-black text-black">{finalPricingBreakdown.subtotal.toFixed(0)} MAD</span>
                                        </div>
                                    </div>
                                </div>
                            )}

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
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleWhatsApp(job.clientWhatsApp)}
                                            className="w-14 h-14 rounded-2xl bg-white border border-[#25D366]/30 flex items-center justify-center text-[#25D366] shadow-sm active:scale-95 transition-all"
                                        >
                                            <WhatsAppBrandIcon className="w-8 h-8" />
                                        </button>
                                        <button
                                            onClick={() => onChat?.(job.id, job.bricolerId || '', job.clientName)}
                                            className="w-14 h-14 rounded-2xl bg-[#01A083] flex items-center justify-center text-white shadow-lg shadow-[#01A083]/20 active:scale-95 transition-all"
                                        >
                                            <MessageCircle size={28} />
                                        </button>
                                    </div>
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
                                            { icon: '🔢', label: t({ en: 'Units', fr: 'Unités', ar: 'الوحدات' }), value: details.unitCount || 1 },
                                            { icon: '🪜', label: t({ en: 'Stairs', fr: 'Escaliers', ar: 'السلالم' }), value: details.stairsType !== 'none' ? t({ en: 'Included', fr: 'Inclus' }) : t({ en: 'None', fr: 'Aucun' }) }
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
                        /* CLIENT VIEW - AIRBNB STYLE REDESIGN */
                        <div className="px-6 flex flex-col gap-8 mt-6">
                            {/* Hero / Title Section */}
                            <div className="space-y-1">
                                <p className="text-[#01A083] text-[13px] font-black uppercase tracking-widest">
                                    {t({ en: 'Reservation details', fr: 'Détails de la réservation', ar: 'تفاصيل الحجز' })}
                                </p>
                                <h1 className="text-[32px] font-black text-black leading-tight tracking-tight">
                                    {subServiceName || job.serviceName || t({ en: 'Mission Details', fr: 'Détails de la mission', ar: 'تفاصيل المهمة' })}
                                </h1>
                            </div>

                            {/* Logistics Section - Clean List Style */}
                            <div className="space-y-6 bg-white">
                                {/* Date */}
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center shrink-0 border border-neutral-100">
                                        <Calendar size={22} className="text-black" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-bold text-neutral-400 uppercase tracking-tight leading-none mb-1">
                                            {t({ en: 'Date', fr: 'Date', ar: 'التاريخ' })}
                                        </p>
                                        <p className="text-[18px] font-bold text-black leading-tight">
                                            {(() => {
                                                try { return format(parseISO(job.date), 'EEEE, MMMM d, yyyy'); }
                                                catch (e) { return job.date; }
                                            })()}
                                        </p>
                                    </div>
                                </div>

                                {/* Time */}
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center shrink-0 border border-neutral-100">
                                        <Clock size={22} className="text-black" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-bold text-neutral-400 uppercase tracking-tight leading-none mb-1">
                                            {t({ en: 'Time', fr: 'Heure', ar: 'الوقت' })}
                                        </p>
                                        <p className="text-[18px] font-bold text-black leading-tight">
                                            {job.time || '09:00'}
                                        </p>
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center shrink-0 border border-neutral-100">
                                        <MapPin size={22} className="text-black" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-bold text-neutral-400 uppercase tracking-tight leading-none mb-1">
                                            {t({ en: 'Location', fr: 'Emplacement', ar: 'الموقع' })}
                                        </p>
                                        <p className="text-[18px] font-bold text-black leading-tight line-clamp-2">
                                            {typeof job.location === 'object' ? (job.location as any).address : job.location}
                                        </p>
                                        {job.city && <p className="text-[14px] font-medium text-neutral-400 mt-0.5">{job.city}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-[1.5px] bg-neutral-100 w-full" />

                            {/* Provider Section */}
                            <section>
                                <div className="flex justify-between items-center mb-4 px-1">
                                    <h3 className="text-[20px] font-black text-black">
                                        {t({ en: 'Your Provider', fr: 'Votre Prestataire', ar: 'المزود الخاص بك' })}
                                    </h3>
                                    <div className="flex items-center gap-1 px-3 py-1 bg-neutral-50 rounded-full border border-neutral-100">
                                        <Star size={14} className="fill-emerald-500 text-emerald-500" />
                                        <span className="text-[14px] font-black">{job.bricolerRating?.toFixed(1) || '5.0'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-3xl border border-neutral-100 bg-[#FCFCFC]">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                                        <img
                                            src={job.bricolerAvatar || "/Images/Vectors Illu/Avatar.png"}
                                            className="w-full h-full object-cover"
                                            alt="Provider"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[18px] font-black text-black leading-tight mb-0.5">
                                            {job.bricolerName}
                                        </h4>
                                        <p className="text-[13px] font-bold text-[#01A083] uppercase tracking-wider">Verified Professional</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleWhatsApp(job.bricolerWhatsApp)}
                                            className="w-12 h-12 rounded-2xl bg-white border border-[#25D366]/20 flex items-center justify-center text-[#25D366] active:scale-95 transition-all shadow-sm"
                                        >
                                            <WhatsAppBrandIcon className="w-7 h-7" />
                                        </button>
                                        <button
                                            onClick={() => onChat?.(job.id, job.bricolerId || '', job.bricolerName || job.clientName)}
                                            className="w-12 h-12 rounded-2xl bg-[#01A083] flex items-center justify-center text-white active:scale-95 transition-all shadow-md shadow-[#01A083]/10"
                                        >
                                            <MessageCircle size={24} />
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* Price Section */}
                            <section>
                                <h3 className="text-[20px] font-black text-black mb-4 px-1">
                                    {t({ en: 'Price Breakdown', fr: 'Détails du prix', ar: 'تفاصيل السعر' })}
                                </h3>
                                <div className="space-y-4 px-1">
                                    {finalPricingBreakdown.details?.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <span className="text-[16px] text-neutral-500 font-medium">
                                                {typeof item.label === 'object' ? (item.label[language] || item.label.en) : item.label}
                                            </span>
                                            <span className="text-[16px] font-bold text-neutral-900">{(item.amount || 0).toFixed(2)} MAD</span>
                                        </div>
                                    ))}
                                    <div className="pt-4 border-t border-neutral-100 flex justify-between items-center">
                                        <span className="text-[18px] font-black text-black">{t({ en: 'Total (MAD)', fr: 'Total (MAD)', ar: 'الإجمالي' })}</span>
                                        <span className="text-[28px] font-black text-black">
                                            {finalClientPay.toFixed(0)} <span className="text-sm font-medium">MAD</span>
                                        </span>
                                    </div>
                                </div>
                            </section>

                            {/* Instructions Section */}
                            {(job.description || (job as any).notes) && (
                                <section>
                                    <h3 className="text-[20px] font-black text-black mb-4 px-1">
                                        {t({ en: 'Your Instructions', fr: 'Vos instructions', ar: 'تعليماتك' })}
                                    </h3>
                                    <div className="p-6 rounded-[32px] bg-neutral-50 border border-neutral-100">
                                        <p className="text-[16px] font-medium text-neutral-700 leading-relaxed italic">
                                            "{job.description || (job as any).notes}"
                                        </p>
                                    </div>
                                </section>
                            )}
                            
                            <div className="pb-8" />
                        </div>
                    )}
                </div>

                {/* Fixed Bottom Total Footer - Simplified Airbnb Style */}
                <div className="fixed bottom-0 left-0 right-0 bg-white z-[4005] px-8 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] border-t border-neutral-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-neutral-400 uppercase tracking-widest">{t({ en: 'Net Total', fr: 'Total Net', ar: 'الإجمالي الصافي' })}</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-[28px] font-black text-black tracking-tight">
                                    {(mode === 'provider' ? finalEarnings : finalClientPay).toFixed(0)}
                                </span>
                                <span className="text-[14px] font-black text-neutral-400">MAD</span>
                            </div>
                        </div>

                        {/* CTA Button */}
                        <div className="flex-1">
                            {job.status === 'new' && mode === 'provider' ? (
                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        className="w-[60px] h-[56px] text-neutral-400 bg-neutral-100 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                                    >
                                        <XCircle size={24} />
                                    </button>
                                    <button
                                        onClick={() => onAccept?.(job.id)}
                                        className="flex-1 bg-[#01A083] text-white h-[56px] rounded-2xl font-black text-[17px] active:scale-95 transition-all shadow-lg shadow-[#01A083]/20"
                                    >
                                        {t({ en: 'Accept', fr: 'Accepter', ar: 'قبول' })}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => onChat?.(job.id, job.bricolerId || '', job.bricolerName || job.clientName)}
                                    className="w-full bg-[#01A083] text-white h-[56px] rounded-2xl font-black text-[17px] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-[#01A083]/20"
                                >
                                    <MessageCircle size={22} />
                                    {t({ 
                                        en: mode === 'provider' ? 'Chat with Client' : 'Chat with Bricoler', 
                                        fr: mode === 'provider' ? 'Contact Client' : 'Chat avec le Bricoler', 
                                        ar: 'الدردشة' 
                                    })}
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
