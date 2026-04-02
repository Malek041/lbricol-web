"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Search, X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

const MapView = dynamic(() => import('@/components/location-picker/MapView'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-neutral-100 animate-pulse" />
});

import AddressCard from '@/components/location-picker/AddressCard';

interface CompactHomeMapProps {
    city: string | null | undefined;
    area: string | null | undefined;
    onInteract?: () => void;
    autoLocate?: boolean;
    serviceName?: string;
    subServiceName?: string;
    serviceEmoji?: string;
    className?: string;
    onCloseFlow?: () => void;
    onBack?: () => void;
    isFlowActive?: boolean;
    initialLocation?: { lat: number; lng: number };
    onAddressUpdate?: (address: string) => void;
}

const CompactHomeMap: React.FC<CompactHomeMapProps> = ({
    city,
    area,
    onInteract,
    autoLocate = true,
    serviceName,
    subServiceName,
    serviceEmoji = '🛠️',
    className,
    onCloseFlow,
    onBack,
    isFlowActive = false,
    initialLocation,
    onAddressUpdate
}) => {
    const { t, language } = useLanguage();
    const [isInteracting, setIsInteracting] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [liveAddress, setLiveAddress] = useState<string | null>(null);
    const [manualFlyTo, setManualFlyTo] = useState<{lat: number, lng: number, skipOffset?: boolean} | undefined>(undefined);

    const activePinY = isFlowActive ? 50 : 62;

    const handleLocateMe = () => {
        if (navigator.geolocation) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setManualFlyTo({ lat: pos.coords.latitude, lng: pos.coords.longitude, skipOffset: false });
                    setIsLocating(false);
                },
                () => setIsLocating(false),
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
            );
        }
    };

    useEffect(() => {
        // Only auto-locate if we don't have an initial location or it's the very first time
        if (autoLocate && !initialLocation) {
            handleLocateMe();
        }
    }, [autoLocate, !!initialLocation]);

    // Clear manualFlyTo if initialLocation changes (e.g. from picker)
    useEffect(() => {
        if (initialLocation?.lat && initialLocation?.lng) {
            setManualFlyTo(undefined);
        }
    }, [initialLocation?.lat, initialLocation?.lng]);


    // Formatted fallback city/area
    const fallbackAddress = area ? `${area}, ${city}` : city || 'Detecting Location...';
    const displayAddress = (liveAddress && !/^\d+\.\d+/.test(liveAddress)) ? liveAddress : ((initialLocation as any)?.address || fallbackAddress);

    // Truncate long addresses for the bubble
    const truncatedAddress = displayAddress.length > (isFlowActive ? 25 : 45)
        ? displayAddress.substring(0, (isFlowActive ? 22 : 42)) + '...'
        : displayAddress;

    const bubbleText = truncatedAddress;
    const bubbleCta = isFlowActive ? t({ en: 'Use this point', fr: 'Utiliser ce point', ar: 'استخدام هذه النقطة' }) : t({ en: 'Define another Address', fr: 'Choisir une adresse', ar: 'تغيير العنوان' });

    return (
        <div
            className={cn(
                "relative w-full h-full rounded-[45px_15px_50px_25px] overflow-hidden bg-neutral-50 border-2 border-black/5 group",
                className
            )}
            onClick={onInteract}
        >
            <MapView
                onLocationChange={(point) => {
                    setLiveAddress(point.address);
                    setIsLocating(false);
                    if (onAddressUpdate && point.address) {
                        onAddressUpdate(point.address);
                    }
                }}
                onLocationError={() => setIsLocating(false)}
                initialLocation={initialLocation || undefined}
                flyToPoint={manualFlyTo || initialLocation || undefined}
                pinY={activePinY}
                zoom={17}
                language={language}
                onInteractionStart={() => setIsInteracting(true)}
                onInteractionEnd={() => setIsInteracting(false)}
            />

            {/* 3. TRULY FIXED PIN & CALLOUT (Pic 3 Style) */}
            <div
                className="absolute left-1/2 pointer-events-none z-[1001] flex flex-col items-center transition-[top] duration-[1500ms] ease-in-out"
                style={{
                    top: `${activePinY}%`,
                    transform: 'translate(-50%, -100%)'
                }}
            >
                {/* The Address Bubble (appears above the pin) */}
                <AddressCard
                    address={bubbleText}
                    icon={'🚲'}
                    ctaText={bubbleCta}
                    onConfirm={onInteract || (() => { })}
                />

                {/* The Pin Image */}
                <img
                    src="/Images/map Assets/LocationPin.png"
                    alt="Pin"
                    className="w-[45px] h-auto animate-bounce-subtle filter-none"
                />
            </div>


            {/* Return/Back Button (Pic 2 style) */}
            {isFlowActive && onBack && (
                <div className={cn(
                    "absolute left-6 z-20 flex flex-col gap-3 transition-all duration-500",
                    isFlowActive ? "bottom-20" : "bottom-32"
                )}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onBack();
                        }}
                        className="w-12 h-12 bg-white rounded-[15px_18px_12px_20px] border-2 border-black/5 flex items-center justify-center text-[#374151] pointer-events-auto active:scale-95 transition-transform cursor-pointer"
                    >
                        <ChevronLeft size={24} strokeWidth={2.5} />
                    </button>
                </div>
            )}

            {/* X Close Button (Pic 2 style) */}
            {isFlowActive && onCloseFlow && (
                <div className="absolute top-4 left-4 z-[1002]">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCloseFlow();
                        }}
                        className="w-10 h-10 bg-white rounded-[12px_15px_10px_14px] border-2 border-black/5 flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <X size={20} className="text-neutral-900" />
                    </button>
                </div>
            )}

            {/* Service Breadcrumb Pill removed */}


            {/* Bottom Right Actions */}
            <div className={cn(
                "absolute right-6 z-20 flex flex-col gap-3 transition-all duration-500 rounded-full",
                isFlowActive ? "bottom-20" : "bottom-24"
            )}>
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        handleLocateMe();
                    }}
                    className="w-12 h-12 bg-white rounded-[18px_12px_20px_14px] border-2 border-black/5 flex items-center justify-center text-[#374151] pointer-events-auto active:scale-95 transition-transform cursor-pointer"
                >
                    {isLocating ? (
                        <div className="w-5 h-5 border-2 border-[#01A083] border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Navigation size={22} strokeWidth={2.5} />
                    )}
                </div>
            </div>

            {/* Interaction Mask to avoid accidental scrolling when browsing home */}
            {!isInteracting && (
                <div className="absolute inset-0 z-0 bg-transparent" />
            )}

            <style jsx>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default CompactHomeMap;
