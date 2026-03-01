"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ChevronLeft, ChevronRight, ChevronDown, MapPin,
    Star, ShieldCheck, Briefcase, Camera, Upload,
    Info, Clock, CheckCircle2, SlidersHorizontal, ArrowUpDown, Search, Check, Calendar, Trophy, FileText, Sparkles, Zap, Image as ImageIcon
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, serverTimestamp } from 'firebase/firestore';
import { getServiceById, getSubServiceName, getServiceVector } from '@/config/services_config';
import { MOROCCAN_CITIES, MOROCCAN_CITIES_AREAS } from '@/config/moroccan_areas';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

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
    // Ranking system extensions
    servicePrideScore?: number;
    happyMakingScore?: number;
    reviews?: any[];
    portfolio?: string[];
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
    uploadedImages: string[];
    paymentMethod: 'cash' | 'bank';
    bankReceipt: string | null;
    step: number;
    subStep1: 'location' | 'size' | 'description';
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
}

// ── Constants ──────────────────────────────────────────────────────────────

const TASK_SIZES = [
    {
        id: 'small',
        duration: 1,
        label: { en: 'Small', fr: 'Petit' },
        estTime: { en: 'Est: 1 hr', fr: 'Est: 1h' },
        desc: {
            en: 'Minor repairs, single item fix, or quick task.',
            fr: 'Petites réparations, fixation d\'un seul article ou tâche rapide.'
        }
    },
    {
        id: 'medium',
        duration: 2,
        label: { en: 'Medium', fr: 'Moyen' },
        estTime: { en: 'Est: 2-3 hrs', fr: 'Est: 2-3h' },
        desc: {
            en: 'Several repairs, assembling multiple items, or larger maintenance.',
            fr: 'Plusieurs réparations, assemblage de plusieurs articles ou maintenance plus importante.'
        }
    },
    {
        id: 'large',
        duration: 4,
        label: { en: 'Large', fr: 'Grand' },
        estTime: { en: 'Est: 4+ hrs', fr: 'Est: 4h+' },
        desc: {
            en: 'Extensive work, painting a room, or full day help.',
            fr: 'Travaux importants, peinture d\'une pièce ou aide d\'une journée entière.'
        }
    },
];

// ── Components ──────────────────────────────────────────────────────────────

const SuccessAnimation = ({ isVisible, onComplete }: { isVisible: boolean, onComplete: () => void }) => {
    const images = [
        "/Images/Vectors Illu/LocationFlag_VI.png",
        "/Images/Vectors Illu/matching3D.png",
        "/Images/Vectors Illu/NewOrder.png"
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
    const jobs = bricoler.completedJobs || 0;
    const rating = bricoler.rating || 0;
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
    const rank = getBricolerRank(bricoler);

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
                        src={bricoler.photoURL || "/Images/Logo/Black Lbricol Avatar Face.png"}
                        alt={bricoler.displayName}
                        className="w-16 h-16 rounded-full object-cover border border-neutral-100 bg-neutral-50"
                    />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[17px] font-bold text-neutral-900 truncate tracking-tight">{bricoler.displayName}</h4>
                        <div className="flex items-center gap-1">
                            <span className="text-[16px] font-semibold text-neutral-900 leading-none">
                                MAD {bricoler.hourlyRate?.toFixed(2) || '105.93'}
                            </span>
                            <span className="text-[12px] text-neutral-400 font-medium">/hr</span>
                            <div className="w-4 h-4 rounded-full bg-[#00A082]/10 flex items-center justify-center ml-0.5">
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
                            {rank.icon}{rank.label}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 mt-2">
                        <Star size={12} className="text-neutral-900" fill="currentColor" />
                        <span className="text-[14px] font-bold text-neutral-900">
                            {bricoler.rating > 0 ? bricoler.rating.toFixed(1) : (bricoler.completedJobs > 0 ? '5.0' : 'NEW')}
                        </span>
                        <span className="text-[12px] font-medium text-neutral-400">({bricoler.completedJobs || 0} {t({ en: 'reviews', fr: 'avis' })})</span>
                    </div>

                    <div className="flex flex-col gap-0.5 mt-2">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-neutral-500" />
                            <span className="text-[13px] font-semibold text-neutral-600">{bricoler.completedJobs || 0} {serviceName} {t({ en: 'tasks', fr: 'missions' })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bio Box */}
            <div className="mt-0.5 mx-0.5 bg-[#F8F9FA] p-3 rounded-[10px] relative border border-neutral-50">
                <p className="text-[13px] font-medium text-neutral-500 leading-relaxed line-clamp-2">
                    {bricoler.bio || bricoler.quickPitch || t({ en: "Hello 👋 I'm proficient in a wide range of services tailored to your specific needs. Fast and reliable work.", fr: "Bonjour 👋 Je suis compétent dans une large gamme de services adaptés à vos besoins. Travail rapide et fiable." })}
                </p>
                <button
                    onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
                    className="mt-1.5 text-[13px] font-bold text-[#00A082] hover:text-[#008C74] block"
                >
                    {t({ en: 'Read More', fr: 'Lire plus' })}
                </button>
            </div>

            {/* Action Button */}
            <div className="px-0.5 mt-1">
                <button
                    onClick={(e) => { e.stopPropagation(); onSelect(); }}
                    className="w-full h-[42px] bg-[#00A082] text-white rounded-full text-[16px] font-black active:scale-[0.98] transition-all"
                >
                    {t({ en: 'Select & Continue', fr: 'Choisir & Continuer' })}
                </button>
            </div>
        </motion.div>
    );
};

