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
                                    fontSize: 15, fontWeight: activeTab === 'details' ? 700 : 700, color: activeTab === 'details' ? '#01A083' : '#9CA3AF',
                                    position: 'relative', cursor: 'pointer'
                                }}
                            >
                                Bricoler Details
                                {activeTab === 'details' && (
                                    <motion.div layoutId="tab-underline" style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: '#01A083' }} />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('setup')}
                                style={{
                                    flex: 1, padding: '16px 0', border: 'none', background: 'transparent',
                                    fontSize: 15, fontWeight: activeTab === 'setup' ? 800 : 700, color: activeTab === 'setup' ? '#01A083' : '#9CA3AF',
                                    position: 'relative', cursor: 'pointer'
                                }}
                            >
                                Order Setup
                                {activeTab === 'setup' && (
                                    <motion.div layoutId="tab-underline" style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, background: '#01A083' }} />
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
                                                    <span style={{ fontSize: 24, fontWeight: 800, color: '#01A083' }}>MAD {displayRate}</span>
                                                    <span style={{ fontSize: 14, fontWeight: 600, color: '#6B7280' }}>minimum</span>
                                                </div>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#fff', border: '1px solid #01A083', borderRadius: 20 }}>
                                                    <CheckCircle2 size={14} color="#01A083" />
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#01A083' }}>Identity Verified</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Trust & Stats Grid (Eggy Style Redesign) */}
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between px-2 mb-10">
                                            {/* Level Stat */}
                                            <div className="flex flex-col items-center gap-2 text-center">
                                                <div 
                                                    className="w-[68px] h-[68px] flex items-center justify-center bg-[#F1FEF4] border border-[#DCFCE7]"
                                                    style={{ borderRadius: '70% 30% 50% 50% / 50% 70% 30% 50%' }}
                                                >
                                                    <Trophy size={40} className="text-[#10B981] fill-[#10B981]/20" />
                                                </div>
                                                <div className="flex flex-col items-center -space-y-0.5">
                                                    <span className="text-[14px] font-semibold text-[#111827] capitalize">{(effectiveJobs < 10 || isNew) ? 'New' : (provider.badge || 'Elite')}</span>
                                                    <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Level</span>
                                                </div>
                                            </div>

                                            {/* Rating Stat */}
                                            <div className="flex flex-col items-center gap-2 text-center">
                                                <div 
                                                    className="w-[68px] h-[68px] flex items-center justify-center bg-[#FFFBEB] border border-[#FEF3C7]"
                                                    style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }}
                                                >
                                                    <Star size={40} className="text-[#D97706] fill-[#D97706]/20" />
                                                </div>
                                                <div className="flex flex-col items-center -space-y-0.5">
                                                    <span className="text-[14px] font-semibold text-[#111827]">{!provider.taskCount || provider.taskCount === 0 || !provider.rating ? '0.0' : provider.rating.toFixed(1)}</span>
                                                    <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Rating</span>
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
                                                    <span className="text-[14px] font-semibold text-[#111827]">{provider.completedJobs || provider.taskCount || provider.numReviews || 0}</span>
                                                    <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Orders</span>
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
                                                    <span className="text-[14px] font-semibold text-[#111827]">{provider.yearsOfExperience || "1 Year"}</span>
                                                    <span className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest">Experience</span>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* Performance Section */}
                                        <div className="mb-10">
                                            <div className="p-5 bg-[#F9FAFB] rounded-[15px] border border-neutral-100 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-[12px] bg-white shadow-sm flex items-center justify-center text-[#01A083]">
                                                        <RefreshCw size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-[#9CA3AF] tracking-widest uppercase mb-0.5">Success Rate</div>
                                                        <div className="text-[16px] font-bold text-[#111827]">99% Reliable</div>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-1 bg-[#F1FEF4] rounded-full text-[#10B981] text-[11px] font-black uppercase">Verified</div>
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
                                                <div style={{ fontSize: 14, fontWeight: 800, color: '#01A083' }}>★ {effectiveRating}</div>
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
                                                                            border: isSelectedCar ? '2px solid #01A083' : '1px solid #E5E7EB',
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
                                                                            <div style={{ fontSize: 11, fontWeight: 900, color: '#01A083' }}>{car.pricePerDay || car.price} MAD/j</div>
                                                                            <div style={{ fontSize: 10, fontWeight: 800, color: '#9CA3AF' }}>x{car.quantity || 1}</div>
                                                                        </div>
                                                                        {(!pickupDate || !pickupTime || !returnDate || !returnTime) ? (
                                                                            <div style={{ marginTop: 4, fontSize: 9, fontWeight: 800, color: '#6B7280' }}>Set dates to select</div>
                                                                        ) : !available && (
                                                                            <div style={{ marginTop: 4, fontSize: 9, fontWeight: 800, color: '#EF4444' }}>Not Available</div>
                                                                        )}
                                                                        {isSelectedCar && (
                                                                            <div style={{ position: 'absolute', top: -10, right: -10, width: 24, height: 24, background: '#01A083', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
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
                                    background: (activeTab === 'details' || localSelectedCar) ? '#01A083' : '#01A083', color: '#fff', border: 'none',
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
                        background: '#01A083', color: '#ffffffff',
                        fontSize: 20, fontWeight: 900, border: 'none', cursor: 'pointer',
                    }}
                >
                    Next
                </button>
            </motion.div>
        </>
    );
}
