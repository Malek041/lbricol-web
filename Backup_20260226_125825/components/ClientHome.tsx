"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getServiceById } from '@/config/services_config';
import { useLanguage } from '@/context/LanguageContext';

// ── Palette ────────────────────────────────────────────────────────────────
const G_GREEN = '#00A082';

// ── Service catalogue ─────────────────────────────────────────────────────
interface ServiceEntry {
    id: string;
    label: string;
    labelFr: string;
    iconPath: string;
    subServices: { en: string; fr: string }[];
    bullets: { en: string; fr: string }[];
    heroImage: string; // local /Images/Job Cards Images/ path
}

// Map each service to its local job-card image
const SERVICES: ServiceEntry[] = [
    {
        id: 'handyman',
        label: 'Handyman',
        labelFr: 'Bricoleur',
        iconPath: '/Images/Service Category vectors/HandymanVector.png',
        subServices: [
            { en: 'General Repairs', fr: 'Réparations Générales' },
            { en: 'Door & Lock Repair', fr: 'Réparation de Portes et Serrures' },
            { en: 'Furniture Fixes', fr: 'Réparation de Meubles' },
            { en: 'Shelf Mounting', fr: 'Montage d\'Étagères' },
            { en: 'Caulking & Grouting', fr: 'Calfeutrage et Jointoiement' }
        ],
        bullets: [
            { en: 'From leaky taps to broken hinges, we fix it all.', fr: 'Des robinets qui fuient aux charnières cassées, nous réparons tout.' },
            { en: 'Now Trending: Smart-home gadget installations.', fr: 'Tendance actuelle : Installations de gadgets pour maison intelligente.' },
        ],
        heroImage: '/Images/Job Cards Images/Handyman_job_card.png',
    },
    {
        id: 'furniture_assembly',
        label: 'Assembly',
        labelFr: 'Montage',
        iconPath: '/Images/Service Category vectors/AsssemblyVector.png',
        subServices: [
            { en: 'General Furniture Assembly', fr: 'Montage de Meubles Général' },
            { en: 'IKEA / Flat-Pack Assembly', fr: 'Montage IKEA / Kit' },
            { en: 'Crib Assembly', fr: 'Montage de Berceau' },
            { en: 'Bookshelf Assembly', fr: 'Montage de Bibliothèque' },
            { en: 'Desk Assembly', fr: 'Montage de Bureau' }
        ],
        bullets: [
            { en: 'Assemble or disassemble furniture items by unboxing, building, and any cleanup.', fr: 'Montez ou démontez des meubles en déballant, assemblant et nettoyant.' },
            { en: 'Now Trending: Curved sofas, computer desks & sustainable materials.', fr: 'Tendance actuelle : Canapés courbés, bureaux d\'ordinateur et matériaux durables.' },
        ],
        heroImage: '/Images/Job Cards Images/Furniture_Assembly_job_card.png',
    },
    {
        id: 'mounting',
        label: 'Mounting',
        labelFr: 'Fixation murale',
        iconPath: '/Images/Service Category vectors/MountingVector.png',
        subServices: [
            { en: 'TV Mounting', fr: 'Montage de TV' },
            { en: 'Shelf Installation', fr: 'Installation d\'Étagères' },
            { en: 'Curtain Rod Installation', fr: 'Installation de Tringles à Rideaux' },
            { en: 'Mirror Hanging', fr: 'Accrochage de Miroirs' },
            { en: 'Picture Hanging', fr: 'Accrochage de Tableaux' }
        ],
        bullets: [
            { en: 'Securely mount your TV, shelves, art, mirrors, dressers, and more.', fr: 'Montez en toute sécurité votre TV, vos étagères, vos tableaux, vos miroirs, vos commodes et bien plus.' },
            { en: 'Now Trending: Gallery walls, art TVs & wraparound bookcases.', fr: 'Tendance actuelle : Murs de galerie, TV artistiques et bibliothèques d\'angle.' },
        ],
        heroImage: '/Images/Job Cards Images/Handyman_job_card.png', // closest match
    },
    {
        id: 'moving',
        label: 'Moving',
        labelFr: 'Déménagement',
        iconPath: '/Images/Service Category vectors/MovingHelpVector.png',
        subServices: [
            { en: 'Local Moving', fr: 'Déménagement Local' },
            { en: 'Packing Services', fr: 'Services d\'Emballage' },
            { en: 'Furniture Moving Only', fr: 'Déménagement de Meubles Uniquement' },
            { en: 'Heavy Item Hauling', fr: 'Transport d\'Articles Lourds' }
        ],
        bullets: [
            { en: 'Professional movers handle packing, loading and transport.', fr: 'Des déménageurs professionnels gèrent l\'emballage, le chargement et le transport.' },
            { en: 'Now Trending: Same-day apartment moves in under 3 hours.', fr: 'Tendance actuelle : Déménagements d\'appartements le jour même en moins de 3 heures.' },
        ],
        heroImage: '/Images/Job Cards Images/Moving Help_job_card.png',
    },
    {
        id: 'cleaning',
        label: 'Cleaning',
        labelFr: 'Nettoyage',
        iconPath: '/Images/Service Category vectors/CleaningVector.png',
        subServices: [
            { en: 'Family Home Cleaning', fr: 'Nettoyage de Maison Familiale' },
            { en: 'Airbnb Cleaning', fr: 'Nettoyage Airbnb' },
            { en: 'Car Washing', fr: 'Lavage de Voiture' },
            { en: 'Car Detailing', fr: 'Nettoyage Détaillé de Voiture' },
            { en: 'Deep Home Cleaning', fr: 'Nettoyage en Profondeur de Maison' }
        ],
        bullets: [
            { en: 'Clean your home or office; deep-clean appliances and other spaces.', fr: 'Nettoyez votre maison ou votre bureau ; nettoyez en profondeur les appareils ménagers et d\'autres espaces.' },
            { en: 'Now Trending: Eco-friendly products, home cleaning checklists, and cleaning hacks.', fr: 'Tendance actuelle : Produits écologiques, listes de contrôle de nettoyage à domicile et astuces de nettoyage.' },
        ],
        heroImage: '/Images/Job Cards Images/Cleaning_job_card.png',
    },
    {
        id: 'glass_cleaning',
        label: 'Glass cleaning',
        labelFr: 'Nettoyage de vitres',
        iconPath: '/Images/Service Category vectors/Glass cleaning.png',
        subServices: [
            { en: 'Residential Glass', fr: 'Vitres Résidentielles' },
            { en: 'Commercial/Office Glass', fr: 'Vitres Commerciales / de Bureau' },
            { en: 'Automotive Glass', fr: 'Vitres Automobiles' },
            { en: 'Specialty/Hard-to-Clean Glass', fr: 'Vitres Spéciales / Difficiles à Nettoyer' }
        ],
        bullets: [
            { en: 'Streak-free cleaning for windows, mirrors and specialty glass.', fr: 'Nettoyage sans traces pour les fenêtres, les miroirs et les vitres spéciales.' },
            { en: 'Now Trending: Eco-friendly streak-free formulas.', fr: 'Tendance actuelle : Formules écologiques sans traces.' },
        ],
        heroImage: '/Images/Job Cards Images/Cleaning_job_card.png', // reusing cleaning image for now
    },
    {
        id: 'gardening',
        label: 'Gardening',
        labelFr: 'Jardinage',
        iconPath: '/Images/Service Category vectors/GardeningVector.png',
        subServices: [
            { en: 'Lawn Mowing', fr: 'Tonte de Pelouse' },
            { en: 'Tree Trimming', fr: 'Taille d\'Arbres' },
            { en: 'Planting & Landscaping', fr: 'Plantation et Aménagement Paysager' },
            { en: 'Garden Cleanup', fr: 'Nettoyage de Jardin' },
            { en: 'Watering Setup', fr: 'Installation d\'Arrosage' }
        ],
        bullets: [
            { en: 'Keep your outdoor spaces green, tidy and beautiful.', fr: 'Gardez vos espaces extérieurs verts, bien rangés et beaux.' },
            { en: 'Now Trending: Vertical gardens and drought-resistant landscaping.', fr: 'Tendance actuelle : Jardins verticaux et aménagement paysager résistant à la sécheresse.' },
        ],
        heroImage: '/Images/Job Cards Images/Gardening_job_card.png',
    },
    {
        id: 'plumbing',
        label: 'Plumbing',
        labelFr: 'Plomberie',
        iconPath: '/Images/Service Category vectors/PlumbingVector.png',
        subServices: [
            { en: 'Leak Repair', fr: 'Réparation de Fuites' },
            { en: 'Pipe Installation', fr: 'Installation de Tuyaux' },
            { en: 'Drain Cleaning', fr: 'Nettoyage de Canalisations' },
            { en: 'Faucet Repair', fr: 'Réparation de Robinets' },
            { en: 'Toilet Repair', fr: 'Réparation de Toilettes' }
        ],
        bullets: [
            { en: 'Fix leaks, install pipes and keep your water running smoothly.', fr: 'Réparez les fuites, installez des tuyaux et gardez votre eau qui coule en douceur.' },
            { en: 'Now Trending: Pressure-balanced shower fixtures.', fr: 'Tendance actuelle : Appareils de douche à pression équilibrée.' },
        ],
        heroImage: '/Images/Job Cards Images/Plumbing_job_card.png',
    },
    {
        id: 'electricity',
        label: 'Electricity',
        labelFr: 'Électricité',
        iconPath: '/Images/Service Category vectors/ElectricityVector.png',
        subServices: [
            { en: 'Wiring & Rewiring', fr: 'Câblage et Recâblage' },
            { en: 'Outlet Installation', fr: 'Installation de Prises' },
            { en: 'Light Fixture Installation', fr: 'Installation de Luminaires' },
            { en: 'Circuit Breaker Repair', fr: 'Réparation de Disjoncteurs' },
            { en: 'Smart Switch Setup', fr: 'Installation d\'Interrupteurs Intelligents' }
        ],
        bullets: [
            { en: 'Safe, certified electrical work by verified professionals.', fr: 'Travaux électriques sûrs et certifiés par des professionnels vérifiés.' },
            { en: 'Now Trending: Smart lighting and USB outlet installations.', fr: 'Tendance actuelle : Éclairage intelligent et installations de prises USB.' },
        ],
        heroImage: '/Images/Job Cards Images/Electricity_job_card.png',
    },
    {
        id: 'painting',
        label: 'Painting',
        labelFr: 'Peinture',
        iconPath: '/Images/Service Category vectors/Paintingvector.png',
        subServices: [
            { en: 'Interior Painting', fr: 'Peinture Intérieure' },
            { en: 'Exterior Painting', fr: 'Peinture Extérieure' },
            { en: 'Wallpaper Installation', fr: 'Installation de Papier Peint' },
            { en: 'Colour Consultation', fr: 'Consultation de Couleurs' }
        ],
        bullets: [
            { en: 'Transform your spaces with fresh, professional paint jobs.', fr: 'Transformez vos espaces avec des travaux de peinture frais et professionnels.' },
            { en: 'Now Trending: Limewash, textured finishes & feature walls.', fr: 'Tendance actuelle : Peinture à la chaux, finitions texturées et murs caractéristiques.' },
        ],
        heroImage: '/Images/Job Cards Images/Painting_job_card.png',
    },
    {
        id: 'babysitting',
        label: 'Childcare',
        labelFr: 'Garde d\'enfants',
        iconPath: '/Images/Service Category vectors/babysettingnVector.png',
        subServices: [
            { en: 'Regular Babysitting', fr: 'Garde Prévue' },
            { en: 'After-School Care', fr: 'Garde Après l\'École' },
            { en: 'Night Sitting', fr: 'Garde de Nuit' },
            { en: 'Day Out Supervision', fr: 'Surveillance de Journées' }
        ],
        bullets: [
            { en: 'Trusted, background-checked carers for your children.', fr: 'Garde d\'enfants de confiance et vérifiée pour vos enfants.' },
            { en: 'Now Trending: Bilingual carers and homework-help sessions.', fr: 'Tendance actuelle : Gardes bilingues et aide aux devoirs.' },
        ],
        heroImage: '/Images/Job Cards Images/Babysetting_job_card.png',
    },
    {
        id: 'appliance_installation',
        label: 'Home Repair',
        labelFr: 'Réparation à domicile',
        iconPath: '/Images/Service Category vectors/homerepairVector.png',
        subServices: [
            { en: 'Appliance Installation', fr: 'Installation d\'Appareils Électroménagers' },
            { en: 'Tiling', fr: 'Carrelage' },
            { en: 'Flooring Help', fr: 'Aide à la Pose de Revêtement de Sol' },
            { en: 'Cabinet Installation', fr: 'Installation de Placards' },
            { en: 'Pool Cleaning', fr: 'Nettoyage de Piscine' }
        ],
        bullets: [
            { en: 'From tiling to appliances, we handle it all.', fr: 'De la pose de carrelage aux appareils électroménagers, nous nous occupons de tout.' },
            { en: 'Now Trending: Feature-wall tiling and open-plan kitchen remodels.', fr: 'Tendance actuelle : Carrelage de murs accentués et rénovations de cuisines ouvertes.' },
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
    availableSubServiceIds?: string[];
    onSelectService: (service: string, subService?: string) => void;
    onChangeLocation: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────
const ClientHome: React.FC<ClientHomeProps> = ({
    onSelectService,
    availableServiceIds,
    availableSubServiceIds,
    selectedCity,
    selectedArea,
    onChangeLocation
}) => {
    const { t } = useLanguage();
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

    // ── Process Demo Logic ──────────────────────────────────────────
    const [processStep, setProcessStep] = useState(0);
    const PROCESS_STEPS = [
        {
            title: { en: '1. Set Location & task', fr: '1. Lieu et Mission' },
            desc: {
                en: 'Define Location and Task Description',
                fr: 'Définissez le lieu et la tâche'
            },
            img: '/Images/Vectors Illu/LocationFlag_VI.png'
        },
        {
            title: { en: '2. Choose a Bricoler', fr: '2. Choisissez un Bricoleur' },
            desc: {
                en: 'Get Matched to experts. Review their profile, then decide.',
                fr: 'Trouvez des experts. Consultez leur profil, puis décidez.'
            },
            img: 'Images/Vectors Illu/fight.png'
        },
        {
            title: { en: '3. Program Your Task', fr: '3. Programmez votre Tâche' },
            desc: {
                en: 'Choose payment, review, confirm. Chat with your bricoler.',
                fr: 'choisissez votre mode de paiement, révisez et confirmez. Chattez avec votre bricoleur.'
            },
            img: '/Images/Vectors Illu/NewOrder.png'
        }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setProcessStep(prev => (prev + 1) % PROCESS_STEPS.length);
        }, 7000);
        return () => clearInterval(interval);
    }, []);

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

    const playTickSound = (ctx: AudioContext) => {
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.02);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
            osc.start();
            osc.stop(ctx.currentTime + 0.02);
        } catch { }
    };

    const playCelebrationSound = () => {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioCtx();

            // Rapid Triumphant Arpeggio
            const melody = [
                { f: 523.25, t: 0 },    // C5
                { f: 659.25, t: 0.06 }, // E5
                { f: 783.99, t: 0.12 }, // G5
                { f: 1046.50, t: 0.18 }, // C6
                { f: 1318.51, t: 0.24 }, // E6
                { f: 1567.98, t: 0.30 }  // G6
            ];

            melody.forEach((note) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = note.f;
                const start = ctx.currentTime + note.t;
                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(0.15, start + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
                osc.start(start);
                osc.stop(start + 0.5);
            });

            // Sustained Finishing Chord
            [523.25, 783.99, 1046.50, 2093.00].forEach((f) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = f;
                const start = ctx.currentTime + 0.4;
                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(0.12, start + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 2.0);
                osc.start(start);
                osc.stop(start + 2.1);
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

                    // Audio setup for ticking
                    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
                    const ctx = AudioCtx ? new AudioCtx() : null;
                    let lastTickTime = 0;
                    const TICK_INTERVAL = 40; // Play a tick sound every 40ms (~25 times/sec)

                    const start = performance.now();
                    const tick = (now: number) => {
                        const elapsed = now - start;
                        const progress = Math.min(elapsed / DURATION_MS, 1);
                        const eased = 1 - Math.pow(1 - progress, 4);
                        setCount(Math.floor(eased * TARGET));

                        if (progress < 1) {
                            if (ctx && now - lastTickTime > TICK_INTERVAL) {
                                playTickSound(ctx);
                                lastTickTime = now;
                            }
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
            <div className="flex items-center justify-center pt-10 px-10">
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

            {/* Removed Logo and Counter as requested */}

            {/* ── Hero Heading ────────────────────────────────────────── */}
            <div className="px-6 pt-10 pb-12 flex flex-col items-center text-center">
                <h1
                    className="font-black leading-[1.05] tracking-tighter text-[#1D1D1D] mx-auto"
                    style={{
                        fontSize: t({ en: 'clamp(42px, 12vw, 56px)', fr: 'clamp(34px, 10vw, 48px)' }),
                        maxWidth: t({ en: '380px', fr: '420px' }),
                        fontWeight: 700
                    }}
                >
                    {t({
                        en: 'Book trusted help for home tasks',
                        fr: 'Réservez une aide de confiance pour vos tâches'
                    })}
                </h1>
            </div>

            {/* ── Process Demo Step ─────────────────────────────────────── */}
            <div className="px-6 pb-6 pt-2 overflow-hidden min-h-[120px] flex items-center justify-center">

                <AnimatePresence mode="wait">
                    <motion.div
                        key={processStep}
                        initial={{ opacity: 0, x: 20, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, x: -20, filter: 'blur(8px)' }}
                        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                        className="flex items-center justify-center gap-6"
                    >
                        {/* Illustration */}
                        <div className="w-[85px] h-[85px] flex items-center justify-center flex-shrink-0">
                            <img
                                src={PROCESS_STEPS[processStep].img}
                                alt=""
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* Text */}
                        <div className="flex flex-col text-left">
                            <h3 className="text-[20px] font-black text-[#1D1D1D] leading-tight">
                                {t(PROCESS_STEPS[processStep].title)}
                            </h3>
                            <p className="text-[13px] font-medium text-neutral-400 leading-snug mt-1 max-w-[200px]">
                                {t(PROCESS_STEPS[processStep].desc)}
                            </p>
                        </div>
                    </motion.div>
                </AnimatePresence>
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
                                    width: 90,
                                    height: 90,
                                    backgroundColor: isActive ? '#FFC244' : '#FFFFFF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: isActive ? 'none' : '1.5px solid #F0F0F0',
                                }}
                            >
                                <img
                                    src={svc.iconPath}
                                    className="w-14 h-14 object-contain transition-all duration-300"
                                    style={{
                                        filter: isActive ? 'none' : 'opacity(60%)'
                                    }}
                                    alt={svc.label}
                                />
                            </motion.div>

                            {/* Label — green on active */}
                            <span
                                className="text-[14px] whitespace-nowrap mt-1"
                                style={{
                                    fontWeight: isActive ? 900 : 700,
                                    color: isActive ? G_GREEN : '#666',
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                {t({ en: svc.label, fr: svc.labelFr })}
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
                        {active.subServices
                            .filter(subObj => {
                                const subName = subObj.en;
                                if (!availableSubServiceIds || availableSubServiceIds.length === 0) return true;
                                const config = getServiceById(active.id);
                                if (!config) return true;
                                const subConfig = config.subServices.find(ss => ss.name === subName);
                                if (!subConfig) return true; // Keep it if we can't find a mapping (fallback)
                                return availableSubServiceIds.includes(subConfig.id);
                            })
                            .map((sub, idx) => (
                                <motion.button
                                    key={sub.en}
                                    initial={{ opacity: 0, scale: 0.6 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{
                                        type: 'spring',
                                        stiffness: 380,
                                        damping: 20,
                                        delay: idx * 0.07
                                    }}
                                    whileTap={{ scale: 0.92 }}
                                    onClick={() => onSelectService(active.id, sub.en)}
                                    className="px-4 py-2.5 rounded-full border border-[#E6E6E6] text-[15px] font-bold text-[#1D1D1D] bg-white hover:border-[#1D1D1D] active:bg-neutral-50 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                                >
                                    {t(sub)}
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
                                <p className="text-[15px] text-[#4A4A4A] leading-snug font-medium">{t(b)}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default ClientHome;
