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
    Star
} from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import AuthPopup from '@/features/onboarding/components/AuthPopup';
import ClientWhatsAppPopup from '@/features/client/components/ClientWhatsAppPopup';
import { useLanguage } from '@/context/LanguageContext';
import { calculateOrderPrice } from '@/lib/pricing';
import { getServiceVector } from '@/config/services_config';

export default function CheckoutPage() {
    const router = useRouter();
    const { t } = useLanguage();
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

    const createOrder = async (finalUser: any, finalWhatsApp: string) => {
        setIsSubmitting(true);
        try {
            // 1. Ensure user profile is updated with WhatsApp if new
            if (finalWhatsApp && (!userData?.whatsappNumber)) {
                await setDoc(doc(db, 'clients', finalUser.uid), {
                    whatsappNumber: finalWhatsApp,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            }

            const pricing = calculateOrderPrice(
                order.serviceType || 'car_rental',
                order.selectedCar?.pricePerDay || order.providerRate || 0,
                {
                    rooms: order.serviceDetails?.rooms || 1,
                    hours: 1, // Default
                    days: calculateDays() || 1
                }
            );

            // 2. Create the Job/Mission
            const jobData = {
                clientId: finalUser.uid,
                clientName: finalUser.displayName || 'Client',
                bricolerId: order.isPublic ? null : order.providerId,
                bricolerName: order.isPublic ? 'Broadcast' : order.providerName,
                bricolerAddress: order.providerAddress || 'Essaouira, Morocco',
                bricolerAvatar: order.providerAvatar,
                service: order.serviceType || 'car_rental', // Top level service ID
                serviceType: order.serviceType,
                serviceName: order.serviceName,
                location: order.location?.address || '',
                locationDetails: order.location,
                city: order.location?.city || '',
                area: order.location?.area || '',
                isPublic: order.isPublic || false,
                date: order.date || order.carRentalDates?.pickupDate || new Date().toISOString().split('T')[0],
                time: order.time || order.carRentalDates?.pickupTime || "10:00",
                // Car rental specific top-level fields for easy listing
                selectedCar: order.selectedCar,
                carRentalDates: order.carRentalDates,
                carReturnDate: order.carRentalDates?.returnDate,
                carReturnTime: order.carRentalDates?.returnTime,
                carRentalNote: order.carRentalNote,
                status: order.isPublic ? 'broadcast' : 'programmed', // Broadcast status for public orders
                paymentMethod,
                totalPrice: pricing.total,
                whatsappNumber: finalWhatsApp, // Explicitly attach to job
                details: {
                    car: order.selectedCar,
                    carRentalDates: order.carRentalDates,
                    note: order.carRentalNote || (order.serviceDetails as any)?.note || (order.serviceDetails as any)?.itemDescription,
                    serviceDetails: order.serviceDetails || {},
                    setupProfileId: order.setupProfileId || '',
                    basePrice: pricing.subtotal,
                    fee: pricing.serviceFee,
                    // Delivery specific fields in details
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

            // 3. Success!
            setShowSuccess(true);
            setTimeout(() => {
                resetOrder();
                router.replace('/?tab=calendar'); // Redirect to 'Orders' (Activity) view
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

        createOrder(user, userData.whatsappNumber);
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
        return order.date ? new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
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

            <main style={{ padding: '0 24px 120px', flex: 1, overflowY: 'auto' }} className="no-scrollbar">
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
                    <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.5px' }}>Your Bricol.com Order</h2>
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
                    <h3 style={{ fontSize: 20, fontWeight: 950, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                        Payment <span style={{ fontSize: 24 }}>💸</span>
                    </h3>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#9CA3AF', marginBottom: 20 }}>Choose your payment method</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div
                            onClick={() => setPaymentMethod('cash')}
                            style={{
                                padding: 16, borderRadius: 16, border: '2px solid',
                                borderColor: paymentMethod === 'cash' ? '#FBBF24' : '#F3F4F6',
                                background: paymentMethod === 'cash' ? '#FFFBEB' : '#F9FAFB',
                                cursor: 'pointer', position: 'relative'
                            }}
                        >
                            <div style={{ fontSize: 24, marginBottom: 12 }}>💵</div>
                            <div style={{ fontWeight: 900, fontSize: 15, color: '#111827' }}>Cash</div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: '#9CA3AF' }}>On delivery</div>
                            {paymentMethod === 'cash' && (
                                <div style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, background: '#FBBF24', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check size={12} color="#fff" strokeWidth={4} />
                                </div>
                            )}
                        </div>

                        <div
                            onClick={() => setPaymentMethod('bank_transfer')}
                            style={{
                                padding: 16, borderRadius: 16, border: '2px solid',
                                borderColor: paymentMethod === 'bank_transfer' ? '#FBBF24' : '#F3F4F6',
                                background: paymentMethod === 'bank_transfer' ? '#FFFBEB' : '#F9FAFB',
                                cursor: 'pointer', position: 'relative'
                            }}
                        >
                            <div style={{ fontSize: 24, marginBottom: 12 }}>🏦</div>
                            <div style={{ fontWeight: 900, fontSize: 15, color: '#111827' }}>Bank Transfer</div>
                            <div style={{ fontWeight: 700, fontSize: 11, color: '#9CA3AF' }}>WhatsApp verify</div>
                            {paymentMethod === 'bank_transfer' && (
                                <div style={{ position: 'absolute', top: 12, right: 12, width: 20, height: 20, background: '#FBBF24', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check size={12} color="#fff" strokeWidth={4} />
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
                                style={{ overflow: 'hidden', marginTop: 12 }}
                            >
                                <div style={{ padding: 20, background: '#F9FAFB', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>RIB</div>
                                        <div style={{ fontSize: 15, fontWeight: 900, color: '#111827' }}>350810000000000880844466</div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>Name</div>
                                            <div style={{ fontSize: 13, fontWeight: 900, color: '#111827' }}>Abdelmalek Tahri</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>Bank</div>
                                            <div style={{ fontSize: 13, fontWeight: 900, color: '#111827' }}>Al Barid Bank</div>
                                        </div>
                                    </div>

                                    <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
                                        <p style={{ fontSize: 12, fontWeight: 800, color: '#4B5563', marginBottom: 12 }}>Please upload the transfer receipt to program your order:</p>
                                        <input
                                            type="file"
                                            id="receipt"
                                            hidden
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setIsUploading(true);
                                                    // Simulate upload
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
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                                height: 48, borderRadius: 12, background: receiptImage ? '#F0FDF4' : '#fff',
                                                border: '2px dashed', borderColor: receiptImage ? '#01A083' : '#E5E7EB',
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            {isUploading ? 'Uploading...' : (receiptImage ? <><Check size={18} color="#01A083" /> Receipt Uploaded</> : 'Select Receipt Image')}
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
                        <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            Setup Summary <span style={{ fontSize: 24 }}>🏠</span>
                        </h3>
                        <div style={{ padding: 16, background: '#F9FAFB', borderRadius: 16, border: '1px solid #E5E7EB' }}>
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
                        <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            Description <span style={{ fontSize: 24 }}>📝</span>
                        </h3>
                        <div style={{ padding: 16, background: '#F9FAFB', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                            <p style={{ fontSize: 14, color: '#4B5563', fontWeight: 600, lineHeight: 1.5 }}>
                                {order.carRentalNote || (order.serviceDetails as any)?.note || (order.serviceDetails as any)?.itemDescription}
                            </p>
                        </div>
                    </div>
                )}

                <h3 style={{ fontSize: 18, fontWeight: 900, marginTop: 32, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Location <span style={{ fontSize: 24 }}>📍</span>
                </h3>

                {/* Location Summaries */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                    {/* Pickup Location (For Deliveries) or Current User Location (Standard) */}
                    <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <MapPin size={22} color="#00A082" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
                                {(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) ? 'Pickup Location' : 'Your Location'}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                                {(order.serviceDetails as any)?.pickupAddress || order.location?.address}
                            </div>
                        </div>
                    </div>

                    {/* Dropoff Location (For Deliveries) */}
                    {(order.serviceType === 'errands' || order.serviceType?.includes('delivery')) && (order.serviceDetails as any)?.dropoffAddress && (
                        <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <MapPin size={22} color="#EF4444" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Dropoff Location</div>
                                <div style={{ fontSize: 14, fontWeight: 900, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                                    {(order.serviceDetails as any).dropoffAddress}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bricoler Location */}
                    <div style={{ padding: '16px 20px', background: '#F9FAFB', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <Star size={22} color="#FBBF24" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Bricoler Location</div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                                {order.providerAddress || 'Essaouira, Morocco'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pricing Summary */}
                <div style={{ padding: 20, background: '#F9FAFB', borderRadius: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Pricing Summary</div>

                    {(() => {
                        const pricing = calculateOrderPrice(
                            order.serviceType || 'car_rental',
                            order.selectedCar?.pricePerDay || order.providerRate || 0,
                            {
                                rooms: order.serviceDetails?.rooms || 1,
                                hours: 1, // Default
                                days: calculateDays() || 1
                            }
                        );

                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#6B7280' }}>Base Price</span>
                                    <span style={{ fontSize: 15, fontWeight: 900, color: '#111827' }}>{pricing.subtotal} MAD</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#6B7280' }}>Lbricol Fee (10%)</span>
                                    <span style={{ fontSize: 15, fontWeight: 900, color: '#00A082' }}>+ {pricing.serviceFee} MAD</span>
                                </div>
                                <div style={{ height: 1, background: '#E5E7EB', margin: '4px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 16, fontWeight: 950, color: '#111827' }}>Total</span>
                                    <span style={{ fontSize: 18, fontWeight: 950, color: '#111827' }}>{pricing.total} MAD</span>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </main>

            {/* Bottom Footer */}
            <div style={{ background: '#fff', borderTop: '1px solid #F3F4F6', padding: '24px 24px calc(24px + env(safe-area-inset-bottom))', zIndex: 100, flexShrink: 0 }}>
                {(() => {
                    const pricing = calculateOrderPrice(
                        order.serviceType || 'car_rental',
                        order.selectedCar?.pricePerDay || order.providerRate || 0,
                        {
                            rooms: order.serviceDetails?.rooms || 1,
                            hours: 1, // Default
                            days: calculateDays() || 1
                        }
                    );
                    return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
                            <span style={{ fontSize: 22, fontWeight: 900 }}>Total</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                <span style={{ fontSize: 28, fontWeight: 950 }}>{pricing.total}</span>
                                <span style={{ fontSize: 16, fontWeight: 900, color: '#6B7280' }}>MAD</span>
                            </div>
                        </div>
                    );
                })()}

                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={handleBack} style={{ width: 60, height: 60, borderRadius: 18, border: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <ChevronLeft size={24} />
                    </button>
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleProgramMission}
                        disabled={isSubmitting || (paymentMethod === 'bank_transfer' && !receiptImage)}
                        style={{
                            flex: 1,
                            height: 60,
                            borderRadius: 16,
                            background: (paymentMethod === 'bank_transfer' && !receiptImage) ? '#9CA3AF' : '#00A082',
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
                        const docSnap = await getDoc(doc(db, 'users', currUser.uid));
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            setUserData(data);
                            if (data.whatsappNumber) {
                                createOrder(currUser, data.whatsappNumber);
                            } else {
                                setShowWhatsAppPopup(true);
                            }
                        } else {
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
                    createOrder(user, number);
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
                                    <Check size={50} color="#00A082" strokeWidth={4} />
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
