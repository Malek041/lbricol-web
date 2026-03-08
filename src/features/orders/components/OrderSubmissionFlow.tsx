"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ChevronLeft, ChevronRight, ChevronDown, MapPin,
    Star, ShieldCheck, Briefcase,
    Info, Clock, CheckCircle2, SlidersHorizontal, ArrowUpDown, Search, Check, Calendar, Trophy, FileText, Sparkles, Zap, Plus, Wrench, Banknote, AlertCircle, MessageSquare, MessageCircle
} from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getServiceById, getSubServiceName, getServiceVector } from '@/config/services_config';
import { MOROCCAN_CITIES, MOROCCAN_CITIES_AREAS } from '@/config/moroccan_areas';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import SplashScreen from '@/components/layout/SplashScreen';
import { compressImageFileToDataUrl, dataUrlToBlob, isImageDataUrl } from '@/lib/imageCompression';
import { WhatsAppBrandIcon } from '@/components/shared/WhatsAppIcon';

// ── Types ──────────────────────────────────────────────────────────────────

interface Bricoler {
    id: string;
    displayName: string;
    photoURL?: string;
    rating: number;
    completedJobs: number;
    hourlyRate?: number;
    quickPitch?: string;
    bio?: string;
    yearsOfExperience?: number;
    serviceEquipments?: string[];
    glassCleaningEquipments?: string[];
    experience?: string;
    city: string;
    areas: string[];
    isVerified?: boolean;
    isActive: boolean;
    services: any[];
    availability?: Record<string, { from: string; to: string }[]>;
    createdAt?: Timestamp | any;
    errandsTransport?: string;
    movingTransport?: string;
    // Ranking system extensions
    servicePrideScore?: number;
    happyMakingScore?: number;
    reviews?: any[];
    portfolio?: string[];
    whatsappNumber?: string;
    servesArea?: boolean;
    routine?: Record<string, { active: boolean; from: string; to: string }>;
    calendarSlots?: Record<string, { from: string; to: string }[]>;
}

export interface DraftOrder {
    id: string;
    service: string;
    subService?: string;
    city: string;
    area: string;
    taskSize: string | null;
    description: string;
    selectedBricolerId: string | null;
    selectedDate: string | null;
    selectedTime: string | null;
    paymentMethod: 'cash' | 'bank';
    bankReceipt: string | null;
    clientNeedImages?: string[];
    frequency?: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
    step: number;
    subStep1: 'location' | 'size' | 'description' | 'languages';
    selectedLanguages?: string[];
    updatedAt: number;
}

interface OrderSubmissionFlowProps {
    isOpen: boolean;
    onClose: () => void;
    service: string;
    subService?: string;
    initialCity?: string | null;
    initialArea?: string | null;
    onSubmit: (data: any) => void;
    continueDraft?: DraftOrder | null;
    mode?: 'create' | 'edit';
}

// ── Constants ──────────────────────────────────────────────────────────────

const TASK_SIZES = [
    {
        id: 'small',
        duration: 1,
        label: { en: 'Small', fr: 'Petit', ar: 'صغير' },
        estTime: { en: 'Est: 1 hr', fr: 'Est: 1h', ar: 'حوالي ساعة' },
        desc: {
            en: 'Minor repairs, single item fix, or quick task.',
            fr: 'Petites réparations, fixation d\'un seul article ou tâche rapide.',
            ar: 'إصلاحات بسيطة، تثبيت قطعة واحدة، أو مهمة سريعة.'
        }
    },
    {
        id: 'medium',
        duration: 2,
        label: { en: 'Medium', fr: 'Moyen', ar: 'متوسط' },
        estTime: { en: 'Est: 2-3 hrs', fr: 'Est: 2-3h', ar: '2-3 ساعات' },
        desc: {
            en: 'Several repairs, assembling multiple items, or larger maintenance.',
            fr: 'Plusieurs réparations, assemblage de plusieurs articles ou maintenance plus importante.',
            ar: 'عدة إصلاحات، تركيب عدة قطع، أو صيانة أكبر.'
        }
    },
    {
        id: 'large',
        duration: 4,
        label: { en: 'Large', fr: 'Grand', ar: 'كبير' },
        estTime: { en: 'Est: 4+ hrs', fr: 'Est: 4h+', ar: '4 ساعات أو أكثر' },
        desc: {
            en: 'Extensive work, painting a room, or full day help.',
            fr: 'Travaux importants, peinture d\'une pièce ou aide d\'une journée entière.',
            ar: 'أعمال مكثفة، صباغة غرفة، أو مساعدة ليوم كامل.'
        }
    },
];

// ── Components ──────────────────────────────────────────────────────────────

const SuccessAnimation = ({ isVisible, onComplete }: { isVisible: boolean, onComplete: () => void }) => {
    const images = [
        "/Images/Vectors Illu/LocationFlag_VI.webp",
        "/Images/Vectors Illu/matching3D.webp",
        "/Images/Vectors Illu/NewOrder.webp"
    ];

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[3000] pointer-events-none flex items-center justify-center overflow-hidden">
                    {images.map((src, i) => (
                        <motion.img
                            key={src}
                            src={src}
                            initial={{ y: '100dvh', opacity: 0, scale: 0.5, rotate: i * 15 - 15 }}
                            animate={{
                                y: '-100dvh',
                                opacity: [0, 1, 1, 0],
                                scale: [0.5, 1.2, 1.2, 0.8],
                                rotate: i * 15 - 15 + (i % 2 === 0 ? 20 : -20)
                            }}
                            transition={{
                                duration: 3,
                                delay: i * 0.4,
                                ease: "easeInOut"
                            }}
                            onAnimationComplete={() => { if (i === images.length - 1) setTimeout(onComplete, 500); }}
                            className="absolute w-64 h-64 object-contain"
                            style={{
                                left: `${25 + i * 25}%`,
                                transform: 'translateX(-50%)'
                            }}
                        />
                    ))}
                </div>
            )}
        </AnimatePresence>
    );
};

const getBricolerRank = (bricoler: Bricoler): { label: string, color: string, bg: string, icon?: React.ReactNode } => {
    const jobs = Math.max(bricoler.completedJobs || 0, (bricoler.reviews || []).length);
    const rating = (bricoler.rating && bricoler.rating > 0)
        ? bricoler.rating
        : (bricoler.reviews && bricoler.reviews.length > 0
            ? (bricoler.reviews.reduce((acc, r: any) => acc + (r.rating || 0), 0) / bricoler.reviews.length)
            : 0);

    const isVerified = bricoler.isVerified || false;
    const personalityPassed = (bricoler.servicePrideScore || 0) >= 80 && (bricoler.happyMakingScore || 0) >= 80;

    if (jobs > 40 && rating >= 4.5 && isVerified && personalityPassed) {
        return {
            label: 'ELITE',
            color: 'text-[#00A082]',
            bg: 'bg-[#FCEBA4]',
            icon: <Trophy size={11} strokeWidth={3} className="mr-0.5" />
        };
    }
    if (jobs >= 20 && rating >= 4.4) {
        return {
            label: 'PRO',
            color: 'text-[#00A082]',
            bg: 'bg-[#E6F6F2]',
            icon: <Zap size={11} strokeWidth={3} className="mr-0.5" />
        };
    }
    if (jobs >= 10) {
        return {
            label: 'CLASSIC',
            color: 'text-[#FFC244]',
            bg: 'bg-[#FFF9E5]',
            icon: <Briefcase size={11} strokeWidth={3} className="mr-0.5" />
        };
    }
    return {
        label: 'NEW',
        color: 'text-[#7C73E8]',
        bg: 'bg-[#7C73E8]/10',
        icon: <Sparkles size={11} strokeWidth={3} className="mr-0.5" />
    };
};

const playMatchSound = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (pleasant arpeggio)
        freqs.forEach((freq, i) => {
            setTimeout(() => {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

                gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05); // softer mix
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4); // nice ringing tail

                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.4);
            }, i * 60); // 60ms delay between notes
        });
    } catch (e) {
        console.log("Audio not supported or blocked", e);
    }
};

const BricolerCard = ({ bricoler, onSelect, onOpenProfile, isSelected, serviceName, index = 0 }: { bricoler: Bricoler, onSelect: () => void, onOpenProfile: () => void, isSelected: boolean, serviceName: string, index?: number }) => {
    const { t } = useLanguage();
    const effectiveJobs = Math.max(bricoler.completedJobs || 0, (bricoler.reviews || []).length);
    const effectiveRating = (bricoler.rating && bricoler.rating > 0)
        ? bricoler.rating
        : (bricoler.reviews && bricoler.reviews.length > 0
            ? (bricoler.reviews.reduce((acc, r: any) => acc + (r.rating || 0), 0) / bricoler.reviews.length)
            : 0);

    const rank = getBricolerRank(bricoler);
    const translatedRankLabel = rank.label === 'ELITE'
        ? t({ en: 'ELITE', fr: 'ÉLITE' })
        : rank.label === 'PRO'
            ? t({ en: 'PRO', fr: 'PRO' })
            : rank.label === 'CLASSIC'
                ? t({ en: 'CLASSIC', fr: 'CLASSIQUE' })
                : t({ en: 'NEW', fr: 'NOUVEAU', ar: 'جديد' });

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", damping: 18, stiffness: 220, delay: index * 0.12 }}

            onClick={onOpenProfile}
            className={cn(
                "flex flex-col gap-2 py-5 border-b border-neutral-100 last:border-0 cursor-pointer transition-all active:opacity-80",
                isSelected ? "bg-[#F0FBF8] rounded-2xl px-3 -mx-3" : ""
            )}
        >
            <div className="flex gap-3.5 px-0.5">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    <img
                        src={bricoler.photoURL || "/Images/Logo/Black Lbricol Avatar Face.webp"}
                        alt={bricoler.displayName}
                        className="w-16 h-16 rounded-full object-cover border border-neutral-100 bg-neutral-50"
                    />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[17px] font-bold text-neutral-900 truncate tracking-tight">{bricoler.displayName}</h4>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-auto pl-2">
                            <span className="text-[16px] font-semibold text-neutral-900 leading-none whitespace-nowrap">
                                MAD {bricoler.hourlyRate?.toFixed(2) || '0.00'}
                            </span>
                            <span className="text-[12px] text-neutral-400 font-medium whitespace-nowrap">/hr</span>
                            <div className="w-4 h-4 rounded-full bg-[#00A082]/10 flex-shrink-0 flex items-center justify-center ml-0.5">
                                <Check size={10} className="text-[#00A082]" strokeWidth={4} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={cn(
                            "px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight rounded-md flex items-center gap-1",
                            rank.bg,
                            rank.color
                        )}>
                            {rank.icon}{translatedRankLabel}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 mt-2">
                        {effectiveJobs > 0 && <Star size={12} className="text-neutral-900" fill="currentColor" />}
                        <span className="text-[14px] font-bold text-neutral-900">
                            {effectiveJobs > 0 ? effectiveRating.toFixed(1) : t({ en: 'NEW', fr: 'NOUVEAU', ar: 'جديد' })}
                        </span>
                        {effectiveJobs > 0 && <span className="text-[12px] font-medium text-neutral-400">({effectiveJobs} {t({ en: 'reviews', fr: 'avis', ar: 'تقييمات' })})</span>}
                    </div>

                    <div className="flex flex-col gap-0.5 mt-2">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-neutral-500" />
                            <span className="text-[13px] font-semibold text-neutral-600">{effectiveJobs} {serviceName} {t({ en: 'tasks', fr: 'missions', ar: 'مهام' })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bio Box */}
            <div className="mt-0.5 mx-0.5 bg-[#F8F9FA] p-3 rounded-[10px] relative border border-neutral-50">
                <p className="text-[13px] font-medium text-neutral-500 leading-relaxed line-clamp-2">
                    {bricoler.bio || bricoler.quickPitch || t({ en: "Hello 👋 I'm proficient in a wide range of services tailored to your needs. Fast and reliable work.", fr: "Bonjour 👋 Je suis compétent dans une large gamme de services adaptés à vos besoins. Travail rapide et fiable.", ar: "مرحباً 👋 أنا متمكن من مجموعة واسعة من الخدمات لتلبية احتياجاتك. عمل سريع وموثوق." })}
                </p>
                <button
                    onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
                    className="mt-1.5 text-[13px] font-bold text-[#00A082] hover:text-[#008C74] block"
                >
                    {t({ en: 'Read More', fr: 'Lire plus', ar: 'اقرأ المزيد' })}
                </button>
            </div>

            {/* Action Button */}
            <div className="px-0.5 mt-1">
                <button
                    onClick={(e) => { e.stopPropagation(); onSelect(); }}
                    className="w-full h-[42px] bg-[#00A082] text-white rounded-full text-[16px] font-black active:scale-[0.98] transition-all"
                >
                    {t({ en: 'Select & Continue', fr: 'Choisir & Continuer', ar: 'اختر وتابع' })}
                </button>
            </div>
        </motion.div>
    );
};

