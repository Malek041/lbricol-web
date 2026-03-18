// ARCHIVED — do not import this file in active pages.
// Extracted from: src/features/orders/components/OrderSubmissionFlow.tsx step3-datetime (March 2026)
// Use as reference when rebuilding the order flow from scratch.

"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

interface TimeSlotPickerProps {
    selectedDate: string | null;
    selectedTime: string | null;
    onSelectTime: (time: string) => void;
    slots?: string[];
}

/**
 * Time slot grid shown after picking a date in step 3 of the order flow.
 * Renders a 3-column grid of time slots (default: 08:00, 10:00, 12:00, 14:00, 16:00, 18:00).
 */
const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
    selectedDate,
    selectedTime,
    onSelectTime,
    slots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00']
}) => {
    if (!selectedDate) return null;

    return (
        <div className="grid grid-cols-3 gap-2">
            {slots.map(slot => (
                <button
                    key={slot}
                    onClick={() => onSelectTime(slot)}
                    className={cn(
                        "py-4 rounded-2xl border-2 font-black transition-all",
                        selectedTime === slot
                            ? "border-[#00927C] bg-[#00927C] text-white"
                            : "border-neutral-100 text-neutral-600 bg-white"
                    )}
                >
                    {slot}
                </button>
            ))}
        </div>
    );
};

export default TimeSlotPicker;
