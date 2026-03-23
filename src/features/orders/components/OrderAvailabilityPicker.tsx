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
        <div className="flex flex-col space-y-8 w-full mt-2">
            {/* Horizontal Date Picker */}
            <div className="space-y-5">
                <h3 className="text-[17px] font-black text-black">Select date</h3>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6">
                    {nextDays.map((day, i) => {
                        const isSelected = isSameDay(day, selectedDate);
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
                                    isSelected
                                        ? "bg-white border-black"
                                        : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200"
                                )}
                            >
                                {/* Radio Indicator in Top Right */}
                                <div className="absolute top-3 right-3">
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                        isSelected ? "border-[#00A082]" : "border-neutral-200"
                                    )}>
                                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#00A082]" />}
                                    </div>
                                </div>

                                <span className={cn("text-[14px] font-bold capitalize mb-1", isSelected ? "text-black" : "text-neutral-500")}>
                                    {label}
                                </span>
                                <span className={cn("text-[13px] font-medium", isSelected ? "text-neutral-600" : "text-neutral-400")}>
                                    {format(day, 'd MMM', { locale })}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time Slots Picker */}
            <div className="space-y-5">
                <h3 className="text-[17px] font-black text-black">Select time</h3>

                {availableSlots.length > 0 ? (
                    <div className="flex flex-col border-t border-neutral-100">
                        {availableSlots.map((slot, i) => {
                            const isSelected = initialSelectedTime === slot.from && isSameDay(selectedDate, initialSelectedDate || new Date(0));
                            return (
                                <button
                                    key={i}
                                    onClick={() => onSelect(selectedDate, slot.from)}
                                    className={cn(
                                        "flex items-center justify-between py-6 border-b border-neutral-100 transition-all group active:bg-neutral-50 px-2",
                                    )}
                                >
                                    <span className={cn("text-[16px] font-bold", isSelected ? "text-black" : "text-neutral-900")}>
                                        {slot.from} - {slot.to}
                                    </span>

                                    {/* Radio Indicator */}
                                    <div className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                        isSelected ? "border-[#00A082]" : "border-neutral-200 group-hover:border-neutral-300"
                                    )}>
                                        {isSelected && <div className="w-3 h-3 rounded-full bg-[#00A082]" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-6 rounded-[10px] border border-dashed border-neutral-200 text-center space-y-4">

                        <div className="space-y-1">
                            <p className="text-[17px] font-black text-black">
                                {t({ en: 'No availability', fr: 'Pas de dispo', ar: 'لا توجد مواعيد متاحة' })}
                            </p>
                            <p className="text-[14px] font-bold text-neutral-400 leading-tight max-w-[200px] mx-auto">
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
        </div>
    );
}
