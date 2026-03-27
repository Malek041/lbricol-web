'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    X,
    Check,
    CreditCard,
    Banknote,
    MapPin,
    Clock,
    Calendar,
    CheckCircle2,
    ArrowRight,
    Star,
    Info,
    ChevronRight,
    Search,
    Navigation,
    Truck,
    Package
} from 'lucide-react';
import MapView from '@/components/location-picker/MapView';
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
    const [showSuccess, setShowSuccess] = useState(false);
    const [receiptImage, setReceiptImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [travelInfo, setTravelInfo] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);

    // ── Pre-flight Checks ────────────────────────────────────────────────
    useEffect(() => {
        if ((!order.providerId && !order.isPublic) || !order.location) {
            router.push('/order/step1');
            return;
        }

        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const docSnap = await getDoc(doc(db, 'users', u.uid));
                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                } else {
                    // Check client doc as fallback
                    const clientSnap = await getDoc(doc(db, 'clients', u.uid));
                    if (clientSnap.exists()) setUserData(clientSnap.data());
                }
            }
            setLoading(false);
        });
        return () => unsub();
    }, [order, router]);

    useEffect(() => {
        const isSpecialized = order.serviceType === 'moving' || order.serviceType?.includes('moving') || order.serviceType === 'errands' || (order.serviceType === 'delivery') || order.subServiceId === 'packing';

        if (isSpecialized) {
            const pickup = (order.serviceDetails as any)?.pickupCoords || order.location;
            const dropoff = (order.serviceDetails as any)?.dropoffCoords;

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
            if (finalWhatsApp && (!userData?.whatsappNumber)) {
                await setDoc(doc(db, 'clients', finalUser.uid), {
                    whatsappNumber: finalWhatsApp,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            }

            // Determine slots to process
            const slotsToProcess = (order.multiSlots && order.multiSlots.length > 0)
                ? order.multiSlots
                : [{ date: order.date || order.carRentalDates?.pickupDate || new Date().toISOString(), time: order.time || order.carRentalDates?.pickupTime || "10:00" }];

            // 2. Create the Job/Mission(s)
            for (const slot of slotsToProcess) {
                const pricing = calculateOrderPrice(
                    order.subServiceId || order.serviceType,
                    order.providerRate || 80,
                    {
                        rooms: order.serviceDetails?.rooms || 1,
                        hours: (order.serviceDetails as any)?.taskDuration || 1,
                        days: calculateDays() || 1,
                        propertyType: (order.serviceDetails as any)?.propertyType,
                        distanceKm: travelInfo?.distanceKm || 0,
                        // TV Mounting specific
                        tvCount: (order.serviceDetails as any)?.tvCount,
                        mountTypes: (order.serviceDetails as any)?.mountTypes,
                        wallMaterial: (order.serviceDetails as any)?.wallMaterial,
                        liftingHelp: (order.serviceDetails as any)?.liftingHelp,
                        mountingAddOns: (order.serviceDetails as any)?.mountingAddOns,
                        deliveryDistanceKm: (order.serviceDetails as any)?.deliveryDistanceKm,
                        deliveryDurationMinutes: (order.serviceDetails as any)?.deliveryDurationMinutes,
                    }
                );

                const slotDate = slot.date.includes('T') ? slot.date.split('T')[0] : slot.date;

                const jobData = {
                    clientId: finalUser.uid,
                    clientName: finalUser.displayName || 'Client',
                    bricolerId: order.isPublic ? null : order.providerId,
                    bricolerName: order.isPublic ? 'Broadcast' : order.providerName,
                    bricolerAddress: order.providerAddress || 'Essaouira, Morocco',
                    bricolerAvatar: order.providerAvatar,
                    service: order.serviceType || 'car_rental',
                    serviceType: order.serviceType,
                    serviceName: order.serviceName,
                    location: order.location?.address || '',
                    locationDetails: order.location,
                    city: order.location?.city || '',
                    area: order.location?.area || '',
                    isPublic: order.isPublic || false,
                    date: slotDate,
                    time: slot.time,
                    selectedCar: order.selectedCar,
                    carRentalDates: order.carRentalDates,
                    carReturnDate: order.carRentalDates?.returnDate,
                    carReturnTime: order.carRentalDates?.returnTime,
                    carRentalNote: order.carRentalNote,
                    status: order.isPublic ? 'broadcast' : 'programmed',
                    paymentMethod,
                    totalPrice: pricing.total,
                    whatsappNumber: finalWhatsApp,
                    details: {
                        car: order.selectedCar,
                        carRentalDates: order.carRentalDates,
                        note: order.carRentalNote || (order.serviceDetails as any)?.note || (order.serviceDetails as any)?.itemDescription,
                        serviceDetails: order.serviceDetails || {},
                        setupProfileId: order.setupProfileId || '',
                        basePrice: pricing.subtotal,
                        fee: pricing.serviceFee,
                        deliveryDetails: {
                            pickupAddress: (order.serviceDetails as any)?.pickupAddress,
                            dropoffAddress: (order.serviceDetails as any)?.dropoffAddress,
                            recipientName: (order.serviceDetails as any)?.recipientName,
                            recipientPhone: (order.serviceDetails as any)?.recipientPhone,
                            deliveryType: (order.serviceDetails as any)?.deliveryType,
                            deliveryDate: (order.serviceDetails as any)?.deliveryDate,
                            deliveryTime: (order.serviceDetails as any)?.deliveryTime
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

    const calculateDays = () => {
        if (!order.carRentalDates) return 1;
        const start = new Date(`${order.carRentalDates.pickupDate}T${order.carRentalDates.pickupTime}`);
        const end = new Date(`${order.carRentalDates.returnDate}T${order.carRentalDates.returnTime}`);
        const diff = end.getTime() - start.getTime();
        return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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
                    <h3 style={{ fontSize: 30, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                        Payment
                    </h3>
                    <p style={{ fontSize: 14, fontWeight: 400, color: '#9CA3AF', marginBottom: 20 }}>Choose your payment method</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div
                            onClick={() => setPaymentMethod('cash')}
                            style={{
                                padding: '24px 20px', borderRadius: 5, border: '2px solid',
                                borderColor: paymentMethod === 'cash' ? '#219178' : '#F3F4F6',
                                background: paymentMethod === 'cash' ? '#F0FDF9' : '#F9FAFB',
                                cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: 32, marginBottom: 12 }}>💵</div>
                            <div style={{ fontWeight: 1000, fontSize: 16, color: '#111827', marginBottom: 4 }}>Cash</div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: paymentMethod === 'cash' ? '#219178' : '#9CA3AF' }}>On delivery</div>
                            {paymentMethod === 'cash' && (
                                <div style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, background: '#219178', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check size={14} color="#fff" strokeWidth={5} />
                                </div>
                            )}
                        </div>

                        <div
                            onClick={() => setPaymentMethod('bank_transfer')}
                            style={{
                                padding: '24px 20px', borderRadius: 5, border: '2px solid',
                                borderColor: paymentMethod === 'bank_transfer' ? '#219178' : '#F3F4F6',
                                background: paymentMethod === 'bank_transfer' ? '#F0FDF9' : '#F9FAFB',
                                cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
                            <div style={{ fontWeight: 1000, fontSize: 16, color: '#111827', marginBottom: 4 }}>Bank Transfer</div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: paymentMethod === 'bank_transfer' ? '#219178' : '#9CA3AF' }}>WhatsApp verify</div>
                            {paymentMethod === 'bank_transfer' && (
                                <div style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, background: '#219178', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                                                border: '2px dashed', borderColor: receiptImage ? '#219178' : '#D1D5DB',
                                                cursor: 'pointer', transition: 'all 0.2s', fontWeight: 900, color: receiptImage ? '#219178' : '#6B7280', fontSize: 15
                                            }}
                                        >
                                            {isUploading ? 'Uploading...' : (receiptImage ? <><CheckCircle2 size={20} color="#219178" /> Receipt Saved</> : <><CreditCard size={20} /> Select Image</>)}
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
                        <h3 style={{ fontSize: 30, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            Setup Summary
                        </h3>
                        <div style={{ padding: 16, borderRadius: 5, border: '1px solid #E5E7EB' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 17, fontWeight: 400, color: '#6B7280' }}>Service</span>
                                <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>{order.serviceName}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid #F3F4F6', paddingBottom: 12 }}>
                                <span style={{ fontSize: 17, fontWeight: 400, color: '#6B7280' }}>Category</span>
                                <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>{order.subServiceName}</span>
                            </div>
                            {/* Standard Setup Fields */}
                            {(order.serviceType === 'cleaning' || order.serviceType === 'airbnb_cleaning') && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#6B7280' }}>Property Type</span>
                                        <span style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>{order.serviceDetails.propertyType}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#6B7280' }}>Rooms</span>
                                        <span style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>{order.serviceDetails.rooms} Rooms</span>
                                    </div>
                                </>
                            )}

                            {/* Delivery Setup Fields */}
                            {(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) && (
                                <>
                                    {(order.serviceDetails as any).recipientName && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#6B7280' }}>Recipient</span>
                                            <span style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>{(order.serviceDetails as any).recipientName}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#6B7280' }}>Schedule</span>
                                        <span style={{ fontSize: 14, fontWeight: 900, color: '#111827' }}>
                                            {(order.serviceDetails as any).deliveryType === 'standard' ? "As soon as possible" : `${(order.serviceDetails as any).deliveryDate} at ${(order.serviceDetails as any).deliveryTime}`}
                                        </span>
                                    </div>
                                </>
                            )}

                            {order.serviceDetails.photoUrls && order.serviceDetails.photoUrls.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase' }}>Photos ({order.serviceDetails.photoUrls.length})</span>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto' }}>
                                        {order.serviceDetails.photoUrls.map((url: string, i: number) => (
                                            <img key={i} src={url} style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Description Card */}
                {(order.carRentalNote || (order.serviceDetails as any)?.note || (order.serviceDetails as any)?.itemDescription) && (
                    <div style={{ marginTop: 24 }}>
                        <h3 style={{ fontSize: 30, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            Description
                        </h3>
                        <div style={{ padding: 16, borderRadius: 5, border: '1px solid #E5E7EB' }}>
                            <p style={{ fontSize: 14, color: '#4B5563', fontWeight: 600, lineHeight: 1.5 }}>
                                {order.carRentalNote || (order.serviceDetails as any)?.note || (order.serviceDetails as any)?.itemDescription}
                            </p>
                        </div>
                    </div>
                )}

                <h3 style={{ fontSize: 30, fontWeight: 700, marginTop: 32, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    Route Details <span style={{ fontSize: 24 }}>🗺️</span>
                </h3>

                {/* Route Section (Pic 4 Style) */}
                {((order.serviceType === 'moving' || order.serviceType?.includes('moving') || order.serviceType === 'errands' || order.subServiceId === 'packing') && (order.serviceDetails as any)?.needsTransport !== false) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                        <div style={{ height: 180, background: '#F3F4F6', borderRadius: 5, border: '1px solid #E5E7EB', overflow: 'hidden', position: 'relative' }}>
                            <MapView
                                initialLocation={order.location || { lat: 31.5085, lng: -9.7595 }}
                                interactive={false}
                                onLocationChange={() => { }}
                                lockCenterOnFocus={true}
                                zoom={14}
                                clientPin={order.location ? { lat: order.location.lat, lng: order.location.lng } : undefined}
                                destinationPin={(order.serviceDetails as any)?.dropoffCoords ? {
                                    lat: (order.serviceDetails as any).dropoffCoords.lat,
                                    lng: (order.serviceDetails as any).dropoffCoords.lng
                                } : undefined}
                            />
                            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)' }} />
                        </div>

                        {/* Delivery Estimate Bar */}
                        {travelInfo && (
                            <div style={{ padding: 16, background: '#F9FAFB', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #F3F4F6', fontStyle: 'italic' }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>Delivery Estimate</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 950, color: '#219178' }}>{travelInfo.distanceKm.toFixed(1)} km</span>
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
                                {(order.serviceDetails as any)?.pickupAddress || order.location?.address}
                            </div>
                        </div>
                    </div>

                    {/* Dropoff Location (For Deliveries) */}
                    {(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) && (order.serviceDetails as any)?.dropoffAddress && (
                        <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src="/Images/Icons/Lightpin.png" alt="location" style={{ width: 34, height: 34, objectFit: 'contain' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Dropoff Location</div>
                                <div style={{ fontSize: 15, fontWeight: 900, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {(order.serviceDetails as any).dropoffAddress}
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

                    <div style={{ background: '#F2F2F2', padding: '16px 36px 150px', display: 'flex', flexDirection: 'column', gap: 32 }}>
                        <h3 style={{ fontSize: 28, fontWeight: 1000, color: '#111827', margin: 0 }}>Summary</h3>

                        {(() => {
                            const slotsCount = (order.multiSlots && order.multiSlots.length > 0) ? order.multiSlots.length : 1;
                            const individualPricing = calculateOrderPrice(
                                order.subServiceId || order.serviceType,
                                order.providerRate || 80,
                                {
                                    rooms: order.serviceDetails?.rooms || 1,
                                    hours: (order.serviceDetails as any)?.taskDuration || 1,
                                    days: calculateDays() || 1,
                                    propertyType: (order.serviceDetails as any)?.propertyType,
                                    distanceKm: travelInfo?.distanceKm || 0,
                                    // TV Mounting specific
                                    tvCount: (order.serviceDetails as any)?.tvCount,
                                    mountTypes: (order.serviceDetails as any)?.mountTypes,
                                    wallMaterial: (order.serviceDetails as any)?.wallMaterial,
                                    liftingHelp: (order.serviceDetails as any)?.liftingHelp,
                                    mountingAddOns: (order.serviceDetails as any)?.mountingAddOns,
                                    deliveryDistanceKm: (order.serviceDetails as any)?.deliveryDistanceKm,
                                    deliveryDurationMinutes: (order.serviceDetails as any)?.deliveryDurationMinutes,
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
                                            <span style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Base price</span>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>i</div>
                                        </div>
                                        <span style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>
                                            {Math.round(basePrice)} MAD/{individualPricing.unit === 'unit' ? 'unit' : individualPricing.unit === 'day' ? 'day' : 'hr'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Services</span>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>i</div>
                                        </div>
                                        <span style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{servicesTotal.toFixed(2)} MAD</span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Lbricol Fee</span>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>i</div>
                                        </div>
                                        <span style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{serviceFee.toFixed(2)} MAD</span>
                                    </div>

                                    {individualPricing.travelFee > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Travel Fee</span>
                                                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9CA3AF', fontWeight: 700 }}>i</div>
                                                </div>
                                                {travelInfo && (
                                                    <span style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF' }}>{travelInfo.distanceKm} km · ~{travelInfo.durationMinutes} min</span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{individualPricing.travelFee.toFixed(2)} MAD</span>
                                        </div>
                                    )}

                                    <div style={{ height: 1, background: '#E5E7EB', width: '100%', margin: '8px 0' }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 22, fontWeight: 1000, color: '#111827' }}>Total to pay</span>
                                        <span style={{ fontSize: 25, fontWeight: 1000, color: '#111827' }}>{total.toFixed(2)} MAD</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </main>

            {/* Bottom Footer */}
            <div style={{ position: 'relative', background: '#FFC244', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', zIndex: 100, flexShrink: 0 }}>
                {/* Wave Top Effect Overlap */}
                <div style={{ position: 'absolute', top: -30, left: 0, right: 0, height: 30, zIndex: 10, pointerEvents: 'none' }}>
                    <svg viewBox="0 0 1440 320" preserveAspectRatio="none" style={{ width: '100%', height: '100%', fill: '#FFC244' }}>
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
                            hours: (order.serviceDetails as any)?.taskDuration || 1,
                            days: calculateDays() || 1,
                            propertyType: (order.serviceDetails as any)?.propertyType,
                            distanceKm: travelInfo?.distanceKm || 0,
                            // TV Mounting specific
                            tvCount: (order.serviceDetails as any)?.tvCount,
                            mountTypes: (order.serviceDetails as any)?.mountTypes,
                            wallMaterial: (order.serviceDetails as any)?.wallMaterial,
                            liftingHelp: (order.serviceDetails as any)?.liftingHelp,
                            mountingAddOns: (order.serviceDetails as any)?.mountingAddOns,
                            deliveryDistanceKm: (order.serviceDetails as any)?.deliveryDistanceKm,
                            deliveryDurationMinutes: (order.serviceDetails as any)?.deliveryDurationMinutes,
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
                            background: (paymentMethod === 'bank_transfer' && !receiptImage) ? '#9CA3AF' : '#219178',
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
                        // Check users collection first
                        let userSnap = await getDoc(doc(db, 'users', currUser.uid));
                        let data = userSnap.exists() ? userSnap.data() : null;

                        // If not in users, check clients collection
                        if (!data) {
                            const clientSnap = await getDoc(doc(db, 'clients', currUser.uid));
                            if (clientSnap.exists()) data = clientSnap.data();
                        }

                        if (data) {
                            setUserData(data);
                            if (data.whatsappNumber) {
                                createOrders(currUser, data.whatsappNumber);
                            } else {
                                setShowWhatsAppPopup(true);
                            }
                        } else {
                            // No data in either collection
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
                                    <Check size={50} color="#219178" strokeWidth={4} />
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
