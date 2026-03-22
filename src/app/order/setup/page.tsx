'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronLeft, X, Plus, Check, Home, 
    Briefcase, Image as ImageIcon, Trash2, 
    Save, Loader2, Sparkles, AlertCircle,
    MapPin, Calendar
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

export default function ServiceSetupPage() {
    const router = useRouter();
    const { order, setOrderField } = useOrder();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<ServiceProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('new');
    
    // Form State
    const [activeTab, setActiveTab] = useState<'setup' | 'details'>('setup');
    
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

    // Availability State
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
    const [activeDrawer, setActiveDrawer] = useState<'none' | 'description' | 'recipient' | 'schedule' | 'pickup' | 'dropoff'>('none');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Bricoler Stats
    const provider = {
        name: order.providerName || 'Bricoler',
        avatar: order.providerAvatar || '/Images/Vectors Illu/avatar.png',
        rating: order.providerRating || 5.0,
        taskCount: order.providerJobsCount || 0,
        rank: order.providerRank || 'New',
        minRate: order.providerRate || 0,
        bio: order.providerBio || 'Experienced Bricoler offering quality services in your area.',
        yearsOfExperience: order.providerExperience || '1 Year'
    };

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
        return () => unsub();
    }, [order.serviceType, order.providerId, router]);

    // Update Estimate
    useEffect(() => {
        if (!order.serviceType) return;
        
        if (order.serviceType === 'errands' || order.serviceType?.includes('delivery')) {
            if (pickupLocation.lat && dropoffLocation.lat) {
                const fetchDist = async () => {
                    try {
                        const { distanceKm } = await getRoadDistance(
                            pickupLocation.lat!, pickupLocation.lng!,
                            dropoffLocation.lat!, dropoffLocation.lng!
                        );
                        const base = Math.max(distanceKm * 2, 5);
                        const sub = base + (deliveryType === 'schedule' ? 2 : 0);
                        const total = Math.round(sub * 1.1);
                        setEstimate({
                            basePrice: base,
                            quantity: 1,
                            unit: 'distance',
                            subtotal: sub,
                            serviceFee: Math.round(sub * 0.1),
                            total: total
                        });
                    } catch (e) {
                        console.warn("Pricing calculation failed", e);
                    }
                };
                fetchDist();
            } else {
                setEstimate(null);
            }
        } else {
            if (order.providerRate || order.isPublic) {
                const result = calculateOrderPrice(
                    order.serviceType,
                    order.providerRate || 80,
                    { rooms, hours: 1, days: 1 }
                );
                setEstimate(result);
            }
        }
    }, [order.serviceType, order.providerRate, order.isPublic, rooms, propertyType, pickupLocation, dropoffLocation, deliveryType]);

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

            // 2. Parallel upload to Cloudinary
            const uploadPromises = filesToProcess.map(async (file, index) => {
                const dataUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.readAsDataURL(file);
                });
                
                const uploadedUrl = await uploadToCloudinary(
                    dataUrl, 
                    `lbricol/clients/${user?.uid || 'guest'}/setups`, 
                    'lbricol_portfolio'
                );

                // 3. Replace the local blob URL with the actual Cloudinary URL in state
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
        if (!selectedDate || !selectedTime) {
            alert("Please select a date and time for your order.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Update Context
            setOrderField('scheduledDate', selectedDate.toISOString());
            setOrderField('scheduledTime', selectedTime);
            
            const serviceDetails = {

                rooms,
                propertyType,
                photoUrls: photos,
                note,
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
                itemDescription
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

    return (
        <div className="min-h-screen bg-white text-[#111827] flex flex-col font-sans">
            {isSplashing && <SplashScreen subStatus={null} />}
            
            {/* Header */}
            <header className="flex flex-col sticky top-0 bg-white z-10 border-b border-neutral-100">
                <div className="flex items-center justify-between px-5 py-4">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-[#F9FAFB] flex items-center justify-center">
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="text-[18px] font-black">Order Setup</h1>
                    <button onClick={() => router.push('/')} className="w-10 h-10 rounded-full bg-[#F9FAFB] flex items-center justify-center">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs Bar */}
                <div className="flex px-4">
                    <button
                        onClick={() => setActiveTab('setup')}
                        className={`flex-1 py-3 text-[14px] font-black transition-all relative ${activeTab === 'setup' ? 'text-[#00A082]' : 'text-[#9CA3AF]'}`}
                    >
                        Order Setup
                        {activeTab === 'setup' && (
                            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00A082]" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-3 text-[14px] font-black transition-all relative ${activeTab === 'details' ? 'text-[#00A082]' : 'text-[#9CA3AF]'}`}
                    >
                        Bricoler Details
                        {activeTab === 'details' && (
                            <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00A082]" />
                        )}
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-48">
                <AnimatePresence mode="wait">
                    {activeTab === 'setup' ? (
                        <motion.div
                            key="setup"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="px-6"
                        >
                            {/* Bricoler Summary */}
                            <div 
                                onClick={() => setActiveTab('details')}
                                className="mt-8 flex items-center gap-4 p-4 bg-[#F9FAFB] rounded-2xl border border-neutral-100 cursor-pointer active:scale-[0.98] transition-all"
                            >
                                <img src={provider.avatar} className="w-12 h-12 rounded-full object-cover" />
                                <div className="flex-1">
                                    <p className="text-[11px] font-black text-[#9CA3AF] uppercase tracking-wider">Service Provider</p>
                                    <p className="text-[15px] font-black">{provider.name}</p>
                                </div>
                                <div className="text-[#00A082] font-black text-[12px]">View Profile</div>
                            </div>

                            {/* Saved Profiles */}
                            {profiles.length > 0 && (
                                <section className="mt-8">
                                    <h3 className="text-[17px] font-black mb-4">Saved Setups</h3>
                                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                        <button 
                                            onClick={() => setSelectedProfileId('new')}
                                            className={`flex-shrink-0 px-5 py-3 rounded-2xl border-2 transition-all flex items-center gap-2 ${selectedProfileId === 'new' ? 'border-[#00A082] bg-[#F0FDF4] text-[#00A082]' : 'border-neutral-100 bg-white text-[#6B7280]'}`}
                                        >
                                            <Plus size={18} />
                                            <span className="font-bold text-[14px]">New Setup</span>
                                        </button>
                                        {profiles.map(p => (
                                            <button 
                                                key={p.id}
                                                onClick={() => handleSelectProfile(p)}
                                                className={`flex-shrink-0 px-5 py-3 rounded-2xl border-2 transition-all flex items-center gap-2 ${selectedProfileId === p.id ? 'border-[#00A082] bg-[#F0FDF4] text-[#00A082]' : 'border-neutral-100 bg-white text-[#6B7280]'}`}
                                            >
                                                <Home size={18} />
                                                <span className="font-bold text-[14px]">{p.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Setup Content */}
                            <section className="mt-8 space-y-8">
                                {(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) ? (
                                    <div className="space-y-6">
                                        {/* Purchase Disclaimer Banner */}
                                        <div className="bg-[#F9FAFB] p-5 rounded-2xl flex items-start gap-4 border border-neutral-100">
                                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                                                <AlertCircle size={20} className="text-[#4B5563]" />
                                            </div>
                                            <p className="text-[13px] font-bold text-[#4B5563] leading-relaxed">
                                                The courier cannot purchase products for you. If you ask them to do so, the order will be cancelled.
                                            </p>
                                        </div>

                                        {/* Item Description Section */}
                                        <div className="space-y-4">
                                            <h3 className="text-[18px] font-black text-[#111827]">Your order</h3>
                                            <button 
                                                onClick={() => setActiveDrawer('description')}
                                                className="w-full p-5 bg-white rounded-2xl border-2 border-neutral-100 flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-4 text-left">
                                                    <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[#111827]">
                                                        <Briefcase size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[15px] font-black text-[#111827]">
                                                            {itemDescription || "What do you need transporting?"}
                                                        </p>
                                                        <p className="text-[12px] font-bold text-[#9CA3AF]">Purchases aren't allowed</p>
                                                    </div>
                                                </div>
                                                <ChevronLeft className="rotate-180 text-neutral-300 group-hover:text-[#00A082] transition-colors" size={20} />
                                            </button>
                                        </div>

                                        {/* Delivery Details Section */}
                                        <div className="space-y-4">
                                            <h3 className="text-[18px] font-black text-[#111827]">Delivery details</h3>
                                            
                                            <div className="h-48 bg-[#F3F4F6] rounded-2xl border-2 border-neutral-100 relative overflow-hidden">
                                                {pickupLocation.address && dropoffLocation.address ? (
                                                    <MapView 
                                                        initialLocation={order.location || { lat: 31.5085, lng: -9.7595 }} 
                                                        interactive={false}
                                                        onLocationChange={() => {}}
                                                        lockCenterOnFocus={true}
                                                        showCenterPin={false}
                                                        zoom={14}
                                                    />
                                                ) : (
                                                    <>
                                                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#00A082 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' }} />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <MapPin className="text-[#00A082] opacity-20" size={32} />
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <div className="grid gap-2">
                                                <button 
                                                    onClick={() => setActiveDrawer('pickup')}
                                                    className="w-full p-4 flex items-center justify-between border-b border-neutral-50"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <MapPin size={20} className="text-neutral-400" />
                                                        <span className={`text-[15px] font-bold ${pickupLocation.address ? 'text-[#111827]' : 'text-neutral-300'}`}>
                                                            {pickupLocation.address || "Where from?"}
                                                        </span>
                                                    </div>
                                                    <ChevronLeft className="rotate-180 text-neutral-300" size={18} />
                                                </button>

                                                <button 
                                                    onClick={() => setActiveDrawer('dropoff')}
                                                    className="w-full p-4 flex items-center justify-between border-b border-neutral-50"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <MapPin size={20} className="text-neutral-400" />
                                                        <span className={`text-[15px] font-bold ${dropoffLocation.address ? 'text-[#111827]' : 'text-neutral-300'}`}>
                                                            {dropoffLocation.address || "Where to?"}
                                                        </span>
                                                    </div>
                                                    <ChevronLeft className="rotate-180 text-neutral-300" size={18} />
                                                </button>

                                                <button 
                                                    onClick={() => setActiveDrawer('recipient')}
                                                    className="w-full p-4 flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-4 text-left">
                                                        <Briefcase size={20} className="text-neutral-400" />
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
                                                <AlertCircle size={16} className="text-neutral-300" />
                                            </div>

                                            <div className="p-5 bg-white rounded-3xl border-2 border-neutral-100 shadow-sm">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <p className="text-[15px] font-black text-[#111827]">
                                                            {deliveryType === 'standard' ? "Standard" : "Scheduled"}
                                                        </p>
                                                        <p className="text-[13px] font-bold text-[#6B7280]">
                                                            {deliveryType === 'standard' ? "As soon as possible" : `${deliveryDate} at ${deliveryTime}`}
                                                        </p>
                                                    </div>
                                                    <button onClick={() => setActiveDrawer('schedule')} className="w-10 h-10 rounded-full bg-neutral-50 flex items-center justify-center">
                                                        <ChevronLeft className="-rotate-90 text-neutral-300" size={20} />
                                                    </button>
                                                </div>
                                                
                                                {deliveryType === 'standard' && (
                                                    <div className="space-y-2 pt-4 border-t border-neutral-50">
                                                        <div className="p-4 bg-[#F0FDF4] rounded-2xl border border-[#D1FAE5] flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-[#00A082] flex items-center justify-center">
                                                                    <Check size={16} className="text-white" strokeWidth={4} />
                                                                </div>
                                                                <span className="text-[14px] font-black text-[#065F46]">Standard <span className="font-bold opacity-60 ml-1">As soon as possible</span></span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] flex items-center justify-center">
                                                <Sparkles size={20} className="text-[#FBBF24]" />
                                            </div>
                                            <h3 className="text-[19px] font-black">Configure your {order.serviceName}</h3>
                                        </div>

                                        {/* Availability Picker */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center">
                                                    <Calendar size={20} className="text-[#00A082]" />
                                                </div>
                                                <h3 className="text-[19px] font-black">When do you need the Bricoler?</h3>
                                            </div>
                                            <OrderAvailabilityPicker 
                                                bricolerId={order.providerId!} 
                                                onSelect={(date, time) => {
                                                    setSelectedDate(date);
                                                    setSelectedTime(time);
                                                }}
                                                selectedDate={selectedDate}
                                                selectedTime={selectedTime}
                                            />
                                        </div>

                                        {/* Property Type */}

                                        <div className="space-y-4">
                                            <label className="text-[15px] font-black text-[#4B5563]">Property Type</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['Studio', 'Apartment', 'Villa', 'Guesthouse', 'Riad', 'Hotel'].map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setPropertyType(type)}
                                                        className={`px-4 py-2.5 rounded-xl border-2 font-bold text-[13px] transition-all ${propertyType === type ? 'border-[#00A082] bg-[#F0FDF4] text-[#00A082]' : 'border-neutral-100 text-[#6B7280]'}`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Room Counter (For Cleaning) */}
                                        {(order.serviceType === 'cleaning' || order.serviceType === 'airbnb_cleaning') && (
                                            <div className="space-y-4">
                                                <label className="text-[15px] font-black text-[#4B5563]">Number of Rooms</label>
                                                <div className="flex items-center justify-between bg-[#F9FAFB] p-4 rounded-2xl border border-neutral-100">
                                                    <button 
                                                        onClick={() => setRooms(Math.max(1, rooms - 1))}
                                                        className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-black text-xl active:scale-95"
                                                    >-</button>
                                                    <span className="text-2xl font-black">{rooms}</span>
                                                    <button 
                                                        onClick={() => setRooms(Math.min(12, rooms + 1))}
                                                        className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-black text-xl active:scale-95"
                                                    >+</button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Photo Uploads */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[15px] font-black text-[#4B5563]">Photos of the Property</label>
                                                <span className="text-[12px] font-bold text-[#9CA3AF]">{photos.length}/6</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {photos.map((url, i) => (
                                                    <div key={i} className="aspect-square rounded-xl relative overflow-hidden group">
                                                        <img src={url} className="w-full h-full object-cover" />
                                                        <button 
                                                            onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white p-1 shadow-lg"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {photos.length < 6 && (
                                                    <label className="aspect-square rounded-xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all hover:bg-neutral-50">
                                                        <input type="file" multiple hidden accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
                                                        {isUploading ? (
                                                            <Loader2 size={24} className="animate-spin text-[#00A082]" />
                                                        ) : (
                                                            <>
                                                                <ImageIcon size={24} className="text-[#9CA3AF]" />
                                                                <span className="text-[11px] font-black text-[#9CA3AF] uppercase">Add Photo</span>
                                                            </>
                                                        )}
                                                    </label>
                                                )}
                                            </div>
                                            <p className="text-[11px] font-medium text-[#9CA3AF] leading-relaxed flex gap-2">
                                                <AlertCircle size={12} className="shrink-0" />
                                                Photos help the Bricoler understand your needs and provide a better service.
                                            </p>
                                        </div>

                                        {/* Optional Note */}
                                        <div className="space-y-4">
                                            <label className="text-[15px] font-black text-[#4B5563]">Instructions or Notes</label>
                                            <textarea 
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                placeholder="Tell us more about what needs to be done..."
                                                className="w-full h-32 p-4 bg-[#F9FAFB] rounded-2xl border border-neutral-100 outline-none focus:border-[#00A082] transition-colors resize-none font-medium"
                                            />
                                        </div>

                                        {/* Save as Favorite */}
                                        {selectedProfileId === 'new' && user && (
                                            <div className="p-4 bg-[#F0FDF4] rounded-2xl border border-[#D1FAE5]">
                                                <label className="flex items-center gap-4 cursor-pointer">
                                                    <div className={`w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center ${saveAsFavorite ? 'bg-[#00A082] border-[#00A082]' : 'bg-white border-neutral-300'}`}>
                                                        <input type="checkbox" hidden checked={saveAsFavorite} onChange={() => setSaveAsFavorite(!saveAsFavorite)} />
                                                        {saveAsFavorite && <Check size={16} color="white" strokeWidth={4} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[15px] font-black text-[#065F46]">Save this setup for next time</p>
                                                        <p className="text-[12px] font-medium text-[#047857]">You won't have to enter these details again.</p>
                                                    </div>
                                                </label>
                                                <AnimatePresence>
                                                    {saveAsFavorite && (
                                                        <motion.div 
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="mt-4 pt-4 border-t border-[#D1FAE5]"
                                                        >
                                                            <input 
                                                                type="text" 
                                                                placeholder="Label (e.g. My Apartment, Beach Villa)"
                                                                value={favoriteLabel}
                                                                onChange={(e) => setFavoriteLabel(e.target.value)}
                                                                className="w-full p-3 bg-white rounded-xl border border-[#D1FAE5] outline-none font-bold text-[14px]"
                                                            />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="px-6 py-8"
                        >
                            {/* Profile Hero */}
                            <div className="flex gap-6 mb-8 items-start">
                                <img src={provider.avatar} className="w-24 h-24 rounded-3xl object-cover border-4 border-[#F9FAFB]" />
                                <div className="flex-1">
                                    <h2 className="text-[24px] font-black text-[#111827] mb-2">{provider.name}</h2>
                                    <div className="flex flex-wrap gap-2 mb-3 items-center">
                                        <span className="bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-black px-3 py-1 rounded-md flex items-center gap-1 uppercase tracking-wider">
                                            ✦ {provider.rank}
                                        </span>
                                        <div className="flex items-center gap-1 bg-[#FFFBEB] px-2 py-1 rounded-md border border-[#FEF3C7]">
                                            <Sparkles size={10} className="text-[#FBBF24] fill-[#FBBF24]" />
                                            <span className="text-[11px] font-black text-[#92400E]">{provider.rating.toFixed(1)}</span>
                                        </div>
                                        <span className="text-[13px] text-[#6B7280] font-bold flex items-center gap-1">
                                            {provider.taskCount} Missions
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-2 text-[#00A082]">
                                        <span className="text-[20px] font-black">MAD {provider.minRate}</span>
                                        <span className="text-[14px] font-bold text-[#6B7280]">(min)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-neutral-100">
                                    <div className="text-[11px] font-black text-[#9CA3AF] uppercase tracking-wider mb-1">Experience</div>
                                    <div className="text-[17px] font-black text-[#111827]">{provider.yearsOfExperience}</div>
                                </div>
                                <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-neutral-100">
                                    <div className="text-[11px] font-black text-[#9CA3AF] uppercase tracking-wider mb-1">Success Rate</div>
                                    <div className="text-[17px] font-black text-[#111827]">99%</div>
                                </div>
                            </div>

                            {/* About */}
                            <div className="mb-8">
                                <h4 className="text-[18px] font-black text-[#111827] mb-4">About Me</h4>
                                <div className="text-[15px] text-[#4B5563] leading-relaxed font-medium p-5 bg-[#F9FAFB] rounded-2xl border border-neutral-100 italic">
                                    "{provider.bio}"
                                </div>
                            </div>

                            {/* Trusted Provider */}
                            <div className="p-4 bg-[#F0FDF4] rounded-2xl border border-[#D1FAE5] flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#D1FAE5] flex items-center justify-center text-[#00A082]">
                                    <Check size={20} className="stroke-[3]" />
                                </div>
                                <div>
                                    <p className="text-[15px] font-black text-[#065F46]">Verified Bricoler</p>
                                    <p className="text-[12px] font-medium text-[#047857]">Identity and skills verified by Lbricol team.</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Bottom Button */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-100 z-20 flex flex-col gap-4">
                {estimate && (
                    <div className="flex items-center justify-between px-2">
                        <div>
                            <p className="text-[11px] font-black text-[#9CA3AF] uppercase tracking-wider">Estimated Total</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-[22px] font-black text-[#111827]">MAD {estimate.total}</span>
                                <span className="text-[12px] font-bold text-[#6B7280]">incl. fee</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] font-black text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">Service Fee (10%)</p>
                            <p className="text-[14px] font-bold text-[#6B7280]">MAD {estimate.serviceFee}</p>
                        </div>
                    </div>
                )}
                <motion.button 
                    whileTap={{ scale: 0.97 }}
                    onClick={handleContinue}
                    disabled={isSubmitting || isUploading}
                    className="w-full h-15 bg-[#00A082] text-white rounded-2xl font-black text-[17px] shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={20} className="animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            Continue to Checkout
                            <Plus size={20} />
                        </>
                    )}
                </motion.button>
            </div>

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
                                    <div className="bg-[#F9FAFB] p-5 rounded-2xl border border-neutral-100">
                                        <p className="text-[15px] font-bold text-[#4B5563] leading-relaxed">
                                            Couriers cannot make purchases. Orders involving purchases will be cancelled.
                                        </p>
                                    </div>
                                    <textarea 
                                        autoFocus
                                        value={itemDescription}
                                        onChange={(e) => setItemDescription(e.target.value)}
                                        placeholder="Enter details of what needs to be transported..."
                                        className="w-full h-48 p-5 bg-white rounded-2xl border-2 border-neutral-100 focus:border-[#00A082] focus:ring-0 font-bold text-[17px] placeholder:text-neutral-300 resize-none"
                                    />
                                    <button 
                                        onClick={() => setActiveDrawer('none')}
                                        className="w-full py-4 bg-[#00A082] text-white rounded-2xl font-black text-[17px] shadow-lg"
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
                                            className="w-full p-4 rounded-xl border-2 border-neutral-50 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[14px] font-black text-[#4B5563]">Phone number</label>
                                        <div className="flex gap-2">
                                            <div className="px-4 py-4 bg-neutral-50 rounded-xl font-bold border-2 border-neutral-50">+212</div>
                                            <input 
                                                type="tel"
                                                value={recipientPhone}
                                                onChange={(e) => setRecipientPhone(e.target.value)}
                                                placeholder="Phone number"
                                                className="flex-1 p-4 rounded-xl border-2 border-neutral-50 font-bold"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[12px] font-bold text-neutral-400 leading-relaxed">
                                        By sharing the recipient's details, you are solely responsible for obtaining their consent and informing them on how their data is processed.
                                    </p>
                                    <button 
                                        onClick={() => setActiveDrawer('none')}
                                        className="w-full py-4 bg-[#00A082] text-white rounded-2xl font-black text-[17px] shadow-lg"
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
                                                className={`px-6 py-3 rounded-xl border-2 font-bold transition-all ${deliveryDate === day ? 'border-[#00816A] bg-[#00816A] text-white' : 'border-neutral-100 text-neutral-400'}`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="grid gap-2">
                                        <OrderAvailabilityPicker 
                                            bricolerId={order.providerId!} 
                                            onSelect={(date, time) => {
                                                setSelectedDate(date);
                                                setSelectedTime(time);
                                                setDeliveryDate(format(date, 'yyyy-MM-dd'));
                                                setDeliveryTime(time);
                                                setDeliveryType('schedule');
                                            }}
                                            selectedDate={selectedDate}
                                            selectedTime={selectedTime}
                                        />
                                    </div>


                                    <div className="flex gap-3 pt-6">
                                        <button 
                                            onClick={() => {
                                                setDeliveryType('standard');
                                                setActiveDrawer('none');
                                            }}
                                            className="flex-1 py-4 bg-neutral-100 rounded-2xl font-black text-[17px]"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={() => setActiveDrawer('none')}
                                            className="flex-1 py-4 bg-[#00A082] text-white rounded-2xl font-black text-[17px] shadow-lg"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(activeDrawer === 'pickup' || activeDrawer === 'dropoff') && (
                                <div className="space-y-6">
                                    <div className="h-64 bg-neutral-50 rounded-2xl border-2 border-neutral-100 relative mb-6">
                                        {/* Mock Map interaction */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="flex flex-col items-center">
                                                <div className="px-4 py-2 bg-white rounded-lg shadow-xl mb-2 flex items-center gap-2">
                                                    <span className="text-[14px] font-bold text-[#111827]">Derb Al Mssalla</span>
                                                    <span className="text-[12px] font-black text-[#00A082] uppercase">Use this point</span>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-[#00A082] border-4 border-white shadow-xl" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            background: '#F3F4F6', borderRadius: 12, padding: '12px 16px',
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
                                                    className="w-full p-4 bg-white rounded-xl border border-neutral-100 flex items-center gap-4 text-left hover:border-[#00816A]"
                                                >
                                                    <MapPin size={20} className="text-neutral-300" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-[#111827] text-[15px] truncate">{r.address.split(',')[0]}</p>
                                                        <p className="text-[12px] text-neutral-400 font-bold truncate">{r.address.split(',').slice(1).join(',')}</p>
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
