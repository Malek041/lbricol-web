'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, X, Check, Home,
    Briefcase, Image as ImageIcon, Trash2,
    Save, Loader2, Sparkles, AlertCircle,
    MapPin, Calendar, Clock, User, Navigation
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
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<ServiceProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('new');

    // Form State
    const [activeTab, setActiveTab] = useState<'setup' | 'details'>('details');

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
        reviews: [] as any[]
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
                    // Find relevant service by category OR subService ID
                    const relevantService = data.services?.find((s: any) => 
                        s.categoryId === order.serviceType || 
                        s.id === order.serviceType || 
                        s.id === order.subServiceId
                    );
                    const servicePortfolio = relevantService?.portfolioImages || [];

                    setProvider(prev => ({
                        ...prev,
                        bio: data.bio || prev.bio,
                        yearsOfExperience: data.yearsOfExperience || prev.yearsOfExperience,
                        portfolio: servicePortfolio.length > 0 ? servicePortfolio : (data.portfolio || []),
                        equipments: relevantService?.equipments || [],
                        reviews: data.reviews || [],
                        rating: data.rating || prev.rating,
                        taskCount: data.taskCount || prev.taskCount
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

                        const durationInMinutes = Math.ceil(durationMinutes);
                        const sub = durationInMinutes * 10;
                        const total = Math.round(sub * 1.1);

                        setEstimate({
                            basePrice: 10,
                            quantity: durationInMinutes,
                            unit: 'min',
                            subtotal: sub,
                            serviceFee: Math.round(sub * 0.1),
                            total: total,
                            duration: durationInMinutes
                        } as any);
                    } catch (e) {
                        console.warn("Pricing calculation failed", e);
                    }
                };
                fetchDist();
            } else {
                setEstimate(null);
            }
        } else if (order.serviceType === 'moving' || order.serviceType?.includes('moving')) {
            const duration = taskSize === 'small' ? 1.5 : taskSize === 'medium' ? 3 : 5;
            const rate = provider.minRate || 100;
            const subtotal = duration * rate;

            if (pickupLocation.lat && dropoffLocation.lat) {
                const fetchDist = async () => {
                    const { distanceKm, durationMinutes } = await getRoadDistance(
                        pickupLocation.lat!, pickupLocation.lng!,
                        dropoffLocation.lat!, dropoffLocation.lng!
                    );
                    const travelCost = durationMinutes * 10;
                    let finalSub = subtotal + travelCost;
                    if (distanceKm > 10) {
                        finalSub += Math.round((distanceKm - 10) * 5);
                    }
                    const total = Math.round(finalSub * 1.1);
                    setEstimate({
                        basePrice: rate,
                        quantity: duration,
                        unit: 'hour',
                        subtotal: finalSub,
                        serviceFee: Math.round(finalSub * 0.1),
                        total: total,
                        duration: Math.round(durationMinutes)
                    } as any);
                };
                fetchDist();
            } else {
                const total = Math.round(subtotal * 1.1);
                setEstimate({
                    basePrice: rate,
                    quantity: duration,
                    unit: 'hour',
                    subtotal: subtotal,
                    serviceFee: Math.round(subtotal * 0.1),
                    total: total,
                    duration: 0 // No distance yet
                } as any);
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
                    order.serviceType,
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
    }, [order.serviceType, order.subServiceId, order.providerRate, order.isPublic, rooms, propertyType, pickupLocation, dropoffLocation, deliveryType, assemblyItems, taskSize, taskDuration, selectedSlots]);

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
        if (selectedSlots.length === 0) {
            alert("Please select at least one date and time for your order.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Update Context
            const slotsToSave = selectedSlots.map(s => ({
                date: s.date.toISOString(),
                time: s.time
            }));

            // Save first one to scheduledDate/Time for backward compat
            setOrderField('scheduledDate', slotsToSave[0].date);
            setOrderField('scheduledTime', slotsToSave[0].time);
            setOrderField('multiSlots', slotsToSave);

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
                taskSize
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
                            className={`flex-1 py-4 text-[14px] font-black transition-all relative ${activeTab === 'details' ? 'text-[#219178]' : 'text-[#9CA3AF]'}`}
                        >
                            Bricoler Details
                            {activeTab === 'details' && (
                                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#219178]" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('setup')}
                            className={`flex-1 py-4 text-[14px] font-black transition-all relative ${activeTab === 'setup' ? 'text-[#219178]' : 'text-[#9CA3AF]'}`}
                        >
                            Order Setup
                            {activeTab === 'setup' && (
                                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#219178]" />
                            )}
                        </button>
                    </div>
                )}
            </header>

            <main className="flex-1 overflow-y-auto pb-0 no-scrollbar bg-white">
                <AnimatePresence mode="wait">
                    {activeTab === 'details' ? (
                        <motion.div
                            key="details"
                            variants={staggerContainer}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, x: 10 }}
                            className="px-6 py-8 relative"
                        >
                            {/* Profile Hero */}
                            <motion.div variants={staggerItem} className="flex gap-6 mb-8 items-start">
                                <img src={provider.avatar} className="w-24 h-24 rounded-[15px] object-cover border-4 border-[#F9FAFB]" />
                                <div className="flex-1">
                                    <h2 className="text-[24px] font-black text-[#111827] mb-2">{provider.name}</h2>
                                    <div className="flex flex-wrap gap-2 mb-3 items-center">
                                        <span className="bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-black px-3 py-1 rounded-[5px] flex items-center gap-1 tracking-wider">
                                            ✦ {provider.rank}
                                        </span>
                                        <div className="flex items-center gap-1 bg-[#FFFBEB] px-2 py-1 rounded-[5px] border border-[#FEF3C7]">
                                            <Sparkles size={10} className="text-[#FBBF24] fill-[#FBBF24]" />
                                            <span className="text-[11px] font-black text-[#92400E]">
                                                {provider.taskCount === 0 ? "0.0" : provider.rating.toFixed(1)}
                                            </span>
                                        </div>
                                        <span className="text-[13px] text-[#6B7280] font-bold flex items-center gap-1">
                                            {provider.taskCount} Missions
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2 text-[#219178]">
                                        <span className="text-[20px] font-black">MAD {provider.minRate}</span>
                                        <span className="text-[14px] font-bold text-[#6B7280]">(min)</span>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Stats Grid */}
                            <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3 mb-8">
                                <div className="p-4 bg-[#F9FAFB] rounded-[5px] border border-neutral-100">
                                    <div className="text-[11px] font-black text-[#9CA3AF] tracking-wider mb-1">Experience</div>
                                    <div className="text-[17px] font-black text-[#111827]">{provider.yearsOfExperience}</div>
                                </div>
                                <div className="p-4 bg-[#F9FAFB] rounded-[5px] border border-neutral-100">
                                    <div className="text-[11px] font-black text-[#9CA3AF] tracking-wider mb-1">Success Rate</div>
                                    <div className="text-[17px] font-black text-[#111827]">99%</div>
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

                            {/* About */}
                            <motion.div variants={staggerItem} className="mb-10">
                                <h4 className="text-[18px] font-black text-[#111827] mb-4">About Me</h4>
                                <div className="text-[15px] text-[#4B5563] leading-relaxed font-medium p-6 bg-[#F9FAFB] rounded-[5px] border border-neutral-100 italic">
                                    "{provider.bio}"
                                </div>
                            </motion.div>

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
                                            <p className="text-[#9CA3AF] font-black text-[10px] tracking-[2px]">Awaiting first reviews on the app</p>
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

                            {/* Floating "Book Me" Button wrapper with Wave */}
                            <div className="fixed bottom-0 left-0 right-0 z-[100] bg-transparent">
                                {/* Wave Top Effect */}
                                <div className="absolute top-[-30px] left-0 right-0 h-[30px] z-10 pointer-events-none">
                                    <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full fill-[#E2E2E2]">
                                        <path d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                                    </svg>
                                </div>
                                <div className="bg-[#E2E2E2] p-6 pb-8">
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            setActiveTab('setup');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="w-full h-15 bg-[#219178] text-white rounded-full font-black text-[20px] flex items-center justify-center gap-3 transition-all py-5"
                                    >
                                        <span>Book me</span>
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="setup"
                            variants={staggerContainer}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, x: -10 }}
                            className="px-6 space-y-10 mt-6"
                        >


                            {/* Saved Profiles */}
                            {profiles.length > 0 && (
                                <motion.section variants={staggerItem}>
                                    <h3 className="text-[18px] font-black text-[#111827] mb-5 px-1 flex items-center gap-2">
                                        <Home size={20} className="text-[#219178]" />
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
                                            className={`flex-shrink-0 px-6 py-4 rounded-full border-1 transition-all flex items-center gap-3 ${selectedProfileId === 'new' ? 'border-[#219178] bg-[#F0FDF9] text-[#219178]' : 'border-neutral-100 bg-white text-[#9CA3AF]'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedProfileId === 'new' ? 'bg-[#219178] text-white' : 'bg-neutral-100'}`}>
                                                <span className="text-xl font-light mb-0.5">+</span>
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
                                                className={`flex-shrink-0 px-6 py-4 rounded-full border-2 transition-all flex items-center gap-3 min-w-[200px] ${selectedProfileId === p.id ? 'border-[#219178] bg-[#F0FDF9] text-[#219178]' : 'border-neutral-100 bg-white text-[#111827]'}`}
                                            >

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
                            <motion.section variants={staggerItem} className="space-y-10">
                                {(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) ? (
                                    <div className="space-y-10">
                                        {/* Purchase Disclaimer Banner */}
                                        <div className="bg-[#FFFBEB] p-5 rounded-[5px] flex items-start gap-4 border border-[#FEF3C7]">
                                            <div className="w-10 h-10 rounded-[5px] bg-white flex items-center justify-center flex-shrink-0">
                                                <AlertCircle size={20} className="text-[#92400E]" />
                                            </div>
                                            <p className="text-[13px] font-bold text-[#92400E] leading-relaxed">
                                                The courier cannot purchase products for you. If you ask them to do so, the order will be cancelled.
                                            </p>
                                        </div>

                                        {/* Item Description Section */}
                                        <div className="space-y-4">
                                            <h3 className="text-[18px] font-medium text-[#111827]">Your order</h3>
                                            <button
                                                onClick={() => setActiveDrawer('description')}
                                                className="w-full p-5 bg-[#F9FAFB] rounded-[5px] border border-neutral-100/80 flex items-center justify-between group active:scale-[0.99] transition-all"
                                            >
                                                <div className="flex items-center gap-4 text-left">
                                                    <div className="w-10 h-10 rounded-[5px] bg-white flex items-center justify-center text-[#111827]">
                                                        <Briefcase size={20} className="text-[#219178]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[15px] font-black text-[#111827]">
                                                            {itemDescription || "What do you need transporting?"}
                                                        </p>
                                                        <p className="text-[12px] font-bold text-[#9CA3AF]">Purchases aren't allowed</p>
                                                    </div>
                                                </div>
                                                <ChevronLeft className="rotate-180 text-neutral-300 group-hover:text-[#219178] transition-colors" size={20} />
                                            </button>
                                        </div>

                                        {/* Delivery Details Section */}
                                        <div className="space-y-4">
                                            <h3 className="text-[18px] font-medium text-[#111827]">Delivery details</h3>

                                            <div className="h-48 bg-[#F3F4F6] rounded-[5px] border border-neutral-100/80 relative overflow-hidden">
                                                {pickupLocation.address && dropoffLocation.address ? (
                                                    <MapView
                                                        initialLocation={order.location || { lat: 31.5085, lng: -9.7595 }}
                                                        interactive={false}
                                                        onLocationChange={() => { }}
                                                        lockCenterOnFocus={true}
                                                        showCenterPin={false}
                                                        zoom={14}
                                                    />
                                                ) : (
                                                    <>
                                                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#219178 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' }} />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <MapPin className="text-[#219178] opacity-20" size={32} />
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <div className="grid gap-2">
                                                <button
                                                    onClick={() => setActiveDrawer('pickup')}
                                                    className="w-full p-5 flex items-center justify-between bg-[#F9FAFB] rounded-full border border-neutral-100/80 transition-all active:scale-[0.99]"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <img src="/Images/Icons/Lightpin.png" alt="pin" className="w-5 h-5 object-contain" />
                                                        <span className={`text-[15px] font-light ${pickupLocation.address ? 'text-[#111827]' : 'text-neutral-300'}`}>
                                                            {pickupLocation.address || "Where from?"}
                                                        </span>
                                                    </div>
                                                    <ChevronLeft className="rotate-180 text-neutral-300" size={18} />
                                                </button>

                                                <button
                                                    onClick={() => setActiveDrawer('dropoff')}
                                                    className="w-full p-5 flex items-center justify-between bg-[#F9FAFB] rounded-full border border-neutral-100/80 transition-all active:scale-[0.99]"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <img src="/Images/Icons/Lightpin.png" alt="pin" className="w-5 h-5 object-contain" />
                                                        <span className={`text-[15px] font-light ${dropoffLocation.address ? 'text-[#111827]' : 'text-neutral-300'}`}>
                                                            {dropoffLocation.address || "Where to?"}
                                                        </span>
                                                    </div>
                                                    <ChevronLeft className="rotate-180 text-neutral-300" size={18} />
                                                </button>

                                                <button
                                                    onClick={() => setActiveDrawer('recipient')}
                                                    className="w-full p-5 flex items-center justify-between bg-[#F9FAFB] rounded-full border border-neutral-100/80 transition-all active:scale-[0.99]"
                                                >
                                                    <div className="flex items-center gap-4 text-left">
                                                        <div className="w-10 h-10 rounded-[5px] bg-white flex items-center justify-center">
                                                            <User size={20} className="text-[#219178]" />
                                                        </div>
                                                        <div>
                                                            <p className={`text-[15px] font-bold ${recipientName ? 'text-[#111827]' : 'text-neutral-300'}`}>
                                                                {recipientName ? `Sending to ${recipientName}` : "Sending to someone else?"}
                                                            </p>
                                                            <p className="text-[12px] font-bold text-[#9CA3AF]">Add their details to help the courier</p>
                                                        </div>
                                                    </div>
                                                    <ChevronLeft className="rotate-180 text-neutral-300" size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Delivery Options */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-[18px] font-black text-[#111827]">Delivery options</h3>
                                            </div>
                                            <div className="p-6 bg-[#F9FAFB] rounded-[5px] border border-neutral-100/80">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-[5px] bg-white flex items-center justify-center">
                                                            <Clock size={20} className="text-[#219178]" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[15px] font-black text-[#111827]">
                                                                {deliveryType === 'standard' ? "Standard" : "Scheduled"}
                                                            </p>
                                                            <p className="text-[13px] font-bold text-[#6B7280]">
                                                                {deliveryType === 'standard' ? "As soon as possible" : `${deliveryDate} at ${deliveryTime}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setActiveDrawer('schedule')} className="w-9 h-9 rounded-full bg-white border border-neutral-100 flex items-center justify-center active:scale-95 transition-all">
                                                        <ChevronLeft className="-rotate-90 text-neutral-300" size={18} />
                                                    </button>
                                                </div>

                                                {deliveryType === 'standard' && (
                                                    <div className="space-y-2 pt-4 border-t border-neutral-100/60">
                                                        <div className="p-4 bg-white rounded-[5px] flex items-center justify-between ring-1 ring-[#219178]/5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-6 h-6 rounded-full bg-[#219178] flex items-center justify-center">
                                                                    <Check size={12} className="text-white" strokeWidth={4} />
                                                                </div>
                                                                <span className="text-[14px] font-black text-[#111827]">Asap <span className="font-bold opacity-60 ml-1">Standard</span></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Availability Picker */}
                                        <div className="space-y-6">
                                            <h3 className="text-[25px] text-[#000000] font-bold">When do you need the Bricoler?</h3>
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
                                                    <h3 className="text-[25px] text-black font-bold">How big is the move?</h3>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { id: 'small', name: 'Small', desc: 'A few items or 1 room', duration: '1.5h' },
                                                            { id: 'medium', name: 'Medium', desc: '2-3 rooms / Small apartment', duration: '3h' },
                                                            { id: 'large', name: 'Large', desc: '4+ rooms / Big house', duration: '5h+' },
                                                        ].map((size) => (
                                                            <button
                                                                key={size.id}
                                                                onClick={() => setTaskSize(size.id as any)}
                                                                className={`p-5 rounded-full border-2 text-left transition-all flex items-center justify-between ${taskSize === size.id ? 'border-[#219178] bg-[#F0FDF9]' : 'border-neutral-100 bg-[#F9FAFB]'}`}
                                                            >
                                                                <div className="pl-4">
                                                                    <p className="font-black text-[17px] text-black">{size.name}</p>
                                                                    <p className="font-bold text-[13px] text-black/60">{size.desc}</p>
                                                                </div>
                                                                <div className="text-right pr-4">
                                                                    <p className="font-black text-[15px] text-[#219178]">Est. {size.duration}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Route Section (Pic 4 Style) */}
                                                <div className="space-y-6">
                                                    <h3 className="text-[25px] text-black font-bold">Delivery details</h3>

                                                    {/* Compact Map Card */}
                                                    <div className="h-[180px] bg-[#F3F4F6] rounded-[5px] border border-neutral-100 overflow-hidden relative">
                                                        <MapView
                                                            initialLocation={order.location || { lat: 31.5085, lng: -9.7595 }}
                                                            interactive={false}
                                                            onLocationChange={() => { }}
                                                            lockCenterOnFocus={true}
                                                            showCenterPin={false}
                                                            zoom={14}
                                                            clientPin={pickupLocation.lat ? { lat: pickupLocation.lat, lng: pickupLocation.lng! } : undefined}
                                                            destinationPin={dropoffLocation.lat ? { lat: dropoffLocation.lat, lng: dropoffLocation.lng! } : undefined}
                                                        />
                                                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/10 to-transparent" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        {/* Where from? */}
                                                        <button
                                                            onClick={() => setActiveDrawer('pickup')}
                                                            className="w-full p-5 flex items-center justify-between group bg-[#F9FAFB] rounded-full border border-neutral-100 transition-all active:scale-[0.99]"
                                                        >
                                                            <div className="flex items-center gap-4 text-left pl-2">
                                                                <div className="w-6 h-6 flex items-center justify-center">
                                                                    <img src="/Images/Icons/Lightpin.png" alt="from" className="w-5 h-5 object-contain" />
                                                                </div>
                                                                <span className={`text-[15px] font-black ${pickupLocation.address ? 'text-black' : 'text-neutral-400'}`}>
                                                                    {pickupLocation.address || "Where from?"}
                                                                </span>
                                                            </div>
                                                            <ChevronRight className="text-neutral-300 group-hover:text-black transition-colors" size={18} />
                                                        </button>

                                                        {/* Where to? */}
                                                        <button
                                                            onClick={() => setActiveDrawer('map_picker')}
                                                            className="w-full p-5 flex items-center justify-between group bg-[#F9FAFB] rounded-full border border-neutral-100 transition-all active:scale-[0.99]"
                                                        >
                                                            <div className="flex items-center gap-4 text-left pl-2">
                                                                <div className="w-6 h-6 flex items-center justify-center">
                                                                    <img src="/Images/Icons/Lightpin.png" alt="to" className="w-5 h-5 object-contain" />
                                                                </div>
                                                                <span className={`text-[15px] font-black ${dropoffLocation.address ? 'text-black' : 'text-neutral-400'}`}>
                                                                    {dropoffLocation.address || "Where to?"}
                                                                </span>
                                                            </div>
                                                            <ChevronRight className="text-neutral-300 group-hover:text-black transition-colors" size={18} />
                                                        </button>
                                                    </div>

                                                    {pickupLocation.address && dropoffLocation.address && (
                                                        <div className="p-4 bg-[#F9FAFB] rounded-[5px] flex items-center justify-between border border-neutral-100 italic">
                                                            <span className="text-[13px] font-light text-neutral-500">Delivery Estimate</span>
                                                            <span className="text-[13px] font-medium text-black">
                                                                {estimate && 'duration' in estimate ? `${estimate.duration} min delivery` : "Calculating route..."}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Property Type */}
                                        <div className="space-y-6">
                                            <h3 className="text-[25px] text-[#000000] font-bold">What's your property type?</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {['Studio', 'Apartment', 'Villa', 'Guesthouse', 'Riad', 'Hotel'].map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setPropertyType(type)}
                                                        className={`px-8 py-3.5 rounded-full border-2 font-black text-[13px] transition-all ${propertyType === type ? 'border-[#219178] bg-white text-[#219178]' : 'border-neutral-100 text-black'}`}
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
                                                    <label className="text-[25px] font-black text-[#111827] setup-heading">Number of Rooms</label>
                                                    <span className="text-[12px] font-bold text-[#219178] bg-[#F0FDF9] px-4 py-1.5 rounded-full tracking-widest uppercase">
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
                                                            className={`flex-shrink-0 w-16 h-16 flex items-center justify-center font-black text-[22px] transition-all snap-center relative ${rooms === num ? 'bg-[#219178] text-white scale-125 z-10' : 'bg-[#F9FAFB] text-neutral-400 border border-neutral-100/50 rounded-full'}`}
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

                                        {/* Home Repairs & Plumbing Specialized Sections */}
                                        {(order.serviceType === 'home_repairs' || order.serviceType === 'plumbing') && (
                                            <div className="space-y-10">
                                                {/* Header for Sub-service */}
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-[25px] font-black text-[#111827]">
                                                        {SERVICES_HIERARCHY[order.serviceType as keyof typeof SERVICES_HIERARCHY]?.subServices.find(s => s.id === order.subServiceId)?.name || 'Task details'}
                                                    </h3>
                                                    {SERVICES_HIERARCHY[order.serviceType as keyof typeof SERVICES_HIERARCHY]?.subServices.find(s => s.id === order.subServiceId)?.pricingArchetype === 'hourly' && (
                                                        <div className="px-3 py-1 bg-[#F0FDF9] rounded-[5px]">
                                                            <span className="text-[11px] font-black text-[#219178] tracking-wider">Hourly task</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Duration Selector for Hourly Tasks */}
                                                {SERVICES_HIERARCHY[order.serviceType as keyof typeof SERVICES_HIERARCHY]?.subServices.find(s => s.id === order.subServiceId)?.pricingArchetype === 'hourly' && (
                                                    <div className="space-y-6">
                                                        <p className="text-[15px] font-bold text-[#9CA3AF] setup-heading uppercase tracking-widest">Estimated duration of help</p>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {[1, 2, 3, 4, 6, 8].map((h) => (
                                                                <button
                                                                    key={h}
                                                                    onClick={() => setTaskDuration(h)}
                                                                    className={`py-4 rounded-full border-2 font-black text-[15px] transition-all flex flex-col items-center justify-center gap-0.5 ${taskDuration === h ? 'border-[#219178] bg-[#F0FDF9] text-[#219178]' : 'border-neutral-100 bg-[#F9FAFB] text-black'}`}
                                                                >
                                                                    <span>{h}</span>
                                                                    <span className="text-[9px] font-bold tracking-tighter">hours</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <p className="text-[12px] font-bold text-neutral-300 italic">
                                                            *Final hours will be confirmed with your Bricoler based on the work complexity.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Details Reminder for Fixed Tasks */}
                                                {SERVICES_HIERARCHY[order.serviceType as keyof typeof SERVICES_HIERARCHY]?.subServices.find(s => s.id === order.subServiceId)?.pricingArchetype === 'fixed' && (
                                                    <div className="p-5 bg-[#F9FAFB] rounded-[5px] border border-neutral-100">
                                                        <p className="text-[14px] font-bold text-[#4B5563] leading-relaxed">
                                                            This is a fixed-price task. Please provide clear photos and instructions below so the Bricoler can come prepared.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Photo Uploads */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                    <label className="text-[25px] font-black text-[#111827] setup-heading">Photos of the Property</label>
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
                                                    <label className="aspect-square rounded-[5px] border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-neutral-50 hover:border-[#219178]/30 active:scale-95">
                                                        <input type="file" multiple hidden accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
                                                        {isUploading ? (
                                                            <Loader2 size={24} className="animate-spin text-[#219178]" />
                                                        ) : (
                                                            <>
                                                                <div className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center">
                                                                    <ImageIcon size={20} className="text-[#9CA3AF]" />
                                                                </div>
                                                                <span className="text-[10px] font-black text-[#9CA3AF] tracking-[0.5px]">Add photo</span>
                                                            </>
                                                        )}
                                                    </label>
                                                )}
                                            </div>
                                        </div>

                                        {/* Optional Note */}
                                        <div className="space-y-6 pb-1">
                                            <label className="text-[25px] font-black text-black">Instructions or Notes</label>
                                            <textarea
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                placeholder="Tell us more about what needs to be done..."
                                                className="w-full h-40 p-6 bg-[#F9FAFB] rounded-[5px] border border-neutral-100 outline-none focus:border-[#219178]/30 transition-all resize-none font-black text-[15px] leading-relaxed placeholder:text-[#9CA3AF] placeholder:italic"
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
                                                        <p className="text-[15px] font-black text-[#111827]">Save this setup for next time</p>
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
                                                                placeholder="Label (e.g. My Apartment, Beach Villa)"
                                                                value={favoriteLabel}
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
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* Unfixed Summary Section (Pic 3 Refined) */}
                {activeTab === 'setup' && estimate && (
                    <div className="mt-12 w-full relative">
                        {/* Wave Top Effect */}
                        <div className="absolute top-[-40px] left-0 right-0 h-[40px] z-10 pointer-events-none">
                            <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-full fill-[#F2F2F2]">
                                <path d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                            </svg>
                        </div>

                        <div className="bg-[#F2F2F2] w-full pt-4 pb-12 px-10 space-y-8">
                            <h3 className="text-[28px] font-black text-black">Summary</h3>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[18px] font-medium text-black">Base price</span>
                                        <div className="w-5 h-5 rounded-full border border-neutral-300 flex items-center justify-center text-[10px] text-neutral-400 font-bold">i</div>
                                    </div>
                                    <span className="text-[18px] font-bold text-black">
                                        {estimate.basePrice.toFixed(0)} MAD
                                        {estimate.unit === 'hr' ? '/hr' : estimate.unit === 'day' ? '/day' : estimate.unit === 'unit' ? '/unit' : ''}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[18px] font-medium text-black">Services</span>
                                        <div className="w-5 h-5 rounded-full border border-neutral-300 flex items-center justify-center text-[10px] text-neutral-400 font-bold">i</div>
                                    </div>
                                    <span className="text-[18px] font-bold text-black">{estimate.subtotal.toFixed(2)} MAD</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[18px] font-medium text-black">Lbricol Fee</span>
                                        <div className="w-5 h-5 rounded-full border border-neutral-300 flex items-center justify-center text-[10px] text-neutral-400 font-bold">i</div>
                                    </div>
                                    <span className="text-[18px] font-bold text-black">{estimate.serviceFee.toFixed(2)} MAD</span>
                                </div>
                            </div>

                            <div className="h-px bg-neutral-200/50 w-full" />

                            <div className="flex items-center justify-between">
                                <span className="text-[22px] font-black text-black">Total to pay</span>
                                <span className="text-[25px] font-black text-black">{estimate.total.toFixed(2)} MAD</span>
                            </div>

                            <div className="pt-10">
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleContinue}
                                    disabled={isSubmitting || isUploading}
                                    className="w-full py-5 bg-[#219178] text-white rounded-full font-black text-[20px] flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={24} className="animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        "Pay to order"
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </div>
                )}
            </main>


            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
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
                        <div className="p-6 flex items-center justify-between border-b border-neutral-100">
                            <button onClick={() => setActiveDrawer('none')} className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center">
                                <ChevronLeft size={24} />
                            </button>
                            <h2 className="text-[18px] font-black text-[#111827]">
                                {activeDrawer === 'description' && "Your order"}
                                {activeDrawer === 'recipient' && "Add a recipient"}
                                {activeDrawer === 'schedule' && "Schedule delivery"}
                                {activeDrawer === 'pickup' && "Pickup location"}
                                {activeDrawer === 'dropoff' && "Dropoff location"}
                            </h2>
                            <div className="w-10" />
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeDrawer === 'description' && (
                                <div className="space-y-6">
                                    <div className="bg-[#F9FAFB] p-5 rounded-[5px] border border-neutral-100">
                                        <p className="text-[15px] font-bold text-[#4B5563] leading-relaxed">
                                            Couriers cannot make purchases. Orders involving purchases will be cancelled.
                                        </p>
                                    </div>
                                    <textarea
                                        autoFocus
                                        value={itemDescription}
                                        onChange={(e) => setItemDescription(e.target.value)}
                                        placeholder="Enter details of what needs to be transported..."
                                        className="w-full h-48 p-5 bg-white rounded-[5px] border-2 border-neutral-100 focus:border-[#219178] focus:ring-0 font-bold text-[17px] placeholder:text-neutral-300 resize-none"
                                    />
                                    <button
                                        onClick={() => setActiveDrawer('none')}
                                        className="w-full py-4 bg-[#219178] text-white rounded-full font-black text-[17px]"
                                    >
                                        Save
                                    </button>
                                </div>
                            )}

                            {activeDrawer === 'recipient' && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-[14px] font-black text-[#4B5563]">Recipient name</label>
                                        <input
                                            type="text"
                                            value={recipientName}
                                            onChange={(e) => setRecipientName(e.target.value)}
                                            placeholder="Who is receiving this?"
                                            className="w-full p-4 rounded-[5px] border-2 border-neutral-50 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[14px] font-black text-[#4B5563]">Phone number</label>
                                        <div className="flex gap-2">
                                            <div className="px-4 py-4 bg-neutral-50 rounded-[5px] font-bold border-2 border-neutral-50">+212</div>
                                            <input
                                                type="tel"
                                                value={recipientPhone}
                                                onChange={(e) => setRecipientPhone(e.target.value)}
                                                placeholder="Phone number"
                                                className="flex-1 p-4 rounded-[5px] border-2 border-neutral-50 font-bold"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[12px] font-bold text-neutral-400 leading-relaxed">
                                        By sharing the recipient's details, you are solely responsible for obtaining their consent and informing them on how their data is processed.
                                    </p>
                                    <button
                                        onClick={() => setActiveDrawer('none')}
                                        className="w-full py-4 bg-[#219178] text-white rounded-full font-black text-[17px]"
                                    >
                                        Save
                                    </button>
                                </div>
                            )}

                            {activeDrawer === 'schedule' && (
                                <div className="space-y-6">
                                    <h3 className="text-[16px] font-black text-[#111827]">Select date</h3>
                                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                        {['Today', 'Tomorrow', 'Monday'].map(day => (
                                            <button
                                                key={day}
                                                onClick={() => setDeliveryDate(day)}
                                                className={`px-6 py-3 rounded-full border-2 font-bold transition-all ${deliveryDate === day ? 'border-[#219178] bg-[#219178] text-white' : 'border-neutral-100 text-neutral-400'}`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid gap-2">
                                        <OrderAvailabilityPicker
                                            bricolerId={order.providerId!}
                                            onSelect={(slots) => {
                                                setSelectedSlots(slots);
                                                if (slots.length > 0) {
                                                    setDeliveryDate(format(slots[0].date, 'yyyy-MM-dd'));
                                                    setDeliveryTime(slots[0].time);
                                                    setDeliveryType('schedule');
                                                }
                                            }}
                                            selectedSlots={selectedSlots}
                                        />
                                    </div>


                                    <div className="flex gap-3 pt-6">
                                        <button
                                            onClick={() => {
                                                setDeliveryType('standard');
                                                setActiveDrawer('none');
                                            }}
                                            className="flex-1 py-4 bg-neutral-100 rounded-full font-black text-[17px]"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => setActiveDrawer('none')}
                                            className="flex-1 py-4 bg-[#219178] text-white rounded-full font-black text-[17px]"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeDrawer === 'map_picker' && (
                                <div className="absolute inset-0 flex flex-col bg-white">
                                    <div className="flex-1 relative">
                                        <MapView
                                            initialLocation={dropoffLocation.lat !== null ? { lat: dropoffLocation.lat, lng: dropoffLocation.lng! } : (pickupLocation.lat !== null ? { lat: pickupLocation.lat, lng: pickupLocation.lng! } : { lat: 31.5085, lng: -9.7595 })}
                                            interactive={true}
                                            onLocationChange={(point) => {
                                                setDropoffLocation({ address: point.address, lat: point.lat, lng: point.lng });
                                            }}
                                            showCenterPin={true}
                                            pinY={50}
                                            zoom={16}
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
                                                <span className="text-[14px] font-black text-black leading-none truncate max-w-[200px]">
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

                                        <div className="absolute bottom-[240px] right-6 z-[1001]">
                                            <button
                                                onClick={() => { }}
                                                className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-black active:scale-95 transition-all"
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
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            background: '#F3F4F6', borderRadius: 5, padding: '12px 16px',
                                        }}>
                                            <input
                                                autoFocus
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
                                                    }
                                                }}
                                                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 15, outline: 'none', fontWeight: 600 }}
                                            />
                                            <button
                                                onClick={() => {
                                                    if (navigator.geolocation) {
                                                        navigator.geolocation.getCurrentPosition((pos) => {
                                                            const loc = { address: "Current Location", lat: pos.coords.latitude, lng: pos.coords.longitude };
                                                            if (activeDrawer === 'pickup') setPickupLocation(loc);
                                                            else setDropoffLocation(loc);
                                                            setActiveDrawer('none');
                                                        });
                                                    }
                                                }}
                                                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#219178] active:scale-95"
                                            >
                                                <Navigation size={18} fill="currentColor" />
                                            </button>
                                        </div>
                                        <div className="space-y-2 mt-4">
                                            {searchResults.length > 0 ? searchResults.map((r, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        if (activeDrawer === 'pickup') setPickupLocation(r);
                                                        else setDropoffLocation(r);
                                                        setActiveDrawer('none');
                                                        setSearchResults([]);
                                                    }}
                                                    className="w-full p-4 bg-white rounded-[5px] border border-neutral-100 flex items-center gap-4 text-left hover:border-[#219178]"
                                                >
                                                    <MapPin size={20} className="text-neutral-300" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-light text-[#111827] text-[15px] truncate">{r.address.split(',')[0]}</p>
                                                        <p className="text-[12px] text-neutral-400 font-light truncate">{r.address.split(',').slice(1).join(',')}</p>
                                                    </div>
                                                </button>
                                            )) : (
                                                <div className="text-center py-8 text-neutral-400 font-bold">
                                                    Start typing to search...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
