"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clock, Calendar, ChevronLeft, X, CheckCircle2 } from 'lucide-react';
import { WhatsAppBrandIcon } from '@/components/shared/WhatsAppIcon';
import { useLanguage } from '@/context/LanguageContext';
import {
    collection,
    doc,
    getDoc,
    serverTimestamp,
    addDoc
} from 'firebase/firestore';
import { ref, uploadBytes as uploadStorageBytes, getDownloadURL as getStorageDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '@/lib/firebase';
import { getServiceById, getSubServiceName, SERVICES_HIERARCHY, getServiceVector } from '@/config/services_config';
import { OrderDetails } from '@/features/orders/components/OrderCard';
import { cn } from '@/lib/utils';
import { isImageDataUrl } from '@/lib/imageCompression';
import { Banknote, Info, Wrench, Upload, Search, Check, Trash2 } from 'lucide-react';

interface HeroesViewProps {
    orders: OrderDetails[];
}

interface HeroData {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
    jobsCount?: number;
    services: string[]; // Services the hero has provided to this client
}

const TASK_SIZES = [
    {
        id: 'small',
        duration: 1,
        label: { en: 'Small', fr: 'Petit', ar: 'صغير' },
        estTime: { en: 'Est: 1 hr', fr: 'Est: 1h', ar: 'المدة: 1 ساعة' },
        desc: {
            en: 'Minor repairs, single item fix, or quick task.',
            fr: 'Petites réparations, fixation d\'un seul article ou tâche rapide.',
            ar: 'إصلاحات بسيطة، إصلاح عنصر واحد، أو مهمة سريعة.'
        }
    },
    {
        id: 'medium',
        duration: 2,
        label: { en: 'Medium', fr: 'Moyen', ar: 'متوسط' },
        estTime: { en: 'Est: 2-3 hrs', fr: 'Est: 2-3h', ar: 'المدة: 2-3 ساعات' },
        desc: {
            en: 'Several repairs, assembling multiple items, or larger maintenance.',
            fr: 'Plusieurs réparations, assemblage de plusieurs articles ou maintenance plus importante.',
            ar: 'عدة إصلاحات، تركيب عدة عناصر، أو صيانة أكبر.'
        }
    },
    {
        id: 'large',
        duration: 4,
        label: { en: 'Large', fr: 'Grand', ar: 'كبير' },
        estTime: { en: 'Est: 4+ hrs', fr: 'Est: 4h+', ar: 'المدة: 4+ ساعات' },
        desc: {
            en: 'Extensive work, painting a room, or full day help.',
            fr: 'Travaux importants, peinture d\'une pièce ou aide d\'une journée entière.',
            ar: 'عمل كبير، طلاء غرفة، أو مساعدة ليوم كامل.'
        }
    }
];

export default function HeroesView({ orders }: HeroesViewProps) {
    const { t } = useLanguage();
    const [selectedHero, setSelectedHero] = useState<HeroData | null>(null);
    const [bookingStep, setBookingStep] = useState(0); // 0 = none, 1 = date/time, 2 = service/subservice, 3 = size/desc, 4 = confirm

    // Booking state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [heroProfile, setHeroProfile] = useState<any>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [selectedService, setSelectedService] = useState<string>('');
    const [selectedSubService, setSelectedSubService] = useState<string>('');
    const [taskSize, setTaskSize] = useState<string>('small');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
    const [bankReceipt, setBankReceipt] = useState<string | null>(null);
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

    // PERSISTENCE: Allow removing heroes
    const [removedHeroIds, setRemovedHeroIds] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            try {
                return JSON.parse(localStorage.getItem('removedHeroIds') || '[]');
            } catch (e) { return []; }
        }
        return [];
    });

    const handleRemoveHero = (heroId: string) => {
        const updated = [...removedHeroIds, heroId];
        setRemovedHeroIds(updated);
        localStorage.setItem('removedHeroIds', JSON.stringify(updated));
    };

    const isStep1Valid = !!(selectedDate && selectedTime);
    const isStep2Valid = !!selectedService;
    const isStep3Valid = taskSize && description.trim().length > 0;

    // Extract unique heroes from previous done orders
    const heroes = useMemo(() => {
        const doneOrders = orders.filter(o => o.status === 'done' && o.bricolerId && o.bricolerName);
        const map = new Map<string, HeroData>();

        doneOrders.forEach(o => {
            const hid = o.bricolerId as string;
            if (!map.has(hid)) {
                map.set(hid, {
                    id: hid,
                    name: o.bricolerName!,
                    avatar: o.bricolerAvatar,
                    rating: o.bricolerRating || 0, // No longer defaulting to 5.0 if not rated
                    jobsCount: o.bricolerJobsCount || 0, // Ensuring honest jobs count too
                    services: [o.service]
                });
            } else {
                const existing = map.get(hid)!;
                if (!existing.services.includes(o.service)) {
                    existing.services.push(o.service);
                }
            }
        });

        return Array.from(map.values()).filter(h => !removedHeroIds.includes(h.id));
    }, [orders, removedHeroIds]);

    const [liveHeroStats, setLiveHeroStats] = useState<Record<string, { rating: number, jobsCount: number }>>({});

    useEffect(() => {
        const fetchLiveStats = async () => {
            const uniqueIds = Array.from(new Set(orders.filter(o => o.bricolerId).map(o => o.bricolerId!)));
            if (uniqueIds.length === 0) return;

            const newData: Record<string, { rating: number, jobsCount: number }> = {};
            for (const id of uniqueIds) {
                try {
                    const docSnap = await getDoc(doc(db, 'bricolers', id));
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        newData[id] = {
                            rating: typeof data.rating === 'number' ? data.rating : 0,
                            jobsCount: data.completedJobs || data.numReviews || 0
                        };
                    }
                } catch (e) {
                    console.warn(`Error fetching live stats for ${id}`, e);
                }
            }
            setLiveHeroStats(newData);
        };
        fetchLiveStats();
    }, [orders]);

    const handleBookHero = async (hero: HeroData) => {
        setSelectedHero(hero);
        setIsLoadingProfile(true);
        setBookingStep(1); // Open modal with loader

        try {
            const docSnap = await getDoc(doc(db, 'bricolers', hero.id));
            if (docSnap.exists()) {
                setHeroProfile(docSnap.data());
            } else {
                setHeroProfile({ services: hero.services.map(s => ({ serviceId: s })) }); // Fallback
            }
        } catch (e) {
            console.error("Error fetching hero profile", e);
            setHeroProfile({ services: hero.services.map(s => ({ serviceId: s })) }); // Fallback
        } finally {
            setIsLoadingProfile(false);
        }
    };

    // When hero profile is loaded, auto-select the first day where they have availability
    useEffect(() => {
        if (!selectedHero || !heroProfile) return;
        const slotsMap = (heroProfile as any)?.calendarSlots || {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 14; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const daySlots = Array.isArray(slotsMap[dateStr]) ? slotsMap[dateStr] : [];

            // If they have slots OR we use the default 10-17 availability
            if (daySlots.length > 0 || true) { // Always available by default
                setSelectedDate(dateStr);
                setSelectedTime('');
                return;
            }
        }
    }, [heroProfile, selectedHero]);

    const uploadImageToStorage = async (file: File, path: string): Promise<string> => {
        const storageRef = ref(storage, path);
        const result = await uploadStorageBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
        return getStorageDownloadURL(result.ref);
    };

    const handleConfirmBooking = async () => {
        if (!selectedHero || !selectedService || !taskSize || isSubmitting) return;

        // Note: Removed bankReceipt requirement because uploads are disabled.
        // if (paymentMethod === 'bank' && !bankReceipt) {
        //     alert(t({ en: 'Please upload your transfer receipt before programming the mission.', fr: 'Veuillez télécharger votre reçu de virement avant de programmer la mission.', ar: 'يرجى تحميل إيصال التحويل قبل برمجة المهمة.' }));
        //     return;
        // }

        if (isUploadingReceipt) {
            alert(t({ en: 'Please wait for your receipt to finish uploading...', fr: 'Veuillez patienter pendant le téléchargement de votre reçu...', ar: 'يرجى الانتظار حتى يتم تحميل الإيصال...' }));
            return;
        }

        setIsSubmitting(true);
        try {
            const serviceData = (heroProfile?.services as Array<{ serviceId?: string; hourlyRate?: number } | string> | undefined)?.find(s =>
                (typeof s === 'string' ? s : s.serviceId)?.toLowerCase() === selectedService.toLowerCase()
            );
            const hourlyRate = (typeof serviceData === 'object' ? serviceData.hourlyRate : null) || heroProfile?.hourlyRate || 75;
            const duration = TASK_SIZES.find(s => s.id === taskSize)?.duration || 1;
            const basePrice = hourlyRate * duration;
            const serviceFee = basePrice * 0.15;
            const totalPrice = basePrice + serviceFee;

            // Get client location from their last order with this hero, or any last order
            const lastHeroOrder = orders.find(o => o.bricolerId === selectedHero.id);
            const lastOrder = orders[0];
            const city = lastHeroOrder?.city || lastOrder?.city || heroProfile?.city || 'Essaouira';
            const location = lastHeroOrder?.location || lastOrder?.location || city;

            const orderData = {
                service: selectedService,
                subService: selectedSubService || null,
                serviceId: selectedService,
                subServiceId: selectedSubService || '',
                serviceName: getServiceById(selectedService)?.name || selectedService,
                subServiceName: selectedSubService ? (getSubServiceName(selectedService, selectedSubService) || selectedSubService) : '',
                city,
                area: location !== city ? location : '',
                location,
                taskSize,
                description,
                bricolerId: selectedHero.id,
                bricolerName: selectedHero.name,
                bricolerAvatar: selectedHero.avatar || null,
                clientId: auth.currentUser?.uid,
                clientName: auth.currentUser?.displayName || 'Client',
                clientAvatar: auth.currentUser?.photoURL || null,
                status: 'pending',
                date: selectedDate || 'Flexible',
                time: selectedTime || 'Flexible',
                duration,
                basePrice,
                serviceFee,
                totalPrice,
                paymentMethod,
                bankReceipt: null,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'jobs'), orderData);

            // Mock success and close
            setBookingStep(5); // Success state
            setTimeout(() => {
                closeBooking();
            }, 2000);
        } catch (err) {
            console.error('Failed to book hero', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeBooking = () => {
        setBookingStep(0);
        setSelectedHero(null);
        setHeroProfile(null);
        setSelectedDate('');
        setSelectedTime('');
        setSelectedService('');
        setSelectedSubService('');
        setTaskSize('');
        setDescription('');
    };



    return (
        <div className="flex flex-col h-full bg-[#FFFFFF] relative">
            {/* Header */}
            <div className="pt-8 pb-6 px-6 bg-white sticky top-0 z-10 border-b border-neutral-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                <h1 className="text-[32px] font-black text-[#1D1D1D] tracking-tight flex items-center gap-3">
                    <Star size={32} className="text-[#FFC244] fill-[#FFC244]" />
                    {t({ en: 'My Heroes', fr: 'Mes Héros', ar: 'أبطالي' })}
                </h1>
                <p className="text-[#6B6B6B] font-light text-[16px] mt-1">{t({ en: 'Re-book Bricolers you love', fr: 'Réservez à nouveau vos Bricolers préférés', ar: 'أعد حجز مقدمي الخدمة الذين تفضلهم' })}</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-4">
                {heroes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                            <Star size={32} className="text-neutral-300" />
                        </div>
                        <h2 className="text-[20px] font-black text-neutral-900 mb-2">{t({ en: 'No Heroes Yet', fr: 'Aucun Héros pour l\'instant', ar: 'لا يوجد أبطال بعد' })}</h2>
                        <p className="text-neutral-500 text-[16px] font-medium max-w-[240px]">
                            {t({ en: 'Once you complete jobs with Bricolers, they will appear here.', fr: 'Une fois vos missions terminées avec des Bricolers, ils apparaîtront ici.', ar: 'بعد إكمال مهام مع مقدمي الخدمة، سيظهرون هنا.' })}
                        </p>
                    </div>
                ) : (
                    heroes.map(hero => (
                        <motion.div
                            whileTap={{ scale: 0.98 }}
                            key={hero.id}
                            className="bg-white rounded-[20px] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] flex flex-col gap-4 border border-[#E6E6E6]"
                        >
                            <div className="flex items-center gap-4">
                                <img
                                    src={hero.avatar || "/Images/Logo/Black Lbricol Avatar Face.webp"}
                                    alt={hero.name}
                                    className="w-16 h-16 rounded-[14px] object-cover bg-neutral-100"
                                />
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-[18px] font-black text-[#1D1D1D]">{hero.name}</h3>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(t({ en: 'Remove this hero from your list?', fr: 'Supprimer ce héros de votre liste ?' }))) {
                                                    handleRemoveHero(hero.id);
                                                }
                                            }}
                                            className="p-2 -mr-2 text-neutral-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        {(() => {
                                            const stats = liveHeroStats[hero.id] || { rating: hero.rating, jobsCount: hero.jobsCount };
                                            const hasStats = (stats.rating && stats.rating > 0) || (stats.jobsCount && stats.jobsCount > 0);
                                            return (
                                                <>
                                                    <div className={cn(
                                                        "flex items-center gap-1 text-[13px] font-bold px-2 py-0.5 rounded-md",
                                                        hasStats ? "bg-[#FFC244]/10 text-[#D89B1A]" : "bg-[#7C73E8]/10 text-[#7C73E8]"
                                                    )}>
                                                        {hasStats && <Star size={12} className="fill-current" />}
                                                        {hasStats ? (stats.rating || 0).toFixed(1) : t({ en: 'NEW', fr: 'NOUVEAU', ar: 'جديد' })}
                                                    </div>
                                                    {hasStats && <span className="text-[#6B6B6B] text-[13px] font-medium">• {stats.jobsCount || 0} {t({ en: 'jobs', fr: 'missions', ar: 'مهام' })}</span>}
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex gap-1 flex-wrap mt-2">
                                        {hero.services.slice(0, 2).map(s => (
                                            <span key={s} className="px-2 py-0.5 rounded border border-[#DADADA] text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleBookHero(hero)}
                                className="w-full py-4 bg-[#00A082] text-white rounded-[16px] font-bold text-[16px] active:bg-[#00876E] transition-colors shadow-[0_4px_12px_rgba(0,160,130,0.2)]"
                            >
                                {t({ en: 'Book Slots', fr: 'Réserver des créneaux', ar: 'احجز موعداً' })}
                            </button>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Hero Booking Flow Modal */}
            <AnimatePresence>
                {bookingStep > 0 && selectedHero && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-end justify-center"
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 220 }}
                            className="bg-white w-full rounded-t-[28px] flex flex-col max-h-[90vh] pb-8 overflow-hidden"
                            style={{ boxShadow: '0 -8px 24px rgba(0,0,0,0.1)' }}
                        >
                            {/* Modal Header */}
                            <div className="px-6 pt-6 pb-4 border-b border-[#E6E6E6] flex items-center justify-between sticky top-0 bg-white z-10">
                                <div className="flex items-center gap-3">
                                    {(bookingStep > 1 && bookingStep < 5) ? (
                                        <button onClick={() => setBookingStep(prev => prev - 1)} className="p-2 -ml-2 hover:bg-neutral-100 rounded-full">
                                            <ChevronLeft size={24} className="text-[#1D1D1D]" />
                                        </button>
                                    ) : (
                                        <div className="w-10" />
                                    )}
                                    <div className="flex-1">
                                        <p className="text-[12px] font-bold text-[#00A082] uppercase tracking-wider mt-0.5 text-center">
                                            {bookingStep === 1 && t({ en: '1. Date & Time', fr: '1. Date et Heure', ar: '1. التاريخ والوقت' })}
                                            {bookingStep === 2 && t({ en: '2. Select Service', fr: '2. Choisir le service', ar: '2. اختر الخدمة' })}
                                            {bookingStep === 3 && t({ en: '3. Task Details', fr: '3. Détails de la tâche', ar: '3. تفاصيل المهمة' })}
                                            {bookingStep === 4 && t({ en: '4. Checkout', fr: '4. Paiement', ar: '4. الدفع' })}
                                        </p>
                                    </div>
                                    {bookingStep < 5 ? (
                                        <button onClick={closeBooking} className="p-2 -mr-2 bg-neutral-100/50 hover:bg-neutral-200/50 rounded-full transition-colors">
                                            <X size={20} className="text-[#1D1D1D]" />
                                        </button>
                                    ) : (
                                        <div className="w-10" />
                                    )}
                                </div>
                            </div>

                            {/* Modal Content Scrollable */}
                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                                {isLoadingProfile && bookingStep < 5 ? (
                                    <div className="py-20 flex flex-col items-center justify-center">
                                        <div className="w-10 h-10 rounded-full border-4 border-[#00A082] border-t-transparent animate-spin mb-4" />
                                        <p className="text-[#6B6B6B] font-medium text-[16px]">{t({ en: 'Syncing availability...', fr: 'Synchronisation...', ar: 'جاري المزامنة...' })}</p>
                                    </div>
                                ) : (
                                    <>
                                        {bookingStep === 1 && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-[#E6F6F2] flex items-center justify-center">
                                                        <Calendar size={24} className="text-[#00A082]" />
                                                    </div>
                                                    <h4 className="text-[22px] font-black text-[#1D1D1D] tracking-tight">{t({ en: 'Select Start Time', fr: 'Choisir l\'heure de début', ar: 'اختر وقت البدء' })}</h4>
                                                </div>

                                                {/* Horizontal Date Picker */}
                                                <div className="space-y-3">
                                                    <label className="text-[14px] font-black text-[#6B6B6B] block uppercase tracking-widest">{t({ en: 'Select Date', fr: 'Date', ar: 'التاريخ' })}</label>
                                                    <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-6 px-6 py-2">
                                                        {Array.from({ length: 14 }).map((_, i) => {
                                                            const base = new Date();
                                                            base.setHours(0, 0, 0, 0);
                                                            const d = new Date(base);
                                                            d.setDate(base.getDate() + i);
                                                            const dateStr = d.toISOString().split('T')[0];
                                                            const isSelected = selectedDate === dateStr;
                                                            const isTodayDate = i === 0;

                                                            const daySlotsRaw = (heroProfile as any)?.calendarSlots?.[dateStr];
                                                            const daySlots = Array.isArray(daySlotsRaw) && daySlotsRaw.length > 0
                                                                ? daySlotsRaw
                                                                : [{ from: '10:00', to: '17:00' }];
                                                            const hasAvailability = true;

                                                            // Only days with declared availability should be selectable (Now always true because of default 10-17)
                                                            if (!hasAvailability) {
                                                                return (
                                                                    <button
                                                                        key={dateStr}
                                                                        disabled
                                                                        className="flex flex-col items-center justify-center min-w-[70px] h-[90px] rounded-[24px] border-2 bg-neutral-50 border-[#F0F0F0] opacity-40 cursor-not-allowed"
                                                                    >
                                                                        <span className="text-[12px] font-bold uppercase text-[#B3B3B3]">
                                                                            {isTodayDate ? t({ en: 'Today', fr: 'Auj' }) : d.toLocaleDateString(t({ en: 'en-US', fr: 'fr-FR' }), { weekday: 'short' })}
                                                                        </span>
                                                                        <span className="text-[20px] font-black mt-1 text-[#B3B3B3]">
                                                                            {d.getDate()}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            }

                                                            return (
                                                                <button
                                                                    key={dateStr}
                                                                    onClick={() => {
                                                                        setSelectedDate(dateStr);
                                                                        setSelectedTime('');
                                                                    }}
                                                                    className={cn(
                                                                        "flex flex-col items-center justify-center min-w-[70px] h-[90px] rounded-[24px] border-2 transition-all",
                                                                        isSelected
                                                                            ? "bg-[#00A082] border-[#00A082] shadow-[0_8px_16px_rgba(0,160,130,0.25)]"
                                                                            : "bg-white border-[#F0F0F0] hover:border-[#008C74]/50"
                                                                    )}
                                                                >
                                                                    <span className={cn("text-[12px] font-bold uppercase", isSelected ? "text-white/70" : "text-[#6B6B6B]")}>
                                                                        {isTodayDate ? t({ en: 'Today', fr: 'Auj' }) : d.toLocaleDateString(t({ en: 'en-US', fr: 'fr-FR' }), { weekday: 'short' })}
                                                                    </span>
                                                                    <span className={cn("text-[20px] font-black mt-1", isSelected ? "text-white" : "text-[#1D1D1D]")}>
                                                                        {d.getDate()}
                                                                    </span>
                                                                    {isSelected && <motion.div layoutId="date-dot" className="w-1.5 h-1.5 rounded-full bg-white mt-1" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Time Slots Grid */}
                                                <div className="space-y-4">
                                                    <label className="text-[14px] font-black text-[#6B6B6B] block uppercase tracking-widest">{t({ en: 'Available Slots', fr: 'Créneaux disponibles', ar: 'المواعيد المتاحة' })}</label>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {Array.from({ length: 11 }).map((_, i) => {
                                                            const hour = 8 + i;
                                                            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                                                            const isSelected = selectedTime === timeStr;

                                                            const daySlotsRaw = (heroProfile as any)?.calendarSlots?.[selectedDate];
                                                            const daySlots = Array.isArray(daySlotsRaw) && daySlotsRaw.length > 0
                                                                ? daySlotsRaw
                                                                : [{ from: '10:00', to: '17:00' }];

                                                            const toMinutes = (hhmm: string) => {
                                                                const [h, m] = hhmm.split(':').map(Number);
                                                                return h * 60 + m;
                                                            };

                                                            const candidateStart = toMinutes(timeStr);
                                                            const hasSlot = daySlots.some((slot: { from: string; to: string }) => {
                                                                if (!slot?.from || !slot?.to) return false;
                                                                const fromM = toMinutes(slot.from);
                                                                const toM = toMinutes(slot.to);
                                                                return candidateStart >= fromM && candidateStart < toM;
                                                            });

                                                            // Skip times that are not within any declared slot
                                                            if (!hasSlot) return null;

                                                            // Check if slot is in past for today
                                                            if (selectedDate === new Date().toISOString().split('T')[0]) {
                                                                const now = new Date();
                                                                if (hour <= now.getHours()) return null;
                                                            }

                                                            const displayTime = hour > 12 ? `${hour - 12}:00 PM` : (hour === 12 ? '12:00 PM' : `${hour}:00 AM`);

                                                            return (
                                                                <button
                                                                    key={timeStr}
                                                                    onClick={() => setSelectedTime(timeStr)}
                                                                    className={cn(
                                                                        "py-4 rounded-[18px] border-2 font-bold text-[15px] transition-all",
                                                                        isSelected ? "bg-[#FFF8E7] border-[#FFC244] text-[#1D1D1D] shadow-sm" : "bg-white border-[#F0F0F0] text-[#1D1D1D] hover:border-[#FFC244]/50"
                                                                    )}
                                                                >
                                                                    {displayTime}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="bg-[#F7F7F7] p-5 rounded-[24px] flex items-start gap-3">
                                                    <Info size={20} className="text-[#6B6B6B] mt-0.5" />
                                                    <p className="text-[13px] font-medium text-[#6B6B6B] leading-relaxed">
                                                        {t({ en: `Note: We'll verify this slot matches ${selectedHero.name}'s schedule.`, fr: `Note : Nous vérifierons que ce créneau correspond au planning de ${selectedHero.name}.`, ar: `ملاحظة: سنتحقق أن هذا الموعد يناسب جدول ${selectedHero.name}.` })}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}

                                        {bookingStep === 2 && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-[#E6F6F2] flex items-center justify-center">
                                                        <Wrench size={24} className="text-[#00A082]" />
                                                    </div>
                                                    <h4 className="text-[22px] font-black text-[#1D1D1D] tracking-tight">{t({ en: 'What do you need?', fr: 'Quel service souhaitez-vous ?', ar: 'ما هي الخدمة التي تحتاجها؟' })}</h4>
                                                </div>

                                                <div className="grid grid-cols-1 gap-4">
                                                    {Object.values(SERVICES_HIERARCHY).filter(config =>
                                                        (heroProfile?.services as Array<string | { serviceId?: string }> | undefined)?.some(s =>
                                                            (typeof s === 'string' ? s : s.serviceId)?.toLowerCase() === config.id.toLowerCase()
                                                        ) || selectedHero.services.some(s => s.toLowerCase() === config.id.toLowerCase())
                                                    ).map((config) => {
                                                        const isSelected = selectedService === config.id;
                                                        return (
                                                            <div key={config.id} className="space-y-3">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedService(config.id);
                                                                        setSelectedSubService('');
                                                                    }}
                                                                    className={cn(
                                                                        "w-full flex items-center justify-between p-5 rounded-[22px] border-2 transition-all",
                                                                        isSelected ? "bg-[#D9F2EC] border-[#00A082]" : "bg-white border-[#F0F0F0] hover:border-[#008C74]/50"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-12 h-12 flex-shrink-0">
                                                                            <img src={getServiceVector(config.id)} alt={config.name} className="w-full h-full object-contain" />
                                                                        </div>
                                                                        <h5 className={cn("text-[17px] font-black", isSelected ? "text-[#008C74]" : "text-[#1D1D1D]")}>{config.name}</h5>
                                                                    </div>
                                                                    {isSelected && <Check size={20} className="text-[#00A082]" strokeWidth={3} />}
                                                                </button>

                                                                {isSelected && (
                                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-2 pl-2">
                                                                        {config.subServices.map(ss => (
                                                                            <button
                                                                                key={ss.id}
                                                                                onClick={() => setSelectedSubService(ss.id)}
                                                                                className={cn(
                                                                                    "p-3 rounded-[14px] border-2 text-[13px] font-bold text-center transition-all",
                                                                                    selectedSubService === ss.id ? "bg-[#00A082] border-[#00A082] text-white" : "bg-white border-[#F0F0F0] text-[#6B6B6B]"
                                                                                )}
                                                                            >
                                                                                {ss.name}
                                                                            </button>
                                                                        ))}
                                                                    </motion.div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}

                                        {bookingStep === 3 && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-[#E6F6F2] flex items-center justify-center">
                                                        <Search size={24} className="text-[#00A082]" />
                                                    </div>
                                                    <h4 className="text-[22px] font-black text-[#1D1D1D] tracking-tight">{t({ en: 'Task Details', fr: 'Détails de la tâche', ar: 'تفاصيل المهمة' })}</h4>
                                                </div>

                                                <div className="space-y-4">
                                                    <label className="text-[14px] font-black text-[#6B6B6B] block uppercase tracking-widest">{t({ en: 'Task Size', fr: 'Taille', ar: 'الحجم' })}</label>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {TASK_SIZES.map(ts => (
                                                            <button
                                                                key={ts.id}
                                                                onClick={() => setTaskSize(ts.id)}
                                                                className={cn(
                                                                    "flex items-center gap-4 p-5 rounded-[22px] border-2 text-left transition-all",
                                                                    taskSize === ts.id ? "bg-[#FFF8E7] border-[#FFC244]" : "bg-white border-[#F0F0F0] hover:border-[#FFC244]/50"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[20px] shrink-0",
                                                                    taskSize === ts.id ? "bg-[#FFC244] text-white" : "bg-neutral-100 text-[#6B6B6B]"
                                                                )}>
                                                                    {ts.id === 'small' ? 'S' : ts.id === 'medium' ? 'M' : 'L'}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-[17px] font-black text-[#1D1D1D]">{t(ts.label)}</span>
                                                                        <span className="text-[13px] font-black text-[#6B6B6B]">{t(ts.estTime)}</span>
                                                                    </div>
                                                                    <p className="text-[14px] text-[#6B6B6B] leading-tight font-medium mt-0.5">{t(ts.desc)}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <label className="text-[14px] font-black text-[#6B6B6B] block uppercase tracking-widest">{t({ en: 'Description', fr: 'Description', ar: 'الوصف' })}</label>
                                                    <textarea
                                                        value={description}
                                                        onChange={e => setDescription(e.target.value)}
                                                        placeholder={t({ en: 'Any extra details for the hero?', fr: 'Des détails supplémentaires pour le héros ?', ar: 'أي تفاصيل إضافية لمقدم الخدمة؟' })}
                                                        rows={4}
                                                        className="w-full p-6 rounded-[24px] border-2 border-[#F0F0F0] focus:border-[#008C74] outline-none text-[16px] text-[#1D1D1D] resize-none font-medium bg-[#FAFAFA]"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}

                                        {bookingStep === 4 && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-[#E6F6F2] flex items-center justify-center">
                                                        <Banknote size={24} className="text-[#00A082]" />
                                                    </div>
                                                    <h4 className="text-[22px] font-black text-[#1D1D1D] tracking-tight">{t({ en: 'Checkout', fr: 'Paiement', ar: 'الدفع' })}</h4>
                                                </div>

                                                <div className="bg-[#FAFAFA] rounded-[32px] p-8 border border-neutral-100">
                                                    <div className="space-y-6">
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                                                                <Clock size={20} className="text-[#00A082]" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[12px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Schedule', fr: 'Date & Heure', ar: 'الموعد' })}</span>
                                                                <span className="text-[17px] font-black text-[#1D1D1D]">
                                                                    {selectedDate ? new Date(selectedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Flexible'} at {selectedTime}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-start gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                                                                <Wrench size={20} className="text-[#00A082]" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[12px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Service', fr: 'Service', ar: 'الخدمة' })}</span>
                                                                <span className="text-[17px] font-black text-[#1D1D1D] capitalize">{getServiceById(selectedService)?.name || selectedService}</span>
                                                                {selectedSubService && <span className="text-[14px] font-bold text-[#6B6B6B]">{getSubServiceName(selectedService, selectedSubService) || selectedSubService}</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="h-px bg-neutral-200/50 my-8" />

                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center px-1">
                                                            <span className="text-[16px] font-bold text-[#6B6B6B]">{t({ en: 'Subtotal', fr: 'Sous-total', ar: 'المجموع الفرعي' })}</span>
                                                            <span className="text-[16px] font-black text-[#1D1D1D]">{Math.round((heroProfile?.hourlyRate || 75) * (TASK_SIZES.find(s => s.id === taskSize)?.duration || 1) * 0.85)} MAD</span>
                                                        </div>
                                                        <div className="flex justify-between items-center px-1">
                                                            <span className="text-[16px] font-bold text-[#6B6B6B]">{t({ en: 'Service Fee', fr: 'Commission', ar: 'عمولة الخدمة' })}</span>
                                                            <span className="text-[16px] font-black text-[#1D1D1D]">{Math.round((heroProfile?.hourlyRate || 75) * (TASK_SIZES.find(s => s.id === taskSize)?.duration || 1) * 0.15)} MAD</span>
                                                        </div>
                                                        <div className="flex justify-between items-center px-1 pt-4 border-t border-neutral-200">
                                                            <span className="text-[20px] font-black text-[#1D1D1D]">{t({ en: 'Total Price', fr: 'Prix Total', ar: 'السعر الإجمالي' })}</span>
                                                            <span className="text-[22px] font-black text-[#00A082]">{Math.round((heroProfile?.hourlyRate || 75) * (TASK_SIZES.find(s => s.id === taskSize)?.duration || 1))} MAD</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Payment Method Selection */}
                                                <div className="space-y-4 mt-8">
                                                    <label className="text-[14px] font-black text-[#6B6B6B] block uppercase tracking-widest px-2">{t({ en: 'Payment Method', fr: 'Mode de paiement', ar: 'طريقة الدفع' })}</label>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => setPaymentMethod('cash')}
                                                            className={cn(
                                                                "flex-1 flex flex-col items-center gap-4 p-6 rounded-[24px] border-2 transition-all",
                                                                paymentMethod === 'cash' ? "bg-[#FFF8E7] border-[#FFC244]" : "bg-white border-[#F0F0F0]"
                                                            )}
                                                        >
                                                            <span className="text-3xl">💵</span>
                                                            <div className="text-center">
                                                                <p className="text-[15px] font-black">{t({ en: 'Cash', fr: 'Espèces', ar: 'نقداً' })}</p>
                                                                <p className="text-[11px] font-bold text-neutral-400 mt-1 uppercase">{t({ en: 'After job', fr: 'Après mission', ar: 'بعد المهمة' })}</p>
                                                            </div>
                                                        </button>
                                                        <button
                                                            onClick={() => setPaymentMethod('bank')}
                                                            className={cn(
                                                                "flex-1 flex flex-col items-center gap-4 p-6 rounded-[24px] border-2 transition-all",
                                                                paymentMethod === 'bank' ? "bg-[#D9F2EC] border-[#00A082]" : "bg-white border-[#F0F0F0]"
                                                            )}
                                                        >
                                                            <span className="text-3xl">🏦</span>
                                                            <div className="text-center">
                                                                <p className="text-[15px] font-black">{t({ en: 'Transfer', fr: 'Virement', ar: 'تحويل' })}</p>
                                                                <p className="text-[11px] font-bold text-neutral-400 mt-1 uppercase">{t({ en: 'Instant', fr: 'Instantané', ar: 'فوري' })}</p>
                                                            </div>
                                                        </button>
                                                    </div>

                                                    {paymentMethod === 'bank' && (
                                                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                                                            <div className="p-6 bg-white rounded-[24px] border-2 border-dashed border-[#00A082]/30 space-y-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-8 h-8 rounded-full bg-[#E6F6F2] flex items-center justify-center">
                                                                        <Banknote size={16} className="text-[#00A082]" />
                                                                    </div>
                                                                    <p className="text-[14px] font-black text-[#00A082] uppercase tracking-wider">{t({ en: 'Bank Details', fr: 'RIB', ar: 'تفاصيل البنك' })}</p>
                                                                </div>
                                                                <div className="p-4 bg-neutral-50 rounded-2xl flex justify-between items-center">
                                                                    <p className="font-mono font-black text-[14px] text-neutral-800 tracking-tighter">350810000000000880844466</p>
                                                                    <button onClick={() => navigator.clipboard.writeText('350810000000000880844466')} className="px-3 py-1.5 bg-[#00A082] text-white rounded-lg text-[11px] font-black uppercase shadow-sm">
                                                                        {t({ en: 'Copy', fr: 'Copier', ar: 'نسخ' })}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4 w-full p-5 rounded-[22px] border-2 border-[#00A082] bg-[#D9F2EC] border-dashed">
                                                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                                                                    <WhatsAppBrandIcon className="w-6 h-6" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-[14px] font-black text-[#1D1D1D]">
                                                                        {t({
                                                                            en: 'Send receipt via WhatsApp',
                                                                            fr: 'Envoyer le reçu via WhatsApp',
                                                                            ar: 'أرسل الإيصال عبر واتساب'
                                                                        })}
                                                                    </p>
                                                                    <p className="text-[12px] font-medium text-neutral-400">
                                                                        {t({
                                                                            en: 'Uploads are disabled. Chat with us.',
                                                                            fr: 'Envois désactivés. Discutez avec nous.',
                                                                            ar: 'الرفع معطل. تواصل معنا للحصول على المساعدة.'
                                                                        })}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() => window.open('https://wa.me/212702814355', '_blank')}
                                                                    className="bg-[#00A082] text-white px-3 py-1.5 rounded-lg text-[11px] font-black uppercase"
                                                                >
                                                                    {t({ en: 'Chat', fr: 'Discuter', ar: 'محادثة' })}
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}

                                        {bookingStep === 5 && (
                                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                                                <div className="w-20 h-20 rounded-full bg-[#D9F2EC] flex items-center justify-center">
                                                    <CheckCircle2 size={40} className="text-[#00A082]" />
                                                </div>
                                                <h4 className="text-[24px] font-black text-[#1D1D1D]">{t({ en: 'Booking Sent!', fr: 'Réservation envoyée !', ar: 'تم إرسال الحجز!' })}</h4>
                                                <p className="text-[#6B6B6B] text-[16px] max-w-[260px]">
                                                    {t({ en: `${selectedHero.name} has received your direct booking request. They will confirm shortly.`, fr: `${selectedHero.name} a reçu votre demande de réservation directe. Il/elle confirmera bientôt.`, ar: `استلم ${selectedHero.name} طلب الحجز المباشر الخاص بك. سيؤكد قريباً.` })}
                                                </p>
                                            </motion.div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Booking Footer Actions */}
                            {bookingStep > 0 && bookingStep < 5 && !isLoadingProfile && (
                                <div className="px-6 border-t border-[#E6E6E6] pt-4 pb-4 bg-white">
                                    <button
                                        onClick={() => {
                                            if (bookingStep === 1 && isStep1Valid) setBookingStep(2);
                                            else if (bookingStep === 2 && isStep2Valid) setBookingStep(3);
                                            else if (bookingStep === 3 && isStep3Valid) setBookingStep(4);
                                            else if (bookingStep === 4) {
                                                if (paymentMethod === 'bank' && !bankReceipt) {
                                                    alert(t({ en: 'Please upload bank receipt.', fr: 'Veuillez joindre le reçu.', ar: 'يرجى رفع الإيصال.' }));
                                                } else {
                                                    handleConfirmBooking();
                                                }
                                            }
                                        }}
                                        disabled={(bookingStep === 1 && !isStep1Valid) || (bookingStep === 2 && !isStep2Valid) || (bookingStep === 3 && !isStep3Valid) || isSubmitting}
                                        className="w-full py-5 bg-[#00A082] text-white rounded-[24px] font-black text-[18px] active:scale-95 disabled:bg-[#F2F2F2] disabled:text-[#A0A0A0] disabled:cursor-not-allowed transition-all shadow-[0_12px_24px_rgba(0,160,130,0.2)]"
                                    >
                                        {isSubmitting ? t({ en: 'Sending...', fr: 'Envoi...', ar: 'جارٍ الإرسال...' }) : bookingStep === 4 ? t({ en: 'Program Order', fr: 'Programmer la mission', ar: 'برمجة المهمة' }) : t({ en: 'Continue', fr: 'Continuer', ar: 'متابعة' })}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
