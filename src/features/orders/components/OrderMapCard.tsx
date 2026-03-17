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
    selectedProviderId?: string | null;
    onAddressClick?: () => void;
    onTriggerGps?: () => void;
    onProviderSelect?: (id: string) => void;
    onMapMove?: (lat: number, lng: number) => void;
}

export default function OrderMapCard({
    currentAddress,
    serviceName,
    subServiceName,
    serviceEmoji = '🛠️',
    step,
    providers = [],
    selectedProviderId,
    onAddressClick,
    onTriggerGps,
    onProviderSelect,
    onMapMove
}: OrderMapCardProps) {
    const { t } = useLanguage();

    return (
        <div className="w-full h-full relative">
            <MapContent 
                step={step}
                providers={providers}
                selectedProviderId={selectedProviderId}
                onProviderSelect={onProviderSelect}
                onMapMove={onMapMove}
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
                            {step > 1 ? t({ en: 'Define another Address', fr: 'Définir une autre adresse', ar: 'تحديد عنوان آخر' }) : t({ en: 'Use this point →', fr: 'Utiliser ce point →', ar: 'استخدم هذه النقطة ←' })}
                        </button>
                    </div>
                </motion.div>
            </div>

            {/* Service Breadcrumb Pill (bottom area) */}
            {step !== 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: 14,
                    left: 16,
                    right: 64,              // leave room for GPS button
                    zIndex: 900,
                    background: '#FEF9C3',
                    borderRadius: 50,
                    padding: '8px 14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    <span style={{ fontSize: 14 }}>{serviceEmoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#78350F' }}>
                        {serviceName} {subServiceName ? `› ${subServiceName}` : ''}
                    </span>
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