const BricolerProfileModal = ({ bricoler, isOpen, onClose, onSelect, isSelected, serviceName, service }: { bricoler: Bricoler, isOpen: boolean, onClose: () => void, onSelect: () => void, isSelected: boolean, serviceName: string, service?: string }) => {
    const { t } = useLanguage();
    if (!bricoler) return null;

    // Normalize a service id/name for comparison
    const normalizeService = (s: string) => s?.toLowerCase().replace(/[_\s-]/g, '');
    const selectedServiceNorm = normalizeService(service || serviceName || '');

    // Filter reviews to only those matching the selected service
    const allReviews = bricoler.reviews || [];
    const serviceReviews = allReviews.filter((r: any) => {
        const revService = normalizeService(r.serviceId || r.serviceName || r.service || '');
        return !selectedServiceNorm || !revService || revService === selectedServiceNorm || revService.includes(selectedServiceNorm) || selectedServiceNorm.includes(revService);
    });
    const reviewsToShow = serviceReviews.length > 0 ? serviceReviews : allReviews;
    const isFiltered = serviceReviews.length > 0 && serviceReviews.length < allReviews.length;

    // Compute stats from filtered reviews
    const effectiveJobs = reviewsToShow.length > 0 ? reviewsToShow.length : Math.max(bricoler.completedJobs || 0, allReviews.length);
    const effectiveRating = reviewsToShow.length > 0
        ? reviewsToShow.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviewsToShow.length
        : ((bricoler.rating && bricoler.rating > 0) ? bricoler.rating : 5.0);

    const isNew = reviewsToShow.length === 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[3000] bg-white flex flex-col"
                >
                    {/* Header */}
                    <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3 border-b border-neutral-100 p-4 sm:p-6">
                        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-50">
                            <ChevronLeft size={24} className="text-neutral-900" />
                        </button>
                        <h3 className="min-w-0 px-1 text-center text-[16px] font-bold leading-tight text-neutral-900 sm:text-[19px]">
                            {t({ en: bricoler.displayName + "'s Profile", fr: "Profil de " + bricoler.displayName, ar: "ملف " + bricoler.displayName })}
                        </h3>
                        <div className="flex items-center gap-2">
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                        <div className="p-4 sm:p-6">
                            {/* Profile Hero */}
                            <div className="mb-8 flex flex-col gap-4 min-[420px]:flex-row min-[420px]:items-start sm:gap-6">
                                <img src={bricoler.photoURL || "/Images/Logo/Black Lbricol Avatar Face.webp"} className="h-24 w-24 rounded-[28px] object-cover border-4 border-neutral-50" />
                                <div className="min-w-0 flex-1">
                                    <h2 className="mb-2 text-[24px] font-bold leading-tight text-neutral-900 sm:text-[26px]">{bricoler.displayName}</h2>
                                    <div className="mb-3 flex flex-wrap items-start gap-2">
                                        <div className={cn(
                                            "flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-0.5",
                                            isNew ? "bg-neutral-100 text-neutral-400" : "bg-[#FFC244]/10 text-[#FFC244]"
                                        )}>
                                            <Star size={14} fill="currentColor" />
                                            <span className="whitespace-nowrap text-[16px] font-semibold">{isNew ? t({ en: 'NEW', fr: 'NOUVEAU' }) : effectiveRating.toFixed(1)}</span>
                                        </div>
                                        <span className="text-[15px] font-medium text-neutral-400">{effectiveJobs} {t({ en: 'Missions', fr: 'Missions', ar: 'مهمة' })}</span>
                                        {isFiltered && (
                                            <span className="rounded-full bg-[#00A082]/10 px-2 py-0.5 text-[11px] font-bold text-[#00A082]">
                                                {t({ en: "for " + serviceName, fr: "en " + serviceName, ar: "في " + serviceName })}
                                            </span>
                                        )}

                                        {/* Dynamic Rank Badge */}
                                        {(() => {
                                            const rank = getBricolerRank(bricoler);
                                            const profileRankLabel = rank.label === 'ELITE'
                                                ? t({ en: 'ELITE', fr: 'ÉLITE' })
                                                : rank.label === 'PRO'
                                                    ? t({ en: 'PRO', fr: 'PRO' })
                                                    : rank.label === 'CLASSIC'
                                                        ? t({ en: 'CLASSIC', fr: 'CLASSIQUE' })
                                                        : t({ en: 'NEW', fr: 'NOUVEAU', ar: 'جديد' });
                                            return (
                                                <span className={cn(
                                                    "flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase",
                                                    rank.bg,
                                                    rank.color
                                                )}>
                                                    {rank.icon}{profileRankLabel}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[20px] font-bold text-[#00A082]">
                                        <span className="whitespace-nowrap">MAD {bricoler.hourlyRate || 75}</span>
                                        <span className="text-[15px] font-medium text-neutral-400">/hr</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <div className="p-4 bg-neutral-50 rounded-1xl border border-neutral-100">
                                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-tight mb-1">{t({ en: 'Experience', fr: 'Expérience', ar: 'الخبرة' })}</div>
                                    <div className="text-[18px] font-bold text-neutral-900">{bricoler.yearsOfExperience || bricoler.experience || "0"}</div>
                                </div>
                                <div className="p-4 bg-neutral-50 rounded-1xl border border-neutral-100">
                                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-tight mb-1">{t({ en: 'Completed', fr: 'Réalisées' })}</div>
                                    <div className="text-[18px] font-bold text-neutral-900">{effectiveJobs} {t({ en: 'Jobs', fr: 'Missions' })}</div>
                                </div>
                            </div>

                            {/* About */}
                            <div className="mb-8">
                                <h4 className="text-[18px] font-black text-neutral-900 mb-4">{t({ en: 'About Me', fr: 'À propos de moi', ar: 'نبذة عني' })}</h4>
                                <p className="text-[15px] text-black leading-relaxed font-medium  p-1 rounded-[12px] border border-neutral-100">
                                    {bricoler.bio || bricoler.quickPitch || t({ en: 'No bio provided yet.', fr: 'Aucune bio fournie pour le moment.', ar: 'لم يتم تقديم سيرة ذاتية بعد.' })}
                                </p>
                            </div>

                            {/* Transport / vehicle details for Errands & Moving */}
                            {(service === 'errands' && bricoler.errandsTransport) || (service === 'moving' && bricoler.movingTransport) ? (
                                <div className="mb-8">
                                    <h4 className="text-[18px] font-black text-neutral-900 mb-4">
                                        {service === 'errands'
                                            ? t({ en: 'How they travel in the city', fr: 'Comment il/elle se déplace en ville', ar: 'كيف يتنقل داخل المدينة' })
                                            : t({ en: 'Vehicle for moving help', fr: 'Véhicule pour le déménagement', ar: 'وسيلة النقل للمساعدة في النقل' })}
                                    </h4>
                                    <p className="text-[15px] text-black leading-relaxed font-medium p-1 rounded-[12px] border border-neutral-100 inline-block bg-neutral-50">
                                        {service === 'errands'
                                            ? (
                                                bricoler.errandsTransport === 'car' ? t({ en: 'Travels by car', fr: 'Se déplace en voiture', ar: 'يتنقل بالسيارة' }) :
                                                    bricoler.errandsTransport === 'walking' ? t({ en: 'Travels on foot', fr: 'Se déplace à pied', ar: 'يتنقل مشيًا' }) :
                                                        bricoler.errandsTransport === 'airbike' ? t({ en: 'Travels by bicycle', fr: 'Se déplace à vélo', ar: 'يتنقل بالدراجة الهوائية' }) :
                                                            bricoler.errandsTransport === 'motorbike' ? t({ en: 'Travels by motorbike', fr: 'Se déplace à moto', ar: 'يتنقل بدراجة نارية' }) :
                                                                bricoler.errandsTransport === 'escooter' ? t({ en: 'Travels by e‑scooter', fr: 'Se déplace en trottinette électrique', ar: 'يتنقل بسكوتر كهربائي' }) :
                                                                    t({ en: 'Custom way of travelling in the city', fr: 'Mode de déplacement personnalisé en ville', ar: 'طريقة خاصة للتنقل داخل المدينة' })
                                            )
                                            : (
                                                bricoler.movingTransport === 'truck' ? t({ en: 'Has a moving truck', fr: 'Dispose d’un camion de déménagement', ar: 'يتوفر على شاحنة للنقل' }) :
                                                    bricoler.movingTransport === 'van' ? t({ en: 'Has a van', fr: 'Dispose d’une camionnette', ar: 'يتوفر على سيارة “فان” للنقل' }) :
                                                        bricoler.movingTransport === 'car' ? t({ en: 'Uses a car for moving', fr: 'Utilise une voiture pour le déménagement', ar: 'يستعمل سيارة للنقل' }) :
                                                            bricoler.movingTransport === 'labor_only' ? t({ en: 'Provides labor only (no vehicle)', fr: 'Fournit uniquement la main‑d’œuvre (sans véhicule)', ar: 'يوفر فقط اليد العاملة بدون وسيلة نقل' }) :
                                                                t({ en: 'Custom vehicle setup for moving', fr: 'Configuration personnalisée pour le déménagement', ar: 'ترتيب خاص لوسيلة النقل في المهام' })
                                            )}
                                    </p>
                                </div>
                            ) : null}


                            {/* Service Specific Equipments */}
                            {(bricoler.serviceEquipments || []).length > 0 && (
                                <div className="mb-8">
                                    <h4 className="text-[18px] font-black text-neutral-900 mb-4">{t({ en: 'Equipments', fr: 'Équipements' })}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {bricoler.serviceEquipments?.map(eq => (
                                            <span key={eq} className="px-5 py-2.5 bg-[#00A082]/5 text-[#00A082] text-[13px] font-bold rounded-full border border-[#00A082]/10 capitalize">
                                                {eq}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Equipments (Glass Cleaning) - Fallback for backward compatibility */}
                            {(bricoler.serviceEquipments || []).length === 0 && (bricoler.glassCleaningEquipments || []).length > 0 && (
                                <div className="mb-8">
                                    <h4 className="text-[18px] font-black text-neutral-900 mb-4">{t({ en: 'Equipments', fr: 'Équipements' })}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {bricoler.glassCleaningEquipments?.map(eq => (
                                            <span key={eq} className="px-5 py-2.5 bg-[#00A082]/5 text-[#00A082] text-[13px] font-bold rounded-full border border-[#00A082]/10 capitalize">
                                                {eq}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}



                            {/* Recent Reviews — filtered to selected service */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-[18px] font-bold text-neutral-900">{t({ en: 'Reviews', fr: 'Avis', ar: 'التقييمات' })}</h4>
                                    {isFiltered && (
                                        <span className="text-[12px] font-black text-[#00A082] bg-[#00A082]/8 px-3 py-1 rounded-full border border-[#00A082]/20">
                                            {t({ en: serviceName, fr: serviceName, ar: serviceName }) + " · " + reviewsToShow.length}
                                        </span>
                                    )}
                                </div>
                                {reviewsToShow.length === 0 ? (
                                    <div className="p-10 text-center rounded-[24px] border-2 border-dashed border-neutral-200 bg-neutral-50/50">
                                        <p className="text-neutral-400 font-bold">{t({ en: 'No reviews yet. Be the first to hire!', fr: 'Aucun avis pour le moment. Soyez le premier à commander !', ar: 'لا توجد تقييمات بعد. كن أول من يطلب الخدمة!' })}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {reviewsToShow.map((rev: any, i: number) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="p-5 bg-white rounded-[24px] border border-neutral-100 shadow-sm"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-[#FFC244]/10 flex items-center justify-center text-[#FFC244] font-black text-[15px]">
                                                            {rev.clientName?.[0]?.toUpperCase() || 'C'}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-[15px]">{rev.clientName || t({ en: 'Client', fr: 'Client', ar: 'عميل' })}</div>
                                                            <div className="text-[11px] font-bold text-[#00A082] uppercase tracking-tight bg-[#00A082]/5 px-2 py-0.5 rounded-md inline-block mt-0.5">
                                                                {rev.serviceName || serviceName}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 bg-[#FFF8E7] px-2.5 py-1 rounded-full">
                                                        <Star size={11} className="text-[#FFC244] fill-[#FFC244]" />
                                                        <span className="text-[14px] font-black text-[#1D1D1D]">{rev.rating || 5}</span>
                                                    </div>
                                                </div>
                                                <p className="text-[14px] leading-relaxed text-neutral-600 font-medium">{rev.comment || t({ en: 'No comment left.', fr: 'Aucun commentaire laissé.', ar: 'لم يتم ترك تعليق.' })}</p>
                                                <div className="mt-3 pt-3 border-t border-neutral-50 text-[11px] text-neutral-400 font-bold uppercase tracking-widest">
                                                    {rev.date ? new Date(rev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : t({ en: 'Recently', fr: 'Récemment', ar: 'مؤخراً' })}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Fixed Footer */}
                    <div className="p-6 border-t border-neutral-100 bg-white">
                        <button
                            onClick={() => {
                                onSelect();
                                onClose();
                            }}
                            className="w-full h-16 bg-[#00A082] hover:bg-[#008C74] text-white text-[18px] font-bold rounded-full active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            {isSelected ? t({ en: 'Already Selected', fr: 'Déjà sélectionné', ar: 'مختار بالفعل' }) : t({ en: 'Select & Continue', fr: 'Choisir & Continuer', ar: 'اختر وتابع' })}
                            <ChevronRight size={22} className="mt-0.5" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────

const OrderSubmissionFlow: React.FC<OrderSubmissionFlowProps> = ({
    isOpen,
    onClose,
    service,
    subService,
    initialCity,
    initialArea,
    onSubmit,
    continueDraft,
    mode
}) => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [step, setStep] = useState(mode === 'edit' ? 3 : (continueDraft?.step || 1));
    const [subStep1, setSubStep1] = useState<'location' | 'size' | 'description' | 'languages'>('location');
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(continueDraft?.selectedLanguages || []);
    const [descriptionDrafts, setDescriptionDrafts] = useState<string[]>([]);
    const [taskSize, setTaskSize] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [bricolers, setBricolers] = useState<Bricoler[]>([]);
    const [isLoadingBricolers, setIsLoadingBricolers] = useState(false);
    const [selectedBricolerId, setSelectedBricolerId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'all' | 'rating'>('all');
    const [viewedBricoler, setViewedBricoler] = useState<Bricoler | null>(null); // To open profile modal
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMatchingAnimation, setIsMatchingAnimation] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
    const [bankReceipt, setBankReceipt] = useState<string | null>(null);
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
    const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly'>('once');
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

    const [referralDiscountAvailable, setReferralDiscountAvailable] = useState<number>(0);
    const [applyReferralDiscount, setApplyReferralDiscount] = useState<boolean>(true);

    // Fetch referral discount when opening modal
    useEffect(() => {
        if (isOpen && auth.currentUser) {
            const fetchReferralStatus = async () => {
                try {
                    const userRef = doc(db, 'users', auth.currentUser!.uid);
                    const snap = await getDoc(userRef);
                    if (snap.exists() && snap.data().referralDiscountAvailable) {
                        setReferralDiscountAvailable(snap.data().referralDiscountAvailable || 0);
                        setApplyReferralDiscount((snap.data().referralDiscountAvailable || 0) > 0);
                    } else {
                        setReferralDiscountAvailable(0);
                        setApplyReferralDiscount(false);
                    }
                } catch (e) {
                    console.error("Error fetching referral discount:", e);
                }
            };
            fetchReferralStatus();
        }
    }, [isOpen]);

    // Auto-select today/first available date when entering step 3
    useEffect(() => {
        if (step === 3 && !selectedDate) {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            setSelectedDate(todayStr);
        }
    }, [step, selectedDate]);

    // Location Change State
    const [isSelectingLocation, setIsSelectingLocation] = useState(false);
    const [locStep, setLocStep] = useState<'city' | 'area'>('city');
    const [tempCity, setTempCity] = useState(initialCity || '');
    const [tempArea, setTempArea] = useState(initialArea || '');
    const [currentCity, setCurrentCity] = useState(initialCity || '');
    const [currentArea, setCurrentArea] = useState(initialArea || '');
    const [areaSearch, setAreaSearch] = useState('');
    const [bookedOrders, setBookedOrders] = useState<any[]>([]);
    // Refs for smooth scroll
    const descriptionSectionRef = useRef<HTMLDivElement>(null);
    // Stable draft ID for the current open session — generated once and reused on every save
    const draftIdRef = useRef<string | null>(null);

    const [isLoadingBookings, setIsLoadingBookings] = useState(false);

    const serviceConfig = useMemo(() => {
        const sKey = service?.toLowerCase().replace(/ /g, '_');
        switch (sKey) {
            case 'cleaning':
                return {
                    title: t({ en: "How large is the space?", fr: "Quelle est la taille de l'espace ?", ar: "ما هي مساحة المكان؟" }),
                    options: [
                        { id: 'small', duration: 2, label: { en: 'Studio / 1 Bedroom', fr: 'Studio / 1 Chambre', ar: 'استوديو / غرفة واحدة' }, estTime: { en: 'Est: 2 hrs', fr: 'Est: 2h', ar: 'حوالي ساعتين' }, desc: { en: 'Basic cleaning for a small space.', fr: 'Nettoyage de base pour un petit espace.', ar: 'تنظيف أساسي لمساحة صغيرة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 4, label: { en: '2-3 Bedrooms', fr: '2-3 Chambres', ar: '2-3 غرف نوم' }, estTime: { en: 'Est: 4 hrs', fr: 'Est: 4h', ar: 'حوالي 4 ساعات' }, desc: { en: 'Standard cleaning for a medium home.', fr: 'Nettoyage standard pour une maison moyenne.', ar: 'تنظيف عادي لمنزل متوسط.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 6, label: { en: '4+ Bedrooms / Deep Clean', fr: '4+ Chambres / Nettoyage profond', ar: '+4 غرف / تنظيف عميق' }, estTime: { en: 'Est: 6+ hrs', fr: 'Est: 6h+', ar: 'أكثر من 6 ساعات' }, desc: { en: 'Extensive cleaning for large homes.', fr: 'Nettoyage complet pour grandes maisons.', ar: 'تنظيف شامل للمنازل الكبيرة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'moving':
                return {
                    title: t({ en: "What's the scope of the task?", fr: "Quelle est l'ampleur de la tâche ?", ar: "ما هو حجم المهمة؟" }),
                    options: [
                        { id: 'small', duration: 2, label: { en: 'Few Items / Studio', fr: 'Quelques articles / Studio', ar: 'قطع قليلة / استوديو' }, estTime: { en: 'Est: 2 hrs', fr: 'Est: 2h', ar: 'حوالي ساعتين' }, desc: { en: 'Small move, boxes, or quick errand.', fr: 'Petit déménagement, cartons ou course rapide.', ar: 'نقل صغير، صناديق أو غرض سريع.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 4, label: { en: '1-2 Bedroom Apartment', fr: 'Appartement 1-2 Chambres', ar: 'شقة 1-2 غرف نوم' }, estTime: { en: 'Est: 4 hrs', fr: 'Est: 4h', ar: 'حوالي 4 ساعات' }, desc: { en: 'Standard move requiring a van.', fr: 'Déménagement standard nécessitant une camionnette.', ar: 'نقل عادي يتطلب شاحنة صغيرة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 8, label: { en: '3+ Bedroom / Full House', fr: '3+ Chambres / Maison entière', ar: '+3 غرف / منزل كامل' }, estTime: { en: 'Est: 8+ hrs', fr: 'Est: 8h+', ar: 'أكثر من 8 ساعات' }, desc: { en: 'Large scale move requiring multiple trips or large truck.', fr: 'Grand déménagement nécessitant un grand camion.', ar: 'نقل كبير يتطلب عدة رحلات أو شاحنة كبيرة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'errands':
            case 'courier':
                return {
                    title: t({ en: "What's the scope of the errands?", fr: "Quelle est l'ampleur des courses ?", ar: "ما هو حجم الغرض؟" }),
                    options: [
                        { id: 'small', duration: 0.416, coefficient: 1.5, label: { en: '20-30min', fr: '20-30min', ar: '20-30 دقيقة' }, estTime: { en: '≈ 25 min', fr: '≈ 25 min', ar: 'حوالي 25 دقيقة' }, desc: { en: 'Pickup or very short task nearby.', fr: 'Retrait ou tâche très courte à proximité.', ar: 'استلام أو مهمة قصيرة جداً في الجوار.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 0.833, coefficient: 2.5, label: { en: '45-55min', fr: '45-55min', ar: '45-55 دقيقة' }, estTime: { en: '≈ 50 min', fr: '≈ 50 min', ar: 'حوالي 50 دقيقة' }, desc: { en: 'Typical errand or simple shopping.', fr: 'Course typique ou achat simple.', ar: 'مشوار عادي أو تسوق بسيط.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 1.333, coefficient: 4.5, label: { en: '1h10min-1h30min', fr: '1h10min-1h30min', ar: '1 ساعة 10 دقائق - 1 ساعة 30 دقيقة' }, estTime: { en: '≈ 1h 20 min', fr: '≈ 1h 20 min', ar: 'حوالي ساعة و 20 دقيقة' }, desc: { en: 'Multiple tasks or waiting time.', fr: 'Plusieurs tâches ou temps d\'attente.', ar: 'مهام متعددة أو وقت انتظار.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'plumbing':
            case 'electricity':
            case 'appliance_installation':
                return {
                    title: t({ en: "What's the scope of the problem?", fr: "Quelle est l'ampleur du problème ?", ar: "ما هو حجم المشكلة؟" }),
                    options: [
                        { id: 'small', duration: 1, label: { en: 'Minor Issue / Quick Fix', fr: 'Problème mineur / Rapide', ar: 'مشكلة بسيطة / إصلاح سريع' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h', ar: 'حوالي ساعة' }, desc: { en: 'Simple fix like a small leak or replacing an outlet.', fr: 'Réparation simple comme une fuite ou prise.', ar: 'إصلاح بسيط مثل تسرب صغير أو تغيير مأخذ.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 2, label: { en: 'Standard / Installation', fr: 'Standard / Installation', ar: 'عادي / تركيب' }, estTime: { en: 'Est: 2-3 hrs', fr: 'Est: 2-3h', ar: '2-3 ساعات' }, desc: { en: 'New installations or moderate repairs.', fr: 'Nouvelles installations ou réparations modérées.', ar: 'تركيبات جديدة أو إصلاحات متوسطة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 4, label: { en: 'Major / Unknown', fr: 'Majeur / Inconnu', ar: 'مشكلة كبرى / غير معروف' }, estTime: { en: 'Est: 4+ hrs', fr: 'Est: 4h+', ar: 'أكثر من 4 ساعات' }, desc: { en: 'Complex issues or full system replacements.', fr: 'Problèmes complexes ou remplacements complets.', ar: 'مشاكل معقدة أو استبدال كامل للنظام.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'babysitting':
            case 'elderly_care':
                return {
                    title: t({ en: "How long is the care needed?", fr: "Quelle est la durée de garde nécessaire ?", ar: "ما هي مدة الرعاية المطلوبة؟" }),
                    options: [
                        { id: 'small', duration: 3, label: { en: 'Short Term (1-4 hrs)', fr: 'Court terme (1-4h)', ar: 'فترة قصيرة (1-4 ساعات)' }, estTime: { en: 'Est: 3 hrs', fr: 'Est: 3h', ar: 'حوالي 3 ساعات' }, desc: { en: 'Brief assistance or babysitting slot.', fr: 'Garde ou assistance de courte durée.', ar: 'مساعدة وجيزة أو جليسة أطفال لفترة قصيرة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 6, label: { en: 'Half Day (4-8 hrs)', fr: 'Demi-journée (4-8h)', ar: 'نصف يوم (4-8 ساعات)' }, estTime: { en: 'Est: 6 hrs', fr: 'Est: 6h', ar: 'حوالي 6 ساعات' }, desc: { en: 'Standard care for a morning, afternoon or evening.', fr: 'Garde standard pour une matinée, après-midi ou soirée.', ar: 'رعاية عادية للصباح أو المساء.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 10, label: { en: 'Full Day / Overnight', fr: 'Journée / Nuit', ar: 'يوم كامل / مبيت' }, estTime: { en: 'Est: 10 hrs', fr: 'Est: 10h', ar: 'حوالي 10 ساعات' }, desc: { en: 'Comprehensive care over an extended period.', fr: 'Soins complets sur une période prolongée.', ar: 'رعاية شاملة لفترة ممتدة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'furniture_assembly':
                return {
                    title: t({ en: "How much furniture needs assembly?", fr: "Combien de meubles à assembler ?", ar: "كم عدد الأثاث الذي يحتاج للتركيب؟" }),
                    options: [
                        { id: 'small', duration: 1, label: { en: '1-2 Small Items', fr: '1-2 Petits Articles', ar: '1-2 قطع صغيرة' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h', ar: 'حوالي ساعة' }, desc: { en: 'Quick assembly of simple items.', fr: 'Assemblage rapide d\'articles simples.', ar: 'تركيب سريع لقطع بسيطة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 3, label: { en: '1 Large / 3-4 Small Items', fr: '1 Grand / 3-4 Petits Articles', ar: 'قطعة كبيرة / 3-4 قطع صغيرة' }, estTime: { en: 'Est: 2-3 hrs', fr: 'Est: 2-3h', ar: '2-3 ساعات' }, desc: { en: 'Standard assembly like a bed frame or wardrobe.', fr: 'Assemblage standard (cadre de lit, grande armoire).', ar: 'تركيب عادي مثل سرير أو خزانة ملابس.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 5, label: { en: 'Full Room / Complex Items', fr: 'Pièce Complète / Articles Complexes', ar: 'غرفة كاملة / قطع معقدة' }, estTime: { en: 'Est: 4+ hrs', fr: 'Est: 4h+', ar: 'أكثر من 4 ساعات' }, desc: { en: 'Multiple large pieces or complex systems.', fr: 'Plusieurs grosses pièces ou systèmes complexes.', ar: 'عدة قطع كبيرة أو أنظمة معقدة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'handyman':
                return {
                    title: t({ en: "What is the scope of the repairs?", fr: "Quelle est l'ampleur des réparations ?", ar: "ما هو حجم الإصلاحات؟" }),
                    options: [
                        { id: 'small', duration: 1, label: { en: 'Minor Fix / Single Issue', fr: 'Petite Réparation / Problème Unique', ar: 'إصلاح بسيط / مشكلة واحدة' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h', ar: 'حوالي ساعة' }, desc: { en: 'Quick repair or adjustment.', fr: 'Réparation ou ajustement rapide.', ar: 'إصلاح أو تعديل سريع.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 3, label: { en: 'Standard Repair / Few Issues', fr: 'Réparation Standard / Quelques Problèmes', ar: 'إصلاح عادي / عدة مشاكل' }, estTime: { en: 'Est: 2-3 hrs', fr: 'Est: 2-3h', ar: '2-3 ساعات' }, desc: { en: 'Multiple small fixes or a standard project.', fr: 'Plusieurs petites réparations ou projet standard.', ar: 'عدة إصلاحات صغيرة أو مشروع عادي.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 5, label: { en: 'Multiple Repairs / Half Day', fr: 'Multiples Réparations / Demi-journée', ar: 'إصلاحات متعددة / نصف يوم' }, estTime: { en: 'Est: 4+ hrs', fr: 'Est: 4h+', ar: 'أكثر من 4 ساعات' }, desc: { en: 'Extensive repair work across the property.', fr: 'Travaux de réparation approfondis sur la propriété.', ar: 'أعمال إصلاح شاملة في العقار.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'mounting':
                return {
                    title: t({ en: "What needs to be mounted?", fr: "Que faut-il fixer ?", ar: "ما الذي يجب تركيبه؟" }),
                    options: [
                        { id: 'small', duration: 1, label: { en: '1-2 Items / Picture Frames', fr: '1-2 Articles / Cadres', ar: '1-2 قطع / إطارات صور' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h', ar: 'حوالي ساعة' }, desc: { en: 'Hanging pictures, mirrors, or small shelves.', fr: 'Accrocher des tableaux, miroirs ou petites étagères.', ar: 'تعليق صور، مرايا أو رفوف صغيرة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 2, label: { en: 'TV / Multiple Shelves', fr: 'TV / Plusieurs Étagères', ar: 'تلفاز / عدة رفوف' }, estTime: { en: 'Est: 2 hrs', fr: 'Est: 2h', ar: 'حوالي ساعتين' }, desc: { en: 'Mounting a TV or several shelving units.', fr: 'Fixation d\'une télévision ou de plusieurs meubles.', ar: 'تركيب تلفاز أو عدة رفوف.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 4, label: { en: 'Heavy Items / Custom Mount', fr: 'Articles lourds / Fixation sur mesure', ar: 'قطع ثقيلة / تركيب مخصص' }, estTime: { en: 'Est: 4+ hrs', fr: 'Est: 4h+', ar: 'أكثر من 4 ساعات' }, desc: { en: 'Oversized art, wall cabinets, or specialized mounting.', fr: 'Art surdimensionné, armoires murales ou fixations spécialisées.', ar: 'لوحات كبيرة، خزائن جدارية، أو تركيبات خاصة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'tour_guide':
                return {
                    title: t({ en: "How many people are in the group?", fr: "Combien de personnes dans le groupe ?", ar: "كم عدد الأشخاص في المجموعة؟" }),
                    options: [
                        { id: 'small', duration: 3, label: { en: 'Solo / Couple (1-2 persons)', fr: 'Solo / Couple (1-2 personnes)', ar: 'فرد / زوجين (1-2 أشخاص)' }, estTime: { en: 'Est: 3 hrs', fr: 'Est: 3h', ar: 'حوالي 3 ساعات' }, desc: { en: 'Personal tour for individual or couple.', fr: 'Visite personnalisée pour une personne ou un couple.', ar: 'جولة شخصية لفرد أو زوجين.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 4, label: { en: 'Small Group (3-5 persons)', fr: 'Petit groupe (3-5 personnes)', ar: 'مجموعة صغيرة (3-5 أشخاص)' }, estTime: { en: 'Est: 4 hrs', fr: 'Est: 4h', ar: 'حوالي 4 ساعات' }, desc: { en: 'Standard group tour for family or friends.', fr: 'Visite de groupe standard pour famille ou amis.', ar: 'جولة عادية للعائلة أو الأصدقاء.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 6, label: { en: 'Large Group (6+ persons)', fr: 'Grand groupe (6+ personnes)', ar: 'مجموعة كبيرة (+6 أشخاص)' }, estTime: { en: 'Est: 6+ hrs', fr: 'Est: 6h+', ar: 'أكثر من 6 ساعات' }, desc: { en: 'Guided tour for larger groups or organizations.', fr: 'Visite guidée pour groupes plus larges.', ar: 'جولة إرشادية للمجموعات الكبيرة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'painting':
                return {
                    title: t({ en: "What is the painting scope?", fr: "Quelle est l'ampleur de la peinture ?", ar: "ما هو حجم الصباغة؟" }),
                    options: [
                        { id: 'small', duration: 2, label: { en: 'Touch-ups / Single Wall', fr: 'Retouches / Un Seul Mur', ar: 'رتوش / حائط واحد' }, estTime: { en: 'Est: 2 hrs', fr: 'Est: 2h', ar: 'حوالي ساعتين' }, desc: { en: 'Minor paint repairs or an accent wall.', fr: 'Petites retouches de peinture ou mur d\'accent.', ar: 'إصلاحات صباغة بسيطة أو حائط واحد.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 5, label: { en: 'Single Room', fr: 'Une Seule Pièce', ar: 'غرفة واحدة' }, estTime: { en: 'Est: 4-6 hrs', fr: 'Est: 4-6h', ar: '4-6 ساعات' }, desc: { en: 'Painting walls of a standard bedroom or living room.', fr: 'Peinture de murs d\'une chambre standard ou salon.', ar: 'صباغة جدران غرفة نوم أو صالون.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 8, label: { en: 'Multiple Rooms / Exterior', fr: 'Plusieurs Pièces / Extérieur', ar: 'عدة غرف / واجهة خارجية' }, estTime: { en: 'Est: 8+ hrs', fr: 'Est: 8h+', ar: 'أكثر من 8 ساعات' }, desc: { en: 'Larger painting projects, multiple rooms or exterior work.', fr: 'Grands projets de peinture, plusieurs pièces ou extérieur.', ar: 'مشاريع صباغة كبيرة، عدة غرف أو عمل خارجي.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'gardening':
                return {
                    title: t({ en: "What gardening work is required?", fr: "Quel travail de jardinage est nécessaire ?", ar: "ما هو عمل البستنة المطلوب؟" }),
                    options: [
                        { id: 'small', duration: 2, label: { en: 'Basic Mowing / Weeding', fr: 'Tonte de Base / Désherbage', ar: 'قص عشب بسيط / إزالة أعشاب' }, estTime: { en: 'Est: 2 hrs', fr: 'Est: 2h', ar: 'حوالي ساعتين' }, desc: { en: 'Simple lawn maintenance and weed removal.', fr: 'Entretien de pelouse simple et désherbage.', ar: 'صيانة بسيطة للعشب وإزالة الأعشاب.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 4, label: { en: 'Yard Cleanup / Trimming', fr: 'Nettoyage de Cour / Taille', ar: 'تنظيف الحديقة / تشذيب' }, estTime: { en: 'Est: 4 hrs', fr: 'Est: 4h', ar: 'حوالي 4 ساعات' }, desc: { en: 'Pruning trees/shrubs and general yard tidying.', fr: 'Élagage d\'arbres/arbustes et nettoyage général.', ar: 'تقليم الأشجار وتنظيف عام للحديقة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 8, label: { en: 'Full Landscaping', fr: 'Aménagement Paysager Complet', ar: 'تنسيق كامل للحديقة' }, estTime: { en: 'Est: 8+ hrs', fr: 'Est: 8h+', ar: 'أكثر من 8 ساعات' }, desc: { en: 'Major yard overhaul, planting, or extensive clearing.', fr: 'Remise à neuf majeure, plantation ou nettoyage intensif.', ar: 'تجديد شامل للحديقة، زراعة أو تنظيف مكثف.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'glass_cleaning':
                return {
                    title: t({ en: "How many windows/surfaces?", fr: "Combien de fenêtres/surfaces ?", ar: "كم عدد النوافذ/الأسطح؟" }),
                    options: [
                        { id: 'small', duration: 2, label: { en: 'Few Windows / Minor', fr: 'Quelques Fenêtres / Mineur', ar: 'نوافذ قليلة / عمل بسيط' }, estTime: { en: 'Est: 1-2 hrs', fr: 'Est: 1-2h', ar: '1-2 ساعة' }, desc: { en: 'Cleaning glass in a small apartment or storefront.', fr: 'Nettoyage des vitres pour petit appartement ou vitrine.', ar: 'تنظيف الزجاج في شقة صغيرة أو محل تجاري.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 4, label: { en: 'Standard House', fr: 'Maison Standard', ar: 'منزل عادي' }, estTime: { en: 'Est: 3-4 hrs', fr: 'Est: 3-4h', ar: '3-4 ساعات' }, desc: { en: 'Full interior/exterior window cleaning for a typical home.', fr: 'Nettoyage complet (intérieur/extérieur) pour maison typique.', ar: 'تنظيف كامل للنوافذ (داخلي/خارجي) لمنزل عادي.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 6, label: { en: 'Large House / High glass', fr: 'Grande Maison / Vitres Hautes', ar: 'منزل كبير / نوافذ عالية' }, estTime: { en: 'Est: 6+ hrs', fr: 'Est: 6h+', ar: 'أكثر من 6 ساعات' }, desc: { en: 'Extensive glass cleaning requiring ladders or specialized tools.', fr: 'Nettoyage intensif nécessitant échelle ou outils spéciaux.', ar: 'تنظيف زجاج شامل يتطلب سلالم أو أدوات خاصة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'pool_cleaning':
                return {
                    title: t({ en: "How big is your pool?", fr: "Quelle est la taille de votre piscine ?", ar: "ما هو حجم المسبح؟" }),
                    options: [
                        { id: 'small', duration: 1, label: { en: 'Small / Plunge Pool', fr: 'Petit / Bassin de trempage', ar: 'مسبح صغير / غطس' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h', ar: 'حوالي ساعة' }, desc: { en: 'Chemical check and minor surface skimming.', fr: 'Contrôle chimique et léger écrémage de surface.', ar: 'فحص المواد الكيميائية وتنظيف سطحي بسيط.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 3, label: { en: 'Standard In-ground', fr: 'Standard enterrée', ar: 'مسبح عادي محفور' }, estTime: { en: 'Est: 2-3 hrs', fr: 'Est: 2-3h', ar: '2-3 ساعات' }, desc: { en: 'Full vacuum, filter clean, and chemical balance.', fr: 'Aspiration complète, nettoyage du filtre et équilibre chimique.', ar: 'تنظيف كامل، تنظيف الفلتر وتوازن كيميائي.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 5, label: { en: 'Large / Green-to-Clean', fr: 'Grande / Remise en état', ar: 'مسبح كبير / معالجة' }, estTime: { en: 'Est: 5+ hrs', fr: 'Est: 5h+', ar: 'أكثر من 5 ساعات' }, desc: { en: 'Extensive cleaning for large pools or water restoration.', fr: 'Nettoyage intensif pour grandes piscines ou restauration de l\'eau.', ar: 'تنظيف شامل للمسابح الكبيرة أو معالجة المياه.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'pets_care':
                return {
                    title: t({ en: "What level of care is needed?", fr: "Quel niveau de soin est nécessaire ?", ar: "ما هو مستوى الرعاية المطلوب؟" }),
                    options: [
                        { id: 'small', duration: 1, label: { en: 'Walk / Quick Visit', fr: 'Promenade / Visite rapide', ar: 'نزهة / زيارة سريعة' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h', ar: 'حوالي ساعة' }, desc: { en: '30-60 min walk or feeding check-in.', fr: 'Promenade de 30-60 min ou passage pour nourrir.', ar: 'نزهة 30-60 دقيقة أو فحص إطعام.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 4, label: { en: 'Half Day Sitting', fr: 'Garde demi-journée', ar: 'رعاية نصف يوم' }, estTime: { en: 'Est: 4 hrs', fr: 'Est: 4h', ar: '4 ساعات' }, desc: { en: 'Pet sitting and companionship for a few hours.', fr: 'Garde d\'animaux et compagnie pendant quelques heures.', ar: 'رعاية ومرافقة للحيوان لعدة ساعات.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 8, label: { en: 'Full Day / Overnight', fr: 'Journée / Nuit', ar: 'يوم كامل / مبيت' }, estTime: { en: 'Est: 8+ hrs', fr: 'Est: 8h+', ar: 'أكثر من 8 ساعات' }, desc: { en: 'Comprehensive care for the entire day or night.', fr: 'Soins complets pour toute la journée ou la nuit.', ar: 'رعاية شاملة لليوم أو الليلة بالكامل.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'driver':
            case 'private_driver':
            case 'car_rental':
            case 'airport':
            case 'transport_city':
            case 'transport_intercity':
                return {
                    title: t({ en: "How long do you need the service?", fr: "Combien de temps avez-vous besoin du service ?", ar: "كم من الوقت تحتاج الخدمة؟" }),
                    options: [
                        { id: 'small', duration: 2, label: { en: 'Short Trip (1-2 hrs)', fr: 'Trajet Court (1-2h)', ar: 'رحلة قصيرة (1-2 ساعات)' }, estTime: { en: 'Est: 1-2 hrs', fr: 'Est: 1-2h', ar: 'حوالي 1-2 ساعة' }, desc: { en: 'Quick ride or airport transfer.', fr: 'Course rapide ou transfert aéroport.', ar: 'توصيلة سريعة أو نقل للمطار.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 5, label: { en: 'Half Day (3-5 hrs)', fr: 'Demi-journée (3-5h)', ar: 'نصف يوم (3-5 ساعات)' }, estTime: { en: 'Est: 3-5 hrs', fr: 'Est: 3-5h', ar: 'حوالي 3-5 ساعات' }, desc: { en: 'Multiple stops or city tour.', fr: 'Plusieurs arrêts ou visite de la ville.', ar: 'توقفات متعددة أو جولة في المدينة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 8, label: { en: 'Full Day (8+ hrs)', fr: 'Journée Complète (8h+)', ar: 'يوم كامل (8+ ساعات)' }, estTime: { en: 'Est: 8+ hrs', fr: 'Est: 8h+', ar: 'أكثر من 8 ساعات' }, desc: { en: 'Driver available for the entire day.', fr: 'Chauffeur disponible pour toute la journée.', ar: 'سائق متاح طوال اليوم.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'cooking':
            case 'meal_prep':
                return {
                    title: t({ en: "What is the cooking scope?", fr: "Quelle est l'ampleur de la cuisine ?", ar: "ما هو حجم الطبخ؟" }),
                    options: [
                        { id: 'small', duration: 2, label: { en: 'Simple Meal', fr: 'Repas Simple', ar: 'وجبة بسيطة' }, estTime: { en: 'Est: 2 hrs', fr: 'Est: 2h', ar: 'حوالي ساعتين' }, desc: { en: 'Cooking a simple meal or doing prep.', fr: 'Préparation d\'un petit repas simple.', ar: 'طبخ وجبة بسيطة أو تحضيرات.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 4, label: { en: 'Daily Cooking / Family', fr: 'Cuisine Quotidienne', ar: 'طبخ يومي / عائلي' }, estTime: { en: 'Est: 4 hrs', fr: 'Est: 4h', ar: 'حوالي 4 ساعات' }, desc: { en: 'Cooking complete meals for a family.', fr: 'Cuisine de repas complets pour la famille.', ar: 'طبخ وجبات كاملة للعائلة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 8, label: { en: 'Batch Cooking / Event', fr: 'Événement / Grande Quant', ar: 'حدث / طبخ كميات كبيرة' }, estTime: { en: 'Est: 8+ hrs', fr: 'Est: 8h+', ar: 'أكثر من 8 ساعات' }, desc: { en: 'Cooking for an event or multiple days.', fr: 'Cuisine pour événement ou plusieurs jours.', ar: 'الطبخ لحدث أو لعدة أيام.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'learn_arabic':
                return {
                    title: t({ en: "How long applies to your session?", fr: "Quelle est la durée de la session ?", ar: "ما هي مدة الحصة؟" }),
                    options: [
                        { id: 'small', duration: 1, label: { en: '1 Hour Session', fr: 'Session d\'1 Heure', ar: 'حصة لساعة واحدة' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h', ar: 'حوالي ساعة' }, desc: { en: 'Quick conversation practice or review.', fr: 'Pratique ou révision rapide.', ar: 'مراجعة أو محادثة سريعة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 2, label: { en: '2 Hours Class', fr: 'Classe de 2 Heures', ar: 'حصة لساعتين' }, estTime: { en: 'Est: 2 hrs', fr: 'Est: 2h', ar: 'حوالي ساعتين' }, desc: { en: 'Standard class covering new material.', fr: 'Classe standard couvrant de nouvelles leçons.', ar: 'حصة عادية تشمل دروس جديدة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 4, label: { en: 'Intensive (3+ Hours)', fr: 'Intensif (3+ Heures)', ar: 'مكثف (3+ ساعات)' }, estTime: { en: 'Est: 3+ hrs', fr: 'Est: 3h+', ar: 'أكثر من 3 ساعات' }, desc: { en: 'Intensive learning or immersion session.', fr: 'Apprentissage intensif ou immersion.', ar: 'تعلم مكثف.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            default:
                return {
                    title: t({ en: "What's the size of your Task?", fr: "Quelle est la taille de votre tâche ?", ar: "ما هو حجم المهمة؟" }),
                    options: TASK_SIZES.map(s => ({
                        ...s,
                        icon: s.id === 'small' ? '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' :
                            s.id === 'medium' ? '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' :
                                '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp'
                    }))
                };
        }
    }, [service, t]);

    const activeTaskSize = serviceConfig.options.find(s => s.id === taskSize);
    const selectedPro = bricolers.find(b => b.id === selectedBricolerId);

    // Reset or Load Draft when opened
    useEffect(() => {
        if (isOpen) {
            // Initialize stable draft ID once per open session
            if (!draftIdRef.current) {
                draftIdRef.current = continueDraft?.id || "draft_" + Date.now() + "_" + service;
            }

            if (continueDraft) {
                setStep(continueDraft.step);
                setSubStep1(continueDraft.subStep1);
                setTaskSize(continueDraft.taskSize);
                setDescription(continueDraft.description);
                setSelectedBricolerId(continueDraft.selectedBricolerId);
                setSelectedDate(continueDraft.selectedDate);
                setSelectedTime(continueDraft.selectedTime);
                setPaymentMethod(continueDraft.paymentMethod);
                setBankReceipt(continueDraft.bankReceipt);
                setFrequency(continueDraft.frequency || 'once');
                setCurrentCity(continueDraft.city);
                setCurrentArea(continueDraft.area);
                setTempCity(continueDraft.city);
                setTempArea(continueDraft.area);
            } else {
                setStep(1);
                setSubStep1('location');
                setTaskSize(null);
                setDescription('');
                setSelectedBricolerId(null);
                setViewedBricoler(null);
                setSelectedDate(null);
                setSelectedTime(null);
                setPaymentMethod('cash');
                setBankReceipt(null);
                setFrequency('once');
                setIsSelectingLocation(false);
                setCurrentCity(initialCity || '');
                setCurrentArea(initialArea || '');
                setTempCity(initialCity || '');
                setTempArea(initialArea || '');
            }
            fetchBricolers();
            document.body.style.overflow = 'hidden';
        } else {
            // Reset stable draft ID on close so next open gets a fresh one
            draftIdRef.current = null;
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen, service, initialCity, initialArea, continueDraft]);

    // Save Draft logic
    useEffect(() => {
        if (!isOpen) return;

        // Skip saving if it's the very initial empty state of step 1 location
        if (step === 1 && subStep1 === 'location' && !taskSize && !description) return;

        const draftData: DraftOrder = {
            id: draftIdRef.current || continueDraft?.id || "draft_" + Date.now() + "_" + service,
            service,
            subService: subService || undefined,
            city: currentCity,
            area: currentArea,
            taskSize,
            description,
            selectedBricolerId,
            selectedDate,
            selectedTime,
            paymentMethod,
            bankReceipt,
            frequency,
            step,
            subStep1,
            updatedAt: Date.now()
        };

        const saveDraft = () => {
            try {
                const existingDraftsJson = localStorage.getItem('lbricol_order_drafts');
                let drafts: DraftOrder[] = existingDraftsJson ? JSON.parse(existingDraftsJson) : [];

                // Remove existing version of this draft
                drafts = drafts.filter(d => d.id !== draftData.id);
                // Add new version at the beginning
                drafts.unshift(draftData);
                // Limit to 5 drafts
                drafts = drafts.slice(0, 5);

                localStorage.setItem('lbricol_order_drafts', JSON.stringify(drafts));
            } catch (e) {
                console.error("Error saving draft:", e);
            }
        };

        const timer = setTimeout(saveDraft, 1000); // Debounce saves
        return () => clearTimeout(timer);
    }, [
        isOpen, service, subService, currentCity, currentArea,
        taskSize, description, selectedBricolerId, selectedDate,
        step, subStep1, paymentMethod, bankReceipt, frequency, selectedTime
    ]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('lbricol_description_drafts');
            if (saved) {
                setDescriptionDrafts(JSON.parse(saved));
            }
        } catch (e) { }
    }, []);

    useEffect(() => {
        fetchBricolers();
    }, [currentCity, currentArea]);

    // Fetch existing bookings for the selected pro to accurately show availability dots
    useEffect(() => {
        const fetchBookings = async () => {
            if (!selectedBricolerId || !selectedBricolerId.startsWith('pro-') || selectedBricolerId === 'open') return;
            setIsLoadingBookings(true);
            try {
                const todayStr = new Date().toISOString().split('T')[0];
                const q = query(
                    collection(db, 'jobs'),
                    where('bricolerId', '==', selectedBricolerId),
                    where('date', '>=', todayStr)
                );
                const snap = await getDocs(q);
                const list = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(d => !['cancelled', 'rejected'].includes(d.status));
                setBookedOrders(list);
            } catch (err: any) {
                console.warn("Error fetching bookings:", err);
            } finally {
                setIsLoadingBookings(false);
            }
        };

        fetchBookings();
    }, [selectedBricolerId]);

    const handleStartMatching = () => {
        if (!taskSize || !description.trim()) return;

        try {
            const drafts = [description.trim(), ...descriptionDrafts.filter(d => d !== description.trim())].slice(0, 5);
            setDescriptionDrafts(drafts);
            localStorage.setItem('lbricol_description_drafts', JSON.stringify(drafts));
        } catch (e) { }

        setStep(2);
        setIsMatchingAnimation(true);
        setSelectedBricolerId(null);
        fetchBricolers();

        setTimeout(() => {
            setIsMatchingAnimation(false);
        }, 3500); // 3.5 seconds search
    };

    // ── Image helpers ─────────────────────────────────────────────────────────
    const uploadImageToStorage = async (file: Blob | File, path: string) => {
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file, { contentType: 'image/jpeg' });
        return await getDownloadURL(storageRef);
    };


    const safeParseDate = (dateStr: string | null) => {
        if (!dateStr) return new Date();
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const getHeroFallbackSlots = (profile: any, date: Date) => {
        const routine = profile?.routine;
        // If Bricoler has ANY routine configuration, use it as the fallback
        if (routine && typeof routine === 'object' && Object.keys(routine).length > 0) {
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayKey = dayNames[date.getDay()];
            const dayRoutine = routine[dayKey];

            if (dayRoutine && dayRoutine.active) {
                return [{ from: dayRoutine.from, to: dayRoutine.to }];
            }
            // If they have a routine but this specific day is inactive or not defined, they are not available
            return [];
        }

        // Default fallback if neither scheduled slots nor weekly routine is used
        return [{ from: '10:00', to: '17:00' }];
    };

    const timeToMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };

    const minutesToTime = (m: number) => {
        const h = Math.floor(m / 60);
        const mm = m % 60;
        return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
    };

    const getAvailableSlotsForDate = (dateStr: string, profile: any) => {
        if (!profile || !activeTaskSize) return [];

        const blocksRaw = (profile as any).calendarSlots?.[dateStr] || (profile as any).availability?.[dateStr];
        // If blocksRaw is an array (even empty), it means the provider explicitly set availability for this day
        const blocks = Array.isArray(blocksRaw)
            ? blocksRaw
            : getHeroFallbackSlots(profile, safeParseDate(dateStr));

        if (blocks.length === 0) return [];

        const duration = activeTaskSize.duration || 1;
        const durationMin = duration * 60;

        const slots: string[] = [];

        // 1. Sort blocks by start time
        const sortedBlocks = [...blocks].sort((a, b) => a.from.localeCompare(b.from));

        // 2. Merge contiguous or overlapping blocks
        const mergedBlocks: { from: string; to: string }[] = [];
        if (sortedBlocks.length > 0) {
            let currentBlock = { ...sortedBlocks[0] };
            for (let i = 1; i < sortedBlocks.length; i++) {
                if (sortedBlocks[i].from <= currentBlock.to) {
                    if (sortedBlocks[i].to > currentBlock.to) {
                        currentBlock.to = sortedBlocks[i].to;
                    }
                } else {
                    mergedBlocks.push(currentBlock);
                    currentBlock = { ...sortedBlocks[i] };
                }
            }
            mergedBlocks.push(currentBlock);
        }

        // 3. Generate start times from merged blocks
        mergedBlocks.forEach((block) => {
            let current = timeToMinutes(block.from);
            const endLimit = timeToMinutes(block.to);

            while (current + durationMin <= endLimit) {
                slots.push(minutesToTime(current));
                current += 60; // Offer slots every hour
            }
        });

        // 4. Filter out booked slots for this date
        return slots.filter(slot => !isSlotBookedOnDate(slot, dateStr));
    };

    const generateAvailableSlots = () => {
        if (!selectedDate || !selectedPro) return [];
        return getAvailableSlotsForDate(selectedDate, selectedPro);
    };

    const isSlotBookedOnDate = (startTimeStr: string, dateStr: string) => {
        if (!activeTaskSize) return false;
        const start = timeToMinutes(startTimeStr);
        const end = start + (activeTaskSize.duration * 60);

        return bookedOrders.some(order => {
            if (order.date !== dateStr) return false;
            if (!order.time || order.time === 'Flexible') return false;

            const oStart = timeToMinutes(order.time);
            const oDuration = (TASK_SIZES.find(s => s.id === order.taskSize)?.duration || 1) * 60;
            const oEnd = oStart + oDuration;

            return (start < oEnd) && (oStart < end);
        });
    };

    const isSlotBooked = (startTimeStr: string) => {
        if (!selectedDate) return false;
        return isSlotBookedOnDate(startTimeStr, selectedDate);
    };

    const fetchBricolers = async () => {
        if (!currentCity || !service) return;
        setIsLoadingBricolers(true);

        try {
            const baseCity = currentCity.trim();

            // Query active bricolers in this city
            const q = query(
                collection(db, 'bricolers'),
                where('city', '==', baseCity)
            );

            const snap = await getDocs(q);
            const listMap = new Map<string, Bricoler>();

            const targetSvc = getServiceById(service);
            const targetServiceId = targetSvc?.id?.toLowerCase() || service?.toLowerCase() || '';

            snap.docs.forEach(docSnap => {
                const data = docSnap.data();

                // 0. Only active bricolers
                if (data.isActive !== true) return;

                // 1. Area Matching
                let servesArea = true;
                if (currentArea) {
                    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
                    const targetAreaNorm = normalize(currentArea);
                    const proAreas = [...(data.workAreas || []), ...(data.areas || [])].map(a => normalize(String(a)));

                    // Check if any pro area contains the target area or vice versa
                    servesArea = proAreas.some(pa => pa.includes(targetAreaNorm) || targetAreaNorm.includes(pa)) || proAreas.includes('all') || proAreas.includes('toute_la_ville');

                    // Small cities like Essaouira show all pros in city. 
                    // Large cities remain strict to ensure proximity for the pro.
                    const isStrictCity = ['Casablanca', 'Marrakech'].includes(baseCity);
                    if (!servesArea && isStrictCity) return;
                }

                // 2. Direct Service Category Matching
                const matchingService = data.services?.find((s: any) => {
                    // Support both categoryId (new) and serviceId (legacy)
                    const sId = typeof s === 'string' ? s : (s.categoryId || s.serviceId || '');
                    const catMatch = sId.toLowerCase() === targetServiceId;
                    if (!catMatch) return false;

                    // CHECK: Service must be Active (toggled on in portfolio)
                    if (typeof s === 'object' && s.isActive === false) return false;

                    // If sub-service is specified, verify it matches
                    if (subService) {
                        if (typeof s === 'string') return true; // Assume match for legacy string-only services
                        const ssId = s.subServiceId || (s.subServices?.includes(subService) ? subService : null);
                        if (!ssId) return false;
                        return ssId.toLowerCase() === subService.toLowerCase() || (Array.isArray(s.subServices) && s.subServices.includes(subService));
                    }
                    // 2.1 Language Matching for Tour Guide
                    if (service === 'tour_guide' && selectedLanguages.length > 0) {
                        const bricolerLangs = s.spokenLanguages || (typeof s === 'object' ? s.languages : []) || [];
                        const hasLangMatch = selectedLanguages.some(l => bricolerLangs.includes(l));
                        if (!hasLangMatch) return false;
                    }

                    return true;
                });

                if (matchingService) {
                    listMap.set(docSnap.id, {
                        id: docSnap.id,
                        displayName: data.displayName || 'Bricoler',
                        photoURL: data.profilePhotoURL || data.avatar || data.photoURL,
                        rating: data.rating || 0,
                        completedJobs: data.completedJobs || 0,
                        hourlyRate: (typeof matchingService === 'object' ? matchingService.hourlyRate : null) || data.hourlyRate || 75,
                        quickPitch: (typeof matchingService === 'object' ? matchingService.pitch : null) || data.quickPitch,
                        city: data.city,
                        areas: data.workAreas || data.areas || [],
                        isVerified: data.isVerified,
                        services: data.services || [],
                        routine: data.routine || {},
                        calendarSlots: data.calendarSlots || {},
                        availability: data.calendarSlots || {}, // Legacy fallback
                        bio: data.bio,
                        glassCleaningEquipments: data.glassCleaningEquipments || [],
                        serviceEquipments: typeof matchingService === 'object' ? matchingService.equipments : [],
                        yearsOfExperience: (typeof matchingService === 'object' ? matchingService.experience : null) || data.yearsOfExperience || data.experience,
                        isActive: true,
                        reviews: data.reviews || [],
                        portfolio: data.portfolio || [],
                        errandsTransport: data.errandsTransport,
                        movingTransport: data.movingTransport,
                        whatsappNumber: data.whatsappNumber,
                        servesArea: servesArea,
                    });
                }
            });

            // 4. Sorting & Prioritization
            const sorted = Array.from(listMap.values()).sort((a, b) => {
                // Priority 1: Area Coverage
                if (a.servesArea && !b.servesArea) return -1;
                if (!a.servesArea && b.servesArea) return 1;

                // Priority 2: Rating & Expertise (Score)
                const aRating = a.rating || 0;
                const bRating = b.rating || 0;
                const aJobs = a.completedJobs || 0;
                const bJobs = b.completedJobs || 0;

                const aScore = aRating * Math.log10(aJobs + 2);
                const bScore = bRating * Math.log10(bJobs + 2);

                return bScore - aScore;
            });

            setBricolers(sorted);
            if (sorted.length > 0) {
                playMatchSound();
            }
        } catch (err) {
            console.error("Error fetching bricolers:", err);
            setBricolers([]);
        } finally {
            setIsLoadingBricolers(false);
        }
    };

    const sortedBricolers = useMemo(() => {
        return [...bricolers].sort((a, b) => {
            const calculateScore = (p: Bricoler) => {
                let score = 0;

                // 1. Area Match Priority (Big boost: +60 pts)
                // This makes them appear higher but can be overcome by someone much better rated
                if (p.servesArea) score += 60;

                // 2. Rating Score (Rating * 20 = up to 100 pts)
                // We use a baseline of 4.0 if no rating yet to give new pros a chance
                const effectiveRating = (p.rating && p.rating > 0) ? p.rating : 4.0;
                score += effectiveRating * 20;

                // 3. Experience/Volume (up to 30 pts)
                score += Math.min(p.completedJobs || 0, 30);

                // 4. Trust/Verification (+15 pts)
                if (p.isVerified) score += 15;

                return score;
            };

            const scoreA = calculateScore(a);
            const scoreB = calculateScore(b);

            // Primary sort by weighted score
            if (scoreA !== scoreB) return scoreB - scoreA;

            // Fallback to pure rating if scores tie
            return (b.rating || 0) - (a.rating || 0);
        });
    }, [bricolers]);

    const filteredAreas = useMemo(() => {
        const all = tempCity ? MOROCCAN_CITIES_AREAS[tempCity] || [] : [];
        if (!areaSearch.trim()) return all;
        return all.filter(a => a.toLowerCase().includes(areaSearch.toLowerCase()));
    }, [tempCity, areaSearch]);

    const handleLocationSave = (city?: string, area?: string) => {
        const finalCity = city !== undefined ? city : tempCity;
        const finalArea = area !== undefined ? area : tempArea;
        setCurrentCity(finalCity);
        setCurrentArea(finalArea);
        setIsSelectingLocation(false);
    };

    const handleFinalSubmit = async () => {
        if (isSubmitting) return;

        // Note: Removed the isUploadingTaskImages block because uploads are now backgrounded.
        if (isUploadingReceipt) {
            alert(t({ en: 'Please wait for the receipt photo to finish uploading...', fr: 'Veuillez patienter pendant le téléchargement de la photo du reçu...', ar: 'يرجى الانتظار حتى يتم تحميل صورة الإيصال...' }));
            return;
        }

        // Note: Removed bankReceipt requirement because uploads are disabled.
        // if (paymentMethod === 'bank' && !bankReceipt) {
        //     alert(t({ en: 'Please upload your transfer receipt before programming the mission.', fr: 'Veuillez télécharger votre reçu de virement avant de programmer la mission.', ar: 'يرجى تحميل إيصال التحويل قبل برمجة المهمة.' }));
        //     return;
        // }

        // Requirement: Must have whatsapp number
        const user = auth.currentUser;
        if (!user) {
            // Should probably trigger auth, but for now we follow user instruction:
            // "If they haven't signup and entered Whatsapp number, they should when they click Program"
            // We can't trigger the page.tsx popups easily here without props. 
            // I'll assume for now we proceed but ideally this should be handled by page.tsx onSubmit.
            // Actually, the page.tsx handles the submission. 
            // So if I call onSubmit(orderData), page.tsx will receive it.
        }

        setIsSubmitting(true);
        try {
            const hourlyRate = selectedPro?.hourlyRate || 75;
            const activeOption = serviceConfig.options.find(o => o.id === taskSize);
            const duration = activeOption?.duration || 1;
            const coefficient = (activeOption as any)?.coefficient || (service === 'errands' ? 1.5 : 1);

            let basePrice = hourlyRate * duration;
            let multiplier = 1;
            const sizeIndex = serviceConfig.options.findIndex(s => s.id === taskSize);
            if (sizeIndex === 1) multiplier = 0.95;
            else if (sizeIndex === 2) multiplier = 0.9;

            let discountedBasePrice = basePrice * multiplier;
            let serviceFee = discountedBasePrice * 0.15;
            let totalPrice = discountedBasePrice + serviceFee;

            // Special case: Errands 
            // Total Price = (Min Rate * Coefficient) + Company Fee
            if (service === 'errands') {
                const taskPortion = hourlyRate * coefficient;
                serviceFee = taskPortion * 0.15;
                totalPrice = taskPortion + serviceFee;
                discountedBasePrice = taskPortion;
            }

            const getBricolerRankLabel = (pro: any): 'New' | 'Classic' | 'Pro' | 'Elite' => {
                const jobs = Math.max(pro.completedJobs || 0, (pro.reviews || []).length);
                const rating = (pro.rating && pro.rating > 0)
                    ? pro.rating
                    : (pro.reviews && pro.reviews.length > 0
                        ? (pro.reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / pro.reviews.length)
                        : 0);

                const verified = pro.isVerified || false;
                const personalityPassed = (pro.servicePrideScore || 0) >= 80 && (pro.happyMakingScore || 0) >= 80;

                if (jobs > 40 && rating >= 4.5 && verified && personalityPassed) return 'Elite';
                if (jobs >= 20 && rating >= 4.4) return 'Pro';
                if (jobs >= 10) return 'Classic';
                return 'New';
            };

            const orderData = {
                service: service,
                subService: subService || null,
                serviceId: service,
                subServiceId: subService || '',
                serviceName: getServiceById(service)?.name || 'Service',
                subServiceName: subService ? (getSubServiceName(service, subService) || subService) : '',
                city: currentCity,
                area: currentArea,
                taskSize,
                description,
                bricolerId: selectedBricolerId === 'open' ? null : selectedBricolerId,
                bricolerName: selectedPro?.displayName || null,
                bricolerAvatar: selectedPro?.photoURL || null,
                bricolerRating: selectedPro?.rating || null,
                bricolerRank: selectedPro ? getBricolerRankLabel(selectedPro) : null,
                bricolerJobsCount: selectedPro?.completedJobs || null,
                bricolerWhatsApp: selectedPro?.whatsappNumber || null,
                status: 'pending',
                date: selectedDate || 'Flexible',
                time: selectedTime || 'Flexible',
                duration,
                basePrice,
                serviceFee,
                totalPrice: applyReferralDiscount && referralDiscountAvailable > 0 ? Math.max(0, totalPrice * 0.85) : totalPrice,
                price: applyReferralDiscount && referralDiscountAvailable > 0 ? Math.max(0, totalPrice * 0.85) : totalPrice,
                referralApplied: applyReferralDiscount && referralDiscountAvailable > 0,
                images: [],
                clientNeedImages: [],
                paymentMethod,
                bankReceipt: null,
                frequency,
                createdAt: serverTimestamp()
            };

            await onSubmit(orderData);
            setShowSuccessAnimation(true);

            // Clear draft on success
            const draftId = continueDraft?.id;
            if (draftId) {
                try {
                    const existingDraftsJson = localStorage.getItem('lbricol_order_drafts');
                    if (existingDraftsJson) {
                        let drafts: DraftOrder[] = JSON.parse(existingDraftsJson);
                        drafts = drafts.filter(d => d.id !== draftId);
                        localStorage.setItem('lbricol_order_drafts', JSON.stringify(drafts));
                    }
                } catch (e) { }
            } else {
                // Also try to clear any draft matching this service/subservice if no id
                try {
                    const existingDraftsJson = localStorage.getItem('lbricol_order_drafts');
                    if (existingDraftsJson) {
                        let drafts: DraftOrder[] = JSON.parse(existingDraftsJson);
                        drafts = drafts.filter(d => !(d.service === service && d.subService === subService));
                        localStorage.setItem('lbricol_order_drafts', JSON.stringify(drafts));
                    }
                } catch (e) { }
            }
        } catch (err) {
            console.error("Submission error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNext = () => {
        if (step === 2) {
            if (selectedBricolerId === 'open') {
                handleFinalSubmit();
            } else {
                setStep(3);
            }
        } else if (step === 3) {
            setStep(4);
        } else {
            setStep(step + 1);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[3000] bg-white flex flex-col overflow-hidden h-[100dvh] w-screen pointer-events-auto"
            >
                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
                    className="flex-1 min-h-0 flex flex-col bg-white relative"
                >
                    {/* Minimalist Floating Close Button */}
                    {!isSelectingLocation && (
                        <button
                            onClick={onClose}
                            className="absolute right-4 top-4 z-[3010] flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F7F7] transition-transform active:scale-90 sm:right-6 sm:top-6"
                        >
                            <X size={20} strokeWidth={3} className="text-black" />
                        </button>
                    )}

                    {/* Content Section */}
                    <div className={cn(
                        "relative flex-1 min-h-0 overflow-y-auto px-4 pb-4 overscroll-contain touch-pan-y sm:px-8",
                        !isSelectingLocation ? "pt-20 sm:pt-16" : "pt-4"
                    )}>
                        <AnimatePresence mode="wait">
                            {isSelectingLocation ? (
                                <motion.div
                                    key="loc-sel"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="flex flex-col h-full bg-white -mx-6 -my-4 px-6 py-6"
                                >
                                    <div className="flex items-center gap-3 px-1 pt-4 pb-6 bg-white flex-shrink-0 safe-top">
                                        <button
                                            onClick={() => locStep === 'area' ? setLocStep('city') : setIsSelectingLocation(false)}
                                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
                                        >
                                            <ChevronLeft size={24} className="text-neutral-900" />
                                        </button>
                                        <div className="flex-1 relative">
                                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder={locStep === 'city' ? t({ en: 'Search city...', fr: 'Rechercher une ville...', ar: 'ابحث عن مدينة...' }) : t({ en: 'Search area...', fr: 'Rechercher un quartier...', ar: 'ابحث عن منطقة...' })}
                                                className="w-full bg-[#F2F2F2] h-11 pl-11 pr-10 rounded-full text-[15px] font-bold outline-none focus:ring-2 focus:ring-[#00A082]/20"
                                                value={areaSearch}
                                                onChange={e => setAreaSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto no-scrollbar pt-2 space-y-1">
                                        <AnimatePresence mode="popLayout">
                                            {locStep === 'city' ? (
                                                MOROCCAN_CITIES
                                                    .filter(c => c.toLowerCase().includes(areaSearch.toLowerCase()))
                                                    .map((city, idx) => (
                                                        <motion.button
                                                            key={city}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                                                            onClick={() => { setTempCity(city); setTempArea(''); setLocStep('area'); setAreaSearch(''); }}
                                                            className="w-full text-left py-4 px-1 active:bg-neutral-50 transition-colors border-b border-neutral-50 last:border-0"
                                                        >
                                                            <p className="text-[17px] font-black text-neutral-900">{city}</p>
                                                            <p className="text-[13px] font-semibold text-neutral-400 mt-0.5">{t({ en: 'Morocco', fr: 'Maroc', ar: 'المغرب' })}</p>
                                                        </motion.button>
                                                    ))
                                            ) : (
                                                <>
                                                    {areaSearch.trim() && !filteredAreas.some(a => a.toLowerCase() === areaSearch.trim().toLowerCase()) && (
                                                        <motion.button
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            onClick={() => {
                                                                const newArea = areaSearch.trim();
                                                                setTempArea(newArea);
                                                                handleLocationSave(tempCity, newArea);
                                                            }}
                                                            className="w-full text-left py-4 px-1 active:bg-neutral-50 transition-colors border-2 border-dashed border-[#00A082]/30 rounded-[12px] mb-2"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-[#00A082]/10 flex items-center justify-center">
                                                                    <Plus size={16} className="text-[#00A082]" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[17px] font-black text-[#00A082]">{t({ en: 'Add', fr: 'Ajouter', ar: 'إضافة' })} &quot;{areaSearch.trim()}&quot;</p>
                                                                    <p className="text-[13px] font-semibold text-neutral-400">{tempCity}</p>
                                                                </div>
                                                            </div>
                                                        </motion.button>
                                                    )}
                                                    {filteredAreas.map((area, idx) => (
                                                        <motion.button
                                                            key={area}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                                                            onClick={() => { setTempArea(area); handleLocationSave(tempCity, area); }}
                                                            className="w-full text-left py-4 px-1 active:bg-neutral-50 transition-colors border-b border-neutral-50 last:border-0"
                                                        >
                                                            <p className="text-[17px] font-black text-neutral-900">{area}</p>
                                                            <p className="text-[13px] font-semibold text-neutral-400 mt-0.5">{tempCity}, {t({ en: 'Morocco', fr: 'Maroc', ar: 'المغرب' })}</p>
                                                        </motion.button>
                                                    ))}
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            ) : step === 1 ? (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                    className="space-y-8"
                                >
                                    {/* Service Indicator Pill */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.1, duration: 0.4 }}
                                        className="flex justify-center mt-2 mb-2"
                                    >
                                        <div className="inline-flex items-center gap-2 bg-[#FCEBA4] px-4 py-2 rounded-[20px] border border-[#DECD85]/50 shadow-sm shadow-[#FCEBA4]/20">
                                            {(() => {
                                                const activeService = getServiceById(service);
                                                const serviceIconMap: Record<string, string> = {
                                                    cleaning: 'CleaningVector.png',
                                                    electricity: 'ElectricityVector.png',
                                                    plumbing: 'PlumbingVector.png',
                                                    painting: 'Paintingvector.png',
                                                    handyman: 'HandymanVector.png',
                                                    furniture_assembly: 'AsssemblyVector.png',
                                                    moving: 'MovingHelpVector.png',
                                                    gardening: 'GardeningVector.png',
                                                    mounting: 'MountingVector.png',
                                                    babysitting: 'babysettingnVector.png',
                                                    errands: 'homerepairVector.png',
                                                };
                                                const iconName = activeService ? serviceIconMap[activeService.id] || 'homerepairVector.png' : 'homerepairVector.png';
                                                return <img src={"/Images/Service Category vectors/" + iconName} className="w-4 h-4 object-contain" />;
                                            })()}
                                            <span className="text-[13px] font-semibold text-neutral-900 whitespace-nowrap opacity-90">
                                                {t({ en: getServiceById(service)?.name || '', fr: getServiceById(service)?.name || '' })} {subService ? "› " + t({ en: getSubServiceName(service, subService) || '', fr: getSubServiceName(service, subService) || '' }) : ''}
                                            </span>
                                        </div>
                                    </motion.div>

                                    {/* Dynamic Step 1 Sub-sections */}
                                    <AnimatePresence mode="wait">
                                        {subStep1 === 'location' && (
                                            <motion.div
                                                key="sub-loc"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.25, ease: "easeOut" }}
                                                className="space-y-4 pt-30"
                                            >
                                                <motion.h4
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.1 }}
                                                    className="text-[20px] font-bold text-black ml-1"
                                                >
                                                    {(service === 'moving' || service === 'errands')
                                                        ? t({ en: 'Pickup Location', fr: 'Lieu de départ', ar: 'موقع الاستلام' })
                                                        : t({ en: 'Select your location', fr: 'Sélectionnez votre lieu d\'intervention', ar: 'اختر موقعك' })}
                                                </motion.h4>
                                                <motion.div
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.2, type: "spring", damping: 20 }}
                                                    className="flex flex-col gap-4 rounded-[12px] border border-[#00A082]/10 bg-[#FFFFFF] px-4 py-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between"
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <img src="/Images/LocationFlag_VI.webp" className="w-[52px] h-auto object-contain" />
                                                        <div className="flex min-w-0 flex-col">
                                                            <p className="text-[12px] font-medium text-neutral-500 leading-none mb-1">{t({ en: 'Location', fr: 'Lieu d\'intervention', ar: 'الموقع' })}</p>
                                                            <p className="text-[16px] font-semibold leading-tight text-[#2D2D2D]">
                                                                {currentCity}{currentArea ? ", " + currentArea : ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => { setTempCity(currentCity); setTempArea(currentArea); setIsSelectingLocation(true); setLocStep('city'); setAreaSearch(''); }}
                                                        className="self-start whitespace-nowrap px-1 text-[18px] font-semibold text-[#00A082] transition-opacity hover:opacity-70 min-[420px]:self-auto sm:text-[20px]"
                                                    >
                                                        {t({ en: 'Edit', fr: 'Modifier', ar: 'تعديل' })}
                                                    </button>
                                                </motion.div>
                                            </motion.div>
                                        )}

                                        {subStep1 === 'languages' && (
                                            <motion.div
                                                key="sub-lang"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.25, ease: "easeOut" }}
                                                className="space-y-4 pt-20"
                                            >
                                                <motion.h4
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.05 }}
                                                    className="text-[25px] font-bold text-black ml-1"
                                                >
                                                    {t({ en: "Preferred Language", fr: "Langue préférée", ar: "اللغة المفضلـة" })}
                                                </motion.h4>
                                                <p className="text-neutral-500 text-[15px] font-medium ml-1">
                                                    {t({
                                                        en: "Select the language you want your tour guide to speak.",
                                                        fr: "Sélectionnez la langue que vous souhaitez que votre guide parle.",
                                                        ar: "اختر اللغة التي تريد أن يتحدث بها مرشدك السياحي."
                                                    })}
                                                </p>
                                                <div className="flex flex-col gap-3">
                                                    {[
                                                        { id: 'arabic', label: { en: 'Arabic', fr: 'Arabe', ar: 'العربية' } },
                                                        { id: 'english', label: { en: 'English', fr: 'Anglais', ar: 'الإنجليزية' } },
                                                        { id: 'french', label: { en: 'French', fr: 'Français', ar: 'الفرنسية' } },
                                                        { id: 'spanish', label: { en: 'Spanish', fr: 'Espagnol', ar: 'الإسبانية' } },
                                                    ].map((lang, idx) => {
                                                        const isSelected = selectedLanguages.includes(lang.id);
                                                        return (
                                                            <motion.button
                                                                key={lang.id}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: 0.1 + idx * 0.05 }}
                                                                onClick={() => {
                                                                    const next = isSelected
                                                                        ? selectedLanguages.filter(l => l !== lang.id)
                                                                        : [...selectedLanguages, lang.id];
                                                                    setSelectedLanguages(next);
                                                                }}
                                                                className={cn(
                                                                    "flex items-center justify-between p-6 rounded-[20px] transition-all",
                                                                    isSelected ? "bg-[#E6F6F2] border-2 border-[#00A082]" : "bg-neutral-50/40 border border-neutral-100 hover:border-neutral-200"
                                                                )}
                                                            >
                                                                <span className="text-[18px] font-bold text-neutral-900">{t(lang.label)}</span>
                                                                {isSelected && <div className="w-6 h-6 rounded-full bg-[#00A082] flex items-center justify-center"><Check size={14} className="text-white" strokeWidth={4} /></div>}
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}

                                        {subStep1 === 'size' && (
                                            <motion.div
                                                key="sub-size"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.25, ease: "easeOut" }}
                                                className="space-y-4 pt-20"
                                            >
                                                <motion.h4
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.05 }}
                                                    className="text-[25px] font-bold text-black ml-1"
                                                >
                                                    {serviceConfig.title}
                                                </motion.h4>
                                                <div className="flex flex-col gap-4">
                                                    {serviceConfig.options.map((size, idx) => (
                                                        <motion.button
                                                            key={size.id}
                                                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            transition={{
                                                                type: "spring",
                                                                damping: 20,
                                                                stiffness: 250,
                                                                delay: 0.1 + idx * 0.08
                                                            }}
                                                            onClick={() => {
                                                                setTaskSize(size.id);
                                                                setTimeout(() => setSubStep1('description'), 250);
                                                            }}
                                                            className={cn(
                                                                "flex flex-col gap-3 p-8 rounded-[20px] text-left transition-all",
                                                                taskSize === size.id ? "bg-[#F7F6F6] border-2 border-[#00A082] shadow-sm" : "bg-neutral-50/40 border border-neutral-100 hover:border-[#008C74]/30"
                                                            )}
                                                        >

                                                            <div className="flex-1 relative">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[20px] font-bold text-neutral-900 leading-none">{t(size.label as any)}</span>
                                                                    </div>
                                                                    <span className="text-[16px] font-black text-[#00A082] bg-[#00A082]/10 px-4 py-2 rounded-xl whitespace-nowrap">
                                                                        ≈ {t(size.estTime as any)}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[17px] text-black font-medium leading-normal opacity-70 max-w-[90%]">{t(size.desc as any)}</p>

                                                                {/* Discount Badge at Top Right */}
                                                                {idx === 1 && (
                                                                    <div className="absolute -top-10 -right-4 rotate-3 px-3 py-1.5 rounded-[12px] bg-[#FFC244] text-black text-[13px] font-black shadow-lg shadow-[#FFC244]/20 border border-white/20">
                                                                        -5%
                                                                    </div>
                                                                )}
                                                                {idx === 2 && (
                                                                    <div className="absolute -top-10 -right-4 -rotate-3 px-3 py-1.5 rounded-[12px] bg-[#9F7AEA] text-white text-[13px] font-black shadow-lg shadow-[#9F7AEA]/20 border border-white/20">
                                                                        -10%
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}

                                        {subStep1 === 'description' && (
                                            <motion.div
                                                key="sub-desc"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.25, ease: "easeOut" }}
                                                className="space-y-4 pt-30 pb-12"
                                            >
                                                <motion.h4
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.05 }}
                                                    className="text-[25px] font-bold text-black ml-1"
                                                >
                                                    {t({ en: 'Describe What you need', fr: 'Décrivez votre besoin', ar: 'صف ما تحتاجه' })}
                                                </motion.h4>
                                                {(service === 'moving' || service === 'errands') && (
                                                    <motion.p
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: 0.15 }}
                                                        className="text-[13.5px] text-[#00A082] font-bold ml-1 -mt-3 mb-1"
                                                    >
                                                        {t({ en: '* Please include drop-off address and stairs/elevator details.', fr: '* Veuillez indiquer le lieu d\'arrivée et les détails (escaliers, etc.).', ar: '* يرجى تضمين عنوان التوصيل وتفاصيل السلالم/المصعد.' })}
                                                    </motion.p>
                                                )}

                                                <motion.div
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.2 }}
                                                    className="space-y-3"
                                                >
                                                    <div className="bg-[#F7F6F6] rounded-[12px] border border-neutral-100 p-4 shadow-inner">
                                                        <textarea
                                                            value={description}
                                                            onChange={(e) => setDescription(e.target.value)}
                                                            placeholder={t({
                                                                en: 'Example: I need to install a TV on a wall. I already have the bracket.',
                                                                fr: 'Exemple : Je dois installer une TV au mur. J\'ai déjà le support.',
                                                                ar: 'مثال: أحتاج إلى تثبيت تلفزيون على الحائط. لدي الحامل بالفعل.'
                                                            })}
                                                            className="w-full h-24 bg-transparent outline-none text-[15px] font-medium text-neutral-800 placeholder:text-neutral-400 resize-none leading-relaxed"
                                                        />
                                                    </div>

                                                    {/* Drafts Section */}
                                                    {descriptionDrafts.length > 0 && (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            transition={{ delay: 0.3 }}
                                                            className="flex gap-2 w-full overflow-x-auto no-scrollbar py-3 mt-1"
                                                        >
                                                            {descriptionDrafts.map((draft, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => setDescription(draft)}
                                                                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-lg border border-neutral-100 text-[13px] text-neutral-600 font-medium hover:bg-neutral-100 transition-colors active:scale-95"
                                                                >
                                                                    <FileText size={14} className="opacity-60 text-neutral-500" />
                                                                    <span className="max-w-[200px] truncate">{draft}</span>
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}


                                                </motion.div>

                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ) : (step === 2 && isMatchingAnimation) ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-white z-[200] overflow-hidden">
                                    <SplashScreen />
                                </div>
                            ) : step === 2 ? (
                                <motion.div
                                    key="step2-results"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4 pb-24"
                                >
                                    {/* Horizontal Order Summary Pills */}
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-4 -mx-6 px-6">
                                        <div className="flex-shrink-0 flex items-center gap-2 bg-[#EBF8F5] px-4 py-2.5 rounded-full border border-[#DECD85]/50">
                                            {(() => {
                                                const activeService = getServiceById(service);
                                                const serviceIconMap: Record<string, string> = {
                                                    cleaning: 'CleaningVector.png',
                                                    electricity: 'ElectricityVector.png',
                                                    plumbing: 'PlumbingVector.png',
                                                    painting: 'Paintingvector.png',
                                                    handyman: 'HandymanVector.png',
                                                    furniture_assembly: 'AsssemblyVector.png',
                                                    moving: 'MovingHelpVector.png',
                                                    gardening: 'GardeningVector.png',
                                                    mounting: 'MountingVector.png',
                                                    babysitting: 'babysettingnVector.png',
                                                    errands: 'homerepairVector.png',
                                                };
                                                const iconName = activeService ? serviceIconMap[activeService.id] || 'homerepairVector.png' : 'homerepairVector.png';
                                                return <img src={"/Images/Service Category vectors/" + iconName} className="w-5 h-5 object-contain" />;
                                            })()}
                                            <span className="text-[13px] font-black text-neutral-900 whitespace-nowrap opacity-80">
                                                {getServiceById(service)?.name} {subService ? "> " + getSubServiceName(service, subService) : ''}
                                            </span>
                                        </div>

                                        <div className="flex-shrink-0 flex items-center gap-2 bg-[#FCEBA4] px-4 py-2.5 rounded-full border border-[#DECD85]/50">
                                            <img src="/Images/LocationFlag_VI.webp" className="w-7 h-4.5 object-contain" />

                                            <span className="text-[13px] font-black text-neutral-900 whitespace-nowrap opacity-80">
                                                {t({ en: currentCity, fr: currentCity })}, {t({ en: currentArea, fr: currentArea })} - {t(activeTaskSize?.label as any)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 pb-2">
                                        <h3 className="text-[22px] font-black text-neutral-900">{t({ en: 'Find your Tasker', fr: 'Trouvez votre Pro', ar: 'ابحث عن المحترف الخاص بك' })}</h3>
                                    </div>

                                    {isLoadingBricolers ? (
                                        <div className="space-y-4">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-64 bg-neutral-50 rounded-[28px] animate-pulse" />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-6 pt-2">

                                            {/* Results List */}
                                            {sortedBricolers.map((bricoler, idx) => (
                                                <BricolerCard
                                                    key={bricoler.id}
                                                    index={idx}
                                                    bricoler={bricoler}
                                                    serviceName={getServiceById(service)?.name || ''}
                                                    isSelected={selectedBricolerId === bricoler.id}
                                                    onSelect={() => {
                                                        setSelectedBricolerId(bricoler.id);
                                                        setStep(3);
                                                    }}
                                                    onOpenProfile={() => setViewedBricoler(bricoler)}
                                                />
                                            ))}

                                            {sortedBricolers.length === 0 && (
                                                <div className="flex flex-col items-center justify-center pt-8 pb-12 text-center px-4 bg-neutral-50 rounded-[32px] border-2 border-dashed border-neutral-100 mt-4">
                                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 border border-neutral-100">
                                                        <Search size={24} className="text-neutral-200" />
                                                    </div>
                                                    <h4 className="text-[16px] font-black text-neutral-900 mb-1">{t({ en: 'No matching pros found', fr: 'Aucun expert trouvé', ar: 'لم يتم العثور على محترفين مطابقين' })}</h4>
                                                    <p className="text-[12px] font-bold text-neutral-400">
                                                        {t({ en: 'Try changing your location or post an open request.', fr: 'Changez de lieu ou postez une offre ouverte.', ar: 'حاول تغيير موقعك أو انشر طلباً مفتوحاً.' })}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ) : step === 3 ? (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    className="pb-24 pt-4"
                                >
                                    {/* Header Section with Pro Avatar */}
                                    <div className="mb-8 flex items-start justify-between gap-3 px-1">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="relative">
                                                <img
                                                    src={selectedPro?.photoURL || "/Images/Logo/Black Lbricol Avatar Face.webp"}
                                                    className="w-12 h-12 rounded-full object-cover bg-neutral-100"
                                                />
                                            </div>
                                            <h3 className="min-w-0 text-[16px] font-black leading-tight tracking-tight text-neutral-900 sm:text-[18px]">
                                                {selectedPro?.displayName || t({ en: 'Tasker', fr: 'Pro', ar: 'محترف' })} — {t({ en: 'Availability', fr: 'Disponibilités', ar: 'ساعات العمل' })}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setStep(2)}
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-900 transition-all hover:bg-neutral-100"
                                            >
                                                <X size={24} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Month Selection / Display */}
                                    <div className="text-center mb-6">
                                        <h4 className="text-[17px] font-black text-neutral-900">
                                            {(() => {
                                                const d = new Date();
                                                const currentMonth = d.toLocaleDateString('en-US', { month: 'long' });
                                                const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1).toLocaleDateString('en-US', { month: 'long' });
                                                return `${currentMonth} — ${nextMonth} ${d.getFullYear()} `;
                                            })()}
                                        </h4>
                                    </div>

                                    {/* Calendar Grid */}
                                    <div className="px-2">
                                        <div className="grid grid-cols-7 mb-4">
                                            {(t({ en: 'SUN,MON,TUE,WED,THU,FRI,SAT', fr: 'DIM,LUN,MAR,MER,JEU,VEN,SAM' })).split(',').map(d => (
                                                <div key={d} className="text-[11px] font-black text-neutral-400 text-center">{d}</div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-7 gap-y-3">
                                            {useMemo(() => {
                                                const daysArr = [];
                                                const todayCal = new Date();
                                                todayCal.setHours(0, 0, 0, 0);

                                                const startOfWeekCal = new Date(todayCal);
                                                startOfWeekCal.setDate(todayCal.getDate() - todayCal.getDay());

                                                for (let i = 0; i < 21; i++) {
                                                    const dCal = new Date(startOfWeekCal);
                                                    dCal.setDate(startOfWeekCal.getDate() + i);
                                                    const dateStrCal = dCal.toISOString().split('T')[0];
                                                    const isSelectedCal = selectedDate === dateStrCal;
                                                    const isPastCal = dCal < todayCal;

                                                    const slotsOnDay = getAvailableSlotsForDate(dateStrCal, selectedPro);
                                                    const hasSlotsOnDay = slotsOnDay.length > 0;
                                                    const isSelectableCal = !isPastCal && hasSlotsOnDay;

                                                    daysArr.push(
                                                        <button
                                                            key={i}
                                                            disabled={!isSelectableCal && !isPastCal}
                                                            onClick={() => setSelectedDate(dateStrCal)}
                                                            className={cn(
                                                                "h-12 w-full flex items-center justify-center text-[16px] font-bold transition-all relative",
                                                                isSelectedCal ? "bg-[#00A082] text-white rounded-md z-10" :
                                                                    isSelectableCal ? "text-neutral-900 hover:bg-neutral-50" : "text-neutral-300 pointer-events-none opacity-40"
                                                            )}
                                                        >
                                                            {dCal.getDate()}
                                                            {hasSlotsOnDay && !isPastCal && !isSelectedCal && (
                                                                <div className="absolute bottom-1 w-1 h-1 bg-[#00A082] rounded-full opacity-40" />
                                                            )}
                                                        </button>
                                                    );
                                                }
                                                return daysArr;
                                            }, [selectedPro, selectedDate, activeTaskSize, bookedOrders, language])}
                                        </div>
                                    </div>

                                    {/* Time Selector Grid */}
                                    <div className="mt-8 px-1 space-y-8">
                                        {(() => {
                                            const generated = generateAvailableSlots();
                                            // Strict: only show generated if pro selected
                                            const finalSlotsRaw = (generated.length > 0)
                                                ? generated
                                                : (selectedBricolerId === 'open' ? ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'] : []);

                                            const finalSlots = finalSlotsRaw.filter(slot => {
                                                const isCurrentlyBooked = isSlotBooked(slot);
                                                if (isCurrentlyBooked) return false;

                                                // Filter out past times if selected day is today (with 15 minute buffer)
                                                if (selectedDate) {
                                                    const now = new Date();
                                                    const todayStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, '0') + "-" + String(now.getDate()).padStart(2, '0');
                                                    const isSelectionToday = selectedDate === todayStr;

                                                    if (isSelectionToday) {
                                                        const [h, m] = slot.split(':').map(Number);
                                                        const slotTimeInMins = h * 60 + m;
                                                        const nowInMins = now.getHours() * 60 + now.getMinutes();
                                                        if (slotTimeInMins <= nowInMins + 15) return false; // 15-minute buffer minimum
                                                    }
                                                }
                                                return true;
                                            });

                                            const categories = [
                                                { label: t({ en: 'MORNING', fr: 'MATIN', ar: 'صباحاً' }), slots: finalSlots.filter(s => parseInt(s.split(':')[0]) < 13) },
                                                { label: t({ en: 'AFTERNOON', fr: 'APRÈS-MIDI', ar: 'بعد الظهر' }), slots: finalSlots.filter(s => parseInt(s.split(':')[0]) >= 13 && parseInt(s.split(':')[0]) < 18) },
                                                { label: t({ en: 'EVENING', fr: 'SOIR', ar: 'مساءً' }), slots: finalSlots.filter(s => parseInt(s.split(':')[0]) >= 18) },
                                            ];

                                            return categories.map((cat, catIdx) => (
                                                cat.slots.length > 0 && (
                                                    <div key={catIdx} className="space-y-4">
                                                        <span className="text-[11px] font-black text-neutral-400 tracking-widest uppercase ml-1">{cat.label}</span>
                                                        <div className="grid grid-cols-3 gap-3">
                                                            {cat.slots.map(slot => {
                                                                const isSelected = selectedTime === slot;
                                                                return (
                                                                    <button
                                                                        key={slot}
                                                                        onClick={() => setSelectedTime(slot)}
                                                                        className={cn(
                                                                            "h-[54px] rounded-[14px] border flex items-center justify-center text-[16px] font-black transition-all active:scale-95",
                                                                            isSelected
                                                                                ? "bg-[#00A082] border-[#00A082] text-white shadow-lg shadow-[#00A082]/20"
                                                                                : "bg-[#F9F9F9]/50 border-neutral-100 text-neutral-900 hover:border-[#008C74]/30"
                                                                        )}
                                                                    >
                                                                        {slot}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )
                                            ));
                                        })()}
                                    </div>

                                    {/* Helper Information */}
                                    <div className="mt-6 px-1 space-y-6">
                                        <p className="text-[14px] font-medium text-neutral-500 leading-relaxed">
                                            {t({
                                                en: 'Choose your task date and start time. You can chat to adjust task details or change start time after confirming.',
                                                fr: 'Choisissez la date et l\'heure de début. Vous pourrez discuter pour ajuster les détails ou modifier l\'heure après confirmation.',
                                                ar: 'اختر تاريخ المهمة ووقت البدء. يمكنك الدردشة لتعديل التفاصيل أو تغيير الوقت بعد التأكيد.'
                                            })}
                                        </p>

                                        <div className="h-[1px] bg-neutral-100 w-full" />
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[17px] font-bold text-neutral-900">{t({ en: 'Request for:', fr: 'Demande pour :', ar: 'طلب لـ:' })}</span>
                                                <span className="text-[17px] font-bold text-neutral-600">
                                                    {selectedDate && selectedTime ? (() => {
                                                        const d = safeParseDate(selectedDate);
                                                        const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                        const [h, m] = selectedTime.split(':');
                                                        const hh = parseInt(h);
                                                        const period = hh >= 12 ? 'pm' : 'am';
                                                        const displayH = hh > 12 ? hh - 12 : (hh === 0 ? 12 : hh);
                                                        return `${datePart}, ${displayH}:${m}${period} `;
                                                    })() : '—'}
                                                </span>
                                            </div>
                                            {activeTaskSize && activeTaskSize.duration >= 2 && (
                                                <p className="text-[15px] font-black text-[#00A082]">
                                                    {t({ en: "This Tasker requires " + activeTaskSize.duration + " hour min", fr: "Ce pro requiert un minimum de " + activeTaskSize.duration + " heures", ar: "هذا المحترف يتطلب " + activeTaskSize.duration + " ساعات كحد أدنى" })}
                                                </p>
                                            )}
                                        </div>


                                        <div className="flex items-center gap-4 pt-4 px-2">
                                            <div className="w-12 h-12 rounded-[12px] bg-[#E6F6F2] flex items-center justify-center flex-shrink-0">
                                                <div className="relative">
                                                    <div className="w-8 h-8 rounded-md border-2 border-[#00A082] flex flex-col items-center justify-center gap-0.5 p-1">
                                                        <div className="w-full h-0.5 bg-[#00A082] rounded-full opacity-40" />
                                                        <div className="w-full h-0.5 bg-[#00A082] rounded-full opacity-40" />
                                                        <div className="w-full h-0.5 bg-[#00A082] rounded-full opacity-40" />
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#FFC244] rounded-full border-2 border-white flex items-center justify-center">
                                                        <Check size={8} className="text-white" strokeWidth={5} />
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[14px] font-medium text-neutral-600 leading-tight">
                                                {t({ en: 'Next, confirm your details to get connected with your Tasker.', fr: 'Ensuite, confirmez vos détails pour être mis en relation avec votre Pro.', ar: 'بعد ذلك، قم بتأكيد تفاصيلك للتواصل مع المحترف الخاص بك.' })}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="step4"
                                    initial={{ opacity: 0, y: 100 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col pb-24 -mx-6"
                                >
                                    {/* Success/Programmed Header — same as ClientOrdersView */}
                                    <div className="px-6 md:px-12 pt-10 pb-6 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                                        <div className="w-32 h-32 md:w-35 md:h-50 flex-shrink-0">
                                            <img src="/Images/Vectors Illu/NewOrder.webp" className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex flex-col">
                                            <h2 className="text-[32px] md:text-[35px] font-black text-black leading-[1.1] tracking-tighter">
                                                {t({ en: 'Your Bricol.ma Order', fr: 'Votre commande Bricol.ma', ar: 'طلبك من Bricol.ma' })}
                                            </h2>
                                            <div className="flex items-center justify-center md:justify-start gap-2 text-[18px] font-semibold text-black mt-1">
                                                <span>{selectedDate ? safeParseDate(selectedDate).toLocaleDateString(t({ en: 'en-US', fr: 'fr-FR', ar: 'ar-MA' }), { day: 'numeric', month: 'short' }) : t({ en: 'Flexible', fr: 'Flexible', ar: 'مرن' })}</span>
                                                <span className="text-neutral-200">|</span>
                                                <span>{selectedTime}</span>
                                            </div>
                                            <p className="text-[12px] font-light text-black uppercase tracking-[0.2em] mt-2">
                                                {t({ en: 'ORDER ID', fr: 'ID DE COMMANDE', ar: 'رقم الطلب' })}: #TEMP
                                            </p>
                                        </div>
                                    </div>

                                    {/* Wide ZigZag Separator — same as ClientOrdersView */}
                                    <div className="w-full relative h-[40px] flex items-center overflow-hidden">
                                        <div className="absolute w-full h-[2px] bg-neutral-100/50" />
                                        <div className="w-full h-full flex justify-center opacity-[0.08]" style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='10' viewBox='0 0 40 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10L20 0L40 10' stroke='black' stroke-width='2'/%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'repeat-x',
                                            backgroundPosition: 'center'
                                        }} />
                                    </div>
                                    <div className="px-6 py-6 space-y-10">
                                        {/* Frequency Selection */}
                                        <div className="space-y-4 mb-4">
                                            <h3 className="text-[24px] font-black text-black">{t({ en: 'Repeat this order', fr: 'Répéter cette commande', ar: 'تكرار هذا الطلب' })}</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { id: 'once', label: { en: 'Just once', fr: 'Juste une fois', ar: 'مرة واحدة فقط' } },
                                                    { id: 'daily', label: { en: 'Every day', fr: 'Chaque jour', ar: 'كل يوم' } },
                                                    { id: 'weekly', label: { en: 'Every week', fr: 'Chaque semaine', ar: 'كل أسبوع' } },
                                                    { id: 'biweekly', label: { en: 'Every 2 weeks', fr: 'Toutes les 2 semaines', ar: 'كل أسبوعين' } },
                                                    { id: 'monthly', label: { en: 'Every month', fr: 'Chaque mois', ar: 'كل شهر' } }
                                                ].map(freq => (
                                                    <button
                                                        key={freq.id}
                                                        onClick={() => setFrequency(freq.id as any)}
                                                        className={cn(
                                                            "px-4 py-2 rounded-full text-[14px] font-bold transition-all border-2",
                                                            frequency === freq.id
                                                                ? "bg-[#00A082] text-white border-[#00A082]"
                                                                : "bg-white text-neutral-600 border-neutral-200 hover:border-[#00A082]"
                                                        )}
                                                    >
                                                        {t(freq.label as any)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Payment Method Selection - MOVED ABOVE GRID */}
                                        <div className="space-y-4 mb-4">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-[24px] font-black text-black">{t({ en: 'Payment', fr: 'Paiement', ar: 'الدفع' })}</h3>
                                                <div className="w-14 h-14 flex-shrink-0">
                                                    <img src="/Images/Vectors Illu/Currency_VI.webp" className="w-full h-full object-contain" />
                                                </div>
                                            </div>
                                            <p className="text-[15px] font-medium text-neutral-400 -mt-2">{t({ en: 'Choose your payment method', fr: 'Choisissez votre moyen de paiement', ar: 'اختر طريقة الدفع' })}</p>
                                            <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2">
                                                {/* Cash */}
                                                <button
                                                    onClick={() => setPaymentMethod('cash')}
                                                    className={cn(
                                                        "flex min-w-0 items-start gap-3 rounded-[16px] border-2 px-4 py-4 text-left transition-all min-[520px]:items-center min-[520px]:px-5",
                                                        paymentMethod === 'cash'
                                                            ? "bg-[#FFF8E7] border-[#FFC244]"
                                                            : "bg-neutral-50 border-neutral-100"
                                                    )}
                                                >
                                                    <span className="text-2xl">💵</span>
                                                    <div className="min-w-0 flex-1 text-left">
                                                        <p className={cn("text-[15px] font-black leading-tight", paymentMethod === 'cash' ? "text-black" : "text-neutral-600")}>
                                                            {t({ en: 'Cash', fr: 'Espèces', ar: 'نقداً' })}
                                                        </p>
                                                        <p className="text-[12px] font-medium text-neutral-400">{t({ en: 'On delivery', fr: 'À la livraison', ar: 'عند التسليم' })}</p>
                                                    </div>
                                                    {paymentMethod === 'cash' && (
                                                        <div className="ml-auto mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFC244] min-[520px]:mt-0">
                                                            <Check size={11} strokeWidth={4} className="text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                                {/* Bank Transfer */}
                                                <button
                                                    onClick={() => setPaymentMethod('bank')}
                                                    className={cn(
                                                        "flex min-w-0 items-start gap-3 rounded-[16px] border-2 px-4 py-4 text-left transition-all min-[520px]:items-center min-[520px]:px-5",
                                                        paymentMethod === 'bank'
                                                            ? "bg-[#E6F6F2] border-[#00A082]"
                                                            : "bg-neutral-50 border-neutral-100"
                                                    )}
                                                >
                                                    <span className="text-2xl">🏦</span>
                                                    <div className="min-w-0 flex-1 text-left">
                                                        <p className={cn("text-[15px] font-black leading-tight", paymentMethod === 'bank' ? "text-[#00A082]" : "text-neutral-600")}>
                                                            {t({ en: 'Bank Transfer', fr: 'Virement', ar: 'تحويل بنكي' })}
                                                        </p>
                                                        <p className="text-[12px] font-medium text-neutral-400">{t({ en: 'WhatsApp verify', fr: 'Vérif. WhatsApp', ar: 'تأكيد واتساب' })}</p>
                                                    </div>
                                                    {paymentMethod === 'bank' && (
                                                        <div className="ml-auto mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00A082] min-[520px]:mt-0">
                                                            <Check size={11} strokeWidth={4} className="text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Bank transfer details — only shows when bank is selected */}
                                            {paymentMethod === 'bank' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden mb-4"
                                                >
                                                    <div className="p-5 bg-[#E6F6F2]/30 rounded-[16px] border border-[#00A082]/20 space-y-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-[#00A082]/10 flex items-center justify-center">
                                                                <span className="text-[16px]">🏦</span>
                                                            </div>
                                                            <p className="text-[15px] font-black text-[#00A082]">{t({ en: 'Account Details', fr: 'Coordonnées Bancaires', ar: 'تفاصيل الحساب' })}</p>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex flex-col gap-1 text-[13px] min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                                                                <span className="text-neutral-500 font-medium">{t({ en: 'Bank:', fr: 'Banque :', ar: 'البنك:' })}</span>
                                                                <span className="font-bold text-black">Barid Bank</span>
                                                            </div>
                                                            <div className="flex flex-col gap-1 text-[13px] min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                                                                <span className="text-neutral-500 font-medium">{t({ en: 'Name:', fr: 'Nom :', ar: 'الاسم:' })}</span>
                                                                <span className="font-bold text-black">Abdelmalek Tahri</span>
                                                            </div>
                                                            <div className="flex flex-col gap-1.5 pt-1">
                                                                <span className="text-neutral-500 text-[13px] font-medium">{t({ en: 'RIB:', fr: 'RIB :', ar: 'رقم الحساب (RIB):' })}</span>
                                                                <div className="flex flex-col gap-3 rounded-xl border border-[#00A082]/10 bg-white p-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                                                                    <span className="font-mono text-[14px] font-bold tracking-tight text-black">350810000000000880844466</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText('350810000000000880844466');
                                                                        }}
                                                                        className="rounded-lg bg-[#00A082] px-2.5 py-1 transition-colors active:scale-95 hover:bg-[#00896F] min-[420px]:self-auto self-start"
                                                                    >
                                                                        <span className="text-[11px] font-black text-white uppercase">{t({ en: 'Copy', fr: 'Copier', ar: 'نسخ' })}</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Bank receipt instructions — only shows when bank is selected */}
                                            {paymentMethod === 'bank' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="flex w-full flex-col gap-4 rounded-[16px] border-2 border-dashed border-[#00A082] bg-[#E6F6F2]/30 p-5 min-[480px]:flex-row min-[480px]:items-center">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-white shadow-sm">
                                                            <WhatsAppBrandIcon size={24} className="text-[#00A082]" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-[14px] font-black text-[#00A082]">
                                                                {t({
                                                                    en: 'Send receipt via WhatsApp',
                                                                    fr: 'Envoyer le reçu via WhatsApp',
                                                                    ar: 'أرسل الإيصال عبر واتساب'
                                                                })}
                                                            </p>
                                                            <p className="text-[12px] text-[#00A082]/70 font-bold">
                                                                {t({
                                                                    en: 'Uploads are disabled. Chat with us to verify.',
                                                                    fr: 'Envois désactivés. Discutez avec nous.',
                                                                    ar: 'الرفع معطل. تواصل معنا للتحقق.'
                                                                })}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => window.open('https://wa.me/212702814355', '_blank')}
                                                            className="w-full rounded-lg bg-[#00A082] px-3 py-2 text-[11px] font-black uppercase text-white min-[480px]:w-auto"
                                                        >
                                                            {t({ en: 'Chat', fr: 'Discuter', ar: 'محادثة' })}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>

                                        {/* Separation Divider */}
                                        <div className="h-px bg-neutral-100 w-full" />

                                        {/* Key Details Grid */}
                                        <div className="mb-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {/* City & Area */}
                                                <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-3 border border-neutral-100/50">
                                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                        <MapPin size={20} className="text-[#00A082]" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Location', fr: 'Lieu', ar: 'الموقع' })}</span>
                                                        <span className="text-[15px] font-black leading-tight text-black">{t({ en: currentCity, fr: currentCity })}{currentArea ? ", " + t({ en: currentArea, fr: currentArea }) : ''}</span>
                                                    </div>
                                                </div>
                                                {/* Task Size/Duration */}
                                                <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-3 border border-neutral-100/50">
                                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                        <Clock size={20} className="text-[#00A082]" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Duration', fr: 'Durée', ar: 'المدة' })}</span>
                                                        <span className="text-[15px] font-black text-black">≈ {activeTaskSize ? t(activeTaskSize.estTime as any) : '—'}</span>
                                                    </div>
                                                </div>
                                                {/* Service */}
                                                <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-3 border border-neutral-100/50">
                                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                        <Wrench size={20} className="text-[#00A082]" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Service', fr: 'Service', ar: 'الخدمة' })}</span>
                                                        <span className="text-[15px] font-black leading-tight text-black">{t({ en: getServiceById(service)?.name || '', fr: getServiceById(service)?.name || '' })}</span>
                                                    </div>
                                                </div>
                                                {/* Price */}
                                                <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-3 border border-neutral-100/50">
                                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                        <Banknote size={20} className="text-[#00A082]" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Total (Est.)', fr: 'Total (Est.)', ar: 'الإجمالي (تقريبي)' })}</span>
                                                        <span className="text-[15px] font-black text-black">
                                                            {(() => {
                                                                const hourlyRate = selectedPro?.hourlyRate || 75;
                                                                if (service === 'errands') {
                                                                    const coefficient = (activeTaskSize as any)?.coefficient || 1.5;
                                                                    const taskPortion = hourlyRate * coefficient;
                                                                    return Math.round(taskPortion * 1.15);
                                                                }
                                                                const baseCalc = hourlyRate * (activeTaskSize?.duration || 1);
                                                                const sizeIndex = serviceConfig.options.findIndex(s => s.id === taskSize);
                                                                let multiplier = 1;
                                                                if (sizeIndex === 1) multiplier = 0.95;
                                                                else if (sizeIndex === 2) multiplier = 0.9;
                                                                return Math.round(baseCalc * multiplier * 1.15);
                                                            })()} MAD
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Instructions (Full width) */}
                                                <div className="bg-neutral-50 rounded-2xl p-4 col-span-1 sm:col-span-2 flex items-start gap-3 border border-neutral-100/50">
                                                    <div className="w-10 h-10 rounded-full bg-white flex-shrink-0 flex items-center justify-center shadow-sm">
                                                        <Info size={20} className="text-[#00A082]" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Instructions', fr: 'Instructions', ar: 'التعليمات' })}</span>
                                                        <p className="text-[14px] font-semibold text-black line-clamp-3 leading-tight">
                                                            {description || t({ en: 'No specific instructions.', fr: 'Pas d\'instructions.', ar: 'لا توجد تعليمات محددة.' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    {/* Your Selected Bricoler */}
                                    {selectedBricolerId !== 'open' && selectedPro && (
                                        <div className="px-6 pb-6 space-y-4">
                                            <h3 className="text-[24px] font-black text-black">{t({ en: 'Your Tasker', fr: 'Votre Pro', ar: 'المحترف الخاص بك' })}</h3>
                                            <div className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
                                                <div className="flex items-start gap-4 sm:items-center">
                                                    <div className="relative">
                                                        <img src={selectedPro.photoURL || "/Images/Logo/Black Lbricol Avatar Face.webp"} className="w-16 h-16 rounded-full object-cover bg-neutral-100" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-[17px] font-black text-black">{selectedPro.displayName}</h4>
                                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                                            <div className="flex items-center gap-1">
                                                                {(selectedPro.rating || (selectedPro.reviews?.length || 0) > 0) ? (
                                                                    <>
                                                                        <Star size={12} fill="#FFC244" className="text-[#FFC244]" />
                                                                        <span className="text-[13px] font-bold text-neutral-600">{(selectedPro.rating || 0).toFixed(1)}</span>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-[13px] font-bold text-[#7C73E8] bg-[#7C73E8]/5 px-2 py-0.5 rounded-md uppercase tracking-wide">{t({ en: 'NEW', fr: 'NOUVEAU', ar: 'جديد' })}</span>
                                                                )}
                                                            </div>
                                                            <span className="text-neutral-300">•</span>
                                                            <span className="text-[13px] font-medium text-neutral-500">{t({ en: 'Trusted Pro', fr: 'Pro de confiance', ar: 'محترف موثوق' })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Summary Section — same bg/zigzag as ClientOrdersView */}
                                    <div className="mt-4 bg-[#FFFFFF] relative">
                                        <div className="absolute top-0 left-0 right-0 h-[10px] -translate-y-[10px]">
                                            <div className="w-full h-full" style={{
                                                backgroundImage: 'linear-gradient(135deg, transparent 45%, #F5F5F5 45%, #F5F5F5 55%, transparent 55%), linear-gradient(-135deg, transparent 45%, #F5F5F5 45%, #F5F5F5 55%, transparent 55%)',
                                                backgroundSize: '20px 20px',
                                                backgroundRepeat: 'repeat-x'
                                            }} />
                                        </div>
                                        <div className="space-y-8 px-4 py-8 sm:px-12 sm:py-12 sm:space-y-10">
                                            <h3 className="text-[28px] font-black text-black sm:text-[34px]">{t({ en: 'Summary', fr: 'Résumé', ar: 'الملخص' })}</h3>
                                            <div className="space-y-8">
                                                <div className="flex flex-col gap-2 px-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                                                    <div className="flex min-w-0 flex-col gap-1 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-4">
                                                        <span className="text-[18px] font-semibold text-black">{t({ en: 'Task Fee', fr: 'Frais de tâche', ar: 'رسوم المهمة' })}</span>
                                                        <span className="text-[15px] font-light text-black">≈ {activeTaskSize ? t(activeTaskSize.estTime as any) : '—'}</span>
                                                    </div>
                                                    <span className="self-end text-[18px] font-bold tracking-tight text-black min-[420px]:self-auto">
                                                        {(() => {
                                                            const baseCalc = (selectedPro?.hourlyRate || 75) * (activeTaskSize?.duration || 1);
                                                            if (service === 'errands') {
                                                                return Math.round(baseCalc * 0.85 * 0.85);
                                                            }
                                                            const sizeIndex = serviceConfig.options.findIndex(s => s.id === taskSize);
                                                            let multiplier = 1;
                                                            if (sizeIndex === 1) multiplier = 0.95;
                                                            else if (sizeIndex === 2) multiplier = 0.9;
                                                            return Math.round(baseCalc * multiplier * 0.85);
                                                        })()} MAD
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-2 px-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                                                    <div className="flex min-w-0 flex-col gap-1 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-4">
                                                        <span className="text-[18px] font-semibold text-black">{t({ en: 'Lbricol Fee', fr: 'Frais Lbricol', ar: 'رسوم Lbricol' })}</span>
                                                        <span className="text-[15px] font-light text-black">15%</span>
                                                    </div>
                                                    <span className="self-end text-[18px] font-bold tracking-tight text-black min-[420px]:self-auto">
                                                        {(() => {
                                                            const baseCalc = (selectedPro?.hourlyRate || 75) * (activeTaskSize?.duration || 1);
                                                            if (service === 'errands') {
                                                                return Math.round(baseCalc * 0.85 * 0.15);
                                                            }
                                                            const sizeIndex = serviceConfig.options.findIndex(s => s.id === taskSize);
                                                            let multiplier = 1;
                                                            if (sizeIndex === 1) multiplier = 0.95;
                                                            else if (sizeIndex === 2) multiplier = 0.9;
                                                            return Math.round(baseCalc * multiplier * 0.15);
                                                        })()} MAD
                                                    </span>
                                                </div>
                                                {referralDiscountAvailable > 0 && (
                                                    <div className="mt-6 flex flex-col gap-4 rounded-[16px] border border-[#00A082]/20 bg-[#E6F6F2] p-4 min-[520px]:flex-row min-[520px]:items-center min-[520px]:justify-between">
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                                                                <span className="text-[18px]">🎁</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[15px] font-black text-[#00A082]">{t({ en: 'Referral Discount', fr: 'Remise Parrainage', ar: 'خصم الإحالة' })}</span>
                                                                <span className="text-[13px] font-medium text-[#00A082]/80">{t({ en: "15% discount will be applied", fr: "Une remise de 15% sera appliquée", ar: "سيتم تطبيق خصم 15%" })}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); setApplyReferralDiscount(!applyReferralDiscount); }}
                                                            className={cn(
                                                                "w-full rounded-xl px-6 py-3 text-[15px] font-black shadow-md transition-all active:scale-95 min-[520px]:w-auto",
                                                                applyReferralDiscount
                                                                    ? "bg-[#00A082] text-white"
                                                                    : "bg-[#FFC244] text-black hover:bg-[#FDBE33]"
                                                            )}
                                                        >
                                                            {applyReferralDiscount
                                                                ? t({ en: 'Implemented', fr: 'Implémenté', ar: 'تم التطبيق' })
                                                                : t({ en: 'Implement 20DH credit', fr: 'Appliquer le crédit 20DH', ar: 'تطبيق رصيد 20 درهم' })}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div >

                    {/* Persistent Footer */}
                    {/* Persistent Footer */}
                    <AnimatePresence mode="wait">
                        {!isMatchingAnimation && !showSuccessAnimation && (
                            <motion.div
                                key={`${step} -${subStep1} -${isSelectingLocation} `}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.2 }}
                                className="px-6 py-4 border-t border-neutral-100 bg-white flex-shrink-0"
                            >
                                {isSelectingLocation ? (
                                    <button
                                        onClick={() => handleLocationSave()}
                                        disabled={!tempArea}
                                        className={cn(
                                            "w-full h-15 rounded-2xl flex items-center justify-center text-[18px] font-semibold transition-all",
                                            tempArea ? "bg-[#00A082] text-white" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                        )}
                                    >
                                        {t({ en: 'Save Location', fr: 'Enregistrer le lieu', ar: 'حفظ الموقع' })}
                                    </button>
                                ) : step === 1 ? (
                                    <div className="w-full">
                                        <AnimatePresence mode="wait">
                                            {subStep1 === 'location' && (
                                                <motion.button
                                                    key="btn-loc"
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    onClick={() => setSubStep1(service === 'tour_guide' ? 'languages' : 'size')}
                                                    disabled={!currentCity || !currentArea}
                                                    className={cn(
                                                        "w-full h-14 rounded-full text-[19px] font-semibold active:scale-95 transition-all text-white",
                                                        currentCity && currentArea ? "bg-[#00A082]" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                                    )}
                                                >
                                                    {t({ en: 'Next', fr: 'Suivant', ar: 'التالي' })}
                                                </motion.button>
                                            )}

                                            {subStep1 === 'languages' && (
                                                <motion.div
                                                    key="btn-lang"
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    className="flex gap-2 w-full"
                                                >
                                                    <button
                                                        onClick={() => setSubStep1('location')}
                                                        className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 text-neutral-600 active:scale-95 transition-transform"
                                                    >
                                                        <ChevronLeft strokeWidth={2.5} size={22} />
                                                    </button>
                                                    <button
                                                        onClick={() => setSubStep1('size')}
                                                        disabled={selectedLanguages.length === 0}
                                                        className={cn(
                                                            "flex-1 h-14 rounded-full text-[19px] font-semibold active:scale-95 transition-all text-white",
                                                            selectedLanguages.length > 0 ? "bg-[#00A082]" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                                        )}
                                                    >
                                                        {t({ en: 'Next', fr: 'Suivant', ar: 'التالي' })}
                                                    </button>
                                                </motion.div>
                                            )}

                                            {subStep1 === 'size' && (
                                                <motion.div
                                                    key="btn-size"
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    className="flex gap-2 w-full"
                                                >
                                                    <button
                                                        onClick={() => setSubStep1(service === 'tour_guide' ? 'languages' : 'location')}
                                                        className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 text-neutral-600 active:scale-95 transition-transform"
                                                    >
                                                        <ChevronLeft strokeWidth={2.5} size={22} />
                                                    </button>
                                                    <button
                                                        onClick={() => setSubStep1('description')}
                                                        disabled={!taskSize}
                                                        className={cn(
                                                            "flex-1 h-14 rounded-full text-[19px] font-semibold active:scale-95 transition-all text-white",
                                                            taskSize ? "bg-[#00A082]" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                                        )}
                                                    >
                                                        {t({ en: 'Next', fr: 'Suivant', ar: 'التالي' })}
                                                    </button>
                                                </motion.div>
                                            )}

                                            {subStep1 === 'description' && (
                                                <motion.div
                                                    key="btn-desc"
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    className="flex gap-2 w-full"
                                                >
                                                    <button
                                                        onClick={() => setSubStep1('size')}
                                                        className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 text-neutral-600 active:scale-95 transition-transform"
                                                    >
                                                        <ChevronLeft strokeWidth={2.5} size={22} />
                                                    </button>
                                                    <button
                                                        onClick={() => (taskSize && description.trim()) ? handleStartMatching() : null}
                                                        disabled={!description.trim()}
                                                        className={cn(
                                                            "flex-1 h-14 rounded-full text-[19px] font-semibold active:scale-95 transition-all text-white flex items-center justify-center gap-2",
                                                            (description.trim()) ? "bg-[#00A082]" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                                        )}
                                                    >
                                                        {t({ en: 'Find Bricolers', fr: 'Rechercher des Pros', ar: 'ابحث عن محترفين' })}
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ) : step === 2 ? (
                                    <div className="flex items-center">
                                        <button
                                            onClick={() => setStep(1)}
                                            className="w-14 h-14 flex items-center justify-center rounded-[20px] border-2 border-neutral-100 text-neutral-900 active:scale-95 transition-all"
                                        >
                                            <ChevronLeft size={22} strokeWidth={3} />
                                        </button>
                                    </div>
                                ) : step === 3 ? (
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setStep(2)}
                                            className="w-14 h-14 flex items-center justify-center rounded-[20px] border-2 border-neutral-100 text-neutral-900 active:scale-95 transition-all"
                                        >
                                            <ChevronLeft size={22} strokeWidth={3} />
                                        </button>
                                        <button
                                            onClick={() => (selectedDate && selectedTime) ? setStep(4) : null}
                                            disabled={!selectedDate || !selectedTime}
                                            className={cn(
                                                "flex-1 h-14 rounded-[10px] text-[18px] font-semibold active:scale-95 transition-all",
                                                (selectedDate && selectedTime) ? "bg-[#00A082] text-white" : "bg-neutral-100 text-neutral-400"
                                            )}
                                        >
                                            {t({ en: 'Next Step', fr: 'Étape suivante', ar: 'الخطوة التالية' })}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-6">
                                        <div className="flex justify-between items-center px-2">
                                            <span className="text-[28px] font-black text-black">{t({ en: 'Total', fr: 'Total', ar: 'الإجمالي' })}</span>
                                            <div className="flex flex-col items-end">
                                                {(() => {
                                                    const hourlyRate = (selectedPro?.hourlyRate || 75);
                                                    const activeOption = serviceConfig.options.find(o => o.id === taskSize);
                                                    const duration = activeOption?.duration || 1;
                                                    const coefficient = (activeOption as any)?.coefficient || (service === 'errands' ? 1.5 : 1);
                                                    const baseCalc = hourlyRate * duration;
                                                    let finalCalc = 0;
                                                    let strikeCalc = 0;

                                                    if (service === 'errands') {
                                                        const taskPortion = hourlyRate * coefficient;
                                                        finalCalc = Math.round(taskPortion * 1.15);
                                                        strikeCalc = finalCalc;
                                                    } else {
                                                        const sizeIndex = serviceConfig.options.findIndex(s => s.id === taskSize);
                                                        let multiplier = 1;
                                                        if (sizeIndex === 1) multiplier = 0.95;
                                                        else if (sizeIndex === 2) multiplier = 0.9;
                                                        finalCalc = Math.round(baseCalc * multiplier * 1.15);
                                                        strikeCalc = Math.round(baseCalc * 1.15);
                                                    }

                                                    finalCalc = Math.max(0, applyReferralDiscount && referralDiscountAvailable > 0 ? finalCalc * 0.85 : finalCalc);
                                                    const hasDiscount = (service === 'errands') || (strikeCalc > finalCalc) || (applyReferralDiscount && referralDiscountAvailable > 0);

                                                    return (
                                                        <>
                                                            {hasDiscount && (
                                                                <span className="text-[14px] font-bold text-neutral-400 line-through">
                                                                    {strikeCalc} MAD
                                                                </span>
                                                            )}
                                                            <span className="text-[28px] font-black text-black tracking-tighter" style={{ color: hasDiscount ? '#00A082' : 'black' }}>
                                                                {finalCalc} MAD
                                                            </span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setStep(3)}
                                                className="w-14 h-14 flex items-center justify-center rounded-[20px] border-2 border-neutral-100 text-neutral-900 active:scale-95 transition-all"
                                            >
                                                <ChevronLeft size={22} strokeWidth={3} />
                                            </button>
                                            <button
                                                onClick={handleFinalSubmit}
                                                disabled={isSubmitting || (paymentMethod === 'bank' && !bankReceipt)}
                                                className={cn(
                                                    "flex-1 h-14 rounded-[10px] text-[18px] font-semibold active:scale-95 transition-all flex items-center justify-center gap-2",
                                                    (isSubmitting || (paymentMethod === 'bank' && !bankReceipt))
                                                        ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                                        : "bg-[#00A082] text-white"
                                                )}
                                            >
                                                {isSubmitting ? (
                                                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle2 size={20} />
                                                        {t({ en: 'Program Mission', fr: 'Programmer la mission', ar: 'برمجة المهمة' })}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <BricolerProfileModal
                        isOpen={!!viewedBricoler}
                        bricoler={viewedBricoler!}
                        service={service}
                        serviceName={getServiceById(service)?.name || 'Service'}
                        isSelected={selectedBricolerId === viewedBricoler?.id}
                        onClose={() => setViewedBricoler(null)}
                        onSelect={() => {
                            setSelectedBricolerId(viewedBricoler?.id!);
                            setStep(3);
                        }}
                    />
                    <SuccessAnimation
                        isVisible={showSuccessAnimation}
                        onComplete={() => {
                            setShowSuccessAnimation(false);
                            onClose();
                        }}
                    />
                </motion.div >
            </motion.div >
        </AnimatePresence >
    );
};

export default OrderSubmissionFlow;
