"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Share, Heart, ChevronLeft, ChevronRight, Star,
    Home, User, Shield, Info, MapPin, Wifi, Car,
    Coffee, Tv, Wind, Globe, Languages, Sparkles,
    Trophy, Key, Maximize, Languages as TranslateIcon,
    QrCode, Copy, Clock, Check, Flame, Waves, TreePine,
    PawPrint, Baby, Bath, Fence, Utensils, Dices,
    Monitor, WashingMachine, ShieldAlert, Flower2,
    Bot, Handshake, Zap, Calendar as CalendarIcon, Plus, CheckCircle2,
    Droplets, Package, BellRing, Wrench, Hammer, MonitorUp, Truck,
    Paintbrush, ChefHat, Map, BookOpen, Plane
} from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import MapView from '@/components/location-picker/MapView';
import { useToast } from '@/context/ToastContext';
import { TbBuildingEstate, TbBuildingCottage, TbBuildingMosque } from 'react-icons/tb';
import { Warehouse, Bed, Ship, Tent, Castle, Hotel as HotelIcon } from 'lucide-react';
import ScheduleInterventionView from './ScheduleInterventionView';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, limit, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface PropertyDetailViewProps {
    property: any;
    isOpen: boolean;
    onClose: () => void;
}

const AMENITY_MAP: Record<string, any> = {
    wifi: { label: { en: 'Fast Wifi', fr: 'Wifi rapide' }, icon: Wifi },
    tv: { label: { en: 'TV', fr: 'Télévision' }, icon: Tv },
    kitchen: { label: { en: 'Kitchen', fr: 'Cuisine' }, icon: Utensils },
    washer: { label: { en: 'Washer', fr: 'Lave-linge' }, icon: WashingMachine },
    parking: { label: { en: 'Free parking', fr: 'Parking gratuit' }, icon: Car },
    ac: { label: { en: 'Air conditioning', fr: 'Climatisation' }, icon: Wind },
    pool: { label: { en: 'Pool', fr: 'Piscine' }, icon: Waves },
    gym: { label: { en: 'Gym', fr: 'Salle de sport' }, icon: Trophy },
    workspace: { label: { en: 'Workspace', fr: 'Espace de travail' }, icon: Monitor },
    smoke_alarm: { label: { en: 'Smoke alarm', fr: 'Détecteur de fumée' }, icon: ShieldAlert },
    first_aid: { label: { en: 'First aid kit', fr: 'Kit de secours' }, icon: ShieldAlert },
    fire_extinguisher: { label: { en: 'Fire extinguisher', fr: 'Extincteur' }, icon: Flame },
    balcony: { label: { en: 'Balcony', fr: 'Balcon' }, icon: Fence },
    garden: { label: { en: 'Garden', fr: 'Jardin' }, icon: TreePine },
    bbq: { label: { en: 'BBQ', fr: 'Barbecue' }, icon: Flame },
    beach_access: { label: { en: 'Beach access', fr: 'Accès plage' }, icon: Waves },
    ski_access: { label: { en: 'Ski-in/Ski-out', fr: 'Accès ski' }, icon: Trophy },
    hot_tub: { label: { en: 'Hot tub', fr: 'Jacuzzi' }, icon: Bath },
    crib: { label: { en: 'Crib', fr: 'Lit bébé' }, icon: Baby },
    high_chair: { label: { en: 'High chair', fr: 'Chaise haute' }, icon: Baby },
    coffee: { label: { en: 'Coffee maker', fr: 'Machine à café' }, icon: Coffee },
    iron: { label: { en: 'Iron', fr: 'Fer à repasser' }, icon: Check },
    hair_dryer: { label: { en: 'Hair dryer', fr: 'Sèche-cheveux' }, icon: Wind },
};

const GUEST_SERVICE_MAP: Record<string, any> = {
    airport_pickup: { label: { en: 'Airport pickup', fr: 'Transfert Aéroport' }, icon: Plane },
    guest_receptionist: { label: { en: 'Guest Receptionist', fr: 'Accueil Voyageurs' }, icon: BellRing },
    cooking: { label: { en: 'Cooking', fr: 'Cuisine' }, icon: ChefHat },
    tour_guide: { label: { en: 'Tour Guide', fr: 'Guide Touristique' }, icon: Map },
    private_driver: { label: { en: 'Private Driver', fr: 'Chauffeur Privé' }, icon: Car },
    car_rental: { label: { en: 'Car Rental', fr: 'Location de Voiture' }, icon: Key },
    learn_arabic: { label: { en: 'Learn Arabic', fr: 'Apprendre l\'arabe' }, icon: BookOpen },
    babysitting: { label: { en: 'Babysitting', fr: 'Garde d\'enfants' }, icon: Baby },
    elderly_care: { label: { en: 'Elderly Care', fr: 'Aide aux seniors' }, icon: Heart },
};

const FUTURE_SERVICE_MAP: Record<string, any> = {
    home_repairs: { label: { en: 'Home Repairs', fr: 'Bricolage' }, icon: Wrench },
    furniture_assembly: { label: { en: 'Furniture Assembly', fr: 'Montage' }, icon: Hammer },
    mounting: { label: { en: 'Mounting', fr: 'Fixation murale' }, icon: MonitorUp },
    moving: { label: { en: 'Moving', fr: 'Déménagement' }, icon: Truck },
    plumbing: { label: { en: 'Plumbing', fr: 'Plomberie' }, icon: Wrench },
    electricity: { label: { en: 'Electricity', fr: 'Électricité' }, icon: Zap },
    painting: { label: { en: 'Painting', fr: 'Peinture' }, icon: Paintbrush },
};

const AUTOMATED_SERVICE_MAP: Record<string, any> = {
    cleaning: { label: { en: 'Cleaning', fr: 'Nettoyage' }, icon: Sparkles },
    glass_cleaning: { label: { en: 'Glass Cleaning', fr: 'Nettoyage de vitres' }, icon: Droplets },
    gardening: { label: { en: 'Gardening', fr: 'Jardinage' }, icon: TreePine },
    pool_cleaning: { label: { en: 'Pool Cleaning', fr: 'Nettoyage de piscine' }, icon: Waves },
    errands: { label: { en: 'Errands', fr: 'Courses' }, icon: Package },
    pets_care: { label: { en: 'Pets Care', fr: 'Soins des animaux' }, icon: PawPrint },
    guest_receptionist: { label: { en: 'Guest Receptionist', fr: 'Accueil Voyageurs' }, icon: BellRing },
};

const SERVICE_ICONS: Record<string, any> = {
    home_repairs: Wrench,
    furniture_assembly: Hammer,
    mounting: MonitorUp,
    moving: Truck,
    cleaning: Sparkles,
    glass_cleaning: Droplets,
    gardening: TreePine,
    plumbing: Wrench,
    electricity: Zap,
    painting: Paintbrush,
    babysitting: Baby,
    pool_cleaning: Waves,
    pets_care: PawPrint,
    errands: Package,
    elderly_care: Heart,
    cooking: ChefHat,
    tour_guide: Map,
    private_driver: Car,
    learn_arabic: BookOpen,
    car_rental: Key,
    airport_pickup: Plane,
    guest_receptionist: BellRing,
};

const TYPE_MAP: Record<string, { label: { en: string, fr: string }, icon: any }> = {
    apartment: { label: { en: 'Apartment', fr: 'Appartement' }, icon: Home },
    villa: { label: { en: 'Villa', fr: 'Villa' }, icon: TbBuildingEstate },
    guesthouse: { label: { en: 'Guesthouse', fr: 'Maison d\'hôtes' }, icon: TbBuildingCottage },
    hotel: { label: { en: 'Hotel', fr: 'Hôtel' }, icon: HotelIcon },
    riad: { label: { en: 'Riad', fr: 'Riad' }, icon: TbBuildingMosque },
    barn: { label: { en: 'Barn', fr: 'Grange' }, icon: Warehouse },
    bed_breakfast: { label: { en: 'B&B', fr: 'Chambre/B&B' }, icon: Bed },
    boat: { label: { en: 'Boat', fr: 'Bateau' }, icon: Ship },
    cabin: { label: { en: 'Cabin', fr: 'Cabane' }, icon: Tent },
    camper: { label: { en: 'Camper', fr: 'Caravane' }, icon: Truck },
    casa_particular: { label: { en: 'Casa particular', fr: 'Casa particular' }, icon: Castle },
};

const PROPERTY_TABS = [
    { id: 'planning', label: { en: 'Planning', fr: 'Planning' } },
    { id: 'team', label: { en: 'Team', fr: 'Équipe' } },
    { id: 'activity', label: { en: 'Activity', fr: 'Activité' } },
    { id: 'details', label: { en: 'Details', fr: 'Détails' } }
] as const;

