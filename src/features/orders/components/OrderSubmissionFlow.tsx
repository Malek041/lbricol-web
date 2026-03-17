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
import LocationPicker from '@/components/location-picker/LocationPicker';
import { SavedAddress } from '@/components/location-picker/types';
import ServiceFlowLayout from './ServiceFlowLayout';
import OrderMapCard from './OrderMapCard';
import AddressRow from '@/components/location-picker/AddressRow';

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
    isInline?: boolean;
    onMapUpdate?: (data: { serviceName: string; subServiceName?: string; serviceEmoji: string; step: number }) => void;
    backSignal?: number;
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
    onRequireLogin,
    isInline = false,
    onMapUpdate,
    backSignal
}) => {
    const { t, language } = useLanguage();
    const { showToast } = useToast();
    const [step, setStep] = useState(mode === 'edit' ? 3 : (continueDraft?.step || 1));
    const [subStep1, setSubStep1] = useState<'location' | 'size' | 'description' | 'languages' | 'moving_vehicle'>(continueDraft?.subStep1 || 'location');
    const [currentCity, setCurrentCity] = useState(initialCity || '');
    const [currentArea, setCurrentArea] = useState(initialArea || '');
    const [activeSubService, setActiveSubService] = useState(subService || continueDraft?.subService || '');
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

    // Sync map info to parent if inline
    useEffect(() => {
        if (isInline && onMapUpdate) {
            const svcCfg = getServiceById(service);
            onMapUpdate({
                serviceName: svcCfg?.name || 'Service',
                subServiceName: getSubServiceName(service, activeSubService) || undefined,
                serviceEmoji: '🛠️', // Fallback
                step
            });
        }
    }, [isInline, step, service, activeSubService, language, onMapUpdate]);

    useEffect(() => {
        if (backSignal && backSignal > 0) {
            handleBack();
        }
    }, [backSignal]);

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

    const [showInternalLocationPicker, setShowInternalLocationPicker] = useState(false);
    const [userSavedAddresses, setUserSavedAddresses] = useState<SavedAddress[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('lbricol_saved_addresses');
        if (saved) {
            try {
                setUserSavedAddresses(JSON.parse(saved));
            } catch (e) {
                console.error("Error parsing saved addresses", e);
            }
        }
    }, [isOpen]);

    const handleInternalLocationConfirm = (result: { pickup: any, savedAddress?: SavedAddress }) => {
        const { pickup, savedAddress } = result;
        const address = savedAddress?.address || pickup.address || '';
        const lowerAddress = address.toLowerCase();

        // Detect City & Area
        let city = MOROCCAN_CITIES.find((c: string) => lowerAddress.includes(c.toLowerCase())) || 'Casablanca';
        const areaList = MOROCCAN_CITIES_AREAS[city] || [];
        const sortedAreas = [...areaList].sort((a, b) => b.length - a.length);
        const matchedArea = sortedAreas.find((a: string) => lowerAddress.includes(a.toLowerCase()));
        
        const finalArea = matchedArea || (areaList.length > 0 ? areaList[0] : '');

        setCurrentCity(city);
        setCurrentArea(finalArea);
        setShowInternalLocationPicker(false);
    };

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

    const handleBack = () => {
        if (step === 2) {
            setStep(1);
        } else if (step > 1) {
            setStep(prev => prev - 1);
        } else {
            onClose();
        }
    };

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
            showToast({
                variant: 'info',
                title: t({ en: 'Notice', fr: 'Remarque', ar: 'ملاحظة' }),
                description: t({ en: 'Please wait for the receipt photo to finish uploading...', fr: 'Veuillez patienter pendant le téléchargement de la photo du reçu...', ar: 'يرجى الانتظار حتى يتم تحميل صورة الإيصال...' })
            });
            return;
        }

        if (paymentMethod === 'bank' && !bankReceipt) {
            showToast({
                variant: 'error',
                title: t({ en: 'Missing Receipt', fr: 'Reçu manquant', ar: 'إيصال مفقود' }),
                description: t({ en: 'Please upload your transfer receipt before programming the mission.', fr: 'Veuillez télécharger votre reçu de virement avant de programmer la mission.', ar: 'يرجى تحميل إيصال التحويل قبل برمجة المهمة.' })
            });
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
                } catch (err: any) {
                    console.error("Error uploading receipt:", err);
                    showToast({
                        variant: 'error',
                        title: t({ en: 'Upload Failed', fr: 'Échec du téléchargement', ar: 'فشل التحميل' }),
                        description: err.message || t({ en: 'Failed to upload receipt. Please try again.', fr: 'Échec du téléchargement du reçu. Veuillez réessayer.', ar: 'فشل في تحميل الإيصال. يرجى المحاولة مرة أخرى.' })
                    });
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
        } catch (err: any) {
            console.error("Submission error:", err);
            showToast({
                variant: 'error',
                title: t({ en: 'Submission Failed', fr: 'Échec de la soumission', ar: 'فشل التقديم' }),
                description: err.message || t({ en: 'An unexpected error occurred while submitting your order.', fr: 'Une erreur inattendue s\'est produite lors de la soumission de votre commande.', ar: 'حدث خطأ غير متوقع أثناء تقديم طلبك.' })
            });
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

    const renderStepContent = () => {
        const categories = getServiceById(service)?.subServices || [];
        
        switch (step) {
            case 1:
                return (
                    <div className="space-y-6">
                        {!isInline && (
                            <>
                                <div className="mb-6">
                                    <h2 className="text-[26px] font-black text-neutral-900 leading-tight">
                                        {getServiceById(service)?.name || 'Service'}
                                    </h2>
                                    <p className="text-neutral-500 font-bold text-sm mt-1">
                                        {t({ en: 'Choose a service', fr: 'Choisissez un service', ar: 'اختر خدمة' })}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {categories.map((sub: any) => (
                                        <button
                                            key={sub.id}
                                            onClick={() => setActiveSubService(sub.id)}
                                            className={cn(
                                                "px-5 py-3.5 rounded-full text-[15px] font-bold transition-all border-2 active:scale-95",
                                                activeSubService === sub.id 
                                                    ? "bg-[#F0FDF4] border-[#10B981] text-[#10B981]" 
                                                    : "bg-white border-neutral-100 text-neutral-900"
                                            )}
                                        >
                                            {sub.name}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {activeSubService && (
                            <div className={cn(
                                "animate-in fade-in slide-in-from-bottom-4 duration-300",
                                subStep1 === 'location' ? "mt-0" : "space-y-6 pt-4 border-t border-neutral-50"
                            )}>
                                {subStep1 === 'location' && (
                                    <div className="space-y-6">
                                        {userSavedAddresses.length > 0 ? (
                                            <div className="px-1">
                                                <AddressRow 
                                                    address={userSavedAddresses[0]} 
                                                    onSelect={() => {}} 
                                                    onEdit={() => setShowInternalLocationPicker(true)} 
                                                />
                                            </div>
                                        ) : (
                                            <div className="p-8 rounded-[28px] bg-neutral-50 border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center text-center gap-2">
                                                 <MapPin size={24} className="text-neutral-300" />
                                                 <p className="text-[14px] font-bold text-neutral-400">
                                                     {t({ en: 'No addresses saved yet', fr: 'Aucune adresse enregistrée' })}
                                                 </p>
                                            </div>
                                        )}
                                        
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={() => {
                                                    if (userSavedAddresses.length > 0) {
                                                        const addr = userSavedAddresses[0];
                                                        const parts = addr.address.split(',');
                                                        setCurrentCity(parts[parts.length - 2]?.trim() || 'Casablanca');
                                                        setCurrentArea(parts[parts.length - 3]?.trim() || parts[0]?.trim() || '');
                                                        setSubStep1(service === 'tour_guide' ? 'languages' : 'size');
                                                    }
                                                }}
                                                disabled={userSavedAddresses.length === 0}
                                                className={cn(
                                                    "w-full h-15 rounded-full text-[19px] font-[900] transition-all active:scale-95",
                                                    userSavedAddresses.length > 0
                                                        ? "bg-[#00927C] text-white shadow-[0_8px_20px_rgba(0,146,124,0.15)]"
                                                        : "bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none"
                                                )}
                                            >
                                                {t({ en: 'Confirm This Location', fr: 'Confirmer cet emplacement', ar: 'تأكيد هذا الموقع' })}
                                            </button>
                                            
                                            <button
                                                onClick={() => setShowInternalLocationPicker(true)}
                                                className="w-full py-2 text-[#00927C] text-[19px] font-[900] active:scale-95 transition-transform"
                                            >
                                                {t({ en: 'Create New address', fr: 'Créer une nouvelle adresse', ar: 'إنشاء عنوان جديد' })}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {subStep1 === 'languages' && (
                                    <div className="space-y-4">
                                        <h3 className="text-[20px] font-black">{t({ en: 'Tour Guide Languages', fr: 'Langues du guide', ar: 'لغات المرشد' })}</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['English', 'French', 'Arabic', 'Spanish', 'German', 'Italian'].map(lang => (
                                                <button
                                                    key={lang}
                                                    onClick={() => setSelectedLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])}
                                                    className={cn(
                                                        "p-4 rounded-2xl border-2 font-bold transition-all",
                                                        selectedLanguages.includes(lang) ? "border-[#00927C] bg-[#00927C]/5 text-[#00927C]" : "border-neutral-100 text-neutral-600"
                                                    )}
                                                >
                                                    {lang}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {subStep1 === 'size' && (
                                    <div className="space-y-4">
                                        <h3 className="text-[20px] font-black">{t({ en: 'How big is the task?', fr: 'Quelle est la taille de la tâche ?', ar: 'ما هو حجم المهمة؟' })}</h3>
                                        <div className="space-y-3">
                                            {serviceConfig.options.map((opt: any) => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setTaskSize(opt.id)}
                                                    className={cn(
                                                        "w-full p-5 rounded-[24px] border-2 transition-all text-left flex items-center gap-4",
                                                        taskSize === opt.id ? "border-[#00927C] bg-[#00927C]/5" : "border-neutral-50 hover:border-neutral-100"
                                                    )}
                                                >
                                                    <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0", taskSize === opt.id ? "border-[#00927C] bg-[#00927C]" : "border-neutral-200")}>
                                                        {taskSize === opt.id && <Check size={14} className="text-white" strokeWidth={4} />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[17px] font-black text-neutral-900">{t(opt.label)}</p>
                                                        <p className="text-[13px] font-bold text-neutral-400">{t(opt.estTime)}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {subStep1 === 'description' && (
                                    <div className="space-y-6">
                                        <div className="space-y-3">
                                            <h3 className="text-[20px] font-black text-neutral-900">{t({ en: 'Any specific details?', fr: 'Des précisions ?', ar: 'أي تفاصيل محددة؟' })}</h3>
                                            <textarea
                                                value={description}
                                                onChange={e => setDescription(e.target.value)}
                                                placeholder={t({ en: 'Describe your needs here...', fr: 'Décrivez vos besoins ici...', ar: 'صف احتياجاتك هنا...' })}
                                                className="w-full h-40 p-5 rounded-[28px] bg-neutral-50 border-2 border-transparent focus:border-[#00927C]/20 focus:bg-white outline-none transition-all text-[16px] font-bold resize-none"
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-[16px] font-black text-neutral-900">{t({ en: 'Add Photos (Optional)', fr: 'Ajouter des photos (Optionnel)', ar: 'أضف صوراً (اختياري)' })}</h3>
                                            <div className="grid grid-cols-4 gap-3">
                                                {images.map((url, idx) => (
                                                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-neutral-100">
                                                        <img src={url} className="w-full h-full object-cover" alt="" />
                                                        <button
                                                            onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                                                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
                                                        >
                                                            <X size={14} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {images.length < 5 && (
                                                    <label className="aspect-square rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-neutral-50 transition-colors">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            multiple
                                                            className="hidden"
                                                            onChange={async (e) => {
                                                                const files = Array.from(e.target.files || []);
                                                                if (files.length === 0) return;
                                                                setIsUploadingImages(true);
                                                                try {
                                                                    const uploadPromises = files.slice(0, 5 - images.length).map(async (file) => {
                                                                        const blob = await compressImageFileToDataUrl(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.5 }).then(dataUrlToBlob);
                                                                        const path = `orders/${auth.currentUser?.uid || 'anon'}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`;
                                                                        return uploadImageToStorage(blob, path);
                                                                    });
                                                                    const urls = await Promise.all(uploadPromises);
                                                                    setImages(prev => [...prev, ...urls]);
                                                                } catch (err) {
                                                                    console.error("Upload failed:", err);
                                                                } finally {
                                                                    setIsUploadingImages(false);
                                                                }
                                                            }}
                                                        />
                                                        {isUploadingImages ? <RefreshCw className="animate-spin text-[#00927C]" size={20} /> : <Camera className="text-neutral-400" size={24} />}
                                                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Add', fr: 'Ajouter', ar: 'إضافة' })}</span>
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-[22px] font-black text-neutral-900">{t({ en: 'Select your Provider', fr: 'Choisissez votre Pro', ar: 'اختر المحترف الخاص بك' })}</h2>
                            <p className="text-[14px] font-bold text-neutral-400">{t({ en: 'Verified professionals near you', fr: 'Des professionnels vérifiés près de chez vous', ar: 'محترفون معتمدون بالقرب منك' })}</p>
                        </div>

                        {isLoadingBricolers ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-48 bg-neutral-50 rounded-[28px] animate-pulse" />
                                ))}
                            </div>
                        ) : sortedBricolers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center px-4 bg-neutral-50 rounded-[32px] border-2 border-dashed border-neutral-100">
                                <Search size={40} className="text-neutral-200 mb-4" />
                                <h4 className="text-[17px] font-black text-neutral-900">{t({ en: 'No matching pros', fr: 'Aucun expert trouvé', ar: 'لم يتم العثور على محترفين' })}</h4>
                                <p className="text-sm font-bold text-neutral-400 mt-1">{t({ en: 'Try changing your filters or location', fr: 'Essayez de changer vos filtres ou lieu', ar: 'حاول تغيير الفلاتر أو الموقع' })}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {sortedBricolers.map((pro: any, idx: number) => (
                                    <BricolerCard
                                        key={pro.id}
                                        index={idx}
                                        service={service}
                                        serviceName={getServiceById(service)?.name || 'Service'}
                                        bricoler={pro}
                                        isSelected={selectedBricolerId === pro.id}
                                        onSelect={() => {
                                            setSelectedBricolerId(pro.id);
                                            setStep(3);
                                        }}
                                        onOpenProfile={() => setViewedBricoler(pro)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-[22px] font-black text-neutral-900">{t({ en: 'When should they come?', fr: 'Quand doivent-ils venir ?', ar: 'متى يجب أن يأتوا؟' })}</h2>
                            <p className="text-[14px] font-bold text-neutral-400">{t({ en: 'Choose a date and time', fr: 'Choisissez une date et une heure', ar: 'اختر التاريخ والوقت' })}</p>
                        </div>

                        <div className="p-2 bg-neutral-50 rounded-[32px]">
                            <div className="flex flex-col gap-4">
                                <label className="text-sm font-bold text-neutral-500 uppercase tracking-wider">{t({ en: 'Pick a Date', fr: 'Choisir une date', ar: 'اختر تاريخاً' })}</label>
                                <input
                                    type="date"
                                    value={selectedDate || ''}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full p-4 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#00A082] font-semibold"
                                    min={format(new Date(), 'yyyy-MM-dd')}
                                />
                            </div>
                        </div>

                        {selectedDate && (
                            <div className="grid grid-cols-3 gap-2">
                                {['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'].map(slot => (
                                    <button
                                        key={slot}
                                        onClick={() => setSelectedTime(slot)}
                                        className={cn(
                                            "py-4 rounded-2xl border-2 font-black transition-all",
                                            selectedTime === slot ? "border-[#00927C] bg-[#00927C] text-white" : "border-neutral-100 text-neutral-600 bg-white"
                                        )}
                                    >
                                        <Clock size={16} className="inline mr-1 opacity-50" />
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-[22px] font-black text-neutral-900">{t({ en: 'Review & Payment', fr: 'Récapitulatif & Paiement', ar: 'المراجعة والدفع' })}</h2>
                        </div>

                        <div className="p-6 rounded-[32px] bg-neutral-900 text-white space-y-4">
                            <div className="flex justify-between items-center text-neutral-400 uppercase text-[11px] font-black tracking-widest">
                                <span>{t({ en: 'Task Summary', fr: 'Résumé de la tâche', ar: 'ملخص المهمة' })}</span>
                                <Wrench size={16} />
                            </div>
                            <div>
                                <h4 className="text-[20px] font-black">{getServiceById(service)?.name}</h4>
                                <p className="text-neutral-400 font-bold">{currentArea}, {currentCity}</p>
                            </div>
                            <div className="flex items-center gap-2 pt-2 text-[#00927C] font-black">
                                <Calendar size={16} />
                                <span>{selectedDate} @ {selectedTime}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <h4 className="text-[16px] font-black text-neutral-900">{t({ en: 'Payment Method', fr: 'Mode de paiement', ar: 'طريقة الدفع' })}</h4>
                            <div className="grid grid-cols-1 gap-3">
                                {['cash', 'bank'].map(method => (
                                    <button
                                        key={method}
                                        onClick={() => setPaymentMethod(method as any)}
                                        className={cn(
                                            "p-5 rounded-[24px] border-2 flex items-center gap-4 transition-all",
                                            paymentMethod === method ? "border-[#00927C] bg-[#00927C]/5" : "border-neutral-100"
                                        )}
                                    >
                                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", paymentMethod === method ? "bg-[#00927C] text-white" : "bg-neutral-100 text-neutral-400")}>
                                            {method === 'cash' ? <Banknote size={20} /> : <FileText size={20} />}
                                        </div>
                                        <span className="font-black text-[17px]">{method === 'cash' ? t({ en: 'Cash after work', fr: 'Espèces après mission', ar: 'نقداً بعد العمل' }) : t({ en: 'Bank Transfer', fr: 'Virement bancaire', ar: 'تحويل بنكي' })}</span>
                                        {paymentMethod === method && <Check size={20} className="ml-auto text-[#00927C]" strokeWidth={4} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    const renderStepFooter = () => {
        if (step === 1) {
            // Hide footer for location sub-step as we now have explicit buttons in content (Pic 2 style)
            if (subStep1 === ('location' as any)) return null;

            const isNextDisabled = !activeSubService || (
                                 subStep1 === 'languages' ? (selectedLanguages.length === 0) :
                                 subStep1 === 'size' ? (!taskSize) :
                                 subStep1 === 'description' ? (!description.trim()) : false);

            return (
                <button
                    onClick={() => {
                        if (subStep1 === 'location') setSubStep1(service === 'tour_guide' ? 'languages' : 'size');
                        else if (subStep1 === 'languages') setSubStep1('size');
                        else if (subStep1 === 'size') {
                            if (service === 'moving') setSubStep1('moving_vehicle');
                            else setSubStep1('description');
                        }
                        else if (subStep1 === 'moving_vehicle') setSubStep1('description');
                        else handleStartMatching();
                    }}
                    disabled={isNextDisabled}
                    className={cn(
                        "w-full h-15 rounded-full text-white text-[18px] font-black transition-all active:scale-95 shadow-lg",
                        !isNextDisabled ? "bg-[#00927C] shadow-[#00927C]/20" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                    )}
                >
                    {subStep1 === 'description' ? t({ en: 'Find Bricolers', fr: 'Voir les Pros' }) : t({ en: 'Next Step', fr: 'Étape suivante' })}
                </button>
            );
        }

        if (step === 2) return null;

        if (step === 3) {
            const isNextDisabled = !selectedDate || !selectedTime;
            return (
                <button
                    onClick={() => setStep(4)}
                    disabled={isNextDisabled}
                    className={cn(
                        "w-full h-15 rounded-full text-white text-[18px] font-black transition-all active:scale-95 shadow-lg",
                        !isNextDisabled ? "bg-[#00927C] shadow-[#00927C]/20" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                    )}
                >
                    {t({ en: 'Continue', fr: 'Continuer' })}
                </button>
            );
        }

        if (step === 4) {
            return (
                <button
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting}
                    className="w-full h-15 rounded-full bg-[#00927C] text-white text-[18px] font-black transition-all active:scale-95 shadow-lg shadow-[#00927C]/20 flex items-center justify-center gap-2"
                >
                    {isSubmitting ? <RefreshCw className="animate-spin" size={24} /> : <>{t({ en: 'Pay & Confirm', fr: 'Payer & Confirmer' })} <CheckCircle2 size={24} /></>}
                </button>
            );
        }

        return null;
    };

    if (!isOpen) return null;

    const flowContent = (
        <ServiceFlowLayout
            mapContent={
                isInline ? null : (
                    <OrderMapCard
                        currentAddress={`${currentArea}, ${currentCity}`}
                        serviceName={getServiceById(service)?.name || 'Service'}
                        step={step}
                    />
                )
            }
            footerContent={renderStepFooter()}
            step={step}
            onBack={handleBack}
            showBack={!isInline}
            isEmbedded={isInline}
        >
            {renderStepContent()}
        </ServiceFlowLayout>
    );

    const overlayContent = (
        <>
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
            <AnimatePresence>
                {showInternalLocationPicker && (
                    <div className="fixed inset-0 z-[5000]">
                        <LocationPicker
                            mode="single"
                            serviceType={service}
                            title={t({ en: 'Set your address', fr: 'Définissez votre adresse' })}
                            savedAddresses={userSavedAddresses}
                            onConfirm={handleInternalLocationConfirm}
                            onClose={() => setShowInternalLocationPicker(false)}
                            autoLocate={true}
                        />
                    </div>
                )}
            </AnimatePresence>
        </>
    );

    if (isInline) {
        return (
            <div className="flex-1 flex flex-col h-full bg-white relative">
                {!showInternalLocationPicker && flowContent}
                {overlayContent}
            </div>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-0 sm:p-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="w-full max-w-lg h-[92vh] sm:h-[85vh] bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {flowContent}
                    </div>
                    {overlayContent}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default OrderSubmissionFlow;
