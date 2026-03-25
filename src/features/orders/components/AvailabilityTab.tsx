"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Clock, 
    ChevronLeft, 
    Plus, 
    X 
} from 'lucide-react';
import { format, startOfDay, addDays } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { OrderDetails } from './OrderCard';

interface AvailabilityTabProps {
    userData: any;
    setUserData: React.Dispatch<React.SetStateAction<any>>;
    horizontalSelectedDate: Date;
    setHorizontalSelectedDate: (d: Date) => void;
    handleSaveSlotsManual: (dateKey: string, slots: any[]) => void;
    AVAILABILITY_SLOTS: any;
    TIME_SLOTS: string[];
    orders: OrderDetails[];
    showRoutineModal: boolean;
    setShowRoutineModal: (v: boolean) => void;
}

export default function AvailabilityTab({
    userData,
    setUserData,
    horizontalSelectedDate,
    setHorizontalSelectedDate,
    handleSaveSlotsManual,
    AVAILABILITY_SLOTS,
    TIME_SLOTS,
    orders,
    showRoutineModal,
    setShowRoutineModal
}: AvailabilityTabProps) {
    const { t, language } = useLanguage();
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const selectedDateStr = format(horizontalSelectedDate, 'yyyy-MM-dd');
    const [isAdding, setIsAdding] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [localSlots, setLocalSlots] = useState<any[]>([]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const savedSlots = useMemo(() => {
        const slots = userData?.calendarSlots?.[selectedDateStr] || [];
        const dayMissions = orders.filter(o => o.date === selectedDateStr && o.status !== 'cancelled');
        return slots.filter((slot: any) => {
            const slotStart = slot.from;
            return !dayMissions.some(order => {
                const missionFrom = order.time?.split('-')[0].trim() || "09:00";
                return missionFrom === slotStart;
            });
        });
    }, [userData?.calendarSlots, selectedDateStr, orders]);

    const getMonday = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + diff);
        return startOfDay(d);
    };

    const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(weekStart, i);
        return {
            date: d,
            dateStr: format(d, 'yyyy-MM-dd'),
            dayNum: format(d, 'd'),
            dayLabel: format(d, 'EEE')
        };
    });

    const bookedDates = useMemo(() => {
        const set = new Set<string>();
        orders.forEach(o => {
            if (o.date) set.add(o.date);
        });
        return set;
    }, [orders]);

    const weekLabel = `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`;

    const handleAllDay = () => {
        const allDaySlotsList = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
        const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
        const filteredAllDay = allDaySlotsList.filter(time => {
            if (selectedDateStr !== todayStr) return true;
            const [h, m] = time.split(':').map(Number);
            return (h * 60 + m) > (nowMins + 15);
        });
        const newSlots = filteredAllDay.map(time => ({
            from: time,
            to: TIME_SLOTS[TIME_SLOTS.indexOf(time) + 2] || time
        }));
        setLocalSlots(newSlots);
    };

    const handleProgram = () => {
        setUserData((p: any) => p ? { ...p, calendarSlots: { ...(p.calendarSlots || {}), [selectedDateStr]: localSlots } } : null);
        handleSaveSlotsManual(selectedDateStr, localSlots);
        setIsAdding(false);
    };

    const isTodaySelected = selectedDateStr === todayStr;
    const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();

    const hours = Array.from({ length: 15 }, (_, i) => 7 + i); // 7 AM to 9 PM

    const getTimePosition = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        const offsetHours = h - 7;
        const totalMins = offsetHours * 60 + m;
        return (totalMins / 60) * 100;
    };

    const getTimeHeight = (from: string, to: string) => {
        const start = getTimePosition(from);
        const end = getTimePosition(to);
        return Math.max(end - start, 50);
    };

    const handleDeleteSlot = async (slotToDelete: any) => {
        const newSlots = savedSlots.filter((s: any) => s.from !== slotToDelete.from);
        const updatedCalendarSlots = {
            ...(userData?.calendarSlots || {}),
            [selectedDateStr]: newSlots
        };

        setUserData((p: any) => p ? { ...p, calendarSlots: updatedCalendarSlots } : null);

        try {
            const providerId = userData?.id || auth.currentUser?.uid;
            if (!providerId) return;
            const providerRef = doc(db, 'bricolers', providerId);
            await updateDoc(providerRef, { calendarSlots: updatedCalendarSlots });
        } catch (error) {
            console.error("Error deleting slot:", error);
        }
    };

    return (
        <div className="flex flex-col bg-[#FAFAFA] h-full relative">
            <div className="bg-white border-b border-[#F5F5F5] px-4 pt-4 pb-4 flex-shrink-0 sticky top-0 z-30">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setWeekStart(prev => addDays(prev, -7))}
                        className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center active:bg-neutral-100 transition-colors"
                    >
                        <ChevronLeft size={20} className="text-black" />
                    </button>
                    
                    <div className="flex flex-col items-center">
                        <span className="text-[15px] font-black text-black tracking-tight">{weekLabel}</span>
                    </div>

                    <div className="flex items-center gap-2">
                         <button
                            onClick={() => setShowRoutineModal(true)}
                            className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center active:bg-neutral-100 transition-colors"
                            title={t({ en: 'Set Routine', fr: 'Définir routine' })}
                        >
                            <Clock size={18} className="text-black" />
                        </button>
                        <button
                            onClick={() => {
                                setLocalSlots(savedSlots);
                                setIsAdding(true);
                            }}
                            className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center active:bg-neutral-100 transition-colors"
                            title={t({ en: 'Add Availability', fr: 'Ajouter dispo' })}
                        >
                            <Plus size={20} className="text-black" />
                        </button>
                        <button
                            onClick={() => setWeekStart(prev => addDays(prev, 7))}
                            className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center active:bg-neutral-100 transition-colors"
                        >
                            <ChevronLeft size={20} className="text-black rotate-180" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {weekDays.map(day => {
                        const isTodayDay = day.dateStr === todayStr;
                        const isSelected = day.dateStr === selectedDateStr;
                        const hasJobs = bookedDates.has(day.dateStr);

                        return (
                            <button
                                key={day.dateStr}
                                onClick={() => {
                                    setHorizontalSelectedDate(day.date);
                                    setIsAdding(false);
                                }}
                                className={cn(
                                    "flex flex-col items-center py-3 rounded-2xl relative transition-all border",
                                    isSelected
                                        ? "bg-[#219178] border-[#219178]"
                                        : isTodayDay
                                            ? "bg-[#E6F7F4] border-[#E6F7F4]"
                                            : "bg-white border-transparent hover:border-neutral-100"
                                )}
                            >
                                <span className={cn("text-[10px] font-black uppercase tracking-wider mb-1", isSelected ? "text-white/70" : "text-neutral-400")}>
                                    {day.dayLabel}
                                </span>
                                <span className={cn("text-[18px] font-black", isSelected ? "text-white" : isTodayDay ? "text-[#219178]" : "text-black")}>
                                    {day.dayNum}
                                </span>
                                {hasJobs && !isSelected && (
                                    <div className="absolute top-1.5 right-1.5">
                                        <div className="w-1.5 h-1.5 bg-[#FFC244] rounded-full" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar relative bg-[#FAFAFA]">
                <div className="relative min-h-[1550px] w-full">
                    <div className="absolute inset-0 pt-6 px-0">
                        {hours.map((h) => (
                            <div key={h} className="flex h-[100px] border-b border-[#F0F0F0] group">
                                <div className="w-16 flex-none flex flex-col items-end justify-start pr-3 -mt-2.5">
                                    <span className="text-[11px] font-black text-neutral-400 uppercase tracking-tighter">
                                        {h === 12 ? '12 pm' : h > 12 ? `${h - 12} pm` : `${h} am`}
                                    </span>
                                </div>
                                <div className="flex-1 border-l border-[#F0F0F0] relative">
                                    <div className="absolute top-[50px] left-0 right-0 border-t border-[#FAFAFA] border-dashed" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="absolute inset-0 pt-6 left-16">
                        <AnimatePresence>
                            {savedSlots.map((slot: any, idx: number) => (
                                <motion.div
                                    key={`${slot.from}-${idx}`}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute left-2 right-4 rounded-xl bg-[#E6F7F4] border-l-4 border-[#219178] p-3 shadow-sm z-10 group"
                                    style={{
                                        top: getTimePosition(slot.from) + 2,
                                        height: getTimeHeight(slot.from, slot.to) - 4
                                    }}
                                >
                                    <div className="flex flex-col h-full relative">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[14px] font-black text-[#219178]">{t({ en: 'Available', fr: 'Disponible', ar: 'متاح' })}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSlot(slot);
                                                }}
                                                className="w-6 h-6 rounded-full bg-white/50 flex items-center justify-center text-[#219178] hover:bg-[#219178] hover:text-white transition-all active:scale-90"
                                            >
                                                <X size={14} strokeWidth={3} />
                                            </button>
                                        </div>
                                        <span className="text-[12px] font-bold text-[#219178]/80 mt-1">
                                            {slot.from} - {slot.to}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <button
                onClick={() => {
                    setLocalSlots(savedSlots);
                    setIsAdding(true);
                }}
                className="fixed bottom-24 right-6 w-14 h-14 bg-[#0CB380] rounded-full shadow-2xl flex items-center justify-center text-white active:scale-95 transition-transform z-50"
            >
                <Plus size={32} strokeWidth={3} />
            </button>

            <AnimatePresence>
                {isAdding && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAdding(false)}
                            className="fixed inset-0 bg-black/40 z-[1100] backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 pb-12 z-[1101] max-h-[85vh] overflow-y-auto no-scrollbar"
                        >
                            <div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto mb-6" />

                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[22px] font-black text-black">{t({ en: 'New Availability', fr: 'Nouvelle disponibilité', ar: 'جاهزية جديدة' })}</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={async () => {
                                            const updatedCalendarSlots = {
                                                ...(userData?.calendarSlots || {}),
                                                [selectedDateStr]: []
                                            };
                                            setUserData((p: any) => p ? { ...p, calendarSlots: updatedCalendarSlots } : null);
                                            try {
                                                const providerId = userData?.id || auth.currentUser?.uid;
                                                if (providerId) {
                                                    const providerRef = doc(db, 'bricolers', providerId);
                                                    await updateDoc(providerRef, { calendarSlots: updatedCalendarSlots });
                                                }
                                            } catch (e) {
                                                console.error("Error clearing slots:", e);
                                            }
                                            setLocalSlots([]);
                                        }}
                                        className="px-4 py-2 bg-red-50 text-red-500 text-[14px] font-black rounded-xl border border-red-100"
                                    >
                                        {t({ en: 'Clear Day', fr: 'Vider le jour', ar: 'مسح اليوم' })}
                                    </button>
                                    <button
                                        onClick={handleAllDay}
                                        className="px-4 py-2 bg-[#E6F7F4] text-[#219178] text-[14px] font-black rounded-xl"
                                    >
                                        {t({ en: 'All day', fr: 'Toute la journée', ar: 'طوال اليوم' })}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {(Object.entries(AVAILABILITY_SLOTS) as [string, string[]][]).map(([category, slots]) => (
                                    <div key={category} className="space-y-4">
                                        <h4 className="text-[12px] font-black text-neutral-400 uppercase tracking-widest text-left rtl:text-right">
                                            {t({
                                                en: category,
                                                fr: category === 'MORNING' ? 'MATIN' : category === 'AFTERNOON' ? 'APRÈS-MIDI' : 'SOIR',
                                                ar: category === 'MORNING' ? 'الصباح' : category === 'AFTERNOON' ? 'الزوال' : 'المساء'
                                            })}
                                        </h4>
                                        <div className="grid grid-cols-3 gap-2">
                                            {slots.map((time) => {
                                                const isSelected = localSlots.some((s: any) => s.from === time);
                                                const [h, m] = time.split(':').map(Number);
                                                const isPast = isTodaySelected && (h * 60 + m) <= (nowMins + 15);

                                                return (
                                                    <button
                                                        key={time}
                                                        disabled={isPast}
                                                        onClick={() => {
                                                            const newSlots = isSelected
                                                                ? localSlots.filter((s: any) => s.from !== time)
                                                                : [...localSlots, { from: time, to: TIME_SLOTS[TIME_SLOTS.indexOf(time) + 2] || time }].sort((a, b) => a.from.localeCompare(b.from));
                                                            setLocalSlots(newSlots);
                                                        }}
                                                        className={cn(
                                                            "h-12 rounded-xl border flex items-center justify-center text-[14px] font-black transition-all",
                                                            isSelected
                                                                ? "bg-[#219178] border-[#219178] text-white"
                                                                : isPast
                                                                    ? "bg-neutral-50 border-neutral-100 text-neutral-300 opacity-50"
                                                                    : "bg-white border-[#F0F0F0] text-black"
                                                        )}
                                                    >
                                                        {time}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-8 pb-10">
                                <button
                                    onClick={handleProgram}
                                    className="w-full py-4 bg-[#219178] text-white rounded-2xl text-[18px] font-black shadow-lg shadow-[#219178]/20 active:scale-95 transition-transform"
                                >
                                    {t({ en: 'Save Availability', fr: 'Enregistrer la disponibilité', ar: 'حفظ الجاهزية' })}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
