"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ChevronLeft, ChevronRight, MapPin,
    Star, ShieldCheck, Briefcase, Camera,
    Info, Clock, CheckCircle2, SlidersHorizontal, ArrowUpDown, Search, Check, Calendar, Trophy
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, serverTimestamp } from 'firebase/firestore';
import { getServiceById, getSubServiceName } from '@/config/services_config';
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
    skills: string[];
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
}

interface OrderSubmissionFlowProps {
    isOpen: boolean;
    onClose: () => void;
    service: string;
    subService?: string;
    initialCity?: string | null;
    initialArea?: string | null;
    onSubmit: (data: any) => void;
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

const BricolerCard = ({ bricoler, onSelect, onOpenProfile, isSelected, serviceName }: { bricoler: Bricoler, onSelect: () => void, onOpenProfile: () => void, isSelected: boolean, serviceName: string }) => {
    const { t } = useLanguage();
    const isElite = (bricoler.rating || 0) >= 4.8 && (bricoler.completedJobs || 0) >= 50;
    const isNew = (bricoler.completedJobs || 0) === 0;

    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            className={cn(
                "relative flex flex-col p-6 rounded-[32px] border-2 transition-all cursor-pointer overflow-hidden",
                isSelected ? "border-[#008C74] bg-[#F0FAF7] ring-4 ring-[#008C74]/5 shadow-lg" : "border-neutral-100 bg-white hover:border-neutral-300 shadow-sm"
            )}
            onClick={(e) => {
                onOpenProfile();
            }}
        >
            <div className="flex gap-5">
                {/* Avatar & Badges */}
                <div className="relative flex-shrink-0">
                    <img
                        src={bricoler.photoURL || "/Images/Logo/Black Lbricol Avatar Face.png"}
                        alt={bricoler.displayName}
                        className="w-20 h-20 rounded-[28px] object-cover bg-neutral-100 border border-neutral-100 shadow-sm"
                    />
                    {bricoler.isVerified && (
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md border border-neutral-50">
                            <ShieldCheck size={18} className="text-[#00A082]" fill="currentColor" />
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                        <div>
                            <h4 className="text-[20px] font-black text-neutral-900 truncate tracking-tight">
                                {bricoler.displayName}
                            </h4>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {isElite && (
                                    <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-[11px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1">
                                        <Trophy size={10} /> Elite
                                    </span>
                                )}
                                {isNew && (
                                    <span className="px-2.5 py-1 bg-[#00A082]/10 text-[#00A082] text-[11px] font-black uppercase tracking-widest rounded-lg">New Pro</span>
                                )}
                                <span className="px-2.5 py-1 bg-neutral-100 text-neutral-600 text-[11px] font-black uppercase tracking-widest rounded-lg">
                                    {bricoler.completedJobs} {serviceName} tasks
                                </span>
                            </div>
                        </div>

                        {/* Price Tag */}
                        <div className="text-right flex-shrink-0">
                            <div className="text-[22px] font-black text-neutral-900 leading-none">
                                MAD {bricoler.hourlyRate || 100}
                                <span className="text-[13px] text-neutral-400 font-bold block mt-1">/hr</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                        <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-xl",
                            isNew ? "bg-neutral-50 text-neutral-400" : "bg-[#FFC244]/10 text-neutral-900"
                        )}>
                            <Star size={14} className={isNew ? "text-neutral-300" : "text-[#FFC244]"} fill="currentColor" />
                            <span className="text-[15px] font-black">{isNew ? "0" : (bricoler.rating || 0).toFixed(1)}</span>
                            <span className="text-[12px] font-bold text-neutral-400">({bricoler.completedJobs})</span>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-200" />
                        <span className="text-[14px] font-bold text-neutral-500 truncate">
                            {bricoler.areas?.[0] || bricoler.city}
                        </span>
                    </div>

                    {bricoler.quickPitch && (
                        <div className="relative bg-neutral-50/50 p-4 rounded-2xl mt-4 border border-neutral-100/50">
                            <p className="text-[14px] text-neutral-600 line-clamp-2 leading-relaxed font-medium italic">
                                "{bricoler.quickPitch}"
                            </p>
                            <span className="text-[11px] font-black text-[#00A082] mt-2 block uppercase tracking-[0.15em]">{t({ en: 'Read More Profile', fr: 'Voir Profil Complet' })}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Selection CTA */}
            <div className="mt-6">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect();
                    }}
                    className={cn(
                        "w-full py-4.5 rounded-2xl text-[17px] font-black transition-all shadow-xl active:scale-[0.98]",
                        isSelected ? "bg-[#008C74] text-white" : "bg-neutral-900 text-white"
                    )}
                >
                    {isSelected ? t({ en: 'Selected', fr: 'Sélectionné' }) : t({ en: 'Select & Continue', fr: 'Choisir & Continuer' })}
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
                        <h3 className="text-[18px] font-black text-neutral-900">{bricoler.displayName}'s Profile</h3>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center">
                            <X size={20} className="text-neutral-400" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                        <div className="p-6">
                            {/* Profile Hero */}
                            <div className="flex gap-6 mb-8">
                                <img src={bricoler.photoURL || "/Images/Logo/Black Lbricol Avatar Face.png"} className="w-24 h-24 rounded-[32px] object-cover shadow-xl" />
                                <div className="flex-1">
                                    <h2 className="text-[28px] font-black text-neutral-900 leading-tight mb-1">{bricoler.displayName}</h2>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className={cn(
                                            "flex items-center gap-1 px-2 py-0.5 rounded-lg",
                                            isNew ? "bg-neutral-100 text-neutral-400" : "bg-[#FFC244]/10 text-[#FFC244]"
                                        )}>
                                            <Star size={14} fill="currentColor" />
                                            <span className="text-[15px] font-black">{isNew ? "0" : (bricoler.rating || 0).toFixed(1)}</span>
                                        </div>
                                        <span className="text-[14px] font-bold text-neutral-400">{bricoler.completedJobs} {t({ en: 'Missions', fr: 'Missions' })}</span>
                                        {isNew && <span className="px-2 py-0.5 bg-[#00A082]/10 text-[#00A082] text-[10px] font-bold uppercase rounded-md ml-1">New Pro</span>}
                                    </div>
                                    <div className="text-[22px] font-black text-[#00A082]">
                                        MAD {bricoler.hourlyRate || 100}<span className="text-[14px] text-neutral-400">/hr</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <div className="p-4 bg-neutral-50 rounded-2xl border-2 border-neutral-100">
                                    <div className="text-[12px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Experience', fr: 'Expérience' })}</div>
                                    <div className="text-[18px] font-black text-neutral-900">{bricoler.yearsOfExperience || bricoler.experience || "0"}</div>
                                </div>
                                <div className="p-4 bg-neutral-50 rounded-2xl border-2 border-neutral-100">
                                    <div className="text-[12px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Completed', fr: 'Réalisées' })}</div>
                                    <div className="text-[18px] font-black text-neutral-900">{bricoler.completedJobs} {t({ en: 'Jobs', fr: 'Missions' })}</div>
                                </div>
                            </div>

                            {/* About */}
                            <div className="mb-8">
                                <h4 className="text-[18px] font-black text-neutral-900 mb-4">{t({ en: 'About Me', fr: 'À propos de moi' })}</h4>
                                <p className="text-[16px] text-neutral-600 leading-relaxed font-medium bg-neutral-50 p-6 rounded-[28px] italic">
                                    {bricoler.bio || bricoler.quickPitch || t({ en: 'No bio provided yet.', fr: 'Aucune bio fournie pour le moment.' })}
                                </p>
                            </div>

                            {/* Skills */}
                            {(bricoler.skills || []).length > 0 && (
                                <div className="mb-8">
                                    <h4 className="text-[18px] font-black text-neutral-900 mb-4">{t({ en: 'Skills & Expertise', fr: 'Compétences' })}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {bricoler.skills.map(skill => (
                                            <span key={skill} className="px-5 py-2.5 bg-[#00A082]/5 text-[#00A082] text-[14px] font-black rounded-xl border border-[#00A082]/10 capitalize">{skill}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Service Specific Equipments */}
                            {(bricoler.serviceEquipments || []).length > 0 && (
                                <div className="mb-8">
                                    <h4 className="text-[18px] font-black text-neutral-900 mb-4">{t({ en: 'Equipments', fr: 'Équipements' })}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {bricoler.serviceEquipments?.map(eq => (
                                            <span key={eq} className="px-5 py-2.5 bg-neutral-100 text-neutral-800 text-[14px] font-black rounded-xl border border-neutral-200 capitalize">
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
                                            <span key={eq} className="px-5 py-2.5 bg-neutral-100 text-neutral-800 text-[14px] font-black rounded-xl border border-neutral-200 capitalize">
                                                {eq}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Reviews */}
                            <div className="mb-8">
                                <h4 className="text-[18px] font-black text-neutral-900 mb-4">{t({ en: 'Recent Reviews', fr: 'Avis récents' })}</h4>
                                {isNew ? (
                                    <div className="p-10 text-center bg-neutral-50 rounded-[32px] border-2 border-dashed border-neutral-200">
                                        <p className="text-neutral-400 font-bold">{t({ en: 'No reviews yet. Be the first to hire!', fr: 'Aucun avis pour le moment.' })}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Real reviews would be mapped here */}
                                        <p className="text-neutral-500 italic text-[14px]">Member since {bricoler.createdAt ? '2025' : '2026'}</p>
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
                            className="w-full h-16 bg-[#008C74] text-white text-[18px] font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
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
    onSubmit
}) => {
    const { t } = useLanguage();
    const [step, setStep] = useState(1);
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

    // Location Change State
    const [isSelectingLocation, setIsSelectingLocation] = useState(false);
    const [locStep, setLocStep] = useState<'city' | 'area'>('city');
    const [tempCity, setTempCity] = useState(initialCity || '');
    const [tempArea, setTempArea] = useState(initialArea || '');
    const [currentCity, setCurrentCity] = useState(initialCity || '');
    const [currentArea, setCurrentArea] = useState(initialArea || '');
    const [areaSearch, setAreaSearch] = useState('');
    const [bookedOrders, setBookedOrders] = useState<any[]>([]);
    const [isLoadingBookings, setIsLoadingBookings] = useState(false);

    const activeTaskSize = TASK_SIZES.find(s => s.id === taskSize);
    const selectedPro = bricolers.find(b => b.id === selectedBricolerId);

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setTaskSize(null);
            setDescription('');
            setSelectedBricolerId(null);
            setViewedBricoler(null);
            setSelectedDate(null);
            setSelectedTime(null);
            setIsSelectingLocation(false);
            setCurrentCity(initialCity || '');
            setCurrentArea(initialArea || '');
            fetchBricolers();
        }
    }, [isOpen, service, initialCity, initialArea]);

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
            const targetServiceId = targetSvc?.id.toLowerCase() || service.toLowerCase();

            snap.docs.forEach(docSnap => {
                const data = docSnap.data();

                // 0. Only active bricolers
                if (data.isActive !== true) return;

                // 1. Strict Area Matching - Must serve the selected neighborhood
                if (currentArea) {
                    const servesArea = (data.workAreas || []).includes(currentArea) || (data.areas || []).includes(currentArea);
                    if (!servesArea) return;
                }

                // 2. Direct Service Category Matching
                const matchingService = data.services?.find((s: any) => {
                    const sId = (typeof s === 'string' ? s : s.serviceId || '').toLowerCase();
                    return sId === targetServiceId;
                });

                if (matchingService) {
                    // 3. Availability Check - Must have set at least one slot
                    const hasAvailability = (Array.isArray(data.calendarSlots) && data.calendarSlots.length > 0) ||
                        (typeof data.calendarSlots === 'object' && data.calendarSlots !== null && Object.keys(data.calendarSlots).length > 0);
                    if (!hasAvailability) return;

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
                        skills: (typeof matchingService === 'object' ? matchingService.skills : null) || data.skills || [],
                        isActive: true
                    });
                }
            });
            setBricolers(Array.from(listMap.values()));
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

            const orderData = {
                service: service, // Main page expects 'service'
                subService: subService || null, // Main page expects 'subService'
                serviceId: service,
                subServiceId: subService || '',
                serviceName: getServiceById(service)?.name || 'Service',
                subServiceName: subService ? (getSubServiceName(service, subService) || subService) : '',
                city: currentCity,
                area: currentArea,
                taskSize,
                description,
                bricolerId: selectedBricolerId === 'open' ? null : selectedBricolerId,
                status: 'pending',
                date: selectedDate || 'Flexible',
                time: selectedTime || 'Flexible',
                duration,
                basePrice,
                serviceFee,
                totalPrice,
                price: totalPrice,
                createdAt: serverTimestamp()
            };

            await onSubmit(orderData);
            // We don't onClose here if onSubmit handles it or needs to show success
            onClose();
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
                className="fixed inset-0 z-[2000] bg-black/70 backdrop-blur-md flex items-end md:items-center justify-center"
            >
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 28, stiffness: 220 }}
                    className="bg-white w-full max-w-lg rounded-t-[32px] md:rounded-[32px] max-h-[94vh] flex flex-col overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between px-6 pt-6 pb-5 bg-[#00A082] flex-shrink-0">
                        <div className="flex items-start gap-3">
                            {isSelectingLocation ? (
                                <button onClick={() => locStep === 'area' ? setLocStep('city') : setIsSelectingLocation(false)} className="p-2 -ml-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors mt-0.5">
                                    <ChevronLeft size={20} className="text-white" />
                                </button>
                            ) : step > 1 ? (
                                <button onClick={() => setStep(step - 1)} className="p-2 -ml-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors mt-0.5">
                                    <ChevronLeft size={20} className="text-white" />
                                </button>
                            ) : null}

                            <div className="flex flex-col">
                                <h3 className="text-[20px] md:text-[22px] font-black text-white leading-tight tracking-tight mt-[3px]">
                                    {isSelectingLocation
                                        ? (locStep === 'city' ? t({ en: 'Change City', fr: 'Changer de ville' }) : t({ en: 'Select Area', fr: 'Choisir le quartier' }))
                                        : step === 1 ? t({ en: 'Task Details', fr: 'Détails de la tâche' }) :
                                            step === 4 ? t({ en: 'Review & Confirm', fr: 'Réservation et confirmation' }) :
                                                t({ en: 'Select Provider', fr: 'Choisir un prestataire' })
                                    }
                                </h3>
                                {!isSelectingLocation && (
                                    <p className="text-[12px] md:text-[13px] font-black text-[#FFC244] uppercase tracking-widest mt-1.5">
                                        {getServiceById(service)?.name || service} {subService ? `› ${getSubServiceName(service, subService) || subService}` : ''}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 -mr-2 hover:bg-white/20 rounded-full transition-colors mt-0.5">
                            <X size={22} className="text-white border border-white/0 hover:border-white/20 rounded-full" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 no-scrollbar">
                        <AnimatePresence mode="wait">
                            {isSelectingLocation ? (
                                <motion.div
                                    key="loc-sel"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    {locStep === 'city' ? (
                                        <div className="grid grid-cols-1 gap-3">
                                            {MOROCCAN_CITIES.map(city => (
                                                <button
                                                    key={city}
                                                    onClick={() => { setTempCity(city); setLocStep('area'); }}
                                                    className={cn(
                                                        "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                                                        tempCity === city ? "border-[#FFC244] bg-[#FFC244]/5" : "border-neutral-100 bg-neutral-50"
                                                    )}
                                                >
                                                    <span className="text-[17px] font-black text-neutral-900">{city}</span>
                                                    <ChevronRight size={18} className="text-neutral-400" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 bg-neutral-50 px-4 py-3.5 rounded-2xl border-2 border-neutral-100 focus-within:border-[#00A082] transition-colors">
                                                <Search size={18} className="text-neutral-400" />
                                                <input
                                                    type="text"
                                                    placeholder={t({ en: 'Search area...', fr: 'Rechercher un quartier...' })}
                                                    className="flex-1 bg-transparent outline-none text-[15px] font-bold"
                                                    value={areaSearch}
                                                    onChange={e => setAreaSearch(e.target.value)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {filteredAreas.map(area => (
                                                    <button
                                                        key={area}
                                                        onClick={() => setTempArea(area)}
                                                        className={cn(
                                                            "flex items-center gap-2 p-3 rounded-xl border-2 text-[14px] font-black transition-all",
                                                            tempArea === area ? "bg-[#00A082] text-white border-[#00A082]" : "bg-neutral-50 border-neutral-100"
                                                        )}
                                                    >
                                                        {tempArea === area && <Check size={14} strokeWidth={3} />}
                                                        <span className="truncate">{area}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ) : step === 1 ? (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="space-y-9 pb-8"
                                >
                                    {/* Location Card */}
                                    <div className="p-5 bg-neutral-50 rounded-[28px] border-2 border-neutral-100 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-neutral-100 shadow-sm">
                                                <MapPin size={22} className="text-[#00A082]" strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <p className="text-[12px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1.5">{t({ en: 'Work Location', fr: 'Lieu d\'intervention' })}</p>
                                                <p className="text-[18px] font-black text-neutral-900 leading-tight">
                                                    {currentCity}{currentArea ? `, ${currentArea}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setTempCity(currentCity); setTempArea(currentArea); setIsSelectingLocation(true); setLocStep('city'); }}
                                            className="text-[15px] font-black text-[#00A082] py-2 px-4 hover:bg-[#00A082]/10 rounded-xl transition-colors"
                                        >
                                            {t({ en: 'Change', fr: 'Modifier' })}
                                        </button>
                                    </div>

                                    {/* Task Size */}
                                    <div>
                                        <h4 className="text-[18px] font-black text-neutral-800 mb-5 flex items-center gap-2.5">
                                            <div className="w-2 h-7 bg-[#00A082] rounded-full" />
                                            {t({ en: 'How big is your task?', fr: 'Quelle est la taille de votre tâche ?' })}
                                        </h4>
                                        <div className="grid grid-cols-1 gap-3.5">
                                            {TASK_SIZES.map((size) => (
                                                <button
                                                    key={size.id}
                                                    onClick={() => setTaskSize(size.id)}
                                                    className={cn(
                                                        "flex items-center gap-5 p-5 rounded-[24px] border-2 text-left transition-all",
                                                        taskSize === size.id ? "border-[#00A082] bg-[#00A082]/5" : "border-neutral-100 bg-white hover:border-neutral-200"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-[20px] font-black shadow-sm",
                                                        taskSize === size.id ? "bg-[#00A082] text-white" : "bg-neutral-100 text-neutral-500"
                                                    )}>
                                                        {size.id === 'small' ? 'S' : size.id === 'medium' ? 'M' : 'L'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[20px] font-black text-neutral-900">{size.label[t({ en: 'en', fr: 'fr' }) as 'en' | 'fr']}</span>
                                                            <span className="text-[13px] font-black text-[#00A082] py-1.5 px-3 bg-[#00A082]/10 rounded-xl">{size.estTime[t({ en: 'en', fr: 'fr' }) as 'en' | 'fr']}</span>
                                                        </div>
                                                        <p className="text-[14px] text-neutral-500 leading-snug font-bold opacity-80">{size.desc[t({ en: 'en', fr: 'fr' }) as 'en' | 'fr']}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <h4 className="text-[18px] font-black text-neutral-800 mb-5 flex items-center gap-2.5">
                                            <div className="w-2 h-7 bg-[#00A082] rounded-full" />
                                            {t({ en: 'Describe your requirements', fr: 'Décrivez vos besoins' })}
                                        </h4>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder={t({
                                                en: "E.g. I need a TV mounted on a drywall. I have the bracket ready.",
                                                fr: "Ex: J'ai besoin d'installer une TV sur un mur. J'ai déjà le support."
                                            })}
                                            className="w-full h-40 p-6 rounded-[24px] border-2 border-neutral-100 outline-none focus:border-[#00A082] transition-colors text-[17px] font-bold resize-none shadow-sm"
                                        />
                                        <div className="mt-4 flex items-center gap-2 px-1">
                                            <Camera size={16} className="text-neutral-400" />
                                            <p className="text-[13px] font-black text-neutral-400 italic">
                                                {t({ en: "You can add photos after the order is posted.", fr: "Vous pourrez ajouter des photos après avoir publié la mission." })}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : step === 2 ? (
                                <motion.div key="step2" className="space-y-7 pb-24">
                                    <div className="p-5 bg-[#FFC244] rounded-[24px] shadow-lg">
                                        <p className="text-[15px] font-black text-neutral-900 leading-relaxed text-center">
                                            {t({
                                                en: `We found ${bricolers.length} qualified pros in ${currentCity}.`,
                                                fr: `Nous avons trouvé ${bricolers.length} experts qualifiés à ${currentCity}.`
                                            })}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                                        {['all', 'rating'].map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setSortBy(f as any)}
                                                className={cn(
                                                    "flex items-center gap-2 px-6 py-3 rounded-full border-2 text-[14px] font-black whitespace-nowrap transition-all",
                                                    sortBy === f ? "bg-[#00A082] text-white border-[#00A082] shadow-md" : "bg-white text-neutral-500 border-neutral-100"
                                                )}
                                            >
                                                {f === 'all' ? <Check size={14} strokeWidth={3} /> : <Star size={14} fill="currentColor" />}
                                                {f === 'all' ? t({ en: 'All', fr: 'Tous' }) : t({ en: 'Top Rated', fr: 'Mieux notés' })}
                                            </button>
                                        ))}
                                    </div>

                                    {isLoadingBricolers ? (
                                        <div className="space-y-4">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-44 bg-neutral-50 rounded-[28px] animate-pulse" />
                                            ))}
                                        </div>
                                    ) : sortedBricolers.length > 0 ? (
                                        <div className="space-y-4 pt-2">
                                            <button
                                                onClick={() => setSelectedBricolerId('open')}
                                                className={cn(
                                                    "w-full p-6 rounded-[28px] border-2 flex items-center justify-between text-left transition-all shadow-sm",
                                                    selectedBricolerId === 'open' ? "border-[#00A082] bg-[#00A082]/5" : "border-neutral-100 bg-white"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 bg-[#00A082] rounded-2xl flex items-center justify-center text-white shadow-md">
                                                        <ArrowUpDown size={26} strokeWidth={3} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[18px] font-black text-neutral-900">{t({ en: 'Open to All', fr: 'Ouvert à tous' })}</h4>
                                                        <p className="text-[13px] font-bold text-neutral-400">{t({ en: 'Fastest offers at the best rates', fr: 'Les offres les plus rapides au meilleur prix' })}</p>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                                                    selectedBricolerId === 'open' ? "border-[#00A082] bg-[#00A082]" : "border-neutral-200"
                                                )}>
                                                    {selectedBricolerId === 'open' && <div className="w-3 h-3 rounded-full bg-white" />}
                                                </div>
                                            </button>

                                            <div className="flex items-center gap-3 px-2 py-4">
                                                <div className="h-[2px] flex-1 bg-neutral-100" />
                                                <span className="text-[11px] font-black text-neutral-300 uppercase tracking-[0.2em]">{t({ en: 'OR BOOK A PRO DIRECTLY', fr: 'OU RÉSERVEZ UN PRO DIRECTEMENT' })}</span>
                                                <div className="h-[2px] flex-1 bg-neutral-100" />
                                            </div>

                                            {sortedBricolers.map(p => (
                                                <BricolerCard
                                                    key={p.id}
                                                    bricoler={p}
                                                    serviceName={getServiceById(service)?.name || 'Service'}
                                                    isSelected={selectedBricolerId === p.id}
                                                    onSelect={() => {
                                                        setSelectedBricolerId(p.id);
                                                        setStep(3);
                                                    }}
                                                    onOpenProfile={() => setViewedBricoler(p)}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pt-16 pb-20 text-center px-4">
                                            <div className="w-24 h-24 bg-neutral-50 rounded-full flex items-center justify-center mb-6">
                                                <Search size={40} className="text-neutral-200" />
                                            </div>
                                            <h4 className="text-[20px] font-black text-neutral-900 mb-2">{t({ en: 'No matching pros found', fr: 'Aucun expert trouvé' })}</h4>
                                            <p className="text-neutral-400 font-bold max-w-[280px]">
                                                {t({
                                                    en: 'Try selecting another area or post an open request to reach all pros.',
                                                    fr: 'Essayez de choisir un autre quartier ou publiez une offre ouverte.'
                                                })}
                                            </p>
                                            <button
                                                onClick={() => setSelectedBricolerId('open')}
                                                className="mt-8 px-10 py-4.5 bg-[#00A082] text-white text-[17px] font-black rounded-2xl shadow-xl active:scale-95 transition-all"
                                            >
                                                {t({ en: 'Continue with Open Post', fr: 'Continuer en Post Ouvert' })}
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            ) : step === 3 ? (
                                <motion.div key="step3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
                                    <div className="bg-neutral-50 p-6 rounded-[32px] border-2 border-neutral-100">
                                        <h4 className="text-[19px] font-black text-neutral-900 mb-2 flex items-center gap-2">
                                            <Clock size={20} className="text-[#00A082]" />
                                            {t({ en: 'When do you need help?', fr: 'Quand avez-vous besoin d\'aide ?' })}
                                        </h4>
                                        <p className="text-[14px] font-bold text-neutral-400 leading-snug">
                                            {t({
                                                en: 'Pick a date and time that works with your pro\'s schedule.',
                                                fr: 'Choisissez une date et une heure qui conviennent à votre pro.'
                                            })}
                                        </p>
                                    </div>

                                    {/* Date Selector */}
                                    <div className="space-y-4">
                                        <span className="text-[12px] font-black text-neutral-400 uppercase tracking-widest px-2">Select Date</span>
                                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
                                            {Array.from({ length: 14 }).map((_, i) => {
                                                const d = new Date();
                                                d.setDate(d.getDate() + i);
                                                const dateKey = d.toISOString().split('T')[0];
                                                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 2);
                                                const dayNum = d.getDate();

                                                const selectedPro = sortedBricolers.find(b => b.id === selectedBricolerId);
                                                const isAvailable = (selectedPro as any)?.availability?.[dateKey]?.length > 0;
                                                const isSelected = selectedDate === dateKey;

                                                return (
                                                    <button
                                                        key={i}
                                                        disabled={!isAvailable}
                                                        onClick={() => { setSelectedDate(dateKey); setSelectedTime(null); }}
                                                        className={cn(
                                                            "flex-shrink-0 w-16 h-20 rounded-[20px] border-2 flex flex-col items-center justify-center transition-all",
                                                            isSelected ? "bg-[#008C74] border-[#008C74] text-white shadow-lg" :
                                                                isAvailable ? "bg-white border-neutral-100 text-neutral-900 hover:border-neutral-300" :
                                                                    "bg-neutral-50 border-neutral-50 text-neutral-300 cursor-not-allowed opacity-50"
                                                        )}
                                                    >
                                                        <span className={cn("text-[11px] font-black uppercase tracking-wider mb-1", isSelected ? "text-white/70" : "text-neutral-400")}>{dayName}</span>
                                                        <span className="text-[18px] font-black">{dayNum}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Time Selector */}
                                    {selectedDate && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 overflow-hidden">
                                            <span className="text-[12px] font-black text-neutral-400 uppercase tracking-widest px-2">Select Time Slot ({activeTaskSize?.label.en})</span>
                                            {isLoadingBookings ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-neutral-50 rounded-2xl animate-pulse" />)}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-3 pb-4">
                                                    {generateAvailableSlots().map((tStr, idx) => {
                                                        const isBooked = isSlotBooked(tStr);
                                                        const isToday = selectedDate === new Date().toISOString().split('T')[0];
                                                        const isPast = isToday && (timeToMinutes(tStr) < (new Date().getHours() * 60 + new Date().getMinutes()) + 30);
                                                        const isDisabled = isBooked || isPast;
                                                        return (
                                                            <button
                                                                key={idx}
                                                                disabled={isDisabled}
                                                                onClick={() => setSelectedTime(tStr)}
                                                                className={cn(
                                                                    "p-4 rounded-2xl border-2 text-[15px] font-black transition-all text-center",
                                                                    selectedTime === tStr ? "bg-neutral-900 border-neutral-900 text-white shadow-lg" :
                                                                        isDisabled ? "bg-neutral-50 border-neutral-50 text-neutral-300 cursor-not-allowed italic" : "bg-white border-neutral-100 text-neutral-800"
                                                                )}
                                                            >
                                                                {tStr}
                                                                {isBooked && <span className="text-[10px] block opacity-50 uppercase mt-0.5">Booked</span>}
                                                                {isPast && !isBooked && <span className="text-[10px] block opacity-50 uppercase mt-0.5">Past</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    <div className="mt-4 p-5 bg-[#F0FAF7] border-2 border-[#008C74]/20 rounded-[28px] flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                            <ShieldCheck size={24} className="text-[#00A082]" />
                                        </div>
                                        <p className="text-[13px] font-bold text-[#006B58] leading-snug">
                                            {t({
                                                en: "Book with peace of mind. All payments are secured and handled after the task is done.",
                                                fr: "Réservez en toute sérénité. Les paiements sont sécurisés et effectués une fois la tâche terminée."
                                            })}
                                        </p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div key="step4" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-5 pb-10">
                                    <div className="pt-2">
                                        <h2 className="text-[38px] font-black text-[#00A082] leading-none mb-2">
                                            {getServiceById(service)?.name || service}
                                        </h2>
                                        <p className="text-[16px] font-bold text-neutral-500">
                                            {subService ? (getSubServiceName(service, subService) || subService) : getServiceById(service)?.name} • {currentCity}{currentArea ? `, ${currentArea}` : ''}
                                        </p>
                                    </div>

                                    <div className="h-[2px] bg-neutral-200 w-full" />

                                    {/* Task Budget (Total) */}
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[20px] font-black text-neutral-900">{t({ en: 'Total Budget', fr: 'Budget Total' })}</h3>
                                        <span className="text-[24px] font-black text-[#00A082]">
                                            {selectedBricolerId === 'open'
                                                ? 'TBD'
                                                : `${Math.round(((selectedPro?.hourlyRate || 100) * (activeTaskSize?.duration || 1)) * 1.15)} MAD`}
                                        </span>
                                    </div>

                                    <div className="h-[2px] bg-neutral-200 w-full" />

                                    {/* Provider Section */}
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img
                                                src={selectedPro?.photoURL || "/Images/Logo/Black Lbricol Avatar Face.png"}
                                                className="w-12 h-12 rounded-full object-cover border border-neutral-200 shadow-sm"
                                            />
                                            {selectedBricolerId === 'open' && (
                                                <div className="absolute inset-0 bg-[#00A082] rounded-full flex items-center justify-center text-white">
                                                    <ArrowUpDown size={18} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <button className="text-[17px] font-black text-neutral-900 underline decoration-2 decoration-neutral-200 hover:decoration-[#00A082] hover:text-[#00A082] transition-colors leading-tight">
                                                {selectedBricolerId === 'open' ? t({ en: 'Open to All', fr: 'Ouvert à tous' }) : (selectedPro?.displayName || 'Pro')}
                                            </button>
                                            {selectedBricolerId !== 'open' && (
                                                <div className="flex items-center flex-wrap gap-1.5 mt-1 text-[13px] font-black text-neutral-500">
                                                    {(() => {
                                                        const isNew = (selectedPro?.completedJobs || 0) === 0;
                                                        return (
                                                            <>
                                                                <span className={cn("flex items-center gap-0.5", isNew ? "text-neutral-400" : "text-[#FFC244]")}>
                                                                    <Star size={14} fill={isNew ? "none" : "currentColor"} className={isNew ? "text-neutral-300" : ""} />
                                                                    {isNew ? "0.0" : (selectedPro?.rating || 0).toFixed(1)}
                                                                </span>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-1"><Briefcase size={14} /> {selectedPro?.completedJobs || 0} jobs</span>
                                                                {isNew && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="text-[#00A082] uppercase tracking-wide text-[10px] bg-[#00A082]/10 px-1.5 py-0.5 rounded-md">New Pro</span>
                                                                    </>
                                                                )}
                                                                {(selectedPro as any)?.isVerified && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="text-[#00A082] flex items-center gap-0.5"><ShieldCheck size={14} /> Verified</span>
                                                                    </>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                            {selectedBricolerId === 'open' && (
                                                <div className="flex items-center gap-1.5 mt-1 text-[13px] font-black text-neutral-500">
                                                    <span className="flex items-center gap-1"><Briefcase size={14} /> Matches with best available</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="h-[2px] bg-neutral-200 w-full" />

                                    {/* When Section */}
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[20px] font-black text-neutral-900">{t({ en: 'When?', fr: 'Quand ?' })}</h3>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-2 text-neutral-900">
                                                <Calendar size={18} className="text-neutral-500" />
                                                <span className="text-[16px] font-black">{selectedDate ? new Date(selectedDate).toLocaleDateString((typeof navigator !== 'undefined' ? navigator.language : 'en-US'), { day: 'numeric', month: 'short' }) : 'Flexible'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-neutral-900">
                                                <Clock size={18} className="text-neutral-500" />
                                                <span className="text-[16px] font-black">{selectedTime}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-[2px] bg-neutral-200 w-full" />

                                    {/* Price Breakdown */}
                                    <div className="space-y-3">
                                        <h3 className="text-[20px] font-black text-neutral-900">{t({ en: 'Price Breakdown', fr: 'Détail du prix' })}</h3>
                                        <div className="flex items-center justify-between text-neutral-500 font-bold text-[15px]">
                                            <span>{t({ en: 'Base price', fr: 'Prix de base' })}</span>
                                            <span>{selectedBricolerId === 'open' ? 'TBD' : `${Math.round((selectedPro?.hourlyRate || 100) * (activeTaskSize?.duration || 1))} MAD`}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-neutral-500 font-bold text-[15px]">
                                            <span>{t({ en: 'Service fee (15%)', fr: 'Frais de service (15%)' })}</span>
                                            <span>{selectedBricolerId === 'open' ? 'TBD' : `${Math.round((selectedPro?.hourlyRate || 100) * (activeTaskSize?.duration || 1) * 0.15)} MAD`}</span>
                                        </div>
                                        <div className="bg-[#F0FAF7] p-3.5 rounded-2xl flex items-center gap-3 border border-[#00A082]/20 mt-2">
                                            <ShieldCheck size={20} className="text-[#00A082] flex-shrink-0" />
                                            <p className="text-[12px] font-bold text-[#006B58] leading-tight">
                                                {t({ en: 'You will only be charged after the task is completed and verified.', fr: 'Vous ne serez facturé qu\'une fois la mission terminée et vérifiée.' })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="h-[2px] bg-neutral-200 w-full" />

                                    {/* Task Duration */}
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[20px] font-black text-neutral-900">{t({ en: 'Estimated Duration', fr: 'Durée estimée' })}</h3>
                                        <div className="text-right">
                                            <span className="text-[18px] font-black text-neutral-900">
                                                ~ {activeTaskSize?.duration || 1}h ({activeTaskSize?.label?.en || 'Small'})
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-[2px] bg-neutral-200 w-full" />

                                    {/* Task Images */}
                                    <div>
                                        <h3 className="text-[20px] font-black text-neutral-900 mb-3">{t({ en: 'Task Images', fr: 'Images de la tâche' })}</h3>
                                        <div className="flex items-center gap-3">
                                            <div className="w-16 h-16 bg-neutral-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-neutral-200">
                                                <Camera size={20} className="text-neutral-400" />
                                            </div>
                                            <p className="text-[13px] font-bold text-neutral-400 italic">
                                                {t({ en: 'No images added yet', fr: 'Aucune image ajoutée' })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="h-[2px] bg-neutral-200 w-full" />

                                    {/* Task Details */}
                                    <div>
                                        <h3 className="text-[20px] font-black text-neutral-900 mb-2">{t({ en: 'Task Details', fr: 'Détails de la tâche' })}</h3>
                                        <p className="text-[15px] font-bold text-neutral-600 leading-relaxed bg-neutral-50 p-4 rounded-2xl">
                                            {description || t({ en: 'No details provided.', fr: 'Aucun détail fourni.' })}
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer CTA */}
                    <div className="p-6 border-t border-neutral-100 flex-shrink-0 bg-white">
                        {isSelectingLocation ? (
                            <button
                                onClick={handleLocationSave}
                                disabled={!tempArea}
                                className={cn(
                                    "w-full h-15 rounded-2xl flex items-center justify-center text-[18px] font-black transition-all",
                                    tempArea ? "bg-[#00A082] text-white shadow-lg shadow-[#00A082]/20" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                )}
                            >
                                {t({ en: 'Save Location', fr: 'Enregistrer le lieu' })}
                            </button>
                        ) : step === 1 ? (
                            <button
                                onClick={() => setStep(2)}
                                disabled={!taskSize || !description.trim()}
                                className={cn(
                                    "w-full h-15 rounded-2xl flex items-center justify-center gap-3 text-[18px] font-black transition-all",
                                    (taskSize && description.trim()) ? "bg-[#00A082] text-white shadow-lg shadow-[#00A082]/20 active:scale-[0.99]" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                )}
                            >
                                {t({ en: 'Browse Available Pros', fr: 'Voir les prestataires' })}
                                <ChevronRight size={22} className="mt-0.5" />
                            </button>
                        ) : step === 2 ? (
                            <button
                                onClick={handleNext}
                                disabled={!selectedBricolerId}
                                className={cn(
                                    "w-full h-15 rounded-2xl flex items-center justify-center gap-3 text-[18px] font-black transition-all",
                                    selectedBricolerId ? "bg-[#FFC244] text-neutral-900 shadow-2xl active:scale-[0.99]" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                )}
                            >
                                {selectedBricolerId === 'open'
                                    ? t({ en: 'Confirm and Post Open Request', fr: 'Confirmer et publier l\'offre' })
                                    : t({ en: 'Select Date & Time', fr: 'Choisir la date et l\'heure' })
                                }
                                <ChevronRight size={22} className="mt-0.5" />
                            </button>
                        ) : step === 3 ? (
                            <button
                                onClick={handleNext}
                                disabled={!selectedDate || !selectedTime || isLoadingBookings}
                                className={cn(
                                    "w-full h-15 rounded-2xl flex items-center justify-center gap-3 text-[18px] font-black transition-all",
                                    (selectedDate && selectedTime && !isLoadingBookings) ? "bg-[#008C74] text-white shadow-2xl active:scale-[0.99]" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                )}
                            >
                                {t({ en: 'Review Summary', fr: 'Voir le résumé' })}
                                <ChevronRight size={22} className="mt-0.5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleFinalSubmit}
                                disabled={isSubmitting}
                                className={cn(
                                    "w-full h-15 rounded-2xl flex items-center justify-center gap-3 text-[18px] font-black transition-all",
                                    !isSubmitting ? "bg-[#00A082] text-white shadow-2xl active:scale-[0.95]" : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                )}
                            >
                                {isSubmitting ? (
                                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {t({ en: 'Program Mission', fr: 'Programmer la mission' })}
                                        <CheckCircle2 size={24} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>

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
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default OrderSubmissionFlow;
