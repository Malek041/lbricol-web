"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseISO, addDays, format, isToday } from 'date-fns';
import {
    X, ChevronLeft, ChevronRight, ChevronDown, MapPin,
    Star, ShieldCheck, Briefcase,
    Info, Clock, CheckCircle2, SlidersHorizontal, ArrowUpDown, Search, Check, Calendar, Trophy, FileText, Sparkles, Zap, Plus, Wrench, Banknote, AlertCircle, MessageSquare, MessageCircle,
    Camera, RefreshCw, Car
} from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, Timestamp, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getServiceById, getSubServiceName, getServiceVector } from '@/config/services_config';
import { CAR_BRANDS } from '@/config/cars_config';
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
    pitch?: string;
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
    movingTransports?: string[];
    // Ranking system extensions
    servicePrideScore?: number;
    happyMakingScore?: number;
    reviews?: any[];
    portfolio?: string[];
    whatsappNumber?: string;
    numReviews?: number;
    jobsDone?: number;
    servesArea?: boolean;
    routine?: Record<string, { active: boolean; from: string; to: string }>;
    calendarSlots?: Record<string, { from: string; to: string }[]>;
    carRentalDetails?: {
        cars: {
            brandId: string;
            modelId: string;
            modelName: string;
            modelImage: string;
            quantity: number;
            pricePerDay: number;
        }[];
    };
}

export interface DraftOrder {
    id: string;
    service: string;
    subService?: string;
    subServiceDisplayName?: string;
    serviceName?: string;
    subServiceName?: string;
    city?: string;
    area: string;
    taskSize: string | null;
    description: string;
    selectedBricolerId: string | null;
    selectedDate: string | null;
    selectedTime: string | null;
    carReturnDate?: string | null;
    carReturnTime?: string | null;
    paymentMethod: 'cash' | 'bank';
    bankReceipt: string | null;
    clientNeedImages?: string[];
    images?: string[];
    frequency?: 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
    step: number;
    subStep1: 'location' | 'size' | 'description' | 'languages' | 'moving_vehicle';
    selectedLanguages?: string[];
    selectedCar?: any;
    movingVehicle?: string | null;
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
    onRequireLogin?: () => void;
}

// ── Pricing Logic Helpers ──────────────────────────────────────────────────

export const getServiceSubCoefficient = (serviceId: string, subService: string | null | undefined): number => {
    if (serviceId === 'cleaning') {
        const sub = (subService || '').toLowerCase();
        if (sub.includes('airbnb') || sub.includes('hospitality')) return 1.0;
        if (sub.includes('family')) return 1.5;
        if (sub.includes('deep')) return 2.0;
        if (sub.includes('car')) return 1.0;
        if (sub.includes('end_of_tenancy') || sub.includes('empty')) return 2.5;
    }
    return 1.0;
};

export const calculateTaskPrice = (
    hourlyRate: number,
    taskSize: string | null,
    serviceId: string,
    subService: string | null | undefined,
    options: any[],
    applyReferralDiscount: boolean = false,
    referralDiscountAvailable: number = 0
) => {
    const activeOption = options.find((o: any) => o.id === taskSize);
    const duration = activeOption?.duration || (taskSize && !isNaN(Number(taskSize)) ? Number(taskSize) : 1);
    const coefficient = (activeOption as any)?.coefficient || (serviceId === 'errands' ? 1.5 : 1);

    const isDailyCounter = serviceId === 'private_driver' || serviceId === 'car_rental' ||
        (serviceId === 'cooking' && activeOption?.id && !['small', 'medium', 'large', 'dishes', 'pastries', 'combo', 'shopping', 'educational', 'full', 'other'].includes(activeOption.id)) ||
        (serviceId === 'cleaning' && subService && !subService.toLowerCase().includes('car'));

    const subCoeff = getServiceSubCoefficient(serviceId, subService);
    let basePrice = hourlyRate * duration * coefficient * subCoeff;

    if (serviceId === 'errands') {
        const option = options.find((o: any) => o.id === taskSize);
        let errandCoeff = 1.0;
        if (option?.id === 'medium') errandCoeff = 1.2;
        else if (option?.id === 'large') errandCoeff = 1.5;

        // Return (hourlyRate * errandCoeff) / 0.85 to ensure Bricoler gets (hourlyRate * errandCoeff)
        basePrice = (hourlyRate * errandCoeff) / 0.85;
    } else if (isDailyCounter && (serviceId === 'private_driver' || serviceId === 'car_rental')) {
        const units = duration < 1 ? 0.5 : duration;
        // For half-day (0.5), it's (hourlyRate / 2) / 0.85
        // For 1 day, it's hourlyRate / 0.85
        basePrice = (hourlyRate * units) / 0.85;

        // Apply tiered discount for daily services
        if (units >= 7) basePrice *= 0.85; // 15% off for a week or more
        else if (units >= 2) basePrice *= 0.9; // 10% off for 2 to 6 days
    } else if (isDailyCounter && serviceId !== 'cleaning') {
        // Other daily services (like Private Chef)
        const units = duration < 1 ? 0.5 : duration;
        basePrice = hourlyRate * units;
        if (units >= 7) basePrice *= 0.85;
        else if (units >= 2) basePrice *= 0.9;
    } else if (serviceId === 'babysitting' || serviceId === 'elderly_care') {
        let multiplier = 1;
        if (duration >= 10) multiplier = 0.8;
        else if (duration >= 6) multiplier = 0.9;
        basePrice = basePrice * multiplier;
    } else if (serviceId === 'cleaning') {
        let multiplier = 1;
        // Use subCoeff * duration as the "effective time" for tier discounts
        const effectiveTime = duration * subCoeff;
        if (effectiveTime >= 8) multiplier = 0.85;
        else if (effectiveTime >= 6) multiplier = 0.9;
        else if (effectiveTime >= 4) multiplier = 0.95;
        basePrice = basePrice * multiplier;
    } else if (serviceId === 'electricity' || (serviceId === 'cooking' && ['dishes', 'pastries', 'combo', 'shopping', 'educational', 'full', 'other'].includes(taskSize || ''))) {
        basePrice = hourlyRate * duration * coefficient;
    } else {
        const sizeIndex = options.findIndex((s: any) => s.id === taskSize);
        let multiplier = 1;
        if (sizeIndex === 1) multiplier = 0.95;
        else if (sizeIndex === 2) multiplier = 0.9;
        basePrice = basePrice * multiplier;
    }

    let finalPrice = Math.round(basePrice);
    if (applyReferralDiscount && referralDiscountAvailable > 0) {
        finalPrice = Math.round(finalPrice * 0.85);
    }
    return finalPrice;
};

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

