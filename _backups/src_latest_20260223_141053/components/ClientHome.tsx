"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Palette ────────────────────────────────────────────────────────────────
const G_GREEN = '#00A082';

// ── Service catalogue ─────────────────────────────────────────────────────
interface ServiceEntry {
    id: string;
    label: string;
    iconPath: string;
    subServices: string[];
    bullets: string[];
    heroImage: string; // local /Images/Job Cards Images/ path
}

// Map each service to its local job-card image
const SERVICES: ServiceEntry[] = [
    {
        id: 'handyman',
        label: 'Handyman',
        iconPath: '/Images/Service Category vectors/HandymanVector.png',
        subServices: ['General Repairs', 'Door & Lock Repair', 'Furniture Fixes', 'Shelf Mounting', 'Caulking & Grouting'],
        bullets: [
            'From leaky taps to broken hinges, we fix it all.',
            'Now Trending: Smart-home gadget installations.',
        ],
        heroImage: '/Images/Job Cards Images/Handyman_job_card.png',
    },
    {
        id: 'furniture_assembly',
        label: 'Assembly',
        iconPath: '/Images/Service Category vectors/AsssemblyVector.png',
        subServices: ['General Furniture Assembly', 'IKEA / Flat-Pack Assembly', 'Crib Assembly', 'Bookshelf Assembly', 'Desk Assembly'],
        bullets: [
            'Assemble or disassemble furniture items by unboxing, building, and any cleanup.',
            'Now Trending: Curved sofas, computer desks & sustainable materials.',
        ],
        heroImage: '/Images/Job Cards Images/Furniture_Assembly_job_card.png',
    },
    {
        id: 'mounting',
        label: 'Mounting',
        iconPath: '/Images/Service Category vectors/MountingVector.png',
        subServices: ['TV Mounting', 'Shelf Installation', 'Curtain Rod Installation', 'Mirror Hanging', 'Picture Hanging'],
        bullets: [
            'Securely mount your TV, shelves, art, mirrors, dressers, and more.',
            'Now Trending: Gallery walls, art TVs & wraparound bookcases.',
        ],
        heroImage: '/Images/Job Cards Images/Handyman_job_card.png', // closest match
    },
    {
        id: 'moving',
        label: 'Moving',
        iconPath: '/Images/Service Category vectors/MovingHelpVector.png',
        subServices: ['Local Moving', 'Packing Services', 'Furniture Moving Only', 'Heavy Item Hauling'],
        bullets: [
            'Professional movers handle packing, loading and transport.',
            'Now Trending: Same-day apartment moves in under 3 hours.',
        ],
        heroImage: '/Images/Job Cards Images/Moving Help_job_card.png',
    },
    {
        id: 'cleaning',
        label: 'Cleaning',
        iconPath: '/Images/Service Category vectors/CleaningVector.png',
        subServices: ['Family Home Cleaning', 'Spring / Deep Clean', 'Apartment Cleaning', 'Airbnb Cleaning', 'Garage Cleaning', 'Move-Out Clean'],
        bullets: [
            'Clean your home or office; deep-clean appliances and other spaces.',
            'Now Trending: Eco-friendly products, home cleaning checklists, and cleaning hacks.',
        ],
        heroImage: '/Images/Job Cards Images/Cleaning_job_card.png',
    },
    {
        id: 'glass_cleaning',
        label: 'Glass',
        iconPath: '/Images/Service Category vectors/CleaningVector.png',
        subServices: ['Residential Glass', 'Commercial/Office Glass', 'Automotive Glass', 'Specialty/Hard-to-Clean Glass'],
        bullets: [
            'Streak-free cleaning for windows, mirrors and specialty glass.',
            'Now Trending: Eco-friendly streak-free formulas.',
        ],
        heroImage: '/Images/Job Cards Images/Cleaning_job_card.png', // reusing cleaning image for now
    },
    {
        id: 'gardening',
        label: 'Gardening',
        iconPath: '/Images/Service Category vectors/GardeningVector.png',
        subServices: ['Lawn Mowing', 'Tree Trimming', 'Planting & Landscaping', 'Garden Cleanup', 'Watering Setup'],
        bullets: [
            'Keep your outdoor spaces green, tidy and beautiful.',
            'Now Trending: Vertical gardens and drought-resistant landscaping.',
        ],
        heroImage: '/Images/Job Cards Images/Gardening_job_card.png',
    },
    {
        id: 'plumbing',
        label: 'Plumbing',
        iconPath: '/Images/Service Category vectors/PlumbingVector.png',
        subServices: ['Leak Repair', 'Pipe Installation', 'Drain Cleaning', 'Faucet Repair', 'Toilet Repair'],
        bullets: [
            'Fix leaks, install pipes and keep your water running smoothly.',
            'Now Trending: Pressure-balanced shower fixtures.',
        ],
        heroImage: '/Images/Job Cards Images/Plumbing_job_card.png',
    },
    {
        id: 'electricity',
        label: 'Electricity',
        iconPath: '/Images/Service Category vectors/ElectricityVector.png',
        subServices: ['Wiring & Rewiring', 'Outlet Installation', 'Light Fixture Installation', 'Circuit Breaker Repair', 'Smart Switch Setup'],
        bullets: [
            'Safe, certified electrical work by verified professionals.',
            'Now Trending: Smart lighting and USB outlet installations.',
        ],
        heroImage: '/Images/Job Cards Images/Electricity_job_card.png',
    },
    {
        id: 'painting',
        label: 'Painting',
        iconPath: '/Images/Service Category vectors/Paintingvector.png',
        subServices: ['Interior Painting', 'Exterior Painting', 'Wallpaper Installation', 'Colour Consultation'],
        bullets: [
            'Transform your spaces with fresh, professional paint jobs.',
            'Now Trending: Limewash, textured finishes & feature walls.',
        ],
        heroImage: '/Images/Job Cards Images/Painting_job_card.png',
    },
    {
        id: 'babysitting',
        label: 'Childcare',
        iconPath: '/Images/Service Category vectors/babysettingnVector.png',
        subServices: ['Regular Babysitting', 'After-School Care', 'Night Sitting', 'Day Out Supervision'],
        bullets: [
            'Trusted, background-checked carers for your children.',
            'Now Trending: Bilingual carers and homework-help sessions.',
        ],
        heroImage: '/Images/Job Cards Images/Babysetting_job_card.png',
    },
    {
        id: 'appliance_installation',
        label: 'Home Repair',
        iconPath: '/Images/Service Category vectors/homerepairVector.png',
        subServices: ['Appliance Installation', 'Tiling', 'Flooring Help', 'Cabinet Installation', 'Pool Cleaning'],
        bullets: [
            'From tiling to appliances, we handle it all.',
            'Now Trending: Feature-wall tiling and open-plan kitchen remodels.',
        ],
        heroImage: '/Images/Job Cards Images/Pool Cleaning_job_card.png',
    },
];

