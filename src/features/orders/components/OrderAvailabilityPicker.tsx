"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ChevronLeft, ChevronRight, AlertCircle, Check, X, CheckCircle2 } from 'lucide-react';
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
    onSelect: (slots: { date: Date, time: string }[]) => void;
    selectedSlots: { date: Date, time: string }[];
}

const DAYS_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const TIME_SLOTS = [
    "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
    "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"
];

export default function OrderAvailabilityPicker({
    bricolerId,
    onSelect,
    selectedSlots = []
}: OrderAvailabilityPickerProps) {
    const { t, language } = useLanguage();
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
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
                const { from, to } = routine;
                baseSlots = TIME_SLOTS
                    .filter(slot => slot >= from && slot < to)
                    .map((slot) => {
                        const [h, m] = slot.split(':').map(Number);
                        let nextM = m + 30;
                        let nextH = h;
                        if (nextM >= 60) {
                            nextM = 0;
                            nextH += 1;
                        }
                        const toTime = `${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`;
                        return { from: slot, to: toTime };
                    });
            }
        }

        // C. Filter out Booked Jobs
        const dateJobs = bookedJobs.filter(job => {
            const jobDate = job.date ? (typeof job.date === 'string' ? job.date : format(new Date(job.date), 'yyyy-MM-dd')) : null;
            return jobDate === dateKey;
        });

        const finalSlots = baseSlots.filter(slot => {
            // Check if any job overlaps with this slot
            const isBooked = dateJobs.some(job => {
                if (!job.time) return false;

                const [jh, jm] = job.time.split(':').map(Number);
                const jobStartMinutes = jh * 60 + jm;

                const durationHours = job.estimatedDuration || job.duration || 1;
                const jobEndMinutes = jobStartMinutes + (durationHours * 60);

                const [sh, sm] = slot.from.split(':').map(Number);
                const slotStartMinutes = sh * 60 + sm;

                return slotStartMinutes >= jobStartMinutes && slotStartMinutes < jobEndMinutes;
            });

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

    const [showAllSlots, setShowAllSlots] = useState(false);
    const INITIAL_SLOTS_LIMIT = 5;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-12 h-12 border-4 border-[#219178] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">{t({ en: 'Loading availability...', fr: 'Chargement des dispos...' })}</p>
            </div>
        );
    }

    const displayedSlots = showAllSlots ? availableSlots : availableSlots.slice(0, INITIAL_SLOTS_LIMIT);
    const hasMoreSlots = availableSlots.length > INITIAL_SLOTS_LIMIT;

    const handleSlotToggle = (date: Date, time: string) => {
        const normalizedDate = startOfDay(date);
        const exists = selectedSlots.find(s => isSameDay(s.date, normalizedDate) && s.time === time);

        let newSlots;
        if (exists) {
            newSlots = selectedSlots.filter(s => !(isSameDay(s.date, normalizedDate) && s.time === time));
        } else {
            // Only one time slot per day: remove any other slot selected for the same day
            const otherDaysSlots = selectedSlots.filter(s => !isSameDay(s.date, normalizedDate));
            newSlots = [...otherDaysSlots, { date: normalizedDate, time }];
        }
        onSelect(newSlots);
    };

    return (
        <div className="flex flex-col space-y-8 w-full mt-2">
            {/* Horizontal Date Picker */}
            <div className="space-y-6">
                <h3 className="text-[17px] font-black text-black">Select date</h3>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
                    {nextDays.map((day, i) => {
                        const hasSelectedInDay = selectedSlots.some(s => isSameDay(s.date, day));
                        const isCurrentViewing = isSameDay(day, selectedDate);
                        const isTodayDay = isToday(day);
                        const isTomorrowDay = isSameDay(day, addDays(startOfToday(), 1));

                        let label = format(day, 'EEEE', { locale });
                        if (isTodayDay) label = t({ en: 'Today', fr: 'Aujourd\'hui', ar: 'اليوم' });
                        else if (isTomorrowDay) label = t({ en: 'Tomorrow', fr: 'Demain', ar: 'غداً' });

                        return (
                            <button
                                key={i}
                                onClick={() => setSelectedDate(day)}
                                className={cn(
                                    "flex flex-col items-start justify-center min-w-[130px] p-4 rounded-[10px] border-2 transition-all relative group",
                                    isCurrentViewing
                                        ? "bg-white border-black"
                                        : (hasSelectedInDay ? "bg-white border-[#219178]/30" : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200")
                                )}
                            >
                                {/* Selection Badge */}
                                {hasSelectedInDay && !isCurrentViewing && (
                                    <div className="absolute -top-2 -right-2 bg-[#219178] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                        {selectedSlots.filter(s => isSameDay(s.date, day)).length}
                                    </div>
                                )}

                                {/* Radio Indicator in Top Right (Small dot if day has any selections) */}
                                <div className="absolute top-3 right-3">
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                        isCurrentViewing ? "border-black" : (hasSelectedInDay ? "border-[#219178]" : "border-neutral-200")
                                    )}>
                                        {(isCurrentViewing || hasSelectedInDay) && (
                                            <div className={cn(
                                                "w-2.5 h-2.5 rounded-full",
                                                isCurrentViewing ? "bg-black" : "bg-[#219178]"
                                            )} />
                                        )}
                                    </div>
                                </div>

                                <span className={cn("text-[14px] font-bold capitalize mb-1", isCurrentViewing ? "text-black" : (hasSelectedInDay ? "text-[#219178]" : "text-neutral-500"))}>
                                    {label}
                                </span>
                                <span className={cn("text-[13px] font-medium", isCurrentViewing ? "text-neutral-600" : (hasSelectedInDay ? "text-[#219178]/70" : "text-neutral-400"))}>
                                    {format(day, 'd MMM', { locale })}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time Slots Picker */}
            <div className="space-y-6">
                <h3 className="text-[17px] font-black text-black">Select time</h3>

                {availableSlots.length > 0 ? (
                    <div className="flex flex-col border-t border-neutral-100">
                        {displayedSlots.map((slot, i) => {
                            const isSelected = selectedSlots.some(s => isSameDay(s.date, selectedDate) && s.time === slot.from);
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleSlotToggle(selectedDate, slot.from)}
                                    className={cn(
                                        "flex items-center justify-between py-6 border-b border-neutral-100 transition-all group active:bg-neutral-50 px-2",
                                    )}
                                >
                                    <span className={cn("text-[16px] font-bold", isSelected ? "text-[#219178]" : "text-neutral-900")}>
                                        {slot.from} - {slot.to}
                                    </span>

                                    {/* Checkbox/Radio Indicator */}
                                    <div className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                        isSelected ? "border-[#219178] bg-[#219178]" : "border-neutral-200 group-hover:border-neutral-300"
                                    )}>
                                        {isSelected && <Check size={14} className="text-white" strokeWidth={4} />}
                                    </div>
                                </button>
                            );
                        })}

                        {hasMoreSlots && (
                            <button
                                onClick={() => setShowAllSlots(!showAllSlots)}
                                className="w-full py-6 text-center text-[15px] font-black text-[#219178] hover:bg-neutral-50 transition-all border-b border-neutral-100 flex items-center justify-center gap-2"
                            >
                                {showAllSlots ? (
                                    <>
                                        {t({ en: 'See less', fr: 'Voir moins', ar: 'عرض أقل' })}
                                        <ChevronRight className="rotate-[-90deg]" size={18} />
                                    </>
                                ) : (
                                    <>
                                        {t({ en: 'See more options', fr: 'Voir plus d\'options', ar: 'عرض المزيد' })}
                                        <ChevronRight className="rotate-[90deg]" size={18} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-6 rounded-[10px] border border-dashed border-neutral-200 text-center space-y-4">

                        <div className="space-y-1">
                            <p className="text-[17px] font-black text-black">
                                {t({ en: 'No availability', fr: 'Pas de dispo', ar: 'لا توجد مواعيد متاحة' })}
                            </p>
                            <p className="text-[14px] font-Light text-neutral-400 leading-tight max-w-[300px] mx-auto">
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

            {/* Selection Summary */}
            {selectedSlots.length > 0 && (
                <div className="bg-[#FFFFFF] p-4 rounded-[12px] border border-[#000000]/10">
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="text-[#219178]" size={16} />
                        <span className="text-[14px] font-black text-[#219178]">
                            {selectedSlots.length} {selectedSlots.length > 1 ? t({ en: 'Missions selected', fr: 'Missions sélectionnées', ar: 'مهام مختارة' }) : t({ en: 'Mission selected', fr: 'Mission sélectionnée', ar: 'مهمة مختارة' })}
                        </span>
                    </div>
                    <div className="space-y-2 max-h-[120px] overflow-y-auto no-scrollbar">
                        {selectedSlots.map((slot, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[13px] font-bold text-[#000000] bg-[#000000]/3 px-3 py-2 rounded-lg">
                                <span>
                                    {format(slot.date, 'd MMM', { locale })} • {slot.time}
                                </span>
                                <button
                                    onClick={() => handleSlotToggle(slot.date, slot.time)}
                                    className="p-1 hover:bg-red-50 rounded-full transition-all text-red-500"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
