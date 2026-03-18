// @ts-nocheck
// ARCHIVED — do not import this file in active pages.
// Extracted from: src/features/orders/components/OrderSubmissionFlow.tsx serviceConfig (March 2026)
// Use as reference when rebuilding the order flow from scratch.
// 
// NOTE: ServiceOptionCard was implemented inline as a numeric swiping "day counter" or
// list-of-3 task size cards (Small / Medium / Large) depending on service type.
// This archive captures the list-of-3 card variant.

"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

interface ServiceOption {
    id: string;
    duration: number;
    label: { en: string; fr: string; ar?: string };
    estTime: { en: string; fr: string; ar?: string };
    desc: { en: string; fr: string; ar?: string };
    icon?: string;
    subLabel?: { en: string; fr: string; ar?: string };
}

interface ServiceOptionCardProps {
    option: ServiceOption;
    isSelected: boolean;
    onSelect: () => void;
    index?: number;
}

/**
 * Card representing a service duration / task size option.
 * Used in Step 1 (task size selection) for services like Handyman, Moving, Electricity, etc.
 * For services with a numeric swiping counter (like Cleaning, Private Driver), a separate
 * Counter component was used instead.
 */
const ServiceOptionCard: React.FC<ServiceOptionCardProps> = ({ option, isSelected, onSelect, index = 0 }) => {
    const { t } = useLanguage();

    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            onClick={onSelect}
            className={cn(
                "w-full p-5 rounded-[24px] border-2 text-left transition-all cursor-pointer flex flex-col gap-2",
                isSelected
                    ? "border-[#00A082] bg-[#F0FBF8] shadow-md"
                    : "border-neutral-100 bg-white hover:border-neutral-200"
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[17px] font-black text-neutral-900">{t(option.label as any)}</span>
                    <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest">
                        {t(option.estTime as any)}
                    </span>
                </div>
                {option.icon && (
                    <img src={option.icon} alt={t(option.label as any)} className="w-14 h-14 object-contain" />
                )}
            </div>
            {option.desc && (
                <p className="text-[13px] font-medium text-neutral-500 leading-relaxed">
                    {t(option.desc as any)}
                </p>
            )}
            {isSelected && (
                <div className="w-full h-0.5 bg-[#00A082]/20 rounded-full" />
            )}
        </motion.button>
    );
};

export default ServiceOptionCard;