const BricolerProfileModal = ({ bricoler, isOpen, onClose, onSelect, isSelected, serviceName }: { bricoler: Bricoler, isOpen: boolean, onClose: () => void, onSelect: () => void, isSelected: boolean, serviceName: string }) => {
    const { t } = useLanguage();
    if (!bricoler) return null;

    const isNew = (bricoler.completedJobs || 0) === 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[3000] bg-white flex flex-col"
                >
                    {/* Header */}
                    <div className="p-6 flex items-center justify-between border-b border-neutral-100">
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center">
                            <ChevronLeft size={24} className="text-neutral-900" />
                        </button>
                        <h3 className="text-[19px] font-bold text-neutral-900">{bricoler.displayName}'s Profile</h3>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center">
                            <X size={20} className="text-neutral-400" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                        <div className="p-6">
                            {/* Profile Hero */}
                            <div className="flex gap-6 mb-8">
                                <img src={bricoler.photoURL || "/Images/Logo/Black Lbricol Avatar Face.png"} className="w-24 h-24 rounded-[28px] object-cover border-4 border-neutral-50" />
                                <div className="flex-1">
                                    <h2 className="text-[26px] font-bold text-neutral-900 leading-tight mb-1">{bricoler.displayName}</h2>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className={cn(
                                            "flex items-center gap-1 px-2 py-0.5 rounded-lg",
                                            isNew ? "bg-neutral-100 text-neutral-400" : "bg-[#FFC244]/10 text-[#FFC244]"
                                        )}>
                                            <Star size={14} fill="currentColor" />
                                            <span className="text-[16px] font-semibold">{isNew ? "0" : (bricoler.rating || 0).toFixed(1)}</span>
                                        </div>
                                        <span className="text-[15px] font-medium text-neutral-400">{bricoler.completedJobs} {t({ en: 'Missions', fr: 'Missions' })}</span>

                                        {/* Dynamic Rank Badge */}
                                        {(() => {
                                            const rank = getBricolerRank(bricoler);
                                            return (
                                                <span className={cn(
                                                    "px-2 py-0.5 text-[11px] font-semibold uppercase rounded-md ml-1 flex items-center gap-1",
                                                    rank.bg,
                                                    rank.color
                                                )}>
                                                    {rank.icon}{rank.label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className="text-[20px] font-bold text-[#00A082]">
                                        MAD {bricoler.hourlyRate || 100}<span className="text-[15px] font-medium text-neutral-400"> /hr</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <div className="p-4 bg-neutral-50 rounded-1xl border border-neutral-100">
                                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-tight mb-1">{t({ en: 'Experience', fr: 'Expérience' })}</div>
                                    <div className="text-[18px] font-bold text-neutral-900">{bricoler.yearsOfExperience || bricoler.experience || "0"}</div>
                                </div>
                                <div className="p-4 bg-neutral-50 rounded-1xl border border-neutral-100">
                                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-tight mb-1">{t({ en: 'Completed', fr: 'Réalisées' })}</div>
                                    <div className="text-[18px] font-bold text-neutral-900">{bricoler.completedJobs} {t({ en: 'Jobs', fr: 'Missions' })}</div>
                                </div>
                            </div>

                            {/* About */}
                            <div className="mb-8">
                                <h4 className="text-[18px] font-black text-neutral-900 mb-4">{t({ en: 'About Me', fr: 'À propos de moi' })}</h4>
                                <p className="text-[15px] text-black leading-relaxed font-medium  p-1 rounded-[12px] border border-neutral-100">
                                    {bricoler.bio || bricoler.quickPitch || t({ en: 'No bio provided yet.', fr: 'Aucune bio fournie pour le moment.' })}
                                </p>
                            </div>


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

                            {/* Work Photos Section */}
                            <div className="mb-8 overflow-hidden">
                                <h4 className="text-[18px] font-black text-neutral-900 mb-4 flex items-center gap-2">
                                    <ImageIcon size={20} className="text-neutral-400" />
                                    {t({ en: 'Work Photos', fr: 'Photos de réalisations' })}
                                </h4>
                                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-1 px-1">
                                    {(bricoler.portfolio || []).length > 0 ? (
                                        bricoler.portfolio?.map((url, i) => (
                                            <div key={i} className="relative w-40 h-40 flex-shrink-0 rounded-[20px] overflow-hidden border border-neutral-100 group shadow-sm">
                                                <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Work" />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="w-full py-12 flex flex-col items-center justify-center bg-neutral-50 rounded-[24px] border-2 border-dashed border-neutral-200">
                                            <ImageIcon size={32} className="text-neutral-300 mb-2" />
                                            <p className="text-neutral-400 font-medium text-[14px]">{t({ en: 'No portfolio photos yet', fr: 'Pas encore de photos de réalisations' })}</p>
                                        </div>
                                    )}
                                </div>
                            </div>


                            {/* Recent Reviews */}
                            <div className="mb-8">
                                <h4 className="text-[18px] font-bold text-neutral-900 mb-4">{t({ en: 'Recent Reviews', fr: 'Avis récents' })}</h4>
                                {(!bricoler.reviews || bricoler.reviews.length === 0) ? (
                                    <div className="p-10 text-center rounded-[24px] border-2 border-dashed border-neutral-200 bg-neutral-50/50">
                                        <p className="text-neutral-400 font-bold">{t({ en: 'No reviews yet. Be the first to hire!', fr: 'Aucun avis pour le moment. Soyez le premier à commander !' })}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {bricoler.reviews.map((rev, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-5 bg-white rounded-[24px] border border-neutral-100 shadow-sm"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-[#FFC244]/10 flex items-center justify-center text-[#FFC244] font-black">
                                                            {rev.clientName?.[0] || 'C'}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-[15px]">{rev.clientName || 'Client'}</div>
                                                            <div className="text-[12px] font-bold text-[#00A082] uppercase tracking-tight bg-[#00A082]/5 px-2 py-0.5 rounded-md inline-block">
                                                                {rev.serviceName || serviceName}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 bg-neutral-50 px-2 py-1 rounded-full">
                                                        <Star size={12} className="text-[#FFC244] fill-[#FFC244]" />
                                                        <span className="text-[14px] font-black">{rev.rating || 5}</span>
                                                    </div>
                                                </div>
                                                <p className="text-[14px] leading-relaxed text-neutral-600 font-medium">{rev.comment || t({ en: 'No comment left.', fr: 'Aucun commentaire laissé.' })}</p>
                                                <div className="mt-3 pt-3 border-t border-neutral-50 text-[12px] text-neutral-400 font-bold uppercase tracking-widest">
                                                    {rev.date ? new Date(rev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
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
                            {isSelected ? t({ en: 'Already Selected', fr: 'Déjà sélectionné' }) : t({ en: 'Select & Continue', fr: 'Choisir & Continuer' })}
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
    continueDraft
}) => {
    const { t } = useLanguage();
    const [step, setStep] = useState(1);
    const [subStep1, setSubStep1] = useState<'location' | 'size' | 'description'>('location');
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
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
    const [bankReceipt, setBankReceipt] = useState<string | null>(null);
    const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

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
        switch (service) {
            case 'cleaning':
                return {
                    title: t({ en: "How large is the space?", fr: "Quelle est la taille de l'espace ?" }),
                    options: [
                        { id: 'small', duration: 2, label: { en: 'Studio / 1 Bedroom', fr: 'Studio / 1 Chambre' }, estTime: { en: 'Est: 2 hrs', fr: 'Est: 2h' }, desc: { en: 'Basic cleaning for a small space.', fr: 'Nettoyage de base pour un petit espace.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.png' },
                        { id: 'medium', duration: 4, label: { en: '2-3 Bedrooms', fr: '2-3 Chambres' }, estTime: { en: 'Est: 4 hrs', fr: 'Est: 4h' }, desc: { en: 'Standard cleaning for a medium home.', fr: 'Nettoyage standard pour une maison moyenne.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.png' },
                        { id: 'large', duration: 6, label: { en: '4+ Bedrooms / Deep Clean', fr: '4+ Chambres / Nettoyage profond' }, estTime: { en: 'Est: 6+ hrs', fr: 'Est: 6h+' }, desc: { en: 'Extensive cleaning for large homes.', fr: 'Nettoyage complet pour grandes maisons.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.png' },
                    ]
                };
            case 'moving':
            case 'errands':
                return {
                    title: t({ en: "What's the scope of the task?", fr: "Quelle est l'ampleur de la tâche ?" }),
                    options: [
                        { id: 'small', duration: 2, label: { en: 'Few Items / Studio', fr: 'Quelques articles / Studio' }, estTime: { en: 'Est: 2 hrs', fr: 'Est: 2h' }, desc: { en: 'Small move, boxes, or quick errand.', fr: 'Petit déménagement, cartons ou course rapide.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.png' },
                        { id: 'medium', duration: 4, label: { en: '1-2 Bedroom Apartment', fr: 'Appartement 1-2 Chambres' }, estTime: { en: 'Est: 4 hrs', fr: 'Est: 4h' }, desc: { en: 'Standard move requiring a van.', fr: 'Déménagement standard nécessitant une camionnette.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.png' },
                        { id: 'large', duration: 8, label: { en: '3+ Bedroom / Full House', fr: '3+ Chambres / Maison entière' }, estTime: { en: 'Est: 8+ hrs', fr: 'Est: 8h+' }, desc: { en: 'Large scale move requiring multiple trips or large truck.', fr: 'Grand déménagement nécessitant un grand camion.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.png' },
                    ]
                };
            case 'plumbing':
            case 'electricity':
            case 'appliance_installation':
                return {
                    title: t({ en: "What's the scope of the problem?", fr: "Quelle est l'ampleur du problème ?" }),
                    options: [
                        { id: 'small', duration: 1, label: { en: 'Minor Issue / Quick Fix', fr: 'Problème mineur / Rapide' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h' }, desc: { en: 'Simple fix like a small leak or replacing an outlet.', fr: 'Réparation simple comme une fuite ou prise.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.png' },
                        { id: 'medium', duration: 2, label: { en: 'Standard / Installation', fr: 'Standard / Installation' }, estTime: { en: 'Est: 2-3 hrs', fr: 'Est: 2-3h' }, desc: { en: 'New installations or moderate repairs.', fr: 'Nouvelles installations ou réparations modérées.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.png' },
                        { id: 'large', duration: 4, label: { en: 'Major / Unknown', fr: 'Majeur / Inconnu' }, estTime: { en: 'Est: 4+ hrs', fr: 'Est: 4h+' }, desc: { en: 'Complex issues or full system replacements.', fr: 'Problèmes complexes ou remplacements complets.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.png' },
                    ]
                };
            case 'babysitting':
            case 'elderly_assistance':
                return {
                    title: t({ en: "How long is the care needed?", fr: "Quelle est la durée de garde nécessaire ?" }),
                    options: [
                        { id: 'small', duration: 3, label: { en: 'Short Term (1-4 hrs)', fr: 'Court terme (1-4h)' }, estTime: { en: 'Est: 3 hrs', fr: 'Est: 3h' }, desc: { en: 'Brief assistance or babysitting slot.', fr: 'Garde ou assistance de courte durée.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.png' },
                        { id: 'medium', duration: 6, label: { en: 'Half Day (4-8 hrs)', fr: 'Demi-journée (4-8h)' }, estTime: { en: 'Est: 6 hrs', fr: 'Est: 6h' }, desc: { en: 'Standard care for a morning, afternoon or evening.', fr: 'Garde standard pour une matinée, après-midi ou soirée.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.png' },
                        { id: 'large', duration: 10, label: { en: 'Full Day / Overnight', fr: 'Journée / Nuit' }, estTime: { en: 'Est: 10 hrs', fr: 'Est: 10h' }, desc: { en: 'Comprehensive care over an extended period.', fr: 'Soins complets sur une période prolongée.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.png' },
                    ]
                };
            case 'furniture_assembly':
                return {
                    title: t({ en: "How much furniture needs assembly?", fr: "Combien de meubles à assembler ?" }),
                    options: [
                        { id: 'small', duration: 1, label: { en: '1-2 Small Items', fr: '1-2 Petits Articles' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h' }, desc: { en: 'Quick assembly of simple items.', fr: 'Assemblage rapide d\'articles simples.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.png' },
                        { id: 'medium', duration: 3, label: { en: '1 Large / 3-4 Small Items', fr: '1 Grand / 3-4 Petits Articles' }, estTime: { en: 'Est: 2-3 hrs', fr: 'Est: 2-3h' }, desc: { en: 'Standard assembly like a bed frame or wardrobe.', fr: 'Assemblage standard (cadre de lit, grande armoire).' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.png' },
                        { id: 'large', duration: 5, label: { en: 'Full Room / Complex Items', fr: 'Pièce Complète / Articles Complexes' }, estTime: { en: 'Est: 4+ hrs', fr: 'Est: 4h+' }, desc: { en: 'Multiple large pieces or complex systems.', fr: 'Plusieurs grosses pièces ou systèmes complexes.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.png' },
                    ]
                };
            case 'handyman':
                return {
                    title: t({ en: "What is the scope of the repairs?", fr: "Quelle est l'ampleur des réparations ?" }),
                    options: [
                        { id: 'small', duration: 1, label: { en: 'Minor Fix / Single Issue', fr: 'Petite Réparation / Problème Unique' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h' }, desc: { en: 'Quick repair or adjustment.', fr: 'Réparation ou ajustement rapide.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.png' },
                        { id: 'medium', duration: 3, label: { en: 'Standard Repair / Few Issues', fr: 'Réparation Standard / Quelques Problèmes' }, estTime: { en: 'Est: 2-3 hrs', fr: 'Est: 2-3h' }, desc: { en: 'Multiple small fixes or a standard project.', fr: 'Plusieurs petites réparations ou projet standard.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.png' },
                        { id: 'large', duration: 5, label: { en: 'Multiple Repairs / Half Day', fr: 'Multiples Réparations / Demi-journée' }, estTime: { en: 'Est: 4+ hrs', fr: 'Est: 4h+' }, desc: { en: 'Extensive repair work across the property.', fr: 'Travaux de réparation approfondis sur la propriété.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.png' },
                    ]
                };
            case 'mounting':
                return {
                    title: t({ en: "What needs to be mounted?", fr: "Que faut-il fixer ?" }),
                    options: [
                        { id: 'small', duration: 1, label: { en: '1-2 Items / Picture Frames', fr: '1-2 Articles / Cadres' }, estTime: { en: 'Est: 1 hr', fr: 'Est: 1h' }, desc: { en: 'Hanging pictures, mirrors, or small shelves.', fr: 'Accrocher des tableaux, miroirs ou petites étagères.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.png' },
                        { id: 'medium', duration: 2, label: { en: 'TV / Multiple Shelves', fr: 'TV / Plusieurs Étagères' }, estTime: { en: 'Est: 2 hrs', fr: 'Est: 2h' }, desc: { en: 'Mounting a TV or several shelving units.', fr: 'Fixation d\'une télévision ou de plusieurs meubles.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.png' },
                        { id: 'large', duration: 4, label: { en: 'Complex / Heavy / Multiple Rooms', fr: 'Complexe / Lourd / Plusieurs Pièces' }, estTime: { en: 'Est: 4+ hrs', fr: 'Est: 4h+' }, desc: { en: 'Heavy mounting or covering multiple rooms.', fr: 'Fixation lourde ou couvrant plusieurs pièces.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.png' },
                    ]
                };
            case 'painting':
                return {
                    title: t({ en: "What is the painting scope?", fr: "Quelle est l'ampleur de la peinture ?" }),
                    options: [
                        { id: 'small', duration: 2, label: { en: 'Touch-ups / Single Wall', fr: 'Retouches / Un Seul Mur' }, estTime: { en: 'Est: 2 hrs', fr: 'Est: 2h' }, desc: { en: 'Minor paint repairs or an accent wall.', fr: 'Petites retouches de peinture ou mur d\'accent.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.png' },
                        { id: 'medium', duration: 5, label: { en: 'Single Room', fr: 'Une Seule Pièce' }, estTime: { en: 'Est: 4-6 hrs', fr: 'Est: 4-6h' }, desc: { en: 'Painting walls of a standard bedroom or living room.', fr: 'Peinture de murs d\'une chambre standard ou salon.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.png' },
                        { id: 'large', duration: 8, label: { en: 'Multiple Rooms / Exterior', fr: 'Plusieurs Pièces / Extérieur' }, estTime: { en: 'Est: 8+ hrs', fr: 'Est: 8h+' }, desc: { en: 'Larger painting projects, multiple rooms or exterior work.', fr: 'Grands projets de peinture, plusieurs pièces ou extérieur.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.png' },
                    ]
                };
            case 'gardening':
                return {
                    title: t({ en: "What gardening work is required?", fr: "Quel travail de jardinage est nécessaire ?" }),
                    options: [
                        { id: 'small', duration: 2, label: { en: 'Basic Mowing / Weeding', fr: 'Tonte de Base / Désherbage' }, estTime: { en: 'Est: 2 hrs', fr: 'Est: 2h' }, desc: { en: 'Simple lawn maintenance and weed removal.', fr: 'Entretien de pelouse simple et désherbage.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.png' },
                        { id: 'medium', duration: 4, label: { en: 'Yard Cleanup / Trimming', fr: 'Nettoyage de Cour / Taille' }, estTime: { en: 'Est: 4 hrs', fr: 'Est: 4h' }, desc: { en: 'Pruning trees/shrubs and general yard tidying.', fr: 'Élagage d\'arbres/arbustes et nettoyage général.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.png' },
                        { id: 'large', duration: 8, label: { en: 'Full Landscaping', fr: 'Aménagement Paysager Complet' }, estTime: { en: 'Est: 8+ hrs', fr: 'Est: 8h+' }, desc: { en: 'Major yard overhaul, planting, or extensive clearing.', fr: 'Remise à neuf majeure, plantation ou nettoyage intensif.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.png' },
                    ]
                };
            case 'glass_cleaning':
                return {
                    title: t({ en: "How many windows/surfaces?", fr: "Combien de fenêtres/surfaces ?" }),
                    options: [
                        { id: 'small', duration: 2, label: { en: 'Few Windows / Minor', fr: 'Quelques Fenêtres / Mineur' }, estTime: { en: 'Est: 1-2 hrs', fr: 'Est: 1-2h' }, desc: { en: 'Cleaning glass in a small apartment or storefront.', fr: 'Nettoyage des vitres pour petit appartement ou vitrine.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.png' },
                        { id: 'medium', duration: 4, label: { en: 'Standard House', fr: 'Maison Standard' }, estTime: { en: 'Est: 3-4 hrs', fr: 'Est: 3-4h' }, desc: { en: 'Full interior/exterior window cleaning for a typical home.', fr: 'Nettoyage complet (intérieur/extérieur) pour maison typique.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.png' },
                        { id: 'large', duration: 6, label: { en: 'Large House / High glass', fr: 'Grande Maison / Vitres Hautes' }, estTime: { en: 'Est: 6+ hrs', fr: 'Est: 6h+' }, desc: { en: 'Extensive glass cleaning requiring ladders or specialized tools.', fr: 'Nettoyage intensif nécessitant échelle ou outils spéciaux.' }, icon: '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.png' },
                    ]
                };
            default:
                return {
                    title: t({ en: "What's the size of your Task?", fr: "Quelle est la taille de votre tâche ?" }),
                    options: TASK_SIZES.map(s => ({
                        ...s,
                        icon: s.id === 'small' ? '/Images/Location&taskSize_OrderSetup/TaskSizes/SmallTask.png' :
                            s.id === 'medium' ? '/Images/Location&taskSize_OrderSetup/TaskSizes/MediumSize.png' :
                                '/Images/Location&taskSize_OrderSetup/TaskSizes/BigTask.png'
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
                draftIdRef.current = continueDraft?.id || `draft_${Date.now()}_${service}`;
            }

            if (continueDraft) {
                setStep(continueDraft.step);
                setSubStep1(continueDraft.subStep1);
                setTaskSize(continueDraft.taskSize);
                setDescription(continueDraft.description);
                setSelectedBricolerId(continueDraft.selectedBricolerId);
                setSelectedDate(continueDraft.selectedDate);
                setSelectedTime(continueDraft.selectedTime);
                setUploadedImages(continueDraft.uploadedImages);
                setPaymentMethod(continueDraft.paymentMethod);
                setBankReceipt(continueDraft.bankReceipt);
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
                setUploadedImages([]);
                setPaymentMethod('cash');
                setBankReceipt(null);
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
            id: draftIdRef.current || continueDraft?.id || `draft_${Date.now()}_${service}`,
            service,
            subService: subService || undefined,
            city: currentCity,
            area: currentArea,
            taskSize,
            description,
            selectedBricolerId,
            selectedDate,
            selectedTime,
            uploadedImages,
            paymentMethod,
            bankReceipt,
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
        selectedTime, uploadedImages, paymentMethod, bankReceipt,
        step, subStep1
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

    // Fetch existing bookings for the selected pro and date
    useEffect(() => {
        const fetchBookings = async () => {
            if (!selectedBricolerId || !selectedDate || selectedBricolerId === 'open') return;
            setIsLoadingBookings(true);
            try {
                const q = query(
                    collection(db, 'jobs'),
                    where('bricolerId', '==', selectedBricolerId)
                );
                const snap = await getDocs(q);
                const list = snap.docs
                    .map(d => d.data())
                    .filter(d => d.date === selectedDate && !['cancelled', 'rejected'].includes(d.status));
                setBookedOrders(list);
            } catch (err: any) {
                if (err.code === 'permission-denied') {
                    console.warn("Permission denied fetching bookings. Please update Firestore rules to allow read access on 'jobs'.");
                } else {
                    console.warn("Error fetching bookings:", err);
                }
            } finally {
                setIsLoadingBookings(false);
            }
        };

        fetchBookings();
    }, [selectedBricolerId, selectedDate]);

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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const remainingSlots = 4 - uploadedImages.length;
        const uploadLimit = files.slice(0, remainingSlots);

        uploadLimit.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 800;

                    if (width > height) {
                        if (width > maxDim) {
                            height *= maxDim / width;
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width *= maxDim / height;
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    setUploadedImages(prev => [...prev, compressedBase64].slice(0, 4));
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
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

    const generateAvailableSlots = () => {
        if (!selectedDate || !selectedPro || !activeTaskSize) return [];
        const blocks = (selectedPro as any).availability?.[selectedDate] || [];
        const duration = activeTaskSize.duration || 1;
        const durationMin = duration * 60;

        const slots: string[] = [];

        blocks.forEach((block: any) => {
            let current = timeToMinutes(block.from);
            const endLimit = timeToMinutes(block.to);

            while (current + durationMin <= endLimit) {
                slots.push(minutesToTime(current));
                current += 60; // Slots every hour
            }
        });

        return slots;
    };

    const isSlotBooked = (startTimeStr: string) => {
        if (!activeTaskSize) return false;
        const start = timeToMinutes(startTimeStr);
        const end = start + (activeTaskSize.duration * 60);

        return bookedOrders.some(order => {
            if (!order.time || order.time === 'Flexible') return false;
            // Need order duration. Assume 1h if not stored, but ideally store duration in orderData
            const oStart = timeToMinutes(order.time);
            const oDuration = (TASK_SIZES.find(s => s.id === order.taskSize)?.duration || 1) * 60;
            const oEnd = oStart + oDuration;

            // Overlap check: (start1 < end2) && (start2 < end1)
            return (start < oEnd) && (oStart < end);
        });
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

                // 1. Strict Area Matching - Must serve the selected neighborhood
                if (currentArea) {
                    const servesArea = (data.workAreas || []).some((a: any) => String(a).toLowerCase() === currentArea.toLowerCase()) ||
                        (data.areas || []).some((a: any) => String(a).toLowerCase() === currentArea.toLowerCase());
                    if (!servesArea) return;
                }

                // 2. Direct Service Category Matching
                const matchingService = data.services?.find((s: any) => {
                    // Support both categoryId (new) and serviceId (legacy)
                    const sId = typeof s === 'string' ? s : (s.categoryId || s.serviceId || '');
                    const catMatch = sId.toLowerCase() === targetServiceId;
                    if (!catMatch) return false;

                    // If sub-service is specified, verify it matches
                    if (subService) {
                        if (typeof s === 'string') return true; // Assume match for legacy string-only services
                        const ssId = s.subServiceId || (s.subServices?.includes(subService) ? subService : null);
                        if (!ssId) return false;
                        return ssId.toLowerCase() === subService.toLowerCase() || (Array.isArray(s.subServices) && s.subServices.includes(subService));
                    }
                    return true;
                });

                if (matchingService) {
                    // 3. Availability Check - Optional for display (could show 'Check Availability' later)
                    // We remove the strict return here to show experts even if they haven't set their schedule yet

                    listMap.set(docSnap.id, {
                        id: docSnap.id,
                        displayName: data.displayName || 'Bricoler',
                        photoURL: data.photoURL || data.avatar,
                        rating: data.rating || 5,
                        completedJobs: data.completedJobs || 0,
                        hourlyRate: (typeof matchingService === 'object' ? matchingService.hourlyRate : null) || data.hourlyRate || 100,
                        quickPitch: (typeof matchingService === 'object' ? matchingService.pitch : null) || data.quickPitch,
                        city: data.city,
                        areas: data.workAreas || data.areas || [],
                        isVerified: data.isVerified,
                        services: data.services || [],
                        availability: data.calendarSlots || {},
                        bio: data.bio,
                        glassCleaningEquipments: data.glassCleaningEquipments || [],
                        serviceEquipments: typeof matchingService === 'object' ? matchingService.equipments : [],
                        yearsOfExperience: (typeof matchingService === 'object' ? matchingService.experience : null) || data.yearsOfExperience || data.experience,
                        isActive: true,
                        reviews: data.reviews || [],
                        portfolio: data.portfolio || []
                    });
                }
            });
            const fetched = Array.from(listMap.values());
            setBricolers(fetched);
            if (fetched.length > 0) {
                playMatchSound();
            }
        } catch (err) {
            console.error("Error fetching bricolers:", err);
            setBricolers([]);
        } finally {
            setIsLoadingBricolers(false);
        }
    };

    const sortedBricolers = [...bricolers].sort((a, b) => {
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        return 0; // 'all' is default unsorted or naturally sorted
    });

    const filteredAreas = useMemo(() => {
        const all = tempCity ? MOROCCAN_CITIES_AREAS[tempCity] || [] : [];
        if (!areaSearch.trim()) return all;
        return all.filter(a => a.toLowerCase().includes(areaSearch.toLowerCase()));
    }, [tempCity, areaSearch]);

    const handleLocationSave = () => {
        setCurrentCity(tempCity);
        setCurrentArea(tempArea);
        setIsSelectingLocation(false);
    };

    const handleFinalSubmit = async () => {
        if (!taskSize || isSubmitting) return;

        if (paymentMethod === 'bank' && !bankReceipt) {
            alert(t({ en: 'Please upload your transfer receipt before programming the mission.', fr: 'Veuillez télécharger votre reçu de virement avant de programmer la mission.' }));
            return;
        }

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
            const hourlyRate = selectedPro?.hourlyRate || 100;
            const duration = activeTaskSize?.duration || 1;
            const basePrice = hourlyRate * duration;
            const serviceFee = basePrice * 0.15;
            const totalPrice = basePrice + serviceFee;

            const getBricolerRankLabel = (pro: any): 'New' | 'Pro' | 'Elite' => {
                const jobs = pro.completedJobs || 0;
                const rating = pro.rating || 0;
                const verified = pro.isVerified || false;
                if (jobs > 40 && rating >= 4.5 && verified) return 'Elite';
                if (jobs >= 20 && rating >= 4.4) return 'Pro';
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
                status: 'pending',
                date: selectedDate || 'Flexible',
                time: selectedTime || 'Flexible',
                duration,
                basePrice,
                serviceFee,
                totalPrice,
                price: totalPrice,
                images: uploadedImages,
                paymentMethod,
                bankReceipt: paymentMethod === 'bank' ? bankReceipt : null,
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
                            className="absolute top-6 right-6 p-2 bg-[#F7F7F7] rounded-full transition-transform active:scale-90 z-[3010]"
                        >
                            <X size={20} strokeWidth={3} className="text-black" />
                        </button>
                    )}

                    {/* Content Section */}
                    <div className={cn(
                        "flex-1 min-h-0 overflow-y-auto px-8 pb-4 overscroll-contain touch-pan-y relative",
                        !isSelectingLocation ? "pt-16" : "pt-4"
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
                                                placeholder={locStep === 'city' ? t({ en: 'Search city...', fr: 'Rechercher une ville...' }) : t({ en: 'Search area...', fr: 'Rechercher un quartier...' })}
                                                className="w-full bg-[#F2F2F2] h-11 pl-11 pr-10 rounded-full text-[15px] font-bold outline-none focus:ring-2 focus:ring-[#00A082]/20"
                                                value={areaSearch}
                                                onChange={e => setAreaSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto no-scrollbar pt-2 space-y-1">
                                        {locStep === 'city' ? (
                                            MOROCCAN_CITIES
                                                .filter(c => c.toLowerCase().includes(areaSearch.toLowerCase()))
                                                .map(city => (
                                                    <button
                                                        key={city}
                                                        onClick={() => { setTempCity(city); setLocStep('area'); setAreaSearch(''); }}
                                                        className="w-full text-left py-4 px-1 active:bg-neutral-50 transition-colors"
                                                    >
                                                        <p className="text-[17px] font-black text-neutral-900">{city}</p>
                                                        <p className="text-[13px] font-semibold text-neutral-400 mt-0.5">{t({ en: 'Morocco', fr: 'Maroc' })}</p>
                                                    </button>
                                                ))
                                        ) : (
                                            <>
                                                {areaSearch.trim() && !filteredAreas.some(a => a.toLowerCase() === areaSearch.trim().toLowerCase()) && (
                                                    <button
                                                        onClick={() => {
                                                            const newArea = areaSearch.trim();
                                                            setTempArea(newArea);
                                                            handleLocationSave();
                                                        }}
                                                        className="w-full text-left py-4 px-1 active:bg-neutral-50 transition-colors border-2 border-dashed border-[#00A082]/30 rounded-[12px] mb-2"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-[#00A082]/10 flex items-center justify-center">
                                                                <Plus size={16} className="text-[#00A082]" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[17px] font-black text-[#00A082]">{t({ en: 'Add', fr: 'Ajouter' })} "{areaSearch.trim()}"</p>
                                                                <p className="text-[13px] font-semibold text-neutral-400">{tempCity}</p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                )}
                                                {filteredAreas.map(area => (
                                                    <button
                                                        key={area}
                                                        onClick={() => { setTempArea(area); handleLocationSave(); }}
                                                        className="w-full text-left py-4 px-1 active:bg-neutral-50 transition-colors"
                                                    >
                                                        <p className="text-[17px] font-black text-neutral-900">{area}</p>
                                                        <p className="text-[13px] font-semibold text-neutral-400 mt-0.5">{tempCity}, {t({ en: 'Morocco', fr: 'Maroc' })}</p>
                                                    </button>
                                                ))}
                                            </>
                                        )}
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
                                    {/* Service Indicator Pill — Zoomed Out */}
                                    <div className="flex justify-center mt-2 mb-2">
                                        <div className="inline-flex items-center gap-2 bg-[#FCEBA4] px-4 py-2 rounded-[20px] border border-[#DECD85]/50">
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
                                                return <img src={`/Images/Service Category vectors/${iconName}`} className="w-4 h-4 object-contain" />;
                                            })()}
                                            <span className="text-[13px] font-semibold text-neutral-900 whitespace-nowrap opacity-90">
                                                {getServiceById(service)?.name} {subService ? `› ${getSubServiceName(service, subService)}` : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Dynamic Step 1 Sub-sections */}
                                    <AnimatePresence mode="wait">
                                        {subStep1 === 'location' && (
                                            <motion.div
                                                key="sub-loc"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.2 }}
                                                className="space-y-4 pt-30"
                                            >
                                                <h4 className="text-[25px] font-bold text-black ml-1">
                                                    {(service === 'moving' || service === 'errands')
                                                        ? t({ en: 'Pickup Location', fr: 'Lieu de départ' })
                                                        : t({ en: 'Select your location', fr: 'Sélectionnez votre lieu d\'intervention' })}
                                                </h4>
                                                <div className="flex items-center justify-between bg-[#F0FAF7] px-4 py-4 rounded-[12px] border border-[#00A082]/10">
                                                    <div className="flex items-center gap-3">
                                                        <img src="/Images/LocationFlag_VI.png" className="w-[52px] h-auto object-contain" />
                                                        <div className="flex flex-col">
                                                            <p className="text-[12px] font-medium text-neutral-500 leading-none mb-1">{t({ en: 'Location', fr: 'Lieu d\'intervention' })}</p>
                                                            <p className="text-[16px] font-semibold text-[#2D2D2D] leading-tight">
                                                                {currentCity}{currentArea ? `, ${currentArea}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => { setTempCity(currentCity); setTempArea(currentArea); setIsSelectingLocation(true); setLocStep('city'); setAreaSearch(''); }}
                                                        className="text-[15px] font-semibold text-[#00A082] px-1 hover:opacity-70 transition-opacity"
                                                    >
                                                        {t({ en: 'Edit', fr: 'Modifier' })}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}

                                        {subStep1 === 'size' && (
                                            <motion.div
                                                key="sub-size"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.2 }}
                                                className="space-y-4 pt-30"
                                            >
                                                <h4 className="text-[25px] font-bold text-black ml-1">
                                                    {serviceConfig.title}
                                                </h4>
                                                <div className="flex flex-col gap-2">
                                                    {serviceConfig.options.map((size, idx) => {
                                                        return (
                                                            <button
                                                                key={size.id}
                                                                onClick={() => {
                                                                    setTaskSize(size.id);
                                                                    setTimeout(() => setSubStep1('description'), 250);
                                                                }}
                                                                className={cn(
                                                                    "flex items-center gap-3 p-3 pr-4 rounded-[12px] text-left transition-all",
                                                                    taskSize === size.id ? "bg-[#F7F6F6] border-2 border-[#00A082]" : "bg-neutral-50/40 border border-neutral-100 hover:border-[#008C74]/30"
                                                                )}
                                                            >
                                                                <img src={size.icon} className="w-15 h-15 object-contain grayscale-[0.2]" />
                                                                <div className="flex-1">
                                                                    <div className="flex items-center justify-between mb-0.5">
                                                                        <span className="text-[16px] font-semibold text-neutral-900 leading-none">{size.label[t({ en: 'en', fr: 'fr' }) as 'en' | 'fr']}</span>
                                                                        <span className="text-[12px] font-bold text-[#00A082] px-0 rounded-md whitespace-nowrap">
                                                                            ≈{size.estTime[t({ en: 'en', fr: 'fr' }) as 'en' | 'fr']}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[15px] text-black font-light leading-snug opacity-90 max-w-[85%]">{size.desc[t({ en: 'en', fr: 'fr' }) as 'en' | 'fr']}</p>
                                                                </div>
                                                            </button>
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
                                                transition={{ duration: 0.2 }}
                                                className="space-y-4 pt-30 pb-12"
                                            >
                                                <h4 className="text-[25px] font-bold text-black ml-1">
                                                    {t({ en: 'Describe What you need', fr: 'Décrivez votre besoin' })}
                                                </h4>
                                                {(service === 'moving' || service === 'errands') && (
                                                    <p className="text-[13.5px] text-[#00A082] font-bold ml-1 -mt-3 mb-1">
                                                        {t({ en: '* Please include drop-off address and stairs/elevator details.', fr: '* Veuillez indiquer le lieu d\'arrivée et les détails (escaliers, etc.).' })}
                                                    </p>
                                                )}
                                                <div>
                                                    <div className="bg-[#F7F6F6] rounded-[12px] border border-neutral-100 p-4">
                                                        <textarea
                                                            value={description}
                                                            onChange={(e) => setDescription(e.target.value)}
                                                            placeholder={t({
                                                                en: 'Example: I need to install a TV on a wall. I already have the bracket.',
                                                                fr: 'Exemple : Je dois installer une TV au mur. J\'ai déjà le support.'
                                                            })}
                                                            className="w-full h-24 bg-transparent outline-none text-[15px] font-medium text-neutral-800 placeholder:text-neutral-400 resize-none leading-relaxed"
                                                        />
                                                    </div>

                                                    {/* Drafts Section */}
                                                    {descriptionDrafts.length > 0 && (
                                                        <div className="flex gap-2 w-full overflow-x-auto no-scrollbar py-3 mt-1">
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
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Images Upload */}
                                                <div className="space-y-3 pt-2">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-[12px] font-black text-black uppercase tracking-widest px-1">
                                                            {t({ en: 'Photos (Optional)', fr: 'Photos (Optionnel)' })}
                                                        </h4>
                                                        <span className="text-[11px] font-bold text-neutral-300">{uploadedImages.length}/4</span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-3">
                                                        {uploadedImages.map((img, idx) => (
                                                            <div key={idx} className="relative w-24 h-24 rounded-[14px] overflow-hidden group ring-1 ring-neutral-100 ">
                                                                <img src={img} className="w-full h-full object-cover" />
                                                                <button
                                                                    onClick={() => removeImage(idx)}
                                                                    className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md active:scale-90 transition-transform"
                                                                >
                                                                    <X size={14} strokeWidth={3} />
                                                                </button>
                                                            </div>
                                                        ))}

                                                        {uploadedImages.length < 4 && (
                                                            <label className="w-24 h-24 rounded-[14px] border-2 border-dashed border-neutral-200 bg-neutral-50/50 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 hover:border-[#008C74]/40 transition-all active:scale-95">
                                                                <Camera size={26} className="text-neutral-400 mb-1" />
                                                                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">{t({ en: 'Add', fr: 'Ajouter' })}</span>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    multiple
                                                                    className="hidden"
                                                                    onChange={handleImageUpload}
                                                                />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ) : (step === 2 && isMatchingAnimation) ? (
                                <motion.div
                                    key="matching-search"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-[100] bg-[#FFC244] flex flex-col items-center justify-center -mx-6 -my-4 overflow-hidden"
                                >
                                    <div className="relative w-64 h-64 flex items-center justify-center">
                                        {/* Main White Eggy Blob */}

                                        {/* Main White Eggy Blob */}
                                        <motion.div
                                            animate={{
                                                borderRadius: ["50% 50% 50% 50% / 50% 50% 50% 50%", "42% 58% 65% 35% / 55% 45% 55% 45%", "50% 50% 50% 50% / 50% 50% 50% 50%"],
                                                scale: [1, 1.05, 1],
                                            }}
                                            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                            className="absolute w-44 h-44 bg-white flex items-center justify-center z-10"
                                        >
                                            <motion.img
                                                src="/Images/Logo/LbricolYellowFaceLogo.png"
                                                className="w-24 h-24 object-contain"
                                                animate={{
                                                    scale: [1, 1.15, 1],
                                                    rotate: [0, 10, -10, 0]
                                                }}
                                                transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                                            />
                                        </motion.div>
                                    </div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="mt-12 text-center"
                                    >
                                        <h3 className="text-[26px] font-black text-neutral-900 mb-2">
                                            {t({ en: 'Matching you...', fr: 'Matching en cours...' })}
                                        </h3>
                                        <p className="text-neutral-800 font-bold px-12 leading-tight opacity-80">
                                            {t({ en: 'Finding the perfect pros for your task', fr: 'Nous cherchons les meilleurs experts pour vous' })}
                                        </p>
                                    </motion.div>
                                </motion.div>
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
                                                return <img src={`/Images/Service Category vectors/${iconName}`} className="w-5 h-5 object-contain" />;
                                            })()}
                                            <span className="text-[13px] font-black text-neutral-900 whitespace-nowrap opacity-80">
                                                {getServiceById(service)?.name} {subService ? `> ${getSubServiceName(service, subService)}` : ''}
                                            </span>
                                        </div>

                                        <div className="flex-shrink-0 flex items-center gap-2 bg-[#FCEBA4] px-4 py-2.5 rounded-full border border-[#DECD85]/50">
                                            <img src="/Images/LocationFlag_VI.png" className="w-7 h-4.5 object-contain" />

                                            <span className="text-[13px] font-black text-neutral-900 whitespace-nowrap opacity-80">
                                                {currentCity}, {currentArea} - {activeTaskSize?.label[t({ en: 'en', fr: 'fr' }) as 'en' | 'fr']}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 pb-2">
                                        <h3 className="text-[22px] font-black text-neutral-900">{t({ en: 'Find your Tasker', fr: 'Trouvez votre Pro' })}</h3>
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
                                                    <h4 className="text-[16px] font-black text-neutral-900 mb-1">{t({ en: 'No matching pros found', fr: 'Aucun expert trouvé' })}</h4>
                                                    <p className="text-[12px] font-bold text-neutral-400">
                                                        {t({ en: 'Try changing your location or post an open request.', fr: 'Changez de lieu ou postez une offre ouverte.' })}
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
                                    <div className="flex items-center justify-between mb-8 px-1">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img
                                                    src={selectedPro?.photoURL || "/Images/Logo/Black Lbricol Avatar Face.png"}
                                                    className="w-12 h-12 rounded-full object-cover bg-neutral-100"
                                                />
                                            </div>
                                            <h3 className="text-[18px] font-black text-neutral-900 tracking-tight">
                                                {selectedPro?.displayName || t({ en: 'Tasker', fr: 'Pro' })} — {t({ en: 'Availability', fr: 'Disponibilités' })}
                                            </h3>
                                        </div>
                                        <button
                                            onClick={() => setStep(2)}
                                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-all text-neutral-900"
                                        >
                                            <X size={24} strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    {/* Month Selection / Display */}
                                    <div className="text-center mb-6">
                                        <h4 className="text-[17px] font-black text-neutral-900">
                                            {(() => {
                                                const d = new Date();
                                                const currentMonth = d.toLocaleDateString('en-US', { month: 'long' });
                                                const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1).toLocaleDateString('en-US', { month: 'long' });
                                                return `${currentMonth} — ${nextMonth} ${d.getFullYear()}`;
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
                                            {(() => {
                                                const days = [];
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);

                                                // Start from current day or start of current week?
                                                // Screenshot shows 22 (Sun) as first day. Let's find the start of current week.
                                                const startOfWeek = new Date(today);
                                                startOfWeek.setDate(today.getDate() - today.getDay());

                                                for (let i = 0; i < 21; i++) {
                                                    const d = new Date(startOfWeek);
                                                    d.setDate(startOfWeek.getDate() + i);
                                                    const dateStr = d.toISOString().split('T')[0];
                                                    const isSelected = selectedDate === dateStr;
                                                    const isPast = d < today;

                                                    // Availability check
                                                    const hasAvailability = selectedPro?.availability && selectedPro.availability[dateStr] && selectedPro.availability[dateStr].length > 0;
                                                    const isSelectable = !isPast && (selectedBricolerId === 'open' || hasAvailability);

                                                    days.push(
                                                        <button
                                                            key={i}
                                                            disabled={!isSelectable}
                                                            onClick={() => setSelectedDate(dateStr)}
                                                            className={cn(
                                                                "h-12 w-full flex items-center justify-center text-[16px] font-bold transition-all relative",
                                                                isSelected ? "bg-[#00A082] text-white rounded-md z-10" :
                                                                    isSelectable ? "text-neutral-900 hover:bg-neutral-50" : "text-neutral-300"
                                                            )}
                                                        >
                                                            {d.getDate()}
                                                            {isSelectable && !isSelected && (
                                                                <div className="absolute bottom-1 w-1 h-1 bg-[#00A082] rounded-full opacity-40" />
                                                            )}
                                                        </button>
                                                    );
                                                }
                                                return days;
                                            })()}
                                        </div>
                                    </div>

                                    {/* Time Selector Dropdown */}
                                    <div className="mt-8 px-1">
                                        <div className="relative">
                                            <select
                                                value={selectedTime || ''}
                                                onChange={(e) => setSelectedTime(e.target.value)}
                                                className="w-full h-[64px] bg-white border border-neutral-300 rounded-[32px] px-8 text-[18px] font-bold text-neutral-900 outline-none appearance-none flex items-center transition-all focus:border-[#008C74]"
                                            >
                                                <option value="">{t({ en: 'Select a time slot', fr: 'Choisir un créneau' })}</option>
                                                {(() => {
                                                    const generated = generateAvailableSlots();
                                                    // Strict: only show generated if pro selected
                                                    const finalSlots = (generated.length > 0)
                                                        ? generated
                                                        : (selectedBricolerId === 'open' ? ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'] : []);

                                                    return finalSlots.map(slot => {
                                                        const isCurrentlyBooked = isSlotBooked(slot);
                                                        if (isCurrentlyBooked) return null;

                                                        // Filter out past times if selected day is today (with 1 hour buffer)
                                                        if (selectedDate) {
                                                            const isToday = new Date(selectedDate).toDateString() === new Date().toDateString();
                                                            if (isToday) {
                                                                const [h, m] = slot.split(':').map(Number);
                                                                const now = new Date();
                                                                const slotTimeInMins = h * 60 + m;
                                                                const nowInMins = now.getHours() * 60 + now.getMinutes();
                                                                if (slotTimeInMins <= nowInMins + 60) return null; // 1-hour buffer minimum
                                                            }
                                                        }

                                                        // Format to readable AM/PM
                                                        const [h, m] = slot.split(':');
                                                        const hh = parseInt(h);
                                                        const period = hh >= 12 ? 'pm' : 'am';
                                                        const displayH = hh > 12 ? hh - 12 : (hh === 0 ? 12 : hh);
                                                        const displayTime = `${displayH}:${m}${period}`;

                                                        return (
                                                            <option key={slot} value={slot}>{displayTime}</option>
                                                        );
                                                    });
                                                })()}
                                            </select>
                                            <ChevronDown size={22} className="absolute right-8 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Helper Information */}
                                    <div className="mt-6 px-1 space-y-6">
                                        <p className="text-[14px] font-medium text-neutral-500 leading-relaxed">
                                            {t({
                                                en: 'Choose your task date and start time. You can chat to adjust task details or change start time after confirming.',
                                                fr: 'Choisissez la date et l\'heure de début. Vous pourrez discuter pour ajuster les détails ou modifier l\'heure après confirmation.'
                                            })}
                                        </p>

                                        <div className="h-[1px] bg-neutral-100 w-full" />

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[17px] font-bold text-neutral-900">{t({ en: 'Request for:', fr: 'Demande pour :' })}</span>
                                                <span className="text-[17px] font-bold text-neutral-600">
                                                    {selectedDate && selectedTime ? (() => {
                                                        const d = new Date(selectedDate);
                                                        const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                        const [h, m] = selectedTime.split(':');
                                                        const hh = parseInt(h);
                                                        const period = hh >= 12 ? 'pm' : 'am';
                                                        const displayH = hh > 12 ? hh - 12 : (hh === 0 ? 12 : hh);
                                                        return `${datePart}, ${displayH}:${m}${period}`;
                                                    })() : '—'}
                                                </span>
                                            </div>
                                            <p className="text-[15px] font-black text-[#00A082]">
                                                {t({ en: 'This Tasker requires 2 hour min', fr: 'Ce pro requiert un minimum de 2 heures' })}
                                            </p>
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
                                                {t({ en: 'Next, confirm your details to get connected with your Tasker.', fr: 'Ensuite, confirmez vos détails pour être mis en relation avec votre Pro.' })}
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
                                    <div className="px-12 pt-10 pb-6 flex items-center gap-6">
                                        <div className="w-45 h-50 flex-shrink-0">
                                            <img src="/Images/Vectors Illu/NewOrder.png" className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex flex-col">
                                            <h2 className="text-[35px] font-black text-black leading-[1.1] tracking-tighter">
                                                {t({ en: 'Your Bricol.ma Order', fr: 'Votre commande Bricol.ma' })}
                                            </h2>
                                            <div className="flex items-center gap-2 text-[18px] font-semibold text-black mt-1">
                                                <span>{selectedDate ? new Date(selectedDate).toLocaleDateString(t({ en: 'en-US', fr: 'fr-FR' }), { day: 'numeric', month: 'short' }) : t({ en: 'Flexible', fr: 'Flexible' })}</span>
                                                <span className="text-neutral-200">|</span>
                                                <span>{selectedTime}</span>
                                            </div>
                                            <p className="text-[12px] font-light text-black uppercase tracking-[0.2em] mt-2">
                                                {t({ en: 'ORDER ID', fr: 'ID DE COMMANDE' })}: #TEMP
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

                                    <div className="px-6 py-8 space-y-10">
                                        {/* Your Order */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-2 min-w-0">

                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[20px] font-semibold text-black">
                                                    {getServiceById(service)?.name} {subService ? `› ${getSubServiceName(service, subService)}` : ''}
                                                </p>
                                                <p className="text-[14px] font-light text-black leading-relaxed">
                                                    {t({ en: 'Our Bricoler, ', fr: 'Notre Bricoler, ' })}<span className="text-black font-semibold">{selectedPro?.displayName || t({ en: 'a qualified Pro', fr: 'un Pro qualifié' })}</span>{t({ en: ', will do the task for you. Feel free to chat for more details.', fr: ', effectuera la tâche pour vous. N\'hésitez pas à discuter pour plus de détails.' })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Task Details Section — same as ClientOrdersView */}
                                        <div className="px-6 space-y-3">
                                            <h3 className="text-[24px] font-black text-black">{t({ en: 'Need Description', fr: 'Description du besoin' })}</h3>
                                            <div className="p-5 bg-neutral-50 rounded-[20px] text-neutral-600 text-[15px] font-medium leading-relaxed border border-neutral-100">
                                                {description || t({ en: 'No description provided.', fr: 'Aucune description fournie.' })}
                                            </div>
                                        </div>


                                        {/* Task Photos preview */}
                                        {uploadedImages.length > 0 && (
                                            <div className="px-6 space-y-3">
                                                <h3 className="text-[24px] font-black text-black">{t({ en: 'Photos', fr: 'Photos' })}</h3>
                                                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                                    {uploadedImages.map((img, i) => (
                                                        <div key={i} className="relative w-32 h-32 flex-shrink-0 rounded-[20px] overflow-hidden border border-neutral-100 shadow-sm">
                                                            <img src={img} className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Choose Payment Method — interactive selector */}
                                        <div className="space-y-4 px-6 pb-6">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-[24px] font-black text-black">{t({ en: 'Payment', fr: 'Paiement' })}</h3>
                                                <div className="w-14 h-14 flex-shrink-0">
                                                    <img src="/Images/Vectors Illu/Screenshot 2026-02-23 at 11.36.49-Photoroom.png" className="w-full h-full object-contain" />
                                                </div>
                                            </div>
                                            <p className="text-[15px] font-medium text-neutral-400 -mt-2">{t({ en: 'Choose your payment method', fr: 'Choisissez votre moyen de paiement' })}</p>
                                            <div className="flex gap-3">
                                                {/* Cash */}
                                                <button
                                                    onClick={() => setPaymentMethod('cash')}
                                                    className={cn(
                                                        "flex-1 flex items-center gap-3 px-5 py-4 rounded-[16px] border-2 transition-all",
                                                        paymentMethod === 'cash'
                                                            ? "bg-[#FFF8E7] border-[#FFC244]"
                                                            : "bg-neutral-50 border-neutral-100"
                                                    )}
                                                >
                                                    <span className="text-2xl">💵</span>
                                                    <div className="text-left">
                                                        <p className={cn("text-[15px] font-black leading-tight", paymentMethod === 'cash' ? "text-black" : "text-neutral-600")}>
                                                            {t({ en: 'Cash', fr: 'Espèces' })}
                                                        </p>
                                                        <p className="text-[12px] font-medium text-neutral-400">{t({ en: 'On delivery', fr: 'À la livraison' })}</p>
                                                    </div>
                                                    {paymentMethod === 'cash' && (
                                                        <div className="ml-auto w-5 h-5 rounded-full bg-[#FFC244] flex items-center justify-center">
                                                            <Check size={11} strokeWidth={4} className="text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                                {/* Bank Transfer */}
                                                <button
                                                    onClick={() => setPaymentMethod('bank')}
                                                    className={cn(
                                                        "flex-1 flex items-center gap-3 px-5 py-4 rounded-[16px] border-2 transition-all",
                                                        paymentMethod === 'bank'
                                                            ? "bg-[#E6F6F2] border-[#00A082]"
                                                            : "bg-neutral-50 border-neutral-100"
                                                    )}
                                                >
                                                    <span className="text-2xl">🏦</span>
                                                    <div className="text-left">
                                                        <p className={cn("text-[15px] font-black leading-tight", paymentMethod === 'bank' ? "text-[#00A082]" : "text-neutral-600")}>
                                                            {t({ en: 'Bank Transfer', fr: 'Virement' })}
                                                        </p>
                                                        <p className="text-[12px] font-medium text-neutral-400">{t({ en: 'Upload receipt', fr: 'Joindre reçu' })}</p>
                                                    </div>
                                                    {paymentMethod === 'bank' && (
                                                        <div className="ml-auto w-5 h-5 rounded-full bg-[#00A082] flex items-center justify-center">
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
                                                            <p className="text-[15px] font-black text-[#00A082]">{t({ en: 'Account Details', fr: 'Coordonnées Bancaires' })}</p>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center text-[13px]">
                                                                <span className="text-neutral-500 font-medium">{t({ en: 'Bank:', fr: 'Banque :' })}</span>
                                                                <span className="font-bold text-black">Barid Bank</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-[13px]">
                                                                <span className="text-neutral-500 font-medium">{t({ en: 'Name:', fr: 'Nom :' })}</span>
                                                                <span className="font-bold text-black">Abdelmalek Tahri</span>
                                                            </div>
                                                            <div className="flex flex-col gap-1.5 pt-1">
                                                                <span className="text-neutral-500 text-[13px] font-medium">{t({ en: 'RIB:', fr: 'RIB :' })}</span>
                                                                <div className="p-3 bg-white border border-[#00A082]/10 rounded-xl flex justify-between items-center">
                                                                    <span className="font-mono text-[14px] font-bold text-black tracking-tight">350810000000000880844466</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText('350810000000000880844466');
                                                                            // Optional: You could add a temporary toast or text change here
                                                                        }}
                                                                        className="px-2.5 py-1 bg-[#00A082] hover:bg-[#00896F] rounded-lg transition-colors active:scale-95"
                                                                    >
                                                                        <span className="text-[11px] font-black text-white uppercase">{t({ en: 'Copy', fr: 'Copier' })}</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Bank receipt upload — only shows when bank is selected */}
                                            {paymentMethod === 'bank' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <label className={cn(
                                                        "flex items-center gap-4 w-full p-5 rounded-[16px] border-2 border-dashed cursor-pointer transition-all",
                                                        bankReceipt ? "border-[#00A082] bg-[#E6F6F2]/30" : "border-neutral-200 hover:border-[#00A082] hover:bg-[#E6F6F2]/20"
                                                    )}>
                                                        {bankReceipt ? (
                                                            <>
                                                                <img src={bankReceipt} className="w-14 h-14 rounded-[10px] object-cover" />
                                                                <div className="flex-1">
                                                                    <p className="text-[14px] font-black text-[#00A082]">{t({ en: 'Receipt attached', fr: 'Reçu joint' })}</p>
                                                                    <p className="text-[12px] text-neutral-400 font-medium">{t({ en: 'Tap to change', fr: 'Appuyer pour changer' })}</p>
                                                                </div>
                                                                <button onClick={(e) => { e.preventDefault(); setBankReceipt(null); }} className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center">
                                                                    <X size={14} className="text-neutral-500" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-12 h-12 rounded-[12px] bg-neutral-100 flex items-center justify-center">
                                                                    <Upload size={20} className="text-neutral-400" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[14px] font-black text-neutral-700">{t({ en: 'Upload bank receipt', fr: 'Téléverser le reçu bancaire' })}</p>
                                                                    <p className="text-[12px] text-neutral-400 font-medium">{t({ en: 'JPG or PNG', fr: 'JPG ou PNG' })}</p>
                                                                </div>
                                                            </>
                                                        )}
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                            const f = e.target.files?.[0];
                                                            if (!f) return;
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => setBankReceipt(ev.target?.result as string);
                                                            reader.readAsDataURL(f);
                                                        }} />
                                                    </label>
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Summary Section — same bg/zigzag as ClientOrdersView */}
                                    <div className="mt-4 bg-[#FFFFFF] relative">
                                        <div className="absolute top-0 left-0 right-0 h-[10px] -translate-y-[10px]">
                                            <div className="w-full h-full" style={{
                                                backgroundImage: 'linear-gradient(135deg, transparent 45%, #F5F5F5 45%, #F5F5F5 55%, transparent 55%), linear-gradient(-135deg, transparent 45%, #F5F5F5 45%, #F5F5F5 55%, transparent 55%)',
                                                backgroundSize: '20px 20px',
                                                backgroundRepeat: 'repeat-x'
                                            }} />
                                        </div>
                                        <div className="px-12 py-12 space-y-10">
                                            <h3 className="text-[34px] font-black text-black">{t({ en: 'Summary', fr: 'Résumé' })}</h3>
                                            <div className="space-y-8">
                                                <div className="flex justify-between items-center px-2">
                                                    <div className="flex items-center gap-6">
                                                        <span className="text-[18px] font-semibold text-black">{t({ en: 'Task Fee', fr: 'Frais de tâche' })}</span>
                                                        <span className="text-[15px] font-light text-black">≈ {activeTaskSize?.estTime[t({ en: 'en', fr: 'fr' }) as 'en' | 'fr']}</span>
                                                    </div>
                                                    <span className="text-[18px] font-bold text-black tracking-tight">{Math.round((selectedPro?.hourlyRate || 100) * (activeTaskSize?.duration || 1) * 0.85)} MAD</span>
                                                </div>
                                                <div className="flex justify-between items-center px-2">
                                                    <div className="flex items-center gap-6">
                                                        <span className="text-[18px] font-semibold text-black">{t({ en: 'Lbricol Fee', fr: 'Frais Lbricol' })}</span>
                                                        <span className="text-[15px] font-light text-black">15%</span>
                                                    </div>
                                                    <span className="text-[18px] font-bold text-black tracking-tight">{Math.round((selectedPro?.hourlyRate || 100) * (activeTaskSize?.duration || 1) * 0.15)} MAD</span>
                                                </div>
                                                <div className="pt-10 flex justify-between items-center px-2 border-t border-neutral-200">
                                                    <span className="text-[32px] font-black text-black">{t({ en: 'Total', fr: 'Total' })}</span>
                                                    <span className="text-[32px] font-black text-black tracking-tighter">{Math.round((selectedPro?.hourlyRate || 100) * (activeTaskSize?.duration || 1))} MAD</span>
                                                </div>

                                                <div className="pt-10 space-y-6">
                                                    <div className="space-y-4">
                                                        <h4 className="text-[24px] font-black text-black">{t({ en: 'Need Description', fr: 'Description du besoin' })}</h4>
                                                        <p className="text-[15px] font-light text-neutral-500 leading-relaxed bg-neutral-50 p-6 rounded-[20px]">
                                                            {description || t({ en: 'No specific instructions provided.', fr: 'Aucune instruction spécifique fournie.' })}
                                                        </p>
                                                    </div>

                                                    {uploadedImages.length > 0 && (
                                                        <div className="space-y-4">
                                                            <h4 className="text-[24px] font-black text-black">{t({ en: 'Photos', fr: 'Photos' })}</h4>
                                                            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                                                                {uploadedImages.map((src, i) => (
                                                                    <div key={i} className="relative w-40 h-40 flex-shrink-0 rounded-[24px] overflow-hidden border border-neutral-100 shadow-sm">
                                                                        <img src={src} className="w-full h-full object-cover" alt="Task" />
                                                                    </div>
                                                                ))}
                                                            </div>
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
                    {!isMatchingAnimation && !showSuccessAnimation && (
                        <div className="px-6 py-4 border-t border-neutral-100 bg-white flex-shrink-0">
                            {isSelectingLocation ? (
                                <button
                                    onClick={handleLocationSave}
                                    disabled={!tempArea}
                                    className={cn(
                                        "w-full h-15 rounded-2xl flex items-center justify-center text-[18px] font-semibold transition-all",
                                        tempArea ? "bg-[#00A082] text-white" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                    )}
                                >
                                    {t({ en: 'Save Location', fr: 'Enregistrer le lieu' })}
                                </button>
                            ) : step === 1 ? (
                                <div className="w-full">
                                    {subStep1 === 'location' && (
                                        <button
                                            onClick={() => setSubStep1('size')}
                                            disabled={!currentCity || !currentArea}
                                            className={cn(
                                                "w-full h-14 rounded-full text-[19px] font-semibold active:scale-95 transition-all text-white mb-1  [#00A082]/10",
                                                currentCity && currentArea ? "bg-[#00A082]" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                            )}
                                        >
                                            {t({ en: 'Next', fr: 'Suivant' })}
                                        </button>
                                    )}

                                    {subStep1 === 'size' && (
                                        <div className="flex gap-2 w-full">
                                            <button
                                                onClick={() => setSubStep1('location')}
                                                className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 text-neutral-600 active:scale-95 transition-transform"
                                            >
                                                <ChevronLeft strokeWidth={2.5} size={22} />
                                            </button>
                                            <button
                                                onClick={() => setSubStep1('description')}
                                                disabled={!taskSize}
                                                className={cn(
                                                    "flex-1 h-14 rounded-full text-[19px] font-semibold active:scale-95 transition-all text-white mb-1  [#00A082]/10",
                                                    taskSize ? "bg-[#00A082]" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                                )}
                                            >
                                                {t({ en: 'Next', fr: 'Suivant' })}
                                            </button>
                                        </div>
                                    )}

                                    {subStep1 === 'description' && (
                                        <div className="flex gap-2 w-full">
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
                                                    "flex-1 h-14 rounded-full text-[19px] font-semibold active:scale-95 transition-all text-white mb-1  [#00A082]/10",
                                                    description.trim() ? "bg-[#00A082]" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                                )}
                                            >
                                                {t({ en: 'Find Bricolers', fr: 'Rechercher des Pros' })}
                                            </button>
                                        </div>
                                    )}
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
                                        {t({ en: 'Next Step', fr: 'Étape suivante' })}
                                    </button>
                                </div>
                            ) : (
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
                                                {t({ en: 'Program Mission', fr: 'Programmer la mission' })}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <BricolerProfileModal
                        isOpen={!!viewedBricoler}
                        bricoler={viewedBricoler!}
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
                </motion.div>
            </motion.div>
        </AnimatePresence >
    );
};

export default OrderSubmissionFlow;
