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
    const [taskSize, setTaskSize] = useState<'small' | 'medium' | 'large'>('small');
    const [taskDuration, setTaskDuration] = useState(1);

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
    const errandCategories = [
        { id: 'keys', label: 'Keys', icon: '🔑' },
        { id: 'documents', label: 'Docs', icon: '📄' },
        { id: 'package', label: 'Parcel', icon: '📦' },
        { id: 'grocery', label: 'Grocery', icon: '🛍️' },
        { id: 'food', label: 'Food', icon: '🍛' },
        { id: 'pharmacy', label: 'Pharmacy', icon: '💊' },
        { id: 'mailing', label: 'Mailing', icon: '✉️' }
    ];

    const errandSizes = (order.serviceType === 'errands' || order.serviceType?.includes('delivery')) ? [
        { id: 'small', name: 'Envelope/Bag', desc: 'Fits in a backpack (Moto)', icon: '🏍️' },
        { id: 'medium', name: 'Standard Box', desc: 'Requires car trunk', icon: '🚗' },
        { id: 'large', name: 'Large Package', desc: 'Fits in an SUV/Truck', icon: '🚚' }
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

    // Bricoler Stats
    const [provider, setProvider] = useState({
        name: order.providerName || 'Bricoler',
        avatar: order.providerAvatar || '/Images/Vectors Illu/avatar.png',
        rating: order.providerRating || 5.0,
        taskCount: order.providerJobsCount || 0,
        rank: order.providerRank || 'New',
        minRate: order.providerRate || 0,
        bio: order.providerBio || 'Experienced Bricoler offering quality services in your area.',
        yearsOfExperience: order.providerExperience || '1 Year',
        portfolio: [] as string[],
        equipments: [] as string[],
        movingTransports: [] as string[],
        reviews: [] as any[],
        coords: null as { lat: number, lng: number } | null
    });

    useEffect(() => {
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

                    setProvider(prev => ({
                        ...prev,
                        bio: data.bio || data.aboutMe || prev.bio,
                        yearsOfExperience: data.yearsOfExperience || data.experience || prev.yearsOfExperience,
                        portfolio: servicePortfolio.length > 0 ? servicePortfolio : (data.portfolio || []),
                        equipments: Array.isArray(relevantService?.equipments) ? relevantService.equipments : (Array.isArray(data.equipments) ? data.equipments : []),
                        movingTransports: data.movingTransports || [],
                        reviews: data.reviews || [],
                        rating: data.rating || prev.rating,
                        taskCount: data.completedJobs || data.taskCount || prev.taskCount,
                        coords: data.location || data.coords || null
                    }));
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
        } else {
            // General fallback: check if it's hourly
            const config = getAllServices().find(s => s.id === order.serviceType);
            const subConfig = config?.subServices.find(ss => ss.id === order.subServiceId);
            const archetype = subConfig?.pricingArchetype || config?.subServices[0]?.pricingArchetype;

            if (archetype === 'hourly') {
                const result = calculateOrderPrice(
                    order.subServiceId || order.serviceType,
                    order.providerRate || 100,
                    { hours: taskDuration }
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
                    total: result.total * slotsCount
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
        provider.coords
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
            const slotsToSave = finalSlots.map(s => ({
                date: (typeof s.date === 'string' ? new Date(s.date) : s.date).toISOString(),
                time: s.time
            }));

            // Save first one to scheduledDate/Time for backward compat
            setOrderField('scheduledDate', slotsToSave[0].date);
            setOrderField('scheduledTime', slotsToSave[0].time);
            setOrderField('multiSlots', slotsToSave);

            // Determine final task duration for pricing
            let finalTaskDuration = taskDuration;
            if (order.serviceType === 'moving' || order.serviceType?.includes('moving')) {
                // Determine duration based on taskSize (Small=1.5h, Medium=3h, Large=5h)
                finalTaskDuration = taskSize === 'small' ? 1.5 : taskSize === 'medium' ? 3 : 5;
            } else if (order.serviceType === 'furniture_assembly') {
                finalTaskDuration = Object.values(assemblyItems).reduce((sum, item) => sum + (item.quantity * item.estHours), 0);
            }

            const serviceDetails = {
                rooms,
                propertyType,
                photoUrls: photos,
                note,
                assemblyItems,
                // Delivery fields
                pickupAddress: pickupLocation.address,
                dropoffAddress: dropoffLocation.address,
                pickupCoords: { lat: pickupLocation.lat, lng: pickupLocation.lng },
                dropoffCoords: { lat: dropoffLocation.lat, lng: dropoffLocation.lng },
                recipientName,
                recipientPhone,
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
                deliveryDistanceKm: estimate?.distanceKm,
                deliveryDurationMinutes: estimate?.duration,
                // Signal to backend for broadcasting errands city-wide
                isPublic: order.serviceType === 'errands' || order.serviceType?.includes('delivery')
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
    const subServiceName = SERVICES_HIERARCHY[order.serviceType as keyof typeof SERVICES_HIERARCHY]?.subServices.find(s => s.id === order.subServiceId)?.name;

    return (
        <div className="min-h-screen bg-white text-[#111827] flex flex-col font-sans">
            {isSplashing && <SplashScreen subStatus={null} />}

            {/* Header */}
            <header className="flex flex-col sticky top-0 bg-white z-20 border-b border-neutral-100/60">
                <div className="flex items-center justify-between px-6 py-5">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-neutral-50 flex items-center justify-center transition-transform active:scale-90">
                        <ChevronLeft size={22} className="text-[#111827]" />
                    </button>
                    <h1 className="text-[17px] font-black text-[#111827] truncate max-w-[240px]">
                        {order.serviceName || 'Order Setup'}
                        {subServiceName && (
                            <span className="text-neutral-400 font-medium ml-1.5">/ {subServiceName}</span>
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
                            className={`flex-1 py-4 text-[14px] font-bold transition-all relative ${activeTab === 'details' ? 'text-[#219178]' : 'text-[#9CA3AF]'}`}
                        >
                            Bricoler Details
                            {activeTab === 'details' && (
                                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#219178]" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('setup')}
                            className={`flex-1 py-4 text-[14px] font-bold transition-all relative ${activeTab === 'setup' ? 'text-[#219178]' : 'text-[#9CA3AF]'}`}
                        >
                            Order Setup
                            {activeTab === 'setup' && (
                                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#219178]" />
                            )}
                        </button>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className={`flex-1 overflow-y-auto no-scrollbar pt-10 ${(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) ? 'pb-64' : 'pb-20'}`}>
                <AnimatePresence mode="wait">
                    {activeTab === 'details' ? (
                        <motion.div
                            key="details"
                            variants={staggerContainer}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, x: 10 }}
                            className="py-8"
                        >
                            <div className="px-6"> {/* Content Wrapper */}
                                {(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) ? (
                                    <div className="space-y-4">
                                        {/* 1. Package Details Section */}
                                        <div className="bg-[#F3F4F6] rounded-[20px] p-1.5 pb-2">
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
                                        <div className="bg-[#F3F4F6] rounded-[20px] p-1.5 pb-2">
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
                                        <div className="bg-[#F3F4F6] rounded-[20px] p-1.5 pb-2">
                                            <div className="px-4 py-3 flex items-center gap-2 text-[#6B7280]">
                                                <User size={18} />
                                                <span className="text-[15px] font-bold">Sender details</span>
                                            </div>
                                            <div className="bg-white rounded-[16px] px-4 py-4 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 bg-black rounded-[14px] flex items-center justify-center p-2.5">
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
                                        <motion.div variants={staggerItem} className="flex gap-6 mb-8 items-start">
                                            <img src={provider.avatar} className="w-24 h-24 rounded-[15px] object-cover border-4 border-[#F9FAFB]" />
                                            <div className="flex-1">
                                                <h2 className="text-[24px] font-black text-[#111827] mb-2">{provider.name}</h2>
                                                <div className="flex items-baseline gap-2 text-[#219178] mb-4">
                                                    <span className="text-[20px] font-black">MAD {provider.minRate}</span>
                                                    <span className="text-[14px] font-bold text-[#6B7280]">minimum</span>
                                                </div>
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F1FEF4] rounded-full border border-[#027963]">
                                                    <ShieldCheck size={14} className="text-[#027963]" />
                                                    <span className="text-[11px] font-black text-[#166534]  tracking-wider">Identity Verified</span>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* Trust & Stats Grid (High Visibility) */}
                                        <motion.div variants={staggerItem} className="grid grid-cols-3 gap-3 mb-8">
                                            <div className="flex flex-col items-center justify-center p-4 rounded-full bg-[#F3F4F6] text-center ">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#219178] mb-2 ">
                                                    <Trophy size={30} />
                                                </div>
                                                <span className="text-[23px] font-bold text-[#219178] leading-tight capitalize">
                                                    {provider.rank || 'New'}
                                                </span>
                                                <span className="text-[10px] font-bold text-[#219178] uppercase tracking-tighter mt-1">Level</span>
                                            </div>
                                            <div className="flex flex-col items-center justify-center p-4 rounded-full bg-[#F3F4F6] text-center ">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#219178] mb-2">
                                                    <Star size={30} />
                                                </div>
                                                <span className="text-[23px] font-bold text-[#219178] leading-tight">
                                                    {provider.taskCount === 0 ? "0.0" : provider.rating.toFixed(1)}
                                                </span>
                                                <span className="text-[10px] font-bold text-[#219178] uppercase tracking-tighter mt-1">Rating</span>
                                            </div>
                                            <div className="flex flex-col items-center justify-center p-4 rounded-full bg-[#F3F4F6] text-center ">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#219178] mb-2 ">
                                                    <CheckCircle2 size={30} />
                                                </div>
                                                <span className="text-[23px] font-bold text-[#219178] leading-tight">
                                                    {provider.taskCount}
                                                </span>
                                                <span className="text-[10px] font-bold text-[#219178] uppercase tracking-tighter mt-1">Orders</span>
                                            </div>
                                        </motion.div>

                                        {/* Secondary Stats */}
                                        <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3 mb-8">
                                            <div className="p-4 bg-[#F9FAFB] rounded-[5px] border border-neutral-100 flex items-center justify-between">
                                                <div>
                                                    <div className="text-[10px] font-black text-[#9CA3AF] tracking-widest uppercase mb-1">Experience</div>
                                                    <div className="text-[17px] font-medium text-[#111827]">{provider.yearsOfExperience}</div>
                                                </div>
                                                <Calendar className="text-neutral-200" size={24} />
                                            </div>
                                            <div className="p-4 bg-[#F9FAFB] rounded-[5px] border border-neutral-100 flex items-center justify-between">
                                                <div>
                                                    <div className="text-[10px] font-black text-[#9CA3AF] tracking-widest uppercase mb-1">Success Rate</div>
                                                    <div className="text-[17px] font-medium text-[#111827]">99%</div>
                                                </div>
                                                <TrendingUp className="text-neutral-200" size={24} />
                                            </div>
                                        </motion.div>

                                        {/* Portfolio Section */}
                                        {provider.portfolio && provider.portfolio.length > 0 && (
                                            <motion.div variants={staggerItem} className="mb-10">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-[18px] font-black text-[#111827]">Bricoler Portfolio</h4>
                                                    <span className="text-[11px] font-black text-[#219178] tracking-[2px]">{order.serviceName}</span>
                                                </div>
                                                <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6 pb-2">
                                                    {provider.portfolio.map((img, i) => (
                                                        <div key={i} className="flex-shrink-0">
                                                            <img src={img} className="w-44 h-56 rounded-[5px] object-cover border border-neutral-100" alt="Work sample" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* About */}
                                        <motion.div variants={staggerItem} className="mb-10">
                                            <h4 className="text-[18px] font-black text-[#111827] mb-4">About Me</h4>
                                            <div className="text-[15px] text-[#000000] leading-relaxed font-medium p-6 bg-[#F9FAFB] rounded-[5px] border border-neutral-100">
                                                "{provider.bio}"
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
                                                        <div key={i} className="flex items-center gap-2 px-4 py-2 bg-[#F9FAFB] rounded-[10px] border border-neutral-100 text-[14px] font-bold text-[#4B5563]">
                                                            <div className="w-5 h-5 rounded-full bg-[#219178]/10 flex items-center justify-center">
                                                                <Check size={12} className="text-[#219178]" strokeWidth={3} />
                                                            </div>
                                                            {item}
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}

                                        {/* Reviews Section */}
                                        <motion.div variants={staggerItem} className="mb-10">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-[18px] font-black text-[#111827]">Client Reviews</h4>
                                                <span className="text-[11px] font-black text-[#9CA3AF] tracking-widest">{provider.reviews?.length || 0} reviews</span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
                                                {provider.reviews && provider.reviews.length > 0 ? provider.reviews.map((rev, i) => (
                                                    <div key={i} className="p-5 bg-white rounded-[5px] border border-neutral-100">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="w-10 h-10 rounded-full bg-[#219178]/10 flex items-center justify-center font-black text-[#219178] text-sm border border-[#219178]/10">
                                                                {rev.userName?.charAt(0) || 'C'}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-[14px] font-black text-[#111827]">{rev.userName || 'Verified Client'}</p>
                                                                <p className="text-[11px] font-bold text-[#9CA3AF]">{rev.date || 'Recemment'}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1 bg-[#FFFBEB] px-2.5 py-1 rounded-[5px] border border-[#FEF3C7]">
                                                                <Sparkles size={10} className="text-[#FBBF24] fill-[#FBBF24]" />
                                                                <span className="text-[11px] font-black text-[#92400E]">{rev.rating || 5}</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-[14px] text-[#4B5563] font-medium leading-[1.6]">{rev.comment}</p>
                                                    </div>
                                                )) : (
                                                    <div className="py-12 text-center bg-white rounded-[5px] border border-dashed border-neutral-200">
                                                        <p className="text-[#9CA3AF] font-medium text-[20px] ">Awaiting first reviews on the app</p>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>

                                        {/* Trusted Provider */}
                                        <motion.div variants={staggerItem} className="p-5 bg-[#F0FDF4] rounded-[5px] border border-[#D1FAE5] flex items-center gap-4 mb-32">
                                            <div className="w-11 h-11 rounded-full bg-[#D1FAE5] flex items-center justify-center text-[#219178]">
                                                <Check size={22} className="stroke-[3]" />
                                            </div>
                                            <div>
                                                <p className="text-[16px] font-black text-[#065F46]">Verified Bricoler</p>
                                                <p className="text-[13px] font-medium text-[#047857]">Identity and skills verified by Lbricol team.</p>
                                            </div>
                                        </motion.div>
                                    </>
                                )}

                                {/* Floating "Book Me" Button wrapper with Wave (Only for profiles, not errands summary) */}
                                {!(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) && (
                                    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-transparent">
                                        <div className="absolute top-[-44px] left-0 right-0 h-[45px] z-20 pointer-events-none">
                                            <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full fill-[#FFB700]">
                                                <path d="M0,64L48,64C96,64,192,64,288,64C384,64,480,64,576,53.3C672,43,768,21,864,16C960,10.7,1056,21.3,1152,42.7C1248,64,1344,96,1392,112L1440,128L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
                                            </svg>
                                        </div>
                                        <div className="bg-[#FFB700] p-6 pb-8">
                                            <motion.button
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => {
                                                    setActiveTab('setup');
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="w-full h-15 bg-[#219178] text-white rounded-full font-black text-[20px] flex items-center justify-center gap-3 transition-all py-5 "
                                            >
                                                <span>Book me</span>
                                            </motion.button>
                                        </div>
                                    </div>
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
                                        Saved Setups
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
                                            className={`flex-shrink-0 px-6 py-4 rounded-[10px] border-2 transition-all flex items-center gap-3 ${selectedProfileId === 'new' ? 'border-[#219178] bg-[#F0FDF9] text-[#219178]' : 'border-neutral-100 bg-white text-[#9CA3AF]'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${selectedProfileId === 'new' ? ' text-white' : 'bg-neutral-100'}`}>
                                                <Home size={20} className="text-[#219178]" />
                                            </div>
                                            <span className="font-black text-[15px]">New setup</span>
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

                                                className={`flex-shrink-0 px-6 py-4 rounded-[10px] border-2 transition-all flex items-center gap-3 min-w-[200px] ${selectedProfileId === p.id ? 'border-[#219178] bg-[#F0FDF9] text-[#219178]' : 'border-neutral-100 bg-white text-[#111827]'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${selectedProfileId === 'new' ? ' text-white' : 'bg-neutral-100'}`}>
                                                    <Home size={20} className="text-[#219178]" />
                                                </div>

                                                <div className="text-left">
                                                    <p className="font-black text-[15px] leading-tight">{p.label}</p>
                                                    <p className={`text-[11px] font-bold ${selectedProfileId === p.id ? 'text-[#219178]/70' : 'text-neutral-400'}`}>
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
                                                <h3 className="text-[25px] font-bold text-[#111827]">What do you need?</h3>
                                                <div className="px-3 py-1 bg-[#219178]/10 rounded-full">
                                                    <span className="text-[12px] font-black text-[#219178] uppercase tracking-wider">Errand</span>
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
                                                        className={`flex-shrink-0 px-5 py-3.5 rounded-[12px] border-2 transition-all flex flex-col items-center gap-2 min-w-[100px] ${errandCategory === cat.id ? 'border-[#219178] bg-[#F0FDF9]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
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
                                                            {itemDescription || "Add details (e.g. key from A to B)"}
                                                        </p>
                                                        <p className="text-[13px] font-medium text-[#9CA3AF]">Courier will see this description</p>
                                                    </div>
                                                </div>
                                                <ChevronLeft className="rotate-180 text-neutral-300 group-hover:text-[#219178] transition-colors" size={22} />
                                            </button>
                                        </div>

                                        {/* 2. Load Size Picker */}
                                        <div className="space-y-6">
                                            <h3 className="text-[25px] text-[#111827] font-medium">Package Size</h3>
                                            <div className="grid grid-cols-1 gap-3">
                                                {errandSizes.map((size) => (
                                                    <button
                                                        key={size.id}
                                                        onClick={() => setTaskSize(size.id as any)}
                                                        className={`p-5 rounded-[10px] border-1 text-left transition-all flex items-center justify-between ${taskSize === size.id ? 'border-[#219178] ' : 'border-neutral-100'}`}
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
                                                            <div className="w-6 h-6 rounded-full bg-[#219178] flex items-center justify-center">
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
                                                <h3 className="text-[25px] text-[#111827] font-bold">Item Photo</h3>
                                            </div>
                                            <div className="p-8 border-2 border-dashed border-neutral-100 rounded-[15px] bg-[#F9FAFB] flex flex-col items-center justify-center gap-6 text-center">
                                                {!photos.length && (
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-neutral-300">
                                                            <ImageIcon size={32} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[15px] font-bold text-[#111827]">Show the Bricoler the item</p>
                                                            <p className="text-[13px] font-medium text-neutral-500 max-w-[240px]">Helps them prepare and confirms it fits their vehicle</p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                                                    {photos.map((photo, idx) => (
                                                        <div key={idx} className="w-24 h-24 rounded-[12px] overflow-hidden border-2 border-white shadow-sm relative group active:scale-95 transition-all">
                                                            <img src={photo} className="w-full h-full object-cover" />
                                                            <button
                                                                onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                                                                className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500/90 backdrop-blur-sm rounded-full flex items-center justify-center text-white shadow-md active:bg-red-600 transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))}

                                                    {photos.length < 6 && (
                                                        <button
                                                            onClick={() => document.getElementById('errand-photo-input')?.click()}
                                                            className="w-24 h-24 rounded-[12px] border-2 border-dashed border-neutral-200 bg-white flex flex-col items-center justify-center gap-1 text-neutral-400 hover:border-[#219178] hover:text-[#219178] transition-all active:scale-95"
                                                        >
                                                            <Plus size={24} />
                                                            <span className="text-[10px] font-black uppercase tracking-wider">Add</span>
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
                                            <h3 className="text-[25px] font-bold text-[#111827]">Delivery Route</h3>

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
                                                    <div className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-full border border-neutral-100 shadow-sm flex items-center gap-2">
                                                        <Navigation size={14} className="text-[#219178]" />
                                                        <span className="text-[12px] font-black text-[#111827]">Estimated Route</span>
                                                    </div>
                                                </div>

                                                {estimate?.duration && (
                                                    <div className="absolute bottom-4 left-4 z-10 transition-all animate-in fade-in slide-in-from-bottom-2 duration-700">
                                                        <div className="px-4 py-2 bg-white/95 backdrop-blur rounded-[12px] border border-neutral-100 shadow-xl flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-[#219178]/10 flex items-center justify-center">
                                                                <Clock size={16} className="text-[#219178]" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[14px] font-black text-[#111827] leading-none mb-0.5">{Math.ceil(estimate.duration)} mins</span>
                                                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Travel Time</span>
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
                                                            <p className="text-[13px] font-bold text-[#000000] uppercase tracking-wider mb-0.5">Pickup Point</p>
                                                            <p className={`text-[15px] font-bold truncate max-w-[220px] ${pickupLocation.address ? 'text-[#111827]' : 'text-neutral-300'}`}>
                                                                {pickupLocation.address || "Where do we start?"}
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
                                                            <p className="text-[11px] font-bold text-[#000000] uppercase tracking-wider mb-0.5">Drop-off Point</p>
                                                            <p className={`text-[15px] font-bold truncate max-w-[220px] ${dropoffLocation.address ? 'text-[#111827]' : 'text-neutral-300'}`}>
                                                                {dropoffLocation.address || "Where to deliver?"}
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
                                                <p className="text-[20px] font-medium text-[#000000]">Strict: No Purchases</p>
                                                <p className="text-[14px] font-Light text-[#000000] leading-relaxed">
                                                    Bricolers are couriers, not shoppers. They cannot buy products for you. Items must be prepaid or ready for pickup.
                                                </p>
                                            </div>
                                        </div>

                                        {/* 6. Recipient Details */}
                                        <div className="space-y-6">
                                            <h3 className="text-[25px] font-medium text-[#111827]">Handling Info</h3>
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
                                                            {recipientName ? `Recipient: ${recipientName}` : "Sending to someone else?"}
                                                        </p>
                                                        <p className="text-[13px] font-medium text-[#9CA3AF]">Who should the courier meet at drop-off?</p>
                                                    </div>
                                                </div>
                                                <ChevronLeft className="rotate-180 text-neutral-400" size={20} />
                                            </button>
                                        </div>

                                        {/* 7. Scheduling (Pic 3 Design) */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-[25px] font-bold text-[#111827]">Delivery options</h3>
                                                <button className="w-5 h-5 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-400 text-[10px] font-black">i</button>
                                            </div>

                                            {/* Standard Option */}
                                            <button
                                                onClick={() => setDeliveryType('standard')}
                                                className={`w-full p-6 text-left flex items-center justify-between transition-all ${deliveryType === 'standard' ? 'bg-[#F0FDF9]' : 'hover:bg-neutral-50'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${deliveryType === 'standard' ? 'bg-[#219178] border-[#219178]' : 'border-neutral-200'}`}>
                                                        {deliveryType === 'standard' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[20px] font-medium text-[#111827]">Standard</p>
                                                        <p className="text-[14px] font-light text-[#111827]">As soon as possible</p>
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
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${deliveryType === 'schedule' ? 'bg-[#219178] border-[#219178]' : 'border-neutral-200'}`}>
                                                        {deliveryType === 'schedule' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[20px] font-medium text-[#111827]">Schedule</p>
                                                        <p className="text-[14px] font-light text-[#111827]">
                                                            {deliveryDate ? `${deliveryDate} at ${deliveryTime}` : "Select time"}
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
                                            <h3 className="text-[25px] text-[#111827] font-bold">When do you need the Bricoler?</h3>
                                            <OrderAvailabilityPicker
                                                bricolerId={order.providerId!}
                                                onSelect={(slots) => {
                                                    setSelectedSlots(slots);
                                                }}
                                                selectedSlots={selectedSlots}
                                            />
                                        </div>

                                        {/* Moving Help Specialized Sections */}
                                        {(order.serviceType === 'moving' || order.serviceType?.includes('moving')) && (
                                            <div className="space-y-10">
                                                {/* Task Size */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[25px] text-[#111827] font-bold">How big is the move?</h3>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { id: 'small', name: 'Small', desc: 'A few items or 1 room', duration: '1.5h', hours: 1.5 },
                                                            { id: 'medium', name: 'Medium', desc: '2-3 rooms / Small apartment', duration: '3h', hours: 3 },
                                                            { id: 'large', name: 'Large', desc: '4+ rooms / Big house', duration: '5h+', hours: 5 },
                                                        ].map((size) => (
                                                            <button
                                                                key={size.id}
                                                                onClick={() => {
                                                                    setTaskSize(size.id as any);
                                                                    setTaskDuration(size.hours);
                                                                }}
                                                                className={`p-5 rounded-[5px] border-2 text-left transition-all flex items-center justify-between ${taskSize === size.id ? 'border-[#219178] bg-[#F0FDF9]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                            >
                                                                <div className="pl-4">
                                                                    <p className="font-bold text-[17px] text-black">{size.name}</p>
                                                                    <p className="font-medium text-[13px] text-black/60">{size.desc}</p>
                                                                </div>
                                                                <div className="text-right pr-4">
                                                                    <p className="font-bold text-[15px] text-[#219178]">Est. {size.duration}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Packing Service: Move items too? */}
                                                {order.subServiceId === 'packing' && (
                                                    <div className="space-y-4">
                                                        <h3 className="text-[25px] text-[#111827] font-black">Move these items too?</h3>
                                                        <p className="text-neutral-500 text-[15px] font-medium leading-relaxed max-w-[90%]">
                                                            Do you need the items to be transported to a second location after they are packed?
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                                            <button
                                                                onClick={() => setNeedsTransport(false)}
                                                                className={`p-5 rounded-[5px] border-2 font-black transition-all ${!needsTransport ? 'border-[#219178] bg-[#F0FDF9] text-[#219178]' : 'border-neutral-100 bg-[#F9FAFB] text-neutral-400'}`}
                                                            >
                                                                No, just packing
                                                            </button>
                                                            <button
                                                                onClick={() => setNeedsTransport(true)}
                                                                className={`p-5 rounded-[5px] border-2 font-black transition-all ${needsTransport ? 'border-[#219178] bg-[#F0FDF9] text-[#219178]' : 'border-neutral-100 bg-[#F9FAFB] text-neutral-400'}`}
                                                            >
                                                                Yes, pack & move
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Route Section (Pic 4 Style) */}
                                                {needsTransport && (
                                                    <div className="space-y-6">
                                                        <h3 className="text-[25px] text-[#111827] font-black">Delivery details</h3>

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
                                                                        {pickupLocation.address || "Where from?"}
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
                                                                        {dropoffLocation.address || "Where to?"}
                                                                    </span>
                                                                </div>
                                                                <ChevronRight className="text-neutral-300 group-hover:text-black transition-colors" size={18} />
                                                            </button>
                                                        </div>

                                                        {pickupLocation.address && dropoffLocation.address && (
                                                            <div className="p-4 bg-[#F9FAFB] rounded-[5px] flex items-center justify-between border border-neutral-100 italic">
                                                                <span className="text-[13px] font-light text-neutral-500">Delivery Estimate</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[13px] font-black text-[#219178]">
                                                                        {estimate?.distanceKm ? `${estimate.distanceKm.toFixed(1)} km` : ""}
                                                                    </span>
                                                                    {estimate?.distanceKm && (estimate.duration || estimate.duration === 0) ? <span className="text-neutral-300">·</span> : null}
                                                                    <span className="text-[13px] font-medium text-black">
                                                                        {(estimate?.duration || estimate?.duration === 0) ? `${estimate.duration} min travel` : "Calculating route..."}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Property Type */}
                                        <div className="space-y-6">
                                            <h3 className="text-[25px] text-[#111827] font-bold">What's your property type?</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {['Studio', 'Apartment', 'Villa', 'Guesthouse', 'Riad', 'Hotel'].map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setPropertyType(type)}
                                                        className={`px-8 py-3.5 rounded-full border-2 font-medium text-[13px] transition-all ${propertyType === type ? 'border-[#219178] bg-white text-[#219178]' : 'border-neutral-100 text-black'}`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Room Selector (Eggy Style Redesign) */}
                                        {(order.serviceType === 'cleaning' || order.serviceType === 'airbnb_cleaning') && (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between px-1">
                                                    <label className="text-[25px] font-bold text-[#111827] setup-heading">Number of Rooms</label>
                                                    <span className="text-[12px] font-bold text-[#FFFFFF] bg-[#027963] px-4 py-1.5 rounded-full tracking-widest">
                                                        {rooms} Selected
                                                    </span>
                                                </div>
                                                <div className="flex gap-4 overflow-x-auto pb-6 pt-2 no-scrollbar -mx-6 px-6 snap-x snap-mandatory">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
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
                                                            className={`flex-shrink-0 w-16 h-16 flex items-center justify-center font-bold text-[22px] transition-all snap-center relative ${rooms === num ? 'bg-[#E2E2E2] text-black scale-125 z-10' : 'bg-[#F9FAFB] text-neutral-400 border border-neutral-100/50 rounded-full'}`}
                                                        >
                                                            {num}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Furniture Assembly Items */}
                                        {order.serviceType === 'furniture_assembly' && (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[25px] font-black text-[#111827] setup-heading">What are we assembling?</label>
                                                    <div className="px-3 py-1 bg-[#F0FDF9] rounded-[5px]">
                                                        <span className="text-[11px] font-black text-[#219178] tracking-wider">Est. {Object.values(assemblyItems).reduce((sum, item) => sum + (item.quantity * item.estHours), 0).toFixed(1)} hrs</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3">
                                                    {[
                                                        { id: 'bed', name: 'Bed Frame', icon: '🛏️', estHours: 1.5 },
                                                        { id: 'desk', name: 'Desk / Table', icon: '🖥️', estHours: 1.2 },
                                                        { id: 'dresser', name: 'Dresser / Cabinet', icon: '📦', estHours: 2.0 },
                                                        { id: 'bookshelf', name: 'Bookshelf', icon: '📚', estHours: 0.8 },
                                                        { id: 'wardrobe', name: 'Wardrobe', icon: '👗', estHours: 3.0 },
                                                        { id: 'other', name: 'Other Item', icon: '✨', estHours: 1.0 },
                                                    ].map((item) => (
                                                        <div key={item.id} className="bg-white p-5 rounded-[5px] border border-neutral-100 flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-2xl">{item.icon}</span>
                                                                <div>
                                                                    <p className="text-[15px] font-black text-[#111827]">{item.name}</p>
                                                                    <p className="text-[12px] font-bold text-black/40">~{item.estHours} hr per unit</p>
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
                                                    <h3 className="text-[25px] font-bold text-[#111827] setup-heading">How many TVs do you need installed?*</h3>
                                                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                                        {[1, 2, 3, 4, 5].map((num) => (
                                                            <button
                                                                key={num}
                                                                onClick={() => setTvCount(num)}
                                                                className={`flex-shrink-0 w-16 h-16 flex items-center justify-center font-bold text-[22px] transition-all rounded-full ${tvCount === num ? 'bg-[#219178] text-white scale-110 shadow-lg' : 'bg-[#F9FAFB] text-neutral-400 border border-neutral-100'}`}
                                                            >
                                                                {num}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* 3. Lifting Help */}
                                                <div className="space-y-6">
                                                    <div>
                                                        <h3 className="text-[25px] font-bold text-[#111827] setup-heading">Lifting assistance*</h3>
                                                        <p className="text-[13px] font-bold text-black/40 mt-1 italic">Larger TVs (60" +) may require a second person for safe mounting.</p>
                                                    </div>
                                                    <div className="grid gap-3">
                                                        {[
                                                            { id: 'yes', label: 'Someone will be around' },
                                                            { id: 'no_60', label: 'No one. 1 or more TVs above 60"' },
                                                            { id: 'not_needed', label: 'Not needed. No TVs above 60"' },
                                                            { id: 'unsure', label: 'Unsure if needed' }
                                                        ].map((opt) => (
                                                            <button
                                                                key={opt.id}
                                                                onClick={() => setLiftingHelp(opt.id)}
                                                                className={`p-5 rounded-[5px] border-2 text-left transition-all flex items-center justify-between ${liftingHelp === opt.id ? 'border-[#219178] bg-[#F0FDF9]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                            >
                                                                <span className="text-[16px] font-bold text-[#111827]">{opt.label}</span>
                                                                {liftingHelp === opt.id && <Check size={20} className="text-[#219178]" strokeWidth={3} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* 4. Mount Type */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[25px] font-bold text-[#111827] setup-heading">What type of TV mount?*</h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            'Fixed / low profile',
                                                            'Tilting',
                                                            'Articulating / full motion',
                                                            'Other / Not sure'
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
                                                                className={`px-6 py-3 rounded-full border-2 font-bold text-[13px] transition-all flex items-center gap-2 ${mountTypes.includes(type) ? 'border-[#219178] bg-[#F0FDF9] text-[#219178]' : 'border-neutral-100 text-black'}`}
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
                                                        <h3 className="text-[25px] font-bold text-[#111827] setup-heading">Wall material?*</h3>
                                                        <p className="text-[13px] font-black text-black/50 mt-1 leading-relaxed">
                                                            Test by knocking: Hollow sound = drywall/wood. No echo = brick/concrete.
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {[
                                                            'Drywall, plaster, or wood',
                                                            'Brick or concrete',
                                                            'Metal',
                                                            'Other / not sure'
                                                        ].map((mat) => (
                                                            <button
                                                                key={mat}
                                                                onClick={() => setWallMaterial(mat)}
                                                                className={`p-4 rounded-[5px] border-2 text-left transition-all ${wallMaterial === mat ? 'border-[#219178] bg-[#F0FDF9]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                            >
                                                                <span className="text-[14px] font-bold text-[#111827]">{mat}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Divider / Call to Action */}
                                                <div className="py-4 border-y border-neutral-100 text-center space-y-2">
                                                    <p className="text-[15px] font-black text-black">Help Taskers Say “Yes” Faster</p>
                                                    <p className="text-[12px] font-bold text-black/40">A little extra detail now means quicker task acceptance.</p>
                                                </div>

                                                {/* 6. Add-ons */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[25px] font-bold text-[#111827] setup-heading">Add-on services?</h3>
                                                    <div className="grid gap-3">
                                                        {[
                                                            { id: 'wires', label: 'Hide wires behind the wall' },
                                                            { id: 'audio', label: 'Install speakers or soundbars' },
                                                            { id: 'setup', label: 'Device & accessory setup' }
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
                                                                className={`p-5 rounded-[5px] border-2 text-left transition-all flex items-center justify-between ${mountingAddOns.includes(add.id) ? 'border-[#219178] bg-[#F0FDF9]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                            >
                                                                <span className="text-[16px] font-bold text-[#111827]">{add.label}</span>
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${mountingAddOns.includes(add.id) ? 'bg-[#219178] border-[#219178]' : 'border-neutral-300'}`}>
                                                                    {mountingAddOns.includes(add.id) && <Check size={14} className="text-white" strokeWidth={4} />}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Home Repairs & Plumbing Specialized Sections */}
                                        {(order.serviceType === 'home_repairs' || order.serviceType === 'plumbing') && (
                                            <div className="space-y-10">
                                                {/* Header for Sub-service */}
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-[25px] font-black text-[#111827]">
                                                        {SERVICES_HIERARCHY[order.serviceType as keyof typeof SERVICES_HIERARCHY]?.subServices.find(s => s.id === order.subServiceId)?.name || 'Task details'}
                                                    </h3>

                                                </div>

                                                {/* Task Size Selector */}
                                                <div className="space-y-6">
                                                    <p className="text-[18px] font-black text-[#111827]">How big is your task?</p>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { id: 'small', label: 'Small', desc: 'Est. 1 hr', hours: 1 },
                                                            { id: 'medium', label: 'Medium', desc: 'Est. 2-3 hrs', hours: 2.5 },
                                                            { id: 'large', label: 'Large', desc: 'Est. 4+ hrs', hours: 4 },
                                                        ].map((size) => (
                                                            <button
                                                                key={size.id}
                                                                onClick={() => setTaskDuration(size.hours)}
                                                                className={`p-5 rounded-[5px] border-2 text-left transition-all flex items-center justify-between ${taskDuration === size.hours ? 'border-[#219178] bg-[#F1FEF4]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                            >
                                                                <div>
                                                                    <p className="text-[17px] font-bold text-[#111827]">{size.label}</p>
                                                                    <p className="text-[13px] font-medium text-[#6B7280]">{size.desc}</p>
                                                                </div>
                                                                {taskDuration === size.hours && <Check size={20} className="text-[#219178]" strokeWidth={3} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Photo Uploads */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between ">
                                                <label className="text-[25px]  font-bold text-[#111827] setup-heading">
                                                    {order.subServiceId?.toLowerCase().includes('tv') ? "Wall & Area Photos" :
                                                        order.serviceType === 'mounting' ? "Task Area Photos" :
                                                            order.serviceType === 'moving' ? "Inventory Photos" :
                                                                order.serviceType === 'cleaning' ? "Room Photos" :
                                                                    "Include Photos"}
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
                                                    <label className="aspect-square rounded-[10px] border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-neutral-50 hover:border-[#219178]/30 active:scale-95">
                                                        <input type="file" multiple hidden accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
                                                        {isUploading ? (
                                                            <Loader2 size={24} className="animate-spin text-[#219178]" />
                                                        ) : (
                                                            <>
                                                                <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center">
                                                                    <ImageIcon size={20} className="text-[#9CA3AF]" />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-[#9CA3AF] tracking-[0.5px]">Add photo</span>
                                                            </>
                                                        )}
                                                    </label>
                                                )}
                                            </div>
                                        </div>

                                        {/* Optional Note */}
                                        <div className="space-y-6 pb-1">
                                            <label className="text-[25px] font-bold text-[#111827] ">Instructions or Notes</label>
                                            <textarea
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                placeholder="Tell us more about what needs to be done..."
                                                className="w-full h-40 p-6 bg-[#F9FAFB] rounded-[5px] border border-neutral-100 outline-none focus:border-[#219178]/30 transition-all resize-none font-medium text-[15px] leading-relaxed placeholder:text-[#9CA3AF] placeholder:italic"
                                            />
                                        </div>

                                        {/* Save as Favorite */}
                                        {selectedProfileId === 'new' && user && (
                                            <div className="p-5 bg-[#FFFFFF] rounded-[5px] border border-[#219178]/10 mb-12">
                                                <label className="flex items-center gap-4 cursor-pointer">
                                                    <div className={`w-6 h-6 rounded-[5px] border-2 transition-all flex items-center justify-center ${saveAsFavorite ? 'bg-[#219178] border-[#219178]' : 'bg-white border-neutral-300'}`}>
                                                        <input type="checkbox" hidden checked={saveAsFavorite} onChange={() => setSaveAsFavorite(!saveAsFavorite)} />
                                                        {saveAsFavorite && <Check size={16} color="white" strokeWidth={4} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[15px] font-bold text-[#111827]">Save this setup for next time</p>
                                                        <p className="text-[12px] font-bold text-[#9CA3AF]">You won't have to enter these details again.</p>
                                                    </div>
                                                </label>
                                                <AnimatePresence>
                                                    {saveAsFavorite && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="mt-4 pt-4 border-t border-[#219178]/10"
                                                        >
                                                            <input
                                                                type="text"
                                                                placeholder="Home, Office, Mom's House..."
                                                                onChange={(e) => setFavoriteLabel(e.target.value)}
                                                                className="w-full p-4 bg-white rounded-[5px] border border-neutral-100 outline-none font-bold text-[14px] focus:border-[#219178]/30 transition-all"
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
                            <div className="bg-[#F2F2F2] w-full pt-12 pb-48 px-10 space-y-8 relative">
                                {/* Wave Top Effect for Summary Transition */}
                                <div className="absolute top-[-40px] left-0 right-0 h-[40px] z-10 pointer-events-none">
                                    <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full fill-[#F2F2F2]">
                                        <path d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                                    </svg>
                                </div>

                                <h3 className="text-[28px] font-black text-[#111827]">Summary</h3>

                                {estimate && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[18px] font-medium text-black/60">Base price</span>
                                                <button className="w-4 h-4 rounded-full border border-neutral-300 flex items-center justify-center text-[10px] text-neutral-400 font-bold">i</button>
                                            </div>
                                            <span className="text-[18px] font-black text-black">{estimate.basePrice.toFixed(1)} MAD</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[18px] font-medium text-black/60">Travel coverage <span className="text-[14px] text-black/30">(1.6 km)</span></span>
                                            <span className="text-[18px] font-black text-black">4.0 MAD</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[18px] font-medium text-black/60">Service fee</span>
                                                <button className="w-4 h-4 rounded-full border border-neutral-300 flex items-center justify-center text-[10px] text-neutral-400 font-bold">i</button>
                                            </div>
                                            <span className="text-[18px] font-black text-black">1.5 MAD</span>
                                        </div>
                                        <div className="h-px bg-neutral-200/50 w-full" />

                                        {/* Total Section */}
                                        <div className="flex items-center justify-between py-2">
                                            <span className="text-[25px] font-black text-black">Total to pay</span>
                                            <span className="text-[28px] font-black text-black">{estimate.total.toFixed(2)} MAD</span>
                                        </div>

                                        {!isErrand && (
                                            <div className="pt-10">
                                                <motion.button
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={handleContinue}
                                                    disabled={isSubmitting}
                                                    className="w-full py-5 bg-[#219178] text-white rounded-full font-black text-[20px] flex items-center justify-center gap-3 disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Confirm Order"}
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
                                <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full fill-[#FFB700]">
                                    <path d="M0,64L48,64C96,64,192,64,288,64C384,64,480,64,576,53.3C672,43,768,21,864,16C960,10.7,1056,21.3,1152,42.7C1248,64,1344,96,1392,112L1440,128L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"></path>
                                </svg>
                            </div>
                            <div className="bg-[#FFB700] p-6 pb-12 pointer-events-auto">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleContinue}
                                    disabled={isSubmitting || isUploading}
                                    className="w-full h-15 bg-[#219178] text-white rounded-full font-black text-[20px] flex items-center justify-center gap-3 transition-all py-5 "
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 size={24} className="animate-spin" />
                                            <span>Processing...</span>
                                        </div>
                                    ) : (
                                        <span>Broadcast Order</span>
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
                                            placeholder={`Search for ${activeDrawer === 'pickup' ? 'pickup' : 'delivery'} address...`}
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
                                            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-neutral-400 active:scale-95 shadow-sm border border-neutral-100"
                                        >
                                            <MapIcon size={16} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <h2 className="flex-1 text-[18px] font-black text-[#111827] text-center pr-10">
                                    {activeDrawer === 'description' && "Your order"}
                                    {activeDrawer === 'recipient' && "Add a recipient"}
                                    {activeDrawer === 'schedule' && "Schedule delivery"}
                                </h2>
                            )}
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                            {activeDrawer === 'description' && (
                                <div className="space-y-6 pb-20">
                                    <div className="bg-[#F9FAFB] p-5 rounded-[10px] border border-neutral-100">
                                        <p className="text-[15px] font-medium text-[#000000] leading-relaxed">
                                            Couriers cannot make purchases. Orders involving purchases will be cancelled.
                                        </p>
                                    </div>
                                    <textarea
                                        autoFocus
                                        value={itemDescription}
                                        onChange={(e) => setItemDescription(e.target.value)}
                                        placeholder="Enter details of what needs to be transported..."
                                        className="w-full h-48 p-5 bg-white rounded-[10px] border-2 border-neutral-100 focus:border-[#219178] focus:ring-0 font-medium text-[17px] placeholder:text-neutral-300 resize-none"
                                    />
                                </div>
                            )}

                            {activeDrawer === 'recipient' && (
                                <div className="space-y-6 pb-20">
                                    <div className="space-y-4">
                                        <label className="text-[14px] font-black text-[#4B5563]">Recipient name</label>
                                        <input
                                            type="text"
                                            value={recipientName}
                                            onChange={(e) => setRecipientName(e.target.value)}
                                            placeholder="Who is receiving this?"
                                            className="w-full p-4 rounded-[10px] border-2 border-neutral-50 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[14px] font-black text-[#4B5563]">Phone number</label>
                                        <div className="flex gap-2">
                                            <div className="px-4 py-4 bg-neutral-50 rounded-[10px] font-bold border-2 border-neutral-50">+212</div>
                                            <input
                                                type="tel"
                                                value={recipientPhone}
                                                onChange={(e) => setRecipientPhone(e.target.value)}
                                                placeholder="Phone number"
                                                className="flex-1 p-4 rounded-[10px] border-2 border-neutral-50 font-bold"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[12px] font-bold text-neutral-400 leading-relaxed">
                                        By sharing the recipient's details, you are solely responsible for obtaining their consent and informing them on how their data is processed.
                                    </p>
                                </div>
                            )}

                            {activeDrawer === 'schedule' && (
                                <div className="space-y-8 flex flex-col pb-24">
                                    <div className="flex-1 space-y-8">
                                        {/* Select Date */}
                                        <div className="space-y-4">
                                            <h3 className="text-[20px] font-black text-[#111827]">Select date</h3>
                                            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
                                                {Array.from({ length: 7 }).map((_, i) => {
                                                    const d = new Date();
                                                    d.setDate(d.getDate() + i);
                                                    const dateStr = format(d, 'd MMM');
                                                    const fullDate = format(d, 'yyyy-MM-dd');
                                                    const isSelected = deliveryDate === fullDate;

                                                    let label = format(d, 'EEEE');
                                                    if (i === 0) label = 'Today';
                                                    if (i === 1) label = 'Tomorrow';

                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => setDeliveryDate(fullDate)}
                                                            className={`flex-shrink-0 min-w-[140px] h-[90px] p-5 rounded-[10px] border-2 transition-all text-left relative ${isSelected ? 'border-black bg-white' : 'border-neutral-100 bg-white'}`}
                                                        >
                                                            <div className="flex flex-col justify-between h-full">
                                                                <p className="text-[17px] font-black text-[#111827]">{label}</p>
                                                                <p className="text-[14px] font-bold text-neutral-400">{dateStr}</p>
                                                            </div>
                                                            {isSelected && (
                                                                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#219178] flex items-center justify-center">
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
                                            <h3 className="text-[20px] font-black text-[#111827]">Select time</h3>
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
                                                                <div className="w-6 h-6 rounded-full bg-[#219178] flex items-center justify-center">
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
                                                    {dropoffLocation.address?.split(',')[0] || "Select Point"}
                                                </span>
                                                <button
                                                    onClick={() => setActiveDrawer('none')}
                                                    className="pointer-events-auto text-[13px] font-black text-[#219178] py-0.5"
                                                >
                                                    Use this point
                                                </button>
                                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-neutral-100 rotate-45" />
                                            </div>
                                        </div>

                                        <div className="absolute bottom-[40px] right-6 z-[1001]">
                                            <button
                                                onClick={() => setGpsTrigger(prev => prev + 1)}
                                                className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-black active:scale-95 transition-all shadow-lg border border-neutral-50"
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
                                                <p className="text-[15px] font-light text-neutral-800">Trouble locating your address?</p>
                                                <p className="text-[13px] font-medium text-neutral-400">Try using search instead</p>
                                            </div>

                                            <button
                                                onClick={() => setActiveDrawer('dropoff')}
                                                className="w-full h-14 bg-neutral-100 rounded-full px-6 flex items-center gap-3 text-neutral-400 group active:bg-neutral-200 transition-all font-light"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-neutral-400">
                                                    <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                Search street, city, district...
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
                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                    <MapPin size={20} className="text-[#219178]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[15px] font-black text-[#111827] truncate">{r.address.split(',')[0]}</p>
                                                    <p className="text-[13px] font-medium text-neutral-400 truncate">{r.address.split(',').slice(1).join(',').trim()}</p>
                                                </div>
                                            </button>
                                        )) : (
                                            <div className="py-12 text-center space-y-3 opacity-40">
                                                <Search size={40} className="mx-auto text-neutral-300" />
                                                <p className="text-[15px] font-medium text-neutral-400">Search for a street, city or district...</p>
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
                                        className="w-full py-5 bg-[#219178] text-white rounded-full font-black text-[18px] active:scale-95 transition-all"
                                    >
                                        {activeDrawer === 'schedule' ? 'Confirm' : 'Save Details'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
