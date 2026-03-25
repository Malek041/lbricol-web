// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, Info } from 'lucide-react';
import { format, addDays, startOfToday, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isPast, isToday } from 'date-fns';
import { enUS, fr, arMA } from 'date-fns/locale';
import { useLanguage } from '@/context/LanguageContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';

interface AvailabilityCalendarViewProps {
    bricolerId: string;
    bricolerName: string;
    onClose: () => void;
    collectionName?: string; // 'bricolers' or 'users'
}

const TIMES = [
    "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];

const AvailabilityCalendarView: React.FC<AvailabilityCalendarViewProps> = ({
    bricolerId, bricolerName, onClose, collectionName = 'bricolers'
}) => {
    const { t, language } = useLanguage();
    const dateLocale = language === 'ar' ? arMA : (language === 'fr' ? fr : enUS);
    const [selectedDate, setSelectedDate] = useState(startOfToday());
    const [availability, setAvailability] = useState<Record<string, { from: string; to: string }[]>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchAvailability = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, collectionName, bricolerId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setAvailability(docSnap.data().calendarSlots || {});
                }
            } catch (err) {
                console.error("Error fetching availability:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAvailability();
    }, [bricolerId, collectionName]);

    const handleToggleSlot = (time: string) => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const currentSlots = availability[dateKey] || [];
        const exists = currentSlots.some(s => s.from === time);

        let newSlots;
        if (exists) {
            newSlots = currentSlots.filter(s => s.from !== time);
        } else {
            // Very simple: each slot is 1 hour
            const parts = time.split(':');
            const h = parseInt(parts[0]);
            const toTime = `${(h + 1).toString().padStart(2, '0')}:${parts[1]}`;
            newSlots = [...currentSlots, { from: time, to: toTime }].sort((a, b) => a.from.localeCompare(b.from));
        }

        setAvailability(prev => ({
            ...prev,
            [dateKey]: newSlots
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const docRef = doc(db, collectionName, bricolerId);
            await updateDoc(docRef, {
                calendarSlots: availability
            });
            onClose();
        } catch (err) {
            console.error("Error saving availability:", err);
            alert("Failed to save availability.");
        } finally {
            setSaving(false);
        }
    };

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const daySlots = availability[dateKey] || [];

    // Calendar generation
    const [viewDate, setViewDate] = useState(startOfToday());
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col"
        >
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-white sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 -ml-2 hover:bg-neutral-100 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-black">{t({ en: 'Availability Schedule', fr: 'Planning de disponibilité' })}</h2>
                        <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{bricolerName}</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 bg-[#219178] text-white rounded-2xl font-black text-sm uppercase tracking-wider disabled:opacity-50 shadow-lg shadow-[#219178]/20 active:scale-95 transition-all"
                >
                    {saving ? t({ en: 'Saving...', fr: 'Enregistrement...' }) : t({ en: 'Save Changes', fr: 'Enregistrer' })}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-20">
                <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-10">

                    {/* Left Side: Calendar */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black">{format(viewDate, 'MMMM yyyy', { locale: dateLocale })}</h3>
                            <div className="flex gap-2">
                                <button onClick={() => setViewDate(prev => addDays(prev, -30))} className="p-2 border rounded-xl hover:bg-neutral-50"><ChevronLeft size={20} /></button>
                                <button onClick={() => setViewDate(prev => addDays(prev, 30))} className="p-2 border rounded-xl hover:bg-neutral-50"><ChevronRight size={20} /></button>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {t({
                                en: 'S,M,T,W,T,F,S',
                                fr: 'D,L,M,M,J,V,S',
                                ar: 'أ,ن,ث,ر,خ,ج,س'
                            }).split(',').map((d, i) => (
                                <div key={i} className="text-center text-[10px] font-black text-neutral-400 py-2 uppercase">{d}</div>
                            ))}
                            {days.map((day, idx) => {
                                const isSel = isSameDay(day, selectedDate);
                                const isPastDay = isPast(day) && !isToday(day);
                                const hasSlots = (availability[format(day, 'yyyy-MM-dd')] || []).length > 0;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedDate(day)}
                                        className={cn(
                                            "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border-2",
                                            isSel ? "border-[#008C74] bg-[#008C74]/5" : "border-transparent",
                                            isPastDay ? "opacity-30 pointer-events-none" : "hover:border-neutral-200"
                                        )}
                                    >
                                        <span className={cn("text-sm font-bold", isSel ? "text-[#008C74]" : "text-black")}>
                                            {format(day, 'd')}
                                        </span>
                                        {hasSlots && (
                                            <div className="absolute bottom-1 w-1 h-1 bg-[#219178] rounded-full" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="p-6 bg-neutral-50 rounded-[32px] border border-neutral-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Info size={16} />
                                </div>
                                <h4 className="text-sm font-black uppercase tracking-wider text-neutral-600">{t({ en: 'Pro Tip', fr: 'Conseil' })}</h4>
                            </div>
                            <p className="text-xs font-bold text-neutral-400 leading-relaxed">
                                {t({
                                    en: 'Select a date on the calendar, then toggle the working hours on the right side. Don\'t forget to save your changes!',
                                    fr: 'Sélectionnez une date sur le calendrier, puis activez les heures de travail sur le côté droit. N\'oubliez pas d\'enregistrer vos modifications !'
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Right Side: Slots */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <h3 className="text-lg font-black">
                                    {format(selectedDate, 'EEEE, MMM d', { locale: dateLocale })}
                                </h3>
                                <button
                                    onClick={() => {
                                        const dateKey = format(selectedDate, 'yyyy-MM-dd');
                                        setAvailability(prev => ({
                                            ...prev,
                                            [dateKey]: []
                                        }));
                                    }}
                                    className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest mt-1 text-left active:scale-95 transition-all"
                                >
                                    {t({ en: 'Clear Day', fr: 'Vider le jour', ar: 'مسح اليوم' })}
                                </button>
                            </div>
                            <span className="text-xs font-black text-[#219178] uppercase tracking-widest bg-[#E6F6F2] px-3 py-1 rounded-full">
                                {daySlots.length} {t({ en: 'Slots Active', fr: 'Créneaux actifs' })}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {TIMES.map((time) => {
                                const isActive = daySlots.some(s => s.from === time);
                                return (
                                    <button
                                        key={time}
                                        onClick={() => handleToggleSlot(time)}
                                        className={cn(
                                            "py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all",
                                            isActive
                                                ? "border-[#219178] bg-[#219178] text-white shadow-lg shadow-[#219178]/20"
                                                : "border-neutral-100 bg-white text-neutral-400 hover:border-neutral-300"
                                        )}
                                    >
                                        <span className="text-lg font-black">{time}</span>
                                        {isActive && <Check size={14} strokeWidth={4} />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </motion.div>
    );
};

export default AvailabilityCalendarView;
