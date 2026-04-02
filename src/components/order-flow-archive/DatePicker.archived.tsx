// @ts-nocheck
// ARCHIVED — do not import this file in active pages.
// Extracted from: src/features/orders/components/OrderSubmissionFlow.tsx step3-datetime (March 2026)
// Use as reference when rebuilding the order flow from scratch.

"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { format } from 'date-fns';

interface DatePickerProps {
    selectedDate: string | null;
    onSelectDate: (date: string) => void;
    minDate?: string;
}

/**
 * Simple date input used in Step 3 (datetime) of the order flow.
 * For a richer calendar with availability dots, see AvailabilityCalendar.archived.tsx
 */
const DatePicker: React.FC<DatePickerProps> = ({ selectedDate, onSelectDate, minDate }) => {
    const { t } = useLanguage();

    return (
        <div className="p-2 bg-neutral-50 rounded-[32px]">
            <div className="flex flex-col gap-4">
                <label className="text-sm font-bold text-neutral-500 uppercase tracking-wider">
                    {t({ en: 'Pick a Date', fr: 'Choisir une date', ar: 'اختر تاريخاً' })}
                </label>
                <input
                    type="date"
                    value={selectedDate || ''}
                    onChange={(e) => onSelectDate(e.target.value)}
                    className="w-full p-4 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#01A083] font-semibold"
                    min={minDate || format(new Date(), 'yyyy-MM-dd')}
                />
            </div>
        </div>
    );
};

export default DatePicker;
