// @ts-nocheck
// ARCHIVED — do not import this file in active pages.
// Extracted from: src/features/orders/components/OrderSubmissionFlow.tsx (March 2026)
// Use as reference when rebuilding the order flow from scratch.

"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

interface Bricoler {
    id: string;
    displayName: string;
    photoURL?: string;
    rating: number;
    completedJobs: number;
    hourlyRate?: number;
    quickPitch?: string;
    pitch?: string;
    bio?: string;
    reviews?: any[];
    isNew?: boolean;
    isVerified?: boolean;
    isActive: boolean;
}

const BricolerCard = ({
    bricoler, onSelect, onOpenProfile, isSelected, serviceName, service, index = 0, distance
}: {
    bricoler: Bricoler, onSelect: () => void, onOpenProfile: () => void, isSelected: boolean,
    serviceName: string, service?: string, index?: number, distance?: number | null
}) => {
    const { t } = useLanguage();
    const effectiveJobs = Math.max(bricoler.completedJobs || 0, (bricoler.reviews || []).length);
    const effectiveRating = (bricoler.rating && bricoler.rating > 0) ? bricoler.rating : 5.0;
    
    return (
        <motion.div
            id={`provider-${bricoler.id}`}
            style={{ minWidth: 280 }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelect()}
            className={cn(
                "flex flex-col bg-white rounded-[32px] border-2 transition-all cursor-pointer overflow-hidden p-5 h-full relative",
                isSelected ? "border-[#10B981] shadow-[0_15px_40px_-15px_rgba(16,185,129,0.3)]" : "border-neutral-100 hover:border-neutral-200"
            )}
        >
            <div className="flex items-start gap-4 mb-4">
                <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm bg-neutral-100">
                        <img 
                            src={bricoler.photoURL || "/Images/Logo/Black Lbricol Avatar Face.webp"} 
                            className="w-full h-full object-cover" 
                            alt={bricoler.displayName}
                        />
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-col">
                        <h4 className="text-[17px] font-black text-neutral-900 truncate tracking-tight py-0.5">{bricoler.displayName}</h4>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {bricoler.isNew && (
                                <span className="bg-[#EEF2FF] text-[#6366F1] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">✦ NEW</span>
                            )}
                            <div className="flex items-center gap-1">
                                <Star size={12} className="text-[#FFC244]" fill="#FFC244" />
                                <span className="text-[14px] font-black text-neutral-950">{effectiveRating.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1.5">
                         {distance !== undefined && distance !== null && (
                            <div className="flex items-center gap-1 bg-neutral-50 px-2 py-0.5 rounded-xl border border-neutral-100">
                                <MapPin size={10} className="text-neutral-400" />
                                <span className="text-[11px] font-bold text-neutral-500">{distance.toFixed(1)} km</span>
                            </div>
                         )}
                         <span className="text-[11px] font-black text-[#10B981] uppercase tracking-widest leading-none">{t({ en: 'Available', fr: 'Disponible' })}</span>
                    </div>
                </div>
            </div>

            <p className="text-[13px] font-bold text-neutral-400 line-clamp-2 leading-relaxed mb-4 min-h-[40px]">
                {bricoler.quickPitch || bricoler.pitch || bricoler.bio || "No bio available."}
            </p>

            <div className="mt-auto pt-4 border-t border-neutral-50 flex items-center justify-between gap-3">
                <div className="flex flex-col">
                    <span className="text-[19px] font-black text-[#10B981] leading-none">MAD {bricoler.hourlyRate || 80}</span>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onSelect(); }}
                    className={cn(
                        "h-11 px-6 rounded-full text-[14px] font-black transition-all active:scale-95",
                        isSelected ? "bg-[#10B981] text-white" : "bg-neutral-900 text-white hover:bg-neutral-800"
                    )}
                >
                    {isSelected ? t({ en: 'Selected', fr: 'Choisi' }) : t({ en: 'Select', fr: 'Choisir' })}
                </button>
            </div>
        </motion.div>
    );
};

export default BricolerCard;
