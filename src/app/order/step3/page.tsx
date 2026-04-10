'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    X,
    Check,
    CreditCard,
    CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
const MapView = dynamic(() => import('@/components/location-picker/MapView'), { ssr: false });
import { useOrder } from '@/context/OrderContext';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import AuthPopup from '@/features/onboarding/components/AuthPopup';
import ClientWhatsAppPopup from '@/features/client/components/ClientWhatsAppPopup';
import { useLanguage } from '@/context/LanguageContext';
import { calculateOrderPrice } from '@/lib/pricing';
import { getServiceVector } from '@/config/services_config';
import { getRoadDistance } from '@/lib/calculateDistance';

export default function CheckoutPage() {
    const router = useRouter();
    const { t, language } = useLanguage();
    const { order, resetOrder } = useOrder();

    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
    const [showAuthPopup, setShowAuthPopup] = useState(false);
    const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [travelInfo, setTravelInfo] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [receiptImage, setReceiptImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const calculateDays = () => {
        if (!order.carRentalDates) return 1;
        const start = new Date(`${order.carRentalDates.pickupDate}T${order.carRentalDates.pickupTime}`);
        const end = new Date(`${order.carRentalDates.returnDate}T${order.carRentalDates.returnTime}`);
        const diff = end.getTime() - start.getTime();
        return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    // ── Pre-flight Checks ────────────────────────────────────────────────
    useEffect(() => {
        if (!showSuccess && ((!order.providerId && !order.isPublic) || !order.location)) {
            router.push('/order/step1');
            return;
        }

        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                // Robust fetch: Check both users and clients and merge data
                const [uSnap, cSnap] = await Promise.all([
                    getDoc(doc(db, 'users', u.uid)),
                    getDoc(doc(db, 'clients', u.uid))
                ]);
                
                let combinedData: any = {};
                if (uSnap.exists()) combinedData = { ...combinedData, ...uSnap.data() };
                if (cSnap.exists()) combinedData = { ...combinedData, ...cSnap.data() };
                
                // Fallback to localStorage if WhatsApp number is still missing
                if (!combinedData.whatsappNumber) {
                    const localPhone = localStorage.getItem('lbricol_user_phone');
                    if (localPhone) combinedData.whatsappNumber = localPhone;
                }

                setUserData(combinedData);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [order, router]);

    useEffect(() => {
        const isSpecialized = order.serviceType === 'moving' || order.serviceType?.includes('moving') || order.serviceType === 'errands' || (order.serviceType === 'delivery') || order.subServiceId === 'packing';

        if (isSpecialized) {
            const pickup = order.serviceDetails?.pickupCoords || order.location;
            const dropoff = order.serviceDetails?.dropoffCoords;

            if (pickup?.lat && pickup?.lng && dropoff?.lat && dropoff?.lng) {
                getRoadDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng)
                    .then(setTravelInfo);
            } else if (order.location?.lat && order.location?.lng && order.providerCoords?.lat && order.providerCoords?.lng) {
                getRoadDistance(order.location.lat, order.location.lng, order.providerCoords.lat, order.providerCoords.lng)
                    .then(setTravelInfo);
            }
        } else if (order.location?.lat && order.location?.lng && order.providerCoords?.lat && order.providerCoords?.lng) {
            getRoadDistance(order.location.lat, order.location.lng, order.providerCoords.lat, order.providerCoords.lng)
                .then(setTravelInfo);
        }
    }, [order.location, order.providerCoords, order.serviceDetails, order.serviceType, order.subServiceId]);

    const handleBack = () => router.back();

    const cleanObject = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(cleanObject);
        if (obj instanceof Date) return obj;

        // Preserve Firestore FieldValues/Sentinels and other complex instances
        if (obj.constructor && obj.constructor.name !== 'Object') return obj;

        const clean: any = {};
        Object.keys(obj).forEach(key => {
            const val = obj[key];
            if (val === undefined) return;
            clean[key] = cleanObject(val);
        });
        return clean;
    };

    const createOrders = async (finalUser: any, finalWhatsApp: string) => {
        setIsSubmitting(true);
        try {
            // 1. Ensure user profile is updated with WhatsApp if new
            if (finalWhatsApp) {
                localStorage.setItem('lbricol_user_phone', finalWhatsApp);
                if (!userData?.whatsappNumber) {
                    await setDoc(doc(db, 'clients', finalUser.uid), {
                        whatsappNumber: finalWhatsApp,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }
            }

            // Determine slots to process
            const slotsToProcess = (order.multiSlots && order.multiSlots.length > 0)
                ? order.multiSlots
                : [{ date: order.date || order.carRentalDates?.pickupDate || new Date().toISOString(), time: order.time || order.carRentalDates?.pickupTime || "10:00" }];

            // 2. Create the Job/Mission(s)
            for (const slot of slotsToProcess) {
                // prioritize stored estimate from setup step for 100% consistency
                const pricing = order.estimate || calculateOrderPrice(
                    order.subServiceId || order.serviceType,
                    order.providerRate || 80,
                    {
                        rooms: order.serviceDetails?.rooms || 1,
                        hours: order.serviceDetails?.taskDuration || 1,
                        days: calculateDays() || 1,
                        propertyType: order.serviceDetails?.propertyType,
                        distanceKm: travelInfo?.distanceKm || 0,
                        // TV Mounting specific
                        tvCount: order.serviceDetails?.tvCount,
                        mountTypes: order.serviceDetails?.mountTypes,
                        wallMaterial: order.serviceDetails?.wallMaterial,
                        liftingHelp: order.serviceDetails?.liftingHelp,
                        mountingAddOns: order.serviceDetails?.mountingAddOns,
                        deliveryDistanceKm: order.serviceDetails?.deliveryDistanceKm,
                        deliveryDurationMinutes: order.serviceDetails?.deliveryDurationMinutes,
                        taskSize: order.serviceDetails?.taskSize,
                        // Office Cleaning specific
                        officeDesks: order.serviceDetails?.officeDesks,
                        officeMeetingRooms: order.serviceDetails?.officeMeetingRooms,
                        officeBathrooms: order.serviceDetails?.officeBathrooms,
                        hasKitchenette: order.serviceDetails?.hasKitchenette,
                        hasReception: order.serviceDetails?.hasReception,
                        officeAddOns: order.serviceDetails?.officeAddOns,
                        // Glass Cleaning specific
                        windowCount: order.serviceDetails?.windowCount,
                        windowSize: order.serviceDetails?.windowSize,
                        buildingStories: order.serviceDetails?.buildingStories,
                        glassCleaningType: order.serviceDetails?.glassCleaningType,
                        glassAccessibility: order.serviceDetails?.glassAccessibility,
                        storeFrontSize: order.serviceDetails?.storeFrontSize,
                        // Gardening specific
                        gardenSize: order.serviceDetails?.gardenSize,
                        lawnCondition: order.serviceDetails?.lawnCondition,
                        needsMower: order.serviceDetails?.needsMower,
                        // Tree Trimming specific
                        treeCount: order.serviceDetails?.treeCount,
                        treeHeight: order.serviceDetails?.treeHeight,
                        trimmingType: order.serviceDetails?.trimmingType,
                        includeWasteRemoval: order.serviceDetails?.includeWasteRemoval,
                        // Hospitality enhancements
                        unitCount: order.serviceDetails?.unitCount,
                        stairsType: order.serviceDetails?.stairsType,
                        tipAmount: order.serviceDetails?.tipAmount,
                    }
                );

                const slotDate = format(new Date(slot.date), 'yyyy-MM-dd');

                // Calculate expected end time (start time + duration + 30m buffer)
                let expectedEndTime = null;
                try {
                    if (order.carRentalDates?.returnDate && order.carRentalDates?.returnTime) {
                        expectedEndTime = new Date(`${order.carRentalDates.returnDate}T${order.carRentalDates.returnTime}`);
                    } else if (slot.date && slot.time) {
                        const [h, m] = slot.time.split(':').map(Number);
                        const startDate = new Date(slot.date);
                        startDate.setHours(h, m, 0, 0);
                        const durationHr = order.serviceDetails?.taskDuration || 1;
                        expectedEndTime = new Date(startDate.getTime() + (durationHr * 60 * 60 * 1000) + (30 * 60 * 1000));
                    }
                } catch (e) {
                    console.error("Error calculating expectedEndTime", e);
                }

                const jobData = {
                    clientId: finalUser.uid,
                    clientName: finalUser.displayName || 'Client',
                    bricolerId: order.isPublic ? null : order.providerId,
                    bricolerName: order.isPublic ? 'Broadcast' : order.providerName,
                    bricolerAddress: order.providerAddress || 'Essaouira, Morocco',
                    bricolerAvatar: order.providerAvatar,
                    service: order.serviceType || 'car_rental',
                    serviceType: order.serviceType,
                    subServiceId: order.subServiceId || order.serviceType,
                    serviceName: order.serviceName,
                    location: order.location?.address || '',
                    locationDetails: order.location,
                    city: order.location?.city || '',
                    area: order.location?.area || '',
                    isPublic: order.isPublic || false,
                    date: slotDate,
                    time: slot.time,
                    estimatedDuration: order.serviceDetails?.taskDuration || 1,
                    selectedCar: order.selectedCar,
                    carRentalDates: order.carRentalDates,
                    carReturnDate: order.carRentalDates?.returnDate,
                    carReturnTime: order.carRentalDates?.returnTime,
                    carRentalNote: order.carRentalNote,
                    expectedEndTime: expectedEndTime || null,
                    status: order.isPublic ? 'broadcast' : 'programmed',
                    paymentMethod,
                    totalPrice: pricing.total,
                    price: order.providerRate || 80,
                    whatsappNumber: finalWhatsApp,
                    details: {
                        car: order.selectedCar,
                        carRentalDates: order.carRentalDates,
                        note: order.carRentalNote || order.serviceDetails?.note || order.serviceDetails?.itemDescription,
                        serviceDetails: order.serviceDetails || {},
                        setupProfileId: order.setupProfileId || '',
                        basePrice: pricing.subtotal,
                        fee: pricing.serviceFee,
                        pricing: pricing, // Save full breakdown details for consistent UI across all views
                        deliveryDetails: {
                            pickupAddress: order.serviceDetails?.pickupAddress,
                            dropoffAddress: order.serviceDetails?.dropoffAddress,
                            recipientName: order.serviceDetails?.recipientName,
                            recipientPhone: order.serviceDetails?.recipientPhone,
                            deliveryType: order.serviceDetails?.deliveryType,
                            deliveryDate: order.serviceDetails?.deliveryDate,
                            deliveryTime: order.serviceDetails?.deliveryTime
                        }
                    },
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                };

                const cleanedJobData = cleanObject(jobData);
                await addDoc(collection(db, 'jobs'), cleanedJobData);
            }

            // 3. Success!
            setShowSuccess(true);
            setTimeout(() => {
                resetOrder();
                router.replace('/?tab=calendar');
            }, 2000);

        } catch (err) {
            console.error("Failed to create order:", err);
            alert("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleProgramMission = () => {
        if (!user) {
            setShowAuthPopup(true);
            return;
        }

        if (!userData?.whatsappNumber) {
            setShowWhatsAppPopup(true);
            return;
        }

        createOrders(user, userData.whatsappNumber);
    };


    if (loading && !showSuccess) return null;

    const formattedDateRange = () => {
        if (order.carRentalDates) {
            const startStr = formatDateLabel(order.carRentalDates.pickupDate, order.carRentalDates.pickupTime);
            const endStr = formatDateLabel(order.carRentalDates.returnDate, order.carRentalDates.returnTime);
            return `${startStr} to ${endStr} (${calculateDays()} days)`;
        }

        if (order.multiSlots && order.multiSlots.length > 0) {
            if (order.multiSlots.length === 1) {
                const s = order.multiSlots[0];
                return `${new Date(s.date).toLocaleDateString(language === 'ar' ? 'ar-MA' : (language === 'fr' ? 'fr-FR' : 'en-US'), { month: 'short', day: 'numeric' })} at ${s.time}`;
            }
            return `${order.multiSlots.length} ${t({ en: 'Missions Scheduled', fr: 'Missions Programmées', ar: 'مهام مبرمجة' })}`;
        }

        return order.date ? new Date(order.date).toLocaleDateString(language === 'ar' ? 'ar-MA' : (language === 'fr' ? 'fr-FR' : 'en-US'), { month: 'short', day: 'numeric' }) : '';
    };

    const formatDateLabel = (date: string, time: string) => {
        const d = new Date(`${date}T${time}`);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + " " + time;
    };

    const formattedTime = order.carRentalDates?.pickupTime || order.time || '';

    return (
        <div style={{ height: '100vh', background: '#fff', color: '#111827', fontFamily: 'Inter, sans-serif', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#fff', zIndex: 10, flexShrink: 0 }}>
                <button onClick={handleBack} style={{ width: 40, height: 40, borderRadius: '50%', background: '#F9FAFB', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <ChevronLeft size={24} />
                </button>
                <h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Checkout</h1>
                <button onClick={() => router.push('/')} style={{ width: 40, height: 40, borderRadius: '50%', background: '#F9FAFB', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={20} />
                </button>
            </header>

            <main style={{ padding: '0 24px 0', flex: 1, overflowY: 'auto' }} className="no-scrollbar">
                <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 40 }}>
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{ display: 'flex', justifyContent: 'center' }}
                    >
                        <img
                            src={
                                order.selectedCar?.modelImage ||
                                order.selectedCar?.image ||
                                getServiceVector(order.serviceType)
                            }
                            style={{
                                width: (order.selectedCar?.modelImage || order.selectedCar?.image) ? 220 : 160,
                                height: (order.selectedCar?.modelImage || order.selectedCar?.image) ? 130 : 160,
                                objectFit: 'contain',
                                marginBottom: 20
                            }}
                            alt="Order"
                        />
                    </motion.div>
                    <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.5px' }}>Your Lbricol.com Order</h2>
                    <div style={{ fontSize: 16, fontWeight: 500, color: '#424242ff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span>{formattedDateRange()}</span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginTop: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        ORDER ID: #TEMP
                    </div>
                </div>

                {/* Decorative Wave Separator */}
                <div style={{ margin: '0 -24px 32px', position: 'relative', height: 20, overflow: 'hidden' }}>
                    <svg width="100%" height="20" viewBox="0 0 400 20" preserveAspectRatio="none">
                        <path d="M0 10 Q 5 0, 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10 T 110 10 T 120 10 T 130 10 T 140 10 T 150 10 T 160 10 T 170 10 T 180 10 T 190 10 T 200 10 T 210 10 T 220 10 T 230 10 T 240 10 T 250 10 T 260 10 T 270 10 T 280 10 T 290 10 T 300 10 T 310 10 T 320 10 T 330 10 T 340 10 T 350 10 T 360 10 T 370 10 T 380 10 T 390 10 T 400 10 V 20 H 0 Z" fill="#F9FAFB" />
                    </svg>
                </div>

                {/* Payment Methods */}
                <section style={{ marginBottom: 32 }}>
                    <h3 style={{ fontSize: 25, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                        Payment
                    </h3>
                    <p style={{ fontSize: 14, fontWeight: 400, color: '#9CA3AF', marginBottom: 20 }}>Choose your payment method</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div
                            onClick={() => setPaymentMethod('cash')}
                            style={{
                                padding: '24px 20px', borderRadius: 20, border: '2px solid',
                                borderColor: paymentMethod === 'cash' ? '#01A083' : '#F3F4F6',
                                background: paymentMethod === 'cash' ? '#F0FDF9' : '#F9FAFB',
                                cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: 32, marginBottom: 12 }}>💵</div>
                            <div style={{ fontWeight: 1000, fontSize: 16, color: '#111827', marginBottom: 4 }}>Cash</div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: paymentMethod === 'cash' ? '#01A083' : '#9CA3AF' }}>On delivery</div>
                            {paymentMethod === 'cash' && (
                                <div style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, background: '#01A083', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check size={14} color="#fff" strokeWidth={5} />
                                </div>
                            )}
                        </div>

                        <div
                            onClick={() => setPaymentMethod('bank_transfer')}
                            style={{
                                padding: '24px 20px', borderRadius: 20, border: '2px solid',
                                borderColor: paymentMethod === 'bank_transfer' ? '#01A083' : '#F3F4F6',
                                background: paymentMethod === 'bank_transfer' ? '#F0FDF9' : '#F9FAFB',
                                cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
                            <div style={{ fontWeight: 1000, fontSize: 16, color: '#111827', marginBottom: 4 }}>Bank Transfer</div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: paymentMethod === 'bank_transfer' ? '#01A083' : '#9CA3AF' }}>Internal Chat</div>
                            {paymentMethod === 'bank_transfer' && (
                                <div style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, background: '#01A083', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check size={14} color="#fff" strokeWidth={5} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bank Details Card */}
                    <AnimatePresence>
                        {paymentMethod === 'bank_transfer' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{ overflow: 'hidden', marginTop: 16 }}
                            >
                                <div style={{ padding: 24, background: '#F9FAFB', borderRadius: 5, border: '1px solid #E5E7EB' }}>
                                    <div style={{ marginBottom: 20 }}>
                                        <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.1em' }}>RIB</div>
                                        <div style={{ fontSize: 17, fontWeight: 1000, color: '#111827', letterSpacing: '0.02em', background: '#fff', padding: '12px 16px', borderRadius: 5, border: '1px solid #F3F4F6' }}>
                                            350810000000000880844466
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>Name</div>
                                            <div style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>Abdelmalek Tahri</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>Bank</div>
                                            <div style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>Al Barid Bank</div>
                                        </div>
                                    </div>

                                    <div style={{ borderTop: '1px dotted #E5E7EB', paddingTop: 20 }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: '#4B5563', marginBottom: 16 }}>Upload transfer receipt to program your order:</p>
                                        <input
                                            type="file"
                                            id="receipt"
                                            hidden
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setIsUploading(true);
                                                    setTimeout(() => {
                                                        setReceiptImage(URL.createObjectURL(file));
                                                        setIsUploading(false);
                                                    }, 1500);
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor="receipt"
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                                                height: 56, borderRadius: 5, background: receiptImage ? '#F0FDF4' : '#fff',
                                                border: '2px dashed', borderColor: receiptImage ? '#01A083' : '#D1D5DB',
                                                cursor: 'pointer', transition: 'all 0.2s', fontWeight: 900, color: receiptImage ? '#01A083' : '#6B7280', fontSize: 15
                                            }}
                                        >
                                            {isUploading ? 'Uploading...' : (receiptImage ? <><CheckCircle2 size={20} color="#01A083" /> Receipt Saved</> : <><CreditCard size={20} /> Select Image</>)}
                                        </label>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* Setup Summary (Rooms, Property Type, etc.) */}
                {order.serviceDetails && (
                    <div style={{ marginTop: 24 }}>
                        <h3 style={{ fontSize: 25, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            Setup Summary
                        </h3>
                        <div style={{ padding: 16, borderRadius: 12, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 17, fontWeight: 400, color: '#111827' }}>Service</span>
                                <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>{order.serviceName}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid #F3F4F6', paddingBottom: 12 }}>
                                <span style={{ fontSize: 17, fontWeight: 400, color: '#111827' }}>Category</span>
                                <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>{order.subServiceName}</span>
                            </div>
                            {/* Subservice-Aware Setup Details */}
                            {(() => {
                                const subId = order.subServiceId || '';
                                const isHouseCleaning = ['standard_small', 'standard_large', 'family_home', 'deep_cleaning', 'hospitality_turnover'].includes(subId);
                                const isOfficeCleaning = subId === 'office_cleaning';
                                const isTvMounting = subId === 'tv_mounting';
                                const isDelivery = order.serviceType === 'errands' || order.serviceType?.includes('delivery');

                                return (
                                    <>
                                        {/* Cleaning/Hospitality Details */}
                                        {isHouseCleaning && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Property Type', fr: 'Type de propriété' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{order.serviceDetails?.propertyType || 'Studio'}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Rooms', fr: 'Pièces' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{order.serviceDetails?.rooms || 1} {t({ en: 'Rooms', fr: 'Pièces' })}</span>
                                                </div>
                                            </>
                                        )}

                                        {/* Office Cleaning Details */}
                                        {isOfficeCleaning && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Desks', fr: 'Bureaux' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{order.serviceDetails?.officeDesks || 1}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Meeting Rooms', fr: 'Salles de réunion' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{order.serviceDetails?.officeMeetingRooms || 0}</span>
                                                </div>
                                                {(order.serviceDetails?.officeAddOns?.length || 0) > 0 && (
                                                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F3F4F6' }}>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Add-ons</span>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                                            {order.serviceDetails?.officeAddOns?.map((a: string) => (
                                                                <span key={a} style={{ background: '#F3F4F6', padding: '4px 10px', borderRadius: 5, fontSize: 12, fontWeight: 600 }}>
                                                                    {a.replace(/_/g, ' ')}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* TV Mounting Details */}
                                        {isTvMounting && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'TV count', fr: 'Nombre de TV' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{order.serviceDetails?.tvCount || 1}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Wall Material', fr: 'Type de mur' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{order.serviceDetails?.wallMaterial}</span>
                                                </div>
                                            </>
                                        )}

                                        {/* Delivery/Errands Details */}
                                        {isDelivery && (
                                            <>
                                                {order.serviceDetails?.recipientName && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Recipient</span>
                                                        <span style={{ fontSize: 14, fontWeight: 900, color: '#060708ff' }}>{order.serviceDetails?.recipientName}</span>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Schedule</span>
                                                    <span style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>
                                                        {order.serviceDetails?.deliveryType === 'standard' ? "As soon as possible" : `${order.serviceDetails?.deliveryDate} at ${order.serviceDetails?.deliveryTime}`}
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        {/* Glass Cleaning Details */}
                                        {(subId === 'residential_glass' || subId === 'commercial_glass') && (
                                            <>
                                                {subId === 'residential_glass' && (
                                                    <>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                            <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Coverage', fr: 'Couverture' })}</span>
                                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                                                                {order.serviceDetails?.windowCount || 5} {t({ en: 'Windows', fr: 'Fenêtres' })}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                            <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Window Size', fr: 'Taille fenêtres' })}</span>
                                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                                                                {(order.serviceDetails?.windowSize || 'medium').toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                                {subId === 'commercial_glass' && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                        <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Scale', fr: 'Taille' })}</span>
                                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                                                            {(order.serviceDetails?.storeFrontSize || 'small').toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Stories/Floors', fr: 'Étages' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{order.serviceDetails?.buildingStories || 1}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Accessibility', fr: 'Accessibilité' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: order.serviceDetails?.glassAccessibility === 'ladder' ? '#D97706' : '#111827' }}>
                                                        {order.serviceDetails?.glassAccessibility === 'ladder' ? t({ en: 'Ladder Required', fr: 'Échelle Requise' }) : t({ en: 'Ground Level', fr: 'Rez-de-chaussée' })}
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        {/* Hospitality Details */}
                                        {subId === 'hospitality_turnover' && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Units/Apartments', fr: 'Nombre de biens' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{order.serviceDetails?.unitCount || 1} {t({ en: 'Units', fr: 'Biens' })}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Stairs Cleaning', fr: 'Nettoyage escaliers' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{order.serviceDetails?.stairsType !== 'none' ? t({ en: 'Included', fr: 'Inclus' }) : t({ en: 'Not needed', fr: 'Non requis' })}</span>
                                                </div>
                                            </>
                                        )}

                                        {/* Tips Summary - applies to glass cleaning when they're active */}
                                        {(subId === 'residential_glass' || subId === 'commercial_glass') && (order.serviceDetails?.tipAmount > 0) && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, marginTop: 8, paddingTop: 8, borderTop: '1px dotted #E5E7EB' }}>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: '#D97706' }}>✨ {t({ en: 'Gratuity', fr: 'Pourboire' })}</span>
                                                <span style={{ fontSize: 14, fontWeight: 900, color: '#D97706' }}>+{order.serviceDetails?.tipAmount} MAD</span>
                                            </div>
                                        )}

                                        {/* Tips Summary - for general services if not handled above (simplified) */}
                                        {subId !== 'residential_glass' && subId !== 'commercial_glass' && (order.serviceDetails?.tipAmount > 0) && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, marginTop: 8, paddingTop: 8, borderTop: '1px dotted #E5E7EB' }}>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: '#D97706' }}>✨ {t({ en: 'Gratuity', fr: 'Pourboire' })}</span>
                                                <span style={{ fontSize: 14, fontWeight: 900, color: '#D97706' }}>+{order.serviceDetails?.tipAmount} MAD</span>
                                            </div>
                                        )}
                                        {/* Lawn Mowing Details */}
                                        {subId === 'lawn_mowing' && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Garden Size', fr: 'Taille du jardin' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{(order.serviceDetails?.gardenSize || 'small').toUpperCase()}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Mower Needed', fr: 'Tondeuse requise' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{order.serviceDetails?.needsMower ? t({ en: 'Yes', fr: 'Oui' }) : t({ en: 'No', fr: 'Non' })}</span>
                                                </div>
                                            </>
                                        )}

                                        {/* Tree Trimming Details */}
                                        {subId === 'branch_hedge_trimming' && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Tree Count', fr: 'Nombre d\'arbres' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{order.serviceDetails?.treeCount || 1}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Height', fr: 'Hauteur' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{(order.serviceDetails?.treeHeight || 'medium').toUpperCase()}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Service', fr: 'Service' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{(order.serviceDetails?.trimmingType || 'shaping').toUpperCase()}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#111827' }}>{t({ en: 'Waste Removal', fr: 'Évacuation' })}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{order.serviceDetails?.includeWasteRemoval ? t({ en: 'Yes', fr: 'Oui' }) : t({ en: 'No', fr: 'Non' })}</span>
                                                </div>
                                            </>
                                        )}
                                    </>
                                );
                            })()}

                            {(order.serviceDetails?.photoUrls?.length || 0) > 0 && (
                                <div style={{ marginTop: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase' }}>Photos ({order.serviceDetails?.photoUrls?.length})</span>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
                                        {order.serviceDetails?.photoUrls?.map((url: string, i: number) => (
                                            <img key={i} src={url} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Description Card */}
                {(order.carRentalNote || order.serviceDetails?.note || order.serviceDetails?.itemDescription) && (
                    <div style={{ marginTop: 24 }}>
                        <h3 style={{ fontSize: 30, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            Description
                        </h3>
                        <div style={{ padding: 16, borderRadius: 12, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                            <p style={{ fontSize: 14, color: '#4B5563', fontWeight: 600, lineHeight: 1.5 }}>
                                {order.carRentalNote || order.serviceDetails?.note || order.serviceDetails?.itemDescription}
                            </p>
                        </div>
                    </div>
                )}

                <h3 style={{ fontSize: 25, fontWeight: 600, marginTop: 32, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    Route Details <span style={{ fontSize: 24 }}>🗺️</span>
                </h3>

                {/* Route Section (Pic 4 Style) */}
                {((order.serviceType === 'moving' || order.serviceType?.includes('moving') || order.serviceType === 'errands' || order.subServiceId === 'packing') && order.serviceDetails?.needsTransport !== false) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                        <div style={{ height: 180, background: '#F3F4F6', borderRadius: 5, border: '1px solid #E5E7EB', overflow: 'hidden', position: 'relative' }}>
                            <MapView
                                initialLocation={order.location || { lat: 31.5085, lng: -9.7595 }}
                                interactive={false}
                                onLocationChange={() => { }}
                                lockCenterOnFocus={true}
                                zoom={14}
                                clientPin={order.location ? { lat: order.location.lat, lng: order.location.lng } : undefined}
                                destinationPin={order.serviceDetails?.dropoffCoords ? {
                                    lat: order.serviceDetails?.dropoffCoords.lat,
                                    lng: order.serviceDetails?.dropoffCoords.lng
                                } : undefined}
                            />
                            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)' }} />
                        </div>

                        {/* Delivery Estimate Bar */}
                        {travelInfo && (
                            <div style={{ padding: 16, background: '#F9FAFB', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #F3F4F6', fontStyle: 'italic' }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>Delivery Estimate</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 950, color: '#01A083' }}>{travelInfo.distanceKm.toFixed(1)} km</span>
                                    <span style={{ color: '#D1D5DB' }}>·</span>
                                    <span style={{ fontSize: 13, fontWeight: 900, color: '#111827' }}>{travelInfo.durationMinutes} min delivery</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Location Summaries */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 100 }}>
                    {/* Pickup Location (For Deliveries) or Current User Location (Standard) */}
                    <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src="/Images/Icons/Lightpin.png" alt="location" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                                {(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) ? 'Pickup Location' : 'Your Location'}
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {order.serviceDetails?.pickupAddress || order.location?.address}
                            </div>
                        </div>
                    </div>

                    {/* Dropoff Location (For Deliveries) */}
                    {(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) && order.serviceDetails?.dropoffAddress && (
                        <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src="/Images/Icons/Lightpin.png" alt="location" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Dropoff Location</div>
                                <div style={{ fontSize: 15, fontWeight: 900, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {order.serviceDetails?.dropoffAddress}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bricoler Location */}
                    <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src="/Images/Icons/Lightpin.png" alt="location" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Bricoler Location</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                                {order.providerAddress || 'Essaouira, Morocco'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Final Checkout Summary (100% Matched to Setup View Color/Design) */}
                <div style={{ margin: '32px -24px 0', position: 'relative' }}>
                    {/* Wave Transition matching setup/page.tsx */}
                    <div style={{ position: 'absolute', top: -40, left: 0, right: 0, height: 40, zIndex: 10, pointerEvents: 'none' }}>
                        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ width: '100%', height: '100%', fill: '#F2F2F2' }}>
                            <path d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                        </svg>
                    </div>

                    <div style={{ background: '#F2F2F2', padding: '16px 36px 70px', display: 'flex', flexDirection: 'column', gap: 32 }}>
                        <h3 style={{ fontSize: 35, fontWeight: 700, color: '#111827', margin: 0 }}>Summary</h3>

                        {(() => {
                            const slotsCount = (order.multiSlots && order.multiSlots.length > 0) ? order.multiSlots.length : 1;
                            const individualPricing = calculateOrderPrice(
                                order.subServiceId || order.serviceType,
                                order.providerRate || 80,
                                {
                                    rooms: order.serviceDetails?.rooms || 1,
                                    hours: order.serviceDetails?.taskDuration || 1,
                                    days: calculateDays() || 1,
                                    propertyType: order.serviceDetails?.propertyType,
                                    distanceKm: travelInfo?.distanceKm || 0,
                                    tvCount: order.serviceDetails?.tvCount,
                                    mountTypes: order.serviceDetails?.mountTypes,
                                    wallMaterial: order.serviceDetails?.wallMaterial,
                                    liftingHelp: order.serviceDetails?.liftingHelp,
                                    mountingAddOns: order.serviceDetails?.mountingAddOns,
                                    deliveryDistanceKm: order.serviceDetails?.deliveryDistanceKm,
                                    deliveryDurationMinutes: order.serviceDetails?.deliveryDurationMinutes,
                                    taskSize: order.serviceDetails?.taskSize,
                                    officeDesks: order.serviceDetails?.officeDesks,
                                    officeMeetingRooms: order.serviceDetails?.officeMeetingRooms,
                                    officeBathrooms: order.serviceDetails?.officeBathrooms,
                                    hasKitchenette: order.serviceDetails?.hasKitchenette,
                                    hasReception: order.serviceDetails?.hasReception,
                                    officeAddOns: order.serviceDetails?.officeAddOns,
                                    windowCount: order.serviceDetails?.windowCount,
                                    windowSize: order.serviceDetails?.windowSize,
                                    buildingStories: order.serviceDetails?.buildingStories,
                                    glassCleaningType: order.serviceDetails?.glassCleaningType,
                                    glassAccessibility: order.serviceDetails?.glassAccessibility,
                                    storeFrontSize: order.serviceDetails?.storeFrontSize,
                                    gardenSize: order.serviceDetails?.gardenSize,
                                    lawnCondition: order.serviceDetails?.lawnCondition,
                                    needsMower: order.serviceDetails?.needsMower,
                                    treeCount: order.serviceDetails?.treeCount,
                                    treeHeight: order.serviceDetails?.treeHeight,
                                    trimmingType: order.serviceDetails?.trimmingType,
                                    includeWasteRemoval: order.serviceDetails?.includeWasteRemoval,
                                    unitCount: order.serviceDetails?.unitCount,
                                    stairsType: order.serviceDetails?.stairsType,
                                    tipAmount: order.serviceDetails?.tipAmount,
                                }
                            );

                            const basePrice = individualPricing.basePrice;
                            const servicesTotal = individualPricing.subtotal * slotsCount;
                            const serviceFee = individualPricing.serviceFee * slotsCount;
                            const total = individualPricing.total * slotsCount;

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 18, fontWeight: 400, color: '#111827' }}>{t({ en: 'Base price', fr: 'Prix de base', ar: 'السعر الأساسي' })}</span>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>i</div>
                                        </div>
                                        <span style={{ fontSize: 18, fontWeight: 400, color: '#111827' }}>
                                            {Math.round(basePrice)} MAD/{individualPricing.unit === 'unit' ? (t({ en: 'unit', fr: 'unité', ar: 'وحدة' })) : individualPricing.unit === 'day' ? (t({ en: 'day', fr: 'jour', ar: 'يوم' })) : individualPricing.unit === 'office' ? (t({ en: 'office', fr: 'bureau', ar: 'مكتب' })) : individualPricing.unit === 'job' ? (t({ en: 'job', fr: 'mission', ar: 'مهمة' })) : (t({ en: 'hr', fr: 'h', ar: 'ساعة' }))}
                                        </span>
                                    </div>

                                    {individualPricing.details && individualPricing.details.map((detail, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, borderLeft: '2px solid rgba(1, 160, 131, 0.2)' }}>
                                            <span style={{ fontSize: 16, fontWeight: 600, color: '#4B5563' }}>{t(detail.label)}</span>
                                            <span style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>{detail.amount.toFixed(0)} MAD</span>
                                        </div>
                                    ))}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 18, fontWeight: 400, color: '#111827' }}>{t({ en: 'Services', fr: 'Services', ar: 'الخدمات' })}</span>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>i</div>
                                        </div>
                                        <span style={{ fontSize: 18, fontWeight: 400, color: '#111827' }}>{servicesTotal.toFixed(2)} MAD</span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 18, fontWeight: 400, color: '#111827' }}>{t({ en: 'Lbricol Fee', fr: 'Frais Lbricol', ar: 'رسوم Lbricol' })}</span>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>i</div>
                                        </div>
                                        <span style={{ fontSize: 18, fontWeight: 400, color: '#111827' }}>{serviceFee.toFixed(2)} MAD</span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ fontSize: 18, fontWeight: 400, color: '#111827' }}>{t({ en: 'Travel Fee', fr: 'Frais de déplacement', ar: 'رسوم التنقل' })}</span>
                                                <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>i</div>
                                            </div>
                                            {travelInfo ? (
                                                <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>{travelInfo.distanceKm} km · ~{travelInfo.durationMinutes} min</span>
                                            ) : (
                                                <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>0.0 km · ~0 min</span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: 18, fontWeight: 400, color: '#111827' }}>{(individualPricing.travelFee * slotsCount).toFixed(2)} MAD</span>
                                    </div>

                                    <div style={{ height: 1, background: '#E5E7EB', width: '100%', margin: '8px 0' }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{t({ en: 'Total to pay', fr: 'Total à payer', ar: 'الإجمالي للدفع' })}</span>
                                        <span style={{ fontSize: 25, fontWeight: 800, color: '#111827' }}>{total.toFixed(2)} MAD</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </main>

            {/* Bottom Footer */}
            <div style={{ position: 'relative', background: '#FFCC02', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', zIndex: 100, flexShrink: 0 }}>
                {/* Wave Top Effect Overlap */}
                <div style={{ position: 'absolute', top: -30, left: 0, right: 0, height: 30, zIndex: 10, pointerEvents: 'none' }}>
                    <svg viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ width: '100%', height: '100%', fill: '#FFCC02' }}>
                        <path d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,192C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                    </svg>
                </div>
                {(() => {
                    const slotsCount = (order.multiSlots && order.multiSlots.length > 0) ? order.multiSlots.length : 1;
                    const individualPricing = calculateOrderPrice(
                        order.subServiceId || order.serviceType || 'car_rental',
                        order.selectedCar?.pricePerDay || order.providerRate || 0,
                        {
                            rooms: order.serviceDetails?.rooms || 1,
                            hours: order.serviceDetails?.taskDuration || 1,
                            days: calculateDays() || 1,
                            propertyType: order.serviceDetails?.propertyType,
                            distanceKm: travelInfo?.distanceKm || 0,
                            // TV Mounting specific
                            tvCount: order.serviceDetails?.tvCount,
                            mountTypes: order.serviceDetails?.mountTypes,
                            wallMaterial: order.serviceDetails?.wallMaterial,
                            liftingHelp: order.serviceDetails?.liftingHelp,
                            mountingAddOns: order.serviceDetails?.mountingAddOns,
                            deliveryDistanceKm: order.serviceDetails?.deliveryDistanceKm,
                            deliveryDurationMinutes: order.serviceDetails?.deliveryDurationMinutes,
                            taskSize: order.serviceDetails?.taskSize,
                            // Office Cleaning specific
                            officeDesks: order.serviceDetails?.officeDesks,
                            officeMeetingRooms: order.serviceDetails?.officeMeetingRooms,
                            officeBathrooms: order.serviceDetails?.officeBathrooms,
                            hasKitchenette: order.serviceDetails?.hasKitchenette,
                            hasReception: order.serviceDetails?.hasReception,
                            officeAddOns: order.serviceDetails?.officeAddOns,
                            // Glass Cleaning specific
                            windowCount: order.serviceDetails?.windowCount,
                            windowSize: order.serviceDetails?.windowSize,
                            buildingStories: order.serviceDetails?.buildingStories,
                            glassCleaningType: order.serviceDetails?.glassCleaningType,
                            glassAccessibility: order.serviceDetails?.glassAccessibility,
                            storeFrontSize: order.serviceDetails?.storeFrontSize,
                            // Gardening specific
                            gardenSize: order.serviceDetails?.gardenSize,
                            lawnCondition: order.serviceDetails?.lawnCondition,
                            needsMower: order.serviceDetails?.needsMower,
                            // Tree Trimming specific
                            treeCount: order.serviceDetails?.treeCount,
                            treeHeight: order.serviceDetails?.treeHeight,
                            trimmingType: order.serviceDetails?.trimmingType,
                            includeWasteRemoval: order.serviceDetails?.includeWasteRemoval,
                            // Hospitality enhancements
                            unitCount: order.serviceDetails?.unitCount,
                            stairsType: order.serviceDetails?.stairsType,
                            tipAmount: order.serviceDetails?.tipAmount,
                        }
                    );
                    const total = individualPricing.total * slotsCount;

                    return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
                            <span style={{ fontSize: 22, fontWeight: 950 }}>Total</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                <span style={{ fontSize: 32, fontWeight: 1000 }}>{total.toFixed(2)}</span>
                                <span style={{ fontSize: 16, fontWeight: 900, color: '#111827' }}>MAD</span>
                            </div>
                        </div>
                    );
                })()}

                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleBack} style={{ width: 60, height: 60, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.05)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <ChevronLeft size={24} />
                    </button>
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleProgramMission}
                        disabled={isSubmitting || (paymentMethod === 'bank_transfer' && !receiptImage)}
                        style={{
                            flex: 1,
                            height: 60,
                            borderRadius: 50,
                            background: (paymentMethod === 'bank_transfer' && !receiptImage) ? '#9CA3AF' : '#01A083',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: 17,
                            fontWeight: 900,
                            cursor: (paymentMethod === 'bank_transfer' && !receiptImage) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                        }}
                    >
                        {isSubmitting ? 'Processing...' : 'Program Mission'}
                        <CheckCircle2 size={20} />
                    </motion.button>
                </div>
            </div>

            {/* Authentication Popups */}
            <AuthPopup
                isOpen={showAuthPopup}
                onClose={() => setShowAuthPopup(false)}
                onSuccess={async () => {
                    setShowAuthPopup(false);
                    const currUser = auth.currentUser;
                    if (currUser) {
                        setUser(currUser);
                        
                        // Robust check: both collections
                        const [uSnap, cSnap] = await Promise.all([
                            getDoc(doc(db, 'users', currUser.uid)),
                            getDoc(doc(db, 'clients', currUser.uid))
                        ]);
                        
                        let combinedData: any = {};
                        if (uSnap.exists()) combinedData = { ...combinedData, ...uSnap.data() };
                        if (cSnap.exists()) combinedData = { ...combinedData, ...cSnap.data() };
                        
                        const cachedPhone = localStorage.getItem('lbricol_user_phone');
                        const finalNumber = combinedData.whatsappNumber || cachedPhone;

                        if (finalNumber) {
                            setUserData({ ...combinedData, whatsappNumber: finalNumber });
                            createOrders(currUser, finalNumber);
                        } else {
                            setUserData(combinedData);
                            setShowWhatsAppPopup(true);
                        }
                    }
                }}
            />

            <ClientWhatsAppPopup
                isOpen={showWhatsAppPopup}
                onClose={() => setShowWhatsAppPopup(false)}
                onSuccess={(number) => {
                    setShowWhatsAppPopup(false);
                    localStorage.setItem('lbricol_user_phone', number);
                    createOrders(user, number);
                }}
            />

            {/* Success Overlay */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 5000, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                                <div style={{ width: 100, height: 100, background: 'rgba(0, 160, 130, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                    <Check size={50} color="#01A083" strokeWidth={4} />
                                </div>
                            </motion.div>
                            <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>Mission Programmed!</h2>
                            <p style={{ color: '#6B7280', fontWeight: 600, lineHeight: 1.5 }}>
                                {order.isPublic
                                    ? "Your request has been broadcasted to all Bricolers in your city."
                                    : `Your request has been sent to ${order.providerName}.`} <br />
                                You can track it in your calendar.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
