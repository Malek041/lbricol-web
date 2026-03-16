"use client";

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

// Dynamic import for Leaflet
const MapContent = dynamic(() => import('./OrderMapContent'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-neutral-100 animate-pulse flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#00A082] border-t-transparent rounded-full animate-spin" />
    </div>
});

interface OrderMapCardProps {
    currentAddress: string;
    serviceName: string;
    subServiceName?: string;
    serviceEmoji?: string;
    step: number;
    providers?: any[];
    selectedProvider?: any;
    onAddressClick?: () => void;
    onTriggerGps?: () => void;
}

export default function OrderMapCard({
    currentAddress,
    serviceName,
    subServiceName,
    serviceEmoji = '🛠️',
    step,
    providers = [],
    selectedProvider,
    onAddressClick,
    onTriggerGps
}: OrderMapCardProps) {
    const { t } = useLanguage();

    return (
        <div className="w-full h-full relative">
            <MapContent 
                step={step}
                providers={providers}
                selectedProvider={selectedProvider}
            />

            {/* Address Card (top-left) */}
            <div className="absolute top-4 left-4 right-4 z-[900]">
                <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white rounded-2xl p-4 shadow-xl flex items-start gap-3 border border-neutral-100/50"
                >
                    <div className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center flex-shrink-0">
                        <img src="/Images/map Assets/bike_icon.png" className="w-6 h-6 grayscale opacity-40" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-neutral-900 truncate leading-tight mb-1">
                            {currentAddress || 'Loading address...'}
                        </p>
                        <button 
                            onClick={onAddressClick}
                            className="text-[13px] font-bold text-[#00A082] hover:opacity-70 transition-opacity"
                        >
                            {step > 0 ? t({ en: 'Define another Address', fr: 'Définir une autre adresse', ar: 'تحديد عنوان آخر' }) : t({ en: 'Use this point →', fr: 'Utiliser ce point →', ar: 'استخدم هذه النقطة ←' })}
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Service Breadcrumb Pill (bottom area) */}
            {step >= 0 && (
                <div className="absolute bottom-6 left-4 right-20 z-[900]">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-[#FEF9C3] rounded-full px-4 py-2.5 shadow-lg flex items-center gap-2.5 border border-[#FEF08A]"
                    >
                        <span className="text-lg">{serviceEmoji}</span>
                        <span className="text-[13px] font-bold text-[#854D0E] whitespace-nowrap overflow-hidden text-ellipsis">
                            {serviceName} {subServiceName ? `› ${subServiceName}` : ''}
                        </span>
                    </motion.div>
                </div>
            )}

            {/* GPS Button (bottom-right) */}
            <button
                onClick={onTriggerGps}
                className="absolute bottom-6 right-6 z-[900] w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center border border-neutral-100 active:scale-95 transition-transform"
            >
                <MapPin className="w-6 h-6 text-neutral-900" />
            </button>
        </div>
    );
}
