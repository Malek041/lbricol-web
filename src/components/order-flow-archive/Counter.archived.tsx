// @ts-nocheck
// ARCHIVED — do not import this file in active pages.
// Extracted from: src/features/orders/components/OrderSubmissionFlow.tsx (March 2026)
// Use as reference when rebuilding the order flow from scratch.
//
// NOTE: The numeric stepper/counter was implemented inline as a horizontal swipe 
// "day counter" in OrderSubmissionFlow for services like Cleaning (rooms), 
// Private Driver (days), Electricity (# of units), etc.
// This archive reconstructs the pattern.

"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CounterOption {
    id: string;
    duration: number;
    label: { en: string; fr: string; ar?: string };
    subLabel?: { en: string; fr: string; ar?: string };
    estTime: { en: string; fr: string; ar?: string };
}

interface CounterProps {
    options: CounterOption[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    title: string;
    swipeText?: string;
    language?: string;
}

/**
 * Swipeable horizontal numeric counter.
 * Used for services that count rooms, days, units, etc.
 * E.g.: Cleaning (1-12 rooms), Private Driver (0.5-30 days), Electricity (EV chargers), etc.
 */
const Counter: React.FC<CounterProps> = ({ options, selectedId, onSelect, title, swipeText, language = 'en' }) => {
    const selectedIndex = options.findIndex(o => o.id === selectedId);
    const current = options[selectedIndex] || options[0];
    const isRTL = language === 'ar';

    const handlePrev = () => {
        if (selectedIndex > 0) onSelect(options[selectedIndex - 1].id);
    };

    const handleNext = () => {
        if (selectedIndex < options.length - 1) onSelect(options[selectedIndex + 1].id);
    };

    const t = (obj: { en: string; fr: string; ar?: string }) => {
        if (language === 'fr') return obj.fr;
        if (language === 'ar') return obj.ar || obj.en;
        return obj.en;
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <p className="text-[15px] font-bold text-neutral-500 text-center">{swipeText}</p>

            <div className="flex items-center gap-6 w-full justify-center">
                <button
                    onClick={handlePrev}
                    disabled={selectedIndex <= 0}
                    className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        selectedIndex > 0
                            ? "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 active:scale-95"
                            : "bg-neutral-50 text-neutral-300 cursor-not-allowed"
                    )}
                >
                    <ChevronLeft size={20} strokeWidth={3} />
                </button>

                <motion.div
                    key={current?.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                    className="flex flex-col items-center gap-1 min-w-[120px]"
                >
                    <span className="text-[64px] font-black text-neutral-900 leading-none">
                        {current ? t(current.label) : '-'}
                    </span>
                    {current?.subLabel && (
                        <span className="text-[13px] font-black text-neutral-400 uppercase tracking-widest">
                            {t(current.subLabel)}
                        </span>
                    )}
                    {current?.estTime && (
                        <span className="text-[12px] font-bold text-[#01A083] mt-1">
                            {t(current.estTime)}
                        </span>
                    )}
                </motion.div>

                <button
                    onClick={handleNext}
                    disabled={selectedIndex >= options.length - 1}
                    className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                        selectedIndex < options.length - 1
                            ? "bg-neutral-900 text-white hover:bg-neutral-800 active:scale-95"
                            : "bg-neutral-50 text-neutral-300 cursor-not-allowed"
                    )}
                >
                    <ChevronRight size={20} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
};

export default Counter;
