'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, X, Check, Home,
    Briefcase, Image as ImageIcon, Trash2,
    Save, Loader2, Sparkles, AlertCircle,
    MapPin, Calendar, Clock, User, Navigation,
    Trophy, CheckCircle2, TrendingUp, ShieldCheck,
    Star, Search, Map as MapIcon, ChevronDown, Info,
    Gift, Plus, FileText
} from 'lucide-react';
import { format } from 'date-fns';

import { useOrder } from '@/context/OrderContext';
import { auth, db } from '@/lib/firebase';
import {
    collection, query, where, getDocs,
    addDoc, serverTimestamp, setDoc, doc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { uploadToCloudinary } from '@/lib/upload';
import { calculateOrderPrice, PricingBreakdown } from '@/lib/pricing';
import { SERVICES_HIERARCHY, getAllServices } from '@/config/services_config';
import { compressImageFileToDataUrl } from '@/lib/imageCompression';
import SplashScreen from '@/components/layout/SplashScreen';
import dynamic from 'next/dynamic';
import { getRoadDistance } from '@/lib/calculateDistance';

const MapView = dynamic(() => import('@/components/location-picker/MapView'), { ssr: false });
import OrderAvailabilityPicker from '@/features/orders/components/OrderAvailabilityPicker';
import { useLanguage } from '@/context/LanguageContext';
import { COUNTRY_DATA, formatToE164, validatePhone, CountryConfig } from '@/lib/phoneUtils';
import CountrySelector from '@/components/phone/CountrySelector';


// Types for Saved Profiles
interface ServiceProfile {
    id: string;
    label: string;
    serviceId: string;
    details: {
        rooms?: number;
        propertyType?: string;
        photoUrls?: string[];
        note?: string;
    };
}

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

const staggerItem: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 24
        }
    }
};

