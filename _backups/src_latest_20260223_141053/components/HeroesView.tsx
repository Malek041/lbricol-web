"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Clock, Calendar, ChevronRight, ChevronLeft, X, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    serverTimestamp,
    addDoc
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { getServiceById, getSubServiceName } from '@/config/services_config';
import { OrderDetails } from '@/components/OrderCard';
import { cn } from '@/lib/utils';

interface HeroesViewProps {
    orders: OrderDetails[];
    onBack?: () => void;
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
    }
];

export default function HeroesView({ orders, onBack }: HeroesViewProps) {
    const { t } = useLanguage();
    const [selectedHero, setSelectedHero] = useState<HeroData | null>(null);
    const [bookingStep, setBookingStep] = useState(0); // 0 = none, 1 = date/time, 2 = service/subservice, 3 = size/desc, 4 = confirm

    // Booking state
    const [heroProfile, setHeroProfile] = useState<any>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [selectedService, setSelectedService] = useState<string>('');
    const [selectedSubService, setSelectedSubService] = useState<string>('');
    const [taskSize, setTaskSize] = useState<string>('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                    rating: o.bricolerRating || 5.0,
                    jobsCount: o.bricolerJobsCount || 1,
                    services: [o.service]
                });
            } else {
                const existing = map.get(hid)!;
                if (!existing.services.includes(o.service)) {
                    existing.services.push(o.service);
                }
            }
        });

        return Array.from(map.values());
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

    const handleConfirmBooking = async () => {
        if (!selectedHero || !selectedService || !taskSize || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const serviceData = heroProfile?.services?.find((s: any) =>
                (typeof s === 'string' ? s : s.serviceId)?.toLowerCase() === selectedService.toLowerCase()
            );
            const hourlyRate = (typeof serviceData === 'object' ? serviceData.hourlyRate : null) || heroProfile?.hourlyRate || 100;
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
                price: totalPrice,
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

    const isStep1Valid = selectedDate && selectedTime;
    const isStep2Valid = selectedService;
    const isStep3Valid = taskSize;

    return (
        <div className="flex flex-col h-full bg-[#f7f7f7] relative">
            {/* Header */}
            <div className="pt-8 pb-6 px-6 bg-white sticky top-0 z-10 border-b border-neutral-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                <h1 className="text-[32px] font-black text-[#1D1D1D] tracking-tight flex items-center gap-3">
                    <Star size={32} className="text-[#FFC244] fill-[#FFC244]" />
                    Ma Heroes
                </h1>
                <p className="text-[#6B6B6B] font-medium text-[16px] mt-1">Re-book Bricolers you love</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-4">
                {heroes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                            <Star size={32} className="text-neutral-300" />
                        </div>
                        <h2 className="text-[20px] font-black text-neutral-900 mb-2">No Heroes Yet</h2>
                        <p className="text-neutral-500 text-[16px] font-medium max-w-[240px]">
                            Once you complete jobs with Bricolers, they will appear here.
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
                                    src={hero.avatar || "/Images/Logo/Black Lbricol Avatar Face.png"}
                                    alt={hero.name}
                                    className="w-16 h-16 rounded-[14px] object-cover bg-neutral-100"
                                />
                                <div className="flex-1">
                                    <h3 className="text-[18px] font-black text-[#1D1D1D]">{hero.name}</h3>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="flex items-center gap-1 text-[13px] font-bold px-2 py-0.5 rounded-md bg-[#FFC244]/10 text-[#D89B1A]">
                                            <Star size={12} className="fill-current" />
                                            {hero.rating?.toFixed(1) || '5.0'}
                                        </div>
                                        <span className="text-[#6B6B6B] text-[13px] font-medium">• {hero.jobsCount} jobs</span>
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
                                Book Slots
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
                                    <div className="text-center flex-1">
                                        <h3 className="text-[18px] font-black text-[#1D1D1D]">Book {selectedHero.name}</h3>
                                        <p className="text-[12px] font-bold text-[#00A082] uppercase tracking-wider mt-0.5">
                                            {bookingStep === 1 && '1. Date & Time'}
                                            {bookingStep === 2 && '2. Choose Service'}
                                            {bookingStep === 3 && '3. Task Details'}
                                            {bookingStep === 4 && '4. Review & Confirm'}
                                        </p>
                                    </div>
                                    {bookingStep < 5 ? (
                                        <button onClick={closeBooking} className="p-2 -mr-2 bg-neutral-100 hover:bg-neutral-200 rounded-full">
                                            <X size={20} className="text-[#1D1D1D]" />
                                        </button>
                                    ) : (
                                        <div className="w-10" />
                                    )}
                                </div>
                            </div>

                            {/* Modal Content Scrollable */}
                            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                                {isLoadingProfile && bookingStep < 5 ? (
                                    <div className="py-20 flex flex-col items-center justify-center">
                                        <div className="w-8 h-8 rounded-full border-4 border-[#00A082] border-t-transparent animate-spin mb-4" />
                                        <p className="text-[#6B6B6B] font-medium text-[16px]">Loading provider availability...</p>
                                    </div>
                                ) : (
                                    <>
                                        {bookingStep === 1 && (
                                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                                <h4 className="text-[20px] font-bold text-[#1D1D1D]">When do you need them?</h4>
                                                <div>
                                                    <label className="text-[14px] font-bold text-[#6B6B6B] block mb-2 uppercase">Select Date</label>
                                                    <input
                                                        type="date"
                                                        value={selectedDate}
                                                        onChange={e => setSelectedDate(e.target.value)}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        className="w-full p-4 rounded-[14px] border border-[#DADADA] focus:border-[#00A082] focus:ring-1 focus:ring-[#00A082] outline-none text-[16px] font-bold text-[#1D1D1D]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[14px] font-bold text-[#6B6B6B] block mb-2 uppercase">Select Time</label>
                                                    <input
                                                        type="time"
                                                        value={selectedTime}
                                                        onChange={e => setSelectedTime(e.target.value)}
                                                        className="w-full p-4 rounded-[14px] border border-[#DADADA] focus:border-[#00A082] focus:ring-1 focus:ring-[#00A082] outline-none text-[16px] font-bold text-[#1D1D1D]"
                                                    />
                                                    {heroProfile && (
                                                        <p className="text-[12px] font-medium text-[#6B6B6B] mt-2 italic">
                                                            Note: We'll verify this slot matches {selectedHero.name}'s schedule.
                                                        </p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}

                                        {bookingStep === 2 && (
                                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                                <h4 className="text-[20px] font-bold text-[#1D1D1D]">What do you need help with?</h4>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {(heroProfile?.services || selectedHero.services.map((s: string) => ({ serviceId: s }))).map((svc: any) => {
                                                        const sId = typeof svc === 'string' ? svc : svc.serviceId;
                                                        const isSelected = selectedService === sId;
                                                        return (
                                                            <button
                                                                key={sId}
                                                                onClick={() => {
                                                                    setSelectedService(sId);
                                                                    setSelectedSubService(''); // reset
                                                                }}
                                                                className={cn(
                                                                    "p-4 rounded-[18px] text-left border transition-all",
                                                                    isSelected ? "border-[#00A082] bg-[#D9F2EC]" : "border-[#DADADA] bg-white hover:border-[#00A082]"
                                                                )}
                                                            >
                                                                <h5 className={cn(
                                                                    "text-[16px] font-bold capitalize",
                                                                    isSelected ? "text-[#00A082]" : "text-[#1D1D1D]"
                                                                )}>{sId}</h5>
                                                            </button>
                                                        )
                                                    })}
                                                </div>

                                                {selectedService && (
                                                    <div>
                                                        <label className="text-[14px] font-bold text-[#6B6B6B] block mb-2 mt-4 uppercase">Specific task (Optional)</label>
                                                        <input
                                                            type="text"
                                                            value={selectedSubService}
                                                            onChange={e => setSelectedSubService(e.target.value)}
                                                            placeholder="e.g. Paint bedroom, fix sink..."
                                                            className="w-full p-4 rounded-[14px] border border-[#DADADA] focus:border-[#00A082] outline-none text-[16px] text-[#1D1D1D]"
                                                        />
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}

                                        {bookingStep === 3 && (
                                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                                <h4 className="text-[20px] font-bold text-[#1D1D1D]">Task Size & Details</h4>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {TASK_SIZES.map(ts => (
                                                        <button
                                                            key={ts.id}
                                                            onClick={() => setTaskSize(ts.id)}
                                                            className={cn(
                                                                "flex items-center gap-4 p-4 rounded-[18px] border text-left transition-all",
                                                                taskSize === ts.id ? "border-[#00A082] bg-[#D9F2EC]" : "border-[#DADADA] bg-white hover:border-[#00A082]"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "w-12 h-12 rounded-[12px] flex items-center justify-center font-black text-[18px] shrink-0",
                                                                taskSize === ts.id ? "bg-[#00A082] text-white" : "bg-neutral-100 text-[#6B6B6B]"
                                                            )}>
                                                                {ts.id === 'small' ? 'S' : ts.id === 'medium' ? 'M' : 'L'}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center justify-between mb-0.5">
                                                                    <span className={cn("text-[16px] font-bold", taskSize === ts.id ? "text-[#00A082]" : "text-[#1D1D1D]")}>{ts.label.en}</span>
                                                                    <span className="text-[12px] font-bold text-[#6B6B6B]">{ts.estTime.en}</span>
                                                                </div>
                                                                <p className="text-[13px] text-[#6B6B6B] leading-tight">{ts.desc.en}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>

                                                <div>
                                                    <label className="text-[14px] font-bold text-[#6B6B6B] block mb-2 mt-4 uppercase">Description</label>
                                                    <textarea
                                                        value={description}
                                                        onChange={e => setDescription(e.target.value)}
                                                        placeholder="Any extra details for the hero?"
                                                        rows={3}
                                                        className="w-full p-4 rounded-[14px] border border-[#DADADA] focus:border-[#00A082] outline-none text-[16px] text-[#1D1D1D] resize-none"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}

                                        {bookingStep === 4 && (
                                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                                <div className="p-6 bg-[#F7F7F7] rounded-[24px] border border-[#E6E6E6]">
                                                    <h4 className="text-[20px] font-black text-[#1D1D1D] mb-4">Summary</h4>

                                                    <div className="space-y-3">
                                                        <div className="flex items-start gap-3">
                                                            <Clock className="text-[#00A082] mt-0.5" size={20} />
                                                            <div>
                                                                <p className="text-[14px] font-bold text-[#6B6B6B]">Schedule</p>
                                                                <p className="text-[16px] font-bold text-[#1D1D1D]">{selectedDate} at {selectedTime}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <Star className="text-[#00A082] mt-0.5" size={20} />
                                                            <div>
                                                                <p className="text-[14px] font-bold text-[#6B6B6B]">Service</p>
                                                                <p className="text-[16px] font-bold text-[#1D1D1D] capitalize">{selectedService}</p>
                                                                {selectedSubService && <p className="text-[14px] text-[#1D1D1D]">{selectedSubService}</p>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-[20px] h-[20px] rounded bg-[#00A082] text-white font-black text-[12px] flex items-center justify-center mt-0.5 shrink-0">
                                                                {taskSize === 'small' ? 'S' : taskSize === 'medium' ? 'M' : 'L'}
                                                            </div>
                                                            <div>
                                                                <p className="text-[14px] font-bold text-[#6B6B6B]">Task Size</p>
                                                                <p className="text-[16px] font-bold text-[#1D1D1D] capitalize">{taskSize}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {bookingStep === 5 && (
                                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                                                <div className="w-20 h-20 rounded-full bg-[#D9F2EC] flex items-center justify-center">
                                                    <CheckCircle2 size={40} className="text-[#00A082]" />
                                                </div>
                                                <h4 className="text-[24px] font-black text-[#1D1D1D]">Booking Sent!</h4>
                                                <p className="text-[#6B6B6B] text-[16px] max-w-[260px]">
                                                    {selectedHero.name} has received your direct booking request. They will confirm shortly.
                                                </p>
                                            </motion.div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Booking Footer Actions */}
                            {bookingStep > 0 && bookingStep < 5 && !isLoadingProfile && (
                                <div className="px-6 border-t border-[#E6E6E6] pt-4 pb-2">
                                    <button
                                        onClick={() => {
                                            if (bookingStep === 1 && isStep1Valid) setBookingStep(2);
                                            else if (bookingStep === 2 && isStep2Valid) setBookingStep(3);
                                            else if (bookingStep === 3 && isStep3Valid) setBookingStep(4);
                                            else if (bookingStep === 4) handleConfirmBooking();
                                        }}
                                        disabled={(bookingStep === 1 && !isStep1Valid) || (bookingStep === 2 && !isStep2Valid) || (bookingStep === 3 && !isStep3Valid) || isSubmitting}
                                        className="w-full py-4 bg-[#00A082] text-white rounded-[16px] font-bold text-[16px] active:bg-[#00876E] disabled:bg-[#BDBDBD] disabled:cursor-not-allowed transition-all shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                                    >
                                        {isSubmitting ? 'Sending...' : bookingStep === 4 ? 'Confirm Booking' : 'Continue'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