// ── Props ──────────────────────────────────────────────────────────────────
interface ClientHomeProps {
    userName?: string;
    selectedCity?: string | null;
    selectedArea?: string | null;
    recentOrders?: any[];
    availableServiceIds?: string[];
    onSelectService: (service: string, subService?: string) => void;
    onChangeLocation: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────
const ClientHome: React.FC<ClientHomeProps & { availableServiceIds?: string[] }> = ({
    onSelectService,
    availableServiceIds,
    selectedCity,
    selectedArea,
    onChangeLocation
}) => {
    // Supply-driven filtering
    const visibleServices = React.useMemo(() => {
        return availableServiceIds && availableServiceIds.length > 0
            ? SERVICES.filter(s => availableServiceIds.includes(s.id))
            : SERVICES;
    }, [availableServiceIds]);

    // Use the first one (at the left) as default
    const [activeId, setActiveId] = useState<string>(visibleServices[0]?.id || SERVICES[0].id);

    // Only reset activeId if it's no longer in the visible list
    useEffect(() => {
        if (visibleServices.length > 0 && !visibleServices.find(s => s.id === activeId)) {
            setActiveId(visibleServices[0].id);
        }
    }, [visibleServices, activeId]);
    const activeButtonRef = useRef<HTMLButtonElement>(null);

    const active = visibleServices.find(s => s.id === activeId) || visibleServices[0] || SERVICES[0];

    // Scroll active tab into view whenever it changes
    useEffect(() => {
        activeButtonRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
        });
    }, [activeId]);

    // ── Animated counter + celebration ─────────────────────────────
    const TARGET = 1_000_000;
    const DURATION_MS = 2200;
    const [count, setCount] = useState(0);
    const [celebrated, setCelebrated] = useState(false);
    const [confetti, setConfetti] = useState<{ id: number; x: number; emoji: string; delay: number }[]>([]);
    const counterStarted = useRef(false);
    const counterRef = useRef<HTMLDivElement>(null);

    const playCelebrationSound = () => {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioCtx();
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.13;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.22, t + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.start(t);
                osc.stop(t + 0.55);
            });
        } catch { }
    };

    useEffect(() => {
        const el = counterRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !counterStarted.current) {
                    counterStarted.current = true;
                    const start = performance.now();
                    const tick = (now: number) => {
                        const elapsed = now - start;
                        const progress = Math.min(elapsed / DURATION_MS, 1);
                        const eased = 1 - Math.pow(1 - progress, 4);
                        setCount(Math.floor(eased * TARGET));
                        if (progress < 1) {
                            requestAnimationFrame(tick);
                        } else {
                            setCount(TARGET);
                            setCelebrated(true);
                            playCelebrationSound();
                            const EMOJIS = ['🎉', '✨', '🌟', '💛', '🎊', '⭐', '🥳', '💫'];
                            setConfetti(Array.from({ length: 24 }, (_, i) => ({
                                id: i,
                                x: 5 + Math.random() * 90,
                                emoji: EMOJIS[i % EMOJIS.length],
                                delay: Math.random() * 0.5,
                            })));
                            setTimeout(() => setConfetti([]), 3200);
                        }
                    };
                    requestAnimationFrame(tick);
                }
            },
            { threshold: 0.3 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const formattedCount = count.toLocaleString('en-US');

    return (
        <div className="min-h-screen bg-white flex flex-col pb-28">

            {/* ── Location selector ───────────────────────────────────── */}
            <div className="flex items-center justify-center pt-6 px-4">
                <button
                    onClick={onChangeLocation}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-100 bg-neutral-50/50 active:scale-95 transition-all shadow-sm"
                >
                    <MapPin size={14} className="text-[#00A082]" />
                    <span className="text-[13px] font-black text-neutral-800 tracking-tight">
                        {selectedCity}{selectedArea ? `, ${selectedArea}` : ''}
                    </span>
                    <ChevronDown size={14} className="text-neutral-400" />
                </button>
            </div>

            {/* ── Logo header ────────────────────────────────────────── */}
            <div className="flex items-center justify-center px-4 pt-2 pb-4">
                <img
                    src="/Images/Logo/GYLogo.png"
                    alt="Lbricol"
                    style={{ height: 200, objectFit: 'contain' }}
                />
            </div>

            {/* ── Animated counter ─────────────────────────────────────── */}
            <div ref={counterRef} className="relative px-6 pt-1 pb-6 flex flex-col items-center text-center overflow-visible">

                {/* Confetti burst */}
                {confetti.map((p: { id: number; x: number; emoji: string; delay: number }) => (
                    <motion.span
                        key={p.id}
                        initial={{ opacity: 1, y: 0, scale: 0.6 }}
                        animate={{ opacity: 0, y: -120, scale: 1.4 }}
                        transition={{ duration: 1.4 + p.delay, ease: 'easeOut', delay: p.delay * 0.6 }}
                        style={{
                            position: 'absolute',
                            left: `${p.x}%`,
                            top: '50%',
                            fontSize: '22px',
                            pointerEvents: 'none',
                            zIndex: 50,
                            userSelect: 'none',
                        }}
                    >
                        {p.emoji}
                    </motion.span>
                ))}

                {/* The number */}
                <motion.span
                    animate={celebrated ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="font-black leading-none tracking-tight text-[#00A082] block"
                    style={{ fontSize: 'clamp(56px, 18vw, 80px)' }}
                >
                    {formattedCount}
                </motion.span>

                {/* "Bricoles" — right-aligned below the number */}
                <div className="w-full flex justify-end pr-1 mt-1">
                    <span
                        className="text-[17px] font-bold tracking-tight"
                        style={{ color: '#00A082' }}
                    >
                        Bricoles
                    </span>
                </div>
            </div>

            {/* ── Category tabs ───────────────────────────────────────── */}
            <div
                className="flex gap-4 overflow-x-auto border-b border-neutral-100 px-4 flex-shrink-0"
                style={{ scrollbarWidth: 'none' }}
            >
                {visibleServices.map(svc => {
                    const isActive = svc.id === activeId;
                    return (
                        <button
                            key={svc.id}
                            ref={isActive ? activeButtonRef : undefined}
                            onClick={() => setActiveId(svc.id)}
                            className="flex flex-col items-center gap-3 px-1 pt-4 pb-3 flex-shrink-0 relative transition-all"
                        >
                            {/* Icon circle — larger, yellow on active with organic loop animation */}
                            <motion.div
                                animate={isActive ? {
                                    borderRadius: [
                                        '60% 40% 30% 70% / 60% 30% 70% 40%',
                                        '30% 60% 70% 40% / 50% 60% 30% 60%',
                                        '60% 40% 30% 70% / 60% 30% 70% 40%'
                                    ],
                                    rotate: [-10, 5, -10],
                                    scale: [1.05, 1.08, 1.05]
                                } : {
                                    borderRadius: '50%',
                                    rotate: 0,
                                    scale: 1
                                }}
                                transition={isActive ? {
                                    duration: 6,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                } : {
                                    duration: 0.3
                                }}
                                style={{
                                    width: 72,
                                    height: 72,
                                    backgroundColor: isActive ? '#FFC244' : '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: isActive ? 'none' : '1px solid #F0F0F0',
                                }}
                            >
                                <img
                                    src={svc.iconPath}
                                    className="w-10 h-10 object-contain transition-all duration-300"
                                    style={{
                                        filter: isActive ? 'none' : 'opacity(60%)'
                                    }}
                                    alt={svc.label}
                                />
                            </motion.div>

                            {/* Label — green on active */}
                            <span
                                className="text-[13px] whitespace-nowrap"
                                style={{
                                    fontWeight: isActive ? 900 : 700,
                                    color: isActive ? G_GREEN : '#666',
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                {svc.label}
                            </span>

                            {/* Active underline */}
                            {isActive && (
                                <motion.div
                                    layoutId="tab-indicator"
                                    className="absolute bottom-0 left-0 right-0 rounded-full"
                                    style={{ height: 3, backgroundColor: G_GREEN }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Active service content ──────────────────────────────── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col flex-1 pt-5"
                >
                    {/* Sub-service pill chips */}
                    <div className="px-4 pb-6 flex flex-wrap gap-2.5">
                        {active.subServices.map((sub, idx) => (
                            <motion.button
                                key={sub}
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 380,
                                    damping: 20,
                                    delay: idx * 0.07
                                }}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => onSelectService(active.id, sub)}
                                className="px-4 py-2.5 rounded-full border border-[#E6E6E6] text-[15px] font-bold text-[#1D1D1D] bg-white hover:border-[#1D1D1D] active:bg-neutral-50 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                            >
                                {sub}
                            </motion.button>
                        ))}
                    </div>

                    {/* Feature bullets */}
                    <div className="px-5 pb-5 space-y-3.5">
                        {active.bullets.map((b, i) => (
                            <motion.div
                                key={i}
                                className="flex items-start gap-3"
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{
                                    type: 'spring',
                                    stiffness: 260,
                                    damping: 22,
                                    delay: active.subServices.length * 0.07 + i * 0.08
                                }}
                            >
                                <span className="mt-0.5 text-[#B3B3B3] flex-shrink-0 text-[15px]">✓</span>
                                <p className="text-[15px] text-[#4A4A4A] leading-snug font-medium">{b}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default ClientHome;
