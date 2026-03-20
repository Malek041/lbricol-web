import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Clock, MapPin, Calendar, CheckCircle2, Car, Check, ChevronDown } from 'lucide-react';
import { CAR_BRANDS } from '@/config/cars_config';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    
    // Formatting helper for Pic 3 style
    const formatDateLabel = (dateStr: string) => {
        if (!dateStr) return 'Select Date';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const timeOptions = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            timeOptions.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }

    const [bookedOrders, setBookedOrders] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && provider?.id) {
            setLocalSelectedCar(null);
            setLocalNote('');
            
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
            
            setPickupDate(today);
            setPickupTime(currentTime);
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
        if (!pickupDate || !pickupTime || !returnDate || !returnTime) return false;
        
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
                    {/* Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 12, padding: '16px 24px', borderBottom: '1px solid #F3F4F6' }}>
                        <button onClick={onClose} style={{ display: 'flex', height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#F9FAFB', border: 'none', cursor: 'pointer' }}>
                            <ChevronLeft size={24} color="#111827" />
                        </button>
                        <h3 style={{ minWidth: 0, textAlign: 'center', fontSize: 18, fontWeight: 900, color: '#111827', margin: 0 }}>
                            {provider.name}'s Profile
                        </h3>
                        <div style={{ width: 40 }}></div>
                    </div>

                    {/* Scrollable Content */}
                    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }} className="no-scrollbar">
                        <div style={{ padding: '24px' }}>
                            {/* Profile Hero */}
                            <div style={{ display: 'flex', gap: 24, marginBottom: 32, alignItems: 'flex-start' }}>
                                <img src={provider.avatarUrl || "/Images/Logo/Black Lbricol Avatar Face.webp"} style={{ width: 96, height: 96, borderRadius: 28, objectFit: 'cover', border: '4px solid #F9FAFB' }} />
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ fontSize: 24, fontWeight: 900, color: '#111827', marginBottom: 8, marginTop: 0 }}>{provider.name}</h2>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                                        <span style={{ background: 'rgba(124, 115, 232, 0.1)', color: '#7C73E8', fontSize: 10, fontWeight: 900, padding: '4px 10px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ fontSize: 11 }}>✦</span> {(effectiveJobs === 0 || isNew) ? 'NEW' : (provider.badge ? provider.badge?.toUpperCase() : (effectiveJobs > 100 ? 'ELITE' : (effectiveJobs > 50 ? 'PRO' : 'CLASSIC')))}
                                        </span>
                                        <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {effectiveJobs} Missions
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, color: '#01A083' }}>
                                        <span style={{ fontSize: 20, fontWeight: 900 }}>MAD {displayRate}</span>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#6B7280' }}>(min)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'revert', gridAutoFlow: 'column', gap: 12, marginBottom: 32 }}>
                                <div style={{ padding: 16, background: '#F9FAFB', borderRadius: 0, border: '1px solid #F3F4F6' }}>
                                    <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>Experience</div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>{provider.yearsOfExperience || "1 Year"}</div>
                                </div>
                                <div style={{ padding: 16, background: '#F9FAFB', borderRadius: 0, border: '1px solid #F3F4F6' }}>
                                    <div style={{ fontSize: 11, fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>Completed</div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>{effectiveJobs} Jobs</div>
                                </div>
                            </div>

                            {/* About */}
                            <div style={{ marginBottom: 32 }}>
                                <h4 style={{ fontSize: 18, fontWeight: 900, color: '#111827', marginBottom: 16, marginTop: 0 }}>About Me</h4>
                                <div style={{ fontSize: 15, color: '#4B5563', lineHeight: 1.6, fontWeight: 500, padding: 16, background: '#F9FAFB', borderRadius: 0, border: '1px solid #F3F4F6' }}>
                                    {provider.bio || provider.aboutMe || 'No bio provided yet.'}
                                </div>
                            </div>
                            
                            {/* Reviews (Moved here & Horizontal Scroll) */}
                            <div style={{ marginBottom: 32 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <h4 style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: 0 }}>Reviews</h4>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: '#01A083' }}>★ {effectiveRating}</div>
                                </div>
                                
                                <div style={{ display: 'flex', overflowX: 'auto', gap: 16, margin: '0 -24px', padding: '0 24px 8px' }} className="no-scrollbar">
                                    {(provider.reviews && provider.reviews.length > 0) ? (
                                        provider.reviews.map((rev: any, rIdx: number) => (
                                            <div key={rIdx} style={{ flex: '0 0 280px', background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 16, padding: 16 }}>
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
                                        <div style={{ width: '100%', background: '#F9FAFB', border: '2px dashed #E5E7EB', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
                                            <p style={{ color: '#9CA3AF', fontWeight: 800, fontSize: 14, margin: 0 }}>No reviews yet. Be the first to hire!</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1.5px solid #F3F4F6', margin: '32px -24px' }} />

                            {/* Date Time Pickers */}
                            <div style={{ marginBottom: 32 }}>
                                <h4 style={{ fontSize: 18, fontWeight: 900, color: '#111827', marginBottom: 16, marginTop: 0 }}>When do you want the car and when will you return it?</h4>
                                
                                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: 11, fontWeight: 900, color: '#111827', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Pick Up</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {/* Date Picker (Pic 3 Style) */}
                                            <div onClick={() => setActivePicker('pickup_date')} 
                                                 style={{ flex: 1.5, height: 54, padding: '0 18px', background: '#F9FAFB', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: '1px solid #F3F4F6' }}>
                                                <Calendar size={20} color="#6B7280" />
                                                <span style={{ fontSize: 16, fontWeight: 800, color: pickupDate ? '#111827' : '#9CA3AF' }}>{formatDateLabel(pickupDate)}</span>
                                            </div>
                                            {/* Time Picker (Pic 3 Style) */}
                                            <div onClick={() => setActivePicker('pickup_time')} 
                                                 style={{ flex: 1, height: 54, padding: '0 18px', background: '#F9FAFB', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: '1px solid #F3F4F6' }}>
                                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                    <Clock size={18} color="#6B7280" />
                                                    <span style={{ fontSize: 16, fontWeight: 800, color: pickupTime ? '#111827' : '#9CA3AF' }}>{pickupTime || '--:--'}</span>
                                                </div>
                                                <ChevronDown size={18} color="#9CA3AF" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: 12, fontWeight: 900, color: '#111827', textTransform: 'uppercase', marginBottom: 10, display: 'block' }}>Return</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {/* Date Picker (Pic 3 Style) */}
                                            <div onClick={() => setActivePicker('return_date')} 
                                                 style={{ flex: 1.5, height: 54, padding: '0 18px', background: '#F9FAFB', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: '1px solid #F3F4F6' }}>
                                                <Calendar size={20} color="#6B7280" />
                                                <span style={{ fontSize: 16, fontWeight: 800, color: returnDate ? '#111827' : '#9CA3AF' }}>{formatDateLabel(returnDate)}</span>
                                            </div>
                                            {/* Time Picker (Pic 3 Style) */}
                                            <div onClick={() => setActivePicker('return_time')} 
                                                 style={{ flex: 1, height: 54, padding: '0 18px', background: '#F9FAFB', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: '1px solid #F3F4F6' }}>
                                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                    <Clock size={18} color="#6B7280" />
                                                    <span style={{ fontSize: 16, fontWeight: 800, color: returnTime ? '#111827' : '#9CA3AF' }}>{returnTime || '--:--'}</span>
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
                                                                borderRadius: 16, padding: 12, cursor: available ? 'pointer' : 'not-allowed', position: 'relative',
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
                                                                <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, background: '#01A083', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Check size={12} color="#fff" strokeWidth={4} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ));
                                })()}
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


                        </div>
                    </div>

                    {/* Fixed Footer */}
                    <div style={{ padding: 24, borderTop: '1px solid #F3F4F6', background: '#fff' }}>
                        <button
                            onClick={() => {
                                onSelect(localSelectedCar, localNote, { pickupDate, pickupTime, returnDate, returnTime });
                            }}
                            disabled={!localSelectedCar}
                            style={{
                                width: '100%', height: 56, borderRadius: 28, fontSize: 18, fontWeight: 900, cursor: localSelectedCar ? 'pointer' : 'not-allowed',
                                background: localSelectedCar ? '#01A083' : '#F3F4F6', color: localSelectedCar ? '#fff' : '#9CA3AF', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                            }}
                        >
                            Select & Continue
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </motion.div>

                {/* Overlays for Dates/Times (Pic 4 Fix) */}
                <AnimatePresence>
                    {activePicker && (
                        <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActivePicker(null)} 
                                    style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
                                    style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', zIndex: 4001, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: '24px 24px 40px', maxHeight: '80vh', overflowY: 'auto' }}>
                            <div style={{ width: 40, height: 4, background: '#E5E7EB', borderRadius: 2, margin: '0 auto 24px' }} />
                            
                            {(activePicker === 'pickup_date' || activePicker === 'return_date') && (
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <DayPicker
                                        mode="single"
                                        selected={activePicker === 'pickup_date' ? (pickupDate ? new Date(pickupDate) : undefined) : (returnDate ? new Date(returnDate) : undefined)}
                                        onSelect={(date) => {
                                            if (date) {
                                                const iso = date.toISOString().split('T')[0];
                                                if (activePicker === 'pickup_date') setPickupDate(iso);
                                                else setReturnDate(iso);
                                                setActivePicker(null);
                                            }
                                        }}
                                        modifiersStyles={{
                                            selected: { background: '#01A083', color: '#fff', borderRadius: '50%' },
                                            today: { color: '#01A083', fontWeight: 900 }
                                        }}
                                    />
                                </div>
                            )}

                            {(activePicker === 'pickup_time' || activePicker === 'return_time') && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                    {timeOptions.map(t => (
                                        <button key={t} onClick={() => {
                                            if (activePicker === 'pickup_time') setPickupTime(t);
                                            else setReturnTime(t);
                                            setActivePicker(null);
                                        }} style={{
                                            padding: '12px 0', borderRadius: 12, border: '1px solid #F3F4F6', background: (activePicker === 'pickup_time' ? pickupTime : returnTime) === t ? '#F0FDF4' : '#F9FAFB',
                                            color: (activePicker === 'pickup_time' ? pickupTime : returnTime) === t ? '#01A083' : '#111827',
                                            fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                                        }}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                        </>
                    )}
                </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
}
