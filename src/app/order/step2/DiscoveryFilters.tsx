"use client";

import React, { useState } from 'react';
import { MapPin, Clock, ChevronDown, Calendar, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isTomorrow, startOfToday } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

interface DiscoveryFiltersProps {
  discoveryLocation: { address: string; area?: string; city?: string } | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  onChangeLocation: () => void;
  onSelectTime: (date: Date | null, time: string | null) => void;
}

export default function DiscoveryFilters({
  discoveryLocation,
  selectedDate,
  selectedTime,
  onChangeLocation,
  onSelectTime
}: DiscoveryFiltersProps) {
  const { t, language } = useLanguage();
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const locale = language === 'fr' ? fr : enUS;

  const displayArea = discoveryLocation?.area || discoveryLocation?.city || discoveryLocation?.address?.split(',')[0] || t({ en: 'Select Location', fr: 'Choisir le lieu' });

  const displayTime = selectedDate && selectedTime
    ? `${isToday(selectedDate) ? t({ en: 'Today', fr: 'Aujourd\'hui' }) : format(selectedDate, 'MMM d', { locale })} • ${selectedTime}`
    : t({ en: 'Anytime', fr: 'À tout moment' });

  // Quick time options for the picker
  const timeOptions = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
  // Show 14 days ahead for better choice
  const dateOptions = Array.from({ length: 14 }, (_, i) => addDays(startOfToday(), i));

  function addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {/* Location Pill */}
        <button
          onClick={onChangeLocation}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-full shadow-sm hover:border-[#01A083] transition-all whitespace-nowrap group active:scale-95"
        >
          <div className="w-5 h-5 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-[#01A083]/10 group-hover:text-[#01A083] flex-shrink-0">
            <MapPin size={12} />
          </div>
          <span className="text-[14px] font-semibold text-neutral-700 truncate max-w-[80px]">
            {displayArea}
          </span>
          <ChevronDown size={14} className="text-neutral-400 flex-shrink-0" />
        </button>

        {/* Time Pill */}
        <button
          onClick={() => setIsTimePickerOpen(true)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full shadow-sm border transition-all whitespace-nowrap group active:scale-95",
            selectedDate ? "bg-black border-black text-white" : "bg-white border-neutral-200 text-neutral-700"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
            selectedDate ? "bg-white/10 text-white" : "bg-neutral-50 text-neutral-400"
          )}>
            <Clock size={12} />
          </div>
          <span className="text-[14px] font-semibold truncate max-w-[100px]">
            {displayTime}
          </span>
          <ChevronDown size={14} className={cn("flex-shrink-0", selectedDate ? "text-white/70" : "text-neutral-400")} />
        </button>
      </div>

      {/* Mini Time Picker Sheet */}
      <AnimatePresence>
        {isTimePickerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTimePickerOpen(false)}
              className="fixed inset-0 bg-black/50 z-[9000] backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[9001] px-6 pt-3 pb-10"
            >
              <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-8" />

              <div className="flex items-start justify-between mb-8 gap-4">
                <h3 className="text-[22px] font-bold text-neutral-900 tracking-tight leading-tight flex-1">
                  {t({ en: 'When do you need help?', fr: 'Quand avez-vous besoin d\'aide ?' })}
                </h3>
                <button
                  onClick={() => {
                    onSelectTime(null, null);
                  }}
                  className="text-[15px] font-bold text-[#01A083] hover:opacity-70 transition-opacity whitespace-nowrap pt-1"
                >
                  {t({ en: 'Reset', fr: 'Réinitialiser' })}
                </button>
              </div>

              <div className="space-y-8">
                {/* Date Selection - Airbnb Style Horizontal List */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-6 px-6">
                  {dateOptions.map((date) => {
                    const isSel = selectedDate && isSameDay(date, selectedDate);
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => onSelectTime(date, selectedTime || '10:00')}
                        className={cn(
                          "flex flex-col items-center justify-center min-w-[56px] h-[76px] rounded-2xl transition-all border",
                          isSel ? "border-[#000000] bg-[#FFB700] text-black" : "border-neutral-200 bg-white hover:border-neutral-400"
                        )}
                      >
                        <span className={cn("text-[10px] font-bold uppercase tracking-wider", isSel ? "text-black/60" : "text-neutral-500")}>
                          {isToday(date) ? t({ en: 'Today', fr: 'Auj.' }) : format(date, 'EEE', { locale })}
                        </span>
                        <span className={cn("text-lg font-bold mt-0.5", isSel ? "text-black" : "text-neutral-900")}>
                          {format(date, 'd')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Time Selection */}
                <div className="grid grid-cols-3 gap-3">
                  {timeOptions.map((time) => {
                    const isSel = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => onSelectTime(selectedDate || startOfToday(), time)}
                        className={cn(
                          "py-3 rounded-xl border-2 text-center font-bold transition-all",
                          isSel ? "border-[#000000] bg-[#FFB700] text-black" : "border-neutral-100 bg-neutral-50 text-neutral-700"
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setIsTimePickerOpen(false)}
                  className="w-full h-14 bg-[#FFB700] text-black rounded-full font-medium text-lg mt-4 transition-transform active:scale-95 "
                >
                  {t({ en: 'Show Available Bricolers', fr: 'Voir les Bricoleurs disponibles' })}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}
