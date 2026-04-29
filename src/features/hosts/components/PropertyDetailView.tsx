"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Share, Heart, ChevronLeft, ChevronRight, Star,
    Home, User, Shield, Info, MapPin, Wifi, Car,
    Coffee, Tv, Wind, Globe, Languages, Sparkles,
    Trophy, Key, Maximize, Languages as TranslateIcon,
    QrCode, Copy, Check, Flame, Waves, TreePine,
    PawPrint, Baby, Bath, Fence, Utensils, Dices,
    Monitor, WashingMachine, ShieldAlert, Flower2,
    Bot, Handshake, Zap, Calendar as CalendarIcon, Plus, CheckCircle2
} from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import MapView from '@/components/location-picker/MapView';

interface PropertyDetailViewProps {
    property: any;
    isOpen: boolean;
    onClose: () => void;
}

const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({ property, isOpen, onClose }) => {
    const { t } = useLanguage();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<'planning' | 'team' | 'activity' | 'details'>('planning');
    const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(2026, 3, 28));
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [selectedAction, setSelectedAction] = useState<'checkin' | 'checkout' | 'other' | null>(null);
    const [isProgramSheetOpen, setIsProgramSheetOpen] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const longPressOccurred = useRef(false);
    const currentMonthRef = useRef<HTMLDivElement>(null);

    const scrollToCurrent = () => {
        if (activeTab === 'planning' && viewMode === 'month' && currentMonthRef.current) {
            currentMonthRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    useEffect(() => {
        if (activeTab === 'planning' && viewMode === 'month') {
            scrollToCurrent();
        }
    }, [activeTab, viewMode]);

    const tabs = [
        { id: 'planning', label: { en: 'Planning', fr: 'Planning' } },
        { id: 'team', label: { en: 'Team', fr: 'Équipe' } },
        { id: 'activity', label: { en: 'Activity', fr: 'Activité' } },
        { id: 'details', label: { en: 'Details', fr: 'Détails' } }
    ] as const;

    if (!property) return null;

    const photos = property.photos || [];
    const name = property.name || 'Citycenter Blue Heaven avec vue panoramique + FIBRE';
    const type = property.type || 'apartment';
    const address = property.specs?.address || 'Essaouira, Maroc';
    const specs = property.specs || {};
    const guests = specs.guests || 3;
    const bedrooms = specs.bedrooms || 1;
    const beds = specs.beds || 1;
    const bathrooms = specs.bathrooms || 1;

    const selectedAmenities = specs.amenities || [];

    const AMENITY_MAP: Record<string, { label: { en: string, fr: string }, icon: any }> = {
        garden: { label: { en: 'Garden', fr: 'Jardin' }, icon: TreePine },
        pool: { label: { en: 'Pool', fr: 'Piscine' }, icon: Waves },
        pets_place: { label: { en: 'Place for pets', fr: 'Espace pour animaux' }, icon: PawPrint },
        kids_space: { label: { en: 'Kids space', fr: 'Espace enfants' }, icon: Baby },
        hottub: { label: { en: 'Hot tub', fr: 'Jacuzzi' }, icon: Bath },
        patio: { label: { en: 'Patio', fr: 'Patio' }, icon: Fence },
        fireplace: { label: { en: 'Indoor fireplace', fr: 'Cheminée intérieure' }, icon: Flame },
        wifi: { label: { en: 'Fast Wifi', fr: 'Wifi rapide' }, icon: Wifi },
        tv: { label: { en: 'TV', fr: 'Télévision' }, icon: Tv },
        kitchen: { label: { en: 'Kitchen', fr: 'Cuisine' }, icon: Coffee },
        washer: { label: { en: 'Washer', fr: 'Lave-linge' }, icon: WashingMachine },
        smoke_alarm: { label: { en: 'Smoke alarm', fr: 'Détecteur de fumée' }, icon: ShieldAlert },
        pool_table: { label: { en: 'Pool table', fr: 'Table de billard' }, icon: Dices },
        piano: { label: { en: 'Piano', fr: 'Piano' }, icon: Monitor },
    };

    const displayAmenities = selectedAmenities.map((id: string) => ({
        id,
        ...(AMENITY_MAP[id] || { label: { en: id, fr: id }, icon: Info })
    })).slice(0, 6);

    const automation = property.automation || {};
    const teamManagement = automation.teamManagement || {};
    const propertyCode = property.propertyCode || teamManagement.code;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    onAnimationComplete={scrollToCurrent}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-[10000] bg-white overflow-y-auto pb-24"
                >
                    <div className="sticky top-0 left-0 right-0 z-[10110] px-4 py-3 flex items-center bg-white border-b border-neutral-100">
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white border border-black flex items-center justify-center active:scale-90 transition-all mr-3"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="font-bold text-[18px] text-black truncate">{name}</h2>
                    </div>

                    {activeTab === 'details' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-6"
                        >
                            {/* Image Gallery */}
                            <div className="relative mx-6 rounded-2xl overflow-hidden shadow-sm">
                                <div
                                    className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar aspect-[4/3] bg-neutral-100"
                                    onScroll={(e) => {
                                        const container = e.currentTarget;
                                        const index = Math.round(container.scrollLeft / container.clientWidth);
                                        setCurrentImageIndex(index);
                                    }}
                                >
                                    {(photos.length > 0 ? photos : ['https://source.unsplash.com/800x600/?apartment,interior', 'https://source.unsplash.com/800x600/?villa,interior', 'https://source.unsplash.com/800x600/?modern,living']).map((photo: string, idx: number) => (
                                        <div key={idx} className="min-w-full h-full relative snap-center">
                                            <Image
                                                src={photo}
                                                alt={`${name} ${idx + 1}`}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {photos.length > 1 && (
                                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-white text-[12px] font-bold z-10">
                                        {currentImageIndex + 1} / {photos.length}
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-8">
                                {/* Title Section */}
                                <div className="flex gap-3 mb-2">
                                    <TranslateIcon size={24} className="shrink-0 mt-1" />
                                    <h1 className="text-[26px] font-bold text-black leading-[1.2]">
                                        {name}
                                    </h1>
                                </div>

                                {/* Quick Stats */}
                                <div className="mt-4 space-y-1">
                                    <p className="text-[16px] font-bold text-black">
                                        {t({
                                            en: `Entire home: ${type === 'apartment' ? 'apartment' : type === 'villa' ? 'villa' : type}`,
                                            fr: `Logement entier : ${type === 'apartment' ? 'appartement' : type === 'villa' ? 'villa' : type}`
                                        })} - {address.split(',')[0]}
                                    </p>
                                    <p className="text-[14px] text-neutral-500 font-medium">
                                        {guests} voyageurs · {bedrooms} chambre · {beds} lit · {bathrooms} salle de bain
                                    </p>
                                    {/* Description */}
                                    {property.description && (
                                        <div className="mt-10">
                                            <p className="text-[16px] text-neutral-800 leading-relaxed line-clamp-6">
                                                {property.description}
                                            </p>
                                            <button className="mt-4 flex items-center gap-1 font-bold underline text-[16px]">
                                                Lire la suite <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Where You'll Sleep Section */}
                                <div className="mt-12">
                                    <h2 className="text-[22px] font-bold mb-6">Où vous dormirez</h2>
                                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                        <div className="min-w-[200px] flex-shrink-0">
                                            <div className="aspect-[4/3] rounded-xl overflow-hidden relative mb-3 bg-neutral-100 border border-neutral-100">
                                                <Image src={photos[0] || '/Images/placeholder-property.jpg'} fill className="object-cover" alt="" />
                                            </div>
                                            <h4 className="font-bold text-[16px]">{t({ en: 'Bedroom', fr: 'Chambre' })}</h4>
                                            <p className="text-[14px] text-neutral-500">{beds} {t({ en: 'beds', fr: 'lits' })}</p>
                                        </div>
                                        {photos.length > 1 && (
                                            <div className="min-w-[200px] flex-shrink-0">
                                                <div className="aspect-[4/3] rounded-xl overflow-hidden relative mb-3 bg-neutral-100 border border-neutral-100">
                                                    <Image src={photos[1] || '/Images/placeholder-property.jpg'} fill className="object-cover" alt="" />
                                                </div>
                                                <h4 className="font-bold text-[16px]">{t({ en: 'Living Room', fr: 'Salon' })}</h4>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Amenities Section */}
                                <div className="mt-12 pt-12 border-t border-neutral-100">
                                    <h2 className="text-[22px] font-bold mb-6">{t({ en: 'What this place offers', fr: 'Ce que propose ce logement' })}</h2>
                                    <div className="space-y-4">
                                        {displayAmenities.map((item: any, idx: number) => {
                                            const Icon = item.icon;
                                            return (
                                                <div key={idx} className="flex items-center gap-4 text-neutral-800">
                                                    <Icon size={24} strokeWidth={1.5} />
                                                    <span className="text-[16px]">{t(item.label)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {selectedAmenities.length > 6 && (
                                        <button className="mt-8 w-full py-3.5 border border-black rounded-lg font-bold text-[16px] active:scale-[0.98] transition-all">
                                            {t({ en: `Show all ${selectedAmenities.length} amenities`, fr: `Afficher les ${selectedAmenities.length} équipements` })}
                                        </button>
                                    )}
                                </div>

                                {/* Team & Management Section - NEW */}
                                {propertyCode && (
                                    <div className="mt-12 pt-12 border-t border-neutral-100">
                                        <h2 className="text-[22px] font-bold mb-2">{t({ en: 'Team & Management', fr: 'Équipe et gestion' })}</h2>
                                        <p className="text-neutral-500 text-[14px] mb-6">
                                            {t({
                                                en: 'Share this code with your team members to link them to this property.',
                                                fr: 'Partagez ce code avec les membres de votre équipe pour les lier à ce logement.'
                                            })}
                                        </p>
                                        <div className="flex items-center justify-between p-5 bg-neutral-50 rounded-2xl border border-neutral-100">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                    <QrCode size={20} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] text-neutral-400 font-medium uppercase tracking-wider">{t({ en: 'Invite Code', fr: 'Code d\'invitation' })}</span>
                                                    <span className="text-[18px] font-bold text-black font-mono">{propertyCode}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(propertyCode);
                                                }}
                                                className="p-3 bg-white rounded-full border border-neutral-200 active:scale-90 transition-all shadow-sm"
                                            >
                                                <Copy size={20} />
                                            </button>
                                        </div>

                                        <div className="mt-6 flex items-center gap-3 p-4 bg-[#01A084]/5 rounded-xl border border-[#01A084]/10">
                                            <Zap size={20} className="text-[#01A084]" />
                                            <p className="text-[14px] text-[#01A084] font-medium">
                                                {teamManagement.mode === 'lbricol' ? t({ en: 'Managed by Lbricol Bricolers', fr: 'Géré par les Bricoleurs Lbricol' }) :
                                                    teamManagement.mode === 'own_team' ? t({ en: 'Managed by Your Team', fr: 'Géré par Votre Équipe' }) :
                                                        t({ en: 'Hybrid Management (Team + Bricolers)', fr: 'Gestion Hybride (Équipe + Bricoleurs)' })}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Location Section */}
                                <div className="mt-12 pt-12 border-t border-neutral-100">
                                    <h2 className="text-[22px] font-bold mb-6">Où se situe le logement</h2>
                                    <div className="h-[240px] rounded-2xl overflow-hidden relative border border-neutral-100 shadow-sm">
                                        <MapView
                                            onLocationChange={() => { }}
                                            initialLocation={property.location || { lat: 31.5085, lng: -9.7595 }}
                                            interactive={false}
                                            zoom={15}
                                            clientPin={property.location || { lat: 31.5085, lng: -9.7595 }}
                                        />
                                    </div>
                                    <div className="mt-6">
                                        <h4 className="font-bold text-[16px]">{address}</h4>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'planning' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="px-2 py-8"
                        >
                            {/* Removed Planning Header to expand space */}

                            {viewMode === 'month' ? (
                                <div className="space-y-16">
                                    {['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'].map((monthName, monthIdx) => {
                                        const year = 2026;
                                        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
                                        const firstDay = (new Date(year, monthIdx, 1).getDay() + 6) % 7; // Mon=0, Sun=6

                                        const prevMonthDays = new Date(year, monthIdx, 0).getDate();
                                        const trailingDays = Array.from({ length: firstDay }).map((_, i) => prevMonthDays - firstDay + i + 1);

                                        return (
                                            <div key={monthName} ref={monthIdx === 3 ? currentMonthRef : null}>
                                                <h2 className={`text-[22px] font-bold mb-6 lowercase first-letter:uppercase ${monthIdx === 3 ? 'text-black' : 'text-neutral-400'}`}>
                                                    {monthName} 2026
                                                </h2>
                                                <div className="grid grid-cols-7 gap-1.5 mb-2">
                                                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, idx) => (
                                                        <div key={`${day}-${idx}`} className="text-center text-[11px] text-neutral-400 font-medium pb-2">
                                                            {day}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-7 gap-1.5">
                                                    {/* Trailing days */}
                                                    {trailingDays.map(day => (
                                                        <div key={`trailing-${day}`} className="h-[110px] rounded-[10px] border border-neutral-50 bg-[#F7F7F7] flex items-start p-2">
                                                            <span className="text-[13px] font-bold text-neutral-300">{day}</span>
                                                        </div>
                                                    ))}
                                                    {/* Month days */}
                                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                                        const day = i + 1;
                                                        const isToday = monthIdx === 3 && day === 28; // April 28
                                                        const isPast = monthIdx < 3 || (monthIdx === 3 && day < 28);

                                                        const dayDate = `${year}-${monthIdx}-${day}`;
                                                        const isSelected = selectedDays.includes(dayDate);

                                                        const handleInteractionStart = () => {
                                                            longPressOccurred.current = false;
                                                            const timer = setTimeout(() => {
                                                                longPressOccurred.current = true;
                                                                if (selectedDays.includes(dayDate)) {
                                                                    setSelectedDays(prev => prev.filter(d => d !== dayDate));
                                                                } else {
                                                                    setSelectedDays(prev => [...prev, dayDate]);
                                                                }
                                                            }, 600); // 600ms for long press
                                                            setLongPressTimer(timer);
                                                        };

                                                        const handleInteractionEnd = () => {
                                                            if (longPressTimer) {
                                                                clearTimeout(longPressTimer);
                                                                setLongPressTimer(null);

                                                                if (longPressOccurred.current) {
                                                                    // Selection already toggled by long press timeout
                                                                    return;
                                                                }

                                                                // If we are in selection mode, a short tap toggles
                                                                if (selectedDays.length > 0) {
                                                                    if (selectedDays.includes(dayDate)) {
                                                                        setSelectedDays(prev => prev.filter(d => d !== dayDate));
                                                                    } else {
                                                                        setSelectedDays(prev => [...prev, dayDate]);
                                                                    }
                                                                } else {
                                                                    // Short tap when NOT in selection mode -> Go to day view
                                                                    setSelectedDate(new Date(year, monthIdx, day));
                                                                    setViewMode('day');
                                                                }
                                                            }
                                                        };

                                                        return (
                                                            <div
                                                                key={day}
                                                                onPointerDown={handleInteractionStart}
                                                                onPointerUp={handleInteractionEnd}
                                                                onPointerCancel={handleInteractionEnd}
                                                                className={`h-[110px] rounded-[10px] border flex items-start p-2 transition-all cursor-pointer relative ${isSelected ? 'border-[#2C2C2C] border-[1.5px] bg-[#F7F7F7] z-10  scale-[1.01]' :
                                                                    isToday ? 'border-black border-[1px] bg-white ring-1 ring-black shadow-sm' :
                                                                        isPast ? 'border-neutral-50 bg-[#F7F7F7]' : 'border-neutral-100 bg-white hover:border-neutral-300'
                                                                    }`}
                                                            >
                                                                <span className={`text-[13px] font-bold ${isPast ? 'text-neutral-300' : 'text-black'
                                                                    }`}>
                                                                    {day}
                                                                </span>
                                                                {isSelected && (
                                                                    <div className="absolute top-2 right-2 text-white bg-white rounded-full shadow-sm">
                                                                        <CheckCircle2 size={16} fill="#2C2C2C" stroke="white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-4 px-8">
                                    <div className="flex items-center justify-between mb-10">
                                        <div className="flex flex-col">
                                            <h2 className="text-[26px] font-bold capitalize">
                                                {selectedDate?.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </h2>
                                            <p className="text-neutral-500 font-medium">Aucun événement prévu</p>
                                        </div>
                                    </div>

                                    {/* Day View Timeline */}
                                    <div className="relative pt-2">
                                        {/* Current Time Line */}
                                        {(() => {
                                            const now = new Date();
                                            const isSelectedDayToday = selectedDate &&
                                                selectedDate.getDate() === now.getDate() &&
                                                selectedDate.getMonth() === now.getMonth() &&
                                                selectedDate.getFullYear() === now.getFullYear();

                                            if (!isSelectedDayToday) return null;

                                            const startHour = 6;
                                            const endHour = 20;
                                            const currentHour = now.getHours();
                                            const currentMinutes = now.getMinutes();

                                            if (currentHour < startHour || currentHour > endHour) return null;

                                            // Calculate position: each block is approx 57px (text height + space-y-14)
                                            // More accurately, we can use a percentage or a fixed step
                                            const hourIndex = currentHour - startHour;
                                            const totalMinutesSinceStart = (currentHour - startHour) * 60 + currentMinutes;
                                            const totalMinutesVisible = (endHour - startHour) * 60;

                                            // In our layout, each hour is a row. space-y-14 is 56px. 
                                            // The text is ~20px. So ~76px per hour.
                                            const hourHeight = 76.5;
                                            const topOffset = (totalMinutesSinceStart / 60) * hourHeight;

                                            return (
                                                <div
                                                    className="absolute left-0 right-0 z-20 flex items-center gap-2 pointer-events-none transition-all duration-1000"
                                                    style={{ top: `${topOffset + 10}px` }}
                                                >
                                                    <div className="bg-[#FF385C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm ml-8">
                                                        {currentHour}:{currentMinutes.toString().padStart(2, '0')}
                                                    </div>
                                                    <div className="flex-1 h-[2px] bg-[#FF385C] shadow-[0_0_8px_rgba(255,56,92,0.4)]" />
                                                    <div className="w-2 h-2 rounded-full bg-[#FF385C] -ml-1 shadow-md" />
                                                </div>
                                            );
                                        })()}

                                        <div className="space-y-14">
                                            {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6].map(hour => (
                                                <div key={hour} className="flex gap-6 items-start">
                                                    <span className="text-[13px] font-bold text-neutral-400 w-12 text-right">{hour}:00</span>
                                                    <div className="flex-1 h-[1px] bg-neutral-100 mt-2.5" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'team' && (
                        <div className="px-6 py-20 text-center">
                            <h2 className="text-neutral-400 font-medium">Section Équipe à venir</h2>
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="px-6 py-20 text-center">
                            <h2 className="text-neutral-400 font-medium">Section Activité à venir</h2>
                        </div>
                    )}

                    {/* Day View Return Button (Floating above Nav) */}
                    <AnimatePresence>
                        {viewMode === 'day' && activeTab === 'planning' && selectedDays.length === 0 && (
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                animate={{
                                    y: 0,
                                    opacity: 1,
                                    x: [0, -2, 2, -2, 2, 0]
                                }}
                                exit={{ y: 50, opacity: 0 }}
                                transition={{
                                    y: { duration: 0.4 },
                                    opacity: { duration: 0.4 },
                                    x: {
                                        duration: 0.5,
                                        repeat: Infinity,
                                        repeatDelay: 3,
                                        ease: "easeInOut"
                                    }
                                }}
                                className="fixed bottom-[110px] left-0 right-0 z-[10105] flex justify-center pointer-events-none"
                            >
                                <button
                                    onClick={() => setViewMode('month')}
                                    className="px-8 py-2 bg-[#FFFFFF] border border-black border-[0.5px] rounded-full text-[14px] font-bold text-black pointer-events-auto active:scale-95 transition-all"
                                >
                                    Voir le mois
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Floating Tab Navigation / Selection Actions */}
                    <AnimatePresence mode="wait">
                        {selectedDays.length === 0 ? (
                            <motion.div
                                key="tabs"
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                className="fixed bottom-10 left-0 right-0 z-[10110] flex justify-center px-6 pointer-events-none"
                            >
                                <div className="flex items-center gap-1.5 p-1 bg-white/80 backdrop-blur-xl border border-neutral-100 rounded-full shadow-2xl pointer-events-auto">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                if (tab.id === 'planning' && activeTab === 'planning' && viewMode === 'day') {
                                                    setViewMode('month');
                                                } else {
                                                    setActiveTab(tab.id as any);
                                                }
                                            }}
                                            className={`relative px-5 py-4 rounded-full text-[13px] font-bold transition-all ${activeTab === tab.id
                                                ? 'text-white'
                                                : 'text-[#717171] hover:text-[#222222]'
                                                }`}
                                        >
                                            {activeTab === tab.id && (
                                                <motion.div
                                                    layoutId="activeTabPill"
                                                    className="absolute inset-0 bg-[#2C2C2C] rounded-full shadow-lg"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}
                                            <span className="relative z-10">{t(tab.label)}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="actions"
                                initial={{ y: 100, opacity: 0, scale: 0.95 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: 100, opacity: 0, scale: 0.95 }}
                                className="fixed bottom-10 left-0 right-0 z-[10110] flex justify-center px-6 pointer-events-none"
                            >
                                <div className="flex items-center bg-white border border-neutral-100 rounded-[5px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] pointer-events-auto overflow-hidden">
                                    <button
                                        onClick={() => { setSelectedAction('checkin'); setIsProgramSheetOpen(true); }}
                                        className="px-8 py-5 text-black font-bold text-[15px] hover:bg-neutral-50 transition-all whitespace-nowrap"
                                    >
                                        Check-in
                                    </button>
                                    <div className="w-[1px] h-8 bg-neutral-100 self-center" />
                                    <button
                                        onClick={() => { setSelectedAction('checkout'); setIsProgramSheetOpen(true); }}
                                        className="px-8 py-5 text-black font-bold text-[15px] hover:bg-neutral-50 transition-all whitespace-nowrap"
                                    >
                                        Check-out
                                    </button>
                                    <div className="w-[1px] h-8 bg-neutral-100 self-center" />
                                    <button
                                        onClick={() => { setSelectedAction('other'); setIsProgramSheetOpen(true); }}
                                        className="px-8 py-5 text-black font-bold text-[15px] hover:bg-neutral-50 transition-all whitespace-nowrap"
                                    >
                                        Autre
                                    </button>
                                    <div className="w-[1px] h-8 bg-neutral-100 self-center" />
                                    <button
                                        onClick={() => setSelectedDays([])}
                                        className="p-5 text-black hover:text-black hover:bg-neutral-50 transition-all"
                                    >
                                        <X size={30} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Program Bottom Sheet */}
                    <AnimatePresence>
                        {isProgramSheetOpen && (
                            <div className="fixed inset-0 z-[10300] flex items-end justify-center">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsProgramSheetOpen(false)}
                                    className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
                                />
                                <motion.div
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    className="relative bg-[#F7F7F7] w-full max-w-[500px] rounded-t-[40px] shadow-2xl overflow-hidden"
                                >
                                    <div className="p-8">
                                        <div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto mb-8" />

                                        <div className="mb-8">
                                            <h3 className="text-[24px] font-bold">Programmer</h3>
                                            <p className="text-neutral-500 font-medium">
                                                {selectedAction === 'checkin' ? 'Entrée' : selectedAction === 'checkout' ? 'Sortie' : 'Intervention'} pour {selectedDays.length} jours
                                            </p>
                                        </div>

                                        {/* Horizontal scrollable list of selected days */}
                                        <div className="mb-8 -mx-8">
                                            <div className="flex gap-4 overflow-x-auto no-scrollbar px-8 pb-2">
                                                {selectedDays.sort().map((dayStr, idx) => {
                                                    const [y, m, d] = dayStr.split('-');
                                                    const dateObj = new Date(parseInt(y), parseInt(m), parseInt(d));
                                                    const formattedDate = dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

                                                    return (
                                                        <div key={idx} className="min-w-[170px] p-5 bg-white rounded-[10px]  flex flex-col items-center gap-4">
                                                            <span className="font-bold text-[14px] capitalize text-neutral-800">{formattedDate}</span>
                                                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-[10px] border border-neutral-200  w-full">
                                                                <input
                                                                    type="time"
                                                                    defaultValue={automation.cleaningTime || "11:00"}
                                                                    className="bg-transparent font-bold text-[16px] outline-none text-center w-full"
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>



                                        <button
                                            onClick={() => {
                                                setIsProgramSheetOpen(false);
                                                setSelectedDays([]);
                                            }}
                                            className="w-full py-5 bg-[#2C2C2C] text-white rounded-[15px] font-bold text-[18px] active:scale-[0.98] transition-all"
                                        >
                                            Programmer
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* FAB Removed */}

                    {/* View Selector Bottom Sheet */}
                    <AnimatePresence>
                        {isViewSheetOpen && (
                            <div className="fixed inset-0 z-[10200] flex items-end justify-center">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsViewSheetOpen(false)}
                                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                />
                                <motion.div
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    exit={{ y: "100%" }}
                                    className="relative bg-white w-full max-w-[500px] rounded-t-[32px] p-6 pb-12 shadow-2xl"
                                >
                                    <div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto mb-8" />
                                    <h3 className="text-[20px] font-bold mb-6">Mode de vue</h3>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => { setViewMode('month'); setIsViewSheetOpen(false); }}
                                            className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${viewMode === 'month' ? 'border-black bg-black text-white shadow-md' : 'border-neutral-100 text-black'}`}
                                        >
                                            <span className="font-bold">Vue Mensuelle</span>
                                            {viewMode === 'month' && <CheckCircle2 size={20} />}
                                        </button>
                                        <button
                                            onClick={() => { setViewMode('day'); setIsViewSheetOpen(false); }}
                                            className={`w-full p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${viewMode === 'day' ? 'border-black bg-black text-white shadow-md' : 'border-neutral-100 text-black'}`}
                                        >
                                            <span className="font-bold">Vue Journalière</span>
                                            {viewMode === 'day' && <CheckCircle2 size={20} />}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PropertyDetailView;
