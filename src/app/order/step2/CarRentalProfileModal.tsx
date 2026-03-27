import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SplashScreen from '@/components/layout/SplashScreen';
import { ChevronLeft, ChevronRight, Star, Clock, MapPin, Calendar, CheckCircle2, Car, Check, ChevronDown, RefreshCw, Trophy } from 'lucide-react';
import { CAR_BRANDS } from '@/config/cars_config';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const formatServiceName = (name: string) => {
    if (!name) return '';
    return name
        .replace(/[_-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export function CarRentalProfileModal({
    isOpen, onClose, provider, onSelect, order, displayRate: propDisplayRate
}: {
    isOpen: boolean; onClose: () => void; provider: any; onSelect: (car: any, note: string, dates: any) => void; order: any; displayRate: number;
}) {
    const [localSelectedCar, setLocalSelectedCar] = useState<any>(null);
    const [localNote, setLocalNote] = useState('');
    const [pickupDate, setPickupDate] = useState('');
    const [pickupTime, setPickupTime] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [returnTime, setReturnTime] = useState('');
    const [activePicker, setActivePicker] = useState<'pickup_date' | 'pickup_time' | 'return_date' | 'return_time' | null>(null);
    const [isSplashing, setIsSplashing] = useState(false);

    const [activeTab, setActiveTab] = useState<'setup' | 'details'>('setup');

    // Formatting helper for Pic 3 style
    const formatDateLabel = (dateStr: string) => {
        if (!dateStr) return 'Select Date';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const timeOptions: string[] = [];
    for (let h = 8; h <= 21; h++) {
        for (let m = 0; m < 60; m += 30) {
            if (h === 21 && m > 0) break; // End exactly at 21:00
            timeOptions.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }

    const [bookedOrders, setBookedOrders] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && provider?.id) {
            setLocalSelectedCar(null);
            setLocalNote('');
            setActiveTab('details'); // Force details tab on open by default

            const now = new Date();
            let defaultDate = new Date(now);

            // Snap to next 30 mins
            const mins = now.getMinutes();
            if (mins > 0 && mins <= 30) defaultDate.setMinutes(30, 0, 0);
            else if (mins > 30) {
                defaultDate.setHours(now.getHours() + 1, 0, 0, 0);
            } else {
                defaultDate.setMinutes(0, 0, 0);
            }

            // If past 21:00, jump to tomorrow 08:00
            if (defaultDate.getHours() >= 21) {
                defaultDate.setDate(defaultDate.getDate() + 1);
                defaultDate.setHours(8, 0, 0, 0);
            } else if (defaultDate.getHours() < 8) {
                // If before 08:00, start at 08:00 today
                defaultDate.setHours(8, 0, 0, 0);
            }

            setPickupDate(toISODate(defaultDate));
            setPickupTime(defaultDate.getHours().toString().padStart(2, '0') + ":" + defaultDate.getMinutes().toString().padStart(2, '0'));

            setReturnDate(''); // Empty by default as requested
            setReturnTime(''); // Empty by default as requested

            const fetchOrders = async () => {
                const q = query(collection(db, 'jobs'), where('providerId', '==', provider.id));
                const snap = await getDocs(q);
                setBookedOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            };
            fetchOrders();
        }
    }, [isOpen, provider?.id]);

    const isCarAvailable = (car: any) => {
        if (!pickupDate || !pickupTime || !returnDate || !returnTime) return true; // Show available by default so user can select

        const startRange = new Date(`${pickupDate}T${pickupTime}`);
        const endRange = new Date(`${returnDate}T${returnTime}`);

        if (isNaN(startRange.getTime()) || isNaN(endRange.getTime())) return false;
        if (startRange >= endRange) return false;

        const overlappingBookings = bookedOrders.filter(o => {
            if (o.status === 'cancelled') return false;
            if (o.selectedCar?.modelId !== car.modelId) return false;

            const oDates = o.carRentalDates;
            if (!oDates) return false;
            const oStart = new Date(`${oDates.pickupDate}T${oDates.pickupTime}`);
            const oEnd = new Date(`${oDates.returnDate}T${oDates.returnTime}`);

            return (startRange < oEnd) && (oStart < endRange);
        });

        return overlappingBookings.length < (car.quantity || 1);
    };

    useEffect(() => {
        if (localSelectedCar && !isCarAvailable(localSelectedCar)) {
            setLocalSelectedCar(null);
        }
    }, [pickupDate, pickupTime, returnDate, returnTime]);

    if (!provider) return null;

    const displayRate = propDisplayRate || provider.minRate || 80;
    const isNew = provider.isNew;
    const effectiveRating = provider.rating || 5.0;
    const effectiveJobs = provider.taskCount || 0;

    const toISODate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const isTimeEnabled = (dateStr: string, timeStr: string) => {
        if (!dateStr || !timeStr) return true;

        // Use local time for comparison
        const [h, m] = timeStr.split(':').map(Number);
        const selectedDateTime = new Date(dateStr);
        selectedDateTime.setHours(h, m, 0, 0);

        const now = new Date();

        // 1. Past check
        if (selectedDateTime < now) return false;

        // 2. Provider Availability check
        if (!provider) return true;

        const d = new Date(dateStr);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dow = days[d.getDay()];

        const slots = (provider.calendarSlots && provider.calendarSlots[dateStr])
            || (provider.availability && provider.availability[dow]);

        if (slots && Array.isArray(slots)) {
            if (slots.length === 0) return false; // Explicitly closed
            const tMin = h * 60 + m;
            return slots.some((s: any) => {
                const [fh, fm] = s.from.split(':').map(Number);
                const [th, tm] = s.to.split(':').map(Number);
                return tMin >= (fh * 60 + fm) && tMin < (th * 60 + tm);
            });
        }

        return true;
    };

    const isDayDisabled = (day: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (day < today) return true;

        const iso = toISODate(day);

        // If picking return date, it MUST be >= pickupDate
        if (activePicker === 'return_date' && pickupDate) {
            const pDate = new Date(pickupDate);
            pDate.setHours(0, 0, 0, 0);
            if (day < pDate) return true;
        }

        if (!provider) return false;
        const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getDay()];
        const slots = (provider.calendarSlots && provider.calendarSlots[iso])
            || (provider.availability && provider.availability[dow]);

        if (slots && Array.isArray(slots) && slots.length === 0) return true;

        return false;
    };

    const handleDateSelect = (date: Date | undefined) => {
        if (!date) return;
        const iso = toISODate(date);
        if (activePicker === 'pickup_date') {
            setPickupDate(iso);
            // If return date exists and is now before pickup, clear it
            if (returnDate && iso > returnDate) {
                setReturnDate('');
            }
        }
        else setReturnDate(iso);
        setActivePicker(null);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop focused on map area */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{ position: 'fixed', inset: 0, zIndex: 2999, background: 'rgba(0,0,0,0.3)' }}
                    />
                    <motion.div
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={{
                            position: 'fixed', inset: 0,
                            zIndex: 3000, background: '#fff',
                            display: 'flex', flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                    >
                        {isSplashing && (
                            <SplashScreen subStatus="Preparing your ride..." />
                        )}
                        {/* Header */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 12, padding: '16px 24px', borderBottom: '1px solid #F3F4F6' }}>
                            <button onClick={onClose} style={{ display: 'flex', height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#F9FAFB', border: 'none', cursor: 'pointer' }}>
                                <ChevronLeft size={24} color="#111827" />
                            </button>
                            <h3 style={{ minWidth: 0, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                                {provider.serviceId ? formatServiceName(provider.serviceId) : 'Transport & Car Rental'} <span style={{ color: '#9CA3AF', fontWeight: 500 }}>/ Rent a car</span>
                            </h3>
                            <button onClick={onClose} style={{ display: 'flex', height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#F9FAFB', border: 'none', cursor: 'pointer' }}>
                                <ChevronRight size={24} color="#111827" />
                            </button>
                        </div>

                        {/* Tabs Bar */}
                        <div style={{ display: 'flex', padding: '0 24px', background: '#fff', borderBottom: '1px solid #F3F4F6' }}>
                            <button
                                onClick={() => setActiveTab('details')}
                                style={{
                                    flex: 1, padding: '16px 0', border: 'none', background: 'transparent',
                                    fontSize: 15, fontWeight: activeTab === 'details' ? 700 : 700, color: activeTab === 'details' ? '#219178' : '#9CA3AF',
                                    position: 'relative', cursor: 'pointer'
                                }}
                            >
                                Bricoler Details
                                {activeTab === 'details' && (
                                    <motion.div layoutId="tab-underline" style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: '#219178' }} />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('setup')}
                                style={{
                                    flex: 1, padding: '16px 0', border: 'none', background: 'transparent',
                                    fontSize: 15, fontWeight: activeTab === 'setup' ? 800 : 700, color: activeTab === 'setup' ? '#219178' : '#9CA3AF',
                                    position: 'relative', cursor: 'pointer'
                                }}
                            >
                                Order Setup
                                {activeTab === 'setup' && (
                                    <motion.div layoutId="tab-underline" style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: '#219178' }} />
                                )}
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 120 }} className="no-scrollbar">
                            <AnimatePresence mode="wait">
                                {activeTab === 'details' ? (
                                    <motion.div
                                        key="details"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ padding: '24px' }}
                                    >
                                        {/* Profile Hero */}
                                        <div style={{ display: 'flex', gap: 24, marginBottom: 40, alignItems: 'center' }}>
                                            <img src={provider.avatarUrl || "/Images/Logo/Black Lbricol Avatar Face.webp"} style={{ width: 84, height: 84, borderRadius: 12, objectFit: 'cover', background: '#F9FAFB' }} />
                                            <div style={{ flex: 1 }}>
                                                <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 6, marginTop: 0 }}>The Bricoler</h2>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                                                    <span style={{ fontSize: 24, fontWeight: 800, color: '#219178' }}>MAD {displayRate}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 600, color: '#6B7280' }}>minimum</span>
                                                </div>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#fff', border: '1px solid #219178', borderRadius: 20 }}>
                                                    <CheckCircle2 size={14} color="#219178" />
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#219178' }}>Identity Verified</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row Stats Icons */}
                                        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 40, textAlign: 'center' }}>
                                            <div>
                                                <div style={{ marginBottom: 8 }}><div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}><Trophy size={30} color="#219178" /></div></div>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: '#219178' }}>{(effectiveJobs < 10 || isNew) ? 'New' : (provider.badge || 'Elite')}</div>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#219178', textTransform: 'uppercase', marginTop: 2 }}>LEVEL</div>
                                            </div>
                                            <div>
                                                <div style={{ marginBottom: 8 }}><div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}><Star size={30} color="#219178" fill="#219178" /></div></div>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: '#219178' }}>{provider.rating ? Number(provider.rating).toFixed(1) : '0.0'}</div>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#219178', textTransform: 'uppercase', marginTop: 2 }}>RATING</div>
                                            </div>
                                            <div>
                                                <div style={{ marginBottom: 8 }}><div style={{ width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}><CheckCircle2 size={30} color="#219178" /></div></div>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: '#219178' }}>{effectiveJobs}</div>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#219178', textTransform: 'uppercase', marginTop: 2 }}>MISSIONS</div>
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
                                            <div style={{ padding: '20px 16px', borderRadius: 5, border: 'none', position: 'relative' }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>Experience</div>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{provider.yearsOfExperience || "1 Year"}</div>
                                                <Calendar size={24} color="#E5E7EB" style={{ position: 'absolute', right: 16, bottom: 20 }} />
                                            </div>
                                            <div style={{ padding: '20px 16px', borderRadius: 5, border: 'none', position: 'relative' }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>Success Rate</div>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>99%</div>
                                                <motion.div style={{ position: 'absolute', right: 16, bottom: 20 }}>
                                                    <RefreshCw size={24} color="#E5E7EB" />
                                                </motion.div>
                                            </div>
                                        </div>

                                        {/* About */}
                                        <div style={{ marginBottom: 32 }}>
                                            <h4 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 16, marginTop: 0 }}>About Me</h4>
                                            <div style={{ fontSize: 15, color: '#4B5563', lineHeight: 1.6, fontWeight: 500, padding: 16, background: '#F9FAFB', borderRadius: 5, border: '1px solid #F3F4F6' }}>
                                                {provider.bio || provider.aboutMe || 'No bio provided yet.'}
                                            </div>
                                        </div>

                                        {/* Reviews */}
                                        <div style={{ marginBottom: 32 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                                <h4 style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: 0 }}>Reviews</h4>
                                                <div style={{ fontSize: 14, fontWeight: 800, color: '#219178' }}>★ {effectiveRating}</div>
                                            </div>

                                            <div style={{ display: 'flex', overflowX: 'auto', gap: 16, margin: '0 -24px', padding: '0 24px 8px' }} className="no-scrollbar">
                                                {(provider.reviews && provider.reviews.length > 0) ? (
                                                    provider.reviews.map((rev: any, rIdx: number) => (
                                                        <div key={rIdx} style={{ flex: '0 0 280px', background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 5, padding: 16 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                                <span style={{ fontSize: 13, fontWeight: 900, color: '#111827' }}>{rev.userName || 'User'}</span>
                                                                <div style={{ display: 'flex', gap: 2 }}>
                                                                    {[...Array(5)].map((_, i) => <Star key={i} size={10} fill={i < (rev.rating || 5) ? "#FBBF24" : "none"} color="#FBBF24" />)}
                                                                </div>
                                                            </div>
                                                            <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>{rev.content || rev.comment}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ width: '100%', background: '#F9FAFB', border: '2px dashed #E5E7EB', borderRadius: 5, padding: '24px', textAlign: 'center' }}>
                                                        <p style={{ color: '#9CA3AF', fontWeight: 500, fontSize: 14, margin: 0 }}>No reviews yet. Be the first to hire!</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="setup"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ padding: '24px' }}
                                    >
                                        {/* Date Time Pickers */}
                                        <div style={{ marginBottom: 32 }}>
                                            <h4 style={{ fontSize: 25, fontWeight: 500, color: '#111827', marginBottom: 24, marginTop: 0 }}>When to pickup & return the car?</h4>

                                            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: 13, fontWeight: 900, color: '#111827', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Pick Up</label>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <div onClick={() => setActivePicker('pickup_date')}
                                                            style={{ flex: 1.5, height: 54, padding: '0 18px', background: '#F9FAFB', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: '1px solid #F3F4F6' }}>
                                                            <Calendar size={20} color="#6B7280" />
                                                            <span style={{ fontSize: 16, fontWeight: 500, color: pickupDate ? '#111827' : '#9CA3AF' }}>{formatDateLabel(pickupDate)}</span>
                                                        </div>
                                                        <div onClick={() => setActivePicker('pickup_time')}
                                                            style={{ flex: 1, height: 54, padding: '0 18px', background: '#F9FAFB', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: '1px solid #F3F4F6' }}>
                                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                                <Clock size={18} color="#6B7280" />
                                                                <span style={{ fontSize: 16, fontWeight: 500, color: pickupTime ? '#111827' : '#9CA3AF' }}>{pickupTime || '--:--'}</span>
                                                            </div>
                                                            <ChevronDown size={18} color="#9CA3AF" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 16 }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: 13, fontWeight: 900, color: '#111827', textTransform: 'uppercase', marginBottom: 10, display: 'block' }}>Return</label>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <div onClick={() => setActivePicker('return_date')}
                                                            style={{ flex: 1.5, height: 54, padding: '0 18px', background: '#F9FAFB', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: '1px solid #F3F4F6' }}>
                                                            <Calendar size={20} color="#6B7280" />
                                                            <span style={{ fontSize: 16, fontWeight: 500, color: returnDate ? '#111827' : '#9CA3AF' }}>{formatDateLabel(returnDate)}</span>
                                                        </div>
                                                        <div onClick={() => setActivePicker('return_time')}
                                                            style={{ flex: 1, height: 54, padding: '0 18px', background: '#F9FAFB', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: '1px solid #F3F4F6' }}>
                                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                                <Clock size={18} color="#6B7280" />
                                                                <span style={{ fontSize: 16, fontWeight: 500, color: returnTime ? '#111827' : '#9CA3AF' }}>{returnTime || '--:--'}</span>
                                                            </div>
                                                            <ChevronDown size={18} color="#9CA3AF" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <hr style={{ border: 'none', borderTop: '1.5px solid #F3F4F6', margin: '32px -24px' }} />

                                        {/* Car Selection */}
                                        <div style={{ marginBottom: 32 }}>
                                            <h4 style={{ fontSize: 18, fontWeight: 900, color: '#111827', marginBottom: 16, marginTop: 0 }}>Select a car</h4>

                                            {(() => {
                                                const grouped: { [key: string]: { brand: any, cars: any[] } } = {};
                                                provider.carRentalDetails?.cars?.forEach((car: any) => {
                                                    const bId = car.brandId || 'Other';
                                                    if (!grouped[bId]) {
                                                        const brandInfo = CAR_BRANDS.find(b => b.id === bId);
                                                        grouped[bId] = { brand: brandInfo || { name: bId }, cars: [] };
                                                    }
                                                    grouped[bId].cars.push(car);
                                                });

                                                return Object.values(grouped).map((group, gIdx) => (
                                                    <div key={gIdx} style={{ marginBottom: 24 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                                            <div style={{ width: 32, height: 32, background: '#F9FAFB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, border: '1px solid #F3F4F6' }}>
                                                                {group.brand.logo ? (
                                                                    <img src={group.brand.logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                                ) : (
                                                                    <Car size={16} color="#9CA3AF" />
                                                                )}
                                                            </div>
                                                            <span style={{ fontSize: 14, fontWeight: 900, color: '#111827', textTransform: 'uppercase' }}>{group.brand.name}</span>
                                                        </div>

                                                        <div style={{ display: 'flex', overflowX: 'auto', gap: 12, paddingBottom: 8 }} className="no-scrollbar">
                                                            {group.cars.map((car, idx) => {
                                                                const available = isCarAvailable(car);
                                                                const isSelectedCar = localSelectedCar?.modelId === car.modelId;
                                                                return (
                                                                    <div
                                                                        key={car.modelId || idx}
                                                                        onClick={() => available && setLocalSelectedCar(car)}
                                                                        style={{
                                                                            flex: '0 0 160px',
                                                                            border: isSelectedCar ? '2px solid #219178' : '1px solid #E5E7EB',
                                                                            background: isSelectedCar ? '#F0FDF4' : (available ? '#fff' : '#F9FAFB'),
                                                                            borderRadius: 12, padding: 12, cursor: available ? 'pointer' : 'not-allowed', position: 'relative',
                                                                            opacity: available ? 1 : 0.5
                                                                        }}
                                                                    >
                                                                        <div style={{ width: '100%', height: 70, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                                                            <img src={car.modelImage || car.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={car.modelName} />
                                                                        </div>
                                                                        <div style={{ fontSize: 12, fontWeight: 900, color: '#111827', textTransform: 'uppercase', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{car.modelName}</div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <div style={{ fontSize: 11, fontWeight: 900, color: '#219178' }}>{car.pricePerDay || car.price} MAD/j</div>
                                                                            <div style={{ fontSize: 10, fontWeight: 800, color: '#9CA3AF' }}>x{car.quantity || 1}</div>
                                                                        </div>
                                                                        {(!pickupDate || !pickupTime || !returnDate || !returnTime) ? (
                                                                            <div style={{ marginTop: 4, fontSize: 9, fontWeight: 800, color: '#6B7280' }}>Set dates to select</div>
                                                                        ) : !available && (
                                                                            <div style={{ marginTop: 4, fontSize: 9, fontWeight: 800, color: '#EF4444' }}>Not Available</div>
                                                                        )}
                                                                        {isSelectedCar && (
                                                                            <div style={{ position: 'absolute', top: -10, right: -10, width: 24, height: 24, background: '#219178', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                                                                <Check size={14} color="#fff" strokeWidth={4} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                            {(!provider.carRentalDetails?.cars || provider.carRentalDetails.cars.length === 0) && (
                                                <div style={{ padding: '40px 20px', textAlign: 'center', background: '#F9FAFB', border: '2px dashed #E5E7EB', borderRadius: 12 }}>
                                                    <Car size={40} className="text-neutral-300 mx-auto mb-3" />
                                                    <p style={{ color: '#9CA3AF', fontWeight: 600, fontSize: 14 }}>No cars specifically listed by this Bricoler yet.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Additional Notes */}
                                        <div style={{ marginBottom: 32 }}>
                                            <h4 style={{ fontSize: 15, fontWeight: 900, color: '#111827', marginBottom: 8, marginTop: 0 }}>Additional Notes (Optional)</h4>
                                            <textarea
                                                value={localNote}
                                                onChange={(e) => setLocalNote(e.target.value)}
                                                placeholder="Any specific requests for the car?"
                                                style={{ width: '100%', height: 96, padding: 12, borderRadius: 12, border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 24px 44px', borderTop: 'none', background: 'transparent', zIndex: 10, overflow: 'hidden' }}>
                            {/* Brand Wave Accent */}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, background: '#FFB700', borderRadius: '40% 40% 0 0', transform: 'scaleX(1.5) translateY(40px)', zIndex: -1 }}></div>

                            <button
                                onClick={() => {
                                    if (activeTab === 'details') {
                                        setActiveTab('setup');
                                        return;
                                    }
                                    if (!localSelectedCar) return;
                                    setIsSplashing(true);
                                    setTimeout(() => {
                                        onSelect(localSelectedCar, localNote, { pickupDate, pickupTime, returnDate, returnTime });
                                    }, 1500);
                                }}
                                disabled={isSplashing || (activeTab === 'setup' && !localSelectedCar)}
                                style={{
                                    width: '100%', height: 60, borderRadius: 32, fontSize: 20, fontWeight: 800, cursor: (activeTab === 'details' || localSelectedCar) ? 'pointer' : 'not-allowed',
                                    background: (activeTab === 'details' || localSelectedCar) ? '#219178' : '#219178', color: '#fff', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                }}
                            >
                                {activeTab === 'details' ? 'Book me' : 'Confirm Selection'}
                            </button>
                        </div>
                    </motion.div>

                    {/* Unified Wheel Picker Overlay */}
                    <AnimatePresence>
                        {activePicker && (
                            <WheelPicker
                                type={activePicker}
                                initialDate={activePicker.includes('pickup') ? pickupDate : returnDate}
                                initialTime={activePicker.includes('pickup') ? pickupTime : returnTime}
                                isDayDisabled={isDayDisabled}
                                isTimeEnabled={(d: any, t: any) => isTimeEnabled(d, t)}
                                timeOptions={timeOptions}
                                toISODate={toISODate}
                                onConfirm={(d: any, t: any) => {
                                    if (activePicker.includes('pickup')) {
                                        setPickupDate(d);
                                        setPickupTime(t);
                                    } else {
                                        setReturnDate(d);
                                        setReturnTime(t);
                                    }
                                    setActivePicker(null);
                                }}
                                onClose={() => setActivePicker(null)}
                            />
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
}

// Separate component for cleaner State management within the wheel
function WheelPicker({ type, initialDate, initialTime, isDayDisabled, isTimeEnabled, timeOptions, toISODate, onConfirm, onClose }: any) {
    const [selDateIdx, setSelDateIdx] = useState(0);
    const [selTimeIdx, setSelTimeIdx] = useState(0);
    const dateRef = React.useRef<HTMLDivElement>(null);
    const timeRef = React.useRef<HTMLDivElement>(null);

    // Filtered times based on the CURRENTLY selected date index
    const getFilteredTimes = (dIdx: number) => {
        const d = new Date();
        d.setDate(d.getDate() + dIdx);
        const iso = toISODate(d);
        return timeOptions.filter((t: string) => isTimeEnabled(iso, t));
    };

    const currentFilteredTimes = getFilteredTimes(selDateIdx);

    useEffect(() => {
        // Find initial indices
        const d = initialDate ? new Date(initialDate) : new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dIdx = Math.max(0, Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        setSelDateIdx(dIdx);

        const fTimes = getFilteredTimes(dIdx);
        const tIdx = fTimes.indexOf(initialTime);
        setSelTimeIdx(tIdx >= 0 ? tIdx : 0);

        // Scroll after mount
        setTimeout(() => {
            if (dateRef.current) dateRef.current.scrollTop = dIdx * 48;
            if (timeRef.current) timeRef.current.scrollTop = (tIdx >= 0 ? tIdx : 0) * 48;
        }, 100);
    }, []);

    const formatEnDate = (d: Date, idx: number) => {
        if (idx === 0) return "Today";
        if (idx === 1) return "Tomorrow";
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
                style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    background: '#fff', zIndex: 4001,
                    borderTopLeftRadius: 32, borderTopRightRadius: 32,
                    padding: '24px 20px 40px',
                    display: 'flex', flexDirection: 'column', gap: 24
                }}>
                <div style={{ width: 40, height: 5, background: '#E5E7EB', borderRadius: 10, margin: '0 auto' }} />

                <div style={{ position: 'relative', height: 200, display: 'flex', overflow: 'hidden' }}>
                    {/* Full Row Highlight */}
                    <div style={{
                        position: 'absolute', top: '50%', left: 0, right: 0,
                        height: 52, marginTop: -26,
                        background: '#F6F6F6', zIndex: 0
                    }} />

                    {/* Date Column */}
                    <div
                        ref={dateRef}
                        className="wheel-scroll no-scrollbar"
                        style={{
                            flex: 1.5, overflowY: 'auto', scrollSnapType: 'y mandatory',
                            height: '100%', WebkitOverflowScrolling: 'touch', zIndex: 1
                        }}
                        onScroll={(e) => {
                            const idx = Math.round(e.currentTarget.scrollTop / 48);
                            if (idx !== selDateIdx) setSelDateIdx(idx);
                        }}
                    >
                        <div style={{ height: 76 }} />
                        {Array.from({ length: 30 }).map((_, i) => {
                            const d = new Date();
                            d.setDate(d.getDate() + i);
                            const disabled = isDayDisabled(d);
                            const isSelected = i === selDateIdx;
                            return (
                                <div key={i} style={{
                                    height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    scrollSnapAlign: 'center',
                                    fontSize: isSelected ? 20 : 16,
                                    fontWeight: isSelected ? 600 : 600,
                                    color: disabled ? '#D1D5DB' : (isSelected ? '#000000ff' : '#888'),
                                    transition: 'all 0.1s'
                                }}>
                                    {formatEnDate(d, i)}
                                </div>
                            );
                        })}
                        <div style={{ height: 76 }} />
                    </div>

                    {/* Time Column */}
                    <div
                        ref={timeRef}
                        className="wheel-scroll no-scrollbar"
                        style={{
                            flex: 1, overflowY: 'auto', scrollSnapType: 'y mandatory',
                            height: '100%', WebkitOverflowScrolling: 'touch', zIndex: 1
                        }}
                        onScroll={(e) => {
                            const idx = Math.round(e.currentTarget.scrollTop / 48);
                            if (idx !== selTimeIdx) setSelTimeIdx(idx);
                        }}
                    >
                        <div style={{ height: 76 }} />
                        {currentFilteredTimes.map((t: string, i: number) => {
                            const isSelected = i === selTimeIdx;
                            return (
                                <div key={t} style={{
                                    height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    scrollSnapAlign: 'center',
                                    fontSize: isSelected ? 20 : 16,
                                    fontWeight: isSelected ? 700 : 700,
                                    color: isSelected ? '#000000ff' : '#888',
                                    transition: 'all 0.1s'
                                }}>
                                    {t}
                                </div>
                            );
                        })}
                        <div style={{ height: 76 }} />
                    </div>
                </div>

                <button
                    onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + selDateIdx);
                        const iso = toISODate(d);
                        const time = currentFilteredTimes[selTimeIdx] || currentFilteredTimes[0];
                        onConfirm(iso, time);
                    }}
                    style={{
                        width: '100%', height: 60, borderRadius: 5,
                        background: '#219178', color: '#ffffffff',
                        fontSize: 20, fontWeight: 900, border: 'none', cursor: 'pointer',
                    }}
                >
                    Next
                </button>
            </motion.div>
        </>
    );
}