const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({ property, isOpen, onClose }) => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<'planning' | 'team' | 'activity' | 'details'>('planning');
    const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
    const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [selectedAction, setSelectedAction] = useState<'checkin' | 'checkout' | 'other' | null>(null);
    const [isProgramSheetOpen, setIsProgramSheetOpen] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const longPressOccurred = useRef(false);
    const pointerStartPos = useRef<{ x: number, y: number } | null>(null);
    const currentMonthRef = useRef<HTMLDivElement>(null);
    const currentDayRef = useRef<HTMLDivElement>(null);
    const [showAllInclusions, setShowAllInclusions] = useState(false);
    const [selectedAutomationDetail, setSelectedAutomationDetail] = useState<string | null>(null);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [managedBricolers, setManagedBricolers] = useState<any[]>([]);
    const [isLoadingTeam, setIsLoadingTeam] = useState(false);
    const [isCopying, setIsCopying] = useState(false);

    const scrollToCurrent = () => {
        if (activeTab === 'planning' && viewMode === 'month') {
            if (currentDayRef.current) {
                currentDayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (currentMonthRef.current) {
                currentMonthRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    useEffect(() => {
        if (activeTab === 'planning' && viewMode === 'month') {
            setTimeout(() => {
                scrollToCurrent();
            }, 150);
        }
    }, [activeTab, viewMode]);

    useEffect(() => {
        if (!property?.id || activeTab !== 'team') return;

        setIsLoadingTeam(true);
        const q = collection(db, 'properties', property.id, 'team');
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTeamMembers(members);
            setIsLoadingTeam(false);
        });

        // Also fetch suggested managed bricolers (simplified logic for now)
        const fetchManaged = async () => {
            try {
                const bricolersQ = query(
                    collection(db, 'bricolers'),
                    where('city', '==', property.city || 'Marrakech'),
                    where('isVerified', '==', true),
                    limit(5)
                );
                const bricolersSnap = await getDocs(bricolersQ);
                setManagedBricolers(bricolersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error("Error fetching managed bricolers:", err);
            }
        };
        fetchManaged();

        return () => unsubscribe();
    }, [property?.id, activeTab]);


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

    const automation = property.automation || {};
    const teamManagement = automation.teamManagement || {};
    const propertyCode = property.propertyCode || teamManagement.code;
    const automationServices = automation.services || [];
    const guestServices = (automation.guestServices && automation.guestServices.length > 0) 
        ? automation.guestServices 
        : automationServices.filter((id: string) => GUEST_SERVICE_MAP[id]);
    const futureServices = (automation.futureServices && automation.futureServices.length > 0)
        ? automation.futureServices
        : automationServices.filter((id: string) => FUTURE_SERVICE_MAP[id]);



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
                            className="w-10 h-10 rounded-full bg-[#F7F7F7]  flex items-center justify-center active:scale-90 transition-all mr-3"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <h2 className="font-bold text-[18px] text-black truncate">{name}</h2>
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'details' && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
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
                                        <div className="flex items-center gap-2 text-[16px] font-bold text-black">
                                            {TYPE_MAP[type]?.icon && React.createElement(TYPE_MAP[type].icon, { size: 18, className: "shrink-0" })}
                                            <span>
                                                {t({
                                                    en: `Entire home: ${TYPE_MAP[type]?.label.en || type}`,
                                                    fr: `Logement entier : ${TYPE_MAP[type]?.label.fr || type}`
                                                })} - {address.split(',')[0]}
                                            </span>
                                        </div>
                                        <p className="text-[14px] text-neutral-500 font-medium">
                                            {guests} voyageurs · {bedrooms} chambre · {beds} lit · {bathrooms} salle de bain
                                            {specs.floor !== undefined && ` · Étage ${specs.floor}`}
                                            {specs.apartmentNumber && ` · N° ${specs.apartmentNumber}`}
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

                                    {/* Inclusions Section */}
                                    <div className="mt-12 pt-12 border-t border-neutral-100">
                                        <h2 className="text-[22px] font-bold mb-6">{t({ en: 'Equipments of this place', fr: 'Équipements du logement' })}</h2>
                                        <div className="space-y-4">
                                            {(showAllInclusions ? (specs.amenities || []) : (specs.amenities || []).slice(0, 6)).map((amenityId: string, idx: number) => {
                                                const amenity = AMENITY_MAP[amenityId];
                                                if (!amenity) return null;
                                                const Icon = amenity.icon;
                                                return (
                                                    <div key={idx} className="flex items-center gap-4 text-neutral-800">
                                                        <Icon size={24} strokeWidth={1.5} />
                                                        <span className="text-[16px]">{t(amenity.label)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {(specs.amenities || []).length > 6 && !showAllInclusions && (
                                            <button
                                                onClick={() => setShowAllInclusions(true)}
                                                className="mt-8 w-full py-3.5 border border-black rounded-lg font-bold text-[16px] active:scale-[0.98] transition-all"
                                            >
                                                {t({ en: `Show all ${(specs.amenities || []).length} equipments`, fr: `Afficher les ${(specs.amenities || []).length} équipements` })}
                                            </button>
                                        )}
                                    </div>

                                    {/* Automation Services Section */}
                                    {automationServices.length > 0 && (
                                        <div className="mt-12 pt-12 border-t border-neutral-100">
                                            <h2 className="text-[22px] font-bold mb-6">{t({ en: 'Automated Activities', fr: 'Activités automatisées' })}</h2>
                                            <div className="flex flex-wrap gap-3">
                                                {automationServices.map((svcId: string, idx: number) => {
                                                    const svc = AUTOMATED_SERVICE_MAP[svcId];
                                                    if (!svc) return null;
                                                    const Icon = svc.icon;
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                if (svcId === 'cleaning' || svcId === 'gardening' || svcId === 'glass_cleaning' || svcId === 'guest_receptionist' || svcId === 'pool_cleaning' || svcId === 'pets_care' || svcId === 'errands') {
                                                                    setSelectedAutomationDetail(svcId);
                                                                }
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-2 rounded-full border border-black bg-neutral-50 shadow-sm active:scale-95 transition-all cursor-pointer"
                                                        >
                                                            <Icon size={18} className="text-black" />
                                                            <span className="text-[14px] font-semibold text-black">{t(svc.label)}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Guest Services Section */}
                                    {guestServices.length > 0 && (
                                        <div className="mt-12 pt-12 border-t border-neutral-100">
                                            <h2 className="text-[22px] font-bold mb-6">{t({ en: 'Services for your guests', fr: 'Services pour vos voyageurs' })}</h2>
                                            <div className="flex flex-wrap gap-3">
                                                {guestServices.map((svcId: string, idx: number) => {
                                                    const svc = GUEST_SERVICE_MAP[svcId];
                                                    if (!svc) return null;
                                                    const Icon = svc.icon;
                                                    return (
                                                        <div key={idx} className="flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-200 hover:border-black transition-colors">
                                                            <Icon size={18} className="text-black" />
                                                            <span className="text-[14px] font-semibold text-black">{t(svc.label)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Future Services Section */}
                                    {futureServices.length > 0 && (
                                        <div className="mt-12 pt-12 border-t border-neutral-100">
                                            <h2 className="text-[22px] font-bold mb-6">{t({ en: 'Other needs', fr: 'Autres besoins' })}</h2>
                                            <div className="flex flex-wrap gap-3">
                                                {futureServices.map((svcId: string, idx: number) => {
                                                    const svc = FUTURE_SERVICE_MAP[svcId];
                                                    if (!svc) return null;
                                                    const Icon = svc.icon;
                                                    return (
                                                        <div key={idx} className="flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-200 hover:border-black transition-colors">
                                                            <Icon size={18} className="text-black" />
                                                            <span className="text-[14px] font-semibold text-black">{t(svc.label)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

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
                                        <div className="mt-6 space-y-1">
                                            <h4 className="font-bold text-[16px]">{address}</h4>
                                            {specs.apartmentNumber && (
                                                <p className="text-neutral-500 text-[14px]">
                                                    {t({ en: 'Apt / Door:', fr: 'N° Porte :' })} {specs.apartmentNumber}
                                                    {specs.floor !== undefined && ` · ${t({ en: 'Floor:', fr: 'Étage :' })} ${specs.floor}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'planning' && (
                            <motion.div
                                key="planning"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
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
                                                <div key={monthName} ref={monthIdx === new Date().getMonth() ? currentMonthRef : null}>
                                                    <h2 className={`text-[22px] font-bold mb-6 lowercase first-letter:uppercase ${monthIdx === new Date().getMonth() ? 'text-black' : 'text-neutral-400'}`}>
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
                                                            const today = new Date();
                                                            const isToday = monthIdx === today.getMonth() && day === today.getDate() && year === today.getFullYear();
                                                            const isPast = monthIdx < today.getMonth() || (monthIdx === today.getMonth() && day < today.getDate());

                                                            const dayDate = `${year}-${monthIdx}-${day}`;
                                                            const isSelected = selectedDays.includes(dayDate);

                                                            const handleInteractionStart = (e: React.PointerEvent) => {
                                                                pointerStartPos.current = { x: e.clientX, y: e.clientY };
                                                                longPressOccurred.current = false;
                                                                const timer = setTimeout(() => {
                                                                    longPressOccurred.current = true;
                                                                    if (selectedDays.includes(dayDate)) {
                                                                        setSelectedDays(prev => prev.filter(d => d !== dayDate));
                                                                    } else {
                                                                        setSelectedDays(prev => [...prev, dayDate]);
                                                                    }
                                                                }, 600);
                                                                setLongPressTimer(timer);
                                                            };

                                                            const handleInteractionEnd = (e: React.PointerEvent) => {
                                                                if (longPressTimer) {
                                                                    clearTimeout(longPressTimer);
                                                                    setLongPressTimer(null);

                                                                    if (longPressOccurred.current) return;

                                                                    // Check if moved (scrolled)
                                                                    if (pointerStartPos.current) {
                                                                        const dx = Math.abs(e.clientX - pointerStartPos.current.x);
                                                                        const dy = Math.abs(e.clientY - pointerStartPos.current.y);
                                                                        if (dx > 10 || dy > 10) return;
                                                                    }

                                                                    if (selectedDays.length > 0) {
                                                                        if (selectedDays.includes(dayDate)) {
                                                                            setSelectedDays(prev => prev.filter(d => d !== dayDate));
                                                                        } else {
                                                                            setSelectedDays(prev => [...prev, dayDate]);
                                                                        }
                                                                    } else {
                                                                        setSelectedDate(new Date(year, monthIdx, day));
                                                                        setViewMode('day');
                                                                    }
                                                                }
                                                            };

                                                            return (
                                                                <div
                                                                    key={day}
                                                                    ref={isToday ? currentDayRef : null}
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

                                                const totalMinutesSinceStart = (currentHour - startHour) * 60 + currentMinutes;
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
                            <motion.div
                                key="team"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="px-6 py-8 space-y-12 pb-32"
                            >
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-[20px] text-black tracking-tight">{t({ en: 'Invite a member', fr: 'Inviter un membre' })}</h3>
                                        <p className="text-[14px] text-neutral-500 font-medium">{t({ en: 'Share this code with your staff to manage the property together.', fr: 'Partagez ce code avec votre personnel pour gérer le logement ensemble.' })}</p>
                                    </div>
                                    
                                    <div className="relative group">
                                        <div className="flex items-center justify-between border-[1.5px] border-neutral-200 focus-within:border-black rounded-[5px] bg-neutral-50/50 p-5 transition-all">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">{t({ en: 'Invitation Code', fr: 'Code d\'invitation' })}</span>
                                                <span className="font-mono font-black text-[24px] text-black tracking-[0.2em]">{propertyCode || '---'}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(propertyCode);
                                                    setIsCopying(true);
                                                    showToast({ title: t({ en: 'Code copied!', fr: 'Code copié !' }), variant: 'success' });
                                                    setTimeout(() => setIsCopying(false), 2000);
                                                }}
                                                className="w-14 h-14 rounded-[5px] flex items-center justify-center bg-white border border-neutral-200 hover:border-black transition-all active:scale-95 shadow-sm"
                                            >
                                                {isCopying ? <Check size={22} className="text-[#01A083]" /> : <Copy size={22} className="text-black" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Team Members List */}
                                <div className="space-y-6">
                                    {isLoadingTeam ? (
                                        <div className="py-10 flex flex-col items-center gap-4">
                                            <div className="w-8 h-8 border-3 border-neutral-100 border-t-black rounded-full animate-spin" />
                                            <span className="text-sm text-neutral-400 font-medium">{t({ en: 'Loading team...', fr: 'Chargement de l\'équipe...' })}</span>
                                        </div>
                                    ) : teamMembers.length > 0 ? (
                                        <div className="space-y-4">
                                            <h3 className="font-bold text-[18px] text-black tracking-tight">{t({ en: 'Team Members', fr: 'Membres de l\'équipe' })} ({teamMembers.length})</h3>
                                            <div className="space-y-2">
                                                {teamMembers.map((member) => (
                                                    <div key={member.id} className="flex items-center gap-4 p-4 rounded-[5px] border border-neutral-100 hover:border-neutral-200 transition-all bg-white">
                                                        <div className="relative w-12 h-12 rounded-[5px] overflow-hidden bg-neutral-100 shrink-0">
                                                            {member.photoURL ? (
                                                                <img src={member.photoURL} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-neutral-200 text-neutral-500 font-bold text-lg">
                                                                    {member.name?.[0] || 'B'}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-[16px] text-black truncate">{member.name}</h4>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[11px] font-bold text-[#01A083] uppercase tracking-wider">
                                                                    {member.role === 'admin' ? 'Admin' : 'Staff'}
                                                                </span>
                                                                <div className="w-1 h-1 rounded-full bg-neutral-300" />
                                                                <span className="text-[12px] text-neutral-400 font-medium truncate">
                                                                    {member.skills?.map((s: string) => AUTOMATED_SERVICE_MAP[s]?.label.fr || s).join(', ')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm(t({ en: 'Remove this member?', fr: 'Retirer ce membre ?' }))) {
                                                                    try {
                                                                        await deleteDoc(doc(db, 'properties', property.id, 'team', member.id));
                                                                        showToast({ title: t({ en: 'Member removed', fr: 'Membre retiré' }), variant: 'success' });
                                                                    } catch (err) {
                                                                        showToast({ title: 'Error removing member', variant: 'error' });
                                                                    }
                                                                }
                                                            }}
                                                            className="w-10 h-10 rounded-[5px] flex items-center justify-center text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-12 px-6 rounded-[5px] bg-neutral-50 flex flex-col items-center text-center space-y-4">
                                            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center">
                                                <Users size={32} className="text-neutral-200" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-black text-[17px]">{t({ en: 'No team members yet', fr: 'Aucun membre d\'équipe' })}</h4>
                                                <p className="text-[14px] text-neutral-500 max-w-[240px] mx-auto font-medium leading-relaxed">{t({ en: 'Invite your staff using the code above to manage the property together.', fr: 'Invitez votre personnel à l\'aide du code ci-dessus pour gérer le logement ensemble.' })}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black text-[22px] text-black tracking-tight">{t({ en: 'Lbricol Bricolers', fr: 'Bricoleurs Lbricol' })}</h3>
                                        </div>
                                    </div>
                                    <p className="text-[14px] text-neutral-500 leading-relaxed">
                                        {t({
                                            en: 'Qualified professionals in your area available for your automation needs.',
                                            fr: 'Des professionnels qualifiés dans votre zone disponibles pour vos besoins d\'automatisation.'
                                        })}
                                    </p>
                                    <div className="space-y-4">
                                    <div className="space-y-3">
                                        {managedBricolers.map((b) => (
                                            <div key={b.id} className="group flex items-center gap-4 p-4 rounded-[5px] border border-neutral-100 bg-white hover:border-black transition-all cursor-pointer">
                                                <div className="relative w-12 h-12 rounded-[5px] overflow-hidden bg-neutral-100 shrink-0">
                                                    <img src={b.photoURL || b.avatar || b.profilePhotoURL} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-[16px] text-black truncate">{b.name || b.displayName}</h4>
                                                        <div className="flex items-center gap-1">
                                                            <Star size={12} className="text-amber-400 fill-amber-400" />
                                                            <span className="text-[12px] font-bold text-black">{b.rating || '5.0'}</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-[12px] text-neutral-400 font-medium truncate mt-0.5">
                                                        {b.serviceIds?.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
                                                    </p>
                                                </div>
                                                <button className="px-5 py-2.5 bg-black text-white rounded-full text-[12px] font-bold active:scale-95 transition-all">
                                                    {t({ en: 'Book', fr: 'Réserver' })}
                                                </button>
                                            </div>
                                        ))}
                                        <button className="w-full bg-[#2C2C2C] py-4.5 h-14 flex items-center justify-center text-white font-bold text-[15px] rounded-[5px] active:scale-[0.98] transition-all">
                                            {t({ en: 'See all local pros', fr: 'Voir tous les pros locaux' })}
                                        </button>
                                    </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'activity' && (
                            <motion.div
                                key="activity"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="px-6 py-20 text-center"
                            >
                                <h2 className="text-neutral-400 font-medium">Section Activité à venir</h2>
                            </motion.div>
                        )}
                    </AnimatePresence>

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

                    <AnimatePresence mode="wait">
                        {selectedDays.length === 0 ? (
                            <motion.div
                                key="tabs"
                                initial={{ y: 100, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 100, opacity: 0 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.3 }}
                                className="fixed bottom-0 left-0 right-0 z-[10110] bg-white border-t border-neutral-100 flex justify-around items-center px-4 py-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
                            >
                                {PROPERTY_TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            if (tab.id === 'planning' && activeTab === 'planning' && viewMode === 'day') {
                                                setViewMode('month');
                                            } else {
                                                setActiveTab(tab.id as any);
                                            }
                                        }}
                                        className="flex flex-col items-center gap-1 py-2 flex-1 transition-all"
                                    >
                                        <div className={`relative px-6 py-2 rounded-full font-bold text-[13px] ${activeTab === tab.id ? 'bg-[#2C2C2C] text-white' : 'text-neutral-500'}`}>
                                            {t(tab.label)}
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="actions"
                                initial={{ y: 100 }}
                                animate={{ y: 0 }}
                                exit={{ y: 100 }}
                                className="fixed bottom-0 left-0 right-0 z-[10110] bg-white border-t border-neutral-100 flex items-center justify-between px-2 py-4 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
                            >
                                <div className="flex flex-1 items-center justify-around gap-1 overflow-x-auto no-scrollbar">
                                    <button
                                        onClick={() => { setSelectedAction('checkin'); setIsProgramSheetOpen(true); }}
                                        className="px-4 xs:px-6 py-3 text-black font-bold text-[14px] xs:text-[15px] hover:bg-neutral-50 transition-all whitespace-nowrap"
                                    >
                                        Check-in
                                    </button>
                                    <div className="w-[1px] h-6 bg-neutral-100 shrink-0" />
                                    <button
                                        onClick={() => { setSelectedAction('checkout'); setIsProgramSheetOpen(true); }}
                                        className="px-4 xs:px-6 py-3 text-black font-bold text-[14px] xs:text-[15px] hover:bg-neutral-50 transition-all whitespace-nowrap"
                                    >
                                        Check-out
                                    </button>
                                    <div className="w-[1px] h-6 bg-neutral-100 shrink-0" />
                                    <button
                                        onClick={() => { setSelectedAction('other'); setIsProgramSheetOpen(true); }}
                                        className="px-4 xs:px-6 py-3 text-black font-bold text-[14px] xs:text-[15px] hover:bg-neutral-50 transition-all whitespace-nowrap"
                                    >
                                        Autre
                                    </button>
                                </div>
                                <div className="w-[1px] h-6 bg-neutral-100 shrink-0 mx-1" />
                                <button
                                    onClick={() => setSelectedDays([])}
                                    className="p-4 text-black active:scale-90 transition-all shrink-0"
                                >
                                    <X size={24} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Program Full Page View */}
                    <AnimatePresence>
                        {isProgramSheetOpen && (
                            <ScheduleInterventionView
                                property={property}
                                onClose={() => setIsProgramSheetOpen(false)}
                                onConfirm={(jobs) => {
                                    setIsProgramSheetOpen(false);
                                    setSelectedDays([]);
                                    // Optionally update calendar view to show confirmed jobs
                                }}
                            />
                        )}
                    </AnimatePresence>

                    {/* Automation Detail Full Page View */}
                    <AnimatePresence>
                        {selectedAutomationDetail === 'cleaning' && automation.cleaningDetails && (
                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                                className="fixed inset-0 z-[10200] bg-white flex flex-col font-plus-jakarta overflow-hidden"
                            >
                                {/* Header */}
                                <div className="px-6 pt-5 pb-4 flex items-center justify-end shrink-0">
                                    <button
                                        onClick={() => setSelectedAutomationDetail(null)}
                                        className="font-bold px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black"
                                    >
                                        {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                    </button>
                                </div>
                                {/* Scrollable content showing the details */}
                                <div className="flex-1 overflow-y-auto px-6 py-6 pb-32">
                                    <h2 className="text-[32px] font-medium text-black mb-10 tracking-tight">
                                        {t({ en: 'Cleaning details', fr: 'nettoyage' })}
                                    </h2>
                                    <div className="space-y-12">
                                        {/* Sub-services */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[18px] text-black leading-tight tracking-tight">
                                                {t({ en: 'What type of cleaning do you need?', fr: 'Quel type de nettoyage avez-vous besoin ?' })}
                                            </h3>
                                            <div className="flex flex-wrap gap-3">
                                                {[
                                                    { id: 'hospitality', label: 'Post-checkout cleaning', labelFr: 'Nettoyage post-checkout' },
                                                    { id: 'deep', label: 'Deep cleaning', labelFr: 'Nettoyage en profondeur' },
                                                    { id: 'stairs', label: 'Stairs cleaning', labelFr: 'Nettoyage des escaliers' }
                                                ].map(sub => {
                                                    const isSubSelected = automation.cleaningDetails.subServices?.includes(sub.id);
                                                    if (!isSubSelected) return (
                                                        <div key={sub.id} className="px-5 py-2.5 rounded-full border text-[14px] font-semibold bg-white text-black border-neutral-200 opacity-60">
                                                            {t({ en: sub.label, fr: sub.labelFr })}
                                                        </div>
                                                    );
                                                    return (
                                                        <div
                                                            key={sub.id}
                                                            className="px-5 py-2.5 rounded-full border text-[14px] font-semibold bg-white text-black border-black border-[2px]"
                                                        >
                                                            {t({ en: sub.label, fr: sub.labelFr })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Frequencies */}
                                        {automation.cleaningDetails.subServices?.map((subId: string) => (
                                            <div
                                                key={subId}
                                                className="space-y-6 p-8 rounded-[10px] border border-neutral-200 bg-white shadow-sm overflow-hidden"
                                            >
                                                <h4 className="font-medium text-[18px] text-black leading-snug">
                                                    {subId === 'hospitality' && t({ en: 'When should we do the post-checkout cleaning?', fr: 'Quand devrions-nous faire le ménage après chaque départ ?' })}
                                                    {subId === 'deep' && t({ en: 'How often do you need a deep cleaning?', fr: 'À quelle fréquence avez-vous besoin d\'un grand ménage ?' })}
                                                    {subId === 'stairs' && t({ en: 'How often do you need stairs cleaning?', fr: 'À quelle fréquence avez-vous besoin du nettoyage des escaliers ?' })}
                                                </h4>

                                                {subId === 'hospitality' ? (
                                                    <div className="flex items-center gap-4">
                                                        <div className="px-5 py-3 rounded-[10px] bg-[#F7F7F7] text-[17px] font-medium flex items-center gap-2 text-black">
                                                            {automation.cleaningDetails.frequencies?.[subId] || '11:00'}
                                                            <Clock size={18} className="text-black" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            { id: '2w', en: 'Each two weeks', fr: 'Toutes les deux semaines' },
                                                            { id: '1m', en: 'Each month', fr: 'Chaque mois' },
                                                            { id: '2m', en: 'Each two months', fr: 'Tous les deux mois' },
                                                            { id: '3m', en: 'Each three months', fr: 'Tous les trois mois' }
                                                        ].map(freq => {
                                                            const isSelected = automation.cleaningDetails.frequencies?.[subId] === freq.id;
                                                            if (!isSelected) return (
                                                                <div key={freq.id} className="px-5 py-2.5 rounded-full border text-[14px] font-semibold transition-all bg-white text-black border-neutral-200 opacity-60">
                                                                    {t({ en: freq.en, fr: freq.fr })}
                                                                </div>
                                                            );
                                                            return (
                                                                <div key={freq.id} className="px-5 py-2.5 rounded-full border text-[14px] font-semibold transition-all bg-white text-black border-black border-[2px]">
                                                                    {t({ en: freq.en, fr: freq.fr })}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {subId === 'stairs' && automation.cleaningDetails.stairsSize && (
                                                    <div className="space-y-4 pt-6 border-t border-neutral-100 mt-6">
                                                        <h5 className="font-medium text-[16px] text-black mb-4">
                                                            {t({ en: 'What is the size of the stairs?', fr: 'Quelle est la taille des escaliers ?' })}
                                                        </h5>
                                                        <div className="flex flex-wrap gap-3">
                                                            {typeof automation.cleaningDetails.stairsSize === 'number' || !isNaN(Number(automation.cleaningDetails.stairsSize)) ? (
                                                                <div className="px-5 py-2.5 rounded-full border text-[14px] font-semibold transition-all bg-white text-black border-black border-[2px]">
                                                                    {automation.cleaningDetails.stairsSize} {t({ en: 'Floors', fr: 'Étages' })}
                                                                </div>
                                                            ) : (
                                                                [
                                                                    { id: 'small', en: 'Small', fr: 'Petits' },
                                                                    { id: 'medium', en: 'Medium', fr: 'Moyens' },
                                                                    { id: 'big', en: 'Big', fr: 'Grands' }
                                                                ].map(size => {
                                                                    const isSelected = automation.cleaningDetails.stairsSize === size.id;
                                                                    return (
                                                                        <div 
                                                                            key={size.id} 
                                                                            className={`px-5 py-2.5 rounded-full border text-[14px] font-semibold transition-all bg-white text-black ${
                                                                                isSelected ? 'border-black border-[2px]' : 'border-neutral-200 opacity-60'
                                                                            }`}
                                                                        >
                                                                            {t({ en: size.en, fr: size.fr })}
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Checklist */}
                                        {automation.cleaningDetails.checklist?.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-[18px] text-black">
                                                    {t({ en: 'Specific instructions / Checklist', fr: 'Instructions spécifiques / Checklist' })}
                                                </h3>
                                                <p className="text-[15px] text-neutral-500 leading-relaxed mb-4">
                                                    {t({
                                                        en: 'Note down what you want the bricolers to follow during their service.',
                                                        fr: 'Notez ce que vous voulez que les bricoleurs suivent pendant leur service.'
                                                    })}
                                                </p>
                                                <div className="space-y-4">
                                                    {automation.cleaningDetails.checklist.map((item: string, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-4">
                                                            <div className="mt-1 w-6 h-6 rounded-full border-2 bg-[#00CA52] border-[#00CA52] flex items-center justify-center shrink-0">
                                                                <Check size={12} className="text-white" strokeWidth={3} />
                                                            </div>
                                                            <div className="flex-1 text-[16px] text-black">
                                                                {item}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Reference photos */}
                                        {automation.cleaningDetails.referencePhotos?.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-[18px] text-black">
                                                    {t({ en: 'Reference photos', fr: 'Photos de référence' })}
                                                </h3>
                                                <p className="text-[15px] text-neutral-500 leading-relaxed mb-4">
                                                    {t({
                                                        en: 'Photos showing the standard of cleanliness you expect.',
                                                        fr: 'Téléchargez des photos montrant le niveau de propreté attendu (ex: comment faire le lit, comment organiser les serviettes).'
                                                    })}
                                                </p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {automation.cleaningDetails.referencePhotos.map((photo: string, idx: number) => (
                                                        <div key={idx} className="relative aspect-square rounded-[16px] overflow-hidden shadow-sm border border-neutral-100">
                                                            <img src={photo} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="px-6 pt-4 pb-6 border-t border-neutral-100 bg-white z-20 shrink-0">
                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={() => setSelectedAutomationDetail(null)}
                                            className="font-medium text-[17px] text-black underline underline-offset-4"
                                        >
                                            {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                                        </button>
                                        <button
                                            onClick={() => setSelectedAutomationDetail(null)}
                                            className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[12px] text-[17px] font-medium active:scale-[0.98] transition-all"
                                        >
                                            {t({ en: 'Next', fr: 'Suivant' })}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Gardening Detail Full Page View */}
                    <AnimatePresence>
                        {selectedAutomationDetail === 'gardening' && automation.gardeningDetails && (
                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                                className="fixed inset-0 z-[10200] bg-white flex flex-col font-plus-jakarta overflow-hidden"
                            >
                                {/* Header */}
                                <div className="px-6 pt-5 pb-4 flex items-center justify-end shrink-0">
                                    <button
                                        onClick={() => setSelectedAutomationDetail(null)}
                                        className="font-bold px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black"
                                    >
                                        {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                    </button>
                                </div>
                                {/* Scrollable content showing the details */}
                                <div className="flex-1 overflow-y-auto px-6 py-6 pb-32">
                                    <h2 className="text-[32px] font-medium text-black mb-10 tracking-tight">
                                        {t({ en: 'Tell us about your garden', fr: 'Parlez-nous de votre jardin' })}
                                    </h2>
                                    <div className="space-y-12">
                                        {/* Gardening Activities */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[18px] text-black leading-tight tracking-tight">
                                                {t({ en: 'What gardening activities do you want?', fr: 'Quelles activités de jardinage souhaitez-vous ?' })}
                                            </h3>
                                            <div className="grid grid-cols-1 gap-3">
                                                {[
                                                    { id: 'lawn_mowing', label: 'Lawn mowing', labelFr: 'Tonte de pelouse' },
                                                    { id: 'trimming', label: 'Branch and hedge trimming', labelFr: 'Taille des branches et haies' },
                                                    { id: 'watering', label: 'Watering', labelFr: 'Arrosage' },
                                                    { id: 'landscaping', label: 'Planting and landscaping', labelFr: 'Plantation et aménagement' },
                                                    { id: 'cleanup', label: 'Garden cleanup', labelFr: 'Nettoyage de jardin' }
                                                ].map(service => {
                                                    const isSubSelected = automation.gardeningDetails.subServices?.includes(service.id);
                                                    if (!isSubSelected) return (
                                                        <div key={service.id} className="w-full flex items-center justify-between p-5 rounded-[10px] border transition-all border-neutral-200 bg-white opacity-60">
                                                            <span className="text-[17px] font-medium text-black">{t({ en: service.label, fr: service.labelFr })}</span>
                                                        </div>
                                                    );
                                                    return (
                                                        <div key={service.id} className="w-full flex items-center justify-between p-5 rounded-[10px] border transition-all border-black border-[3.5px] bg-neutral-50">
                                                            <span className="text-[17px] font-medium text-black">{t({ en: service.label, fr: service.labelFr })}</span>
                                                            <Check size={20} className="text-black" strokeWidth={2.5} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Lawn Mowing Details */}
                                        {automation.gardeningDetails.subServices?.includes('lawn_mowing') && (
                                            <div className="space-y-8 p-8 rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                                                <h4 className="font-black text-[25px] text-black border-b border-neutral-200 pb-4 mb-4 flex items-center gap-2">
                                                    {t({ en: 'Lawn Mowing Details', fr: 'Détails de la tonte' })}
                                                </h4>

                                                <div className="space-y-4">
                                                    <h3 className="font-medium text-[17px] text-black">
                                                        {t({ en: 'How big is your garden?', fr: 'Quelle est la taille de votre jardin ?' })}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-3">
                                                        {[
                                                            { id: 'small', label: 'Small', fr: 'Petit' },
                                                            { id: 'medium', label: 'Medium', fr: 'Moyen' },
                                                            { id: 'large', label: 'Large', fr: 'Grand' },
                                                            { id: 'estate', label: 'Estate', fr: 'Domaine' }
                                                        ].map(size => {
                                                            const isSelected = automation.gardeningDetails.gardenSize === size.id;
                                                            if (!isSelected) return (
                                                                <div key={size.id} className="px-5 py-2.5 rounded-full border text-[14px] font-semibold transition-all border-neutral-200 text-black bg-white opacity-60">
                                                                    {t({ en: size.label, fr: size.fr })}
                                                                </div>
                                                            );
                                                            return (
                                                                <div key={size.id} className="px-5 py-2.5 rounded-full border text-[14px] font-semibold transition-all bg-neutral-50 text-black border-black border-[2px]">
                                                                    {t({ en: size.label, fr: size.fr })}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="flex items-start justify-between py-6 border-t border-neutral-50 mt-4 gap-4">
                                                    <div className="flex flex-col gap-1 flex-1">
                                                        <span className="text-[17px] font-medium text-black leading-tight">{t({ en: 'Should the bricoler bring mower?', fr: 'Le bricoleur doit-il apporter sa tondeuse ?' })}</span>
                                                    </div>
                                                    <div className={`w-14 h-8 rounded-full transition-all flex items-center px-1 shrink-0 ${automation.gardeningDetails.shouldBringMower ? 'bg-black' : 'bg-neutral-200'}`}>
                                                        <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-all ${automation.gardeningDetails.shouldBringMower ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Trimming Details */}
                                        {automation.gardeningDetails.subServices?.includes('trimming') && (
                                            <div className="space-y-8 p-8 rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                                                <h4 className="font-black text-[25px] text-black border-b border-neutral-100 pb-4 mb-4 flex items-center gap-2">
                                                    {t({ en: 'Branch & Hedge Trimming', fr: 'Taille branches et haies' })}
                                                </h4>

                                                <div className="flex items-center justify-between pb-4">
                                                    <span className="text-[18px] font-medium text-black">{t({ en: 'How many trees?', fr: 'Combien d\'arbres ?' })}</span>
                                                    <div className="flex items-center gap-4">
                                                        <div className="font-medium text-[20px] px-2">{automation.gardeningDetails.treeCount}</div>
                                                    </div>
                                                </div>

                                                <div className="space-y-6 pt-4">
                                                    <div className="flex justify-between items-start mb-8">
                                                        <div>
                                                            <div className="font-medium text-[18px] text-black">{t({ en: 'Average Tree Height', fr: 'Hauteur moyenne' })}</div>
                                                            <div className="text-[14px] text-neutral-500 mt-1">{t({ en: 'Tip: average is 3m', fr: 'Conseil : moyenne est 3m' })}</div>
                                                        </div>
                                                        <div className="font-medium text-[22px] text-black px-6 py-4 rounded-[10px] border border-neutral-300 bg-white min-w-[100px] text-center">
                                                            {automation.gardeningDetails.averageTreeHeight}m
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <h3 className="font-medium text-[17px] text-black">
                                                        {t({ en: 'Preferred Service', fr: 'Service préféré' })}
                                                    </h3>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { id: 'shaping', label: 'Shaping & Design', desc: 'For aesthetic looks', fr: 'Forme et Design', descFr: 'Pour l\'esthétique' },
                                                            { id: 'thinning', label: 'Thinning / Health', desc: 'Improve light & air flow', fr: 'Éclaircissage / Santé', descFr: 'Améliore la lumière et l\'air' },
                                                            { id: 'deadwood', label: 'Deadwood / Safety', desc: 'Remove old/risky branches', fr: 'Bois mort / Sécurité', descFr: 'Retirer les branches risquées' },
                                                            { id: 'removal', label: 'Complete Removal', desc: 'Cutting tree to ground', fr: 'Retrait complet', descFr: 'Coupe au ras du sol' }
                                                        ].map(service => {
                                                            const isSelected = automation.gardeningDetails.preferredTreeServices?.includes(service.id);
                                                            if (!isSelected) return (
                                                                <div key={service.id} className="flex items-center justify-between p-5 rounded-[10px] border transition-all text-left border-neutral-200 bg-white opacity-60">
                                                                    <div>
                                                                        <div className="font-medium text-black text-[16px] mb-0.5">{t({ en: service.label, fr: service.fr })}</div>
                                                                        <div className="text-[14px] text-neutral-500 font-medium">{t({ en: service.desc, fr: service.descFr })}</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                            return (
                                                                <div key={service.id} className="flex items-center justify-between p-5 rounded-[10px] border transition-all text-left border-black border-[3.5px] bg-neutral-50">
                                                                    <div>
                                                                        <div className="font-medium text-black text-[16px] mb-0.5">{t({ en: service.label, fr: service.fr })}</div>
                                                                        <div className="text-[14px] text-neutral-500 font-medium">{t({ en: service.desc, fr: service.descFr })}</div>
                                                                    </div>
                                                                    <Check size={20} className="text-black" strokeWidth={2.5} />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="flex items-start justify-between pt-6 border-t border-neutral-50 gap-4">
                                                    <div className="flex-1">
                                                        <span className="text-[17px] font-medium text-black leading-tight">
                                                            {t({ en: 'Is Waste Removal included?', fr: 'Évacuation des déchets incluse ?' })}
                                                        </span>
                                                    </div>
                                                    <div className={`w-14 h-8 rounded-full transition-all flex items-center px-1 shrink-0 ${automation.gardeningDetails.isWasteRemovalIncluded ? 'bg-black' : 'bg-neutral-200'}`}>
                                                        <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-all ${automation.gardeningDetails.isWasteRemovalIncluded ? 'translate-x-6' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Frequency Selection */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[20px] text-black">
                                                {t({ en: 'Maintenance frequency', fr: 'Fréquence de l\'entretien' })}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { id: 'week', label: 'Each week', fr: 'Chaque semaine' },
                                                    { id: '2weeks', label: 'Every 2 weeks', fr: 'Toutes les 2 semaines' },
                                                    { id: 'month', label: 'Each month', fr: 'Chaque mois' },
                                                    { id: 'on_call', label: 'On call', fr: 'Sur demande' }
                                                ].map(freq => {
                                                    const isSelected = automation.gardeningDetails.frequencies === freq.id;
                                                    if (!isSelected) return (
                                                        <div key={freq.id} className="p-5 rounded-[10px] border text-center transition-all border-neutral-200 text-black bg-white opacity-60">
                                                            <span className="text-[16px] font-medium">{t({ en: freq.label, fr: freq.fr })}</span>
                                                        </div>
                                                    );
                                                    return (
                                                        <div key={freq.id} className="p-5 rounded-[10px] border text-center transition-all border-black border-[2px] bg-neutral-50">
                                                            <span className="text-[16px] font-medium">{t({ en: freq.label, fr: freq.fr })}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Checklist */}
                                        {automation.gardeningDetails.checklist?.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-[18px] text-black">
                                                    {t({ en: 'Add any instructions (checklist)', fr: 'Ajouter des instructions (checklist)' })}
                                                </h3>
                                                <div className="space-y-4">
                                                    {automation.gardeningDetails.checklist.map((item: string, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-4">
                                                            <div className="mt-1 w-6 h-6 rounded-full border-2 bg-[#00CA52] border-[#00CA52] flex items-center justify-center shrink-0">
                                                                <Check size={12} className="text-white" strokeWidth={3} />
                                                            </div>
                                                            <div className="flex-1 text-[16px] text-black">
                                                                {item}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Reference photos */}
                                        {automation.gardeningDetails.referencePhotos?.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-[18px] text-black">
                                                    {t({ en: 'Add any photos', fr: 'Ajouter des photos' })}
                                                </h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {automation.gardeningDetails.referencePhotos.map((photo: string, idx: number) => (
                                                        <div key={idx} className="relative aspect-square rounded-[16px] overflow-hidden shadow-sm border border-neutral-100">
                                                            <img src={photo} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="px-6 pt-4 pb-6 border-t border-neutral-100 bg-white z-20 shrink-0">
                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={() => setSelectedAutomationDetail(null)}
                                            className="font-medium text-[17px] text-black underline underline-offset-4"
                                        >
                                            {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                                        </button>
                                        <button
                                            onClick={() => setSelectedAutomationDetail(null)}
                                            className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[12px] text-[17px] font-medium active:scale-[0.98] transition-all"
                                        >
                                            {t({ en: 'Next', fr: 'Suivant' })}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Glass Cleaning Detail Full Page View */}
                    <AnimatePresence>
                        {selectedAutomationDetail === 'glass_cleaning' && automation.glassCleaningDetails && (
                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                                className="fixed inset-0 z-[10200] bg-white flex flex-col font-plus-jakarta overflow-hidden"
                            >
                                {/* Header */}
                                <div className="px-6 pt-5 pb-4 flex items-center justify-end shrink-0">
                                    <button
                                        onClick={() => setSelectedAutomationDetail(null)}
                                        className="font-bold px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black"
                                    >
                                        {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                    </button>
                                </div>
                                {/* Scrollable content showing the details */}
                                <div className="flex-1 overflow-y-auto px-6 py-6 pb-32">
                                    <h2 className="text-[32px] font-medium text-black mb-10 tracking-tight">
                                        {t({ en: 'Tell us about your windows', fr: 'Parlez-nous de vos vitres' })}
                                    </h2>
                                    <div className="space-y-12">

                                        {/* Windows Count */}
                                        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                                            <span className="text-[18px] font-medium text-black">{t({ en: 'How many windows?', fr: 'Combien de fenêtres ?' })}</span>
                                            <div className="font-medium text-[20px] px-2">{automation.glassCleaningDetails.windowsCount}</div>
                                        </div>

                                        {/* Windows Size */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[18px] text-black">
                                                {t({ en: 'The size of majority of windows', fr: 'La taille de la majorité des vitres' })}
                                            </h3>
                                            <div className="flex flex-wrap gap-3">
                                                {[
                                                    { id: 'small', label: 'Small', labelFr: 'Petites' },
                                                    { id: 'medium', label: 'Medium', labelFr: 'Moyennes' },
                                                    { id: 'big', label: 'Big', labelFr: 'Grandes' }
                                                ].map(size => {
                                                    const isSelected = automation.glassCleaningDetails.windowsSize === size.id;
                                                    if (!isSelected) return (
                                                        <div key={size.id} className="px-5 py-2.5 rounded-full border transition-all text-[14px] font-semibold border-neutral-200 text-black bg-white opacity-60">
                                                            {t({ en: size.label, fr: size.labelFr })}
                                                        </div>
                                                    );
                                                    return (
                                                        <div key={size.id} className="px-5 py-2.5 rounded-full border transition-all text-[14px] font-semibold border-black border-[2px] bg-neutral-50 text-black">
                                                            {t({ en: size.label, fr: size.labelFr })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Coverage */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[18px] text-black">
                                                {t({ en: 'Coverage', fr: 'Couverture' })}
                                            </h3>
                                            <div className="flex flex-wrap gap-3">
                                                {[
                                                    { id: 'interior', label: 'Interior', labelFr: 'Intérieur' },
                                                    { id: 'exterior', label: 'Exterior', labelFr: 'Extérieur' },
                                                    { id: 'both', label: 'Both', labelFr: 'Les deux' }
                                                ].map(cov => {
                                                    const isSelected = automation.glassCleaningDetails.windowsCoverage === cov.id;
                                                    if (!isSelected) return (
                                                        <div key={cov.id} className="px-5 py-2.5 rounded-full border transition-all text-[14px] font-semibold border-neutral-200 text-black bg-white opacity-60">
                                                            {t({ en: cov.label, fr: cov.labelFr })}
                                                        </div>
                                                    );
                                                    return (
                                                        <div key={cov.id} className="px-5 py-2.5 rounded-full border transition-all text-[14px] font-semibold border-black border-[2px] bg-neutral-50 text-black">
                                                            {t({ en: cov.label, fr: cov.labelFr })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Accessibility */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[18px] text-black">
                                                {t({ en: 'Accessibility?', fr: 'Accessibilité ?' })}
                                            </h3>
                                            <div className="flex flex-wrap gap-3">
                                                {[
                                                    { id: 'ground', label: 'Ground level', labelFr: 'Rez-de-chaussée' },
                                                    { id: 'ladder', label: 'Ladder needed', labelFr: 'Échelle nécessaire' }
                                                ].map(acc => {
                                                    const isSelected = automation.glassCleaningDetails.windowsAccessibility === acc.id;
                                                    if (!isSelected) return (
                                                        <div key={acc.id} className="px-5 py-2.5 rounded-full border transition-all text-[14px] font-semibold border-neutral-200 text-black bg-white opacity-60">
                                                            {t({ en: acc.label, fr: acc.labelFr })}
                                                        </div>
                                                    );
                                                    return (
                                                        <div key={acc.id} className="px-5 py-2.5 rounded-full border transition-all text-[14px] font-semibold border-black border-[2px] bg-neutral-50 text-black">
                                                            {t({ en: acc.label, fr: acc.labelFr })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Frequency Selection */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[18px] text-black">
                                                {t({ en: 'Maintenance frequency', fr: 'Fréquence de l\'entretien' })}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { id: 'week', label: 'Each week', fr: 'Chaque semaine' },
                                                    { id: '2weeks', label: 'Every 2 weeks', fr: 'Toutes les 2 semaines' },
                                                    { id: 'month', label: 'Each month', fr: 'Chaque mois' },
                                                    { id: 'on_call', label: 'On call', fr: 'Sur demande' }
                                                ].map(freq => {
                                                    const isSelected = automation.glassCleaningDetails.frequencies === freq.id;
                                                    if (!isSelected) return (
                                                        <div key={freq.id} className="p-4 rounded-[10px] border text-center transition-all border-neutral-200 text-black bg-white opacity-60">
                                                            <span className="text-[15px] font-medium">{t({ en: freq.label, fr: freq.fr })}</span>
                                                        </div>
                                                    );
                                                    return (
                                                        <div key={freq.id} className="p-4 rounded-[10px] border text-center transition-all border-black border-[2px] bg-neutral-50 text-black">
                                                            <span className="text-[15px] font-medium">{t({ en: freq.label, fr: freq.fr })}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                                <div className="px-6 pt-4 pb-6 border-t border-neutral-100 bg-white z-20 shrink-0">
                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={() => setSelectedAutomationDetail(null)}
                                            className="font-medium text-[17px] text-black underline underline-offset-4"
                                        >
                                            {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                                        </button>
                                        <button
                                            onClick={() => setSelectedAutomationDetail(null)}
                                            className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[12px] text-[17px] font-medium active:scale-[0.98] transition-all"
                                        >
                                            {t({ en: 'Next', fr: 'Suivant' })}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Receptionist Detail Full Page View */}
                    <AnimatePresence>
                        {selectedAutomationDetail === 'guest_receptionist' && automation.receptionDetails && (
                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                                className="fixed inset-0 z-[10200] bg-white flex flex-col font-plus-jakarta overflow-hidden"
                            >
                                {/* Header */}
                                <div className="px-6 pt-5 pb-4 flex items-center justify-end shrink-0">
                                    <button
                                        onClick={() => setSelectedAutomationDetail(null)}
                                        className="font-bold px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black"
                                    >
                                        {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                    </button>
                                </div>
                                {/* Scrollable content showing the details */}
                                <div className="flex-1 overflow-y-auto px-6 py-6 pb-32">
                                    <h2 className="text-[32px] font-medium text-black mb-10 tracking-tight">
                                        {t({ en: 'Instructions for reception', fr: 'Instructions pour l\'accueil' })}
                                    </h2>
                                    <div className="space-y-12">

                                        {/* Checklist */}
                                        {automation.receptionDetails.checklist && automation.receptionDetails.checklist.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-[18px] text-black">
                                                    {t({ en: 'Checklist for the receptionist', fr: 'Checklist pour le réceptionniste' })}
                                                </h3>
                                                <p className="text-[15px] text-neutral-500 leading-relaxed mb-4">
                                                    {t({
                                                        en: 'Describe the steps from the moment they meet the guests, until they enter the place and finish. What they should do and don\'t?',
                                                        fr: 'Décrivez les étapes du moment où ils rencontrent les voyageurs, jusqu\'à l\'entrée dans les lieux et la fin. Que doivent-ils faire et ne pas faire ?'
                                                    })}
                                                </p>
                                                <div className="space-y-4">
                                                    {automation.receptionDetails.checklist.map((item: string, idx: number) => (
                                                        <div key={idx} className="flex items-start gap-4">
                                                            <div className="mt-1 w-6 h-6 rounded-full bg-[#00CA52] flex items-center justify-center shrink-0">
                                                                <Check size={12} className="text-white" strokeWidth={3} />
                                                            </div>
                                                            <div className="flex-1 text-[16px] text-black pt-1 leading-relaxed">
                                                                {item}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </div>
                                <div className="px-6 pt-4 pb-6 border-t border-neutral-100 bg-white z-20 shrink-0">
                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={() => setSelectedAutomationDetail(null)}
                                            className="font-medium text-[17px] text-black underline underline-offset-4"
                                        >
                                            {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                                        </button>
                                        <button
                                            onClick={() => setSelectedAutomationDetail(null)}
                                            className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[12px] text-[17px] font-medium active:scale-[0.98] transition-all"
                                        >
                                            {t({ en: 'Next', fr: 'Suivant' })}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Pool Cleaning Detail Full Page View */}
                    <AnimatePresence>
                        {selectedAutomationDetail === 'pool_cleaning' && automation.poolDetails && (
                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                                className="fixed inset-0 z-[10200] bg-white flex flex-col font-plus-jakarta overflow-hidden"
                            >
                                {/* Header */}
                                <div className="px-6 pt-5 pb-4 flex items-center justify-end shrink-0">
                                    <button
                                        onClick={() => setSelectedAutomationDetail(null)}
                                        className="font-bold px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black"
                                    >
                                        {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto px-6 py-6 pb-32">
                                    <h2 className="text-[32px] font-medium text-black mb-10 tracking-tight">
                                        {t({ en: 'Tell us about your pool', fr: 'Parlez-nous de votre piscine' })}
                                    </h2>
                                    <div className="space-y-12">

                                        {/* Pool Type */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[18px] text-black">
                                                {t({ en: 'Pool Type', fr: 'Type de piscine' })}
                                            </h3>
                                            <div className="flex flex-wrap gap-3">
                                                {[
                                                    { id: 'in_ground', label: 'In-ground', fr: 'Enterrée' },
                                                    { id: 'above_ground', label: 'Above-ground', fr: 'Hors-sol' },
                                                    { id: 'infinity', label: 'Infinity', fr: 'À débordement' },
                                                    { id: 'indoor', label: 'Indoor', fr: 'Intérieure' }
                                                ].map(type => {
                                                    const isSelected = automation.poolDetails.poolType === type.id;
                                                    return (
                                                        <div key={type.id} className={`px-5 py-2.5 rounded-full border text-[14px] font-semibold transition-all ${isSelected ? 'bg-neutral-50 text-black border-black border-[2px]' : 'border-neutral-200 text-black bg-white opacity-60'}`}>
                                                            {t({ en: type.label, fr: type.fr })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Water System */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[18px] text-black">
                                                {t({ en: 'Water System', fr: 'Système d\'eau' })}
                                            </h3>
                                            <div className="flex gap-4">
                                                {[
                                                    { id: 'chlorine', label: 'Chlorine', fr: 'Chlore' },
                                                    { id: 'saltwater', label: 'Saltwater', fr: 'Au sel' }
                                                ].map(system => {
                                                    const isSelected = automation.poolDetails.poolWaterType === system.id;
                                                    return (
                                                        <div key={system.id} className={`flex-1 p-5 rounded-[10px] border text-center transition-all ${isSelected ? 'border-black border-[2px] bg-neutral-50' : 'border-neutral-200 text-black bg-white opacity-60'}`}>
                                                            <span className="text-[17px] font-medium">{t({ en: system.label, fr: system.fr })}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Pool Size */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[18px] text-black">
                                                {t({ en: 'Pool Size', fr: 'Taille de la piscine' })}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { id: 'small', label: 'Small', desc: '< 20m²', fr: 'Petite' },
                                                    { id: 'medium', label: 'Medium', desc: '20-50m²', fr: 'Moyenne' },
                                                    { id: 'large', label: 'Large', desc: '50-100m²', fr: 'Grande' },
                                                    { id: 'estate', label: 'Estate', desc: '> 100m²', fr: 'Domaine' }
                                                ].map(size => {
                                                    const isSelected = automation.poolDetails.poolSize === size.id;
                                                    return (
                                                        <div key={size.id} className={`p-5 rounded-[10px] border text-left transition-all ${isSelected ? 'border-black border-[2px] bg-neutral-50' : 'border-neutral-200 text-black bg-white opacity-60'}`}>
                                                            <div className="text-[16px] font-medium mb-1">{t({ en: size.label, fr: size.fr })}</div>
                                                            <div className="text-[13px] text-neutral-500 font-medium">{size.desc}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Average Depth */}
                                        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                                            <div>
                                                <div className="text-[18px] font-medium text-black">{t({ en: 'Average Depth', fr: 'Profondeur moyenne' })}</div>
                                                <div className="text-[14px] text-neutral-500 mt-1">{t({ en: 'Tip: average is 1.5m', fr: 'Conseil : moyenne est 1.5m' })}</div>
                                            </div>
                                            <div className="font-medium text-[22px] text-black px-6 py-4 rounded-[10px] border border-neutral-300 bg-white min-w-[100px] text-center">
                                                {automation.poolDetails.poolDepth}m
                                            </div>
                                        </div>

                                        {/* Maintenance Activities */}
                                        {automation.poolDetails.poolSubServices && automation.poolDetails.poolSubServices.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-[18px] text-black">
                                                    {t({ en: 'Maintenance Activities', fr: 'Activités d\'entretien' })}
                                                </h3>
                                                <div className="grid grid-cols-1 gap-3">
                                                    {[
                                                        { id: 'skimming', label: 'Surface Skimming', fr: 'Nettoyage de surface' },
                                                        { id: 'vacuuming', label: 'Bottom Vacuuming', fr: 'Aspiration du fond' },
                                                        { id: 'brushing', label: 'Tile & Wall Brushing', fr: 'Brossage parois/carrelage' },
                                                        { id: 'chemistry', label: 'Water Testing & Balancing', fr: 'Test et équilibrage de l\'eau' },
                                                        { id: 'filter', label: 'Technical Maintenance (Filter/Pump)', fr: 'Entretien technique (Filtre/Pompe)' }
                                                    ].map(service => {
                                                        const isSelected = automation.poolDetails.poolSubServices.includes(service.id);
                                                        return (
                                                            <div key={service.id} className={`w-full flex items-center justify-between p-5 rounded-[10px] border transition-all ${isSelected ? 'border-black border-[2px] bg-neutral-50' : 'border-neutral-200 bg-white opacity-50'}`}>
                                                                <span className="text-[17px] font-medium text-black">{t({ en: service.label, fr: service.fr })}</span>
                                                                {isSelected && <Check size={20} className="text-black" strokeWidth={2.5} />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Equipment & Access */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[18px] text-black">
                                                {t({ en: 'Equipment & Access', fr: 'Équipement et Accès' })}
                                            </h3>
                                            <div className="flex items-start justify-between p-5 rounded-[10px] border border-neutral-200 bg-white gap-4">
                                                <div className="flex flex-col gap-1 flex-1">
                                                    <span className="text-[17px] font-medium text-black">{t({ en: 'Pool Robot?', fr: 'Robot de piscine ?' })}</span>
                                                    <span className="text-[14px] text-neutral-500 font-medium">{t({ en: 'Is there an automatic cleaner?', fr: 'Y a-t-il un nettoyeur automatique ?' })}</span>
                                                </div>
                                                <div className={`w-14 h-8 rounded-full flex items-center px-1 shrink-0 mt-1 ${automation.poolDetails.poolHasRobot ? 'bg-black' : 'bg-neutral-200'}`}>
                                                    <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-all ${automation.poolDetails.poolHasRobot ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </div>
                                            </div>
                                            {automation.poolDetails.poolTechnicalRoomLocation && (
                                                <div className="space-y-2">
                                                    <label className="text-[16px] font-medium text-black block">
                                                        {t({ en: 'Where is the technical room and Where products are stocked?', fr: 'Où se trouve le local technique et Où sont stockés les produits ?' })}
                                                    </label>
                                                    <div className="w-full p-5 rounded-[10px] border border-neutral-200 bg-neutral-50 text-[16px] text-black leading-relaxed">
                                                        {automation.poolDetails.poolTechnicalRoomLocation}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Frequency */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[18px] text-black">
                                                {t({ en: 'Maintenance frequency', fr: 'Fréquence de l\'entretien' })}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { id: 'week', label: 'Each week', fr: 'Chaque semaine' },
                                                    { id: '2weeks', label: 'Every 2 weeks', fr: 'Toutes les 2 semaines' },
                                                    { id: 'month', label: 'Each month', fr: 'Chaque mois' },
                                                    { id: 'on_call', label: 'On call', fr: 'Sur demande' }
                                                ].map(freq => {
                                                    const isSelected = automation.poolDetails.frequencies === freq.id;
                                                    return (
                                                        <div key={freq.id} className={`p-5 rounded-[10px] border text-center transition-all ${isSelected ? 'border-black border-[2px] bg-neutral-50' : 'border-neutral-200 text-black bg-white opacity-60'}`}>
                                                            <span className="text-[16px] font-medium">{t({ en: freq.label, fr: freq.fr })}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Checklist */}
                                        {automation.poolDetails.checklist && automation.poolDetails.checklist.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-[18px] text-black">
                                                    {t({ en: 'Additional instructions (Checklist)', fr: 'Instructions additionnelles (Checklist)' })}
                                                </h3>
                                                <div className="space-y-4">
                                                    {automation.poolDetails.checklist.map((item: string, idx: number) => (
                                                        <div key={idx} className="flex items-start gap-4">
                                                            <div className="mt-1 w-6 h-6 rounded-full bg-[#00CA52] flex items-center justify-center shrink-0">
                                                                <Check size={12} className="text-white" strokeWidth={3} />
                                                            </div>
                                                            <div className="flex-1 text-[16px] text-black pt-1 leading-relaxed">{item}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Reference Photos */}
                                        {automation.poolDetails.referencePhotos && automation.poolDetails.referencePhotos.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-[18px] text-black">
                                                    {t({ en: 'Reference photos', fr: 'Photos de référence' })}
                                                </h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {automation.poolDetails.referencePhotos.map((photo: string, idx: number) => (
                                                        <div key={idx} className="relative aspect-square rounded-[16px] overflow-hidden shadow-sm border border-neutral-100">
                                                            <img src={photo} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Disclaimer */}
                                        <div className="flex gap-3 p-5 rounded-[10px] border border-neutral-200 bg-neutral-50">
                                            <Info size={18} className="text-neutral-500 shrink-0 mt-0.5" />
                                            <p className="text-[14px] text-neutral-600 leading-relaxed">
                                                {t({
                                                    en: 'The host must provide all the equipment and chemicals necessary for pool maintenance.',
                                                    fr: 'L\'hôte doit fournir tout l\'équipement et les produits chimiques nécessaires à l\'entretien de la piscine.'
                                                })}
                                            </p>
                                        </div>

                                    </div>
                                </div>

                                <div className="px-6 pt-4 pb-6 border-t border-neutral-100 bg-white z-20 shrink-0">
                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={() => setSelectedAutomationDetail(null)}
                                            className="font-medium text-[17px] text-black underline underline-offset-4"
                                        >
                                            {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                                        </button>
                                        <button
                                            onClick={() => setSelectedAutomationDetail(null)}
                                            className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[12px] text-[17px] font-medium active:scale-[0.98] transition-all"
                                        >
                                            {t({ en: 'Next', fr: 'Suivant' })}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Pets Care Detail Full Page View */}
                    <AnimatePresence>
                        {selectedAutomationDetail === 'pets_care' && automation.petsDetails && (
                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                                className="fixed inset-0 z-[10200] bg-white flex flex-col font-plus-jakarta overflow-hidden"
                            >
                                {/* Header */}
                                <div className="px-6 pt-5 pb-4 flex items-center justify-end shrink-0">
                                    <button
                                        onClick={() => setSelectedAutomationDetail(null)}
                                        className="font-bold px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black"
                                    >
                                        {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto px-6 py-6 pb-32">
                                    <h2 className="text-[32px] font-medium text-black mb-10 tracking-tight">
                                        {t({ en: 'Tell us more about your pets', fr: 'Dites-nous en plus sur vos animaux' })}
                                    </h2>
                                    <div className="space-y-8">

                                        {/* Pet Types */}
                                        <div className="space-y-4">
                                            <h3 className="font-medium text-[18px] text-black">
                                                {t({ en: 'What type of pets need care?', fr: 'Quel type d\'animaux a besoin de soins ?' })}
                                            </h3>
                                            <div className="flex flex-wrap gap-3">
                                                {[
                                                    { id: 'dog', label: 'Dog', labelFr: 'Chien', icon: '🐶' },
                                                    { id: 'cat', label: 'Cat', labelFr: 'Chat', icon: '🐱' },
                                                    { id: 'guard_dog', label: 'Guard Dog', labelFr: 'Chien de garde', icon: '🐕' },
                                                    { id: 'bird', label: 'Bird', labelFr: 'Oiseau', icon: '🦜' },
                                                    { id: 'other', label: 'Other', labelFr: 'Autre', icon: '🐾' }
                                                ].map(pet => {
                                                    const isSelected = automation.petsDetails.petTypes?.includes(pet.id);
                                                    return (
                                                        <div key={pet.id} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[14px] font-semibold transition-all ${isSelected ? 'bg-neutral-50 text-black border-black border-[2px]' : 'bg-white text-black border-neutral-200 opacity-50'}`}>
                                                            <span>{pet.icon}</span>
                                                            <span>{t({ en: pet.label, fr: pet.labelFr })}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Per-Pet Detail Cards */}
                                        {automation.petsDetails.petTypes?.map((petId: string) => {
                                            const PET_LIST = [
                                                { id: 'dog', label: 'Dog', labelFr: 'Chien', icon: '🐶' },
                                                { id: 'cat', label: 'Cat', labelFr: 'Chat', icon: '🐱' },
                                                { id: 'guard_dog', label: 'Guard Dog', labelFr: 'Chien de garde', icon: '🐕' },
                                                { id: 'bird', label: 'Bird', labelFr: 'Oiseau', icon: '🦜' },
                                                { id: 'other', label: 'Other', labelFr: 'Autre', icon: '🐾' }
                                            ];
                                            const pet = PET_LIST.find(p => p.id === petId);
                                            const details = automation.petsDetails.petDetails?.[petId];
                                            if (!pet || !details) return null;
                                            return (
                                                <div key={petId} className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-sm space-y-6">
                                                    <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
                                                        <span className="text-[28px]">{pet.icon}</span>
                                                        <h4 className="font-black text-[20px] text-black">
                                                            {t({ en: `${pet.label} Details`, fr: `Détails pour : ${pet.labelFr}` })}
                                                        </h4>
                                                    </div>

                                                    {/* Feeding Schedule */}
                                                    <div className="space-y-3">
                                                        <h5 className="font-medium text-[16px] text-black">
                                                            {t({ en: 'Feeding Schedule (Per Day)', fr: 'Planning des repas (Par Jour)' })}
                                                        </h5>
                                                        <div className="grid grid-cols-3 gap-3">
                                                            {[
                                                                { id: 'once', label: 'Once', labelFr: '1 fois' },
                                                                { id: 'twice', label: 'Twice', labelFr: '2 fois' },
                                                                { id: 'three', label: '3 times', labelFr: '3 fois' }
                                                            ].map(freq => {
                                                                const isSelected = details.frequency === freq.id;
                                                                return (
                                                                    <div key={freq.id} className={`p-4 rounded-[10px] border text-center transition-all ${isSelected ? 'border-black border-[2px] bg-neutral-50' : 'border-neutral-200 text-black bg-white opacity-50'}`}>
                                                                        <span className="text-[14px] font-medium">{t({ en: freq.label, fr: freq.labelFr })}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Toggles */}
                                                    <div className="space-y-0">
                                                        <div className="flex items-center justify-between py-4 border-b border-neutral-50 gap-4">
                                                            <span className="text-[16px] font-medium text-black">{t({ en: 'Walking needed?', fr: 'Promenades nécessaires ?' })}</span>
                                                            <div className={`w-14 h-8 rounded-full flex items-center px-1 shrink-0 ${details.walking ? 'bg-black' : 'bg-neutral-200'}`}>
                                                                <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-all ${details.walking ? 'translate-x-6' : 'translate-x-0'}`} />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between py-4 gap-4">
                                                            <span className="text-[16px] font-medium text-black">{t({ en: 'Medication required?', fr: 'Médicaments requis ?' })}</span>
                                                            <div className={`w-14 h-8 rounded-full flex items-center px-1 shrink-0 ${details.medication ? 'bg-black' : 'bg-neutral-200'}`}>
                                                                <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-all ${details.medication ? 'translate-x-6' : 'translate-x-0'}`} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Instructions */}
                                                    {details.instructions && (
                                                        <div>
                                                            <label className="text-[15px] font-medium text-black mb-2 block">
                                                                {t({ en: 'Specific instructions & personality', fr: 'Instructions et personnalité' })}
                                                            </label>
                                                            <div className="w-full p-4 rounded-[10px] bg-neutral-50 border border-neutral-100 text-[15px] text-black leading-relaxed">
                                                                {details.instructions}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Emergency Contact */}
                                        {automation.petsDetails.emergencyContact && (
                                            <div className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-sm">
                                                <label className="text-[17px] font-medium text-black mb-3 block">
                                                    {t({ en: 'Emergency Contact / Vet', fr: 'Contact d\'urgence / Vétérinaire' })}
                                                </label>
                                                <div className="w-full p-4 rounded-[10px] bg-neutral-50 border border-black/10 text-[16px] text-black">
                                                    {automation.petsDetails.emergencyContact}
                                                </div>
                                            </div>
                                        )}

                                        {/* Daily Checklist */}
                                        {automation.petsDetails.checklist && automation.petsDetails.checklist.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-[18px] text-black">
                                                    {t({ en: 'Daily Checklist', fr: 'Checklist quotidienne' })}
                                                </h3>
                                                <div className="space-y-4">
                                                    {automation.petsDetails.checklist.map((item: string, idx: number) => (
                                                        <div key={idx} className="flex items-start gap-4">
                                                            <div className="mt-1 w-6 h-6 rounded-full bg-[#00CA52] flex items-center justify-center shrink-0">
                                                                <Check size={12} className="text-white" strokeWidth={3} />
                                                            </div>
                                                            <div className="flex-1 text-[16px] text-black pt-1 leading-relaxed">{item}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                </div>

                                <div className="px-6 pt-4 pb-6 border-t border-neutral-100 bg-white z-20 shrink-0">
                                    <div className="flex justify-between items-center">
                                        <button
                                            onClick={() => setSelectedAutomationDetail(null)}
                                            className="font-medium text-[17px] text-black underline underline-offset-4"
                                        >
                                            {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                                        </button>
                                        <button
                                            onClick={() => setSelectedAutomationDetail(null)}
                                            className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[12px] text-[17px] font-medium active:scale-[0.98] transition-all"
                                        >
                                            {t({ en: 'Next', fr: 'Suivant' })}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Restocking (Errands) Detail Full Page View */}
                    <AnimatePresence>
                        {selectedAutomationDetail === 'errands' && automation.errandsDetails && (
                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                                className="fixed inset-0 z-[10200] bg-white flex flex-col font-plus-jakarta overflow-hidden"
                            >
                                {/* Header */}
                                <div className="px-6 pt-5 pb-4 flex items-center justify-end shrink-0">
                                    <button
                                        onClick={() => setSelectedAutomationDetail(null)}
                                        className="font-bold px-4 py-2 rounded-full border border-neutral-200 text-[14px] hover:bg-neutral-50 active:scale-95 transition-all text-black"
                                    >
                                        {t({ en: 'Save & exit', fr: 'Enregistrer et quitter' })}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto px-6 py-6 pb-32">
                                    <div className="max-w-3xl mx-auto">
                                        <h2 className="text-[32px] font-medium text-black mb-10 tracking-tight">
                                            {t({ en: 'Restocking & Errands', fr: 'Réapprovisionnement et Courses' })}
                                        </h2>

                                        <div className="space-y-12">
                                            {/* Selected Categories */}
                                            <div className="space-y-4">
                                                <h3 className="font-medium text-[18px] text-black">
                                                    {t({ en: 'Active Categories', fr: 'Catégories Actives' })}
                                                </h3>
                                                <div className="flex flex-wrap gap-3">
                                                    {[
                                                        { id: 'toiletries', label: 'Toiletries', fr: 'Articles de toilette', emoji: '🧻' },
                                                        { id: 'cleaning', label: 'Cleaning Products', fr: 'Produits d\'entretien', emoji: '🧹' },
                                                        { id: 'pantry', label: 'Pantry & Breakfast', fr: 'Garde-manger & Petit-déj', emoji: '☕' },
                                                        { id: 'linens', label: 'Linens & Towels', fr: 'Linge & Serviettes', emoji: '🛏️' }
                                                    ].map((category) => {
                                                        const isSelected = automation.errandsDetails.categories?.includes(category.id);
                                                        return (
                                                            <div
                                                                key={category.id}
                                                                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[14px] font-semibold transition-all ${isSelected ? 'bg-neutral-50 text-black border-black border-[2px]' : 'bg-white text-black border-neutral-200 opacity-50'}`}
                                                            >
                                                                <span>{category.emoji}</span>
                                                                <span>{t({ en: category.label, fr: category.fr })}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Checklists for Selected Categories */}
                                            {automation.errandsDetails.categories?.map((categoryId: string) => {
                                                const categoryMeta = [
                                                    { id: 'toiletries', icon: '🧻', label: 'Toiletries', fr: 'Articles de toilette' },
                                                    { id: 'cleaning', icon: '🧹', label: 'Cleaning Products', fr: 'Produits d\'entretien' },
                                                    { id: 'pantry', icon: '☕', label: 'Pantry & Breakfast', fr: 'Garde-manger & Petit-déj' },
                                                    { id: 'linens', icon: '🛏️', label: 'Linens & Towels', fr: 'Linge & Serviettes' }
                                                ].find(c => c.id === categoryId);

                                                const list = automation.errandsDetails.checklists?.[categoryId] || [];
                                                const supplier = automation.errandsDetails.suppliers?.[categoryId];

                                                if (list.length === 0) return null;

                                                return (
                                                    <div key={categoryId} className="space-y-6">
                                                        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                                                            <h3 className="font-bold text-[20px] text-black flex items-center gap-2">
                                                                <span>{categoryMeta?.icon}</span>
                                                                {t({ en: `${categoryMeta?.label} Items`, fr: `Articles pour ${categoryMeta?.fr}` })}
                                                            </h3>
                                                            {supplier && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[13px] text-neutral-400 font-medium">{t({ en: 'Preferred supplier:', fr: 'Fournisseur préféré :' })}</span>
                                                                    <span className="px-3 py-1 bg-neutral-50 border border-neutral-200 rounded-lg text-[13px] font-bold text-black">
                                                                        {supplier}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {list.filter((item: any) => item.name.trim() !== '').map((item: any, idx: number) => (
                                                                <div key={idx} className="p-5 rounded-2xl border border-neutral-200 bg-white shadow-sm space-y-4">
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="flex flex-col gap-1">
                                                                            <span className="text-[17px] font-black text-black">{item.name}</span>
                                                                            {item.brands && item.brands.length > 0 && (
                                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                                    {item.brands.map((brand: string) => (
                                                                                        <span key={brand} className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[11px] font-bold border border-neutral-200">
                                                                                            {brand}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="bg-black text-white px-2 py-1 rounded-md text-[11px] font-black uppercase tracking-wider">
                                                                            {t({
                                                                                en: item.frequency === 'checkout' ? 'Every checkout' : item.frequency,
                                                                                fr: item.frequency === 'checkout' ? 'Chaque départ' : item.frequency
                                                                            })}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center justify-between pt-2 border-t border-neutral-50">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[12px] text-neutral-400 font-medium">{t({ en: 'Threshold', fr: 'Seuil' })}</span>
                                                                            <span className="text-[16px] font-bold text-black">{item.quantity}</span>
                                                                        </div>
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="text-[12px] text-neutral-400 font-medium">{t({ en: 'Target', fr: 'Cible' })}</span>
                                                                            <span className="text-[16px] font-bold text-black">{item.targetQuantity}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Operational Rules */}
                                            <div className="p-8 rounded-3xl border border-neutral-200 bg-white shadow-sm space-y-10">
                                                <h3 className="font-black text-[22px] text-black border-b border-neutral-100 pb-4">
                                                    {t({ en: 'Operational Rules', fr: 'Règles Opérationnelles' })}
                                                </h3>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                    {/* Timing & Budget */}
                                                    <div className="space-y-8">
                                                        <div className="space-y-2">
                                                            <span className="text-[13px] uppercase tracking-widest font-black text-neutral-400">
                                                                {t({ en: 'Trigger Strategy', fr: 'Stratégie de Déclenchement' })}
                                                            </span>
                                                            <div className="flex flex-col">
                                                                <span className="text-[18px] font-bold text-black">
                                                                    {automation.errandsDetails.timingRule === 'checkout' ? t({ en: 'Always after checkout', fr: 'Toujours après un départ' }) :
                                                                        automation.errandsDetails.timingRule === 'fixed' ? t({ en: 'Fixed schedule (Weekly)', fr: 'Planning fixe (Hebdomadaire)' }) :
                                                                            t({ en: `Only if check-in is within ${automation.errandsDetails.checkinWindow}h`, fr: `Seulement si arrivée dans les ${automation.errandsDetails.checkinWindow}h` })}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <span className="text-[13px] uppercase tracking-widest font-black text-neutral-400">
                                                                {t({ en: 'Budget Cap Per Run', fr: 'Plafond Budgétaire' })}
                                                            </span>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-[24px] font-black text-black">{automation.errandsDetails.budgetCap}</span>
                                                                <span className="text-[16px] font-bold text-neutral-400">MAD</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Payment & Access */}
                                                    <div className="space-y-8">
                                                        <div className="space-y-2">
                                                            <span className="text-[13px] uppercase tracking-widest font-black text-neutral-400">
                                                                {t({ en: 'Payment Method', fr: 'Méthode de Paiement' })}
                                                            </span>
                                                            <span className="text-[18px] font-bold text-black block">
                                                                {automation.errandsDetails.paymentMethod === 'advance' ?
                                                                    t({ en: 'Courier advances cash', fr: 'Le coursier avance l\'argent' }) :
                                                                    t({ en: 'Use Preloaded Wallet', fr: 'Utiliser Portefeuille Préchargé' })}
                                                            </span>
                                                        </div>

                                                        {automation.errandsDetails.storageLocation && (
                                                            <div className="space-y-2">
                                                                <span className="text-[13px] uppercase tracking-widest font-black text-neutral-400">
                                                                    {t({ en: 'Storage & Access', fr: 'Stockage et Accès' })}
                                                                </span>
                                                                <p className="text-[15px] text-neutral-600 leading-relaxed italic">
                                                                    "{automation.errandsDetails.storageLocation}"
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Disclaimer */}
                                            <div className="bg-neutral-50 rounded-[20px] p-8 border border-neutral-100 flex gap-4">
                                                <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0">
                                                    <Info size={20} className="text-white" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="font-black text-[18px] text-black">
                                                        {t({ en: 'Autonomous Restocking', fr: 'Réapprovisionnement Autonome' })}
                                                    </h4>
                                                    <p className="text-[15px] text-neutral-500 leading-relaxed">
                                                        {t({
                                                            en: 'Staff audit stock levels. Lbricol identifies shortages based on your thresholds and dispatches a courier autonomously. You are billed for the items + a delivery fee.',
                                                            fr: 'Le personnel audite les niveaux. Lbricol identifie les manques selon vos seuils et envoie un coursier de façon autonome. Les articles + frais de livraison vous sont facturés.'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 pt-4 pb-6 border-t border-neutral-100 bg-white z-20 shrink-0">
                                    <div className="flex justify-between items-center max-w-3xl mx-auto w-full">
                                        <button
                                            onClick={() => setSelectedAutomationDetail(null)}
                                            className="font-medium text-[17px] text-black underline underline-offset-4"
                                        >
                                            {t({ en: 'Back', fr: 'Retour', ar: 'عودة' })}
                                        </button>
                                        <button
                                            onClick={() => setSelectedAutomationDetail(null)}
                                            className="bg-[#2C2C2C] text-white px-10 py-4 rounded-[12px] text-[17px] font-medium active:scale-[0.98] transition-all"
                                        >
                                            {t({ en: 'Next', fr: 'Suivant' })}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

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