const CarCard = ({ car, bricoler, onSelect, onOpenProfile, isSelected, index = 0 }: { car: any, bricoler: Bricoler, onSelect: () => void, onOpenProfile: () => void, isSelected: boolean, index?: number }) => {
    const { t } = useLanguage();
    const effectiveJobs = Math.max(bricoler.completedJobs || 0, (bricoler.reviews || []).length);
    const effectiveRating = (bricoler.rating && bricoler.rating > 0) ? bricoler.rating : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", damping: 18, stiffness: 220, delay: index * 0.12 }}
            onClick={onSelect}
            className={cn(
                "flex flex-col bg-white rounded-[32px] border-2 transition-all cursor-pointer overflow-hidden",
                isSelected ? "border-[#00A082] shadow-xl shadow-[#00A082]/10" : "border-neutral-100 hover:border-neutral-200"
            )}
        >
            {/* Visual Header: Car Image */}
            <div className="relative w-full aspect-[16/10] bg-neutral-50 p-6 flex items-center justify-center overflow-hidden">
                <img src={car.modelImage || car.image} className="w-full h-full object-contain drop-shadow-2xl transform hover:scale-105 transition-transform duration-700" alt={car.modelName} />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-neutral-100 flex items-center gap-1.5 shadow-sm">
                    <Star size={12} className="text-[#FFC244]" fill="#FFC244" />
                    <span className="text-[13px] font-black text-neutral-900">{effectiveRating.toFixed(1)}</span>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0">
                        <h4 className="text-[18px] font-black text-neutral-900 truncate uppercase tracking-tight">{car.modelName}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <ShieldCheck size={14} className="text-[#00A082]" />
                            <span className="text-[12px] font-bold text-neutral-400">{t({ en: 'Fully Insured', fr: 'Entièrement Assurée' })}</span>
                        </div>
                    </div>
                </div>

                {/* Bricoler Info Row */}
                <div onClick={(e) => { e.stopPropagation(); onOpenProfile(); }} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-2xl mb-4 hover:bg-neutral-100 transition-colors">
                    <img src={bricoler.photoURL || "/Images/Logo/Black Lbricol Avatar Face.webp"} className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex flex-1 flex-col">
                        <span className="text-[12px] font-black text-neutral-900 leading-tight">{bricoler.displayName}</span>
                        <span className="text-[10px] font-bold text-neutral-400">{effectiveJobs} {t({ en: 'rentals', fr: 'locations' })}</span>
                    </div>
                    <ChevronRight size={14} className="text-neutral-300" />
                </div>

                {/* Price and Action */}
                <div className="flex items-center justify-between mt-2 pt-4 border-t border-neutral-50">
                    <div className="flex flex-col">
                        <span className="text-[20px] font-black text-[#00A082]">MAD {car.pricePerDay || car.price}</span>
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest leading-none">{t({ en: 'per day', fr: 'par jour' })}</span>
                    </div>
                    <button className={cn(
                        "h-12 px-6 rounded-full text-[14px] font-black transition-all",
                        isSelected ? "bg-[#00A082] text-white" : "bg-neutral-900 text-white hover:bg-neutral-800"
                    )}>
                        {isSelected ? t({ en: 'Selected', fr: 'Choisie' }) : t({ en: 'Rent Car', fr: 'Louer' })}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const BricolerCard = ({
    bricoler, onSelect, onOpenProfile, isSelected, serviceName, service, index = 0,
    carRentalBookings = [], selectedPickUpDate, selectedPickUpTime, selectedReturnDate, selectedReturnTime
}: {
    bricoler: Bricoler, onSelect: () => void, onOpenProfile: () => void, isSelected: boolean,
    serviceName: string, service?: string, index?: number,
    carRentalBookings?: any[], selectedPickUpDate?: string | null, selectedPickUpTime?: string | null,
    selectedReturnDate?: string | null, selectedReturnTime?: string | null
}) => {
    const { t } = useLanguage();
    // effectiveJobs takes the max of different count fields for robustness (shadow vs real profiles)
    const effectiveJobs = Math.max(
        bricoler.completedJobs || 0,
        bricoler.numReviews || 0,
        bricoler.jobsDone || 0,
        (bricoler.reviews || []).length
    );
    const effectiveRating = (bricoler.reviews && bricoler.reviews.length > 0)
        ? (bricoler.reviews.reduce((acc, r: any) => acc + (r.rating || 0), 0) / bricoler.reviews.length)
        : 0;

    const rank = getBricolerRank(bricoler);
    const translatedRankLabel = rank.label === 'ELITE'
        ? t({ en: 'ELITE', fr: 'ÉLITE' })
        : rank.label === 'PRO'
            ? t({ en: 'PRO', fr: 'PRO' })
            : rank.label === 'CLASSIC'
                ? t({ en: 'CLASSIC', fr: 'CLASSIQUE' })
                : t({ en: 'NEW', fr: 'NOUVEAU', ar: 'جديد' });

    // Handle car rental price display in the card
    const minCarPrice = service === 'car_rental' && bricoler.carRentalDetails?.cars && bricoler.carRentalDetails.cars.length > 0
        ? Math.min(...bricoler.carRentalDetails.cars.map((c: any) => c.pricePerDay || c.price || 9999))
        : null;

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
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = "/Images/Logo/Black Lbricol Avatar Face.webp";
                        }}
                    />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[17px] font-bold text-neutral-900 truncate tracking-tight">{bricoler.displayName}</h4>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-auto pl-2">
                            <span className="text-[16px] font-semibold text-neutral-900 leading-none whitespace-nowrap">
                                MAD {minCarPrice !== null ? minCarPrice.toFixed(0) : (bricoler.hourlyRate?.toFixed(0) || '75')}
                            </span>
                            <span className="text-[12px] text-neutral-400 font-medium whitespace-nowrap">(min)</span>
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
                        <Star size={12} className="text-neutral-900" fill="currentColor" />
                        <span className="text-[14px] font-bold text-neutral-900">
                            {effectiveRating.toFixed(1)}
                        </span>
                        {effectiveJobs > 0 && <span className="text-[12px] font-medium text-neutral-400">({effectiveJobs} {t({ en: 'reviews', fr: 'avis', ar: 'تقييمات' })})</span>}

                        {/* Availability Badge */}
                        {(() => {
                            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
                            const routine = bricoler.routine || {};
                            const isAvailableToday = routine[today]?.active !== false; // Default to true if not set (legacy)

                            if (isAvailableToday) {
                                return (
                                    <div className="flex items-center gap-1 ml-auto bg-[#E6F6F3] px-2 py-0.5 rounded-full border border-[#00A082]/10">
                                        <div className="w-1.5 h-1.5 bg-[#00A082] rounded-full animate-pulse" />
                                        <span className="text-[10px] font-black text-[#00A082] uppercase tracking-wider">
                                            {t({ en: 'Available Today', fr: 'Dispo Aujourd\'hui', ar: 'متاح اليوم' })}
                                        </span>
                                    </div>
                                );
                            }
                            return null;
                        })()}
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
                    {bricoler.pitch || bricoler.quickPitch || bricoler.bio || t({ en: "Hello 👋 I'm proficient in a wide range of services tailored to your needs. Fast and reliable work.", fr: "Bonjour 👋 Je suis compétent dans une large gamme de services adaptés à vos besoins. Travail rapide et fiable.", ar: "مرحباً 👋 أنا متمكن من مجموعة واسعة من الخدمات لتلبية احتياجاتك. عمل سريع وموثوق." })}
                </p>
                <button
                    onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
                    className="mt-1.5 text-[13px] font-bold text-[#00A082] hover:text-[#008C74] block"
                >
                    {t({ en: 'Read More', fr: 'Lire plus', ar: 'اقرأ المزيد' })}
                </button>
            </div>

            {/* Brand Logo Strip */}
            {service === 'car_rental' && bricoler.carRentalDetails?.cars && bricoler.carRentalDetails.cars.length > 0 && (() => {
                const convertTimeTo24h = (timeStr: string | null) => {
                    if (!timeStr || timeStr === '-') return "00:00:00";
                    const parts = timeStr.split(' ');
                    if (parts.length < 2) return timeStr.includes(':') ? timeStr + ":00" : "00:00:00";
                    const [time, modifier] = parts;
                    let [hours, minutes] = time.split(':').map(Number);
                    if (modifier === 'PM' && hours < 12) hours += 12;
                    if (modifier === 'AM' && hours === 12) hours = 0;
                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
                };

                const isCarAvailable = (car: any) => {
                    if (!selectedPickUpDate || !selectedPickUpTime || !selectedReturnDate || !selectedReturnTime) return true;
                    try {
                        const requestStart = new Date(`${selectedPickUpDate}T${convertTimeTo24h(selectedPickUpTime)}`);
                        const requestEnd = new Date(`${selectedReturnDate}T${convertTimeTo24h(selectedReturnTime)}`);
                        if (isNaN(requestStart.getTime()) || isNaN(requestEnd.getTime())) return true;

                        const overlaps = carRentalBookings.filter(booking => {
                            // Check for the same car model
                            const bModelId = booking.selectedCar?.modelId || booking.car?.modelId || booking.orderDetails?.car?.modelId;
                            if (bModelId !== car.modelId) return false;

                            // Condition: Must be for the same provider
                            if (booking.bricolerId !== bricoler.id) return false;

                            // Determine booking start and end times
                            const startDateStr = booking.date || booking.taskDate || booking.startDate;
                            const startTimeStr = booking.time || booking.taskTime || booking.startTime;
                            const endDateStr = booking.carReturnDate || startDateStr; // Fallback to start date if return date is missing
                            const endTimeStr = booking.carReturnTime || startTimeStr; // Fallback to start time if return time is missing

                            if (!startDateStr || !startTimeStr) return false;

                            const bStart = new Date(`${startDateStr}T${convertTimeTo24h(startTimeStr)}`);
                            const bEnd = new Date(`${endDateStr}T${convertTimeTo24h(endTimeStr)}`);

                            if (isNaN(bStart.getTime()) || isNaN(bEnd.getTime())) return false;

                            // Standard overlap condition: (StartA < EndB) and (EndA > StartB)
                            return requestStart < bEnd && requestEnd > bStart;
                        });
                        return overlaps.length < (car.quantity || 1);
                    } catch (e) { return true; }
                };

                // Deduplicate brands
                const seenBrands = new Set<string>();
                const brands: { id: string; name: string; logo: string; availableCount: number; totalCount: number }[] = [];
                bricoler.carRentalDetails.cars.forEach((car: any) => {
                    if (!car.brandId || seenBrands.has(car.brandId)) return;
                    seenBrands.add(car.brandId);
                    const found = CAR_BRANDS.find(b => b.id === car.brandId);
                    const sameBrandCars = bricoler.carRentalDetails!.cars.filter((c: any) => c.brandId === car.brandId);
                    const availableCount = sameBrandCars.filter(c => isCarAvailable(c)).length;

                    brands.push({
                        id: car.brandId,
                        name: car.brandName || found?.name || car.brandId,
                        logo: found?.logo || '',
                        availableCount,
                        totalCount: sameBrandCars.length
                    });
                });
                if (brands.length === 0) return null;
                return (
                    <div className="mt-3 -mx-3 px-3 overflow-x-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2.5 pb-1">
                            {brands.map((brand) => (
                                <div key={brand.id} className={cn("flex-shrink-0 flex flex-col items-center gap-1.5 w-[60px]", brand.availableCount === 0 && "opacity-50 grayscale")}>
                                    <div className="w-[52px] h-[52px] rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center p-2 overflow-hidden">
                                        {brand.logo
                                            ? <img src={brand.logo} className="w-full h-full object-contain" alt={brand.name} />
                                            : <span className="text-[9px] font-black text-neutral-500 text-center leading-tight">{brand.name}</span>
                                        }
                                    </div>
                                    <p className="text-[10px] font-bold text-neutral-600 truncate w-full text-center leading-none">{brand.name}</p>
                                    <p className={cn("text-[9px] font-bold leading-none", brand.availableCount > 0 ? "text-[#00A082]" : "text-red-500")}>
                                        {brand.availableCount > 0 ? `${brand.availableCount}/${brand.totalCount} ${t({ en: 'av.', fr: 'dispo.' })}` : t({ en: 'Full', fr: 'Complet' })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Action Button */}
            <div className="px-0.5 mt-1">
                <button
                    onClick={(e) => { e.stopPropagation(); service === 'car_rental' ? onOpenProfile() : onSelect(); }}
                    className="w-full h-[42px] bg-[#00A082] text-white rounded-full text-[16px] font-black active:scale-[0.98] transition-all"
                >
                    {service === 'car_rental' ? t({ en: 'Pickup a car', fr: 'Récupérer une voiture', ar: 'استلام السيارة' }) : t({ en: 'Select & Continue', fr: 'Choisir & Continuer', ar: 'اختر وتابع' })}
                </button>
            </div>
        </motion.div>
    );
};

const BricolerProfileModal = ({
    bricoler, isOpen, onClose, onSelect, isSelected, serviceName, service,
    carRentalBookings = [], selectedPickUpDate, selectedPickUpTime, selectedReturnDate, selectedReturnTime
}: {
    bricoler: Bricoler, isOpen: boolean, onClose: () => void, onSelect: (car?: any, note?: string) => void,
    isSelected: boolean, serviceName: string, service?: string,
    carRentalBookings?: any[], selectedPickUpDate?: string | null, selectedPickUpTime?: string | null,
    selectedReturnDate?: string | null, selectedReturnTime?: string | null
}) => {
    const { t } = useLanguage();
    const [localSelectedCar, setLocalSelectedCar] = useState<any>(null);
    const [localNote, setLocalNote] = useState('');

    const convertTimeTo24h = (timeStr: string | null) => {
        if (!timeStr || timeStr === '-') return "00:00:00";
        const parts = timeStr.split(' ');
        if (parts.length < 2) return timeStr.includes(':') ? timeStr + ":00" : "00:00:00";
        const [time, modifier] = parts;
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    };

    const isCarModelAvailable = (car: any) => {
        if (!selectedPickUpDate || !selectedPickUpTime || !selectedReturnDate || !selectedReturnTime) return true;

        try {
            const requestStart = new Date(`${selectedPickUpDate}T${convertTimeTo24h(selectedPickUpTime)}`);
            const requestEnd = new Date(`${selectedReturnDate}T${convertTimeTo24h(selectedReturnTime)}`);

            if (isNaN(requestStart.getTime()) || isNaN(requestEnd.getTime())) return true;

            const overlappingBookings = carRentalBookings.filter(booking => {
                // Check if it's the same car model
                const bookingModelId = booking.selectedCar?.modelId || booking.car?.modelId || booking.orderDetails?.car?.modelId;
                if (bookingModelId !== car.modelId) return false;

                // Condition: Must be for the same provider
                if (booking.bricolerId !== bricoler.id) return false;

                // Use date/time and carReturnDate/Time fields which are the standard now
                const bDate = booking.date || booking.taskDate || booking.startDate;
                const bTime = booking.time || booking.taskTime || booking.startTime;
                const bReturnDate = booking.carReturnDate || bDate;
                const bReturnTime = booking.carReturnTime || bTime;

                if (!bDate || !bTime) return false;

                const bookingStart = new Date(`${bDate}T${convertTimeTo24h(bTime)}`);
                const bookingEnd = new Date(`${bReturnDate}T${convertTimeTo24h(bReturnTime)}`);

                if (isNaN(bookingStart.getTime()) || isNaN(bookingEnd.getTime())) return false;

                // Condition 1: Time Window Overlap
                // Two bookings overlap if (StartA < EndB) AND (EndA > StartB)
                return requestStart < bookingEnd && requestEnd > bookingStart;
            });

            // Condition 2: Stock Check
            const stockQuantity = car.quantity || 1;
            return overlappingBookings.length < stockQuantity;
        } catch (e) {
            console.error("Availability check error:", e);
            return true;
        }
    };

    useEffect(() => {
        if (isOpen) {
            setLocalSelectedCar(null);
            setLocalNote('');
        }
    }, [isOpen]);

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

    // Compute stats
    const effectiveJobs = reviewsToShow.length > 0 ? reviewsToShow.length : Math.max(bricoler.completedJobs || 0, allReviews.length);
    const effectiveRating = reviewsToShow.length > 0
        ? (reviewsToShow.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / reviewsToShow.length)
        : (allReviews.length > 0 ? (bricoler.rating || 0) : 0);

    const isNew = reviewsToShow.length === 0 || effectiveRating === null;

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
                                            effectiveRating === 0 ? "bg-neutral-100 text-neutral-400" : "bg-[#FFC244]/10 text-[#FFC244]"
                                        )}>
                                            <Star size={14} fill="currentColor" />
                                            <span className="whitespace-nowrap text-[16px] font-semibold">{(effectiveRating || 0).toFixed(1)}</span>
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
                                        <span className="whitespace-nowrap">
                                            {service === 'car_rental' && (bricoler as any).carRentalDetails?.cars?.length > 0
                                                ? `MAD ${Math.min(...(bricoler as any).carRentalDetails.cars.map((c: any) => c.pricePerDay || c.price || 9999))}`
                                                : `MAD ${bricoler.hourlyRate || 75}`}
                                        </span>
                                        <span className="text-[15px] font-medium text-neutral-400">(min)</span>
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
                                    {bricoler.pitch || bricoler.quickPitch || bricoler.bio || t({ en: 'No bio provided yet.', fr: 'Aucune bio fournie pour le moment.', ar: 'لم يتم تقديم سيرة ذاتية بعد.' })}
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
                                                                bricoler.errandsTransport === 'escooter' ? t({ en: 'Travels by e‑scooter', fr: 'Se déplace par trottinette électrique', ar: 'يتنقل بسكوتر كهربائي' }) :
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

                            {/* Car Rental Details */}
                            {service === 'car_rental' && bricoler.carRentalDetails?.cars && bricoler.carRentalDetails.cars.length > 0 && (() => {
                                // Group cars by brand
                                const groupedCars: Record<string, any[]> = {};
                                bricoler.carRentalDetails.cars.forEach((car: any) => {
                                    const brandId = car.brandId || 'other';
                                    if (!groupedCars[brandId]) groupedCars[brandId] = [];
                                    groupedCars[brandId].push(car);
                                });

                                return (
                                    <div className="mb-8 space-y-8">
                                        <h4 className="text-[18px] font-black text-neutral-900 mb-4">{t({ en: 'Select a car', fr: 'Choisir une voiture', ar: 'اختر سيارة' })}</h4>

                                        {Object.entries(groupedCars).map(([brandId, cars]) => {
                                            const brand = CAR_BRANDS.find(b => b.id === brandId);
                                            const brandName = brand?.name || cars[0]?.brandName || brandId;
                                            const brandLogo = brand?.logo;

                                            return (
                                                <div key={brandId} className="space-y-4">
                                                    {/* Brand Logo & Name */}
                                                    <div className="flex items-center gap-3 px-1">
                                                        {brandLogo ? (
                                                            <div className="w-10 h-10 rounded-xl bg-neutral-50 p-1.5 flex items-center justify-center border border-neutral-100/50">
                                                                <img src={brandLogo} alt={brandName} className="w-full h-full object-contain" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-xl bg-[#00A082]/5 flex items-center justify-center border border-[#00A082]/10">
                                                                <Car size={20} className="text-[#00A082]" />
                                                            </div>
                                                        )}
                                                        <span className="text-[15px] font-black text-neutral-900 uppercase tracking-wider">{brandName}</span>
                                                    </div>

                                                    {/* Horizontal Scrollable Section */}
                                                    <div className="relative">
                                                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1 -mx-1">
                                                            {cars.map((car, i) => {
                                                                const isSelectedCar = localSelectedCar?.modelId === car.modelId;
                                                                const available = isCarModelAvailable(car);
                                                                return (
                                                                    <motion.div
                                                                        key={car.modelId || i}
                                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        onClick={() => available && setLocalSelectedCar(car)}
                                                                        className={cn(
                                                                            "flex-shrink-0 w-[160px] relative rounded-2xl border p-3 cursor-pointer transition-all",
                                                                            isSelectedCar ? "bg-[#F0FBF8] border-[#00A082] shadow-md active:scale-95" :
                                                                                available ? "bg-neutral-50 border-neutral-100 hover:border-[#00A082]/30 active:scale-95" :
                                                                                    "bg-neutral-100 border-neutral-100 opacity-50 cursor-not-allowed grayscale-[0.5]"
                                                                        )}
                                                                    >
                                                                        {/* Car Image */}
                                                                        <div className="w-full h-[90px] rounded-xl bg-white flex items-center justify-center p-2 mb-2">
                                                                            <img src={car.modelImage || car.image} className="w-full h-full object-contain" alt={car.modelName} />
                                                                        </div>
                                                                        {/* Info */}
                                                                        <div className="min-w-0">
                                                                            <p className="text-[12px] font-black text-neutral-900 truncate uppercase tracking-tight leading-tight">{car.modelName}</p>
                                                                            <div className="flex items-center justify-between mt-1">
                                                                                <span className="text-[11px] font-bold text-[#00A082]">{car.pricePerDay || car.price} MAD/j</span>
                                                                                <span className="text-[10px] font-bold text-neutral-400">x{car.quantity}</span>
                                                                            </div>
                                                                        </div>
                                                                        {/* Status Badge */}
                                                                        {!available && (
                                                                            <div className="absolute top-2 left-2 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase z-10">
                                                                                {t({ en: 'Full', fr: 'Complet' })}
                                                                            </div>
                                                                        )}
                                                                        {/* Selected check */}
                                                                        {isSelectedCar && (
                                                                            <motion.div
                                                                                initial={{ scale: 0 }}
                                                                                animate={{ scale: 1 }}
                                                                                className="absolute top-2 right-2 w-5 h-5 bg-[#00A082] rounded-full flex items-center justify-center shadow-lg z-10"
                                                                            >
                                                                                <Check size={11} className="text-white" strokeWidth={4} />
                                                                            </motion.div>
                                                                        )}
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Optional Description inside Car Rental Modal */}
                                        <div className="mt-8">
                                            <h4 className="text-[15px] font-black text-neutral-900 mb-2">{t({ en: 'Additional Notes (Optional)', fr: 'Notes supplémentaires (Optionnel)', ar: 'ملاحظات إضافية (اختياري)' })}</h4>
                                            <textarea
                                                value={localNote}
                                                onChange={(e) => setLocalNote(e.target.value)}
                                                placeholder={t({ en: 'Any specific requests for the car?', fr: 'Des demandes spécifiques pour la voiture ?', ar: 'أي طلبات خاصة للسيارة؟' })}
                                                className="w-full h-24 p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-[14px] outline-none focus:border-[#00A082] resize-none"
                                            />
                                        </div>
                                    </div>
                                );
                            })()}


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
                                onSelect(localSelectedCar, localNote);
                                onClose();
                            }}
                            disabled={service === 'car_rental' && !localSelectedCar}
                            className={cn(
                                "w-full h-16 text-[18px] font-bold rounded-full transition-all flex items-center justify-center gap-3",
                                (service === 'car_rental' && !localSelectedCar) ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" : "bg-[#00A082] hover:bg-[#008C74] text-white active:scale-95"
                            )}
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
    mode = 'create',
    onRequireLogin
}) => {
    const { t, language } = useLanguage();
    const { showToast } = useToast();
    const [step, setStep] = useState(mode === 'edit' ? 3 : (continueDraft?.step || 1));
    const [subStep1, setSubStep1] = useState<'location' | 'size' | 'description' | 'languages' | 'moving_vehicle'>(continueDraft?.subStep1 || 'location');
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(continueDraft?.selectedLanguages || []);
    const [descriptionDrafts, setDescriptionDrafts] = useState<string[]>([]);
    const [taskSize, setTaskSize] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [bricolers, setBricolers] = useState<Bricoler[]>([]);
    const [fullSelectedProData, setFullSelectedProData] = useState<Bricoler | null>(null);
    const [isLoadingBricolers, setIsLoadingBricolers] = useState(false);
    const [selectedBricolerId, setSelectedBricolerId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'all' | 'rating'>('all');
    const [viewedBricoler, setViewedBricoler] = useState<Bricoler | null>(null); // To open profile modal
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [carReturnDate, setCarReturnDate] = useState<string | null>(null);
    const [carReturnTime, setCarReturnTime] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMatchingAnimation, setIsMatchingAnimation] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
    const [bankReceipt, setBankReceipt] = useState<string | null>(continueDraft?.bankReceipt || null);
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
    const [images, setImages] = useState<string[]>(continueDraft?.images || []);
    const [isUploadingImages, setIsUploadingImages] = useState(false);
    const [frequency, setFrequency] = useState<'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly'>('once');
    const [selectedCar, setSelectedCar] = useState<any | null>(continueDraft?.selectedCar || null);
    const [selectedMovingVehicle, setSelectedMovingVehicle] = useState<string | null>(continueDraft?.movingVehicle || null);
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

    // Auto-select today/current time defaults when opening
    useEffect(() => {
        if (isOpen) {
            if (!selectedDate) {
                const today = new Date();
                const todayStr = format(today, 'yyyy-MM-dd');
                setSelectedDate(todayStr);
            }

            if (!selectedTime) {
                const now = new Date();
                let hours = now.getHours();
                let mins = now.getMinutes();

                // Snap to next 30-min slot
                if (mins > 30) {
                    hours += 1;
                    mins = 0;
                } else if (mins > 0) {
                    mins = 30;
                }

                const finalHours = hours % 24;
                const hourStr = `${String(finalHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
                setSelectedTime(hourStr);
            }

            // Ensure car rental return dates are explicitly null by default (safety)
            if (service === 'car_rental' && !carReturnDate) {
                setCarReturnDate(null);
                setCarReturnTime(null);
            }
        }
    }, [isOpen]);

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
    const dayCounterRef = useRef<HTMLDivElement>(null);
    // Stable draft ID for the current open session — generated once and reused on every save
    const draftIdRef = useRef<string | null>(null);

    const [isLoadingBookings, setIsLoadingBookings] = useState(false);
    const [carRentalBookings, setCarRentalBookings] = useState<any[]>([]);
    const [openCalendarMode, setOpenCalendarMode] = useState<'pickup' | 'return' | null>(null);

    const serviceConfig = useMemo(() => {
        const sKey = service?.toLowerCase().replace(/ /g, '_');
        const subKey = subService?.toLowerCase().replace(/ /g, '_');

        // Handle specific subservices first

        switch (sKey) {
            case 'cleaning': {
                const subKey = subService?.toLowerCase() || '';
                const isCarRelated = subKey.includes('car');
                const isDetailing = subKey.includes('detail');
                const subCoeff = getServiceSubCoefficient('cleaning', subService);

                if (isCarRelated) {
                    return {
                        title: t({ en: "What is your car size?", fr: "Quelle est la taille de la voiture ?", ar: "ما هو حجم السيارة؟" }),
                        isDayCounter: true,
                        swipeText: t({ en: "Swipe to select vehicle category.", fr: "Faites défiler pour choisir le type.", ar: "مرر لاختيار نوع السيارة." }),
                        defaultDays: 1,
                        options: [
                            {
                                id: 'compact',
                                duration: isDetailing ? 3 : 0.5,
                                label: { en: 'Compact', fr: 'Citadine', ar: 'صغيرة' },
                                subLabel: { en: 'CAR SIZE', fr: 'TAILLE', ar: 'حجم السيارة' },
                                estTime: { en: isDetailing ? '3h' : '30m', fr: isDetailing ? '3h' : '30m', ar: isDetailing ? '3 ساعات' : '30 دقيقة' },
                                desc: { en: '', fr: '', ar: '' },
                                icon: ''
                            },
                            {
                                id: 'standard',
                                duration: isDetailing ? 4.5 : 0.75,
                                label: { en: 'Sedan', fr: 'Berline', ar: 'سيدان' },
                                subLabel: { en: 'CAR SIZE', fr: 'TAILLE', ar: 'حجم السيارة' },
                                estTime: { en: isDetailing ? '4.5h' : '45m', fr: isDetailing ? '4.5h' : '45m', ar: isDetailing ? '4.5 ساعات' : '45 دقيقة' },
                                desc: { en: '', fr: '', ar: '' },
                                icon: ''
                            },
                            {
                                id: 'suv',
                                duration: isDetailing ? 6 : 1,
                                label: { en: 'SUV/4x4', fr: 'SUV/4x4', ar: 'دفع رباعي' },
                                subLabel: { en: 'CAR SIZE', fr: 'TAILLE', ar: 'حجم السيارة' },
                                estTime: { en: isDetailing ? '6h' : '1h', fr: isDetailing ? '6h' : '1h', ar: isDetailing ? '6 ساعات' : 'ساعة واحدة' },
                                desc: { en: '', fr: '', ar: '' },
                                icon: ''
                            },
                            {
                                id: 'van',
                                duration: isDetailing ? 8 : 1.5,
                                label: { en: 'Large/Van', fr: 'Grand/Van', ar: 'كبيرة' },
                                subLabel: { en: 'CAR SIZE', fr: 'TAILLE', ar: 'حجم السيارة' },
                                estTime: { en: isDetailing ? '8h' : '1.5h', fr: isDetailing ? '8h' : '1.5h', ar: isDetailing ? '8 ساعات' : '1.5 ساعة' },
                                desc: { en: '', fr: '', ar: '' },
                                icon: ''
                            },
                        ]
                    };
                }

                return {
                    title: t({ en: "How many rooms to clean?", fr: "Combien de chambres à nettoyer ?", ar: "كم عدد الغرف للتنظيف؟" }),
                    isDayCounter: true,
                    swipeText: t({ en: "Swipe to define exactly how many rooms you need.", fr: "Faites défiler pour définir le nombre exact de chambres.", ar: "قم بالتمرير لتحديد عدد الغرف بالضبط." }),
                    defaultDays: 1,
                    options: Array.from({ length: 12 }, (_, i) => {
                        const baseRoomDuration = i + 2;
                        const totalTime = baseRoomDuration * subCoeff;
                        return {
                            id: String(i + 1),
                            duration: baseRoomDuration,
                            label: { en: String(i + 1), fr: String(i + 1), ar: String(i + 1) },
                            subLabel: {
                                en: i === 0 ? 'ROOM' : 'ROOMS',
                                fr: i === 0 ? 'CHAMBRE' : 'CHAMBRES',
                                ar: i === 0 ? 'غرفة' : 'غرف'
                            },
                            estTime: { en: `Est: ${totalTime}h`, fr: `Est: ${totalTime}h`, ar: `حوالي ${totalTime} ساعات` },
                            desc: { en: '', fr: '', ar: '' },
                            icon: ''
                        };
                    })
                };
            }
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
            case 'appliance_installation':
                return {
                    title: t({ en: "What's the size of your Task?", fr: "Quelle est la taille de votre tâche ?", ar: "ما هو حجم المهمة؟" }),
                    options: [
                        { id: 'small', duration: 1, label: { en: 'Small Task', fr: 'Petite tâche', ar: 'مهمة صغيرة' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h', ar: 'حوالي ساعة' }, desc: { en: 'Simple fixes like fixing a leak.', fr: 'Tâches simples comme réparer une fuite.', ar: 'مهام بسيطة مثل إصلاح تسرب.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 2.5, label: { en: 'Medium Task', fr: 'Tâche moyenne', ar: 'مهمة متوسطة' }, estTime: { en: 'Est: 2-3 hrs', fr: 'Est: 2-3h', ar: '2-3 ساعات' }, desc: { en: 'Standard tasks like installing a faucet.', fr: 'Tâches moyennes comme installer un robinet.', ar: 'مهام متوسطة مثل تركيب صنبور.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 5, label: { en: 'Large Task', fr: 'Grosse tâche', ar: 'مهمة كبيرة' }, estTime: { en: 'Est: 4+ hrs', fr: 'Est: 4h+', ar: 'أكثر من 4 ساعات' }, desc: { en: 'Complex projects or multiple issues.', fr: 'Projets complexes ou problèmes multiples.', ar: 'مشاريع معقدة أو مشاكل متعددة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'electricity': {
                const subKey = subService?.toLowerCase() || '';
                const cleanSubKey = subKey.replace(/[_\s]/g, '');
                let title = t({ en: "What's the size of your Task?", fr: "Quelle est la taille de votre tâche ?", ar: "ما هو حجم المهمة؟" });

                if (cleanSubKey.includes('ev') || cleanSubKey.includes('charger')) {
                    return {
                        title: t({ en: "How many EV chargers to install?", fr: "Combien de bornes de recharge EV à installer ?", ar: "كم عدد شواحن السيارات الكهربائية المطلوب تركيبها؟" }),
                        isDayCounter: true,
                        swipeText: t({ en: "Swipe to define exactly how many chargers you need.", fr: "Faites défiler pour définir le nombre exact de bornes.", ar: "قم بالتمرير لتحديد العدد الدقيق للشواحن." }),
                        options: Array.from({ length: 10 }, (_, i) => ({
                            id: String(i + 1),
                            duration: (i + 1) * 4,
                            label: { en: String(i + 1), fr: String(i + 1), ar: String(i + 1) },
                            subLabel: {
                                en: i === 0 ? 'CHARGER' : 'CHARGERS',
                                fr: i === 0 ? 'BORNE' : 'BORNES',
                                ar: i === 0 ? 'شاحن' : 'شواحن'
                            },
                            estTime: { en: `Est: ${(i + 1) * 4}h`, fr: `Est: ${(i + 1) * 4}h`, ar: `حوالي ${(i + 1) * 4} ساعات` },
                            desc: { en: '', fr: '', ar: '' },
                            icon: ''
                        }))
                    };
                } else if (cleanSubKey.includes('cooling') || cleanSubKey.includes('heating') || cleanSubKey.includes('hvac')) {
                    return {
                        title: t({ en: "How many units to service?", fr: "Combien d'unités à entretenir ?", ar: "كم عدد الوحدات المطلوب صيانتها؟" }),
                        isDayCounter: true,
                        swipeText: t({ en: "Swipe to define exactly how many units you need.", fr: "Faites défiler pour définir le nombre exact d'unités.", ar: "قم بالتمرير لتحديد العدد الدقيق للوحدات." }),
                        options: Array.from({ length: 10 }, (_, i) => ({
                            id: String(i + 1),
                            duration: (i + 1) * 2,
                            label: { en: String(i + 1), fr: String(i + 1), ar: String(i + 1) },
                            subLabel: {
                                en: i === 0 ? 'UNIT' : 'UNITS',
                                fr: i === 0 ? 'UNITÉ' : 'UNITÉS',
                                ar: i === 0 ? 'وحدة' : 'وحدات'
                            },
                            estTime: { en: `Est: ${(i + 1) * 2}h`, fr: `Est: ${(i + 1) * 2}h`, ar: `حوالي ${(i + 1) * 2} ساعات` },
                            desc: { en: '', fr: '', ar: '' },
                            icon: ''
                        }))
                    };
                } else if (cleanSubKey.includes('surveillance') || cleanSubKey.includes('camera') || cleanSubKey.includes('cams')) {
                    return {
                        title: t({ en: "How many cameras to install?", fr: "Combien de caméras à installer ?", ar: "كم عدد الكاميرات المطلوب تركيبها؟" }),
                        isDayCounter: true,
                        swipeText: t({ en: "Swipe to define exactly how many cameras you need.", fr: "Faites défiler pour définir le nombre exact de caméras.", ar: "قم بالتمرير لتحديد العدد الدقيق للكاميرات." }),
                        options: Array.from({ length: 15 }, (_, i) => ({
                            id: String(i + 1),
                            duration: (i + 1) * 3,
                            label: { en: String(i + 1), fr: String(i + 1), ar: String(i + 1) },
                            subLabel: {
                                en: i === 0 ? 'CAMERA' : 'CAMERAS',
                                fr: i === 0 ? 'CAMÉRA' : 'CAMÉRAS',
                                ar: i === 0 ? 'كاميرا' : 'كاميرات'
                            },
                            estTime: { en: `Est: ${(i + 1) * 3}h`, fr: `Est: ${(i + 1) * 3}h`, ar: `حوالي ${(i + 1) * 3} ساعات` },
                            desc: { en: '', fr: '', ar: '' },
                            icon: ''
                        }))
                    };
                }

                let options = [
                    { id: 'small', duration: 1, label: { en: 'Small Task', fr: 'Petite tâche', ar: 'مهمة صغيرة' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h', ar: 'حوالي ساعة' }, desc: { en: 'Simple fixes like fixing a switch.', fr: 'Tâches simples comme réparer un interrupteur.', ar: 'مهام بسيطة مثل إصلاح مفتاح كهربائي.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                    { id: 'medium', duration: 2.5, label: { en: 'Medium Task', fr: 'Tâche moyenne', ar: 'مهمة متوسطة' }, estTime: { en: 'Est: 2-3 hrs', fr: 'Est: 2-3h', ar: '2-3 ساعات' }, desc: { en: 'Standard tasks like installing a light fixture.', fr: 'Tâches moyennes comme installer un luminaire.', ar: 'مهام متوسطة مثل تركيب مصباح.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                    { id: 'large', duration: 5, label: { en: 'Large Task', fr: 'Grosse tâche', ar: 'مهمة كبيرة' }, estTime: { en: 'Est: 4+ hrs', fr: 'Est: 4h+', ar: 'أكثر من 4 ساعات' }, desc: { en: 'Complex rewiring or panel projects.', fr: 'Projets de câblage complexes ou panneaux.', ar: 'مشاريع توصيل أسلاك معقدة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                ];

                return { title, options };
            }
            case 'private_driver': {
                const subKey = subService?.toLowerCase().replace(/ /g, '_').replace(/-/g, '_') || '';
                const defaultDays = (subKey.includes('half') || subKey.includes('demi')) ? 0.5 : 1;
                return {
                    title: t({ en: "How many days do you need the driver?", fr: "De combien de jours avez-vous besoin du chauffeur ?", ar: "كم يوماً تحتاج فيه للسائق؟" }),
                    isDaily: true,
                    isDayCounter: true,
                    swipeText: t({ en: "Swipe to define exactly how many days you need.", fr: "Faites défiler pour définir le nombre de jours exact.", ar: "قم بالتمرير لتحديد عدد الأيام بالضبط." }),
                    defaultDays,
                    options: [
                        { id: '0.5', duration: 0.5, label: { en: '0.5', fr: '0.5', ar: '0.5' }, subLabel: { en: 'HALF-DAY', fr: 'DEMI-JOURNÉE', ar: 'نصف يوم' }, estTime: { en: '4h', fr: '4h', ar: '4س' }, desc: { en: '', fr: '', ar: '' }, icon: '' },
                        ...Array.from({ length: 30 }, (_, i) => ({
                            id: String(i + 1),
                            duration: i + 1,
                            label: { en: String(i + 1), fr: String(i + 1), ar: String(i + 1) },
                            subLabel: { en: i === 0 ? 'DAY' : 'DAYS', fr: i === 0 ? 'JOUR' : 'JOURS', ar: i === 0 ? 'يوم' : 'أيام' },
                            estTime: { en: `${(i + 1) * 8}h`, fr: `${(i + 1) * 8}h`, ar: `${(i + 1) * 8}س` },
                            desc: { en: '', fr: '', ar: '' },
                            icon: ''
                        }))
                    ]
                };
            }
            case 'babysitting':
            case 'elderly_care':
                return {
                    title: t({ en: "How long is the care needed?", fr: "Quelle est la durée de garde nécessaire ?", ar: "ما هي مدة الرعاية المطلوبة؟" }),
                    options: [
                        { id: 'small', duration: 3, label: { en: 'Short Term (1-4 hrs)', fr: 'Court terme (1-4h)', ar: 'فترة قصيرة (1-4 ساعات)' }, estTime: { en: 'Est: 3 hrs', fr: 'Est: 3h', ar: 'حوالي 3 ساعات' }, desc: { en: 'Brief assistance or babysitting slot.', fr: 'Garde ou assistance de courte durée.', ar: 'مساعدة وجيزة أو جليسة أطفال لفترة قصيرة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 6, label: { en: 'Half Day (4-8 hrs)', fr: 'Demi-journée (4-8h)', ar: 'نصف يوم (4-8 ساعات)' }, estTime: { en: 'Est: 6 hrs', fr: 'Est: 6h', ar: 'حوالي 6 ساعات' }, desc: { en: 'Standard care for a morning, afternoon or evening.', fr: 'Garde standard pour une matinée, après-midi ou soirée.', ar: 'رعاية عادية للصباح أو المساء.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 10, label: { en: 'Full Day / Overnight', fr: 'Journée / Nuit', ar: 'يوم كامل / مبيت' }, estTime: { en: 'Est: 10 hrs', fr: 'Est: 10h', ar: 'ح حوالي 10 ساعات' }, desc: { en: 'Comprehensive care over an extended period.', fr: 'Soins complets sur une période prolongée.', ar: 'رعاية شاملة لفترة ممتدة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
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
                        { id: 'medium', duration: 4, label: { en: 'Standard House', fr: 'Maison Standard', ar: 'منزل عادي' }, estTime: { en: 'Est: 3-4 hrs', fr: 'Est: 3-4h', ar: '3-4 ساعات' }, desc: { en: 'Full interior/exterior window cleaning for a typical home.', fr: 'Nettoyage complet (intérieur/extérieur) pour maison typique.', ar: 'تنظيف كامل للنوافذ (داخلي/خارجي) للمنازل العادية.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 8, label: { en: 'Large Property / Commercial', fr: 'Grande Propriété / Commercial', ar: 'منزل كبير / تجاري' }, estTime: { en: 'Est: 6-8 hrs', fr: 'Est: 6-8h', ar: '6-8 ساعات' }, desc: { en: 'Extensive window cleaning for large homes or offices.', fr: 'Nettoyage intensif des vitres pour grandes maisons ou bureaux.', ar: 'تنظيف شامل للنوافذ للمنازل الكبيرة أو المكاتب.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            case 'driver':
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
            case 'car_rental':
                return {
                    title: t({ en: "How many days do you need the car?", fr: "Combien de jours avez-vous besoin de la voiture ?", ar: "كم يوماً تحتاج فيه للسيارة؟" }),
                    isDaily: true,
                    isDayCounter: true,
                    swipeText: t({ en: "Swipe to define exactly how many days you need.", fr: "Faites défiler pour définir le nombre de jours exact.", ar: "قم بالتمرير لتحديد عدد الأيام بالضبط." }),
                    defaultDays: 1,
                    options: Array.from({ length: 30 }, (_, i) => ({
                        id: String(i + 1),
                        duration: i + 1,
                        label: { en: String(i + 1), fr: String(i + 1), ar: String(i + 1) },
                        subLabel: {
                            en: i === 0 ? 'DAY' : 'DAYS',
                            fr: i === 0 ? 'JOUR' : 'JOURS',
                            ar: i === 0 ? 'يوم' : 'أيام'
                        },
                        estTime: { en: '', fr: '', ar: '' },
                        desc: { en: '', fr: '', ar: '' },
                        icon: ''
                    }))
                };
            case 'pool_cleaning':
                return {
                    title: t({ en: "How big is your pool?", fr: "Quelle est la taille de la piscine ?", ar: "ما هو حجم المسبح؟" }),
                    options: [
                        { id: 'small', duration: 1.5, label: { en: 'Small / Maintenance', fr: 'Petite / Entretien', ar: 'مسبح صغير / صيانة' }, estTime: { en: 'Est: 1.5 hrs', fr: 'Est: 1.5h', ar: 'حوالي 1.5 ساعة' }, desc: { en: 'Quick skimming, chemical check, and filter rinse.', fr: 'Écrémage rapide, contrôle chimique et rinçage du filtre.', ar: 'إزالة شوائب سريعة، فحص كيميائي وشطف الفلتر.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 3, label: { en: 'Standard Cleaning', fr: 'Nettoyage Standard', ar: 'تنظيف عادي' }, estTime: { en: 'Est: 3 hrs', fr: 'Est: 3h', ar: 'حوالي 3 ساعات' }, desc: { en: 'Full vacuum, filter clean, and chemical balance.', fr: 'Aspiration complète, nettoyage du filtre et équilibre chimique.', ar: 'تنظيف كامل، تنظيف الفلتر وتوازن كيميائي.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
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
            case 'cooking':
            case 'meal_prep': {
                const subKey = subService?.toLowerCase() || '';
                // Standardize subKey for matching
                const cleanSubKey = subKey.replace(/[_\s]/g, '');

                // 1. Private Chef at Home
                if (cleanSubKey.includes('chef') || cleanSubKey.includes('prive')) {
                    return {
                        title: t({ en: "How many days do you need a Private Chef?", fr: "De combien de jours avez-vous besoin d'un Chef Privé ?", ar: "كم يوماً تحتاج فيه لشيف خاص؟" }),
                        isDaily: true,
                        isDayCounter: true,
                        swipeText: t({ en: "Swipe to define exactly how many days you need.", fr: "Faites défiler pour définir le nombre de jours exact.", ar: "قم بالتمرير لتحديد عدد الأيام بالضبط." }),
                        defaultDays: 0.5,
                        options: [
                            { id: '0.5', duration: 0.5, label: { en: '0.5', fr: '0.5', ar: '0.5' }, subLabel: { en: 'HALF-DAY', fr: 'DEMI-JOURNÉE', ar: 'نصف يوم' }, estTime: { en: '4h', fr: '4h', ar: '4س' }, desc: { en: '', fr: '', ar: '' }, icon: '' },
                            ...Array.from({ length: 30 }, (_, i) => ({
                                id: String(i + 1),
                                duration: i + 1,
                                label: { en: String(i + 1), fr: String(i + 1), ar: String(i + 1) },
                                subLabel: { en: i === 0 ? 'DAY' : 'DAYS', fr: i === 0 ? 'JOUR' : 'JOURS', ar: i === 0 ? 'يوم' : 'أيام' },
                                estTime: { en: `${(i + 1) * 8}h`, fr: `${(i + 1) * 8}h`, ar: `${(i + 1) * 8}س` },
                                desc: { en: '', fr: '', ar: '' },
                                icon: ''
                            }))
                        ]
                    };
                }

                // 2. Moroccan Cooking Class (Offers Dishes/Pastries choice)
                if (cleanSubKey.includes('cookingclass') || cleanSubKey.includes('coursdecuisine') || cleanSubKey.includes('moroccancooking')) {
                    return {
                        title: t({ en: "What would you like to learn?", fr: "Que souhaitez-vous apprendre ?", ar: "ماذا تود أن تتعلم؟" }),
                        options: [
                            { id: 'dishes', duration: 3, label: { en: 'Moroccan Dishes', fr: 'Plats Marocains', ar: 'أطباق مغربية' }, estTime: { en: '≈ 3 hrs', fr: '≈ 3h', ar: '3 ساعات' }, desc: { en: 'Learn Tajines, Couscous, and main staples.', fr: 'Apprenez les tajines, couscous et plats principaux.', ar: 'تعلم الطواجن والكسكس والأطباق الرئيسية.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                            { id: 'pastries', duration: 3, label: { en: 'Moroccan Pastries', fr: 'Pâtisseries Marocaines', ar: 'حلويات مغربية' }, estTime: { en: '≈ 3 hrs', fr: '≈ 3h', ar: '3 ساعات' }, desc: { en: 'Learn traditional cookies and sweets.', fr: 'Apprenez les gâteaux et douceurs traditionnelles.', ar: 'تعلم الحلويات والحلويات التقليدية.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                            { id: 'combo', duration: 5, label: { en: 'The Full Experience', fr: 'L\'Expérience Complète', ar: 'تجربة كاملة' }, estTime: { en: '≈ 5 hrs', fr: '≈ 5h', ar: '5 ساعات' }, desc: { en: 'Both dishes and pastries mastery.', fr: 'Maîtrise des plats et des pâtisseries.', ar: 'إتقان الأطباق والحلويات.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                        ]
                    };
                }

                // 3. Market Tour & Cooking
                if (cleanSubKey.includes('marche') || cleanSubKey.includes('market')) {
                    return {
                        title: t({ en: "What's the focus of your tour?", fr: "Quel est l'objectif de votre circuit ?", ar: "ما هو محور جولتك؟" }),
                        options: [
                            { id: 'shopping', duration: 2, coefficient: 1.0, label: { en: 'Dish-Specific Shopping', fr: 'Shopping pour un Plat', ar: 'تسوق لطبق معين' }, estTime: { en: '≈ 2 hrs', fr: '≈ 2h', ar: 'ساعتين' }, desc: { en: 'Help shopping for ingredients for a specific dish.', fr: 'Aide au shopping d\'ingrédients pour un plat.', ar: 'المساعدة في تسوق المكونات لطبق معين.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                            { id: 'educational', duration: 3, coefficient: 1.2, label: { en: 'Ingredient Knowledge', fr: 'Connaissance des Produits', ar: 'معرفة المكونات' }, estTime: { en: '≈ 3 hrs', fr: '≈ 3h', ar: '3 ساعات' }, desc: { en: 'Leaning about local spices and ingredients.', fr: 'Apprendre sur les épices et ingrédients locaux.', ar: 'التعرف على التوابل والمكونات المحلية.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                            { id: 'full', duration: 6, coefficient: 1.5, label: { en: 'Tour & Hands-on Cooking', fr: 'Circuit & Cours de Cuisine', ar: 'جولة وتعلم طبخ' }, estTime: { en: '≈ 6 hrs', fr: '≈ 6h', ar: '6 ساعات' }, desc: { en: 'A complete market trip followed by cooking.', fr: 'Un tour complet du marché suivi du repas.', ar: 'رحلة كاملة في السوق متبوعة بالطبخ.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                            { id: 'other', duration: 4, coefficient: 1.3, label: { en: 'Custom Suggestion', fr: 'Suggestion sur mesure', ar: 'مقترح مخصص' }, estTime: { en: '≈ 4 hrs', fr: '≈ 4h', ar: '4 ساعات' }, desc: { en: 'Tell us exactly what you want to explore.', fr: 'Dites-nous ce que vous voulez explorer.', ar: 'أخبرنا بالضبط بما تريد استكشافه.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        ]
                    };
                }

                return {
                    title: t({ en: "What is the cooking scope?", fr: "Quelle est l'ampleur de la cuisine ?", ar: "ما هو حجم الطبخ؟" }),
                    options: [
                        { id: 'small', duration: 2, label: { en: 'Simple Meal', fr: 'Repas Simple', ar: 'وجبة بسيطة' }, estTime: { en: 'Est: 2 hrs', fr: 'Est: 2h', ar: 'حوالي ساعتين' }, desc: { en: 'Cooking a simple meal or doing prep.', fr: 'Préparation d\'un petit repas simple.', ar: 'طبخ وجبة بسيطة أو تحضيرات.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 4, label: { en: 'Daily Cooking / Family', fr: 'Cuisine Quotidienne', ar: 'طبخ يومي / عائلي' }, estTime: { en: 'Est: 4 hrs', fr: 'Est: 4h', ar: 'حوالي 4 ساعات' }, desc: { en: 'Cooking complete meals for a family.', fr: 'Cuisine de repas complets pour la famille.', ar: 'طبخ وجبات كاملة للعائلة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 8, label: { en: 'Batch Cooking / Event', fr: 'Événement / Grande Quant', ar: 'حدث / طبخ كميات كبيرة' }, estTime: { en: 'Est: 8+ hrs', fr: 'Est: 8h+', ar: 'أكثر من 8 ساعات' }, desc: { en: 'Cooking for an event or multiple days.', fr: 'Cuisine pour événement ou plusieurs jours.', ar: 'الطبخ لحدث أو لعدة أيام.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
            }
            case 'errands':
                return {
                    title: t({ en: "What is the size of your task?", fr: "Quelle est la taille de votre tâche ?", ar: "ما هو حجم المهمة؟" }),
                    options: [
                        { id: 'small', duration: 0.42, label: { en: 'Quick Delivery (≈25 min)', fr: 'Livraison Rapide (≈25 min)', ar: 'توصيل سريع (≈25 دقيقة)' }, estTime: { en: '≈ 25 min', fr: '≈ 25 min', ar: '≈ 25 دقيقة' }, desc: { en: 'Simple pickup and drop-off.', fr: 'Simple retrait et dépôt.', ar: 'استلام وتسليم بسيط.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 1, label: { en: 'Standard Errand', fr: 'Course Standard', ar: 'مهمة عادية' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h', ar: 'حوالي ساعة' }, desc: { en: 'Grocery shopping or multiple stops.', fr: 'Courses alimentaires ou plusieurs arrêts.', ar: 'تسوق أو توقفات متعددة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 2.5, label: { en: 'Extensive Errands', fr: 'Courses Importantes', ar: 'مهام مكثفة' }, estTime: { en: 'Est: 2-3 hrs', fr: 'Est: 2-3h', ar: '2-3 ساعات' }, desc: { en: 'Complex errands or full city circuit.', fr: 'Courses complexes ou circuit complet en ville.', ar: 'مهام معقدة أو جولة كاملة في المدينة.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
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
                    options: [
                        { id: 'small', duration: 1, label: { en: 'Small Task', fr: 'Petite tâche', ar: 'مهمة صغيرة' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h', ar: 'حوالي ساعة' }, desc: { en: 'Simple tasks like mounting a TV or fixing a leak.', fr: 'Tâches simples comme monter une TV ou réparer une fuite.', ar: 'مهام بسيطة مثل تثبيت تلفزيون أو إصلاح تسرب.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.webp' },
                        { id: 'medium', duration: 2.5, label: { en: 'Medium Task', fr: 'Tâche moyenne', ar: 'مهمة متوسطة' }, estTime: { en: 'Est: 2-3 hrs', fr: 'Est: 2-3h', ar: '2-3 ساعات' }, desc: { en: 'Standard tasks like assembly of several items.', fr: 'Tâches standards comme l\'assemblage de plusieurs articles.', ar: 'مهام عادية مثل تجميع عدة قطع.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.webp' },
                        { id: 'large', duration: 5, label: { en: 'Large Task', fr: 'Grosse tâche', ar: 'مهمة كبيرة' }, estTime: { en: 'Est: 4+ hrs', fr: 'Est: 4h+', ar: 'أكثر من 4 ساعات' }, desc: { en: 'Complex tasks or half-day projects.', fr: 'Tâches complexes ou projets d\'une demi-journée.', ar: 'مهام معقدة أو مشاريع لمدة نصف يوم.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.webp' },
                    ]
                };
        }
    }, [service, subService, t]);

    // Auto-select default task size for counters if currently null
    useEffect(() => {
        if (subStep1 === 'size' && (serviceConfig as any)?.isDayCounter && !taskSize) {
            setTaskSize(String((serviceConfig as any).defaultDays || 1));
        }
    }, [subStep1, serviceConfig, taskSize]);

    const activeTaskSize = serviceConfig.options.find(s => s.id === taskSize);

    // Helper to get the correct rate for a specific pro and service
    const getProRateForService = (pro: Bricoler | null | undefined, svcId: string) => {
        if (!pro) return 75;
        // Search in services array
        const svc = pro.services?.find((s: any) =>
            (s.categoryId || s.serviceId || '').toLowerCase() === svcId.toLowerCase()
        );
        if (svc && typeof svc === 'object' && svc.hourlyRate) return svc.hourlyRate;
        return pro.hourlyRate || 75;
    };

    // Use full data if available, otherwise fallback to the index version
    const basePro = fullSelectedProData || bricolers.find(b => b.id === selectedBricolerId);
    let selectedProRate = getProRateForService(basePro as any, service);

    // For car rental, override pro's minimum rate with the specific car's daily rate
    if (service === 'car_rental' && selectedCar?.pricePerDay) {
        selectedProRate = selectedCar.pricePerDay;
    }

    const selectedPro = basePro ? { ...basePro, hourlyRate: selectedProRate } : null;

    // Auto-scroll the day counter to the selected taskSize
    useEffect(() => {
        if (subStep1 === 'size' && (serviceConfig as any)?.isDayCounter && dayCounterRef.current) {
            const container = dayCounterRef.current;
            const targetDay = taskSize || String((serviceConfig as any).defaultDays);

            // Wait for children to be rendered then scroll
            setTimeout(() => {
                const targetElement = Array.from(container.children).find(
                    child => child.getAttribute('data-day') === targetDay
                ) as HTMLElement;

                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
                }
            }, 50);
        }
    }, [subStep1, taskSize, service]);

    // Fetch full profile and existing bookings for the selected pro to accurately show availability
    useEffect(() => {
        if (selectedBricolerId && selectedBricolerId !== 'open') {
            const fetchFullData = async () => {
                setIsLoadingBookings(true);
                try {
                    // 1. Fetch full profile for calendarSlots
                    const proRef = doc(db, 'bricolers', selectedBricolerId);
                    const proSnap = await getDoc(proRef);
                    if (proSnap.exists()) {
                        setFullSelectedProData({ id: proSnap.id, ...proSnap.data() } as Bricoler);
                    }

                    // 2. Fetch bookings for conflicts
                    const q = query(
                        collection(db, 'jobs'),
                        where('bricolerId', '==', selectedBricolerId)
                    );
                    const snap = await getDocs(q);
                    const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
                    setBookedOrders(jobs);
                } catch (e) {
                    console.error("Error fetching bricoler details:", e);
                } finally {
                    setIsLoadingBookings(false);
                }
            };
            fetchFullData();
        } else {
            setFullSelectedProData(null);
            setBookedOrders([]);
        }
    }, [selectedBricolerId]);

    // Track state visibility for analytics or UI adjustment
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
                setCarReturnDate((continueDraft as any).carReturnDate || null);
                setCarReturnTime((continueDraft as any).carReturnTime || null);
                setPaymentMethod(continueDraft.paymentMethod);
                setBankReceipt(continueDraft.bankReceipt);
                setFrequency(continueDraft.frequency || 'once');
                setSelectedCar(continueDraft.selectedCar || null);
                setCurrentCity(continueDraft.city || '');
                setCurrentArea(continueDraft.area || '');
                setTempCity(continueDraft.city || '');
                setTempArea(continueDraft.area || '');
            } else {
                setStep(1);
                setSubStep1('location');
                // Auto-select default task size if available
                const initialTaskSize = serviceConfig?.defaultDays ? String(serviceConfig.defaultDays) : null;
                setTaskSize(initialTaskSize);
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
            carReturnDate,
            carReturnTime,
            paymentMethod,
            bankReceipt,
            images,
            clientNeedImages: images,
            frequency,
            selectedCar,
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
        step, subStep1, paymentMethod, bankReceipt, images, frequency, selectedTime, selectedCar, selectedMovingVehicle
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
    }, [currentCity, currentArea, selectedMovingVehicle]);

    // Initialize taskSize if a default is provided (e.g. for private_driver)
    useEffect(() => {
        if (step === 1 && subStep1 === 'size' && !taskSize && (serviceConfig as any).defaultDays) {
            setTaskSize(String((serviceConfig as any).defaultDays));
        }
    }, [step, subStep1, taskSize, serviceConfig]);

    const placeholderText = useMemo(() => {
        if (subService) {
            const sub = subService.toLowerCase();
            // Furniture Assembly
            if (sub.includes('ikea')) return t({
                en: 'Example: Need to assemble a PAX wardrobe with sliding doors.',
                fr: 'Exemple : J\'ai besoin de monter une armoire PAX avec portes coulissantes.',
                ar: 'مثال: بحاجة لتجميع خزانة ملابس PAX بأبواب منزلقة.'
            });
            if (sub.includes('crib')) return t({
                en: 'Example: Need to assemble a baby crib (instructions included).',
                fr: 'Exemple : Besoin d\'assembler un lit de bébé (instructions incluses).',
                ar: 'مثال: أحتاج إلى تجميع سرير طفل (التعليمات متوفرة).'
            });
            // Assembly / Handyman
            if (sub.includes('door')) return t({
                en: 'Example: Need to fix a squeaky door and change the lock.',
                fr: 'Exemple : Besoin de réparer une porte qui grince et changer la serrure.',
                ar: 'مثال: بحاجة لإصلاح باب يصدر صريراً وتغيير القفل.'
            });
            // Mounting
            if (sub.includes('tv_mount')) return t({
                en: 'Example: Need to mount a 65" TV on drywall. I have the bracket.',
                fr: 'Exemple : Dois fixer une TV 65" sur du placo. J\'ai le support.',
                ar: 'مثال: أحتاج تثبيت تلفزيون 65 بوصة على جدار جاف. لدي الحامل.'
            });
            if (sub.includes('curtain')) return t({
                en: 'Example: Need to drill in 4 curtain rods above the windows.',
                fr: 'Exemple : Faudra percer 4 tringles à rideaux au-dessus des fenêtres.',
                ar: 'مثال: يجب ثقب 4 أعمدة ستائر فوق النوافذ.'
            });
            if (sub.includes('mirror') || sub.includes('picture')) return t({
                en: 'Example: Need to hang a heavy mirror and 3 large paintings.',
                fr: 'Exemple : Besoin d\'accrocher un miroir lourd et 3 grands tableaux.',
                ar: 'مثال: أريد تعليق مرآة ثقيلة و 3 لوحات كبيرة.'
            });
            // Cleaning
            if (sub.includes('airbnb') || sub.includes('hospitality')) return t({
                en: 'Example: Checkout at 11 AM. Need fresh linens and a deep clean.',
                fr: 'Exemple : Check-out à 11h. Besoin de draps propres et grand ménage.',
                ar: 'مثال: المغادرة 11 صباحاً. أحتاج أغطية نظيفة وتنظيف عميق.'
            });
            if (sub.includes('deep_clean')) return t({
                en: 'Example: Need inside of fridge/oven cleaned, and baseboards dusted.',
                fr: 'Exemple : Besoin de nettoyer frigo/four et épousseter les plinthes.',
                ar: 'مثال: يجب تنظيف الثلاجة/الفرن من الداخل، ومسح الألواح السفلية.'
            });
            if (sub.includes('car_wash') || sub.includes('detail')) return t({
                en: 'Example: Full interior and exterior wash for an SUV.',
                fr: 'Exemple : Lavage complet intérieur et extérieur pour un SUV.',
                ar: 'مثال: غسيل كامل داخلي وخارجي لسيارة دفع رباعي.'
            });
            // Cooking
            if (sub.includes('moroccan_cooking') || sub.includes('class')) return t({
                en: 'Example: Want to learn to make traditional Chicken Tagine & Harira.',
                fr: 'Exemple : Je veux apprendre à préparer un tajine au poulet et Harira.',
                ar: 'مثال: أريد أن أتعلم تحضير طاجين الدجاج التقليدي والحريرة.'
            });
            if (sub.includes('private_chef')) return t({
                en: 'Example: Need a chef for a dinner party of 8. We prefer seafood.',
                fr: 'Exemple : Chef pour un dîner de 8 personnes. Préférence fruits de mer.',
                ar: 'مثال: نحتاج طاهٍ لحفل عشاء من 8 أشخاص. نفضل المأكولات البحرية.'
            });
            if (sub.includes('pastry')) return t({
                en: 'Example: I would like to learn to make Gazelle Horns and Chebakia.',
                fr: 'Exemple : Je voudrais apprendre à faire Cornes de Gazelle et Chebakia.',
                ar: 'مثال: أود أن أتعلم صنع كعب الغزال والشباكية.'
            });
            if (sub.includes('market_tour')) return t({
                en: 'Example: We want a market tour to buy spices & cook lamb tagine.',
                fr: 'Exemple : Visite du marché aux épices & cuisiner un tajine d\'agneau.',
                ar: 'مثال: نريد جولة في السوق لشراء التوابل وطبخ طاجين لحم.'
            });
            // Driver
            if (sub.includes('city_half') || sub.includes('city_full')) return t({
                en: 'Example: Need a driver to visit Majorelle Garden and the Medina.',
                fr: 'Exemple : Besoin d\'un chauffeur pour visiter le jardin Majorelle et la Médina.',
                ar: 'مثال: أحتاج سائقاً لزيارة حديقة ماجوريل والمدينة القديمة.'
            });
            if (sub.includes('airport')) return t({
                en: 'Example: Pickup from Menara Airport at 2 PM, flight AB123.',
                fr: 'Exemple : Prise en charge à l\'aéroport Menara à 14h, vol AB123.',
                ar: 'مثال: الاستقبال من مطار المنارة الساعة 2 ظهراً، الرحلة AB123.'
            });
            if (sub.includes('intercity')) return t({
                en: 'Example: Need a driver to go from Marrakech to Essaouira and back.',
                fr: 'Exemple : Besoin d\'un chauffeur pour aller de Marrakech à Essaouira (aller-retour).',
                ar: 'مثال: أحتاج سائقاً للذهاب من مراكش إلى الصويرة والعودة.'
            });
            // Electricity
            if (sub.includes('ev_charger')) return t({
                en: 'Example: Need a Tesla Wall Connector installed. Panel is 5m away.',
                fr: 'Exemple : Installation d\'une borne Tesla. Le panneau est à 5m.',
                ar: 'مثال: تركيب شاحن تسلا. اللوحة تبعد 5 أمتار.'
            });
            if (sub.includes('camera') || sub.includes('surveillance')) return t({
                en: 'Example: Need to install 4 wireless cameras outside the house.',
                fr: 'Exemple : Besoin d\'installer 4 caméras sans fil à l\'extérieur.',
                ar: 'مثال: يجب تركيب 4 كاميرات لاسلكية خارج المنزل.'
            });
            if (sub.includes('cooling') || sub.includes('heating')) return t({
                en: 'Example: My AC is blowing warm air, needs freon recharge.',
                fr: 'Exemple : Ma clim souffle de l\'air chaud, besoin de recharge de gaz.',
                ar: 'مثال: مكيف الهواء ينفث هواء دافئ، يحتاج إلى تعبئة غاز الفريون.'
            });
            // Plumbing
            if (sub.includes('leak')) return t({
                en: 'Example: The pipe under the kitchen sink is dripping constantly.',
                fr: 'Exemple : Le tuyau sous l\'évier de la cuisine fuit constamment.',
                ar: 'مثال: أنبوب تحت حوض المطبخ يسرب الماء باستمرار.'
            });
            if (sub.includes('drain')) return t({
                en: 'Example: The shower drain is completely clogged.',
                fr: 'Exemple : L\'évacuation de la douche est complètement bouchée.',
                ar: 'مثال: البالوعة في الحمام مسدودة بالكامل.'
            });
            if (sub.includes('faucet') || sub.includes('toilet')) return t({
                en: 'Example: The bathroom sink faucet is leaking from the handle.',
                fr: 'Exemple : Le robinet du lavabo fuit au niveau de la poignée.',
                ar: 'مثال: حنفية حوض الحمام تسرب من المقبض.'
            });
            // Tour Guide
            if (sub.includes('tour') || sub.includes('guide')) return t({
                en: 'Example: We are a family of 4 looking to explore hidden Medina gems.',
                fr: 'Exemple : Nous sommes une famille de 4 cherchant à explorer la Médina.',
                ar: 'مثال: نحن عائلة من 4 أفراد نتطلع لاستكشاف أسرار المدينة القديمة.'
            });
            // Language
            if (sub.includes('arabic') || sub.includes('darija')) return t({
                en: 'Example: I want to focus on conversational Darija for bargaining.',
                fr: 'Exemple : Je veux me concentrer sur la Darija conversationnelle pour négocier.',
                ar: 'مثال: أود التركيز على الدارجة للمحادثات والمساومة.'
            });
        }

        // Fallback to service level
        if (service === 'mounting') return t({
            en: 'Example: I need to install a TV on a wall. I already have the bracket.',
            fr: 'Exemple : Je dois installer une TV au mur. J\'ai déjà le support.',
            ar: 'مثال: أحتاج إلى تثبيت تلفزيون على الحائط. لدي الحامل بالفعل.'
        });
        if (service === 'cleaning') return t({
            en: 'Example: Standard cleaning for a 2-bedroom apartment. I have supplies.',
            fr: 'Exemple : Ménage standard pour un appartement T3. J\'ai les produits.',
            ar: 'مثال: تنظيف عادي لشقة بغرفتين. لدي مواد التنظيف.'
        });
        if (service === 'moving') return t({
            en: 'Example: Moving a sofa and 5 boxes to the 3rd floor (no elevator).',
            fr: 'Exemple : Déménagement d\'un canapé et 5 cartons au 3ème étage (sans ascenseur).',
            ar: 'مثال: نقل أريكة و 5 صناديق إلى الطابق الثالث (بدون مصعد).'
        });
        if (service === 'errands') return t({
            en: 'Example: Pick up groceries from Marjane and deliver them to my house.',
            fr: 'Exemple : Récupérer des courses à Marjane et les livrer chez moi.',
            ar: 'مثال: استلام بقالة من مرجان وتوصيلها إلى منزلي.'
        });
        if (service === 'plumbing') return t({
            en: 'Example: The sink is leaking from the bottom pipe.',
            fr: 'Exemple : L\'évier fuit au niveau du tuyau inférieur.',
            ar: 'مثال: الحوض يسرب من الأنبوب السفلي.'
        });
        if (service === 'electricity' || service === 'electrical') return t({
            en: 'Example: Need to install a new ceiling light fixture.',
            fr: 'Exemple : Besoin d\'installer un nouveau plafonnier.',
            ar: 'مثال: أحتاج إلى تركيب إضاءة سقف جديدة.'
        });
        if (service === 'private_driver') return t({
            en: 'Example: Need a driver for airport pickup at Menara and trip to Palmeraie.',
            fr: 'Exemple : Besoin d\'un chauffeur pour transfert aéroport Menara vers la Palmeraie.',
            ar: 'مثال: أحتاج سائق للاستقبال من مطار المنارة والتوصيل إلى النخيل.'
        });
        if (service === 'cooking') return t({
            en: 'Example: Looking to learn how to make Chicken Tagine.',
            fr: 'Exemple : Je souhaite apprendre à préparer un Tajine au poulet.',
            ar: 'مثال: أريد أن أتعلم كيفية تحضير طاجين الدجاج.'
        });

        // Default
        return t({
            en: 'Describe tasks, details, tools needed, or any special instructions...',
            fr: 'Décrivez les tâches, détails, outils nécessaires ou instructions spéciales...',
            ar: 'صف المهام، التفاصيل، الأدوات المطلوبة، أو أي تعليمات خاصة...'
        });
    }, [service, subService, t]);

    const handleStartMatching = () => {
        // For car_rental, skip taskSize/description validation
        if (service !== 'car_rental' && (!taskSize || !description.trim())) return;

        if (service !== 'car_rental') {
            try {
                const drafts = [description.trim(), ...descriptionDrafts.filter(d => d !== description.trim())].slice(0, 5);
                setDescriptionDrafts(drafts);
                localStorage.setItem('lbricol_description_drafts', JSON.stringify(drafts));
            } catch (e) { }
        }

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
        try {
            // Reduced timeout to 15s for better mobile experience. Compressed images are small.
            const result = await Promise.race([
                uploadBytes(storageRef, file, { contentType: 'image/jpeg' }).then(() => getDownloadURL(storageRef)),
                new Promise<string>((_, reject) => setTimeout(() => reject(new Error('IMAGE_UPLOAD_TIMEOUT')), 15000))
            ]);
            return result;
        } catch (err: any) {
            console.error("Firebase upload error at path:", path, err);
            // If it's a permission error, it's likely the anonymous upload rule missing or auth token propagation lag.
            if (err?.code === 'storage/unauthorized' || err?.message?.includes('unauthorized')) {
                throw new Error('PERMISSION_DENIED');
            }
            throw err;
        }
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
        if (service === 'private_driver') {
            return [{ from: '08:00', to: '18:00' }]; // More flexible for drivers
        }
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

    const isSlotBookedOnDate = (dateStr: string, startTimeStr: string, endTimeStr: string, allBookedOrders: any[]) => {
        const start = timeToMinutes(startTimeStr);
        const end = timeToMinutes(endTimeStr);

        return allBookedOrders.some(order => {
            const orderDate = parseISO(order.date);
            const isDailyOrder = order.serviceId === 'private_driver' || order.service === 'private_driver';
            const oDurationDays = order.durationDays || (isDailyOrder ? Math.ceil(order.duration || 1) : 1);

            const orderDays: string[] = [];
            for (let k = 0; k < oDurationDays; k++) {
                orderDays.push(format(addDays(orderDate, k), 'yyyy-MM-dd'));
            }

            if (!orderDays.includes(dateStr)) return false;
            if (!order.time || order.time === 'Flexible') return false;

            const oStart = timeToMinutes(order.time);
            let oDurationHours = 1;
            if (isDailyOrder) {
                oDurationHours = 8; // Assume a full day for private driver bookings
            } else if (order.taskSize) {
                oDurationHours = TASK_SIZES.find(s => s.id === order.taskSize)?.duration || 1;
            } else {
                oDurationHours = order.duration || 1;
            }
            const oEnd = oStart + (oDurationHours * 60);

            return (start < oEnd) && (oStart < end);
        });
    };

    const getAvailableSlotsForDate = (dateStr: string, profile: any) => {
        if (!profile) return [];

        const isDailyService = service === 'private_driver';
        const baseDuration = (activeTaskSize as any)?.duration || (isDailyService ? 1 : 2);
        const durationHours = isDailyService ? (baseDuration < 1 ? baseDuration * 8 : 8) : Math.min(baseDuration, 7); // Max 7 hours for non-daily to avoid full-day conflicts
        const daysNeeded = isDailyService ? Math.ceil(baseDuration) : 1;

        // Handle multi-day bookings (e.g. Private Driver 2+ days)
        // For multi-day tasks, a slot is available on the 'date' if the provider is free
        // for the FULL daily block (e.g. 8h) on every day of the sequence.
        if (isDailyService && daysNeeded > 1) {
            const startDate = parseISO(dateStr);
            const dailyStartTime = "09:00"; // Standard full-day start
            const dailyEndTime = "17:00"; // Standard full-day end (8 hours)

            // Check each day in the sequence
            for (let i = 0; i < daysNeeded; i++) {
                const currentDate = addDays(startDate, i);
                const currentDateStr = format(currentDate, 'yyyy-MM-dd');
                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const dayKey = dayNames[currentDate.getDay()];

                const dayRoutine = profile.routine?.[dayKey];
                if (!dayRoutine || !dayRoutine.active) return []; // If any day in sequence is inactive, no slots

                // Check if they are already booked for ANYTHING on this specific day
                if (isSlotBookedOnDate(currentDateStr, dailyStartTime, dailyEndTime, bookedOrders)) {
                    return [];
                }
            }

            // If we reach here, the full 8h block is available for all days
            return [dailyStartTime];
        }

        const checkAvailabilityOnDay = (dStr: string) => {
            const blocksRaw = (profile as any).calendarSlots?.[dStr] || (profile as any).availability?.[dStr];
            const blocks = Array.isArray(blocksRaw)
                ? blocksRaw
                : getHeroFallbackSlots(profile, safeParseDate(dStr));
            return blocks;
        };

        const firstDayBlocks = checkAvailabilityOnDay(dateStr);
        if (firstDayBlocks.length === 0) return [];

        const durationMin = durationHours * 60;
        const slots: string[] = [];

        const sortedBlocks = [...firstDayBlocks].sort((a, b) => a.from.localeCompare(b.from));
        const mergedBlocks: { from: string; to: string }[] = [];
        if (sortedBlocks.length > 0) {
            let currentBlock = { ...sortedBlocks[0] };
            for (let i = 1; i < sortedBlocks.length; i++) {
                if (sortedBlocks[i].from <= currentBlock.to) {
                    if (sortedBlocks[i].to > currentBlock.to) currentBlock.to = sortedBlocks[i].to;
                } else {
                    mergedBlocks.push(currentBlock);
                    currentBlock = { ...sortedBlocks[i] };
                }
            }
            mergedBlocks.push(currentBlock);
        }

        mergedBlocks.forEach((block) => {
            let current = timeToMinutes(block.from);
            const endLimit = timeToMinutes(block.to);
            while (current + durationMin <= endLimit) {
                const startTime = minutesToTime(current);
                const endTime = minutesToTime(current + durationMin);

                // Verification: Are subsequent days also free in this timeframe?
                let allDaysFree = true;
                for (let i = 0; i < daysNeeded; i++) {
                    const checkDateStr = format(addDays(parseISO(dateStr), i), 'yyyy-MM-dd');

                    // 1. Check if slot overlaps with booked orders
                    if (isSlotBookedOnDate(checkDateStr, startTime, endTime, bookedOrders)) {
                        allDaysFree = false;
                        break;
                    }

                    // 2. Check if the pro is actually working that day in that timeslot
                    if (i > 0) {
                        const dayBlocks = checkAvailabilityOnDay(checkDateStr);
                        const isWorking = dayBlocks.some(b => b.from <= startTime && b.to >= endTime);
                        if (!isWorking) {
                            allDaysFree = false;
                            break;
                        }
                    }
                }

                if (allDaysFree) {
                    slots.push(startTime);
                }
                current += 60;
            }
        });

        return slots;
    };

    const generateAvailableSlots = () => {
        if (!selectedDate || !selectedPro) return [];
        return getAvailableSlotsForDate(selectedDate, selectedPro);
    };

    const isSlotBooked = (startTimeStr: string) => {
        if (!selectedDate || !selectedPro) return false;
        const isDailyService = service === 'private_driver';
        const baseDuration = (activeTaskSize as any)?.duration || (isDailyService ? 1 : 2);
        const durationHours = isDailyService ? (baseDuration < 1 ? baseDuration * 8 : 8) : Math.min(baseDuration, 7);
        const daysNeeded = isDailyService ? Math.ceil(baseDuration) : 1;

        const startTime = timeToMinutes(startTimeStr);
        const endTime = minutesToTime(startTime + (durationHours * 60));

        for (let i = 0; i < daysNeeded; i++) {
            const checkDate = format(addDays(parseISO(selectedDate), i), 'yyyy-MM-dd');
            if (isSlotBookedOnDate(checkDate, startTimeStr, endTime, bookedOrders)) return true;
        }
        return false;
    };

    const fetchBricolers = async () => {
        if (!currentCity || !service) return;
        setIsLoadingBricolers(true);

        const baseCity = currentCity.trim();
        const targetSvc = getServiceById(service);
        const targetServiceId = targetSvc?.id?.toLowerCase() || service?.toLowerCase() || '';

        // ── Shared: area normalization & service matching (used for both index + fallback) ──
        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
        const isStrictCity = ['Casablanca', 'Marrakech'].includes(baseCity);

        const areaMatches = (proAreas: string[]): boolean => {
            if (!currentArea) return true;
            const targetAreaNorm = normalize(currentArea);

            // If client selected "All the city", everything matches
            if (targetAreaNorm === 'toutelaville' || targetAreaNorm === 'all' || targetAreaNorm === 'toutemaghrib' || targetAreaNorm === 'toute_la_ville') return true;

            const normalized = proAreas.map(a => normalize(String(a)));

            // If Bricoler serves "All the city", they match any area
            if (normalized.some(pa =>
                pa === 'all' ||
                pa === 'toutelaville' ||
                pa === 'toute_la_ville' ||
                pa === 'tout_marrakech' ||
                pa === 'tout_casablanca' ||
                pa === 'toutemaroc'
            )) {
                return true;
            }

            return normalized.some(pa => pa.includes(targetAreaNorm) || targetAreaNorm.includes(pa));
        };

        const serviceMatches = (services: any[], rawData: any): { matched: boolean; svcData: any } => {
            const matchingService = services?.find((s: any) => {
                const sId = typeof s === 'string' ? s : (s.categoryId || s.serviceId || '');
                if (sId.toLowerCase() !== targetServiceId) return false;
                if (typeof s === 'object' && s.isActive === false) return false;
                if (subService) {
                    if (typeof s === 'string') return true;
                    const ssId = s.subServiceId || (s.subServices?.includes(subService) ? subService : null);
                    if (!ssId) return false;
                    const normSsId = ssId.toLowerCase().replace(/[_\s-]/g, '');
                    const normSubSvc = subService.toLowerCase().replace(/[_\s-]/g, '');
                    if (!(normSsId === normSubSvc || (Array.isArray(s.subServices) && s.subServices.some((sub: string) => sub.toLowerCase().replace(/[_\s-]/g, '') === normSubSvc)))) return false;
                }
                if (service === 'tour_guide' && selectedLanguages.length > 0) {
                    const bricolerLangs = s.spokenLanguages || (typeof s === 'object' ? s.languages : []) || [];
                    if (!selectedLanguages.some(l => bricolerLangs.includes(l))) return false;
                }
                if (service === 'moving' && selectedMovingVehicle) {
                    const vehicles = rawData.movingTransports || (rawData.movingTransport ? [rawData.movingTransport] : []);
                    if (!vehicles.includes(selectedMovingVehicle)) return false;
                }
                return true;
            });
            return { matched: !!matchingService, svcData: matchingService };
        };

        const buildBricoler = (docId: string, data: any, svcData: any, servesArea: boolean): Bricoler => ({
            id: docId,
            displayName: data.displayName || data.name || 'Bricoler',
            photoURL: data.profilePhotoURL || data.avatar || data.photoURL,
            rating: data.rating || 0,
            completedJobs: data.completedJobs || 0,
            hourlyRate: (typeof svcData === 'object' ? svcData.hourlyRate : null) || (data.services?.find((s: any) => (s.categoryId || s.serviceId) === targetServiceId)?.hourlyRate) || data.hourlyRate || 75,
            pitch: (typeof svcData === 'object' ? svcData.pitch : null) || (data.services?.find((s: any) => (s.categoryId || s.serviceId) === targetServiceId)?.pitch) || data.pitch,
            quickPitch: data.quickPitch,
            city: data.city || baseCity,
            areas: data.workAreas || data.areas || [],
            isVerified: data.isVerified,
            services: data.services || [],
            routine: data.routine || {},
            calendarSlots: data.calendarSlots || {},
            availability: data.calendarSlots || {},
            bio: data.bio,
            glassCleaningEquipments: data.glassCleaningEquipments || [],
            serviceEquipments: typeof svcData === 'object' ? svcData.equipments : [],
            yearsOfExperience: (typeof svcData === 'object' ? svcData.experience : null) || data.yearsOfExperience || data.experience,
            isActive: true,
            reviews: data.reviews || [],
            portfolio: data.portfolio || [],
            errandsTransport: data.errandsTransport,
            movingTransport: data.movingTransport,
            movingTransports: data.movingTransports || (data.movingTransport ? [data.movingTransport] : []),
            whatsappNumber: data.whatsappNumber,
            servesArea,
            carRentalDetails: data.carRentalDetails,
        });

        let results: Bricoler[] = [];

        try {
            // ── PRIMARY: Query the fast city_index (pre-sorted by matchScore) ──────────
            // Wrap in its own try/catch to ensure fallback always runs if this fails
            try {
                const indexSnap = await getDocs(
                    query(
                        collection(db, 'city_index', baseCity, 'providers'),
                        where('isActive', '==', true),
                        limit(100) // Increased limit to find more matches during server-side filtering
                    )
                );

                if (indexSnap.size > 0) {
                    indexSnap.docs.forEach(docSnap => {
                        const data = docSnap.data();
                        const servesArea = areaMatches([...(data.workAreas || []), ...(data.areas || [])]);
                        if (!servesArea && isStrictCity) return;
                        const { matched, svcData } = serviceMatches(data.services || [], data);
                        if (matched) {
                            results.push(buildBricoler(docSnap.id, data, svcData, servesArea));
                        }
                    });

                    // Sort: area first, then by pre-computed score fields
                    results.sort((a, b) => {
                        if (a.servesArea && !b.servesArea) return -1;
                        if (!a.servesArea && b.servesArea) return 1;
                        const aScore = (a.rating || 0) * Math.log10((a.completedJobs || 0) + 2);
                        const bScore = (b.rating || 0) * Math.log10((b.completedJobs || 0) + 2);
                        return bScore - aScore;
                    });

                    results = results.slice(0, 30); // final cap
                }
            } catch (indexErr) {
                console.warn("[fetchBricolers] city_index query failed, will use fallback:", indexErr);
            }

            // ── FALLBACK: If index found nothing or failed, use full scan ──
            if (results.length === 0) {
                console.info('[fetchBricolers] Index returned 0 matches, scanning full bricolers collection for', baseCity);
                // Try exact city match first
                const fallbackSnap = await getDocs(
                    query(collection(db, 'bricolers'), where('city', '==', baseCity))
                );
                fallbackSnap.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.isActive === false) return; // Lenient: skip ONLY if explicitly false
                    const servesArea = areaMatches([...(data.workAreas || []), ...(data.areas || [])]);
                    if (!servesArea && isStrictCity) return;
                    const { matched, svcData } = serviceMatches(data.services || [], data);
                    if (matched) results.push(buildBricoler(docSnap.id, data, svcData, servesArea));
                });
                results.sort((a, b) => {
                    if (a.servesArea && !b.servesArea) return -1;
                    if (!a.servesArea && b.servesArea) return 1;
                    return ((b.rating || 0) * Math.log10((b.completedJobs || 0) + 2))
                        - ((a.rating || 0) * Math.log10((a.completedJobs || 0) + 2));
                });
            }

            // ── car_rental SUPER-FALLBACK: if still empty, scan all docs with carRentalDetails ──
            // This handles spelling mismatches in city or stale city_index entries
            if (results.length === 0 && service === 'car_rental') {
                console.info('[fetchBricolers] car_rental super-fallback: scanning all docs with carRentalDetails');
                const carSnap = await getDocs(
                    query(collection(db, 'bricolers'), where('isActive', '==', true))
                );
                const citySim = (a: string, b: string) => normalize(a).includes(normalize(b)) || normalize(b).includes(normalize(a));
                carSnap.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    if (!data.carRentalDetails?.cars?.length) return;
                    // Only include if city roughly matches
                    if (!citySim(data.city || '', baseCity)) return;
                    const servesArea = areaMatches([...(data.workAreas || []), ...(data.areas || [])]);
                    const { matched, svcData } = serviceMatches(data.services || [], data);
                    // For car rental super-fallback, also accept if carRentalDetails has cars even without service entry
                    if (matched || data.carRentalDetails?.cars?.length > 0) {
                        results.push(buildBricoler(docSnap.id, data, svcData || {}, servesArea));
                    }
                });
                results.sort((a, b) => {
                    if (a.servesArea && !b.servesArea) return -1;
                    if (!a.servesArea && b.servesArea) return 1;
                    return ((b.rating || 0) * Math.log10((b.completedJobs || 0) + 2))
                        - ((a.rating || 0) * Math.log10((a.completedJobs || 0) + 2));
                });
            }

            if (results.length > 0 && service === 'car_rental') {
                const bIds = results.map(r => r.id);
                try {
                    const chunks = [];
                    for (let i = 0; i < bIds.length; i += 10) chunks.push(bIds.slice(i, i + 10));

                    let allJobs: any[] = [];
                    for (const chunk of chunks) {
                        const jobsSnap = await getDocs(
                            query(collection(db, 'jobs'), where('bricolerId', 'in', chunk), where('status', 'in', ['pending', 'confirmed', 'programmed', 'ongoing', 'Pending', 'Programmed', 'Active']))
                        );
                        allJobs.push(...jobsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                    }
                    setCarRentalBookings(allJobs);
                } catch (e) {
                    console.error("Failed to fetch car rental bookings for smart availability", e);
                }
            }

            setBricolers(results);
            if (results.length > 0) playMatchSound();
        } catch (err: any) {
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
                const effectiveRating = (p.rating && p.rating > 0) ? p.rating : 0;
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

    const allAvailableCars = useMemo(() => {
        if (service !== 'car_rental') return [];
        const cars: { car: any, bricoler: Bricoler }[] = [];
        // Use sortedBricolers to maintain the same ordering logic (city, area, rating)
        sortedBricolers.forEach(b => {
            if (b.carRentalDetails?.cars) {
                b.carRentalDetails.cars.forEach(c => {
                    cars.push({ car: c, bricoler: b });
                });
            }
        });
        return cars;
    }, [sortedBricolers, service]);

    const filteredAreas = useMemo(() => {
        const all = tempCity ? MOROCCAN_CITIES_AREAS[tempCity] || [] : [];
        if (!areaSearch.trim()) return all;
        return all.filter(a => a.toLowerCase().includes(areaSearch.toLowerCase()));
    }, [tempCity, areaSearch]);

    const renderedCalendarDays = useMemo(() => {
        const daysArr = [];
        const todayCal = new Date();
        todayCal.setHours(0, 0, 0, 0);

        const startOfWeekCal = new Date(todayCal);
        startOfWeekCal.setDate(todayCal.getDate() - todayCal.getDay());

        for (let i = 0; i < 31; i++) { // Render 31 days for more choice
            const dCal = new Date(startOfWeekCal);
            dCal.setDate(startOfWeekCal.getDate() + i);
            const dateStrCal = format(dCal, 'yyyy-MM-dd');
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
    }, [selectedPro, selectedDate, activeTaskSize, bookedOrders, language]);

    const carRentalCalendarDays = useMemo(() => {
        const daysArr = [];
        const todayCal = new Date();
        todayCal.setHours(0, 0, 0, 0);

        const startOfWeekCal = new Date(todayCal);
        startOfWeekCal.setDate(todayCal.getDate() - todayCal.getDay());

        for (let i = 0; i < 31; i++) {
            const dCal = new Date(startOfWeekCal);
            dCal.setDate(startOfWeekCal.getDate() + i);
            const dateStrCal = format(dCal, 'yyyy-MM-dd');

            const isPast = dCal < todayCal;
            const isToday = dCal.getTime() === todayCal.getTime();
            const isPickup = selectedDate === dateStrCal;
            const isReturn = carReturnDate === dateStrCal;

            const pTime = selectedDate ? new Date(selectedDate).getTime() : 0;
            const rTime = carReturnDate ? new Date(carReturnDate).getTime() : 0;
            const cTime = dCal.getTime();

            const inRange = pTime && rTime && cTime > pTime && cTime < rTime;

            daysArr.push(
                <button
                    key={i}
                    disabled={isPast}
                    onClick={() => {
                        if (openCalendarMode === 'pickup' || !openCalendarMode) {
                            setSelectedDate(dateStrCal);
                            if (carReturnDate && new Date(dateStrCal) > new Date(carReturnDate)) {
                                setCarReturnDate(null);
                            }
                            setOpenCalendarMode('return');
                        } else if (openCalendarMode === 'return') {
                            if (selectedDate && new Date(dateStrCal) < new Date(selectedDate)) {
                                setSelectedDate(dateStrCal);
                                setCarReturnDate(null);
                                setOpenCalendarMode('return');
                            } else {
                                setCarReturnDate(dateStrCal);
                                setOpenCalendarMode(null);
                            }
                        }
                    }}
                    className={cn(
                        "h-12 w-[calc(100%+8px)] -ml-[4px] flex items-center justify-center text-[16px] font-bold transition-all relative",
                        (isPickup || isReturn) ? "bg-[#00A082] text-white rounded-md z-10" :
                            isToday ? "border-2 border-[#00A082]/30 bg-[#00A082]/5 text-[#00A082] rounded-md" :
                                inRange ? "bg-[#00A082]/10 text-[#00A082]" :
                                    !isPast ? "text-neutral-900 hover:bg-neutral-50 rounded-md" : "text-neutral-300 pointer-events-none opacity-40"
                    )}
                >
                    {dCal.getDate()}
                </button>
            );
        }
        return daysArr;
    }, [selectedDate, carReturnDate, language, openCalendarMode]);

    const handleLocationSave = (city?: string, area?: string) => {
        const finalCity = city !== undefined ? city : tempCity;
        const finalArea = area !== undefined ? area : tempArea;
        setCurrentCity(finalCity);
        setCurrentArea(finalArea);
        setIsSelectingLocation(false);
    };

    const handleFinalSubmit = async () => {
        if (isSubmitting) return;

        if (isUploadingReceipt) {
            alert(t({ en: 'Please wait for the receipt photo to finish uploading...', fr: 'Veuillez patienter pendant le téléchargement de la photo du reçu...', ar: 'يرجى الانتظار حتى يتم تحميل صورة الإيصال...' }));
            return;
        }

        if (paymentMethod === 'bank' && !bankReceipt) {
            alert(t({ en: 'Please upload your transfer receipt before programming the mission.', fr: 'Veuillez télécharger votre reçu de virement avant de programmer la mission.', ar: 'يرجى تحميل إيصال التحويل قبل برمجة المهمة.' }));
            return;
        }

        setIsSubmitting(true);
        try {
            const user = auth.currentUser;

            // Gather client data if available
            let clientName = user?.displayName || 'Client';
            let clientWhatsApp = user?.phoneNumber || '';

            if (user) {
                try {
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const uData = userSnap.data();
                        clientWhatsApp = uData.whatsappNumber || clientWhatsApp;
                        clientName = uData.name || clientName;
                    }
                    const clientDoc = await getDoc(doc(db, 'clients', user.uid));
                    if (clientDoc.exists()) {
                        const cData = clientDoc.data();
                        clientName = cData.name || clientName;
                        clientWhatsApp = cData.whatsappNumber || cData.whatsapp || clientWhatsApp;
                    }
                } catch (e) {
                    console.log("Error fetching user info:", e);
                }
            }

            const selectedPro = bricolers.find(b => b.id === selectedBricolerId);
            let hourlyRate = selectedPro?.hourlyRate || 75;
            if (service === 'car_rental' && selectedCar?.pricePerDay) {
                hourlyRate = selectedCar.pricePerDay;
            }
            const activeOption = serviceConfig.options.find(o => o.id === taskSize);
            let duration = activeOption?.duration || 1;
            let durationDays = 1;
            if (service === 'car_rental' && selectedDate && carReturnDate) {
                const start = new Date(selectedDate).getTime();
                const end = new Date(carReturnDate).getTime();
                duration = Math.max(1, Math.round((end - start) / 86400000));
                durationDays = duration;
            } else if (service === 'private_driver' || (service === 'cooking' && activeOption?.id && !isNaN(Number(activeOption.id)))) {
                durationDays = Math.ceil(duration);
            }

            const basePrice = calculateTaskPrice(
                hourlyRate,
                service === 'car_rental' ? String(duration) : taskSize,
                service,
                subService,
                serviceConfig.options,
                applyReferralDiscount,
                referralDiscountAvailable
            );

            let finalBankReceiptUrl = null;
            if (paymentMethod === 'bank' && bankReceipt && isImageDataUrl(bankReceipt)) {
                try {
                    const blob = await dataUrlToBlob(bankReceipt);
                    const storagePath = `receipts/${user?.uid || 'anonymous'}/${Date.now()}_receipt.jpg`;
                    finalBankReceiptUrl = await uploadImageToStorage(blob, storagePath);
                } catch (err) {
                    console.error("Error uploading receipt:", err);
                    alert(t({ en: 'Failed to upload receipt.', fr: 'Échec du téléchargement du reçu.' }));
                    setIsSubmitting(false);
                    return;
                }
            } else if (paymentMethod === 'bank') {
                finalBankReceiptUrl = bankReceipt;
            }

            const commissionRate = 0.15;
            const totalPrice = basePrice;
            const taskFee = totalPrice * (1 - commissionRate);

            const getBricolerRankLabel = (pro: any): 'New' | 'Classic' | 'Pro' | 'Elite' => {
                const jobs = Math.max(pro.completedJobs || 0, (pro.reviews || []).length);
                const rating = (pro.rating && pro.rating > 0) ? pro.rating : 0;
                if (jobs > 40 && rating >= 4.5) return 'Elite';
                if (jobs >= 20 && rating >= 4.4) return 'Pro';
                if (jobs >= 10) return 'Classic';
                return 'New';
            };

            const coefficient = (activeOption as any)?.coefficient || (service === 'errands' ? 1.5 : 1);
            
            const orderData = {
                clientId: user?.uid || null,
                clientName,
                clientWhatsApp,
                service,
                subService: subService || null,
                selectedCar: selectedCar || null,
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
                carReturnDate: carReturnDate || null,
                carReturnTime: carReturnTime || null,
                duration: service === 'car_rental' ? `${duration} ${t({ en: duration > 1 ? 'days' : 'day', fr: duration > 1 ? 'jours' : 'jour' })}` : (activeOption?.estTime ? t(activeOption.estTime as any) : (duration + 'h')),
                basePrice,
                taskFee,
                totalPrice: basePrice,
                price: basePrice,
                referralApplied: applyReferralDiscount && referralDiscountAvailable > 0,
                durationDays,
                movingVehicle: selectedMovingVehicle,
                images: images,
                clientNeedImages: images,
                paymentMethod,
                bankReceipt: finalBankReceiptUrl,
                frequency,
                createdAt: serverTimestamp()
            };

            await onSubmit(orderData);

            if (user) {
                if (clientWhatsApp) {
                    setDoc(doc(db, 'users', user.uid), { whatsappNumber: clientWhatsApp }, { merge: true }).catch(console.error);
                }
                setShowSuccessAnimation(true);
                // Clear drafts ... (already handled in page.tsx handleQuickOrderSubmit if we want, but can do here too)
                const draftId = continueDraft?.id;
                if (draftId) {
                    try {
                        let drafts = JSON.parse(localStorage.getItem('lbricol_order_drafts') || '[]');
                        drafts = drafts.filter((d: any) => d.id !== draftId);
                        localStorage.setItem('lbricol_order_drafts', JSON.stringify(drafts));
                    } catch (e) { }
                }
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
                                    transition={{ duration: 0.25, ease: "easeOut" }}
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
                                                    {/* "All the city" option for clients to see everyone in the city */}
                                                    <motion.button
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0 }}
                                                        onClick={() => { setTempArea('Toute la ville'); handleLocationSave(tempCity, 'Toute la ville'); }}
                                                        className="w-full text-left py-4 px-1 active:bg-neutral-50 transition-colors border-b border-neutral-100 flex items-center justify-between group"
                                                    >
                                                        <div>
                                                            <p className="text-[17px] font-black text-[#00A082]">{t({ en: 'All the city', fr: 'Toute la ville', ar: 'كل المدينة' })}</p>
                                                            <p className="text-[13px] font-semibold text-neutral-400 mt-0.5">{tempCity}, {t({ en: 'Morocco', fr: 'Maroc', ar: 'المغرب' })}</p>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-full bg-[#00A082]/10 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
                                                            <Check size={16} className="text-[#00A082]" />
                                                        </div>
                                                    </motion.button>

                                                    {filteredAreas.map((area, idx) => (
                                                        <motion.button
                                                            key={area}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            transition={{ delay: Math.min((idx + 1) * 0.03, 0.3) }}
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
                                                    private_driver: '/Images/Vectors Illu/BWCardirever.png',
                                                    cooking: '/Images/Vectors Illu/cooking.png',
                                                    pool_cleaning: '/Images/Vectors Illu/Poolcleaning_VI.png',
                                                    pets_care: '/Images/Vectors Illu/petscare.png',
                                                };
                                                const iconName = activeService ? serviceIconMap[activeService.id] || 'homerepairVector.png' : 'homerepairVector.png';
                                                const iconPath = iconName.startsWith('/') ? iconName : "/Images/Service Category vectors/" + iconName;
                                                return <img src={iconPath} className="w-4 h-4 object-contain" />;
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
                                                    {service === 'car_rental'
                                                        ? t({ en: 'When do you want the car and when will you return it?', fr: 'Quand voulez-vous la voiture et quand allez-vous la retourner ?', ar: 'متى تريد السيارة ومتى ستعيدها؟' })
                                                        : serviceConfig.title}
                                                </motion.h4>
                                                <div className="flex flex-col gap-4">
                                                    {service === 'car_rental' ? (
                                                        <div className="flex flex-col gap-6 w-full -mx-1 px-1">
                                                            {/* Range Pickers */}
                                                            <div className="bg-white rounded-[24px] border border-neutral-100 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-5">
                                                                {/* Pick up */}
                                                                <div className="space-y-2.5">
                                                                    <label className="text-[14px] font-black text-neutral-900 uppercase tracking-tight">{t({ en: 'Pick up', fr: 'Prise en charge' })}</label>
                                                                    <div className="flex items-center gap-3">
                                                                        <button
                                                                            onClick={() => setOpenCalendarMode(openCalendarMode === 'pickup' ? null : 'pickup')}
                                                                            className="flex-1 flex items-center justify-between px-4 h-12 bg-neutral-50 rounded-xl border border-neutral-100 transition-colors focus:border-[#00A082] focus:bg-white"
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <Calendar size={18} className={openCalendarMode === 'pickup' ? "text-[#00A082]" : "text-neutral-500"} />
                                                                                <span className="font-bold text-[14px] text-neutral-900">
                                                                                    {selectedDate ? format(new Date(selectedDate), 'E, MMM d') : t({ en: 'Select Date', fr: 'Choisir la date' })}
                                                                                </span>
                                                                            </div>
                                                                        </button>
                                                                        <div className="relative w-[130px]">
                                                                            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none z-10" />
                                                                            <select
                                                                                className="w-full h-12 bg-neutral-50 rounded-xl border border-neutral-100 pl-8 pr-6 font-bold text-[14px] text-neutral-900 outline-none appearance-none"
                                                                                value={selectedTime || ''}
                                                                                onChange={e => setSelectedTime(e.target.value)}
                                                                            >
                                                                                <option value="" disabled>-</option>
                                                                                {Array.from({ length: 48 }).map((_, i) => {
                                                                                    const totalMinutes = i * 30;
                                                                                    // Filter slots if today is selected (at least 1 hour from now)
                                                                                    if (selectedDate && isToday(parseISO(selectedDate))) {
                                                                                        const now = new Date();
                                                                                        const currentMinutes = now.getHours() * 60 + now.getMinutes();
                                                                                        if (totalMinutes < currentMinutes + 60) return null;
                                                                                    }

                                                                                    const hours24 = Math.floor(totalMinutes / 60);
                                                                                    const mins = totalMinutes % 60;
                                                                                    const timeStr = `${hours24.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                                                                                    return <option key={timeStr} value={timeStr}>{timeStr}</option>;
                                                                                })}
                                                                            </select>
                                                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="w-full h-px bg-neutral-100" />

                                                                {/* Return */}
                                                                <div className="space-y-2.5">
                                                                    <label className="text-[14px] font-black text-neutral-900 uppercase tracking-tight">{t({ en: 'Return', fr: 'Retour' })}</label>
                                                                    <div className="flex items-center gap-3">
                                                                        <button
                                                                            onClick={() => setOpenCalendarMode(openCalendarMode === 'return' ? null : 'return')}
                                                                            className="flex-1 flex items-center justify-between px-4 h-12 bg-neutral-50 rounded-xl border border-neutral-100 transition-colors focus:border-[#00A082] focus:bg-white"
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <Calendar size={18} className={openCalendarMode === 'return' ? "text-[#00A082]" : "text-neutral-500"} />
                                                                                <span className="font-bold text-[14px] text-neutral-900">
                                                                                    {carReturnDate ? format(new Date(carReturnDate), 'E, MMM d') : t({ en: 'Select Date', fr: 'Choisir la date' })}
                                                                                </span>
                                                                            </div>
                                                                        </button>
                                                                        <div className="relative w-[130px]">
                                                                            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none z-10" />
                                                                            <select
                                                                                className="w-full h-12 bg-neutral-50 rounded-xl border border-neutral-100 pl-8 pr-6 font-bold text-[14px] text-neutral-900 outline-none appearance-none"
                                                                                value={carReturnTime || ''}
                                                                                onChange={e => setCarReturnTime(e.target.value)}
                                                                            >
                                                                                <option value="" disabled>-</option>
                                                                                {Array.from({ length: 48 }).map((_, i) => {
                                                                                    const totalMinutes = i * 30;
                                                                                    // Filter slots if return date is today (at least 1 hour from now)
                                                                                    if (carReturnDate && isToday(parseISO(carReturnDate))) {
                                                                                        const now = new Date();
                                                                                        const currentMinutes = now.getHours() * 60 + now.getMinutes();
                                                                                        if (totalMinutes < currentMinutes + 60) return null;
                                                                                    }

                                                                                    const hours24 = Math.floor(totalMinutes / 60);
                                                                                    const mins = totalMinutes % 60;
                                                                                    const timeStr = `${hours24.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                                                                                    return <option key={timeStr} value={timeStr}>{timeStr}</option>;
                                                                                })}
                                                                            </select>
                                                                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {openCalendarMode && (
                                                                <div className="bg-white rounded-[24px] border border-[#00A082] p-5 shadow-xl -mx-1 relative z-20">
                                                                    <div className="text-center mb-6 flex items-center justify-between">
                                                                        <h4 className="text-[16px] font-black text-neutral-900 tracking-tight pl-2">
                                                                            {(() => {
                                                                                const d = new Date();
                                                                                const currentMonth = d.toLocaleDateString('en-US', { month: 'long' });
                                                                                const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1).toLocaleDateString('en-US', { month: 'long' });
                                                                                return `${currentMonth} — ${nextMonth} ${d.getFullYear()} `;
                                                                            })()}
                                                                        </h4>
                                                                        <button onClick={() => setOpenCalendarMode(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors">
                                                                            <X size={16} />
                                                                        </button>
                                                                    </div>
                                                                    <div className="px-1">
                                                                        <div className="grid grid-cols-7 mb-4">
                                                                            {(t({ en: 'SUN,MON,TUE,WED,THU,FRI,SAT', fr: 'DIM,LUN,MAR,MER,JEU,VEN,SAM' })).split(',').map(d => (
                                                                                <div key={d} className="text-[11px] font-black text-neutral-400 text-center">{d}</div>
                                                                            ))}
                                                                        </div>
                                                                        <div className="grid grid-cols-7 gap-y-2">
                                                                            {carRentalCalendarDays}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : ((serviceConfig as any).isDayCounter) ? (
                                                        <div className="flex flex-col items-center justify-center p-0 bg-transparent gap-8">
                                                            <div className="relative w-full h-[320px] flex items-center justify-center overflow-hidden">
                                                                {/* Fixed Middle Oval Lens */}
                                                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[160px] h-[225px] border-[5px] border-[#008C74] rounded-[100px] z-20 pointer-events-none shadow-[0_0_40px_rgba(0,140,116,0.1)]" />

                                                                <div
                                                                    ref={dayCounterRef}
                                                                    className="flex items-center gap-20 overflow-x-auto no-scrollbar w-full px-[40%] h-full scroll-smooth"
                                                                    style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
                                                                    onScroll={(e) => {
                                                                        const container = e.currentTarget;
                                                                        const scrollPosition = container.scrollLeft + container.offsetWidth / 2;
                                                                        const children = Array.from(container.children) as HTMLElement[];

                                                                        const closest = children.reduce((prev, curr) => {
                                                                            const currCenter = curr.offsetLeft + curr.offsetWidth / 2;
                                                                            const prevCenter = prev.offsetLeft + prev.offsetWidth / 2;
                                                                            return Math.abs(currCenter - scrollPosition) < Math.abs(prevCenter - scrollPosition) ? curr : prev;
                                                                        });

                                                                        const dayId = closest.getAttribute('data-id');
                                                                        if (dayId && taskSize !== dayId) {
                                                                            setTaskSize(dayId);
                                                                        }
                                                                    }}
                                                                >
                                                                    {serviceConfig.options.map((option: any) => {
                                                                        const dayId = option.id;
                                                                        const isSelected = taskSize === dayId;
                                                                        const label = t(option.subLabel);

                                                                        return (
                                                                            <button
                                                                                key={option.id}
                                                                                data-id={option.id}
                                                                                onClick={(e) => {
                                                                                    setTaskSize(option.id);
                                                                                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                                                                }}
                                                                                className={cn(
                                                                                    "flex-shrink-0 flex flex-col items-center justify-center transition-all duration-500",
                                                                                    isSelected ? "w-[160px] h-[225px] scale-100 opacity-100" : "w-[130px] h-full opacity-40 grayscale scale-75"
                                                                                )}
                                                                                style={{ scrollSnapAlign: 'center', scrollSnapStop: 'always' }}
                                                                            >
                                                                                <div className={cn(
                                                                                    "w-44 h-44 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-700",
                                                                                    isSelected ? "border-transparent bg-transparent" : "border-neutral-200 bg-transparent"
                                                                                )}>
                                                                                    <span className={cn(
                                                                                        "font-black tracking-tighter leading-none transition-all duration-700 text-center px-2",
                                                                                        isSelected ? (option.label.en.length > 5 ? "text-[36px]" : "text-[64px]") : (option.label.en.length > 5 ? "text-[24px]" : "text-[40px]"),
                                                                                        isSelected ? "text-black" : "text-neutral-400"
                                                                                    )}>
                                                                                        {option.label.en}
                                                                                    </span>
                                                                                    <span className={cn(
                                                                                        "font-black uppercase tracking-widest text-center px-4 transition-all duration-700 leading-tight",
                                                                                        isSelected ? "text-[14px] text-[#008C74] mt-2" : "text-[11px] text-neutral-300 mt-1"
                                                                                    )}>
                                                                                        {label}
                                                                                    </span>
                                                                                </div>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-center gap-2 text-center -mt-6">
                                                                <div className="px-4 py-2 rounded-full bg-[#008C74]/10 border border-[#008C74]/20">
                                                                    <span className="text-[15px] font-black text-[#008C74]">
                                                                        {(() => {
                                                                            const opt = serviceConfig.options.find(o => o.id === taskSize);
                                                                            const rawDuration = opt?.duration ?? parseFloat(taskSize || '1');
                                                                            const subCoeff = getServiceSubCoefficient(service, subService);
                                                                            const hours = (serviceConfig as any).isDaily ? rawDuration * 8 : (rawDuration * subCoeff);
                                                                            return `${hours}h`;
                                                                        })()} {t({ en: 'of total service', fr: 'de service total', ar: 'إجمالي مدة الخدمة' })}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[14px] text-neutral-400 font-bold max-w-[300px] mt-2">
                                                                    {(serviceConfig as any).swipeText || t({
                                                                        en: "Swipe to define exactly how many days you need.",
                                                                        fr: "Faites défiler pour définir le nombre de jours exact.",
                                                                        ar: "قم بالتمرير لتحديد عدد الأيام بالضبط."
                                                                    })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        serviceConfig.options.map((size, idx) => (
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
                                                                    if (service === 'moving') {
                                                                        setTimeout(() => setSubStep1('moving_vehicle'), 250);
                                                                    } else {
                                                                        setTimeout(() => setSubStep1('description'), 250);
                                                                    }
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
                                                        ))
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}

                                        {subStep1 === 'moving_vehicle' && (
                                            <motion.div
                                                key="sub-moving-vehicle"
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
                                                    {t({ en: "Which transport mean do you need?", fr: "De quelle moyen transport avez-vous besoin ?", ar: "ما هي وسيلة النقل التي تحتاجها؟" })}
                                                </motion.h4>
                                                <p className="text-neutral-500 text-[15px] font-medium ml-1">
                                                    {t({
                                                        en: "We'll match you with Bricolers who have this type of vehicle.",
                                                        fr: "Nous vous mettrez en relation avec des Bricolers disposant de ce type de véhicule.",
                                                        ar: "سنقوم بمطابقتك مع Bricolers الذين لديهم هذا النوع من الشاحنات."
                                                    })}
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {[
                                                        { id: 'triporteur', label: { en: '🛵 Triporteur', fr: '🛵 Triporteur', ar: '🛵 تربورتور' } },
                                                        { id: 'small_van', label: { en: '🚐 Small Van', fr: '🚐 Petit Van', ar: '🚐 سيارة "برلانكو"' } },
                                                        { id: 'large_van', label: { en: '🚚 Large Van', fr: '🚚 Grand Van', ar: '🚚 شاحنة فورد ترانزيت' } },
                                                        { id: 'small_truck', label: { en: '🚛 Small Truck', fr: '🚛 Petit Camion', ar: '🚛 شاحنة صغيرة' } },
                                                        { id: 'large_truck', label: { en: '🚚 Large Truck', fr: '🚚 Grand Camion', ar: '🚚 شاحنة كبيرة' } },
                                                        { id: 'labor_only', label: { en: '💪 Labor only', fr: '💪 Main-d’œuvre seule', ar: '💪 يد عاملة فقط' } },
                                                    ].map((opt, idx) => {
                                                        const isSelected = selectedMovingVehicle === opt.id;
                                                        return (
                                                            <motion.button
                                                                key={opt.id}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: 0.1 + idx * 0.05 }}
                                                                onClick={() => {
                                                                    setSelectedMovingVehicle(opt.id);
                                                                    setTimeout(() => setSubStep1('description'), 250);
                                                                }}
                                                                className={cn(
                                                                    "flex items-center justify-between p-5 rounded-[20px] transition-all text-left",
                                                                    isSelected ? "bg-[#E6F6F2] border-2 border-[#00A082]" : "bg-neutral-50/40 border border-neutral-100 hover:border-neutral-200"
                                                                )}
                                                            >
                                                                <span className="text-[16px] font-bold text-neutral-900">{t(opt.label)}</span>
                                                                {isSelected && <div className="w-6 h-6 rounded-full bg-[#00A082] flex items-center justify-center"><Check size={14} className="text-white" strokeWidth={4} /></div>}
                                                            </motion.button>
                                                        );
                                                    })}
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
                                                {(service === 'moving' || service === 'errands' || service === 'courier') && (
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
                                                            placeholder={placeholderText}
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

                                                    {/* Mission Photos Section */}
                                                    <div className="space-y-3 mt-4">
                                                        <div className="flex items-center justify-between px-1">
                                                            <span className="text-[13px] font-bold text-neutral-500 uppercase tracking-wider">
                                                                {t({ en: 'Photos (Optional)', fr: 'Photos (Optionnel)', ar: 'صور (اختياري)' })}
                                                            </span>
                                                            <span className="text-[11px] font-medium text-neutral-400">
                                                                {images.length}/5
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-4 gap-2">
                                                            {images.map((url, idx) => (
                                                                <motion.div
                                                                    key={url}
                                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                                    animate={{ opacity: 1, scale: 1 }}
                                                                    className="relative aspect-square rounded-xl overflow-hidden border border-neutral-100 group shadow-sm bg-neutral-50"
                                                                >
                                                                    <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={`Task ${idx + 1}`} />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                                                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center active:scale-90 transition-transform"
                                                                    >
                                                                        <X size={14} strokeWidth={3} />
                                                                    </button>
                                                                </motion.div>
                                                            ))}

                                                            {images.length < 5 && (
                                                                <label className="relative aspect-square rounded-xl border-2 border-dashed border-neutral-200 hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 active:scale-95">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        multiple
                                                                        className="hidden"
                                                                        disabled={isUploadingImages}
                                                                        onChange={async (e) => {
                                                                            const files = Array.from(e.target.files || []);
                                                                            if (files.length === 0) return;

                                                                            const limit = 5 - images.length;
                                                                            const filesToUpload = files.slice(0, limit);

                                                                            setIsUploadingImages(true);
                                                                            try {
                                                                                // Parallelize uploads for better speed
                                                                                const uploadPromises = filesToUpload.map(async (file) => {
                                                                                    try {
                                                                                        const blob = await compressImageFileToDataUrl(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.5 }).then(dataUrlToBlob);
                                                                                        const uid = auth.currentUser?.uid || 'anonymous';
                                                                                        const path = `orders/${uid}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`;
                                                                                        const url = await uploadImageToStorage(blob, path);
                                                                                        setImages(prev => [...prev, url]);
                                                                                        return url;
                                                                                    } catch (innerErr) {
                                                                                        console.error("Single image upload failed:", innerErr);
                                                                                        throw innerErr;
                                                                                    }
                                                                                });

                                                                                await Promise.all(uploadPromises);
                                                                            } catch (err: any) {
                                                                                console.error("Failed to upload mission images:", err);
                                                                                const errorMsg = err.message === 'PERMISSION_DENIED'
                                                                                    ? t({ en: 'Permission denied. Please try logging in.', fr: 'Accès refusé. Veuillez vous connecter.', ar: 'تم رفض الوصول. يرجى تسجيل الدخول.' })
                                                                                    : t({ en: 'Cloud storage error. Please check your connection.', fr: 'Erreur de stockage. Vérifiez votre connexion.', ar: 'خطأ في التخزين. تحقق من الاتصال.' });

                                                                                showToast({
                                                                                    variant: 'error',
                                                                                    title: t({ en: 'Upload failed', fr: 'Échec de l\'envoi', ar: 'فشل الرفع' }), // Matching user's "Echec d l'envoyer" (Échec de l'envoi)
                                                                                    description: errorMsg
                                                                                });
                                                                            } finally {
                                                                                setIsUploadingImages(false);
                                                                            }
                                                                        }}
                                                                    />
                                                                    {isUploadingImages ? (
                                                                        <RefreshCw size={20} className="text-[#007AFF] animate-spin" />
                                                                    ) : (
                                                                        <>
                                                                            <Camera size={20} className="text-[#007AFF]" />
                                                                            <span className="text-[10px] font-black text-[#007AFF] uppercase">{t({ en: 'Add', fr: 'Ajouter', ar: 'إضافة' })}</span>
                                                                        </>
                                                                    )}
                                                                </label>
                                                            )}
                                                        </div>
                                                    </div>


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
                                                    private_driver: '/Images/Vectors Illu/BWCardirever.png',
                                                    cooking: '/Images/Vectors Illu/cooking.png',
                                                    pool_cleaning: '/Images/Vectors Illu/Poolcleaning_VI.png',
                                                    pets_care: '/Images/Vectors Illu/petscare.png',
                                                };
                                                const iconName = activeService ? serviceIconMap[activeService.id] || 'homerepairVector.png' : 'homerepairVector.png';
                                                const iconPath = iconName.startsWith('/') ? iconName : "/Images/Service Category vectors/" + iconName;
                                                return <img src={iconPath} className="w-5 h-5 object-contain" />;
                                            })()}
                                            <span className="text-[13px] font-black text-neutral-900 whitespace-nowrap opacity-80">
                                                {getServiceById(service)?.name} {(() => {
                                                    const subName = subService ? getSubServiceName(service, subService) : null;
                                                    return subName ? "> " + subName : "";
                                                })()}
                                            </span>
                                        </div>

                                        <div className="flex-shrink-0 flex items-center gap-2 bg-[#FCEBA4] px-4 py-2.5 rounded-full border border-[#DECD85]/50">
                                            <img src="/Images/LocationFlag_VI.webp" className="w-7 h-4.5 object-contain" />

                                            <span className="text-[13px] font-black text-neutral-900 whitespace-nowrap opacity-80">
                                                {t({ en: currentCity, fr: currentCity })}, {t({ en: currentArea, fr: currentArea })} - {t(activeTaskSize?.label as any)}
                                            </span>
                                        </div>
                                    </div>

                                    {service !== 'car_rental' && (
                                        <div className="flex flex-col gap-1 pb-2">
                                            <h3 className="text-[22px] font-black text-neutral-900">{t({ en: 'Find your Tasker', fr: 'Trouvez votre Pro', ar: 'ابحث عن المحترف الخاص بك' })}</h3>
                                        </div>
                                    )}

                                    {isLoadingBricolers ? (
                                        <div className="space-y-4">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-64 bg-neutral-50 rounded-[28px] animate-pulse" />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-6 pt-2">

                                            {/* Results List */}
                                            {service === 'car_rental' && (
                                                <div className="mb-2">
                                                    <h3 className="text-[22px] font-black text-neutral-900 leading-tight">
                                                        {t({ en: 'Available Car rental providers', fr: 'Car rental providers Disponibles', ar: 'السيارات المتاحة' })}
                                                    </h3>
                                                    <p className="text-[14px] font-bold text-neutral-400 mt-1">
                                                        {t({ en: 'Select a car from our trusted providers.', fr: 'Choisissez une voiture de nos fournisseurs certifiés.' })}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 gap-6 pt-2">
                                                {sortedBricolers.map((bricoler: any, idx) => (
                                                    <BricolerCard
                                                        key={bricoler.id}
                                                        index={idx}
                                                        service={service}
                                                        bricoler={bricoler}
                                                        serviceName={getServiceById(service)?.name || ''}
                                                        isSelected={selectedBricolerId === bricoler.id}
                                                        carRentalBookings={carRentalBookings.filter(job => job.bricolerId === bricoler.id)}
                                                        selectedPickUpDate={selectedDate}
                                                        selectedPickUpTime={selectedTime}
                                                        selectedReturnDate={carReturnDate}
                                                        selectedReturnTime={carReturnTime}
                                                        onSelect={() => {
                                                            setSelectedBricolerId(bricoler.id);
                                                            if (service === 'car_rental') {
                                                                // For car rental, we MUST select a car model, so opening profile is better than go to step 3
                                                                setViewedBricoler(bricoler);
                                                            } else {
                                                                setStep(3);
                                                            }
                                                        }}
                                                        onOpenProfile={() => setViewedBricoler(bricoler)}
                                                    />
                                                ))}
                                            </div>

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
                                            {renderedCalendarDays}
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
                                                                                ? "bg-[#00A082] border-[#00A082] text-white"
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
                                            <div className="flex items-center justify-center md:justify-start gap-2 text-[18px] font-semibold text-black mt-1 flex-wrap">
                                                <span>{selectedDate ? safeParseDate(selectedDate).toLocaleDateString(t({ en: 'en-US', fr: 'fr-FR', ar: 'ar-MA' }), { day: 'numeric', month: 'short' }) : t({ en: 'Flexible', fr: 'Flexible', ar: 'مرن' })}</span>
                                                <span className="text-neutral-200">|</span>
                                                <span>{selectedTime}</span>
                                                {service === 'car_rental' && carReturnDate && carReturnTime && (
                                                    <>
                                                        <span className="text-[#00A082] px-1">→</span>
                                                        <span>{safeParseDate(carReturnDate).toLocaleDateString(t({ en: 'en-US', fr: 'fr-FR', ar: 'ar-MA' }), { day: 'numeric', month: 'short' })}</span>
                                                        <span className="text-neutral-200">|</span>
                                                        <span>{carReturnTime}</span>
                                                    </>
                                                )}
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
                                        {/* Hide Repeat Order section as per user request */}
                                        {/* 
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
                                                                : "bg-white text-neutral-600 border-neutral-200 hover:border-[#008C74]!important"
                                                        )}
                                                    >
                                                        {t(freq.label as any)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        */}

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

                                            {/* Bank receipt instructions & Upload */}
                                            {paymentMethod === 'bank' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden space-y-4"
                                                >
                                                    <div className="flex w-full flex-col gap-4 rounded-[16px] border-2 border-dashed border-[#00A082] bg-[#E6F6F2]/30 p-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-white shadow-sm">
                                                                <FileText size={20} className="text-[#00A082]" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-[14px] font-black text-[#00A082]">
                                                                    {t({ en: 'Upload Order Receipt', fr: 'Charger le reçu', ar: 'تحميل الوصل' })}
                                                                </p>
                                                                <p className="text-[12px] text-[#00A082]/70 font-bold">
                                                                    {t({ en: 'Take a photo of your transfer confirmation.', fr: 'Photo de votre confirmation de virement.', ar: 'التقط صورة لتأكيد التحويل.' })}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {bankReceipt ? (
                                                            <div className="relative w-full h-40 rounded-xl overflow-hidden border border-[#00A082]/20">
                                                                <img src={bankReceipt} className="w-full h-full object-cover" />
                                                                <button
                                                                    onClick={() => setBankReceipt(null)}
                                                                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
                                                                >
                                                                    <X size={16} strokeWidth={3} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <label className="w-full h-32 flex flex-col items-center justify-center gap-2 bg-white/50 rounded-xl border-2 border-dashed border-[#00A082]/20 cursor-pointer hover:bg-white/80 transition-all">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (!file) return;
                                                                        setIsUploadingReceipt(true);
                                                                        try {
                                                                            // 1. Compress
                                                                            const blob = await compressImageFileToDataUrl(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.5 }).then(dataUrlToBlob);

                                                                            // 2. Upload immediately
                                                                            const uid = auth.currentUser?.uid || 'anonymous';
                                                                            const path = `receipts/${uid}/${Date.now()}_receipt.jpg`;
                                                                            const url = await uploadImageToStorage(blob, path);

                                                                            // 3. Store URL in state
                                                                            setBankReceipt(url);
                                                                        } catch (err: any) {
                                                                            console.error("Failed to upload receipt image:", err);
                                                                            const errorMsg = err.message === 'PERMISSION_DENIED'
                                                                                ? t({ en: 'Permission denied. Please try logging in.', fr: 'Accès refusé. Veuillez vous connecter.', ar: 'تم رفض الوصول. يرجى تسجيل الدخول.' })
                                                                                : t({ en: 'Could not upload receipt.', fr: 'Impossible de téléverser le reçu.', ar: 'تعذر رفع الإيصال.' });

                                                                            showToast({
                                                                                variant: 'error',
                                                                                title: t({ en: 'Upload failed', fr: 'Échec de l\'envoi', ar: 'فشل الرفع' }),
                                                                                description: errorMsg
                                                                            });
                                                                        } finally {
                                                                            setIsUploadingReceipt(false);
                                                                        }
                                                                    }}
                                                                />
                                                                {isUploadingReceipt ? (
                                                                    <RefreshCw size={24} className="text-[#00A082] animate-spin" />
                                                                ) : (
                                                                    <>
                                                                        <Camera size={24} className="text-[#00A082]" />
                                                                        <span className="text-[12px] font-black text-[#00A082] uppercase">{t({ en: 'Select Image', fr: 'Choisir Image', ar: 'اختر صورة' })}</span>
                                                                    </>
                                                                )}
                                                            </label>
                                                        )}
                                                    </div>

                                                    <div className="flex w-full flex-col gap-4 rounded-[16px] border border-neutral-100 bg-neutral-50/50 p-5 min-[480px]:flex-row min-[480px]:items-center">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-white shadow-sm">
                                                            <WhatsAppBrandIcon size={24} className="text-[#00A082]" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-[14px] font-black text-neutral-900">
                                                                {t({ en: 'Need help?', fr: 'Besoin d\'aide ?', ar: 'هل تحتاج مساعدة؟' })}
                                                            </p>
                                                            <p className="text-[12px] text-neutral-500 font-bold">
                                                                {t({ en: 'Chat with our support team.', fr: 'Discutez avec notre support.', ar: 'تحدث مع فريق الدعم.' })}
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
                                                <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-3 border border-neutral-100/50">
                                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                        <MapPin size={20} className="text-[#00A082]" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Location', fr: 'Lieu', ar: 'الموقع' })}</span>
                                                        <span className="text-[15px] font-black leading-tight text-black">{t({ en: currentCity, fr: currentCity })}{currentArea ? ", " + t({ en: currentArea, fr: currentArea }) : ''}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-3 border border-neutral-100/50">
                                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                        <Clock size={20} className="text-[#00A082]" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Duration', fr: 'Durée', ar: 'المدة' })}</span>
                                                        <span className="text-[15px] font-black text-black">
                                                            {service === 'car_rental' && selectedDate && carReturnDate
                                                                ? (() => { const d = Math.max(1, Math.round((new Date(carReturnDate).getTime() - new Date(selectedDate).getTime()) / 86400000)); return `${d} ${t({ en: d > 1 ? 'days' : 'day', fr: d > 1 ? 'jours' : 'jour', ar: 'يوم' })}`; })()
                                                                : (activeTaskSize ? `≈ ${t(activeTaskSize.estTime as any)}` : '—')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-3 border border-neutral-100/50">
                                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                        <Wrench size={20} className="text-[#00A082]" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Service', fr: 'Service', ar: 'الخدمة' })}</span>
                                                        <span className="text-[15px] font-black leading-tight text-black">{t({ en: getServiceById(service)?.name || '', fr: getServiceById(service)?.name || '' })}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-3 border border-neutral-100/50">
                                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                        <Banknote size={20} className="text-[#00A082]" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Total (Est.)', fr: 'Total (Est.)', ar: 'الإجمالي (تقريبي)' })}</span>
                                                        <span className="text-[15px] font-black text-black">
                                                            {service === 'car_rental' && selectedCar && selectedDate && carReturnDate
                                                                ? calculateTaskPrice(
                                                                    selectedCar.pricePerDay || selectedCar.price || 0,
                                                                    String(Math.max(1, Math.round((new Date(carReturnDate).getTime() - new Date(selectedDate).getTime()) / 86400000))),
                                                                    service,
                                                                    subService,
                                                                    [],
                                                                    applyReferralDiscount,
                                                                    referralDiscountAvailable
                                                                )
                                                                : calculateTaskPrice(selectedProRate, taskSize, service, subService, serviceConfig.options, applyReferralDiscount, referralDiscountAvailable)} MAD
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 bg-neutral-50 rounded-2xl p-4 flex items-start gap-3 border border-neutral-100/50">
                                                <div className="w-10 h-10 rounded-full bg-white flex-shrink-0 flex items-center justify-center shadow-sm">
                                                    <Info size={20} className="text-[#00A082]" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Instructions', fr: 'Instructions', ar: 'التعليمات' })}</span>
                                                    <p className="text-[14px] font-semibold text-black line-clamp-3 leading-tight">
                                                        {description || t({ en: 'No specific instructions.', fr: 'Pas d\'instructions.', ar: 'لا تووجد تعليمات محددة.' })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Selected Vehicle */}
                                        {service === 'car_rental' && selectedCar && (
                                            <div className="px-0 space-y-4">
                                                <h3 className="text-[24px] font-black text-black">{t({ en: 'Selected Vehicle', fr: 'Véhicule Choisie', ar: 'السيارة المختارة' })}</h3>
                                                <div className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-[#F8F9FA] p-4 flex items-center gap-4">
                                                    <div className="w-24 h-16 rounded-xl bg-white border border-neutral-50 flex items-center justify-center p-2">
                                                        <img src={selectedCar.modelImage || selectedCar.image} className="w-full h-full object-contain" alt={selectedCar.modelName} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-[17px] font-black text-black uppercase tracking-tight">{selectedCar.modelName}</h4>
                                                        <p className="text-[13px] font-bold text-[#00A082]">MAD {selectedCar.pricePerDay || selectedCar.price} / {t({ en: 'day', fr: 'jour' })}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Selected Moving Vehicle summary */}
                                        {service === 'moving' && selectedMovingVehicle && (
                                            <div className="px-0 space-y-4">
                                                <h3 className="text-[24px] font-black text-black">{t({ en: 'Requested Transport', fr: 'Transport Demandé', ar: 'وسيلة النقل المطلوبة' })}</h3>
                                                <div className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-[#F8F9FA] p-4 flex items-center gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-[17px] font-black text-black leading-tight">
                                                            {(() => {
                                                                const opts = {
                                                                    triporteur: { en: '🛵 Triporteur', fr: '🛵 Triporteur', ar: '🛵 تربورتور' },
                                                                    small_van: { en: '🚐 Small Van', fr: '🚐 Petit Van', ar: '🚐 سيارة "برلانكو"' },
                                                                    large_van: { en: '🚚 Large Van', fr: '🚚 Grand Van', ar: '🚚 شاحنة فورد ترانزيت' },
                                                                    small_truck: { en: '🚛 Small Truck', fr: '🚛 Petit Camion', ar: '🚛 شاحنة صغيرة' },
                                                                    large_truck: { en: '🚚 Large Truck', fr: '🚚 Grand Camion', ar: '🚚 شاحنة كبيرة' },
                                                                    labor_only: { en: '💪 Labor only', fr: '💪 Main-d’œuvre seule', ar: '💪 يد عاملة فقط' }
                                                                };
                                                                return t((opts as any)[selectedMovingVehicle] || { en: selectedMovingVehicle });
                                                            })()}
                                                        </h4>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Your Selected Bricoler */}
                                        {selectedBricolerId !== 'open' && selectedPro && (
                                            <div className="px-0 pb-6 space-y-4">
                                                <h3 className="text-[24px] font-black text-black">{service === 'car_rental' ? t({ en: 'Provider', fr: 'Fournisseur', ar: 'المزود' }) : t({ en: 'Your Tasker', fr: 'Votre Pro', ar: 'المحترف الخاص بك' })}</h3>
                                                <div className="relative overflow-hidden rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm">
                                                    <div className="flex items-start gap-4 sm:items-center">
                                                        <div className="relative">
                                                            <img src={selectedPro.photoURL || "/Images/Logo/Black Lbricol Avatar Face.webp"} className="w-16 h-16 rounded-full object-cover bg-neutral-100" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-[17px] font-black text-black">{selectedPro.displayName}</h4>
                                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                                <div className="flex items-center gap-1.5">
                                                                    {(selectedPro.rating || (selectedPro.reviews?.length || 0) > 0 || (selectedPro as any).jobsCount > 0) ? (
                                                                        <>
                                                                            <div className="flex items-center gap-0.5">
                                                                                {[1, 2, 3, 4, 5].map((s) => (
                                                                                    <Star
                                                                                        key={s}
                                                                                        size={12}
                                                                                        className={cn(
                                                                                            "transition-all",
                                                                                            s <= Math.round(selectedPro.rating || 5)
                                                                                                ? "fill-[#FFC244] text-[#FFC244]"
                                                                                                : "fill-neutral-100 text-neutral-200"
                                                                                        )}
                                                                                    />
                                                                                ))}
                                                                            </div>
                                                                            <span className="text-[13px] font-black text-[#D89B1A]">{(selectedPro.rating || 5.0).toFixed(1)}</span>
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

                                        {/* Summary Section */}
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
                                                            <span className="text-[15px] font-light text-black">
                                                                {service === 'car_rental' && selectedDate && carReturnDate
                                                                    ? (() => { const d = Math.max(1, Math.round((new Date(carReturnDate).getTime() - new Date(selectedDate).getTime()) / 86400000)); return `${d} ${t({ en: d > 1 ? 'days' : 'day', fr: d > 1 ? 'jours' : 'jour', ar: 'يوم' })}`; })()
                                                                    : (activeTaskSize ? `≈ ${t(activeTaskSize.estTime as any)}` : '—')}
                                                            </span>
                                                        </div>
                                                        <span className="self-end text-[18px] font-bold tracking-tight text-black min-[420px]:self-auto">
                                                            {service === 'car_rental' && selectedCar && selectedDate && carReturnDate
                                                                ? Math.round(calculateTaskPrice(
                                                                    selectedCar.pricePerDay || selectedCar.price || 0,
                                                                    String(Math.max(1, Math.round((new Date(carReturnDate).getTime() - new Date(selectedDate).getTime()) / 86400000))),
                                                                    service,
                                                                    subService,
                                                                    [],
                                                                    applyReferralDiscount,
                                                                    referralDiscountAvailable
                                                                ) * 0.85)
                                                                : Math.round(calculateTaskPrice(selectedProRate, taskSize, service, subService, serviceConfig.options, applyReferralDiscount, referralDiscountAvailable) * 0.85)} MAD
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-2 px-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                                                        <div className="flex min-w-0 flex-col gap-1 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-4">
                                                            <span className="text-[18px] font-semibold text-black">{t({ en: 'Lbricol Fee', fr: 'Frais Lbricol', ar: 'رسوم Lbricol' })}</span>
                                                            <span className="text-[15px] font-light text-black">15%</span>
                                                        </div>
                                                        <span className="self-end text-[18px] font-bold tracking-tight text-black min-[420px]:self-auto">
                                                            {service === 'car_rental' && selectedCar && selectedDate && carReturnDate
                                                                ? Math.round(calculateTaskPrice(
                                                                    selectedCar.pricePerDay || selectedCar.price || 0,
                                                                    String(Math.max(1, Math.round((new Date(carReturnDate).getTime() - new Date(selectedDate).getTime()) / 86400000))),
                                                                    service,
                                                                    subService,
                                                                    [],
                                                                    applyReferralDiscount,
                                                                    referralDiscountAvailable
                                                                ) * 0.15)
                                                                : Math.round(calculateTaskPrice(selectedProRate, taskSize, service, subService, serviceConfig.options, applyReferralDiscount, referralDiscountAvailable) * 0.15)} MAD
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
                                                                    "w-full rounded-xl px-6 py-3 text-[15px] font-black transition-all active:scale-95 min-[520px]:w-auto",
                                                                    applyReferralDiscount
                                                                        ? "bg-[#00A082] text-white"
                                                                        : "bg-[#FFC244] text-black hover:bg-[#FDBE33]"
                                                                )}
                                                            >
                                                                {applyReferralDiscount
                                                                    ? t({ en: 'Implemented', fr: 'Implémenté', ar: 'تم التطبيق' })
                                                                    : t({ en: 'Apply Credit', fr: 'Appliquer le crédit', ar: 'تطبيق رصيد' })}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

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
                                                        onClick={() => {
                                                            if (service === 'car_rental') {
                                                                handleStartMatching(); // Skip description step for Car Rental
                                                            } else if (service === 'moving') {
                                                                setSubStep1('moving_vehicle');
                                                            } else {
                                                                setSubStep1('description');
                                                            }
                                                        }}
                                                        disabled={service === 'car_rental' ? (!selectedDate || !selectedTime || !carReturnDate || !carReturnTime) : !taskSize}
                                                        className={cn(
                                                            "flex-1 h-14 rounded-full text-[19px] font-semibold active:scale-95 transition-all text-white",
                                                            (service === 'car_rental' ? (selectedDate && selectedTime && carReturnDate && carReturnTime) : taskSize) ? "bg-[#00A082]" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                                        )}
                                                    >
                                                        {t({ en: 'Next', fr: 'Suivant', ar: 'التالي' })}
                                                    </button>
                                                </motion.div>
                                            )}

                                            {subStep1 === 'moving_vehicle' && (
                                                <motion.div
                                                    key="btn-moving-vehicle"
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
                                                        onClick={() => setSubStep1('description')}
                                                        disabled={!selectedMovingVehicle}
                                                        className={cn(
                                                            "flex-1 h-14 rounded-full text-[19px] font-semibold active:scale-95 transition-all text-white",
                                                            selectedMovingVehicle ? "bg-[#00A082]" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
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
                                                        onClick={() => {
                                                            if (service === 'moving') setSubStep1('moving_vehicle');
                                                            else setSubStep1('size');
                                                        }}
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
                                            onClick={() => {
                                                const hasBaseDates = selectedDate && selectedTime;
                                                const isRental = service === 'car_rental';
                                                const hasRentalDates = isRental ? (carReturnDate && carReturnTime) : true;
                                                if (hasBaseDates && hasRentalDates) setStep(4);
                                            }}
                                            disabled={service === 'car_rental' ? (!selectedDate || !selectedTime || !carReturnDate || !carReturnTime) : (!selectedDate || !selectedTime)}
                                            className={cn(
                                                "flex-1 h-14 rounded-[10px] text-[18px] font-semibold active:scale-95 transition-all flex items-center justify-center",
                                                (service === 'car_rental' ? (selectedDate && selectedTime && carReturnDate && carReturnTime) : (selectedDate && selectedTime)) ? "bg-[#00A082] text-white" : "bg-neutral-100 text-neutral-400"
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
                                                    let hourlyRate = selectedPro?.hourlyRate || 75;
                                                    if (service === 'car_rental' && selectedCar?.pricePerDay) {
                                                        hourlyRate = selectedCar.pricePerDay;
                                                    }
                                                    const opt = serviceConfig.options.find(o => o.id === taskSize);

                                                    let effectiveTaskSize = taskSize;
                                                    if (service === 'car_rental' && selectedDate && carReturnDate) {
                                                        const d = Math.max(1, Math.round((new Date(carReturnDate).getTime() - new Date(selectedDate).getTime()) / 86400000));
                                                        effectiveTaskSize = String(d);
                                                    }

                                                    const finalCalc = calculateTaskPrice(
                                                        hourlyRate,
                                                        effectiveTaskSize,
                                                        service,
                                                        subService,
                                                        serviceConfig.options,
                                                        applyReferralDiscount,
                                                        referralDiscountAvailable
                                                    );

                                                    const strikeCalc = calculateTaskPrice(
                                                        hourlyRate,
                                                        effectiveTaskSize,
                                                        service,
                                                        subService,
                                                        serviceConfig.options,
                                                        false, // No referral discount for strike
                                                        0
                                                    );


                                                    const hasDiscount = (strikeCalc > finalCalc);

                                                    return (
                                                        <>
                                                            {hasDiscount && (
                                                                <span className="text-[14px] font-bold text-neutral-400 line-through">
                                                                    {strikeCalc} MAD
                                                                </span>
                                                            )}
                                                            <span className="text-[28px] font-black tracking-tighter" style={{ color: hasDiscount ? '#00A082' : 'black' }}>
                                                                {finalCalc} MAD
                                                            </span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setStep(service === 'car_rental' ? 2 : 3)}
                                                className="w-14 h-14 flex items-center justify-center rounded-[20px] border-2 border-neutral-100 text-neutral-900 active:scale-95 transition-all"
                                            >
                                                <ChevronLeft size={22} strokeWidth={3} />
                                            </button>

                                            {(() => {
                                                const isBankTransfer = paymentMethod === 'bank';
                                                const isReceiptMissing = isBankTransfer && !bankReceipt;
                                                const isSubmittable = !isReceiptMissing && !isSubmitting;

                                                return (
                                                    <button
                                                        disabled={!isSubmittable || (service === 'car_rental' && (!selectedDate || !carReturnDate))}
                                                        onClick={handleFinalSubmit}
                                                        className={cn(
                                                            "flex-1 h-14 rounded-[10px] text-white text-[18px] font-black transition-all active:scale-95 flex items-center justify-center gap-2",
                                                            isSubmittable ? "bg-[#00A082]" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                                        )}
                                                    >
                                                        {isSubmitting ? (
                                                            <RefreshCw size={20} className="animate-spin" />
                                                        ) : (
                                                            <>
                                                                {isReceiptMissing ? t({ en: 'Upload Receipt', fr: 'Chargez le reçu', ar: 'تحميل الوصل' }) : t({ en: 'Program Mission', fr: 'Programmer la mission', ar: 'برمجة المهمة' })}
                                                                {!isReceiptMissing && <CheckCircle2 size={20} />}
                                                            </>
                                                        )}
                                                    </button>
                                                );
                                            })()}
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
                        carRentalBookings={carRentalBookings.filter(job => job.bricolerId === viewedBricoler?.id)}
                        selectedPickUpDate={selectedDate}
                        selectedPickUpTime={selectedTime}
                        selectedReturnDate={carReturnDate}
                        selectedReturnTime={carReturnTime}
                        onSelect={(car, note) => {
                            setSelectedBricolerId(viewedBricoler?.id!);
                            if (service === 'car_rental') {
                                if (car) setSelectedCar(car);
                                if (note) setDescription(note);
                                setStep(4);
                            } else {
                                setStep(3);
                            }
                        }}
                    />
                    <SuccessAnimation
                        isVisible={showSuccessAnimation}
                        onComplete={() => {
                            setShowSuccessAnimation(false);
                            onClose();
                        }}
                    />
                </motion.div>
            </motion.div>
        </AnimatePresence >
    );
};

export default OrderSubmissionFlow;
