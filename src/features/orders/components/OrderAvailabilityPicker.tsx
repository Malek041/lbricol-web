"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ChevronLeft, ChevronRight, AlertCircle, Check } from 'lucide-react';
import { 
    format, 
    addDays, 
    startOfToday, 
    isSameDay, 
    getDay, 
    parse, 
    isAfter, 
    isBefore, 
    addHours,
    startOfDay,
    setHours,
    setMinutes,
    isToday
} from 'date-fns';

import { fr, enUS, arMA } from 'date-fns/locale';
import { useLanguage } from '@/context/LanguageContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface OrderAvailabilityPickerProps {
    bricolerId: string;
    onSelect: (date: Date, time: string) => void;
    selectedDate?: Date | null;
    selectedTime?: string | null;
}

const DAYS_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const TIME_SLOTS = [
    "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", 
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", 
    "19:00", "20:00", "21:00", "22:00"
];

export default function OrderAvailabilityPicker({
    bricolerId,
    onSelect,
    selectedDate: initialSelectedDate,
    selectedTime: initialSelectedTime
}: OrderAvailabilityPickerProps) {
    const { t, language } = useLanguage();
    const [selectedDate, setSelectedDate] = useState<Date>(initialSelectedDate || startOfToday());
    const [availabilityData, setAvailabilityData] = useState<any>(null);
    const [bookedJobs, setBookedJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const locale = language === 'ar' ? arMA : (language === 'fr' ? fr : enUS);

    // 1. Fetch Bricoler data (routine + calendarSlots)
    useEffect(() => {
        const fetchData = async () => {
            if (!bricolerId) return;
            setLoading(true);
            try {
                // Fetch Bricoler Profile
                const bricolerSnap = await getDoc(doc(db, 'bricolers', bricolerId));
                if (bricolerSnap.exists()) {
                    setAvailabilityData(bricolerSnap.data());
                }

                // Fetch Booked Jobs for this Bricoler (next 30 days)
                const today = startOfToday();
                const thirtyDaysLater = addDays(today, 30);
                
                const jobsQuery = query(
                    collection(db, 'jobs'),
                    where('bricolerId', '==', bricolerId),
                    where('status', 'in', ['programmed', 'confirmed', 'in_progress', 'arriving'])
                );
                
                const jobsSnap = await getDocs(jobsQuery);
                const jobs = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setBookedJobs(jobs);
            } catch (error) {
                console.error("Error fetching availability data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [bricolerId]);

    // 2. Generate Next 14 Days
    const nextDays = useMemo(() => {
        return Array.from({ length: 14 }).map((_, i) => addDays(startOfToday(), i));
    }, []);

    // 3. Calculate Available Slots for Selected Date
    const availableSlots = useMemo(() => {
        if (!availabilityData) return [];

        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const dayOfWeek = DAYS_NAMES[getDay(selectedDate)];
        
        // A. Check Calendar Overrides (calendarSlots) first
        let baseSlots: { from: string, to: string }[] = [];
        const hasOverrides = availabilityData.calendarSlots && availabilityData.calendarSlots[dateKey];
        
        if (hasOverrides && Array.isArray(availabilityData.calendarSlots[dateKey]) && availabilityData.calendarSlots[dateKey].length > 0) {
            baseSlots = availabilityData.calendarSlots[dateKey];
        } else {
            // B. Fallback to Weekly Routine
            const routine = availabilityData.routine && availabilityData.routine[dayOfWeek];
            if (routine && routine.active) {
                // weeklyRoutine is usually a single range { from, to }
                // We split it into 1-hour slots matching our TIME_SLOTS
                const { from, to } = routine;
                baseSlots = TIME_SLOTS
                    .filter(slot => slot >= from && slot < to)
                    .map(slot => {
                        const h = parseInt(slot.split(':')[0]);
                        return { from: slot, to: `${(h + 1).toString().padStart(2, '0')}:00` };
                    });
            }
        }

        // C. Filter out Booked Jobs
        // jobs might be for a specific date or timestamp
        const dateJobs = bookedJobs.filter(job => {
            const jobDate = job.date ? format(new Date(job.date), 'yyyy-MM-dd') : null;
            const jobTime = job.time; // "HH:mm"
            return jobDate === dateKey;
        });

        const finalSlots = baseSlots.filter(slot => {
            // Check if any job overlaps with this slot
            const isBooked = dateJobs.some(job => {
                // If job has a time, check for overlap
                if (job.time) {
                    return job.time === slot.from;
                }
                return false;
            });
            
            // Also filter out past slots for today
            if (isToday(selectedDate)) {
                const now = new Date();
                const [h, m] = slot.from.split(':').map(Number);
                const slotTime = setMinutes(setHours(startOfDay(now), h), m);
                return !isBooked && isAfter(slotTime, now);
            }

            return !isBooked;
        });

        return finalSlots;
    }, [selectedDate, availabilityData, bookedJobs]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-12 h-12 border-4 border-[#00A082] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">{t({ en: 'Loading availability...', fr: 'Chargement des dispos...' })}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-6 w-full">
            {/* Horizontal Date Picker */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[17px] font-black text-black">
                        {t({ en: 'Select Date', fr: 'Choisir une date', ar: 'اختر التاريخ' })}
                    </h3>
                    <div className="flex items-center gap-1 text-[#00A082]">
                        <Calendar size={16} />
                        <span className="text-[14px] font-bold">
                            {format(selectedDate, 'MMMM yyyy', { locale })}
                        </span>
                    </div>
                </div>

                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
                    {nextDays.map((day, i) => {
                        const isSelected = isSameDay(day, selectedDate);
                        const isTodayDay = isToday(day);
                        return (
                            <button
                                key={i}
                                onClick={() => setSelectedDate(day)}
                                className={cn(
                                    "flex flex-col items-center justify-center min-w-[65px] h-[85px] rounded-[22px] border-2 transition-all",
                                    isSelected 
                                        ? "bg-[#00A082] border-[#00A082] text-white shadow-lg shadow-[#00A082]/20" 
                                        : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200"
                                )}
                            >
                                <span className={cn("text-[11px] font-black uppercase tracking-tighter mb-1", isSelected ? "text-white/70" : "text-neutral-400")}>
                                    {format(day, 'EEE', { locale })}
                                </span>
                                <span className={cn("text-[20px] font-[1000] leading-none", isSelected ? "text-white" : "text-black")}>
                                    {format(day, 'd')}
                                </span>
                                {isTodayDay && !isSelected && (
                                    <div className="w-1.5 h-1.5 bg-[#00A082] rounded-full mt-1.5" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time Slots Picker */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[17px] font-black text-black">
                        {t({ en: 'Available Times', fr: 'Heures disponibles', ar: 'الأوقات المتاحة' })}
                    </h3>
                    <div className="flex items-center gap-1 text-neutral-400">
                        <Clock size={16} />
                        <span className="text-[14px] font-bold">
                            {format(selectedDate, 'EEEE d MMM', { locale })}
                        </span>
                    </div>
                </div>

                {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                        {availableSlots.map((slot, i) => {
                            const isSelected = initialSelectedTime === slot.from && isSameDay(selectedDate, initialSelectedDate || new Date(0));
                            return (
                                <button
                                    key={i}
                                    onClick={() => onSelect(selectedDate, slot.from)}
                                    className={cn(
                                        "flex flex-col items-center justify-center py-4 rounded-[20px] border-2 transition-all gap-1",
                                        isSelected
                                            ? "bg-[#00A082]/5 border-[#00A082] shadow-sm"
                                            : "bg-white border-neutral-100 hover:border-neutral-200"
                                    )}
                                >
                                    <span className={cn("text-[17px] font-black", isSelected ? "text-[#00A082]" : "text-black")}>
                                        {slot.from}
                                    </span>
                                    {isSelected && (
                                        <div className="flex items-center gap-1 text-[#00A082]">
                                            <Check size={12} strokeWidth={4} />
                                            <span className="text-[10px] font-black uppercase tracking-tighter">{t({ en: 'Selected', fr: 'Sélectionné' })}</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-6 bg-neutral-50 rounded-[30px] border border-dashed border-neutral-200 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                            <AlertCircle size={24} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[16px] font-black text-black">
                                {t({ en: 'No availability today', fr: 'Pas de dispo aujourd\'hui', ar: 'لا توجد مواعيد متاحة اليوم' })}
                            </p>
                            <p className="text-[13px] font-bold text-neutral-400 leading-tight">
                                {t({ 
                                    en: 'Try selecting another date or check back later.', 
                                    fr: 'Essayez une autre date ou revenez plus tard.',
                                    ar: 'حاول اختيار تاريخ آخر أو عد لاحقاً'
                                })}
                            </p>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="p-5 bg-[#FFC244]/10 rounded-[24px] border border-[#FFC244]/20 flex items-start gap-3">
                <AlertCircle className="text-[#FFC244] shrink-0 mt-0.5" size={18} />
                <p className="text-[13px] font-bold text-neutral-600 leading-tight">
                    {t({
                        en: "The provider's schedule is updated in real-time. Please pick a slot that suits your needs.",
                        fr: "Le planning du prestataire est mis à jour en temps réel. Veuillez choisir un créneau qui vous convient."
                    })}
                </p>
            </div>
        </div>
    );
}
