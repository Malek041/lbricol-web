"use strict";

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Star, Check } from 'lucide-react';

interface HorizontalCalendarProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    highlightedDates?: string[]; // ISO Date strings of active jobs
    completedDates?: string[]; // ISO Date strings of past jobs
}

const HorizontalCalendar: React.FC<HorizontalCalendarProps> = ({
    selectedDate,
    onDateSelect,
    highlightedDates = [],
    completedDates = []
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Generate dates for the current month surrounding the selected date
    const getDates = () => {
        const dates = [];
        const start = new Date();
        start.setDate(start.getDate() - 10); // Show 10 days before today

        for (let i = 0; i < 31; i++) {
            const d = new Date(start); // Start from 'start'
            d.setDate(start.getDate() + i);
            dates.push(d);
        }
        return dates;
    };

    const dates = getDates();

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.toISOString().split('T')[0] === d2.toISOString().split('T')[0];
    };

    useEffect(() => {
        if (scrollRef.current) {
            const selectedEl = scrollRef.current.querySelector('[data-selected="true"]');
            if (selectedEl) {
                selectedEl.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
            }
        }
    }, [selectedDate]);

    const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    return (
        <div className="w-full">
            <div
                ref={scrollRef}
                className="flex overflow-x-auto no-scrollbar gap-4 px-6 py-4 scroll-smooth items-center"
                style={{
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                {dates.map((date, idx) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const isSelected = isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, new Date());
                    const isOccupied = highlightedDates.includes(dateStr);
                    const isCompleted = completedDates.includes(dateStr);

                    // Coin styling logic
                    // Occupied -> Gold Coin
                    // Completed -> Grey Coin
                    // Default -> White card

                    return (
                        <motion.button
                            key={idx}
                            data-selected={isSelected}
                            onClick={() => onDateSelect(date)}
                            whileTap={{ scale: 0.9 }}
                            className={cn(
                                "flex flex-col items-center justify-center min-w-[70px] h-[100px] rounded-full transition-all duration-300 relative border-2",
                                isOccupied
                                    ? "bg-gradient-to-br from-yellow-300 to-amber-500 border-yellow-600 shadow-[0_4px_12px_rgba(245,158,11,0.4)]"
                                    : isCompleted
                                        ? "bg-gradient-to-br from-neutral-200 to-neutral-400 border-neutral-400 shadow-sm"
                                        : isSelected
                                            ? "bg-white border-black shadow-[0_8px_16px_rgba(0,0,0,0.1)]"
                                            : "bg-white border-neutral-100 opacity-60"
                            )}
                        >
                            <span className={cn(
                                "text-[10px] font-black tracking-widest uppercase mb-1",
                                (isOccupied || isCompleted) ? "text-white/80" : "text-neutral-400"
                            )}>
                                {weekDays[date.getDay()]}
                            </span>
                            <span className={cn(
                                "text-[22px] font-black",
                                (isOccupied || isCompleted) ? "text-white drop-shadow-md" : "text-neutral-900"
                            )}>
                                {date.getDate()}
                            </span>

                            {/* Coin Shine / Icon */}
                            {isOccupied && (
                                <div className="absolute top-2 right-2">
                                    <Star size={10} className="text-white fill-white animate-pulse" />
                                </div>
                            )}
                            {isCompleted && (
                                <div className="absolute top-2 right-2">
                                    <Check size={10} className="text-white/80" strokeWidth={4} />
                                </div>
                            )}

                            {isToday && !isOccupied && !isCompleted && (
                                <div className="absolute bottom-3 w-1.5 h-1.5 rounded-full bg-black" />
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
};

export default HorizontalCalendar;