export default function ServiceSetupPage() {
    const router = useRouter();
    const { order, setOrderField } = useOrder();
    const { t, language } = useLanguage();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<ServiceProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('new');

    // Form State
    const [activeTab, setActiveTab] = useState<'setup' | 'details'>(
        (order.serviceType === 'errands' || order.serviceType?.includes('delivery')) ? 'setup' : 'details'
    );

    // Form State
    const [rooms, setRooms] = useState<number>(order.serviceDetails?.rooms || 2);
    const [propertyType, setPropertyType] = useState<string>(order.serviceDetails?.propertyType || 'Apartment');
    const [photos, setPhotos] = useState<string[]>(order.serviceDetails?.photoUrls || []);
    const [note, setNote] = useState<string>(order.serviceDetails?.note || '');
    const [saveAsFavorite, setSaveAsFavorite] = useState(false);
    const [favoriteLabel, setFavoriteLabel] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSplashing, setIsSplashing] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [taskSize, setTaskSize] = useState<'small' | 'medium' | 'large'>('small');
    const [taskDuration, setTaskDuration] = useState(1);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    // Office Cleaning State
    const [officeDesks, setOfficeDesks] = useState<number>(order.serviceDetails?.officeDesks || 10);
    const [officeMeetingRooms, setOfficeMeetingRooms] = useState<number>(order.serviceDetails?.officeMeetingRooms || 1);
    const [officeBathrooms, setOfficeBathrooms] = useState<number>(order.serviceDetails?.officeBathrooms || 1);
    const [hasKitchenette, setHasKitchenette] = useState<boolean>(order.serviceDetails?.hasKitchenette || false);
    const [hasReception, setHasReception] = useState<boolean>(order.serviceDetails?.hasReception || false);
    const [officeAddOns, setOfficeAddOns] = useState<string[]>(order.serviceDetails?.officeAddOns || []);

    // TV Mounting State
    const [tvCount, setTvCount] = useState(1);
    const [liftingHelp, setLiftingHelp] = useState<string | null>(null);
    const [mountTypes, setMountTypes] = useState<string[]>([]);
    const [wallMaterial, setWallMaterial] = useState<string | null>(null);
    const [mountingAddOns, setMountingAddOns] = useState<string[]>([]);

    // Furniture Assembly State
    const [assemblyItems, setAssemblyItems] = useState<Record<string, { id: string, name: string, icon: string, estHours: number, quantity: number }>>(
        order.serviceDetails?.assemblyItems || {}
    );

    // Glass Cleaning State
    const [windowCount, setWindowCount] = useState<number>(order.serviceDetails?.windowCount || 10);
    const [windowSize, setWindowSize] = useState<'small' | 'medium' | 'large'>(order.serviceDetails?.windowSize || 'medium');
    const [buildingStories, setBuildingStories] = useState<number>(order.serviceDetails?.buildingStories || 1);
    const [glassCleaningType, setGlassCleaningType] = useState<'interior' | 'exterior' | 'both'>(order.serviceDetails?.glassCleaningType || 'both');
    const [glassAccessibility, setGlassAccessibility] = useState<'easy' | 'ladder'>(order.serviceDetails?.glassAccessibility || 'easy');
    const [storeFrontSize, setStoreFrontSize] = useState<'small' | 'medium' | 'large'>(order.serviceDetails?.storeFrontSize || 'small');

    // Gardening - Lawn Mowing State
    const [gardenSize, setGardenSize] = useState<'small' | 'medium' | 'large' | 'estate'>(order.serviceDetails?.gardenSize || 'small');
    const [lawnCondition, setLawnCondition] = useState<'standard' | 'wild' | 'overgrown'>(order.serviceDetails?.lawnCondition || 'standard');
    const [needsMower, setNeedsMower] = useState<boolean>(order.serviceDetails?.needsMower || false);

    // Hospitality Cleaning enhancements
    const [unitCount, setUnitCount] = useState<number>(order.serviceDetails?.unitCount || 1);
    const [stairsType, setStairsType] = useState<'small' | 'medium' | 'large' | 'none'>(order.serviceDetails?.stairsType || 'none');
    const [tipAmount, setTipAmount] = useState<number>(order.serviceDetails?.tipAmount || 0);

    // Tree Trimming State
    const [treeCount, setTreeCount] = useState<number>(order.serviceDetails?.treeCount || 1);
    const [treeHeight, setTreeHeight] = useState<'small' | 'medium' | 'large' | 'giant'>(order.serviceDetails?.treeHeight || 'medium');
    const [trimmingType, setTrimmingType] = useState<'shaping' | 'thinning' | 'deadwood' | 'removal'>(order.serviceDetails?.trimmingType || 'shaping');
    const [includeWasteRemoval, setIncludeWasteRemoval] = useState<boolean>(order.serviceDetails?.includeWasteRemoval ?? true);

    // Planting & Landscaping State
    const [plantingSize, setPlantingSize] = useState<'small' | 'medium' | 'large' | 'giant'>(order.serviceDetails?.plantingSize || 'small');
    const [plantingFocus, setPlantingFocus] = useState<'seeding' | 'sod' | 'soil' | 'hardscape'>(order.serviceDetails?.plantingFocus || 'seeding');
    const [plantingState, setPlantingState] = useState<'clean' | 'clearing'>(order.serviceDetails?.plantingState || 'clean');
    const [materialSource, setMaterialSource] = useState<'client' | 'bricoler'>(order.serviceDetails?.materialSource || 'client');
    const [plantingWasteRemoval, setPlantingWasteRemoval] = useState<boolean>(order.serviceDetails?.plantingWasteRemoval ?? false);

    // Default Pro Glass to Business
    useEffect(() => {
        if (order.subServiceId === 'commercial_glass' && hasLoaded) {
            setPropertyType('Business');
        }
    }, [order.subServiceId, hasLoaded]);

    // Availability State
    const [selectedSlots, setSelectedSlots] = useState<{ date: Date, time: string }[]>(
        order.scheduledDate && order.scheduledTime
            ? [{ date: new Date(order.scheduledDate), time: order.scheduledTime }]
            : []
    );
    const [selectedDate, setSelectedDate] = useState<Date | null>(order.scheduledDate ? new Date(order.scheduledDate) : null);
    const [selectedTime, setSelectedTime] = useState<string | null>(order.scheduledTime || null);


    // Live Estimate
    const [estimate, setEstimate] = useState<PricingBreakdown | null>(null);

    // Delivery States
    const [pickupLocation, setPickupLocation] = useState<{ address: string; lat: number | null; lng: number | null }>({
        address: order.location?.address || '',
        lat: order.location?.lat || null,
        lng: order.location?.lng || null
    });
    const [dropoffLocation, setDropoffLocation] = useState<{ address: string; lat: number | null; lng: number | null }>({
        address: '', lat: null, lng: null
    });
    const [recipientName, setRecipientName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [recipientCountry, setRecipientCountry] = useState<CountryConfig>(COUNTRY_DATA[0]);
    const [deliveryType, setDeliveryType] = useState<'standard' | 'schedule'>('standard');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [deliveryTime, setDeliveryTime] = useState('');
    const [itemDescription, setItemDescription] = useState(order.description || '');
    const [activeDrawer, setActiveDrawer] = useState<'none' | 'description' | 'recipient' | 'schedule' | 'pickup' | 'dropoff' | 'map_picker'>('none');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [gpsTrigger, setGpsTrigger] = useState(0);
    const [mapPickingFor, setMapPickingFor] = useState<'pickup' | 'dropoff'>('dropoff');

    // Errands/Delivery Specialized States
    const [errandCategory, setErrandCategory] = useState<string>('package');

    const [isTranslating, setIsTranslating] = useState(false);
    const [translationError, setTranslationError] = useState(false);

    // Synchronize errand category with subservice selection from Home
    useEffect(() => {
        if (order.serviceType === 'errands' || order.serviceType?.includes('delivery')) {
            const sid = order.subServiceId;
            if (sid === 'grocery_shopping') setErrandCategory('grocery');
            else if (sid === 'pharmacy_pickup') setErrandCategory('pharmacy');
            else if (sid === 'post_office') setErrandCategory('mailing');
            else if (sid === 'general_delivery' || sid === 'returns') setErrandCategory('package');
        }
    }, [order.serviceType, order.subServiceId]);
    const errandCategories = [
        { id: 'keys', label: t({ en: 'Keys', fr: 'Clés', ar: 'مفاتيح' }), icon: '🔑' },
        { id: 'documents', label: t({ en: 'Docs', fr: 'Docs', ar: 'وثائق' }), icon: '📄' },
        { id: 'package', label: t({ en: 'Parcel', fr: 'Colis', ar: 'طرد' }), icon: '📦' },
        { id: 'grocery', label: t({ en: 'Grocery', fr: 'Courses', ar: 'بقالة' }), icon: '🛍️' },
        { id: 'food', label: t({ en: 'Food', fr: 'Nourriture', ar: 'طعام' }), icon: '🍛' },
        { id: 'pharmacy', label: t({ en: 'Pharmacy', fr: 'Pharmacie', ar: 'صيدلية' }), icon: '💊' },
        { id: 'mailing', label: t({ en: 'Mailing', fr: 'Courrier', ar: 'بريد' }), icon: '✉️' }
    ];

    const errandSizes = (order.serviceType === 'errands' || order.serviceType?.includes('delivery')) ? [
        { id: 'small', name: t({ en: 'Envelope/Bag', fr: 'Enveloppe/Sac', ar: 'ظرف/حقيبة' }), desc: t({ en: 'Fits in a backpack (Moto)', fr: 'Tient dans un sac à dos (Moto)', ar: 'يناسب حقيبة الظهر (موتو)' }), icon: '🏍️' },
        { id: 'medium', name: t({ en: 'Standard Box', fr: 'Boîte standard', ar: 'صندوق قياسي' }), desc: t({ en: 'Requires car trunk', fr: 'Nécessite un coffre de voiture', ar: 'يتطلب صندوق السيارة' }), icon: '🚗' },
        { id: 'large', name: t({ en: 'Large Package', fr: 'Grand colis', ar: 'طرد كبير' }), desc: t({ en: 'Fits in an SUV/Truck', fr: 'Tient dans un SUV/Camion', ar: 'يناسب سيارة رباعية/شاحنة' }), icon: '🚚' }
    ] : [];

    const isErrand = order.serviceType === 'errands' || order.serviceType?.includes('delivery');
    const isErrandReady = isErrand &&
        pickupLocation.lat !== null &&
        dropoffLocation.lat !== null &&
        itemDescription.trim() !== '' &&
        (deliveryType === 'standard' || (deliveryDate !== '' && deliveryTime !== ''));

    // Dynamic field logic for Packing + Move
    const [needsTransport, setNeedsTransport] = useState(order.subServiceId === 'local_move' || order.serviceType === 'errands');

    // Memoized coordinates for Map stability
    const memoizedClientPin = React.useMemo(() =>
        pickupLocation.lat ? { lat: pickupLocation.lat, lng: pickupLocation.lng! } : undefined
        , [pickupLocation.lat, pickupLocation.lng]);

    const memoizedDestinationPin = React.useMemo(() =>
        dropoffLocation.lat ? { lat: dropoffLocation.lat, lng: dropoffLocation.lng! } : undefined
        , [dropoffLocation.lat, dropoffLocation.lng]);

    const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

    const handleTranslateBio = async () => {
        if (!provider.bio || isTranslating) return;
        setIsTranslating(true);
        setTranslationError(false);
        try {
            const { translateBio } = await import('@/lib/translateBio');
            const translations = await translateBio(provider.bio);

            if (Object.keys(translations).length === 0) {
                setTranslationError(true);
                return;
            }

            setProvider(prev => ({
                ...prev,
                bio_translations: { ...prev.bio_translations, ...translations }
            }));
        } catch (err) {
            console.error("[handleTranslateBio] Failed:", err);
            setTranslationError(true);
        } finally {
            setIsTranslating(false);
        }
    };

    // Bricoler Stats
    const [provider, setProvider] = useState({
        name: order.providerName || 'Bricoler',
        avatar: order.providerAvatar || '/Images/Vectors Illu/avatar.png',
        rating: order.providerRating || 0,
        taskCount: order.providerJobsCount || 0,
        rank: order.providerRank || 'New',
        minRate: order.providerRate || 0,
        badge: order.providerBadge || 'Pro',
        bio: order.providerBio || 'Experienced Bricoler offering quality services in your area.',
        bio_translations: {} as { en?: string; fr?: string; ar?: string },
        yearsOfExperience: order.providerExperience || '1 Year',
        portfolio: [] as string[],
        equipments: [] as string[],
        movingTransports: [] as string[],
        reviews: [] as any[],
        coords: null as { lat: number, lng: number } | null
    });

    const isNew = !provider.taskCount || provider.taskCount < 5;
    const effectiveJobs = provider.taskCount || 0;

    useEffect(() => {
        setHasLoaded(false);
        if (!order.serviceType || (!order.providerId && !order.isPublic)) {
            router.push('/order/step1');
            return;
        }

        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                // Load saved profiles for this service
                const q = query(
                    collection(db, 'clients', u.uid, 'service_profiles'),
                    where('serviceId', '==', order.serviceType)
                );
                const snap = await getDocs(q);
                const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceProfile));
                setProfiles(loaded);
            }
            setLoading(false);
        });

        const fetchBricolerData = async () => {
            if (!order.providerId) return;
            try {
                const { getDoc, doc } = await import('firebase/firestore');
                const bSnap = await getDoc(doc(db, 'bricolers', order.providerId));
                if (bSnap.exists()) {
                    const data = bSnap.data();
                    // Find relevant service by category OR subService ID - robust check
                    const services = Array.isArray(data.services) ? data.services : [];
                    const relevantService = services.find((s: any) =>
                        (order.subServiceId && (s.id === order.subServiceId || s.subServiceId === order.subServiceId)) ||
                        (s.categoryId === order.serviceType || s.id === order.serviceType)
                    );
                    const servicePortfolio = relevantService?.portfolioImages || [];

                    setProvider(prev => {
                        const tasks = Number(data.completedJobs || data.numReviews || 0);
                        const bRank = tasks > 50 ? 'Elite' : (tasks > 20 ? 'Expert' : (tasks > 5 ? 'Pro' : 'Classic'));
                        const levelDisplay = (tasks < 10 || data.isNew) ? 'New' : bRank;

                        return {
                            ...prev,
                            name: data.name || prev.name,
                            avatar: data.avatarUrl || data.avatar || data.photoURL || prev.avatar,
                            bio: relevantService?.pitch || data.bio || data.aboutMe || prev.bio,
                            bio_translations: data.bio_translations || prev.bio_translations,
                            yearsOfExperience: relevantService?.experience || data.yearsOfExperience || data.experience || prev.yearsOfExperience,
                            portfolio: servicePortfolio.length > 0 ? servicePortfolio : (data.portfolio || []),
                            equipments: Array.isArray(relevantService?.equipments) ? relevantService.equipments : (Array.isArray(data.equipments) ? data.equipments : []),
                            movingTransports: data.movingTransports || [],
                            reviews: data.reviews || [],
                            level: levelDisplay,
                            rating: Number(data.rating) || 0,
                            jobs: tasks.toString(),
                            coords: data.location || data.coords || null
                        };
                    });
                    setHasLoaded(true);
                }
            } catch (err) {
                console.warn("Failed to fetch full Bricoler profile:", err);
            }
        };
        fetchBricolerData();

        return () => unsub();
    }, [order.serviceType, order.subServiceId, order.providerId, router]);

    // Update Estimate
    useEffect(() => {
        if (!order.serviceType) return;

        if (order.serviceType === 'errands' || order.serviceType?.includes('delivery')) {
            if (pickupLocation.lat && dropoffLocation.lat) {
                const fetchDist = async () => {
                    try {
                        const { distanceKm, durationMinutes } = await getRoadDistance(
                            pickupLocation.lat!, pickupLocation.lng!,
                            dropoffLocation.lat!, dropoffLocation.lng!
                        );

                        const result = calculateOrderPrice(
                            order.subServiceId || order.serviceType || 'errands',
                            11, // Base price 11 MAD
                            {
                                deliveryDistanceKm: distanceKm,
                                deliveryDurationMinutes: durationMinutes,
                                taskSize: taskSize
                            }
                        );

                        setEstimate(result);
                    } catch (e) {
                        console.warn("Pricing calculation failed", e);
                    }
                };
                fetchDist();
            } else {
                setEstimate(calculateOrderPrice(order.subServiceId || order.serviceType || 'errands', 11, { taskSize }));
            }
        } else if (order.serviceType === 'moving' || order.serviceType?.includes('moving')) {
            const duration = taskSize === 'small' ? 1.5 : taskSize === 'medium' ? 3 : 5;
            const rate = provider.minRate || 100;

            if (needsTransport && pickupLocation.lat && dropoffLocation.lat) {
                const fetchDist = async () => {
                    const { distanceKm, durationMinutes } = await getRoadDistance(
                        pickupLocation.lat!, pickupLocation.lng!,
                        dropoffLocation.lat!, dropoffLocation.lng!
                    );

                    const result = calculateOrderPrice(
                        order.subServiceId || order.serviceType || 'moving',
                        rate,
                        {
                            hours: duration,
                            deliveryDistanceKm: distanceKm,
                            deliveryDurationMinutes: durationMinutes
                        }
                    );

                    setEstimate(result);
                };
                fetchDist();
            } else {
                const result = calculateOrderPrice(
                    order.subServiceId || order.serviceType || 'moving',
                    rate,
                    { hours: duration }
                );
                setEstimate(result);
            }
        } else if (order.serviceType === 'furniture_assembly') {
            const totalHours = Object.values(assemblyItems).reduce((sum, item) => sum + (item.quantity * item.estHours), 0);
            const result = calculateOrderPrice(
                order.serviceType,
                order.providerRate || 80,
                { hours: Math.max(1, totalHours) }
            );
            setEstimate(result);
        } else if (order.serviceType === 'home_repairs' || order.serviceType === 'plumbing') {
            const serviceId = order.subServiceId || order.serviceType;
            const result = calculateOrderPrice(
                serviceId,
                order.providerRate || 100,
                { hours: taskDuration }
            );
            setEstimate(result);
        } else if (order.subServiceId === 'tv_mounting') {
            const calculateTVPrice = async () => {
                let distance = 0;
                let durationMinutes = 0;
                if (provider.coords && order.location) {
                    try {
                        const res = await getRoadDistance(
                            provider.coords.lat, provider.coords.lng,
                            order.location.lat, order.location.lng
                        );
                        distance = res.distanceKm;
                        durationMinutes = res.durationMinutes;
                    } catch (e) {
                        console.warn("Distance calculation failed for TV Mounting:", e);
                    }
                }

                const result = calculateOrderPrice(
                    'tv_mounting',
                    order.providerRate || 100,
                    {
                        tvCount,
                        liftingHelp: liftingHelp || undefined,
                        mountTypes,
                        wallMaterial: wallMaterial || undefined,
                        mountingAddOns,
                        distanceKm: distance,
                        durationMinutes: durationMinutes
                    }
                );
                setEstimate(result);
            };
            calculateTVPrice();
        } else if (order.subServiceId === 'residential_glass' || order.subServiceId === 'commercial_glass' || order.subServiceId === 'lawn_mowing' || order.subServiceId === 'branch_hedge_trimming' || order.subServiceId === 'planting' || (order.serviceType === 'cleaning' || order.serviceType === 'hospitality')) {
            const calculateSpecialServicePrice = async () => {
                let distance = 0;
                let durationMinutes = 0;
                if (provider.coords && order.location) {
                    try {
                        const res = await getRoadDistance(
                            provider.coords.lat, provider.coords.lng,
                            order.location.lat, order.location.lng
                        );
                        distance = res.distanceKm;
                        durationMinutes = res.durationMinutes;
                    } catch (e) {
                        console.warn("Distance calculation failed:", e);
                    }
                }

                const result = calculateOrderPrice(
                    order.subServiceId || order.serviceType || '',
                    order.providerRate || 100,
                    {
                        rooms,
                        propertyType,
                        windowCount,
                        windowSize,
                        buildingStories,
                        glassCleaningType,
                        glassAccessibility,
                        storeFrontSize,
                        gardenSize,
                        lawnCondition,
                        needsMower,
                        // Tree Trimming
                        treeCount,
                        treeHeight,
                        trimmingType,
                        includeWasteRemoval,
                        unitCount,
                        stairsType,
                        tipAmount,
                        distanceKm: distance,
                        durationMinutes: durationMinutes,
                        officeDesks,
                        officeMeetingRooms,
                        // Planting
                        plantingSize,
                        plantingFocus,
                        plantingState,
                        materialSource,
                        plantingWasteRemoval,
                        officeBathrooms,
                        hasKitchenette,
                        hasReception,
                        officeAddOns
                    }
                );
                setEstimate(result);
            };
            calculateSpecialServicePrice();
        } else {
            // General fallback: check if it's hourly
            const config = getAllServices().find(s => s.id === order.serviceType);
            const subConfig = config?.subServices.find(ss => ss.id === order.subServiceId);
            const archetype = subConfig?.pricingArchetype || config?.subServices[0]?.pricingArchetype;

            if (archetype === 'hourly') {
                const result = calculateOrderPrice(
                    order.subServiceId || order.serviceType,
                    order.providerRate || 100,
                    { hours: taskDuration, mountingAddOns }
                );
                setEstimate(result);
            } else {
                const slotsCount = selectedSlots.length > 0 ? selectedSlots.length : 1;
                const result = calculateOrderPrice(
                    order.subServiceId || order.serviceType,
                    order.providerRate || 80,
                    { rooms, propertyType, hours: 1, days: 1 }
                );
                setEstimate({
                    ...result,
                    subtotal: result.subtotal * slotsCount,
                    serviceFee: result.serviceFee * slotsCount,
                    total: result.total * slotsCount,
                    duration: 1 // Default fallback duration
                });
            }
        }
    }, [
        order.serviceType,
        order.subServiceId,
        order.providerRate,
        order.location,
        rooms,
        propertyType,
        pickupLocation,
        dropoffLocation,
        deliveryType,
        assemblyItems,
        taskSize,
        taskDuration,
        selectedSlots,
        // TV Mounting deps
        tvCount,
        liftingHelp,
        mountTypes,
        wallMaterial,
        mountingAddOns,
        // Office Cleaning deps
        officeDesks,
        officeMeetingRooms,
        officeBathrooms,
        hasKitchenette,
        hasReception,
        officeAddOns,
        provider.coords,
        // Glass Cleaning deps
        windowCount,
        windowSize,
        buildingStories,
        glassCleaningType,
        glassAccessibility,
        storeFrontSize,
        propertyType,
        // Gardening deps
        gardenSize,
        lawnCondition,
        needsMower,
        // Tree Trimming deps
        treeCount,
        treeHeight,
        trimmingType,
        includeWasteRemoval,
        // Hospitality deps
        unitCount,
        stairsType,
        tipAmount,
        // Planting deps
        plantingSize,
        plantingFocus,
        plantingState,
        materialSource,
        plantingWasteRemoval
    ]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const remainingSlots = 6 - photos.length;
        const filesToProcess = Array.from(files).slice(0, remainingSlots);
        if (filesToProcess.length === 0) return;

        setIsUploading(true);
        try {
            // 1. Create local previews immediately so user sees them "added" instantly
            const localPreviews = filesToProcess.map(f => URL.createObjectURL(f));
            setPhotos(prev => [...prev, ...localPreviews]);

            // 2. Parallel upload to Cloudinary with compression
            const uploadPromises = filesToProcess.map(async (file, index) => {
                // Compress before upload
                const compressedDataUrl = await compressImageFileToDataUrl(file, { maxWidth: 1024, quality: 0.65 });

                const uploadedUrl = await uploadToCloudinary(
                    compressedDataUrl,
                    `lbricol/clients/${user?.uid || 'guest'}/setups`,
                    'lbricol_portfolio'
                );

                // 3. Replace the local preview URL with the actual Cloudinary URL in state
                setPhotos(prev => {
                    const updated = [...prev];
                    const previewIndex = updated.indexOf(localPreviews[index]);
                    if (previewIndex !== -1) {
                        updated[previewIndex] = uploadedUrl;
                    }
                    return updated;
                });

                return uploadedUrl;
            });

            await Promise.all(uploadPromises);
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Failed to upload some photos. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSelectProfile = (profile: ServiceProfile) => {
        setSelectedProfileId(profile.id);
        setRooms(profile.details.rooms || 2);
        setPropertyType(profile.details.propertyType || 'Apartment');
        setPhotos(profile.details.photoUrls || []);
        setNote(profile.details.note || '');
    };

    const handleContinue = async () => {
        // Validation
        let finalSlots = [...selectedSlots];

        // For Errands/Delivery, we use the specialized deliveryDate/Time states
        if (order.serviceType === 'errands' || order.serviceType?.includes('delivery')) {
            if (deliveryType === 'standard') {
                // If standard (Now), we'll use current date/time
                finalSlots = [{ date: new Date(), time: format(new Date(), 'HH:mm') }];
            } else if (deliveryDate && deliveryTime) {
                // If scheduled, add the selected specific slot if finalSlots is empty
                finalSlots = [{ date: new Date(deliveryDate), time: deliveryTime }];
            }
        }

        if (finalSlots.length === 0) {
            alert("Please select at least one date and time for your order.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Update Context
            const slotsToSave = finalSlots.map(s => {
                const dateObj = typeof s.date === 'string' ? new Date(s.date) : s.date;
                return {
                    date: format(dateObj, 'yyyy-MM-dd'),
                    time: s.time
                };
            });

            // Save first one to scheduledDate/Time for backward compat
            setOrderField('scheduledDate', slotsToSave[0].date);
            setOrderField('scheduledTime', slotsToSave[0].time);
            setOrderField('multiSlots', slotsToSave);

            // Determine final task duration for pricing and availability
            let finalTaskDuration = estimate?.duration || taskDuration;
            if (order.serviceType === 'moving' || order.serviceType?.includes('moving')) {
                // Determine duration based on taskSize (Small=1.5h, Medium=3h, Large=5h)
                finalTaskDuration = taskSize === 'small' ? 1.5 : taskSize === 'medium' ? 3 : 5;
            } else if (order.serviceType === 'furniture_assembly') {
                finalTaskDuration = Object.values(assemblyItems).reduce((sum, item) => sum + (item.quantity * item.estHours), 0);
            }

            // Final safety check: ensure cleaning has min 2h
            if ((order.serviceType === 'cleaning' || order.serviceType === 'hospitality') && !['car_washing', 'car_detailing', 'dish_cleaning'].includes(order.subServiceId || '') && finalTaskDuration < 2) {
                finalTaskDuration = 2;
            }

            const serviceDetails = {
                rooms,
                propertyType,
                photoUrls: photos,
                note,
                assemblyItems,
                // Office specific
                officeDesks,
                officeMeetingRooms,
                officeBathrooms,
                hasKitchenette,
                hasReception,
                officeAddOns,
                // Planting fields
                plantingSize,
                plantingFocus,
                plantingState,
                materialSource,
                plantingWasteRemoval,
                // Delivery fields
                pickupAddress: pickupLocation.address,
                dropoffAddress: dropoffLocation.address,
                pickupCoords: { lat: pickupLocation.lat, lng: pickupLocation.lng },
                dropoffCoords: { lat: dropoffLocation.lat, lng: dropoffLocation.lng },
                recipientName,
                recipientPhone: recipientPhone ? formatToE164(recipientPhone, recipientCountry.dialCode) : '',
                deliveryType,
                deliveryDate,
                deliveryTime,
                itemDescription,
                errandCategory,
                taskSize,
                taskDuration: finalTaskDuration, // Use the calculated duration for pricing
                // TV Mounting specific
                tvCount,
                liftingHelp,
                mountTypes,
                wallMaterial,
                mountingAddOns,
                // Moving specific pre-calculated metrics
                deliveryDistanceKm: estimate?.distanceKm || null,
                deliveryDurationMinutes: estimate?.duration || null,
                // Signal to backend for broadcasting errands city-wide
                isPublic: order.serviceType === 'errands' || order.serviceType?.includes('delivery'),
                // Glass Cleaning specific
                windowCount,
                glassCleaningType,
                glassAccessibility,
                storeFrontSize,
                // Gardening fields
                gardenSize,
                lawnCondition,
                needsMower,
                // Hospitality fields
                unitCount,
                stairsType,
                tipAmount,
                // Tree Trimming fields
                treeCount,
                treeHeight,
                trimmingType,
                includeWasteRemoval
            };

            // 1. Save profile if requested
            if (saveAsFavorite && user && selectedProfileId === 'new') {
                await addDoc(collection(db, 'clients', user.uid, 'service_profiles'), {
                    label: favoriteLabel || 'My Setup',
                    serviceId: order.serviceType,
                    details: serviceDetails,
                    createdAt: serverTimestamp()
                });
            }

            // 2. Update Order Context
            setOrderField('serviceDetails', serviceDetails);
            setOrderField('estimate', estimate);
            setOrderField('setupProfileId', selectedProfileId === 'new' ? '' : selectedProfileId);
            setOrderField('carRentalNote', note); // Legacy fallback

            // 3. Navigate
            setIsSplashing(true);
            setTimeout(() => {
                router.push('/order/step3');
            }, 1500);

        } catch (err) {
            console.error("Save failed:", err);
            alert("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return null;
    // Robust subservice name lookup: if not found in the current category, search all categories
    let categoryName = order.serviceName;
    let resolvedSubServiceName = '';

    // Try to find the subservice name globally if possible
    if (order.subServiceId) {
        for (const cat of Object.values(SERVICES_HIERARCHY)) {
            const found = cat.subServices.find(s =>
                s.id.toLowerCase() === order.subServiceId.toLowerCase() ||
                s.name.toLowerCase() === order.subServiceId.toLowerCase()
            );
            if (found) {
                resolvedSubServiceName = found.name;
                // If we also want to ensure the category name is accurate
                if (!categoryName || categoryName === 'Order Setup') categoryName = cat.name;
                break;
            }
        }
    }

    // Fallback search by serviceType if subServiceId didn't yield results
    if (!resolvedSubServiceName && order.serviceType) {
        for (const cat of Object.values(SERVICES_HIERARCHY)) {
            const found = cat.subServices.find(s =>
                s.id.toLowerCase() === order.serviceType.toLowerCase() ||
                s.name.toLowerCase() === order.serviceType.toLowerCase()
            );
            if (found) {
                resolvedSubServiceName = found.name;
                if (!categoryName || categoryName === 'Order Setup') categoryName = cat.name;
                break;
            }
        }
    }

    // Final fallback: use the context subServiceName if still empty
    if (!resolvedSubServiceName && order.subServiceName && order.subServiceName !== 'Order Setup') {
        resolvedSubServiceName = order.subServiceName;
    }

    return (
        <div className="min-h-screen bg-white text-[#111827] flex flex-col font-sans">
            {isSplashing && <SplashScreen subStatus={null} />}

            {/* Header */}
            <header className="flex flex-col sticky top-0 bg-white z-20 border-b border-neutral-100/60">
                <div className="flex items-center justify-between px-6 py-5">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-neutral-50 flex items-center justify-center transition-transform active:scale-90">
                        <ChevronLeft size={22} className="text-[#111827]" />
                    </button>
                    <h1 className="text-[17px] font-black text-[#111827] flex items-center justify-center gap-1.5 max-w-[300px]">
                        <span className="truncate">{categoryName || order.serviceName || 'Order Setup'}</span>
                        {resolvedSubServiceName && resolvedSubServiceName !== (categoryName || order.serviceName) && (
                            <span className="text-neutral-400 font-medium whitespace-nowrap shrink-0 overflow-hidden text-ellipsis max-w-[120px]">
                                / {resolvedSubServiceName}
                            </span>
                        )}
                    </h1>
                    <button onClick={() => router.push('/')} className="w-9 h-9 rounded-full bg-neutral-50 flex items-center justify-center transition-transform active:scale-90">
                        <X size={18} className="text-[#111827]" />
                    </button>
                </div>

                {/* Tabs Bar */}
                {!(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) && (
                    <div className="flex px-2">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`flex-1 py-4 text-[14px] font-bold transition-all relative ${activeTab === 'details' ? 'text-[#01A083]' : 'text-[#9CA3AF]'}`}
                        >
                            {t({ en: 'Bricoler Details', fr: 'Détails du Bricoleur', ar: 'تفاصيل الحرفي' })}
                            {activeTab === 'details' && (
                                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#01A083]" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('setup')}
                            className={`flex-1 py-4 text-[14px] font-bold transition-all relative ${activeTab === 'setup' ? 'text-[#01A083]' : 'text-[#9CA3AF]'}`}
                        >
                            {t({ en: 'Order Setup', fr: 'Configuration de la commande', ar: 'إعداد الطلب' })}
                            {activeTab === 'setup' && (
                                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#01A083]" />
                            )}
                        </button>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto no-scrollbar pt-10">
                <AnimatePresence mode="wait">
                    {activeTab === 'details' ? (
                        <motion.div
                            key={`details-${hasLoaded}`}
                            variants={staggerContainer}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, x: 10 }}
                            className="py-8 pb-40"
                        >
                            <div className="px-6"> {/* Content Wrapper */}
                                {(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) ? (
                                    <div className="space-y-4">
                                        {/* 1. Package Details Section */}
                                        <div style={{ padding: 16, borderRadius: 12, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                                            <div className="px-4 py-3 flex items-center gap-2 text-[#6B7280]">
                                                <FileText size={18} />
                                                <span className="text-[15px] font-bold">Package details</span>
                                            </div>
                                            <div className="bg-white rounded-[16px] px-5 py-6 space-y-5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[16px] font-medium text-[#6B7280]">Ordered from</span>
                                                    <span className="text-[17px] font-black text-[#111827]">Nike</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[16px] font-medium text-[#6B7280]">Payment mode</span>
                                                    <span className="text-[17px] font-black text-[#111827]">On Delivery</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[16px] font-medium text-[#6B7280]">Delivery mode</span>
                                                    <span className="text-[17px] font-black text-[#111827]">Door Delivery</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Trip Info Section */}
                                        <div style={{ padding: 16, borderRadius: 12, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                                            <div className="px-4 py-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-[#6B7280]">
                                                    <Navigation size={18} />
                                                    <span className="text-[15px] font-bold">Trip Info</span>
                                                </div>
                                                <button className="text-[13px] font-bold text-[#6B7280]">See more</button>
                                            </div>
                                            <div className="bg-white rounded-[16px] px-5 py-6">
                                                <div className="space-y-8">
                                                    <div className="flex gap-4 relative">
                                                        <div className="absolute left-1.5 top-2.5 bottom-[-32px] w-[2px] bg-[#fcdbd2]" />
                                                        <div className="w-3 h-3 rounded-full border-2 border-[#ff7043] bg-white z-10 mt-1.5" />
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[13px]">🇲🇦</span>
                                                                    <span className="text-[14px] font-medium text-[#6B7280]">Casablanca</span>
                                                                </div>
                                                                <span className="text-[14px] font-black text-[#111827]">05:15 AM</span>
                                                            </div>
                                                            <p className="text-[16px] font-black text-[#111827] leading-tight">Arrived at post office 29133</p>
                                                            <p className="text-[12px] font-medium text-[#9CA3AF] mt-1">05.12.2025</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-4 relative">
                                                        <div className="absolute left-1.5 top-0 bottom-[-32px] w-[2px] bg-[#f3f4f6]" />
                                                        <div className="w-3 h-3 rounded-full border-2 border-[#ff7043] bg-white z-10 mt-1.5" />
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[13px]">🇲🇦</span>
                                                                    <span className="text-[14px] font-medium text-[#6B7280]">Casablanca</span>
                                                                </div>
                                                                <span className="text-[14px] font-black text-[#111827]">01:15 PM</span>
                                                            </div>
                                                            <p className="text-[16px] font-black text-[#111827] leading-tight">Departed from local hub</p>
                                                            <p className="text-[12px] font-medium text-[#9CA3AF] mt-1">03.12.2025</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-4 relative">
                                                        <div className="w-3 h-3 rounded-full border-2 border-neutral-100 bg-white z-10 mt-1.5" />
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[13px]">🇲🇦</span>
                                                                    <span className="text-[14px] font-medium text-[#6B7280]">Casablanca</span>
                                                                </div>
                                                                <span className="text-[14px] font-black text-[#111827]">11:48 AM</span>
                                                            </div>
                                                            <p className="text-[16px] font-black text-neutral-300 leading-tight">Pending delivery</p>
                                                            <p className="text-[12px] font-medium text-neutral-300 mt-1">01.12.2025</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Sender Details Section */}
                                        <div style={{ padding: 16, borderRadius: 12, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                                            <div className="px-4 py-3 flex items-center gap-2 text-[#6B7280]">
                                                <User size={18} />
                                                <span className="text-[15px] font-bold">Sender details</span>
                                            </div>
                                            <div className="bg-white rounded-[16px] px-4 py-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 bg-[#01A083] rounded-[14px] flex items-center justify-center p-2.5">
                                                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg" className="w-full h-full object-contain brightness-0 invert" alt="Nike Logo" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[17px] font-black text-[#111827]">Nike</p>
                                                        <p className="text-[14px] font-medium text-[#9CA3AF]">Official Store</p>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-1.5 bg-[#F1FEF4] rounded-full border border-[#D1FAE5] flex items-center gap-1.5">
                                                    <div className="w-4 h-4 rounded-full bg-[#10B981] flex items-center justify-center">
                                                        <Check size={10} className="text-white" strokeWidth={5} />
                                                    </div>
                                                    <span className="text-[12px] font-bold text-[#10B981]">Safe Sender</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Profile Hero */}
                                        <motion.div variants={staggerItem} className="flex gap-6 mb-4 items-start">
                                            <img src={provider.avatar} className="w-24 h-24 rounded-full object-cover border-4 border-[#F9FAFB]" />
                                            <div className="flex-1">
                                                <h2 className="text-[24px] font-black text-[#111827] mb-0">{provider.name}</h2>
                                                <div className="flex items-baseline gap-2 text-[#01A083] mb-2">
                                                    <span className="text-[20px] font-black">MAD {provider.minRate}</span>
                                                    <span className="text-[14px] font-bold text-[#6B7280]">{t({ en: 'minimum', fr: 'minimum', ar: 'كحد أدنى' })}</span>
                                                </div>
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F1FEF4] rounded-full border border-[#027963]">
                                                    <ShieldCheck size={14} className="text-[#027963]" />
                                                    <span className="text-[11px] font-black text-[#166534]  tracking-wider">{t({ en: 'Identity Verified', fr: 'Identité vérifiée', ar: 'تم التحقق من الهوية' })}</span>
                                                </div>
                                            </div>
                                        </motion.div>

                                        <div className="pb-5">
                                            <motion.button
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => {
                                                    setActiveTab('setup');
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="w-full h-11 bg-[#01A083] text-white rounded-full font-medium text-[20px] flex items-center justify-center gap-3 transition-all py-5 "
                                            >
                                                <span>{t({ en: 'Book me', fr: 'Réservez-moi', ar: 'احجزني' })}</span>
                                            </motion.button>
                                        </div>

                                        {/* Trust & Stats Grid (Eggy Style Redesign) */}
                                        <motion.div variants={staggerItem} className="grid grid-cols-4 gap-2 mb-8">
                                            {/* Level Stat */}
                                            <div className="flex flex-col items-center gap-2 text-center">
                                                <div
                                                    className="w-[68px] h-[68px] flex items-center justify-center bg-[#F1FEF4] border border-[#DCFCE7]"
                                                    style={{ borderRadius: '70% 30% 50% 50% / 50% 70% 30% 50%' }}
                                                >
                                                    <Trophy size={40} className="text-[#10B981] fill-[#10B981]/20" />
                                                </div>
                                                <div className="flex flex-col items-center -space-y-0.5">
                                                    <span className="text-[14px] font-semibold text-[#111827] capitalize">{(effectiveJobs < 10 || isNew) ? (t({ en: 'New', fr: 'Nouveau', ar: 'جديد' })) : (provider.badge || (t({ en: 'Elite', fr: 'Élite', ar: 'نخبة' })))}</span>
                                                    <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">{t({ en: 'Level', fr: 'Niveau', ar: 'مستوى' })}</span>
                                                </div>
                                            </div>

                                            {/* Rating Stat */}
                                            <div className="flex flex-col items-center gap-2 text-center">
                                                <div
                                                    className="w-[68px] h-[68px] flex items-center justify-center bg-[#FFF9E5] border border-[#CCF1FF]"
                                                    style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }}
                                                >
                                                    <Star size={40} className="text-[#D97706] fill-[#D97706]/20" />
                                                </div>
                                                <div className="flex flex-col items-center -space-y-0.5">
                                                    <span className="text-[14px] font-semibold text-[#111827]">{!provider.taskCount || provider.taskCount === 0 || !provider.rating ? '0.0' : provider.rating.toFixed(1)}</span>
                                                    <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">{t({ en: 'Rating', fr: 'Note', ar: 'تقييم' })}</span>
                                                </div>
                                            </div>

                                            {/* Orders Stat */}
                                            <div className="flex flex-col items-center gap-2 text-center">
                                                <div
                                                    className="w-[68px] h-[68px] flex items-center justify-center bg-[#F0F9FF] border border-[#E0F2FE]"
                                                    style={{ borderRadius: '60% 40% 30% 70% / 70% 30% 70% 30%' }}
                                                >
                                                    <CheckCircle2 size={40} className="text-[#0284C7] fill-[#0284C7]/10" />
                                                </div>
                                                <div className="flex flex-col items-center -space-y-0.5">
                                                    <span className="text-[14px] font-semibold text-[#111827]">{effectiveJobs}</span>
                                                    <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">{t({ en: 'Orders', fr: 'Commandes', ar: 'طلبات' })}</span>
                                                </div>
                                            </div>

                                            {/* Experience Stat */}
                                            <div className="flex flex-col items-center gap-2 text-center">
                                                <div
                                                    className="w-[68px] h-[68px] flex items-center justify-center bg-[#F5F3FF] border border-[#EDE9FE]"
                                                    style={{ borderRadius: '50% 50% 20% 80% / 40% 60% 40% 60%' }}
                                                >
                                                    <Calendar size={40} className="text-[#6366F1] fill-[#6366F1]/10" />
                                                </div>
                                                <div className="flex flex-col items-center -space-y-0.5">
                                                    <span className="text-[14px] font-semibold text-[#111827]">{provider.yearsOfExperience || (t({ en: '1 Year', fr: '1 an', ar: 'سنة واحدة' }))}</span>
                                                    <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">{t({ en: 'Experience', fr: 'Expérience', ar: 'خبرة' })}</span>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* About */}
                                        <motion.div variants={staggerItem} className="mb-10">
                                            <h4 className="text-[18px] font-black text-[#111827]">{t({ en: 'About Me', fr: 'À propos de moi' })}</h4>
                                            <div className="text-[15px] text-[#000000] leading-relaxed font-medium mt-2">
                                                {provider.bio_translations?.[language as keyof typeof provider.bio_translations] ? (
                                                    provider.bio_translations[language as keyof typeof provider.bio_translations]
                                                ) : provider.bio && provider.bio.trim() ? (
                                                    <div className="flex flex-col gap-2">
                                                        <span>{provider.bio}</span>
                                                        {((isArabic(provider.bio) && language !== 'ar') || (!isArabic(provider.bio) && language === 'ar')) && (
                                                            <button
                                                                onClick={handleTranslateBio}
                                                                disabled={isTranslating}
                                                                className="flex items-center gap-1.5 text-[12px] font-bold text-[#01A083] hover:opacity-80 transition-opacity w-fit"
                                                            >
                                                                {isTranslating ? (
                                                                    <Loader2 size={13} className="animate-spin" />
                                                                ) : (
                                                                    <Sparkles size={13} />
                                                                )}
                                                                {t({ en: 'See translation', fr: 'Voir la traduction', ar: 'مشاهدة الترجمة' })}
                                                            </button>
                                                        )}
                                                        {translationError && (
                                                            <a
                                                                href={`https://translate.google.com/?sl=auto&tl=${language}&text=${encodeURIComponent(provider.bio)}&op=translate`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[12px] font-medium text-neutral-400 hover:text-[#01A083] underline underline-offset-2 flex items-center gap-1"
                                                            >
                                                                {t({ en: 'Try Google Translate instead', fr: 'Essayer Google Traduction', ar: 'جرب ترجمة جوجل' })}
                                                                <ChevronRight size={10} />
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-neutral-400 italic">{t({ en: 'No bio provided by the Bricoler yet.', fr: 'Aucune biographie fournie par le Bricoleur.' })}</span>
                                                )}
                                            </div>
                                        </motion.div>

                                        {/* Portfolio Section - High Visibility Move */}
                                        {provider.portfolio && provider.portfolio.length > 0 && (
                                            <motion.div variants={staggerItem} className="mb-8">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-[18px] font-black text-[#111827]">{t({ en: 'Portfolio', fr: 'Portfolio', ar: 'معرض الأعمال' })}</h4>
                                                    <span className="text-[11px] font-black text-[#01A083] tracking-[2px] uppercase">{order.serviceName}</span>
                                                </div>
                                                <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6 pb-2">
                                                    {provider.portfolio.map((img, i) => (
                                                        <motion.div
                                                            key={i}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => setLightboxIndex(i)}
                                                            className="flex-shrink-0 cursor-pointer"
                                                        >
                                                            <img src={img} className="w-32 h-32 rounded-[20px] object-cover border border-neutral-100 shadow-sm" alt="Work sample" />
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Secondary Stats */}
                                        <motion.div variants={staggerItem} className="grid grid-cols-1 gap-3 mb-8">
                                            <div className="p-5 bg-[#F9FAFB] rounded-[15px] border border-neutral-100 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-[12px] bg-white shadow-sm flex items-center justify-center text-[#01A083]">
                                                        <TrendingUp size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-[#9CA3AF] tracking-widest uppercase mb-0.5">{t({ en: 'Performance', fr: 'Performance', ar: 'الأداء' })}</div>
                                                        <div className="text-[16px] font-bold text-[#111827]">{t({ en: '99% Success Rate', fr: 'Taux de réussite de 99%', ar: '99% نسبة النجاح' })}</div>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-1 bg-[#F1FEF4] rounded-full text-[#10B981] text-[11px] font-black">{t({ en: 'EXCELLENT', fr: 'EXCELLENT', ar: 'ممتاز' })}</div>
                                            </div>
                                        </motion.div>




                                        {/* Transportation Section */}
                                        {order.serviceType === 'moving' && provider.movingTransports && provider.movingTransports.length > 0 && (
                                            <motion.div variants={staggerItem} className="mb-10">
                                                <h4 className="text-[18px] font-black text-[#111827] mb-4">
                                                    {t({ en: 'Transportation', fr: 'Moyen de transport', ar: 'وسيلة النقل' })}
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {provider.movingTransports.map((item, i) => {
                                                        const transportLabels: Record<string, any> = {
                                                            'triporteur': { en: 'Triporteur', fr: 'Triporteur', ar: 'تريبورتور', icon: '🏍️' },
                                                            'small_van': { en: 'Small Van', fr: 'Petite Camionnette', ar: 'شاحنة صغيرة', icon: '🚐' },
                                                            'large_van': { en: 'Large Van', fr: 'Grande Camionnette', ar: 'شاحنة كبيرة', icon: '🚚' },
                                                            'small_truck': { en: 'Small Truck', fr: 'Petit Camion', ar: 'شاحنة صغيرة', icon: '🚛' },
                                                            'large_truck': { en: 'Large Truck', fr: 'Gros Camion', ar: 'شاحنة نقل كبيرة', icon: '🚛' }
                                                        };
                                                        const label = transportLabels[item] || { en: item, fr: item, ar: item, icon: '🚚' };
                                                        return (
                                                            <div key={i} className="flex items-center gap-2 px-4 py-2 bg-[#F9FAFB] rounded-[10px] border border-neutral-100 text-[14px] font-bold text-[#4B5563]">
                                                                <span className="text-lg">{label.icon}</span>
                                                                {t(label)}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Equipment Section */}
                                        {!['car_rental', 'tour_guide', 'learn_arabic'].includes(order.serviceType || '') && provider.equipments && provider.equipments.length > 0 && (
                                            <motion.div variants={staggerItem} className="mb-10">
                                                <h4 className="text-[18px] font-black text-[#111827] mb-4">Service Equipment</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {provider.equipments.map((item, i) => (
                                                        <div key={i} className="flex items-center gap-2 px-4 py-2 bg-[#F9FAFB] rounded-full border border-neutral-100 text-[14px] font-bold text-[#4B5563]">
                                                            <div className="w-5 h-5 rounded-full bg-[#01A083]/10 flex items-center justify-center">
                                                                <Check size={12} className="text-[#01A083]" strokeWidth={3} />
                                                            </div>
                                                            {item}
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Reviews Section */}
                                        <motion.div variants={staggerItem} className="mb-10">
                                            <div className="flex items-center justify-between mb-6 pb-2 border-b border-neutral-100">
                                                <h4 className="text-[19px] font-black text-[#111827]">
                                                    {t({ en: `Reviews for ${order.serviceName || 'Service'}`, fr: `Avis pour ${order.serviceName || 'Service'}`, ar: `تقييمات ${order.serviceName || 'الخدمة'}` })} ({provider.reviews?.length || 0})
                                                </h4>
                                            </div>
                                            <div className="flex flex-col gap-10">
                                                {provider.reviews && provider.reviews.length > 0 ? provider.reviews.map((rev, i) => (
                                                    <div key={i} className="flex flex-col gap-3">
                                                        <div className="flex items-start gap-4">
                                                            {/* User Icon Placeholder or Avatar */}
                                                            <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                                {(rev.clientAvatar || rev.userPhotoURL) ? (
                                                                    <img src={rev.clientAvatar || rev.userPhotoURL} className="w-full h-full object-cover" alt="" />
                                                                ) : (
                                                                    <User size={32} className="text-neutral-300" />
                                                                )}
                                                            </div>

                                                            <div className="flex-1">
                                                                {/* Name and Rating */}
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <p className="text-[17px] font-black text-[#111827]">{rev.clientName || rev.userName || 'Verified Client'}</p>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Star size={18} className="text-[#111827] fill-[#111827]" />
                                                                        <span className="text-[17px] font-black text-[#111827]">{rev.rating ? Number(rev.rating).toFixed(1) : '5.0'}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Category Badge & Date */}
                                                                <div className="flex items-center gap-3">
                                                                    <span
                                                                        className="px-2.5 py-1 rounded-[4px] text-[10px] font-black tracking-wider uppercase"
                                                                        style={{
                                                                            background: (order.serviceType || '').includes('clean') ? '#F5F3FF' : '#F0F9FF',
                                                                            color: (order.serviceType || '').includes('clean') ? '#7C3AED' : '#0284C7'
                                                                        }}
                                                                    >
                                                                        {order.serviceName || 'SERVICE'}
                                                                    </span>
                                                                    <span className="text-[13px] font-medium text-[#6B7280]">
                                                                        on {rev.date ? new Date(rev.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : (t({ en: 'Sun, Apr 5', fr: 'dimanche 5 avr.', ar: 'الأحد 5 أبريل' }))}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Comment Text */}
                                                        <div className="pl-0">
                                                            <p className="text-[15px] text-[#4B5563] font-medium leading-[1.6]">{rev.comment}</p>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="py-12 text-center border border-dashed border-neutral-200 rounded-[20px]">
                                                        <p className="text-[#9CA3AF] font-medium text-[15px] ">{t({ en: 'Awaiting first reviews on the app', fr: 'En attente des premiers avis sur l\'application', ar: 'في انتظار المراجعات الأولى على التطبيق' })}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>

                                        {/* Trusted Provider */}
                                        <motion.div variants={staggerItem} className="p-5 bg-[#F0FDF4] rounded-[5px] border border-[#D1FAE5] flex items-center gap-4 mb-32">
                                            <div className="w-11 h-11 rounded-full bg-[#D1FAE5] flex items-center justify-center text-[#01A083]">
                                                <Check size={22} className="stroke-[3]" />
                                            </div>
                                            <div>
                                                <p className="text-[16px] font-black text-[#065F46]">{t({ en: 'Verified Bricoler', fr: 'Bricoleur vérifié', ar: 'حرفي موثوق' })}</p>
                                                <p className="text-[13px] font-medium text-[#047857]">{t({ en: 'Identity and skills verified by Lbricol team.', fr: 'Identité et compétences vérifiées par l\'équipe Lbricol.', ar: 'تم التحقق من الهوية والمهارات من قبل فريق Lbricol.' })}</p>
                                            </div>
                                        </motion.div>
                                    </>
                                )}


                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="setup"
                            variants={staggerContainer}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, x: -10 }}
                            className="space-y-10 mt-6"
                        >


                            {/* Saved Profiles */}
                            {profiles.length > 0 && (
                                <motion.section variants={staggerItem} className="px-6">
                                    <h3 className="text-[18px] font-Bold text-[#111827] mb-5 px-1 flex items-center gap-2">
                                        {t({ en: 'Saved Setups', fr: 'Installations enregistrées', ar: 'الإعدادات المحفوظة' })}
                                    </h3>
                                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-1 px-1">
                                        <button
                                            onClick={() => {
                                                setSelectedProfileId('new');
                                                setRooms(2);
                                                setPropertyType('Apartment');
                                                setPhotos([]);
                                                setNote('');
                                                // If applicable, reset other fields
                                            }}
                                            className={`flex-shrink-0 px-6 py-4 rounded-[10px] border-2 transition-all flex items-center gap-3 ${selectedProfileId === 'new' ? 'border-[#01A083] bg-[#F0FDF9] text-[#01A083]' : 'border-neutral-100 bg-white text-[#9CA3AF]'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${selectedProfileId === 'new' ? ' text-white' : 'bg-neutral-100'}`}>
                                                <Home size={20} className="text-[#01A083]" />
                                            </div>
                                            <span className="font-black text-[15px]">{t({ en: 'New setup', fr: 'Nouvelle installation', ar: 'إعداد جديد' })}</span>
                                        </button>

                                        {profiles.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    setSelectedProfileId(p.id);
                                                    setRooms(p.details.rooms || 2);
                                                    setPropertyType(p.details.propertyType || 'Apartment');
                                                    setPhotos(p.details.photoUrls || []);
                                                    setNote(p.details.note || '');
                                                }}

                                                className={`flex-shrink-0 px-6 py-4 rounded-[10px] border-2 transition-all flex items-center gap-3 min-w-[200px] ${selectedProfileId === p.id ? 'border-[#01A083] bg-[#F0FDF9] text-[#01A083]' : 'border-neutral-100 bg-white text-[#111827]'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${selectedProfileId === 'new' ? ' text-white' : 'bg-neutral-100'}`}>
                                                    <Home size={20} className="text-[#01A083]" />
                                                </div>

                                                <div className="text-left">
                                                    <p className="font-black text-[15px] leading-tight">{p.label}</p>
                                                    <p className={`text-[11px] font-bold ${selectedProfileId === p.id ? 'text-[#01A083]/70' : 'text-neutral-400'}`}>
                                                        {p.details.propertyType || 'Standard'}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </motion.section>
                            )}

                            {/* Setup Content */}
                            <motion.section variants={staggerItem} className="space-y-10 px-6">
                                {(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) ? (
                                    <div className="space-y-12">
                                        {/* 1. Category & Description */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-[25px] font-bold text-[#111827]">{t({ en: 'What do you need?', fr: 'Que vous faut-il ?', ar: 'ماذا تحتاج؟' })}</h3>
                                                <div className="px-3 py-1 bg-[#01A083]/10 rounded-full">
                                                    <span className="text-[12px] font-black text-[#01A083] uppercase tracking-wider">{t({ en: 'Errand', fr: 'Coursier', ar: 'خدمة' })}</span>
                                                </div>
                                            </div>

                                            {/* Category Chips Scroll */}
                                            <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                                                {errandCategories.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => {
                                                            setErrandCategory(cat.id);
                                                            // Logic for handling title might be here
                                                        }}
                                                        className={`flex-shrink-0 px-5 py-3.5 rounded-[12px] border-2 transition-all flex flex-col items-center gap-2 min-w-[100px] ${errandCategory === cat.id ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                    >
                                                        <span className="text-2xl">{cat.icon}</span>
                                                        <span className="text-[13px] font-bold">{cat.label}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => setActiveDrawer('description')}
                                                className="w-full p-6 bg-[#F9FAFB] border border-neutral-100 rounded-[15px] flex items-center justify-between group active:scale-[0.99] transition-all"
                                            >
                                                <div className="flex items-center gap-4 text-left">

                                                    <div>
                                                        <p className="text-[16px] font-bold text-[#111827]">
                                                            {itemDescription || t({ en: 'Add details (e.g. key from A to B)', fr: 'Ajouter des détails (ex: clé de A à B)', ar: 'إضافة تفاصيل (مثلاً: مفتاح من أ إلى ب)' })}
                                                        </p>
                                                        <p className="text-[13px] font-medium text-[#9CA3AF]">{t({ en: 'Courier will see this description', fr: 'Le coursier verra cette description', ar: 'سيقوم المندوب برؤية هذا الوصف' })}</p>
                                                    </div>
                                                </div>
                                                <ChevronLeft className="rotate-180 text-neutral-300 group-hover:text-[#01A083] transition-colors" size={22} />
                                            </button>
                                        </div>

                                        {/* 2. Load Size Picker */}
                                        <div className="space-y-6">
                                            <h3 className="text-[25px] text-[#111827] font-medium">{t({ en: 'Package Size', fr: 'Taille du colis', ar: 'حجم الطرد' })}</h3>
                                            <div className="grid grid-cols-1 gap-3">
                                                {errandSizes.map((size) => (
                                                    <button
                                                        key={size.id}
                                                        onClick={() => setTaskSize(size.id as any)}
                                                        className={`p-5 rounded-[10px] border-1 text-left transition-all flex items-center justify-between ${taskSize === size.id ? 'border-[#01A083] ' : 'border-neutral-100'}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-[10px] flex items-center justify-center text-2xl ">
                                                                {size.icon}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-[17px] text-black">{size.name}</p>
                                                                <p className="font-medium text-[13px] text-black/60">{size.desc}</p>
                                                            </div>
                                                        </div>
                                                        {taskSize === size.id && (
                                                            <div className="w-6 h-6 rounded-full bg-[#01A083] flex items-center justify-center">
                                                                <Check size={14} className="text-white" strokeWidth={3} />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 3. Photo Section (Trust) */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-[25px] text-[#111827] font-bold">{t({ en: 'Item Photo', fr: 'Photo de l\'article', ar: 'صورة الغرض' })}</h3>
                                            </div>
                                            <div className="p-8 border-2 border-dashed border-neutral-100 rounded-[15px] bg-[#F9FAFB] flex flex-col items-center justify-center gap-6 text-center">
                                                {!photos.length && (
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-neutral-300">
                                                            <ImageIcon size={32} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[15px] font-bold text-[#111827]">{t({ en: 'Show the Bricoler the item', fr: 'Montrez l\'article au Bricoleur', ar: 'أظهر الغرض للحرفي' })}</p>
                                                            <p className="text-[13px] font-medium text-neutral-500 max-w-[240px]">{t({ en: 'Helps them prepare and confirms it fits their vehicle', fr: 'L\'aide à se préparer et confirme que cela rentre dans son véhicule', ar: 'يساعدهم في التحضير والتأكد من ملاءمة السيارة' })}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                                                    {photos.map((photo, idx) => (
                                                        <div key={idx} className="w-24 h-24 rounded-[12px] overflow-hidden border-2 border-white relative group active:scale-95 transition-all">
                                                            <img src={photo} className="w-full h-full object-cover" />
                                                            <button
                                                                onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                                                                className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500/90 backdrop-blur-sm rounded-full flex items-center justify-center text-white active:bg-red-600 transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))}

                                                    {photos.length < 6 && (
                                                        <button
                                                            onClick={() => document.getElementById('errand-photo-input')?.click()}
                                                            className="w-24 h-24 rounded-[12px] border-2 border-dashed border-neutral-200 bg-white flex flex-col items-center justify-center gap-1 text-neutral-400 hover:border-[#01A083] hover:text-[#01A083] transition-all active:scale-95"
                                                        >
                                                            <Plus size={24} />
                                                            <span className="text-[10px] font-black uppercase tracking-wider">{t({ en: 'Add', fr: 'Ajouter', ar: 'إضافة' })}</span>
                                                        </button>
                                                    )}
                                                </div>


                                                <input
                                                    id="errand-photo-input"
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handlePhotoUpload}
                                                />
                                            </div>
                                        </div>

                                        {/* 4. Routing Display */}
                                        <div className="space-y-6">
                                            <h3 className="text-[25px] font-bold text-[#111827]">{t({ en: 'Delivery Route', fr: 'Itinéraire de livraison', ar: 'مسار التوصيل' })}</h3>

                                            <div className="h-56 bg-[#F3F4F6] rounded-[10px] border border-neutral-100 relative overflow-hidden ">
                                                <MapView
                                                    initialLocation={order.location || { lat: 31.5085, lng: -9.7595 }}
                                                    interactive={false}
                                                    onLocationChange={() => { }}
                                                    lockCenterOnFocus={false} // Allow fitBounds to work
                                                    showCenterPin={false}
                                                    zoom={14}
                                                    clientPin={memoizedClientPin}
                                                    destinationPin={memoizedDestinationPin}
                                                />
                                                <div className="absolute top-4 right-4 z-10">
                                                    <div className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-full border border-neutral-100 flex items-center gap-2">
                                                        <Navigation size={14} className="text-[#01A083]" />
                                                        <span className="text-[12px] font-black text-[#111827]">{t({ en: 'Estimated Route', fr: 'Itinéraire estimé', ar: 'المسار المقدر' })}</span>
                                                    </div>
                                                </div>

                                                {estimate?.duration && (
                                                    <div className="absolute bottom-4 left-4 z-10 transition-all animate-in fade-in slide-in-from-bottom-2 duration-700">
                                                        <div className="px-4 py-2 bg-white/95 backdrop-blur rounded-[12px] border border-neutral-100 flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-[#01A083]/10 flex items-center justify-center">
                                                                <Clock size={16} className="text-[#01A083]" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[14px] font-black text-[#111827] leading-none mb-0.5">{Math.ceil(estimate.duration)} {t({ en: 'mins', fr: 'mins', ar: 'دقائق' })}</span>
                                                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Travel Time', fr: 'Temps de trajet', ar: 'وقت الرحلة' })}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid gap-3">
                                                <button
                                                    onClick={() => setActiveDrawer('pickup')}
                                                    className="w-full p-6 flex items-center justify-between bg-white rounded-[15px] border border-neutral-100 transition-all active:scale-[0.99]"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 flex items-center justify-center">
                                                            <img src="/Images/Icons/Lightpin.png" alt="from" className="w-10 h-10 object-contain" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-[13px] font-bold text-[#000000] uppercase tracking-wider mb-0.5">{t({ en: 'Pickup Point', fr: 'Point de retrait', ar: 'نقطة الاستلام' })}</p>
                                                            <p className={`text-[15px] font-bold truncate max-w-[220px] ${pickupLocation.address ? 'text-[#111827]' : 'text-neutral-300'}`}>
                                                                {pickupLocation.address || t({ en: 'Where do we start?', fr: 'Où commençons-nous ?', ar: 'من أين نبدأ؟' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-300">
                                                        <ChevronLeft className="rotate-180" size={16} />
                                                    </div>
                                                </button>



                                                <button
                                                    onClick={() => setActiveDrawer('dropoff')}
                                                    className="w-full p-6 flex items-center justify-between bg-white rounded-[15px] border border-neutral-100 transition-all active:scale-[0.99]"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 flex items-center justify-center">
                                                            <img src="/Images/Icons/Lightpin.png" alt="from" className="w-10 h-10 object-contain" />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-[11px] font-bold text-[#000000] uppercase tracking-wider mb-0.5">{t({ en: 'Drop-off Point', fr: 'Point de livraison', ar: 'نقطة التسليم' })}</p>
                                                            <p className={`text-[15px] font-bold truncate max-w-[220px] ${dropoffLocation.address ? 'text-[#111827]' : 'text-neutral-300'}`}>
                                                                {dropoffLocation.address || t({ en: 'Where to deliver?', fr: 'Où livrer ?', ar: 'أين التسليم؟' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-300">
                                                        <ChevronLeft className="rotate-180" size={16} />
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        {/* 5. Warning Banner */}
                                        <div className="bg-[#F9FAFB] p-6 rounded-[10px] flex items-start gap-5 ">
                                            <div className="w-12 h-12 rounded-[12px]  flex items-center justify-center flex-shrink-0 ">
                                                <AlertCircle size={24} className="text-[#000000]" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[20px] font-medium text-[#000000]">{t({ en: 'Strict: No Purchases', fr: 'Strict : Pas d\'achats', ar: 'تنبيه: لا يوجد مشتريات' })}</p>
                                                <p className="text-[14px] font-Light text-[#000000] leading-relaxed">
                                                    {t({ en: 'Bricolers are couriers, not shoppers. They cannot buy products for you. Items must be prepaid or ready for pickup.', fr: 'Les Bricoleurs sont des coursiers, pas des acheteurs. Ils ne peuvent pas acheter de produits pour vous. Les articles doivent être prépayés ou prêts pour le retrait.', ar: 'الحرفيون هم عمال توصيل وليسوا متسوقين. لا يمكنهم شراء المنتجات لك. يجب أن تكون الأصناف مدفوعة مسبقاً أو جاهزة للاستلام.' })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* 6. Recipient Details */}
                                        <div className="space-y-6">
                                            <h3 className="text-[25px] font-medium text-[#111827]">{t({ en: 'Handling Info', fr: 'Infos de manutention', ar: 'معلومات الاستلام' })}</h3>
                                            <button
                                                onClick={() => setActiveDrawer('recipient')}
                                                className="w-full p-6 flex items-center justify-between rounded-[15px] border border-neutral-100 transition-all active:scale-[0.99]"
                                            >
                                                <div className="flex items-center gap-4 text-left">
                                                    <div className="w-11 h-11 rounded-[10px]  flex items-center justify-center ">
                                                        <Gift size={32} className="text-[#000000]" />
                                                    </div>
                                                    <div>
                                                        <p className={`text-[16px] font-bold ${recipientName ? 'text-[#111827]' : 'text-[#111827]'}`}>
                                                            {recipientName ? `${t({ en: 'Recipient', fr: 'Destinataire', ar: 'المستلم' })}: ${recipientName}` : t({ en: 'Sending to someone else?', fr: 'Envoyer à quelqu\'un d\'autre ?', ar: 'إرسال لشخص آخر؟' })}
                                                        </p>
                                                        <p className="text-[13px] font-medium text-[#9CA3AF] text-left">{t({ en: 'Who should the courier meet at drop-off?', fr: 'Qui le coursier doit-il rencontrer à la livraison ?', ar: 'من يجب أن يقابل المندوب عند التسليم؟' })}</p>
                                                    </div>
                                                </div>
                                                <ChevronLeft className="rotate-180 text-neutral-400" size={20} />
                                            </button>
                                        </div>

                                        {/* 7. Scheduling (Pic 3 Design) */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-[25px] font-bold text-[#111827]">{t({ en: 'Delivery options', fr: 'Options de livraison', ar: 'خيارات التوصيل' })}</h3>
                                                <button className="w-5 h-5 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-400 text-[10px] font-black">i</button>
                                            </div>

                                            {/* Standard Option */}
                                            <button
                                                onClick={() => setDeliveryType('standard')}
                                                className={`w-full p-6 text-left flex items-center justify-between transition-all ${deliveryType === 'standard' ? 'bg-[#F0FDF9]' : 'hover:bg-neutral-50'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${deliveryType === 'standard' ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-200'}`}>
                                                        {deliveryType === 'standard' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[20px] font-medium text-[#111827]">{t({ en: 'Standard', fr: 'Standard', ar: 'عادي' })}</p>
                                                        <p className="text-[14px] font-light text-[#111827]">{t({ en: 'As soon as possible', fr: 'Dès que possible', ar: 'في أقرب وقت ممكن' })}</p>
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Schedule Option */}
                                            <button
                                                onClick={() => {
                                                    setDeliveryType('schedule');
                                                    setActiveDrawer('schedule');
                                                }}
                                                className={`w-full p-6 text-left flex items-center justify-between transition-all ${deliveryType === 'schedule' ? 'bg-[#F0FDF9]' : 'hover:bg-neutral-50'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${deliveryType === 'schedule' ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-200'}`}>
                                                        {deliveryType === 'schedule' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[20px] font-medium text-[#111827]">{t({ en: 'Schedule', fr: 'Planifier', ar: 'جدولة' })}</p>
                                                        <p className="text-[14px] font-light text-[#111827]">
                                                            {deliveryDate ? `${deliveryDate} ${t({ en: 'at', fr: 'à', ar: 'في' })} ${deliveryTime}` : t({ en: 'Select time', fr: 'Choisir l\'heure', ar: 'اختر الوقت' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={20} className="text-neutral-300" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Availability Picker */}
                                        <div className="space-y-6">
                                            <h3 className="text-[20px] text-[#111827] font-bold">{t({ en: 'When do you need the Bricoler?', fr: 'Quand avez-vous besoin du Bricoleur ?' })}</h3>
                                            <OrderAvailabilityPicker
                                                bricolerId={order.providerId!}
                                                onSelect={(slots) => {
                                                    setSelectedSlots(slots);
                                                }}
                                                selectedSlots={selectedSlots}
                                                taskDurationHours={estimate?.duration || taskDuration}
                                            />
                                        </div>

                                        {/* Moving Help Specialized Sections */}
                                        {(order.serviceType === 'moving' || order.serviceType?.includes('moving')) && (
                                            <div className="space-y-10">
                                                {/* Task Size */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] text-[#111827] font-bold">{t({ en: 'How big is the move?', fr: 'Quelle est la taille du déménagement ?', ar: 'ما هو حجم الانتقال؟' })}</h3>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { id: 'small', name: t({ en: 'Small', fr: 'Petit', ar: 'صغير' }), desc: t({ en: 'A few items or 1 room', fr: 'Quelques objets ou 1 pièce', ar: 'بضعة أشياء أو غرفة واحدة' }), duration: '1.5h', hours: 1.5 },
                                                            { id: 'medium', name: t({ en: 'Medium', fr: 'Moyen', ar: 'متوسط' }), desc: t({ en: '2-3 rooms / Small apartment', fr: '2-3 pièces / Petit appartement', ar: '2-3 غرف / شقة صغيرة' }), duration: '3h', hours: 3 },
                                                            { id: 'large', name: t({ en: 'Large', fr: 'Grand', ar: 'كبير' }), desc: t({ en: '4+ rooms / Big house', fr: '4+ pièces / Grande maison', ar: 'أكثر من 4 غرف / منزل كبير' }), duration: '5h+', hours: 5 },
                                                        ].map((size) => (
                                                            <button
                                                                key={size.id}
                                                                onClick={() => {
                                                                    setTaskSize(size.id as any);
                                                                    setTaskDuration(size.hours);
                                                                }}
                                                                className={`p-5 rounded-[5px] border-2 text-left transition-all flex items-center justify-between ${taskSize === size.id ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                            >
                                                                <div className="pl-4">
                                                                    <p className="font-bold text-[17px] text-black">{size.name}</p>
                                                                    <p className="font-medium text-[13px] text-black/60">{size.desc}</p>
                                                                </div>
                                                                <div className="text-right pr-4">
                                                                    <p className="font-bold text-[15px] text-[#01A083]">{t({ en: 'Est.', fr: 'Est.' })} {size.duration}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Packing Service: Move items too? */}
                                                {order.subServiceId === 'packing' && (
                                                    <div className="space-y-4">
                                                        <h3 className="text-[20px] text-[#111827] font-black">{t({ en: 'Move these items too?', fr: 'Déménager ces objets aussi ?', ar: 'هل تريد نقل هذه الأشياء أيضاً؟' })}</h3>
                                                        <p className="text-neutral-500 text-[15px] font-medium leading-relaxed max-w-[90%]">
                                                            {t({ en: 'Do you need the items to be transported to a second location after they are packed?', fr: 'Avez-vous besoin que les objets soient transportés vers un second lieu après l\'emballage ?', ar: 'هل تحتاج لنقل الأشياء إلى موقع ثانٍ بعد تغليفها؟' })}
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                                            <button
                                                                onClick={() => setNeedsTransport(false)}
                                                                className={`p-5 rounded-[5px] border-2 font-black transition-all ${!needsTransport ? 'border-[#01A083] bg-[#F0FDF9] text-[#01A083]' : 'border-neutral-100 bg-[#F9FAFB] text-neutral-400'}`}
                                                            >
                                                                {t({ en: 'No, just packing', fr: 'Non, juste l\'emballage', ar: 'لا، تغليف فقط' })}
                                                            </button>
                                                            <button
                                                                onClick={() => setNeedsTransport(true)}
                                                                className={`p-5 rounded-[5px] border-2 font-black transition-all ${needsTransport ? 'border-[#01A083] bg-[#F0FDF9] text-[#01A083]' : 'border-neutral-100 bg-[#F9FAFB] text-neutral-400'}`}
                                                            >
                                                                {t({ en: 'Yes, pack & move', fr: 'Oui, emballer & déménager' })}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Route Section (Pic 4 Style) */}
                                                {needsTransport && (
                                                    <div className="space-y-6">
                                                        <h3 className="text-[20px] text-[#111827] font-black">Delivery details</h3>

                                                        {/* Compact Map Card */}
                                                        <div className="h-[180px] bg-[#F3F4F6] rounded-[5px] border border-neutral-100 overflow-hidden relative">
                                                            <MapView
                                                                initialLocation={order.location || { lat: 31.5085, lng: -9.7595 }}
                                                                interactive={false}
                                                                onLocationChange={() => { }}
                                                                lockCenterOnFocus={true}
                                                                zoom={14}
                                                                clientPin={memoizedClientPin}
                                                                destinationPin={memoizedDestinationPin}
                                                            />
                                                            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/10 to-transparent" />
                                                        </div>

                                                        <div className="space-y-2">
                                                            {/* Where from? */}
                                                            <button
                                                                onClick={() => setActiveDrawer('pickup')}
                                                                className="w-full p-5 flex items-center justify-between group bg-[#FFFFFF] rounded-[5px]   transition-all active:scale-[0.99]"
                                                            >
                                                                <div className="flex items-center gap-4 text-left pl-2">
                                                                    <div className="w-10 h-10 flex items-center justify-center">
                                                                        <img src="/Images/Icons/Lightpin.png" alt="from" className="w-10 h-10 object-contain" />
                                                                    </div>
                                                                    <span className={`text-[17px] font-medium flex-1 truncate ${pickupLocation.address ? 'text-light' : 'text-neutral-400'}`}>
                                                                        {pickupLocation.address || t({ en: 'Where from?', fr: 'D\'où ?' })}
                                                                    </span>
                                                                </div>
                                                                <ChevronRight className="text-neutral-300 group-hover:text-black transition-colors" size={18} />
                                                            </button>
                                                            {/* Where to? */}
                                                            <button
                                                                onClick={() => setActiveDrawer('map_picker')}
                                                                className="w-full p-5 flex items-center justify-between group bg-[#FFFFFF] rounded-[5px]  transition-all active:scale-[0.99]"
                                                            >
                                                                <div className="flex items-center gap-4 text-left pl-2">
                                                                    <div className="w-10 h-10 flex items-center justify-center">
                                                                        <img src="/Images/Icons/Lightpin.png" alt="to" className="w-10 h-10 object-contain" />
                                                                    </div>
                                                                    <span className={`text-[17px] font-medium flex-1 truncate ${dropoffLocation.address ? 'text-light' : 'text-neutral-400'}`}>
                                                                        {dropoffLocation.address || t({ en: 'Where to?', fr: 'Vers où ?' })}
                                                                    </span>
                                                                </div>
                                                                <ChevronRight className="text-neutral-300 group-hover:text-black transition-colors" size={18} />
                                                            </button>
                                                        </div>

                                                        {pickupLocation.address && dropoffLocation.address && (
                                                            <div className="p-4 bg-[#F9FAFB] rounded-[5px] flex items-center justify-between border border-neutral-100 italic">
                                                                <span className="text-[13px] font-light text-neutral-500">{t({ en: 'Delivery Estimate', fr: 'Estimation de livraison' })}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[13px] font-black text-[#01A083]">
                                                                        {estimate?.distanceKm ? `${estimate.distanceKm.toFixed(1)} km` : ""}
                                                                    </span>
                                                                    {estimate?.distanceKm && (estimate.duration || estimate.duration === 0) ? <span className="text-neutral-300">·</span> : null}
                                                                    <span className="text-[13px] font-medium text-black">
                                                                        {(estimate?.duration || estimate?.duration === 0) ? `${estimate.duration} ${t({ en: 'min travel', fr: 'min de trajet' })}` : t({ en: 'Calculating route...', fr: 'Calcul de l\'itinéraire...' })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Property Type */}
                                        {order.subServiceId !== 'office_cleaning' && (
                                            <div className="space-y-6">
                                                <h3 className="text-[20px] text-[#111827] font-bold">{t({ en: 'What kind of place is this?', fr: 'Quel type de lieu est-ce ?' })}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Studio', 'Apartment', 'Villa', 'Guesthouse', 'Riad', 'Hotel', 'Business'].map(type => (
                                                        <button
                                                            key={type}
                                                            onClick={() => setPropertyType(type)}
                                                            className={`px-8 py-3.5 rounded-full border-2 font-bold text-[13px] transition-all ${propertyType === type ? 'border-[#01A083] bg-white text-[#01A083]' : 'border-neutral-100 text-black'}`}
                                                        >
                                                            {type}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Room Selector (Eggy Style Redesign) */}
                                        {((order.serviceType === 'cleaning' || order.serviceType === 'hospitality') && !['car_washing', 'car_detailing', 'dish_cleaning', 'office_cleaning'].includes(order.subServiceId || '')) && (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between px-1">
                                                    <label className="text-[20px] font-medium text-[#111827] setup-heading">{t({ en: 'How many rooms?', fr: 'Combien de chambres ?', ar: 'كم عدد الغرف؟' })}</label>
                                                </div>
                                                <div className="flex gap-4 overflow-x-auto pb-6 pt-2 no-scrollbar -mx-6 px-6 snap-x snap-mandatory">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(num => (order.subServiceId === 'hospitality_turnover' || order.serviceType === 'hospitality') ? num >= 2 : true).map((num) => (
                                                        <motion.button
                                                            key={num}
                                                            whileTap={{ scale: 0.9 }}
                                                            animate={rooms === num ? {
                                                                borderRadius: ["45% 55% 52% 48% / 55% 45% 58% 42%", "52% 48% 45% 55% / 45% 55% 42% 58%", "45% 55% 52% 48% / 55% 45% 58% 42%"],
                                                                rotate: [0, -2, 2, 0]
                                                            } : { borderRadius: "50%", rotate: 0 }}
                                                            transition={rooms === num ? {
                                                                borderRadius: { repeat: Infinity, duration: 4, ease: "easeInOut" },
                                                                rotate: { repeat: Infinity, duration: 5, ease: "easeInOut" }
                                                            } : { duration: 0 }}
                                                            onClick={() => setRooms(num)}
                                                            className={`flex-shrink-0 w-16 h-16 flex items-center justify-center font-medium text-[22px] transition-all snap-center relative ${rooms === num ? 'bg-[#01A083] text-white scale-125 z-10' : 'bg-[#F9FAFB] text-neutral-400 border border-neutral-100/50 rounded-full'}`}
                                                        >
                                                            {num}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Hospitality Cleaning Specialized: Property Multiplier & Stairs */}
                                        {(order.subServiceId === 'hospitality_turnover' || order.serviceType === 'hospitality') && (
                                            <div className="space-y-12 bg-[#F9FAFB]/50 p-6 rounded-[24px] border border-neutral-100/50">
                                                {/* Property Count (How many apartments?) */}
                                                <div className="space-y-6">
                                                    <div className="flex flex-col pb-2">
                                                        <label className="text-[20px] font-black text-[#111827]">{t({ en: 'How many units/apartments?', fr: 'Combien de biens / appartements ?', ar: 'كم عدد الوحدات؟' })}</label>
                                                        <p className="text-[14px] font-bold text-black/40 mt-1">{t({ en: 'Total price will be multiplied by this number.', fr: 'Le prix total sera multiplié par ce nombre.', ar: 'سيتم ضرب السعر الإجمالي في هذا الرقم.' })}</p>
                                                    </div>
                                                    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 no-scrollbar -mx-6 px-6 snap-x snap-mandatory">
                                                        {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                                                            <motion.button
                                                                key={`unit-${num}`}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => setUnitCount(num)}
                                                                className={`flex-shrink-0 w-16 h-16 flex items-center justify-center font-black text-[22px] transition-all snap-center relative ${unitCount === num ? 'bg-[#111827] text-white scale-110 z-10 rounded-full shadow-lg' : 'bg-white text-neutral-400 border border-neutral-100 rounded-full'}`}
                                                            >
                                                                {num}
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Stairs Add-on */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-black text-[#111827] pb-2">{t({ en: 'Clean Stairs?', fr: 'Nettoyer les escaliers ?', ar: 'تنظيف السلالم؟' })}</h3>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { id: 'none', label: t({ en: 'No Stairs', fr: 'Pas d\'escaliers' }), price: 0, icon: '🚫' },
                                                            { id: 'small', label: t({ en: 'Small Stairs', fr: 'Petit escalier' }), price: 30, icon: '🪜' },
                                                            { id: 'medium', label: t({ en: 'Medium / Standard', fr: 'Moyen / Standard' }), price: 45, icon: '🪜' },
                                                            { id: 'large', label: t({ en: 'Large / Grand', fr: 'Grand escalier' }), price: 60, icon: '🏛️' },
                                                        ].map((item) => (
                                                            <button
                                                                key={item.id}
                                                                onClick={() => setStairsType(item.id as any)}
                                                                className={`p-5 rounded-[15px] border-2 text-left transition-all flex items-center gap-4 ${stairsType === item.id ? 'border-[#01A083] bg-[#F1FEF4]' : 'border-neutral-100 bg-white'}`}
                                                            >
                                                                <span className="text-2xl">{item.icon}</span>
                                                                <div className="flex-1">
                                                                    <p className="text-[16px] font-black">{item.label}</p>
                                                                    {item.price > 0 && <p className="text-[12px] font-bold text-[#01A083]">+{item.price} MAD</p>}
                                                                </div>
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${stairsType === item.id ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-200'}`}>
                                                                    {stairsType === item.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tips Selection Group (Available for all cleaning/hospitality) */}
                                        {(order.serviceType === 'cleaning' || order.serviceType === 'hospitality') && (
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3 pb-2">
                                                    <h3 className="text-[20px] font-black text-[#111827]">{t({ en: 'Support your Bricoler', fr: 'Soutenez votre Bricoleur', ar: 'دعم البريكولور' })}</h3>
                                                    <span className="bg-[#FFC244]/20 text-[#D97706] text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">{t({ en: 'Tips', fr: 'Pourboire' })}</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[0, 20, 40, 60].map((amt) => (
                                                        <button
                                                            key={`tip-${amt}`}
                                                            onClick={() => setTipAmount(amt)}
                                                            className={`py-4 rounded-[12px] border-2 font-black text-[15px] transition-all ${tipAmount === amt ? 'border-[#FFC244] bg-[#FFFBEB] text-[#D97706]' : 'border-neutral-100 bg-white text-neutral-400'}`}
                                                        >
                                                            {amt === 0 ? t({ en: 'None', fr: 'Aucun' }) : `${amt} MAD`}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        placeholder={t({ en: 'Custom Amount', fr: 'Montant personnalisé' })}
                                                        value={tipAmount === 0 || [20, 40, 60].includes(tipAmount) ? '' : tipAmount}
                                                        onChange={(e) => setTipAmount(Number(e.target.value))}
                                                        className="w-full p-5 bg-[#F9FAFB] rounded-[15px] border border-neutral-100 outline-none focus:border-[#FFC244]/30 font-bold text-[15px]"
                                                    />
                                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-neutral-300">MAD</span>
                                                </div>
                                            </div>
                                        )}
                                        {/* Office Cleaning Specialized Section */}
                                        {order.subServiceId === 'office_cleaning' && (
                                            <div className="space-y-10">
                                                {/* Scale: Desks */}
                                                <div className="space-y-6">
                                                    <div className="flex flex-col px-1">
                                                        <label className="text-[20px] font-bold text-[#111827]">{t({ en: 'How many desks are there?', fr: 'Combien de bureaux y a-t-il ?', ar: 'كم عدد المكاتب الموجودة؟' })}</label>
                                                        <p className="text-[13px] font-bold text-black/40 mt-1 italic">{t({ en: 'This helps us know how big the office is.', fr: 'Cela nous aide à connaître la taille du bureau.', ar: 'هذا يساعدنا في معرفة حجم المكتب.' })}</p>
                                                    </div>
                                                    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 no-scrollbar -mx-6 px-6 snap-x snap-mandatory">
                                                        {[1, 2, 3, 4, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 100].map((num) => (
                                                            <motion.button
                                                                key={`desk-${num}`}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => setOfficeDesks(num)}
                                                                className={`flex-shrink-0 w-16 h-16 flex items-center justify-center font-medium text-[22px] transition-all snap-center relative ${officeDesks === num ? 'bg-[#01A083] text-white scale-110 z-10 rounded-full' : 'bg-[#F9FAFB] text-neutral-400 border border-neutral-100 rounded-full'}`}
                                                            >
                                                                {num}
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Rooms */}
                                                <div className="space-y-6">
                                                    <label className="text-[20px] font-bold text-[#111827] ">{t({ en: 'How many meeting or private rooms?', fr: 'Combien de salles de réunion ou bureaux privés ?', ar: 'كم عدد غرف الاجتماعات أو الغرف الخاصة؟' })}</label>
                                                    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 no-scrollbar -mx-6 px-6">
                                                        {[0, 1, 2, 3, 4, 5, 8, 10].map((num) => (
                                                            <motion.button
                                                                key={`mr-${num}`}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => setOfficeMeetingRooms(num)}
                                                                className={`flex-shrink-0 px-6 py-3 flex items-center justify-center font-bold text-[15px] transition-all rounded-full ${officeMeetingRooms === num ? 'bg-[#111827] text-white' : 'bg-white border border-neutral-200 text-neutral-600'}`}
                                                            >
                                                                {num} {num === 1 ? t({ en: 'room', fr: 'salle', ar: 'غرفة' }) : t({ en: 'rooms', fr: 'salles', ar: 'غرف' })}
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Restrooms */}
                                                <div className="space-y-6">
                                                    <label className="text-[20px] font-bold text-[#111827] setup-heading px-1">{t({ en: 'How many bathrooms?', fr: 'Combien de salles de bain ?', ar: 'كم عدد الحمامات؟' })}</label>
                                                    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 no-scrollbar -mx-6 px-6">
                                                        {[0, 1, 2, 3, 4, 5].map((num) => (
                                                            <motion.button
                                                                key={`wr-${num}`}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => setOfficeBathrooms(num)}
                                                                className={`flex-shrink-0 px-6 py-3 flex items-center justify-center font-bold text-[15px] transition-all rounded-full ${officeBathrooms === num ? 'bg-[#111827] text-white' : 'bg-white border border-neutral-200 text-neutral-600'}`}
                                                            >
                                                                {num} {num === 1 ? t({ en: 'restroom', fr: 'toilettes', ar: 'حمام' }) : t({ en: 'restrooms', fr: 'toilettes', ar: 'حمامات' })}
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* High Traffic Areas */}
                                                <div className="space-y-4">
                                                    <label className="text-[20px] font-bold text-[#111827] setup-heading px-1">{t({ en: 'Busy Areas', fr: 'Zones fréquentées', ar: 'المناطق المزدحمة' })}</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button
                                                            onClick={() => setHasKitchenette(!hasKitchenette)}
                                                            className={`p-5 rounded-[12px] border-2 text-left transition-all ${hasKitchenette ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="text-2xl">☕</span>
                                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${hasKitchenette ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-300 bg-white'}`}>
                                                                    {hasKitchenette && <Check size={12} className="text-white" strokeWidth={4} />}
                                                                </div>
                                                            </div>
                                                            <span className="text-[14px] font-bold text-[#111827]">{t({ en: 'Kitchen or Breakroom', fr: 'Cuisine ou salle de pause', ar: 'المطبخ أو غرفة الاستراحة' })}</span>
                                                        </button>

                                                        <button
                                                            onClick={() => setHasReception(!hasReception)}
                                                            className={`p-5 rounded-[12px] border-2 text-left transition-all ${hasReception ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="text-2xl">🏢</span>
                                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${hasReception ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-300 bg-white'}`}>
                                                                    {hasReception && <Check size={12} className="text-white" strokeWidth={4} />}
                                                                </div>
                                                            </div>
                                                            <span className="text-[14px] font-bold text-[#111827]">{t({ en: 'Reception or Waiting Area', fr: 'Réception ou salle d\'attente', ar: 'الاستقبال أو منطقة الانتظار' })}</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Commercial Add-ons */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-bold text-[#111827] setup-heading px-1">{t({ en: 'Extra Cleaning (Optional)', fr: 'Nettoyage supplémentaire (Optionnel)', ar: 'تنظيف إضافي (اختياري)' })}</h3>
                                                    <div className="grid gap-3">
                                                        {[
                                                            { id: 'it_sanitization', label: t({ en: 'Clean Keyboards & Monitors', fr: 'Nettoyer claviers & écrans', ar: 'تنظيف لوحات المفاتيح والشاشات' }), desc: t({ en: 'Wipe screens to kill germs', fr: 'Essuyer les écrans pour tuer les germes', ar: 'مسح الشاشات لقتل الجراثيم' }), icon: '💻' },
                                                            { id: 'glass_partitions', label: t({ en: 'Clean Glass Walls', fr: 'Nettoyer les parois vitrées', ar: 'تنظيف الجدران الزجاجية' }), desc: t({ en: 'Wash inside glass doors and walls', fr: 'Laver l\'intérieur des parois et vitres', ar: 'غسل الأبواب والجدران الزجاجية الداخلية' }), icon: '🪟' },
                                                            { id: 'post_event', label: t({ en: 'Big Party Cleanup', fr: 'Nettoyage après événement', ar: 'تنظيف بعد الحفلات الكبيرة' }), desc: t({ en: 'Deep cleaning after an office party', fr: 'Nettoyage complet après une fête', ar: 'تنظيف عميق بعد حفلة مكتبية' }), icon: '🎉' }
                                                        ].map((add) => (
                                                            <button
                                                                key={add.id}
                                                                onClick={() => {
                                                                    if (officeAddOns.includes(add.id)) setOfficeAddOns(prev => prev.filter(a => a !== add.id));
                                                                    else setOfficeAddOns(prev => [...prev, add.id]);
                                                                }}
                                                                className={`p-4 rounded-[12px] border-2 text-left transition-all flex items-center justify-between ${officeAddOns.includes(add.id) ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-white'}`}
                                                            >
                                                                <div className="flex gap-3">
                                                                    <div className="text-2xl">{add.icon}</div>
                                                                    <div>
                                                                        <span className="text-[15px] font-bold text-[#111827] block">{add.label}</span>
                                                                        <span className="text-[12px] font-medium text-black/50 block mt-0.5">{add.desc}</span>
                                                                    </div>
                                                                </div>
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${officeAddOns.includes(add.id) ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-200 bg-neutral-50'}`}>
                                                                    {officeAddOns.includes(add.id) && <Check size={14} className="text-white" strokeWidth={4} />}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Furniture Assembly Items */}
                                        {order.serviceType === 'furniture_assembly' && (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[20px] font-black text-[#111827] setup-heading">{t({ en: 'What are we assembling?', fr: 'Que devons-nous assembler ?', ar: 'ماذا سنقوم بتجميعه؟' })}</label>
                                                    <div className="px-3 py-1 bg-[#F0FDF9] rounded-[5px]">
                                                        <span className="text-[11px] font-black text-[#01A083] tracking-wider">{t({ en: 'Est.', fr: 'Est.', ar: 'تقدير' })} {Object.values(assemblyItems).reduce((sum, item) => sum + (item.quantity * item.estHours), 0).toFixed(1)} {t({ en: 'hrs', fr: 'h', ar: 'ساعات' })}</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3">
                                                    {[
                                                        { id: 'bed', name: t({ en: 'Bed Frame', fr: 'Cadre de lit', ar: 'إطار سرير' }), icon: '🛏️', estHours: 1.5 },
                                                        { id: 'desk', name: t({ en: 'Desk / Table', fr: 'Bureau / Table', ar: 'مكتب / طاولة' }), icon: '🖥️', estHours: 1.2 },
                                                        { id: 'dresser', name: t({ en: 'Dresser / Cabinet', fr: 'Commode / Armoire', ar: 'خزانة أدراج / كابينة' }), icon: '📦', estHours: 2.0 },
                                                        { id: 'bookshelf', name: t({ en: 'Bookshelf', fr: 'Bibliothèque', ar: 'خزانة كتب' }), icon: '📚', estHours: 0.8 },
                                                        { id: 'wardrobe', name: t({ en: 'Wardrobe', fr: 'Garde-robe', ar: 'خزانة ملابس' }), icon: '👗', estHours: 3.0 },
                                                        { id: 'other', name: t({ en: 'Other Item', fr: 'Autre objet', ar: 'غرض آخر' }), icon: '✨', estHours: 1.0 },
                                                    ].map((item) => (
                                                        <div key={item.id} className="bg-white p-5 rounded-[5px] border border-neutral-100 flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-2xl">{item.icon}</span>
                                                                <div>
                                                                    <p className="text-[15px] font-black text-[#111827]">{item.name}</p>
                                                                    <p className="text-[12px] font-bold text-black/40">~{item.estHours} {t({ en: 'hr per unit', fr: 'h par unité', ar: 'ساعة لكل وحدة' })}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 bg-neutral-50 p-2 rounded-[5px] border border-neutral-100">
                                                                <button
                                                                    onClick={() => {
                                                                        const current = assemblyItems[item.id]?.quantity || 0;
                                                                        if (current > 0) {
                                                                            setAssemblyItems({
                                                                                ...assemblyItems,
                                                                                [item.id]: { ...item, quantity: current - 1 }
                                                                            });
                                                                        }
                                                                    }}
                                                                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-black active:scale-90 transition-transform"
                                                                >–</button>
                                                                <span className="w-8 text-center font-black text-[15px] text-[#111827]">{assemblyItems[item.id]?.quantity || 0}</span>
                                                                <button
                                                                    onClick={() => {
                                                                        const current = assemblyItems[item.id]?.quantity || 0;
                                                                        setAssemblyItems({
                                                                            ...assemblyItems,
                                                                            [item.id]: { ...item, quantity: current + 1 }
                                                                        });
                                                                    }}
                                                                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-black active:scale-90 transition-transform"
                                                                >+</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* TV Mounting Specialized Sections */}
                                        {order.subServiceId === 'tv_mounting' && (
                                            <div className="space-y-12">
                                                {/* 2. How many TVs? */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[25px] font-bold text-[#111827] setup-heading">{t({ en: 'How many TVs do you need installed?*', fr: 'Combien de téléviseurs faut-il installer ?*', ar: 'كم عدد أجهزة التلفاز التي تحتاج لتركيبها؟*' })}</h3>
                                                    <div className="flex gap-3 overflow-x-auto py-4 px-1 no-scrollbar">
                                                        {[1, 2, 3, 4, 5].map((num) => (
                                                            <button
                                                                key={num}
                                                                onClick={() => setTvCount(num)}
                                                                className={`flex-shrink-0 w-16 h-16 flex items-center justify-center font-bold text-[22px] transition-all rounded-full ${tvCount === num ? 'bg-[#01A083] text-white scale-110' : 'bg-[#F9FAFB] text-neutral-400 border border-neutral-100'}`}
                                                            >
                                                                {num}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* 3. Lifting Help */}
                                                <div className="space-y-6">
                                                    <div>
                                                        <h3 className="text-[20px] font-bold text-[#111827] setup-heading">{t({ en: 'Lifting assistance*', fr: 'Aide à la manutention*', ar: 'المساعدة في الرفع*' })}</h3>
                                                        <p className="text-[13px] font-bold text-black/40 mt-1 italic">{t({ en: 'Larger TVs (60" +) may require a second person for safe mounting.', fr: 'Les grands téléviseurs (60" +) peuvent nécessiter une deuxième personne pour une installation sécurisée.', ar: 'أجهزة التلفاز الكبيرة (60 بوصة +) قد تتطلب شخصًا ثانيًا للتركيب الآمن.' })}</p>
                                                    </div>
                                                    <div className="grid gap-3">
                                                        {[
                                                            { id: 'yes', label: t({ en: 'Someone will be around', fr: 'Quelqu\'un sera sur place', ar: 'سيكون هناك شخص ما للمساعدة' }) },
                                                            { id: 'no_60', label: t({ en: 'No one. 1 or more TVs above 60"', fr: 'Personne. 1 ou plusieurs téléviseurs de plus de 60"', ar: 'لا يوجد أحد. جهاز تلفاز واحد أو أكثر أكبر من 60 بوصة' }) },
                                                            { id: 'not_needed', label: t({ en: 'Not needed. No TVs above 60"', fr: 'Non nécessaire. Aucun téléviseur de plus de 60"', ar: 'غير مطلوب. لا توجد أجهزة تلفاز أكبر من 60 بوصة' }) },
                                                            { id: 'unsure', label: t({ en: 'Unsure if needed', fr: 'Pas certain du besoin', ar: 'غير متأكد إذا كان الأمر مطلوباً' }) }
                                                        ].map((opt) => (
                                                            <button
                                                                key={opt.id}
                                                                onClick={() => setLiftingHelp(opt.id)}
                                                                className={`p-5 rounded-[5px] border-2 text-left transition-all flex items-center justify-between ${liftingHelp === opt.id ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                            >
                                                                <span className="text-[16px] font-bold text-[#111827]">{opt.label}</span>
                                                                {liftingHelp === opt.id && <Check size={20} className="text-[#01A083]" strokeWidth={3} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* 4. Mount Type */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-bold text-[#111827] setup-heading">{t({ en: 'What type of TV mount?*', fr: 'Quel type de support TV ?*', ar: 'ما هو نوع حامل التلفاز؟*' })}</h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            t({ en: 'Fixed / low profile', fr: 'Fixe / profil bas', ar: 'ثابت / مظهر جانبي منخفض' }),
                                                            t({ en: 'Tilting', fr: 'Inclinable', ar: 'قابل للإمالة' }),
                                                            t({ en: 'Articulating / full motion', fr: 'Articulé / mouvement complet', ar: 'مفصلي / حركة كاملة' }),
                                                            t({ en: 'Other / Not sure', fr: 'Autre / Pas sûr', ar: 'أخرى / غير متأكد' })
                                                        ].map((type) => (
                                                            <button
                                                                key={type}
                                                                onClick={() => {
                                                                    if (mountTypes.includes(type)) {
                                                                        setMountTypes(prev => prev.filter(t => t !== type));
                                                                    } else {
                                                                        setMountTypes(prev => [...prev, type]);
                                                                    }
                                                                }}
                                                                className={`px-6 py-3 rounded-full border-2 font-bold text-[13px] transition-all flex items-center gap-2 ${mountTypes.includes(type) ? 'border-[#01A083] bg-[#F0FDF9] text-[#01A083]' : 'border-neutral-100 text-black'}`}
                                                            >
                                                                {type}
                                                                {mountTypes.includes(type) && <Check size={14} strokeWidth={4} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* 5. Wall Material */}
                                                <div className="space-y-6">
                                                    <div>
                                                        <h3 className="text-[20px] font-bold text-[#111827] setup-heading">{t({ en: 'Wall material?*', fr: 'Matériau du mur ?*', ar: 'مادة الجدار؟*' })}</h3>
                                                        <p className="text-[13px] font-black text-black/50 mt-1 leading-relaxed">
                                                            {t({ en: 'Test by knocking: Hollow sound = drywall/wood. No echo = brick/concrete.', fr: 'Testez en frappant : Son creux = cloison/bois. Pas d\'écho = brique/béton.', ar: 'اختبر بالنقر: صوت أجوف = جدار جاف/خشب. لا يوجد صدى = طوب/خرسانة.' })}
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {[
                                                            t({ en: 'Drywall, plaster, or wood', fr: 'Placoplâtre, plâtre ou bois', ar: 'جدار جاف، جص، أو خشب' }),
                                                            t({ en: 'Brick or concrete', fr: 'Brique ou béton', ar: 'طوب أو خرسانة' }),
                                                            t({ en: 'Metal', fr: 'Métal', ar: 'معدن' }),
                                                            t({ en: 'Other / not sure', fr: 'Autre / pas sûr', ar: 'أخرى / غير متأكد' })
                                                        ].map((mat) => (
                                                            <button
                                                                key={mat}
                                                                onClick={() => setWallMaterial(mat)}
                                                                className={`p-4 rounded-[5px] border-2 text-left transition-all ${wallMaterial === mat ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                            >
                                                                <span className="text-[14px] font-bold text-[#111827]">{mat}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Divider / Call to Action */}
                                                <div className="py-4 border-y border-neutral-100 text-center space-y-2">
                                                    <p className="text-[15px] font-black text-black">{t({ en: 'Help Taskers Say “Yes” Faster', fr: 'Aidez les Taskeurs à dire "Oui" plus vite', ar: 'ساعد الحرفيين على الرد "بنعم" بشكل أسرع' })}</p>
                                                    <p className="text-[12px] font-bold text-black/40">{t({ en: 'A little extra detail now means quicker task acceptance.', fr: 'Un peu plus de détails maintenant signifie une acceptation plus rapide.', ar: 'القليل من التفاصيل الإضافية الآن تعني قبولاً أسرع للمهمة.' })}</p>
                                                </div>

                                                {/* 6. Add-ons */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-bold text-[#111827] setup-heading">{t({ en: 'Add-on services?', fr: 'Services complémentaires ?', ar: 'خدمات إضافية؟' })}</h3>
                                                    <div className="grid gap-3">
                                                        {[
                                                            { id: 'wires', label: t({ en: 'Hide wires behind the wall', fr: 'Cacher les câbles derrière le mur', ar: 'إخفاء الأسلاك خلف الجدار' }) },
                                                            { id: 'audio', label: t({ en: 'Install speakers or soundbars', fr: 'Installer enceintes ou barres de son', ar: 'تركيب مكبرات صوت أو أشرطة صوتية' }) },
                                                            { id: 'setup', label: t({ en: 'Device & accessory setup', fr: 'Configuration appareil & accessoires', ar: 'إعداد الأجهزة والملحقات' }) }
                                                        ].map((add) => (
                                                            <button
                                                                key={add.id}
                                                                onClick={() => {
                                                                    if (mountingAddOns.includes(add.id)) {
                                                                        setMountingAddOns(prev => prev.filter(a => a !== add.id));
                                                                    } else {
                                                                        setMountingAddOns(prev => [...prev, add.id]);
                                                                    }
                                                                }}
                                                                className={`p-5 rounded-[5px] border-2 text-left transition-all flex items-center justify-between ${mountingAddOns.includes(add.id) ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                            >
                                                                <span className="text-[16px] font-bold text-[#111827]">{add.label}</span>
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${mountingAddOns.includes(add.id) ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-300'}`}>
                                                                    {mountingAddOns.includes(add.id) && <Check size={14} className="text-white" strokeWidth={4} />}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Dish Cleaning Specialized Section */}
                                        {order.subServiceId === 'dish_cleaning' && (
                                            <div className="space-y-10">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-[20px] font-black text-[#111827]">{t({ en: 'Dish Cleaning', fr: 'Lavage de vaisselle', ar: 'غسل الصحون' })}</h3>
                                                </div>

                                                {/* Task Size Selector */}
                                                <div className="space-y-6">
                                                    <p className="text-[18px] font-black text-[#111827]">{t({ en: 'What scale is the load?', fr: 'Quelle est la taille de la charge ?', ar: 'ما هو حجم العمل؟' })}</p>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { id: 'small', label: t({ en: 'Quick Wash', fr: 'Lavage rapide' }), desc: t({ en: '1-2 meals approx. (1 hr)', fr: '1-2 repas environ (1 h)' }), hours: 1 },
                                                            { id: 'medium', label: t({ en: 'Family Dinner / Iftar', fr: 'Dîner de famille / Iftar' }), desc: t({ en: 'Standard family load (2 hrs)', fr: 'Charge familiale standard (2 h)' }), hours: 2 },
                                                            { id: 'large', label: t({ en: 'Event / Party', fr: 'Événement / Fête' }), desc: t({ en: 'Large reception (4 hrs)', fr: 'Grande réception (4 h)' }), hours: 4 },
                                                        ].map((size) => (
                                                            <button
                                                                key={size.id}
                                                                onClick={() => setTaskDuration(size.hours)}
                                                                className={`p-5 rounded-[20px] border-2 text-left transition-all flex items-center justify-between ${taskDuration === size.hours ? 'border-[#01A083] bg-[#F1FEF4]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                            >
                                                                <div>
                                                                    <span className="text-[16px] font-black text-[#111827]">{size.label}</span>
                                                                    <p className="text-[13px] font-medium text-black/40 mt-1">{size.desc}</p>
                                                                </div>
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${taskDuration === size.hours ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-300'}`}>
                                                                    {taskDuration === size.hours && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Optional Supplies */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[18px] font-black text-[#111827]">{t({ en: 'Bricoler Supplies', fr: 'Fournitures du Bricoler', ar: 'معدات البريكولور' })}</h3>
                                                    <p className="text-[13px] font-bold text-black/40 -mt-4 italic">{t({ en: 'Does the Bricoler need to bring their own dish soap and sponges?', fr: 'Le bricoler doit-il apporter son propre liquide vaisselle et ses éponges ?', ar: 'هل يحتاج البريكولور إلى إحضار سائل غسيل الصحون والإسفنج الخاص به؟' })}</p>
                                                    <div className="grid gap-3">
                                                        <button
                                                            onClick={() => {
                                                                if (mountingAddOns.includes('supplies')) {
                                                                    setMountingAddOns(prev => prev.filter(a => a !== 'supplies'));
                                                                } else {
                                                                    setMountingAddOns(prev => [...prev, 'supplies']);
                                                                }
                                                            }}
                                                            className={`p-5 rounded-[5px] border-2 text-left transition-all flex items-center justify-between ${mountingAddOns.includes('supplies') ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                        >
                                                            <span className="text-[16px] font-bold text-[#111827]">{t({ en: 'Yes, bring supplies (+15 MAD)', fr: 'Oui, apporter les fournitures (+15 MAD)', ar: 'نعم، أحضر المعدات (+15 درهم)' })}</span>
                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${mountingAddOns.includes('supplies') ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-300'}`}>
                                                                {mountingAddOns.includes('supplies') && <Check size={14} className="text-white" strokeWidth={4} />}
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Glass Cleaning Specialized Section */}
                                        {(order.subServiceId === 'residential_glass' || order.subServiceId === 'commercial_glass') && (
                                            <div className="space-y-12">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-[25px] font-bold text-[#111827]">{order.subServiceId === 'residential_glass' ? t({ en: 'Home Glass Cleaning', fr: 'Vitres Résidentielles', ar: 'تنظيف زجاج مـنزلي' }) : t({ en: 'Business Frontage', fr: 'Vitrines Commerciales', ar: 'واجهات تجارية' })}</h3>
                                                </div>

                                                {/* Glass Cleaning: Window Count */}
                                                <div className="space-y-6">
                                                    <label className="text-[20px] font-bold text-[#111827]">{t({ en: 'How many windows?', fr: 'Combien de fenêtres ?', ar: 'كم عدد النوافذ؟' })}</label>
                                                    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 no-scrollbar -mx-6 px-6 snap-x snap-mandatory">
                                                        {[5, 10, 15, 20, 25, 30, 40, 50].map((num) => (
                                                            <motion.button
                                                                key={`win-${num}`}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => setWindowCount(num)}
                                                                className={`flex-shrink-0 w-16 h-16 flex items-center justify-center font-bold text-[22px] transition-all snap-center relative ${windowCount === num ? 'bg-[#01A083] text-white scale-110 z-10 rounded-full shadow-lg shadow-[#01A083]/20' : 'bg-[#F9FAFB] text-neutral-400 border border-neutral-100 rounded-full'}`}
                                                            >
                                                                {num}
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Window Size Section */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-bold text-[#111827]">{t({ en: 'The size of majority of windows', fr: 'La taille de la majorité des fenêtres' })}</h3>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {[
                                                            { id: 'small', label: t({ en: 'Small', fr: 'Petit' }), icon: '🪟' },
                                                            { id: 'medium', label: t({ en: 'Medium', fr: 'Moyen' }), icon: '🖼️' },
                                                            { id: 'large', label: t({ en: 'Large', fr: 'Grand' }), icon: '🏢' },
                                                        ].map((size) => (
                                                            <button
                                                                key={size.id}
                                                                onClick={() => setWindowSize(size.id as any)}
                                                                className={`flex flex-col items-center gap-3 p-4 rounded-[12px] border-2 transition-all ${windowSize === size.id ? 'border-[#01A083] bg-[#F0FDF9] text-[#01A083]' : 'border-neutral-100 bg-white'}`}
                                                            >
                                                                <span className="text-2xl">{size.icon}</span>
                                                                <span className="text-[13px] font-black">{size.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Story Selector */}
                                                <div className="space-y-6">
                                                    <div className="flex flex-col px-1">
                                                        <label className="text-[20px] font-bold text-[#111827]">{t({ en: 'How much stories of building you want to clean the glass for?', fr: 'Combien d\'étages souhaitez-vous nettoyer ?' })}</label>
                                                    </div>
                                                    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 no-scrollbar -mx-6 px-6 snap-x snap-mandatory">
                                                        {[1, 2, 3, 4, 5].map((num) => (
                                                            <motion.button
                                                                key={`story-${num}`}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => setBuildingStories(num)}
                                                                className={`flex-shrink-0 w-16 h-16 flex items-center justify-center font-medium text-[22px] transition-all snap-center relative ${buildingStories === num ? 'bg-[#111827] text-white scale-110 z-10 rounded-full shadow-lg' : 'bg-[#F9FAFB] text-neutral-400 border border-neutral-100 rounded-full'}`}
                                                            >
                                                                {num}
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Common: Coverage Type */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-bold text-[#111827]">{t({ en: 'Coverage', fr: 'Couverture', ar: 'نطاق الخدمة' })}</h3>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {[
                                                            { id: 'interior', label: t({ en: 'Interior', fr: 'Intérieur' }), icon: '🏠' },
                                                            { id: 'exterior', label: t({ en: 'Exterior', fr: 'Extérieur' }), icon: '🌤️' },
                                                            { id: 'both', label: t({ en: 'Both Sides', fr: 'Les deux' }), icon: '✨' },
                                                        ].map((type) => (
                                                            <button
                                                                key={type.id}
                                                                onClick={() => setGlassCleaningType(type.id as any)}
                                                                className={`flex flex-col items-center gap-3 p-4 rounded-[12px] border-2 transition-all ${glassCleaningType === type.id ? 'border-[#01A083] bg-[#F0FDF9] text-[#01A083]' : 'border-neutral-100 bg-white'}`}
                                                            >
                                                                <span className="text-2xl">{type.icon}</span>
                                                                <span className="text-[13px] font-black">{type.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Common: Accessibility */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-bold text-[#111827]">{t({ en: 'Accessibility', fr: 'Accessibilité', ar: 'سهولة الوصول' })}</h3>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button
                                                            onClick={() => setGlassAccessibility('easy')}
                                                            className={`p-5 rounded-[12px] border-2 text-left transition-all flex items-center gap-4 ${glassAccessibility === 'easy' ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-white shadow-sm'}`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${glassAccessibility === 'easy' ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-200'}`}>
                                                                {glassAccessibility === 'easy' && <Check size={16} className="text-white" strokeWidth={4} />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[15px] font-black text-[#111827]">{t({ en: 'Ground Level', fr: 'Rez-de-chaussée' })}</span>
                                                                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Safe / Easy', fr: 'Simple' })}</span>
                                                            </div>
                                                        </button>
                                                        <button
                                                            onClick={() => setGlassAccessibility('ladder')}
                                                            className={`p-5 rounded-[12px] border-2 text-left transition-all flex items-center gap-4 ${glassAccessibility === 'ladder' ? 'border-[#FBBF24] bg-[#FFFBEB]' : 'border-neutral-100 bg-white shadow-sm'}`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${glassAccessibility === 'ladder' ? 'bg-[#FBBF24] border-[#FBBF24]' : 'border-neutral-200'}`}>
                                                                {glassAccessibility === 'ladder' && <Check size={16} className="text-white" strokeWidth={4} />}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[15px] font-black text-[#92400E]">{t({ en: 'Ladder Needed', fr: 'Échelle Requise' })}</span>
                                                                <span className="text-[11px] font-bold text-[#D97706]/60 uppercase tracking-wider">{t({ en: 'Height / Hard', fr: 'Hauteur' })}</span>
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Professional Guarantee Tip */}
                                                <div className="bg-blue-50/50 p-6 rounded-[15px] border border-blue-100/50 flex items-start gap-4">
                                                    <div className="p-3 bg-white rounded-[12px] shadow-sm text-blue-500">
                                                        <ShieldCheck size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[15px] font-black text-blue-900">{t({ en: 'Streak-Free Guarantee', fr: 'Garantie sans traces' })}</p>
                                                        <p className="text-[13px] font-medium text-blue-700/70 leading-relaxed mt-1">{t({ en: 'Equipped Bricolers use professional squeegees and distilled formulas for a crystal-clear finish.', fr: 'Les Bricoleurs utilisent des raclettes professionnelles pour une finition parfaite.' })}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Home Repairs & Plumbing Specialized Sections */}
                                        {(order.serviceType === 'home_repairs' || order.serviceType === 'plumbing') && (
                                            <div className="space-y-10">
                                                {/* Header for Sub-service */}
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-[20px] font-black text-[#111827]">
                                                        {SERVICES_HIERARCHY[order.serviceType as keyof typeof SERVICES_HIERARCHY]?.subServices.find(s => s.id === order.subServiceId)?.name || 'Task details'}
                                                    </h3>
                                                </div>

                                                {/* Task Size Selector */}
                                                <div className="space-y-6">
                                                    <p className="text-[18px] font-black text-[#111827]">{t({ en: 'How big is your task?', fr: 'Quelle est la taille de votre tâche ?', ar: 'ما هي مساحة عملك؟' })}</p>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { id: 'small', label: t({ en: 'Small', fr: 'Petit', ar: 'صغير' }), desc: t({ en: 'Est. 1 hr', fr: 'Est. 1 h', ar: 'تقدير ساعة واحدة' }), hours: 1 },
                                                            { id: 'medium', label: t({ en: 'Medium', fr: 'Moyen', ar: 'متوسط' }), desc: t({ en: 'Est. 2-3 hrs', fr: 'Est. 2-3 h', ar: 'تقدير 2-3 ساعات' }), hours: 2.5 },
                                                            { id: 'large', label: t({ en: 'Large', fr: 'Grand', ar: 'كبير' }), desc: t({ en: 'Est. 4+ hrs', fr: 'Est. 4+ h', ar: 'تقدير +4 ساعات' }), hours: 4 },
                                                        ].map((size) => (
                                                            <button
                                                                key={size.id}
                                                                onClick={() => setTaskDuration(size.hours)}
                                                                className={`p-5 rounded-[5px] border-2 text-left transition-all flex items-center justify-between ${taskDuration === size.hours ? 'border-[#01A083] bg-[#F1FEF4]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                            >
                                                                <div>
                                                                    <p className="text-[17px] font-bold text-[#111827]">{size.label}</p>
                                                                    <p className="text-[13px] font-medium text-[#6B7280]">{size.desc}</p>
                                                                </div>
                                                                {taskDuration === size.hours && <Check size={20} className="text-[#01A083]" strokeWidth={3} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Gardening Specialized Section: Lawn Mowing */}
                                        {order.subServiceId === 'lawn_mowing' && (
                                            <div className="space-y-12">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-[25px] font-bold text-[#111827]">{t({ en: 'Lawn Mowing', fr: 'Tonte de Pelouse', ar: 'قص العشب' })}</h3>
                                                </div>

                                                {/* Garden Size Selector */}
                                                <div className="space-y-6">
                                                    <label className="text-[20px] font-medium text-[#111827] block pb-2">{t({ en: 'How big is your garden?', fr: 'Quelle est la taille de votre jardin ?', ar: 'ما هي مساحة حديقتك؟' })}</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {[
                                                            { id: 'small', label: t({ en: 'Small', fr: 'Petit' }), desc: '< 50m²', icon: '🏡' },
                                                            { id: 'medium', label: t({ en: 'Medium', fr: 'Moyen' }), desc: '50-150m²', icon: '🏠' },
                                                            { id: 'large', label: t({ en: 'Large', fr: 'Grand' }), desc: '150-300m²', icon: '🏰' },
                                                            { id: 'estate', label: t({ en: 'Estate', fr: 'Propriété' }), desc: '> 300m²', icon: '🌳' },
                                                        ].map((size) => (
                                                            <button
                                                                key={size.id}
                                                                onClick={() => setGardenSize(size.id as any)}
                                                                className={`flex flex-col items-center gap-2 p-5 rounded-[12px] border-2 transition-all text-center ${gardenSize === size.id ? 'border-[#01A083] bg-[#F0FDF9] text-[#01A083]' : 'border-neutral-100 bg-white shadow-sm'}`}
                                                            >
                                                                <span className="text-3xl">{size.icon}</span>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[15px] font-black">{size.label}</span>
                                                                    <span className="text-[12px] font-bold text-neutral-400 opacity-60">{size.desc}</span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Lawn Condition Selector */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-bold text-[#111827] pb-2">{t({ en: 'Current Grass Condition', fr: 'État actuel de l\'herbe', ar: 'حالة العشب الحالية' })}</h3>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { id: 'standard', label: t({ en: 'Regularly Maintained', fr: 'Entretien régulier' }), desc: t({ en: 'Standard cut', fr: 'Coupe standard' }), icon: '✨' },
                                                            { id: 'wild', label: t({ en: 'Wild / Tall Grass', fr: 'Herbe haute' }), desc: t({ en: 'Needs extra effort', fr: 'Nécessite plus d\'effort' }), icon: '🌾' },
                                                            { id: 'overgrown', label: t({ en: 'Overgrown / Wild', fr: 'Jungle / Très haute' }), desc: t({ en: 'Needs heavy work', fr: 'Travail intensif' }), icon: '🎋' },
                                                        ].map((cond) => (
                                                            <button
                                                                key={cond.id}
                                                                onClick={() => setLawnCondition(cond.id as any)}
                                                                className={`p-5 rounded-[12px] border-2 text-left transition-all flex items-center gap-4 ${lawnCondition === cond.id ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-white'}`}
                                                            >
                                                                <span className="text-2xl">{cond.icon}</span>
                                                                <div className="flex-1">
                                                                    <p className="text-[16px] font-black">{cond.label}</p>
                                                                    <p className="text-[12px] font-medium text-neutral-400">{cond.desc}</p>
                                                                </div>
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${lawnCondition === cond.id ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-200'}`}>
                                                                    {lawnCondition === cond.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Equipment Check */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-bold text-[#111827]">{t({ en: 'Equipment Needed?', fr: 'Matériel nécessaire ?', ar: 'هل تحتاج للمعدات؟' })}</h3>
                                                    <button
                                                        onClick={() => setNeedsMower(!needsMower)}
                                                        className={`w-full p-6 rounded-[12px] border-2 text-left transition-all flex items-center gap-6 ${needsMower ? 'border-[#01A083] bg-[#F1FEF4]' : 'border-neutral-100 bg-white'}`}
                                                    >
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all ${needsMower ? 'bg-[#01A083]/10 scale-110' : 'bg-neutral-50'}`}>
                                                            🚜
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-[17px] font-black text-[#111827]">{t({ en: 'Bricoler brings a mower', fr: 'Le Bricoleur apporte une tondeuse', ar: 'البريكولور يحضر جزازة' })}</p>
                                                            <p className="text-[13px] font-bold text-[#6B7280] mt-0.5">{t({ en: 'Add +50 MAD for equipment rental/transport', fr: 'Ajoutez +50 MAD pour la location/transport', ar: 'إضافة +50 درهم لتأجير/نقل المعدات' })}</p>
                                                        </div>
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${needsMower ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-300'}`}>
                                                            {needsMower && <Check size={14} className="text-white" strokeWidth={4} />}
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Gardening Specialized Section: Tree Trimming */}
                                        {order.subServiceId === 'branch_hedge_trimming' && (
                                            <div className="space-y-12">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-[25px] font-bold text-[#111827]">{t({ en: 'Branch & Hedge Trimming', fr: 'Taille d\'Arbres', ar: 'تقليم الأشجار' })}</h3>
                                                </div>

                                                {/* Tree Count Selector */}
                                                <div className="space-y-6">
                                                    <label className="text-[20px] font-medium text-[#111827] block pb-2">{t({ en: 'How many trees?', fr: 'Combien d\'arbres ?', ar: 'كم عدد الأشجار؟' })}</label>
                                                    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 no-scrollbar -mx-6 px-6 snap-x snap-mandatory">
                                                        {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                                                            <motion.button
                                                                key={`tree-${num}`}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => setTreeCount(num)}
                                                                className={`flex-shrink-0 w-16 h-16 flex items-center justify-center font-bold text-[22px] transition-all snap-center relative ${treeCount === num ? 'bg-[#01A083] text-white scale-110 z-10 rounded-full shadow-lg' : 'bg-[#F9FAFB] text-neutral-400 border border-neutral-100 rounded-full'}`}
                                                            >
                                                                {num}
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Tree Height Selector */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-bold text-[#111827] pb-2">{t({ en: 'Average Tree Height', fr: 'Hauteur moyenne des arbres', ar: 'متوسط ارتفاع الأشجار' })}</h3>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {[
                                                            { id: 'small', label: t({ en: 'Small', fr: 'Petit' }), desc: '< 3m', icon: '🌳' },
                                                            { id: 'medium', label: t({ en: 'Medium', fr: 'Moyen' }), desc: '3-7m', icon: '🌲' },
                                                            { id: 'large', label: t({ en: 'Large', fr: 'Grand' }), desc: '7-12m', icon: '🌴' },
                                                            { id: 'giant', label: t({ en: 'Giant', fr: 'Géant' }), desc: '> 12m', icon: '🏰' },
                                                        ].map((size) => (
                                                            <button
                                                                key={size.id}
                                                                onClick={() => setTreeHeight(size.id as any)}
                                                                className={`flex flex-col items-center gap-2 p-5 rounded-[12px] border-2 transition-all text-center ${treeHeight === size.id ? 'border-[#01A083] bg-[#F0FDF9] text-[#01A083]' : 'border-neutral-100 bg-white shadow-sm'}`}
                                                            >
                                                                <span className="text-3xl">{size.icon}</span>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[15px] font-black">{size.label}</span>
                                                                    <span className="text-[12px] font-bold text-neutral-400 opacity-60">{size.desc}</span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Trimming Type Selector */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-bold text-[#111827] pb-2">{t({ en: 'Preferred Service', fr: 'Service souhaité', ar: 'الخدمة المفضلة' })}</h3>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { id: 'shaping', label: t({ en: 'Shaping & Design', fr: 'Taille & Design' }), desc: t({ en: 'For aesthetic looks', fr: 'Pour l\'aspect esthétique' }), icon: '✂️' },
                                                            { id: 'thinning', label: t({ en: 'Thinning / Health', fr: 'Éclaircissage / Santé' }), desc: t({ en: 'Improve light & air flow', fr: 'Améliorer l\'air et la lumière' }), icon: '🍃' },
                                                            { id: 'deadwood', label: t({ en: 'Deadwood / Safety', fr: 'Bois mort / Sécurité' }), desc: t({ en: 'Remove old/risky branches', fr: 'Enlever branches mortes' }), icon: '⚠️' },
                                                            { id: 'removal', label: t({ en: 'Complete Removal', fr: 'Abattage complet' }), desc: t({ en: 'Cutting tree to ground', fr: 'Coupe au sol' }), icon: '🪓' },
                                                        ].map((type) => (
                                                            <button
                                                                key={type.id}
                                                                onClick={() => setTrimmingType(type.id as any)}
                                                                className={`p-5 rounded-[12px] border-2 text-left transition-all flex items-center gap-4 ${trimmingType === type.id ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-white'}`}
                                                            >
                                                                <span className="text-2xl">{type.icon}</span>
                                                                <div className="flex-1">
                                                                    <p className="text-[16px] font-black">{type.label}</p>
                                                                    <p className="text-[12px] font-medium text-neutral-400">{type.desc}</p>
                                                                </div>
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${trimmingType === type.id ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-300'}`}>
                                                                    {trimmingType === type.id && <Check size={14} className="text-white" strokeWidth={4} />}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Waste Removal Toggle */}
                                                <div className="space-y-4">
                                                    <label className="text-[20px] font-medium text-[#111827] block pb-2">{t({ en: 'Waste Removal', fr: 'Évacuation des déchets', ar: 'إزالة النفايات' })}</label>
                                                    <button
                                                        onClick={() => setIncludeWasteRemoval(!includeWasteRemoval)}
                                                        className={`w-full p-5 rounded-[12px] border-2 text-left transition-all flex items-center justify-between ${includeWasteRemoval ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-white'}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-2xl">🚛</span>
                                                            <div className="flex flex-col">
                                                                <span className="text-[16px] font-black text-[#111827]">{t({ en: 'Include Disposal', fr: 'Inclure l\'évacuation' })}</span>
                                                                <span className="text-[12px] font-medium text-neutral-400">{t({ en: 'Courier takes branches away', fr: 'Le coursier emporte les branches' })}</span>
                                                            </div>
                                                        </div>
                                                        <div className={`w-12 h-6 rounded-full transition-all relative ${includeWasteRemoval ? 'bg-[#01A083]' : 'bg-neutral-200'}`}>
                                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${includeWasteRemoval ? 'left-7' : 'left-1'}`} />
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Gardening Specialized Section: Planting & Landscaping */}
                                        {order.subServiceId === 'planting' && (
                                            <div className="space-y-12">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-[25px] font-bold text-[#111827]">{t({ en: 'Planting & Landscaping', fr: 'Plantation & Paysagisme', ar: 'زراعة وتنسيق حدائق' })}</h3>
                                                </div>

                                                {/* Area Size */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-bold text-[#111827] pb-2">{t({ en: 'Area Size', fr: 'Taille de la zone', ar: 'حجم المنطقة' })}</h3>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {[
                                                            { id: 'small', label: t({ en: 'Balcony / Pots', fr: 'Balcon / Pots' }), desc: '< 5m²', icon: '🌱' },
                                                            { id: 'medium', label: t({ en: 'Small Patch', fr: 'Petit lopin' }), desc: '< 30m²', icon: '🪴' },
                                                            { id: 'large', label: t({ en: 'Standard Garden', fr: 'Jardin standard' }), desc: '30-100m²', icon: '🏡' },
                                                            { id: 'giant', label: t({ en: 'Full Estate', fr: 'Grand domaine' }), desc: '> 100m²', icon: '🏰' },
                                                        ].map((size) => (
                                                            <button
                                                                key={size.id}
                                                                onClick={() => setPlantingSize(size.id as any)}
                                                                className={`flex flex-col items-center gap-2 p-5 rounded-[12px] border-2 transition-all text-center ${plantingSize === size.id ? 'border-[#01A083] bg-[#F0FDF9] text-[#01A083]' : 'border-neutral-100 bg-white shadow-sm'}`}
                                                            >
                                                                <span className="text-3xl">{size.icon}</span>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[15px] font-black">{size.label}</span>
                                                                    <span className="text-[12px] font-bold text-neutral-400 opacity-60">{size.desc}</span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Project Focus */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-bold text-[#111827] pb-2">{t({ en: 'Project Focus', fr: 'Type de projet', ar: 'نوع المشروع' })}</h3>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { id: 'seeding', label: t({ en: 'Planting / Seeding', fr: 'Plantation / Semis' }), desc: t({ en: 'Flowers, trees, seeds', fr: 'Fleurs, arbres, graines' }), icon: '🌸' },
                                                            { id: 'sod', label: t({ en: 'Laying Sod / Turf', fr: 'Pose de gazon' }), desc: t({ en: 'Instant grass rolls', fr: 'Rouleaux de gazon' }), icon: '🟩' },
                                                            { id: 'soil', label: t({ en: 'Soil Prep / Mulching', fr: 'Préparation du sol' }), desc: t({ en: 'Tilling, soil, mulch', fr: 'Terreau, paillis' }), icon: '⛏️' },
                                                            { id: 'hardscape', label: t({ en: 'Decorative (Stones)', fr: 'Décoratif (Pierres)' }), desc: t({ en: 'Pebbles, borders', fr: 'Cailloux, bordures' }), icon: '🪨' },
                                                        ].map((type) => (
                                                            <button
                                                                key={type.id}
                                                                onClick={() => setPlantingFocus(type.id as any)}
                                                                className={`p-5 rounded-[12px] border-2 text-left transition-all flex items-center gap-4 ${plantingFocus === type.id ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-white'}`}
                                                            >
                                                                <span className="text-2xl">{type.icon}</span>
                                                                <div className="flex-1">
                                                                    <p className="text-[16px] font-black">{type.label}</p>
                                                                    <p className="text-[12px] font-medium text-neutral-400">{type.desc}</p>
                                                                </div>
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${plantingFocus === type.id ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-300'}`}>
                                                                    {plantingFocus === type.id && <Check size={14} className="text-white" strokeWidth={4} />}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Current State */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-bold text-[#111827] pb-2">{t({ en: 'Current State', fr: 'État actuel', ar: 'الحالة الحالية' })}</h3>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { id: 'clean', label: t({ en: 'Ready to Plant', fr: 'Prêt à planter' }), desc: t({ en: 'Clean soil, ready to go', fr: 'Terre propre' }), icon: '✨' },
                                                            { id: 'clearing', label: t({ en: 'Needs Clearing First', fr: 'Nécessite un nettoyage' }), desc: t({ en: 'Overgrown, weeds', fr: 'Mauvaises herbes' }), icon: '🌿' },
                                                        ].map((type) => (
                                                            <button
                                                                key={type.id}
                                                                onClick={() => setPlantingState(type.id as any)}
                                                                className={`p-5 rounded-[12px] border-2 text-left transition-all flex items-center gap-4 ${plantingState === type.id ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-white'}`}
                                                            >
                                                                <span className="text-2xl">{type.icon}</span>
                                                                <div className="flex-1">
                                                                    <p className="text-[16px] font-black">{type.label}</p>
                                                                    <p className="text-[12px] font-medium text-neutral-400">{type.desc}</p>
                                                                </div>
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${plantingState === type.id ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-300'}`}>
                                                                    {plantingState === type.id && <Check size={14} className="text-white" strokeWidth={4} />}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Materials Provider */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[20px] font-bold text-[#111827] pb-2">{t({ en: 'Materials Source', fr: 'Fourniture du matériel', ar: 'مصدر المواد' })}</h3>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { id: 'client', label: t({ en: 'I have them ready', fr: 'J\'ai déjà tout' }), desc: t({ en: 'Standard labor cost only', fr: 'Coût main d\'œuvre uniquement' }), icon: '✅' },
                                                            { id: 'bricoler', label: t({ en: 'Please buy them', fr: 'Achetez-les pour moi' }), desc: t({ en: 'Bricoler will consult & bring receipt', fr: 'Consultation & ticket de caisse' }), icon: '🛒' },
                                                        ].map((type) => (
                                                            <button
                                                                key={type.id}
                                                                onClick={() => setMaterialSource(type.id as any)}
                                                                className={`p-5 rounded-[12px] border-2 text-left transition-all flex items-center gap-4 ${materialSource === type.id ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-white'}`}
                                                            >
                                                                <span className="text-2xl">{type.icon}</span>
                                                                <div className="flex-1">
                                                                    <p className="text-[16px] font-black">{type.label}</p>
                                                                    <p className="text-[12px] font-medium text-neutral-400">{type.desc}</p>
                                                                </div>
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${materialSource === type.id ? 'bg-[#01A083] border-[#01A083]' : 'border-neutral-300'}`}>
                                                                    {materialSource === type.id && <Check size={14} className="text-white" strokeWidth={4} />}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Waste Removal Toggle */}
                                                <div className="space-y-4">
                                                    <label className="text-[20px] font-medium text-[#111827] block pb-2">{t({ en: 'Waste Removal', fr: 'Évacuation des déchets', ar: 'إزالة النفايات' })}</label>
                                                    <button
                                                        onClick={() => setPlantingWasteRemoval(!plantingWasteRemoval)}
                                                        className={`w-full p-5 rounded-[12px] border-2 text-left transition-all flex items-center justify-between ${plantingWasteRemoval ? 'border-[#01A083] bg-[#F0FDF9]' : 'border-neutral-100 bg-white'}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-2xl">🚛</span>
                                                            <div className="flex flex-col">
                                                                <span className="text-[16px] font-black text-[#111827]">{t({ en: 'Include Disposal', fr: 'Inclure l\'évacuation' })}</span>
                                                                <span className="text-[12px] font-medium text-neutral-400">{t({ en: 'Courier takes away dirt/plants', fr: 'Enlèvement terre/plantes' })}</span>
                                                            </div>
                                                        </div>
                                                        <div className={`w-12 h-6 rounded-full transition-all relative ${plantingWasteRemoval ? 'bg-[#01A083]' : 'bg-neutral-200'}`}>
                                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${plantingWasteRemoval ? 'left-7' : 'left-1'}`} />
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Photo Uploads */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between ">
                                                <label className="text-[20px]  font-medium text-[#111827] setup-heading">
                                                    {order.subServiceId?.toLowerCase().includes('tv') ? t({ en: 'Wall & Area Photos', fr: 'Photos du mur & zone', ar: 'صور الجدار والمنطقة' }) :
                                                        order.serviceType === 'mounting' ? t({ en: 'Task Area Photos', fr: 'Photos de la zone', ar: 'صور منطقة المهمة' }) :
                                                            order.serviceType === 'moving' ? t({ en: 'Inventory Photos', fr: 'Photos de l\'inventaire', ar: 'صور الجرد' }) :
                                                                order.serviceType === 'cleaning' ? t({ en: 'Room Photos', fr: 'Photos des pièces', ar: 'صور الغرف' }) :
                                                                    t({ en: 'Include Photos', fr: 'Inclure des photos', ar: 'إضافة صور' })}
                                                </label>
                                                <span className="text-[12px] font-medium text-[#9CA3AF] tracking-wider">{photos.length}/6</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                {photos.map((url, i) => (
                                                    <div key={i} className="aspect-square rounded-[5px] relative overflow-hidden ring-1 ring-neutral-100 transition-transform active:scale-95">
                                                        <img src={url} className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                            className="absolute top-1 right-1 w-6 h-6 bg-red-500/90 rounded-full flex items-center justify-center text-white p-1.5 backdrop-blur-sm"
                                                        >
                                                            <Trash2 size={12} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {photos.length < 6 && (
                                                    <label className="aspect-square rounded-full border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-neutral-50 hover:border-[#01A083]/30 active:scale-95">
                                                        <input type="file" multiple hidden accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
                                                        {isUploading ? (
                                                            <Loader2 size={24} className="animate-spin text-[#01A083]" />
                                                        ) : (
                                                            <>
                                                                <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center">
                                                                    <ImageIcon size={20} className="text-[#9CA3AF]" />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.5px]">{t({ en: 'Add photo', fr: 'Ajouter', ar: 'إضافة صورة' })}</span>
                                                            </>
                                                        )}
                                                    </label>
                                                )}
                                            </div>
                                        </div>

                                        {/* Optional Note */}
                                        <div className="space-y-6 pb-1">
                                            <label className="text-[20px] font-medium text-[#111827] ">{t({ en: 'Instructions or Notes', fr: 'Instructions ou Notes', ar: 'تعليمات أو ملاحظات' })}</label>
                                            <textarea
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                placeholder={t({ en: 'Tell us more about what needs to be done...', fr: 'Dites-nous en plus sur ce qui doit être fait...', ar: 'أخبرنا بالمزيد عما يجب القيام به...' })}
                                                className="w-full h-40 p-6 bg-[#F9FAFB] rounded-[5px] border border-neutral-100 outline-none focus:border-[#01A083]/30 transition-all resize-none font-medium text-[15px] leading-relaxed placeholder:text-[#9CA3AF] placeholder:italic"
                                            />
                                        </div>

                                        {/* Save as Favorite */}
                                        {selectedProfileId === 'new' && user && (
                                            <div className="p-5 bg-[#FFFFFF] rounded-[5px] border border-[#01A083]/10 mb-12">
                                                <label className="flex items-center gap-4 cursor-pointer">
                                                    <div className={`w-6 h-6 rounded-[5px] border-2 transition-all flex items-center justify-center ${saveAsFavorite ? 'bg-[#01A083] border-[#01A083]' : 'bg-white border-neutral-300'}`}>
                                                        <input type="checkbox" hidden checked={saveAsFavorite} onChange={() => setSaveAsFavorite(!saveAsFavorite)} />
                                                        {saveAsFavorite && <Check size={16} color="white" strokeWidth={4} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[15px] font-bold text-[#111827]">{t({ en: 'Save this setup for next time', fr: 'Enregistrer cette installation', ar: 'احفظ هذا الإعداد للمرة القادمة' })}</p>
                                                        <p className="text-[12px] font-bold text-[#9CA3AF]">{t({ en: 'You won\'t have to enter these details again.', fr: 'Vous n\'aurez plus à saisir ces détails.', ar: 'لن تضطر لإدخال هذه التفاصيل مرة أخرى.' })}</p>
                                                    </div>
                                                </label>
                                                <AnimatePresence>
                                                    {saveAsFavorite && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="mt-4 pt-4 border-t border-[#01A083]/10"
                                                        >
                                                            <input
                                                                type="text"
                                                                placeholder={t({ en: 'Home, Office, Mom\'s House...', fr: 'Maison, Bureau, Chez maman...', ar: 'المنزل، المكتب، منزل أمي...' })}
                                                                onChange={(e) => setFavoriteLabel(e.target.value)}
                                                                className="w-full p-4 bg-white rounded-[5px] border border-neutral-100 outline-none font-bold text-[14px] focus:border-[#01A083]/30 transition-all"
                                                            />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </>
                                )}
                            </motion.section>

                            {/* Summary Tab Content - Restored & Polished */}
                            <div className="bg-[#F2F2F2] w-full pt-12 pb-18 px-6 sm:px-10 space-y-8 relative ">
                                {/* Wave Top Effect for Summary Transition */}
                                <div className="absolute top-[-40px] left-0 right-0 h-[40px] z-10 pointer-events-none">
                                    <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full fill-[#F2F2F2]">
                                        <path d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                                    </svg>
                                </div>

                                <h3 className="text-[28px] font-black text-[#111827]">{t({ en: 'Summary', fr: 'Résumé', ar: 'الملخص' })}</h3>

                                {estimate && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[18px] font-normal text-[#111827]">{t({ en: 'Base price', fr: 'Prix de base', ar: 'السعر الأساسي' })}</span>
                                                <button className="w-[22px] h-[22px] rounded-full border border-[#D1D5DB] flex items-center justify-center text-[10px] text-[#9CA3AF] font-bold">i</button>
                                            </div>
                                            <span className="text-[18px] font-normal text-[#111827]">
                                                {estimate.basePrice.toFixed(0)} MAD/{estimate.unit === 'unit' ? (t({ en: 'unit', fr: 'unité', ar: 'وحدة' })) : estimate.unit === 'day' ? (t({ en: 'day', fr: 'jour', ar: 'يوم' })) : estimate.unit === 'room' ? (t({ en: 'room', fr: 'pièce', ar: 'غرفة' })) : estimate.unit === 'window' ? (t({ en: 'window', fr: 'fenêtre', ar: 'نافذة' })) : estimate.unit === 'TV' ? 'TV' : estimate.unit === 'office' ? (t({ en: 'office', fr: 'bureau', ar: 'مكتب' })) : (t({ en: 'hr', fr: 'h', ar: 'ساعة' }))}
                                            </span>
                                        </div>

                                        {estimate.details && estimate.details.map((detail: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between pl-4 border-l-2 border-[#01A083]/20 py-1">
                                                <span className="text-[16px] font-normal text-[#4B5563]">{t(detail.label)}</span>
                                                <span className="text-[16px] font-bold text-[#111827]">{detail.amount.toFixed(0)} MAD</span>
                                            </div>
                                        ))}

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[18px] font-normal text-[#111827]">{t({ en: 'Services', fr: 'Services', ar: 'الخدمات' })} <span className="text-[14px] text-black/40 font-medium">({estimate.quantity} {t({ en: estimate.unit, fr: estimate.unit, ar: estimate.unit === 'unit' ? 'وحدة' : estimate.unit === 'day' ? 'يوم' : estimate.unit === 'room' ? 'غرفة' : estimate.unit === 'office' ? 'مكتب' : 'ساعة' })}{estimate.quantity > 1 && estimate.unit !== 'hr' && estimate.unit !== 'office' ? 's' : ''})</span></span>
                                                <button className="w-[22px] h-[22px] rounded-full border border-[#D1D5DB] flex items-center justify-center text-[10px] text-[#9CA3AF] font-bold">i</button>
                                            </div>
                                            <span className="text-[18px] font-normal text-[#111827]">{estimate.subtotal.toFixed(2)} MAD</span>
                                        </div>

                                        <div className="flex flex-col">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[18px] font-normal text-[#111827]">{t({ en: 'Lbricol Fee', fr: 'Frais Lbricol', ar: 'رسوم Lbricol' })}</span>
                                                    <button className="w-[22px] h-[22px] rounded-full border border-[#D1D5DB] flex items-center justify-center text-[10px] text-[#9CA3AF] font-bold">i</button>
                                                </div>
                                                <span className="text-[18px] font-normal text-[#111827]">{estimate.serviceFee.toFixed(2)} MAD</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[18px] font-normal text-[#111827]">{t({ en: 'Travel Fee', fr: 'Frais de déplacement', ar: 'رسوم التنقل' })}</span>
                                                    <button className="w-[22px] h-[22px] rounded-full border border-[#D1D5DB] flex items-center justify-center text-[10px] text-[#9CA3AF] font-bold">i</button>
                                                </div>
                                                <span className="text-[11px] font-normal text-[#9CA3AF] text-left">{estimate.distanceKm?.toFixed(1) || '0.0'} km · ~{estimate.duration || 0} {t({ en: 'min', fr: 'min', ar: 'دقيقة' })}</span>
                                            </div>
                                            <span className="text-[18px] font-normal text-[#111827]">{estimate.travelFee.toFixed(2)} MAD</span>
                                        </div>

                                        <div className="h-px bg-[#E5E7EB] w-full my-2" />

                                        {/* Total Section */}
                                        <div className="flex items-center justify-between py-2 gap-4">
                                            <span className="text-[22px] font-extrabold text-[#111827] whitespace-nowrap">{t({ en: 'Total to pay', fr: 'Total à payer', ar: 'الإجمالي للدفع' })}</span>
                                            <span className="text-[25px] font-extrabold text-[#111827] text-right">{estimate.total.toFixed(2)} MAD</span>
                                        </div>

                                        {!isErrand && (
                                            <div className="pt-10">
                                                <motion.button
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={handleContinue}
                                                    disabled={isSubmitting}
                                                    className="w-full py-2.5 bg-[#01A083] text-white rounded-full font-semibold text-[20px] flex items-center justify-center gap-3 disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <Loader2 className="animate-spin" /> : t({ en: 'Confirm Order', fr: 'Confirmer la commande', ar: 'تأكيد الطلب' })}
                                                </motion.button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Fixed Bottom Button for Errands Summary - Animated Popup */}
                <AnimatePresence>
                    {isErrand && isErrandReady && (
                        <motion.div
                            key="errand-footer"
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 z-[100] bg-transparent pointer-events-none"
                        >
                            <div className="absolute top-[-44px] left-0 right-0 h-[45px] z-20 pointer-events-none">
                                <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full fill-[#FFCC02]">
                                    <path d="M0,64L48,64C96,64,192,64,288,64C384,64,480,64,576,53.3C672,43,768,21,864,16C960,10.7,1056,21.3,1152,42.7C1248,64,1344,96,1392,112L1440,128L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
                                </svg>
                            </div>
                            <div className="bg-[#FFCC02] p-6 pb-12 pointer-events-auto">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleContinue}
                                    disabled={isSubmitting || isUploading}
                                    className="w-full h-15 bg-[#01A083] text-white rounded-full font-black text-[20px] flex items-center justify-center gap-3 transition-all py-5 "
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 size={24} className="animate-spin" />
                                            <span>{t({ en: 'Processing...', fr: 'Traitement...', ar: 'جاري المعالجة...' })}</span>
                                        </div>
                                    ) : (
                                        <span>{t({ en: 'Broadcast Order', fr: 'Diffuser la commande', ar: 'نشر الطلب' })}</span>
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Sub-screen Overlays */}
            <AnimatePresence>
                {activeDrawer !== 'none' && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 bg-white z-[100] flex flex-col"
                    >
                        {/* Drawer Header */}
                        <div className="p-6 flex items-center gap-4 border-b border-neutral-100">
                            <button onClick={() => {
                                setActiveDrawer('none');
                                setSearchResults([]);
                            }} className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center flex-shrink-0">
                                <ChevronLeft size={24} />
                            </button>

                            {(activeDrawer === 'pickup' || activeDrawer === 'dropoff') ? (
                                <div className="flex-1">
                                    <div className="bg-neutral-50 rounded-full px-5 py-2.5 flex items-center gap-3 border border-neutral-100">
                                        <Search size={18} className="text-neutral-400" />
                                        <input
                                            autoFocus
                                            maxLength={60}
                                            placeholder={t({ en: `Search for ${activeDrawer === 'pickup' ? 'pickup' : 'delivery'} address...`, fr: `Chercher l'adresse de ${activeDrawer === 'pickup' ? 'retrait' : 'livraison'}...`, ar: `ابحث عن عنوان ${activeDrawer === 'pickup' ? 'الاستلام' : 'التسليم'}...` })}
                                            onChange={async (e) => {
                                                const val = e.target.value;
                                                if (val.length > 2) {
                                                    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&countrycodes=ma`);
                                                    const data = await res.json();
                                                    setSearchResults(data.map((r: any) => ({
                                                        address: r.display_name,
                                                        lat: parseFloat(r.lat),
                                                        lng: parseFloat(r.lon)
                                                    })));
                                                } else {
                                                    setSearchResults([]);
                                                }
                                            }}
                                            className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold text-[#111827] placeholder:text-neutral-300 placeholder:font-medium"
                                        />
                                        <button
                                            onClick={() => {
                                                setMapPickingFor(activeDrawer as 'pickup' | 'dropoff');
                                                setActiveDrawer('map_picker');
                                            }}
                                            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-neutral-400 active:scale-95 border border-neutral-100"
                                        >
                                            <MapIcon size={16} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <h2 className="flex-1 text-[18px] font-black text-[#111827] text-center pr-10">
                                    {activeDrawer === 'description' && t({ en: "Your order", fr: "Votre commande", ar: "طلبك" })}
                                    {activeDrawer === 'recipient' && t({ en: "Add a recipient", fr: "Ajouter un destinataire", ar: "إضافة مستلم" })}
                                    {activeDrawer === 'schedule' && t({ en: "Schedule delivery", fr: "Planifier la livraison", ar: "جدولة التسليم" })}
                                </h2>
                            )}
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                            {activeDrawer === 'description' && (
                                <div className="space-y-6 pb-20">
                                    <div className="bg-[#F9FAFB] p-5 rounded-[10px] border border-neutral-100">
                                        <p className="text-[15px] font-medium text-[#000000] leading-relaxed">
                                            {t({ en: 'Couriers cannot make purchases. Orders involving purchases will be cancelled.', fr: 'Les coursiers ne peuvent pas effectuer d\'achats. Les commandes incluant des achats seront annulées.', ar: 'لا يمكن للمناديب القيام بعمليات شراء. سيتم إلغاء الطلبات التي تتضمن مشتريات.' })}
                                        </p>
                                    </div>
                                    <textarea
                                        autoFocus
                                        value={itemDescription}
                                        onChange={(e) => setItemDescription(e.target.value)}
                                        placeholder={t({ en: 'Enter details of what needs to be transported...', fr: 'Saisissez les détails de ce qui doit être transporté...', ar: 'أدخل تفاصيل ما يجب نقله...' })}
                                        className="w-full h-48 p-5 bg-white rounded-[10px] border-2 border-neutral-100 focus:border-[#01A083] focus:ring-0 font-medium text-[17px] placeholder:text-neutral-300 resize-none"
                                    />
                                </div>
                            )}

                            {activeDrawer === 'recipient' && (
                                <div className="space-y-6 pb-20">
                                    <div className="space-y-4">
                                        <label className="text-[14px] font-black text-[#4B5563]">{t({ en: 'Recipient name', fr: 'Nom du destinataire', ar: 'اسم المستلم' })}</label>
                                        <input
                                            type="text"
                                            value={recipientName}
                                            onChange={(e) => setRecipientName(e.target.value)}
                                            placeholder={t({ en: 'Who is receiving this?', fr: 'Qui reçoit cela ?', ar: 'من هو المستلم؟' })}
                                            className="w-full p-4 rounded-[10px] border-2 border-neutral-50 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[14px] font-black text-[#4B5563]">{t({ en: 'Phone number', fr: 'Numéro de téléphone', ar: 'رقم الهاتف' })}</label>
                                        <div className="flex gap-2 items-center bg-neutral-50 rounded-[10px] border-2 border-neutral-50 p-1">
                                            <CountrySelector
                                                selectedCountry={recipientCountry}
                                                onSelect={setRecipientCountry}
                                                fontSize="16px"
                                            />
                                            <input
                                                type="tel"
                                                value={recipientPhone}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setRecipientPhone(val);
                                                }}
                                                placeholder={recipientCountry.placeholder}
                                                className="flex-1 p-3 bg-transparent font-bold outline-none"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[12px] font-bold text-neutral-400 leading-relaxed">
                                        {t({ en: 'By sharing the recipient\'s details, you are solely responsible for obtaining their consent and informing them on how their data is processed.', fr: 'En partageant les coordonnées du destinataire, vous êtes seul responsable de l\'obtention de son consentement et de son information sur le traitement de ses données.', ar: 'من خلال مشاركة تفاصيل المستلم، أنت المسؤول الوحيد عن الحصول على موافقته وإبلاغه بكيفية معالجة بياناته.' })}
                                    </p>
                                </div>
                            )}

                            {activeDrawer === 'schedule' && (
                                <div className="space-y-8 flex flex-col pb-24">
                                    <div className="flex-1 space-y-8">
                                        {/* Select Date */}
                                        <div className="space-y-4">
                                            <h3 className="text-[20px] font-black text-[#111827]">{t({ en: 'Select date', fr: 'Choisir la date', ar: 'اختر التاريخ' })}</h3>
                                            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
                                                {Array.from({ length: 7 }).map((_, i) => {
                                                    const d = new Date();
                                                    d.setDate(d.getDate() + i);
                                                    const dateStr = format(d, 'd MMM');
                                                    const fullDate = format(d, 'yyyy-MM-dd');
                                                    const isSelected = deliveryDate === fullDate;

                                                    let label = format(d, 'EEEE');
                                                    if (i === 0) label = t({ en: 'Today', fr: 'Aujourd\'hui', ar: 'اليوم' });
                                                    if (i === 1) label = t({ en: 'Tomorrow', fr: 'Demain', ar: 'غدًا' });

                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => setDeliveryDate(fullDate)}
                                                            className={`flex-shrink-0 min-w-[140px] h-[90px] p-5 rounded-[20px] border-2 transition-all text-left relative ${isSelected ? 'border-[#01A083] bg-white' : 'border-neutral-100 bg-white'}`}
                                                        >
                                                            <div className="flex flex-col justify-between h-full">
                                                                <p className="text-[17px] font-black text-[#111827]">{label}</p>
                                                                <p className="text-[14px] font-bold text-neutral-400">{dateStr}</p>
                                                            </div>
                                                            {isSelected && (
                                                                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#01A083] flex items-center justify-center">
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                                                </div>
                                                            )}
                                                            {!isSelected && (
                                                                <div className="absolute top-3 right-3 w-6 h-6 rounded-full border-2 border-neutral-100" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Select Time */}
                                        <div className="space-y-4">
                                            <h3 className="text-[20px] font-black text-[#111827]">{t({ en: 'Select time', fr: 'Choisir l\'heure', ar: 'اختر الوقت' })}</h3>
                                            <div className="divide-y divide-neutral-100 border-t border-neutral-100">
                                                {["08:00 - 08:30", "08:30 - 09:00", "09:00 - 09:30", "09:30 - 10:00", "10:00 - 10:30", "15:00 - 15:30", "15:30 - 16:00", "16:00 - 16:30", "16:30 - 17:00", "17:00 - 17:30", "17:30 - 18:00", "18:00 - 18:30"].map((time, i) => {
                                                    const isSelected = deliveryTime === time.split(' - ')[0];
                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => {
                                                                setDeliveryTime(time.split(' - ')[0]);
                                                                setDeliveryType('schedule');
                                                            }}
                                                            className="w-full py-5 flex items-center justify-between group active:bg-neutral-50 transition-colors"
                                                        >
                                                            <span className={`text-[17px] ${isSelected ? 'font-black text-[#111827]' : 'font-bold text-[#111827]/70'}`}>{time}</span>
                                                            {isSelected ? (
                                                                <div className="w-6 h-6 rounded-full bg-[#01A083] flex items-center justify-center">
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full border-2 border-neutral-200" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeDrawer === 'map_picker' && (
                                <div className="absolute inset-0 flex flex-col bg-white">
                                    <div className="flex-1 relative">
                                        <MapView
                                            initialLocation={mapPickingFor === 'dropoff' && dropoffLocation.lat !== null ? { lat: Number(dropoffLocation.lat), lng: Number(dropoffLocation.lng) } : (mapPickingFor === 'pickup' && pickupLocation.lat !== null ? { lat: Number(pickupLocation.lat), lng: Number(pickupLocation.lng) } : { lat: 31.5085, lng: -9.7595 })}
                                            interactive={true}
                                            onLocationChange={(point) => {
                                                if (mapPickingFor === 'pickup') {
                                                    setPickupLocation({ address: point.address, lat: point.lat, lng: point.lng });
                                                } else {
                                                    setDropoffLocation({ address: point.address, lat: point.lat, lng: point.lng });
                                                }
                                            }}
                                            showCenterPin={true}
                                            pinY={50}
                                            zoom={16}
                                            triggerGps={gpsTrigger}
                                            centerOnUser={true}
                                        />

                                        <div className="absolute top-6 left-6 z-[1001]">
                                            <button
                                                onClick={() => setActiveDrawer('none')}
                                                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black active:scale-90 transition-transform"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[120%] z-[1001] pointer-events-none">
                                            <div className="bg-white px-4 py-2.5 rounded-[5px] border border-neutral-100 flex flex-col items-center gap-1 min-w-[140px]">
                                                <span className="text-[14px] font-medium text-black leading-none truncate max-w-[200px]">
                                                    {dropoffLocation.address?.split(',')[0] || t({ en: 'Select Point', fr: 'Choisir un point', ar: 'اختر نقطة' })}
                                                </span>
                                                <button
                                                    onClick={() => setActiveDrawer('none')}
                                                    className="pointer-events-auto text-[13px] font-black text-[#01A083] py-0.5"
                                                >
                                                    {t({ en: 'Use this point', fr: 'Utiliser ce point', ar: 'استخدم هذه النقطة' })}
                                                </button>
                                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-neutral-100 rotate-45" />
                                            </div>
                                        </div>

                                        <div className="absolute bottom-[40px] right-6 z-[1001]">
                                            <button
                                                onClick={() => setGpsTrigger(prev => prev + 1)}
                                                className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-black active:scale-95 transition-all border border-neutral-50"
                                            >
                                                <Navigation size={22} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-transparent relative z-[1002]">
                                        {/* Wave Top Effect */}
                                        <div className="absolute top-[-30px] left-0 right-0 h-[30px] z-10 pointer-events-none">
                                            <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full fill-white">
                                                <path d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                                            </svg>
                                        </div>
                                        <div className="bg-white p-6 pb-10 space-y-6">
                                            <div className="text-center space-y-1">
                                                <p className="text-[15px] font-light text-neutral-800">{t({ en: 'Trouble locating your address?', fr: 'Problème pour localiser votre adresse ?', ar: 'هل تواجه مشكلة في تحديد عنوانك؟' })}</p>
                                                <p className="text-[13px] font-medium text-neutral-400">{t({ en: 'Try using search instead', fr: 'Essayez d\'utiliser la recherche', ar: 'جرب استخدام البحث بدلاً من ذلك' })}</p>
                                            </div>

                                            <button
                                                onClick={() => setActiveDrawer('dropoff')}
                                                className="w-full h-14 bg-neutral-100 rounded-full px-6 flex items-center gap-3 text-neutral-400 group active:bg-neutral-200 transition-all font-light"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-400">
                                                    <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                {t({ en: 'Search street, city, district...', fr: 'Chercher rue, ville, quartier...', ar: 'ابحث عن شارع، مدينة، حي...' })}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {(activeDrawer === 'pickup' || activeDrawer === 'dropoff') && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        {searchResults.length > 0 ? searchResults.map((r: any, i: number) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    if (activeDrawer === 'pickup') setPickupLocation(r);
                                                    else setDropoffLocation(r);
                                                    setActiveDrawer('none');
                                                    setSearchResults([]);
                                                }}
                                                className="w-full p-5 bg-neutral-50 rounded-[15px] border border-neutral-100 flex items-center gap-4 group active:bg-neutral-100 transition-all text-left"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-neutral-100">
                                                    <MapPin size={20} className="text-[#01A083]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[15px] font-black text-[#111827] truncate">{r.address.split(',')[0]}</p>
                                                    <p className="text-[13px] font-medium text-neutral-400 truncate">{r.address.split(',').slice(1).join(',').trim()}</p>
                                                </div>
                                            </button>
                                        )) : (
                                            <div className="py-12 text-center space-y-3 opacity-40">
                                                <Search size={40} className="mx-auto text-neutral-300" />
                                                <p className="text-[15px] font-medium text-neutral-400">{t({ en: 'Search for a street, city or district...', fr: 'Cherchez une rue, ville ou quartier...' })}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Fixed Drawer Footer (For content-heavy drawers) */}
                        {(activeDrawer === 'schedule' || activeDrawer === 'description' || activeDrawer === 'recipient') && (
                            <div className="bg-white relative z-[105]">
                                {/* Wave Top Effect */}
                                <div className="absolute top-[-30px] left-0 right-0 h-[30px] z-10 pointer-events-none">
                                    <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full fill-white">
                                        <path d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                                    </svg>
                                </div>
                                <div className="p-6 pb-12">
                                    <button
                                        onClick={() => setActiveDrawer('none')}
                                        className="w-full py-5 bg-[#01A083] text-white rounded-full font-black text-[18px] active:scale-95 transition-all"
                                    >
                                        {activeDrawer === 'schedule' ? t({ en: 'Confirm', fr: 'Confirmer' }) : t({ en: 'Save Details', fr: 'Enregistrer les détails' })}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Portfolio Lightbox */}
            <AnimatePresence>
                {lightboxIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
                        onClick={() => setLightboxIndex(null)}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setLightboxIndex(null)}
                            className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90 z-[1001]"
                        >
                            <X size={28} />
                        </button>

                        {/* Navigation Buttons */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 pointer-events-none z-[1001]">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex(prev => prev !== null ? (prev - 1 + provider.portfolio.length) % provider.portfolio.length : null);
                                }}
                                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90 pointer-events-auto disabled:opacity-30"
                                disabled={provider.portfolio.length <= 1}
                            >
                                <ChevronLeft size={28} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxIndex(prev => prev !== null ? (prev + 1) % provider.portfolio.length : null);
                                }}
                                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90 pointer-events-auto disabled:opacity-30"
                                disabled={provider.portfolio.length <= 1}
                            >
                                <ChevronRight size={28} />
                            </button>
                        </div>

                        {/* Counter */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white font-black text-sm tracking-widest z-[1001]">
                            {lightboxIndex + 1} / {provider.portfolio.length}
                        </div>

                        {/* Image */}
                        <motion.div
                            key={lightboxIndex}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-full max-h-full flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={provider.portfolio[lightboxIndex]}
                                className="max-w-[95vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
                                alt="Full size portfolio"
                            />
                        </motion.div>

                        {/* Caption Area (Glassmorphism) */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-[1001]">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center">
                                <p className="text-white/60 text-xs font-black uppercase tracking-[3px] mb-1">{order.serviceName}</p>
                                <h3 className="text-white text-[17px] font-bold">{provider.name}’s {t({ en: 'Work Sample', fr: 'Exemple de réalisation', ar: 'نموذج عمل' })}</h3>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
