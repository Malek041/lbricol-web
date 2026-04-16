"use client";

import { safeStorage } from '@/lib/safeStorage';
import React, { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Search, X, Bell, Home, Building, Star, Zap, Tag, ShieldCheck, Leaf } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/context/OrderContext';
import { cn } from '@/lib/utils';
import { getServiceById } from '@/config/services_config';
import { useLanguage } from '@/context/LanguageContext';
import { ReviewsScrollingSection } from './ReviewsScrollingSection';
import { ClientOnboarding } from './ClientOnboarding';
import { SERVICES_CATALOGUE } from '@/config/services_catalogue';
import { SERVICE_TIER_RATES } from '@/config/moroccan_areas';
import SplashScreen from '@/components/layout/SplashScreen';
import CompactHomeMap from '@/components/shared/CompactHomeMap';
import WaveTop from '@/components/shared/WaveTop';


// ── Palette ────────────────────────────────────────────────────────────────
const BRAND_YELLOW = '#FFCC02';

// ── Service catalogue ─────────────────────────────────────────────────────
interface ServiceEntry {
    id: string;
    label: string;
    labelFr: string;
    labelAr?: string;
    iconPath: string;
    subServices: { id?: string; en: string; fr: string; ar?: string }[];
    bullets: { en: string; fr: string; ar?: string }[];
    heroImage: string; // local /Images/Job Cards Images/ path
}

// Map each service to its local job-card image
// catalogue now imported from '@/config/services_catalogue'

// ── Props ──────────────────────────────────────────────────────────────────
interface ClientHomeProps {
    userName?: string;
    selectedCity?: string | null;
    selectedArea?: string | null;
    recentOrders?: any[];
    availableServiceIds: string[] | null;
    availableSubServiceIds: string[] | null;
    bricolersCountMap?: Record<string, number>;
    serviceRatingsMap?: Record<string, number>;
    trendingSubServiceIds?: string[]; // array of subService ids
    popularServiceIds?: string[]; // ordered list of service ids by popularity
    onSelectService: (service: string, subService?: string) => void;
    onChangeLocation: () => void;
    onNavigateToShare?: () => void;
    showOnboarding: boolean;
    onOnboardingComplete: () => void;
    onBecomeBricoler?: () => void; // callback to launch the Bricoler onboarding
    isBricoler?: boolean;
    initialLocation?: { lat: number; lng: number } | null;
    onAddressUpdate?: (address: string) => void;
    isSearchOpen?: boolean;
    setIsSearchOpen?: (open: boolean) => void;
    gpsPermissionDenied?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────

// ── Components ─────────────────────────────────────────────────────────────

const PromoBannersWidget: React.FC<{
    showReferral: boolean;
    showUpsell: boolean;
    onReferralClick: () => void;
    onUpsellClick: () => void;
    language: string;
    t: any;
}> = ({ showReferral, showUpsell, onReferralClick, onUpsellClick, language, t }) => {
    const [expanded, setExpanded] = useState(false);

    if (!showReferral && !showUpsell) return null;

    const banners: any[] = [];
    if (showReferral) banners.push({
        id: 'referral',
        title: t({ en: 'Refer friends, win 15%', fr: 'Parrainez, gagnez 15%', ar: 'أحِل أصدقائك واربح 15%' }),
        onClick: onReferralClick,
        type: 'referral'
    });
    if (showUpsell) banners.push({
        id: 'upsell',
        title: t({ en: 'Earn with your skills', fr: 'Gagnez avec vos talents', ar: 'اربح بمهاراتك' }),
        onClick: onUpsellClick,
        type: 'upsell'
    });

    const RepeatedText = () => (
        <div className="flex items-center gap-10 px-4">
            {banners.map((b, i) => <span key={`rep-${i}`} className="text-[14px] font-medium text-neutral-500 whitespace-nowrap">{b.title}</span>)}
            {banners.map((b, i) => <span key={`rep2-${i}`} className="text-[14px] font-medium text-neutral-500 whitespace-nowrap">{b.title}</span>)}
            {banners.map((b, i) => <span key={`rep3-${i}`} className="text-[14px] font-medium text-neutral-500 whitespace-nowrap">{b.title}</span>)}
            {banners.map((b, i) => <span key={`rep4-${i}`} className="text-[14px] font-medium text-neutral-500 whitespace-nowrap">{b.title}</span>)}
        </div>
    );

    const isRTL = language === 'ar';

    const renderCard = (b: any, index: number) => {
        if (b.type === 'referral') {
            return (
                <div
                    key={`ref-${index}`}
                    onClick={(e) => { e.stopPropagation(); b.onClick(); }}
                    className="w-[280px] h-[120px] shrink-0 rounded-[20px_30px_18px_40px] p-4 flex flex-col justify-between cursor-pointer relative overflow-hidden border border-white/10 active:scale-[0.98] transition-all bg-[#027C3E] mx-1.5"
                >
                    <div className="z-10">
                        <h3 className="text-[16px] font-medium text-white leading-tight mb-1">
                            {t({ en: 'Refer friends, win 15%', fr: 'Parrainez, gagnez 15%', ar: 'أحِل أصدقائك واربح 15%' })}
                        </h3>
                        <p className="text-[10px] font-medium text-white/90 leading-tight pr-4">
                            {t({
                                en: 'Invite your friends and win 15% discount for each successful referral!',
                                fr: 'Invitez vos amis et gagnez 15% de réduction pour chaque parrainage réussi !',
                                ar: 'قم بدعوة أصدقائك واربح خصم 15% عن كل دعوة ناجحة!'
                            })}
                        </p>
                    </div>
                    <div className="absolute -bottom-2 -right-1 z-10 w-[60px] h-[60px]">
                        <Image src="/Images/Vectors Illu/gifts.webp" alt="Gifts" fill style={{ objectFit: 'contain' }} />
                    </div>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                </div>
            )
        }
        if (b.type === 'upsell') {
            return (
                <div
                    key={`up-${index}`}
                    onClick={(e) => { e.stopPropagation(); b.onClick(); }}
                    className="w-[280px] h-[120px] shrink-0 rounded-[35px_15px_40px_20px] p-4 flex items-center cursor-pointer relative overflow-hidden border border-white/10 active:scale-[0.98] transition-all bg-[#01A083] mx-1.5"
                >
                    <div className={`z-10 w-[55%] ${isRTL ? 'mr-auto text-right' : 'ml-0 text-left'}`}>
                        <h3 className="text-[16px] font-medium text-white leading-tight mb-1.5">
                            {t({ en: 'Earn with your skills', fr: 'Gagnez avec vos talents', ar: 'اربح بمهاراتك' })}
                        </h3>
                        <p className="text-[10px] font-medium text-white/90 leading-snug">
                            {t({
                                en: 'Become a Bricoler — set your prices and choose your hours.',
                                fr: 'Devenez Bricoleur — fixez vos prix et choisissez vos horaires.',
                                ar: 'كن بريكولرًا — حدد أسعارك واختر مواعيدك.'
                            })}
                        </p>
                    </div>
                    <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} bottom-0 h-full w-[45%] flex items-end justify-end`}>
                        <div className={`absolute w-[50px] h-[50px] top-[15%] ${isRTL ? 'left-4' : 'right-4'} z-10`}>
                            <Image src="/Images/Vectors Illu/Groceriedbag.png" alt="Grocery bag" fill style={{ objectFit: 'contain' }} />
                        </div>
                        <div className={`absolute w-[45px] h-[45px] -bottom-1 ${isRTL ? 'left-12' : 'right-12'} z-20`}>
                            <Image src="/Images/4c456a03818b25032d0e4e80a711d569-Photoroom.png" alt="Moving Helper" fill style={{ objectFit: 'contain' }} />
                        </div>
                        <div className={`absolute w-[40px] h-[40px] bottom-0 ${isRTL ? 'left-0' : 'right-0'} z-20`}>
                            <Image src="/Images/Vectors Illu/Dogwalker.png" alt="Dogwalker" fill style={{ objectFit: 'contain' }} />
                        </div>
                    </div>
                </div>
            )
        }
        return null;
    };

    const RepeatedCards = () => (
        <div className="flex px-1 items-center">
            {banners.map((b, i) => renderCard(b, i))}
            {banners.map((b, i) => renderCard(b, i + 10))}
            {banners.map((b, i) => renderCard(b, i + 20))}
            {banners.map((b, i) => renderCard(b, i + 30))}
        </div>
    );

    return (
        <div className="fixed left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-100 transition-all duration-300 overflow-hidden" style={{ bottom: '70px', borderRadius: '35px 45px 0 0' }}>
            <div className="w-full" onClick={() => !expanded && setExpanded(true)}>
                {expanded ? (
                    <div className="flex flex-col relative w-full pt-2 pb-5">
                        <div className="w-full flex justify-center py-2 mb-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); setExpanded(false); }}>
                            <div className="w-10 h-1.5 rounded-full bg-neutral-200" />
                        </div>
                        <div className="animate-marquee items-center" style={{ animationDuration: '40s' }}>
                            <RepeatedCards />
                            <RepeatedCards />
                        </div>
                    </div>
                ) : (
                    <div className="py-3.5 cursor-pointer w-full flex items-center">
                        <div className="animate-marquee items-center" style={{ animationDuration: '20s' }}>
                            <RepeatedText />
                            <RepeatedText />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ClientHome: React.FC<ClientHomeProps> = ({
    onSelectService,
    availableServiceIds,
    availableSubServiceIds,
    trendingSubServiceIds = [],
    popularServiceIds = [],
    selectedCity,
    selectedArea,
    recentOrders = [],
    onChangeLocation,
    onNavigateToShare,
    showOnboarding,
    onOnboardingComplete,
    onBecomeBricoler,
    isBricoler = false,
    initialLocation,
    onAddressUpdate,
    isSearchOpen: isSearchOpenProp = false,
    setIsSearchOpen: setIsSearchOpenProp = () => { },
    gpsPermissionDenied = false,
    bricolersCountMap = {},
    serviceRatingsMap = {}
}) => {
    const { t, language } = useLanguage();
    const router = useRouter();
    const { setOrderField, resetOrder } = useOrder();

    const [lastCategoryId, setLastCategoryId] = useState<string | null>(null);
    const isSearchOpen = isSearchOpenProp;
    const setIsSearchOpen = setIsSearchOpenProp;
    const [showReferralBanner, setShowReferralBanner] = useState(false);
    const [showBricolerUpsell, setShowBricolerUpsell] = useState(false);
    const [activeId, setActiveId] = useState<string>('');
    const [hasManuallySelected, setHasManuallySelected] = useState(false);


    // Initial load
    useEffect(() => {
        // Onboarding Check
        // Onboarding logic is now handled in page.tsx

        const stored = safeStorage.getItem('last_service_category');
        if (stored) {
            setLastCategoryId(stored);
        } else if (recentOrders && recentOrders.length > 0) {
            // Fallback to most recent order if no local storage preference exists yet
            const lastOrder = [...recentOrders].sort((a, b) => {
                const dateA = a.createdAt?.seconds || new Date(a.createdAt || 0).getTime();
                const dateB = b.createdAt?.seconds || new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            })[0];

            if (lastOrder && lastOrder.serviceType) {
                setLastCategoryId(lastOrder.serviceType);
            }
        }

        // Referral Banner Visibility Logic
        const hasOrders = recentOrders && recentOrders.length > 0;
        if (!hasOrders) {
            setShowReferralBanner(false);
            return;
        }

        const lastDismissed = safeStorage.getItem('referral_banner_dismissed_at');
        const lastOrderCount = parseInt(safeStorage.getItem('referral_last_order_count') || '0');

        const isNewOrder = recentOrders.length > lastOrderCount;
        const isExpired = lastDismissed ? (Date.now() - parseInt(lastDismissed) > 24 * 60 * 60 * 1000) : true;

        if (isNewOrder || isExpired) {
            setShowReferralBanner(true);
            safeStorage.setItem('referral_last_order_count', recentOrders.length.toString());
        } else {
            setShowReferralBanner(false);
        }

        // Bricoler Upsell Visibility
        if (!isBricoler) {
            setShowBricolerUpsell(true);
        } else {
            setShowBricolerUpsell(false);
        }
    }, [recentOrders, isBricoler]);

    const handleReferralClick = () => {
        safeStorage.setItem('referral_banner_dismissed_at', Date.now().toString());
        safeStorage.setItem('referral_last_order_count', (recentOrders?.length || 0).toString());
        setShowReferralBanner(false);
        if (onNavigateToShare) onNavigateToShare();
    };

    const localizePlace = (name: string | null | undefined) => {
        if (!name) return '';
        if (language !== 'ar') return name;
        const key = name.trim();
        const map: Record<string, string> = {
            'Casablanca': 'الدار البيضاء',
            'Marrakech': 'مراكش',
            'Essaouira': 'الصويرة',
            'Agadir': 'أكادير',
            'Tangier': 'طنجة',
            'Rabat': 'الرباط',
            'Fes': 'فاس',
            'Medina': 'المدينة',
            'Médina': 'المدينة',
        };
        return map[key] || key;
    };
    // Supply-driven filtering + optional Trending tab appended
    const visibleServices = React.useMemo(() => {
        // If availableServiceIds is null, we are still loading or detecting.
        // If it's [], it means we explicitly found NO services in this city.
        if (availableServiceIds === null) return SERVICES_CATALOGUE;

        let base = SERVICES_CATALOGUE.filter(s => availableServiceIds.includes(s.id));

        // 1) Popularity-based ordering for this city/month, when provided
        if (popularServiceIds && popularServiceIds.length > 0) {
            const orderMap = new Map<string, number>();
            popularServiceIds.forEach((id, idx) => {
                // lower index = more popular
                orderMap.set(id.toLowerCase(), idx);
            });

            base = [...base].sort((a, b) => {
                const aRank = orderMap.has(a.id.toLowerCase()) ? (orderMap.get(a.id.toLowerCase()) as number) : Number.MAX_SAFE_INTEGER;
                const bRank = orderMap.has(b.id.toLowerCase()) ? (orderMap.get(b.id.toLowerCase()) as number) : Number.MAX_SAFE_INTEGER;
                return aRank - bRank;
            });
        }

        // 2) Personalization & Default Priority:
        // Prioritize "Cleaning" if available, until the user selects another category.
        const priorityId = lastCategoryId || (base.some(s => s.id === 'cleaning') ? 'cleaning' : (base.some(s => s.id === 'errands') ? 'errands' : null));

        if (priorityId) {
            const prioritizedIdx = base.findIndex(s => s.id === priorityId);
            if (prioritizedIdx > 0) {
                const updatedBase = [...base];
                const [prioritizedItem] = updatedBase.splice(prioritizedIdx, 1);
                updatedBase.unshift(prioritizedItem);
                base = updatedBase;
            }
        }

        if (trendingSubServiceIds.length > 0) {
            // ... (rest of trending logic remains same)
            const trendingSubs: { en: string; fr: string; ar?: string; parentServiceId: string }[] = [];
            for (const subId of trendingSubServiceIds) {
                SERVICES_CATALOGUE.forEach(svc => {
                    if (svc.disabled) return;
                    const svcConfig = require('@/config/services_config').getServiceById(svc.id);
                    if (svcConfig) {
                        const targetSub = svcConfig.subServices.find((ss: any) => ss.id === subId);
                        if (targetSub) {
                            const translatedObj = svc.subServices.find(ts => ts.en === targetSub.name || ts.en.toLowerCase().includes(targetSub.name.toLowerCase()));
                            if (translatedObj) {
                                trendingSubs.push({ en: translatedObj.en, fr: translatedObj.fr, ar: translatedObj.ar, parentServiceId: svc.id });
                            } else {
                                trendingSubs.push({ en: targetSub.name, fr: targetSub.name, parentServiceId: svc.id });
                            }
                        }
                    }
                });
            }

            const uniqueTrending = Array.from(new Map(trendingSubs.map(item => [item.en, item])).values());

            if (uniqueTrending.length > 0) {
                return [
                    ...base,
                    {
                        id: '__trending__',
                        label: 'Trending',
                        labelFr: 'Tendances',
                        labelAr: 'رائج',
                        iconPath: '',
                        subServices: uniqueTrending,
                        bullets: [
                            { en: 'The hottest tasks in your city right now.', fr: 'Les tâches les plus demandées dans votre ville en ce moment.', ar: 'أكثر الخدمات طلباً في مدينتك الآن.' },
                        ],
                        heroImage: '',
                        disabled: true,
                    }
                ];
            }
        }
        return base;
    }, [availableServiceIds, trendingSubServiceIds, lastCategoryId, popularServiceIds]);

    // Resync activeId to the top of the list if user hasn't made a manual choice or current choice vanished
    useEffect(() => {
        if (visibleServices.length > 0) {
            if (!activeId || (!hasManuallySelected && visibleServices[0].id !== activeId) || !visibleServices.find(s => s.id === activeId)) {
                setActiveId(visibleServices.find((s: any) => !s.disabled)?.id || visibleServices[0].id);
            }
        }
    }, [visibleServices, activeId, hasManuallySelected]);

    const handleServiceSelection = (serviceId: string, sub: any) => {
        resetOrder();
        const currentSub = sub as any;

        // Find the full service configuration for icons and other metadata
        const serviceTemplate = SERVICES_CATALOGUE.find(s => s.id === serviceId);
        const config = getServiceById(serviceId);
        const actualSubConfig = config?.subServices.find(ss =>
            ss.id === currentSub.id || ss.name === currentSub.en
        );

        safeStorage.setItem('last_service_category', serviceId);
        setLastCategoryId(serviceId);
        setOrderField('serviceType', serviceId);
        setOrderField('serviceName', serviceTemplate?.label || serviceId);
        setOrderField('subServiceId', currentSub.id || currentSub.en);
        setOrderField('subServiceName', t(currentSub));

        // Category Vector Mapping
        const categoryVectors: Record<string, string> = {
            handyman: '/Images/Service Category vectors/HandymanVector.webp',
            babysitting: '/Images/Service Category vectors/babysettingnVector.webp',
            cleaning: '/Images/Service Category vectors/CleaningVector.webp',
            plumbing: '/Images/Service Category vectors/PlumbingVector.webp',
            electricity: '/Images/Service Category vectors/ElectricityVector.webp',
            painting: '/Images/Service Category vectors/Paintingvector.webp',
            moving: '/Images/Service Category vectors/MovingHelpVector.webp',
            gardening: '/Images/Service Category vectors/GardeningVector.webp',
            assembly: '/Images/Service Category vectors/AsssemblyVector.webp',
            mounting: '/Images/Service Category vectors/MountingVector.webp'
        };

        const icon = categoryVectors[serviceId] || (actualSubConfig as any)?.image;
        if (icon) {
            setOrderField('serviceIcon', icon);
        }

        const isErrands = serviceId === 'errands' || serviceId?.includes('delivery');
        if (isErrands) {
            setOrderField('isPublic', true);
            setOrderField('providerId', null);
            setOrderField('providerName', null);
            router.push('/order/setup');
        } else {
            router.push('/order/step1');
        }
    };

    const active = visibleServices.find(s => s.id === activeId && !s.disabled) || visibleServices.find((s: any) => !s.disabled) || visibleServices[0] || SERVICES_CATALOGUE[0];
    const [isWhiteSectionVisible, setIsWhiteSectionVisible] = useState(false);
    const [startTicker, setStartTicker] = useState(false);
    const [isWaving, setIsWaving] = useState(true);

    useEffect(() => {
        const timerVisible = setTimeout(() => setIsWhiteSectionVisible(true), 200);
        const timerWave = setTimeout(() => setIsWaving(false), 1700); // 1.5s wave duration
        const timerTicker = setTimeout(() => setStartTicker(true), 2200);
        return () => {
            clearTimeout(timerVisible);
            clearTimeout(timerWave);
            clearTimeout(timerTicker);
        };
    }, []);

    const heroImages = [
        '/public/Images/clientHomeHeroSection/Cleaning.png',
        '/public/Images/clientHomeHeroSection/groceries.png',
        '/public/Images/clientHomeHeroSection/money.png',
        '/public/Images/clientHomeHeroSection/movingHelp.png',
        '/public/Images/clientHomeHeroSection/onlineStore.png',
        '/public/Images/clientHomeHeroSection/petsCare.png',
    ].map(p => p.replace('/public', ''));

    return (
        <div className={cn(
            "fixed inset-0 bg-[#FFC244] overflow-y-auto no-scrollbar h-[100dvh] w-screen font-jakarta",
            "z-0"
        )}>
            {/* 1. New yellow Hero Section */}
            <div className="w-full sticky top-0 z-0 bg-[#FFC244] overflow-hidden flex-shrink-0 pt-[env(safe-area-inset-top)] pb-5">
                {/* Location Pill */}
                <div className="flex justify-center pt-8 mb-6">
                    <motion.button
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0, duration: 0.6, type: "spring", stiffness: 180 }}
                        onClick={onChangeLocation}
                        className="flex items-center gap-1 bg-white px-3 py-2.5 rounded-full border-2 border-black/5 active:scale-95 transition-transform"
                    >
                        <div className="w-5 h-5 rounded-full flex items-center justify-center">
                            <Building size={25} className="text-[#000000]" />
                        </div>
                        <span className="text-[13px] font-medium text-[#111827] truncate max-w-[180px]">
                            {localizePlace(selectedCity || 'Set Location')}
                        </span>
                        <ChevronDown size={25} className="text-[#000000]" />
                    </motion.button>
                </div>

                {/* Heading */}
                <div className="text-center px-6 mb-2">
                    <motion.h1
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, duration: 0.6, type: "spring", stiffness: 200 }}
                        className="text-[28px] font-black leading-[1.0] tracking-tight text-black max-w-[340px] mx-auto"
                        style={{ fontWeight: 700, fontFamily: '"Uber Move", "UberMoveText", sans-serif' }}
                    >
                        {t({
                            en: 'Book trusted help for home tasks',
                            fr: 'Réservez une aide de confiance pour vos tâches',
                            ar: 'احجز مساعدة موثوقة لمهام منزلك'
                        })}
                    </motion.h1>
                </div>
                {/* Search bar trigger */}
                {/*<div className="px-6 pb-1 pt-6 w-full max-w-[400px] h-[30px] mx-auto">
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="w-full flex items-center gap-2 bg-neutral-50 rounded-full px-5 py-3.5 active:scale-[0.98] transition-all"
                    >
                        <Search size={18} className=" text-neutral-400 flex-shrink-0" strokeWidth={2.5} />
                        <span className="text-[15.5px] font-medium text-neutral-400">
                            {t({ en: 'Search services...', fr: 'Rechercher un service...', ar: 'ابحث عن خدمة...' })}
                        </span>
                    </button>
                </div>*/}


                {/* 1.5 Animated Icons Row */}
                <div className="flex gap-4 items-center overflow-x-hidden pt-1 mt-4 pointer-events-none">
                    <motion.div
                        animate={startTicker ? { x: [0, -1000] } : { x: 0 }}
                        transition={{
                            x: {
                                repeat: startTicker ? Infinity : 0,
                                repeatType: "loop",
                                duration: 25, // Scrolling speed
                                ease: "linear",
                            },
                        }}
                        className="flex gap-2 items-center whitespace-nowrap"
                    >
                        {[...heroImages, ...heroImages, ...heroImages].map((img, i) => (
                            <motion.div
                                key={i}
                                initial={{ y: 35, opacity: 0 }}
                                animate={{
                                    y: isWaving ? [0, -30, 0] : 0,
                                    opacity: 1
                                }}
                                transition={{
                                    y: isWaving ? {
                                        repeat: Infinity,
                                        duration: 0.6,
                                        delay: i * 0.1,
                                        ease: "easeInOut"
                                    } : {
                                        duration: 1.1,
                                        delay: 0,
                                        type: "spring",
                                        stiffness: 140,
                                        damping: 10
                                    },
                                    opacity: {
                                        duration: 0.6,
                                        delay: 0.8 + (i % heroImages.length) * 0.12
                                    }
                                }}
                                className="w-[100px] h-[100px] relative flex-shrink-0"
                            >
                                <Image
                                    src={img}
                                    alt="Service Icon"
                                    fill
                                    priority={i < heroImages.length}
                                    style={{ objectFit: 'contain' }}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* 2. White Bottom Sheet Container with Wave */}
            <motion.div
                initial={{ y: '100%' }}
                animate={isWhiteSectionVisible ? { y: 0 } : { y: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 180, delay: 0.4 }}
                className={cn(
                    "bg-white relative z-10 transition-all duration-500 ease-in-out shrink-0",
                    "-mt-8 min-h-screen"
                )}
            >
                {/* Wave Border Overlay */}
                <WaveTop />

                <AnimatePresence mode="wait">
                    <motion.div
                        key="services-list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                        className="flex flex-col"
                    >
                        {/* Scrollable Content Area */}
                        <div className="w-full pb-32">


                            {/* ── Category tabs ───────────────────────────────────────── */}


                            <div
                                className="flex gap-4 overflow-x-auto border-b border-neutral-100 px-4 flex-shrink-0"
                                style={{ scrollbarWidth: 'none' }}
                            >
                                {visibleServices.length > 0 ? (
                                    visibleServices.map((svc: any, idx: number) => {
                                        const isActive = svc.id === activeId;
                                        const isTrending = svc.id === '__trending__';
                                        const activeColor = isTrending ? '#B8860B' : '#01A083';
                                        const activeBg = isTrending ? '#ffffffff' : '#FFC244';
                                        return (
                                            <motion.button
                                                key={svc.id}
                                                // Removed hardcoded restriction: now depend only on city availability
                                                onClick={() => {
                                                    if (svc.disabled) return;
                                                    setActiveId(svc.id);
                                                    setHasManuallySelected(true);
                                                }}
                                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                                animate={{
                                                    opacity: svc.disabled ? 0.4 : 1,
                                                    y: 0,
                                                    scale: 1,
                                                    filter: svc.disabled ? 'grayscale(0.8)' : 'grayscale(0)'
                                                }}
                                                transition={{
                                                    type: "spring",
                                                    damping: 15,
                                                    stiffness: 200,
                                                    delay: 1.4 + idx * 0.07
                                                }}
                                                className={`flex flex-col items-center gap-3 px-1 pt-4 pb-3 flex-shrink-0 relative transition-all ${svc.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            >
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
                                                        borderRadius: '45% 55% 50% 60% / 55% 45% 65% 50%',
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
                                                        width: 76,
                                                        height: 76,
                                                        backgroundColor: isActive ? activeBg : '#FFFFFF',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: isActive ? 'none' : '1.5px solid #F0F0F0',
                                                    }}
                                                >
                                                    {availableServiceIds === null ? (
                                                        <div className="w-14 h-14 rounded-full bg-neutral-100 animate-pulse" />
                                                    ) : isTrending ? (
                                                        <span style={{ fontSize: 36 }}>🔥</span>
                                                    ) : (
                                                        <div className="relative w-full h-full flex items-center justify-center">
                                                            <div className={cn(
                                                                "w-16 h-16 relative transition-all duration-500",
                                                                isActive ? "scale-[1.25] rotate-[2deg] drop-shadow-xl" : "scale-[1.1] grayscale-[0.2]"
                                                            )}>
                                                                <Image
                                                                    key={svc.iconPath}
                                                                    src={svc.iconPath}
                                                                    alt={svc.label}
                                                                    fill
                                                                    style={{
                                                                        objectFit: 'contain',
                                                                        zIndex: 10,
                                                                        filter: isActive ? 'drop-shadow(0 20px 13px rgb(0 0 0 / 0.03)) drop-shadow(0 8px 5px rgb(0 0 0 / 0.08))' : 'none'
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>

                                                <span
                                                    className="text-[13px] whitespace-nowrap mt-1"
                                                    style={{
                                                        fontWeight: isActive ? 900 : 700,
                                                        color: isActive ? activeColor : '#666',
                                                        letterSpacing: '-0.02em',
                                                    }}
                                                >
                                                    {t({ en: svc.label, fr: svc.labelFr, ar: svc.labelAr || svc.labelFr })}
                                                </span>

                                                {isActive && (
                                                    <motion.div
                                                        layoutId="tab-indicator"
                                                        className="absolute bottom-0 left-0 right-0 rounded-full"
                                                        style={{ height: 3, backgroundColor: activeColor }}
                                                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                                                    />
                                                )}
                                            </motion.button>
                                        );
                                    })
                                ) : (
                                    availableServiceIds !== null && (
                                        <div className="w-full py-12 px-6 text-center">
                                            <div className="w-40 h-40 relative mx-auto mb-2">
                                                <Image
                                                    src={gpsPermissionDenied ? "/Images/Vectors Illu/TrackingVect.webp" : "/Images/Vectors Illu/Ordercancelled.webp"}
                                                    alt={gpsPermissionDenied ? "Location required" : "Not available"}
                                                    fill
                                                    style={{ objectFit: 'contain' }}
                                                />
                                            </div>
                                            <p className="text-[17px] font-bold text-neutral-900 mb-1.5 line-clamp-1">
                                                {gpsPermissionDenied
                                                    ? t({ en: 'Location access required', fr: 'Accès localisation requis', ar: 'مطلوب الإذن بالوصول للموقع' })
                                                    : t({ en: 'Not available here yet', fr: 'Pas encore disponible ici', ar: 'غير متوفر هنا بعد' })
                                                }
                                            </p>
                                            <p className="text-[14px] font-medium text-neutral-500 max-w-[340px] mx-auto leading-relaxed mb-6">
                                                {gpsPermissionDenied
                                                    ? t({
                                                        en: 'We need your location to show available services near you.',
                                                        fr: 'Nous avons besoin de votre position pour afficher les services disponibles près de vous.',
                                                        ar: 'نحتاج إلى موقعك لإظهار الخدمات المتاحة بالقرب منك.'
                                                    })
                                                    : t({
                                                        en: 'We are expanding fast! Try selecting a major city nearby.',
                                                        fr: 'Nous nous développons rapidement ! Essayez de sélectionner une grande ville à proximité.',
                                                        ar: 'نحن نتوسع بسرعة! حاول اختيار مدينة كبرى قريبة.'
                                                    })
                                                }
                                            </p>

                                            {gpsPermissionDenied && (
                                                <button
                                                    onClick={onChangeLocation}
                                                    className="bg-[#FFC244] text-black px-8 py-3.5 rounded-full font-black text-[15px] active:scale-95 transition-all shadow-md mx-auto"
                                                >
                                                    {t({ en: 'Enable Location', fr: 'Activer la localisation', ar: 'تفعيل تحديد الموقع' })}
                                                </button>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>

                            {/* ── Active service content ──────────────────────────────── */}
                            {visibleServices.length > 0 && (
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
                                                .filter((subObj: any) => {
                                                    // Always show these even if no pro is available yet (forced for growth)
                                                    const forceShow = [
                                                        'Electricity (HVAC)',
                                                        'Electricity (EV)',
                                                        'Electricity (Cams)',
                                                        'Cooling & heating systems',
                                                        'EV charger installation',
                                                        'Surveillance cameras',
                                                        'Dish Cleaning'
                                                    ];
                                                    if (forceShow.includes(subObj.en)) return true;

                                                    if (!availableSubServiceIds || availableSubServiceIds.length === 0) return true;
                                                    const config = getServiceById(active.id);
                                                    if (!config) return true;

                                                    // Try to find the sub-service config by matching the ID or English name from the local catalogue
                                                    const subConfig = config.subServices.find(ss =>
                                                        ss.id === subObj.id ||
                                                        ss.name === subObj.en ||
                                                        ss.id === subObj.en // Keep as fallback
                                                    );

                                                    if (!subConfig) return true; // Fallback: if we can't find a config mapping, show it anyway

                                                    // Check if the ID, English name, French name, or Arabic name exists in the available list
                                                    // This makes the filter robust against data registered in different languages or formats.
                                                    return (
                                                        availableSubServiceIds.includes(subConfig.id) ||
                                                        availableSubServiceIds.includes(subConfig.name) ||
                                                        availableSubServiceIds.includes(subObj.en) ||
                                                        availableSubServiceIds.includes(subObj.fr) ||
                                                        (subObj.ar && availableSubServiceIds.includes(subObj.ar)) ||
                                                        // Also check for common variants (slugified, lowercase etc)
                                                        availableSubServiceIds.includes(subConfig.id.replace(/_/g, ' ')) ||
                                                        availableSubServiceIds.includes(subConfig.id.toLowerCase())
                                                    );
                                                })
                                                .map((sub: any, idx: number) => (
                                                    <motion.button
                                                        key={sub.en}
                                                        initial={{ opacity: 0, scale: 0.6 }}
                                                        animate={{
                                                            opacity: 1,
                                                            scale: 1,
                                                            borderColor: ['#a4a4a4ff', '#F2F2F3', '#F2F2F3', '#a4a4a4ff'],
                                                            borderWidth: [0.5, 1, 1, 0.5]
                                                        }}
                                                        transition={{
                                                            opacity: { duration: 0.3, delay: (hasManuallySelected ? 0.1 : 1.6) + idx * 0.04 },
                                                            scale: { type: 'spring', stiffness: 380, damping: 20, delay: (hasManuallySelected ? 0.1 : 1.6) + idx * 0.04 },
                                                            borderColor: { duration: 1.5, delay: (hasManuallySelected ? 0.8 : 2.4) + idx * 0.04 },
                                                            borderWidth: { duration: 1.5, delay: (hasManuallySelected ? 0.8 : 2.4) + idx * 0.04 }
                                                        }}
                                                        whileTap={{ scale: 0.92 }}
                                                        onClick={() => handleServiceSelection(active.id, sub)}
                                                        className="px-3.5 py-2 rounded-full border-2 border-black/10 text-[13.5px] font-bold text-[#000000] bg-[#FFFFFF] hover:border-[#1D1D1D] active:bg-neutral-50 transition-colors"
                                                    >
                                                        {t(sub)}
                                                    </motion.button>
                                                ))}
                                        </div>

                                        {/* Dynamic Info Cards instead of static bullets */}
                                        <div className="px-4 pb-5">
                                            <motion.div
                                                className="bg-white rounded-2xl   overflow-hidden"
                                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ delay: (hasManuallySelected ? 0.2 : 1.7) }}
                                            >
                                                {/* Top Stats Row */}
                                                {/* <div className="flex items-center justify-between pb-4 pt-5 px-3 ">
                                                    {/* Left: Rating */}
                                                {/* <div className="flex flex-col items-center justify-center flex-1">
                                                        <span className="text-[18px] font-bold text-[#222222] tracking-tight mb-0.5">
                                                            {(serviceRatingsMap[active.id] || 4.9).toFixed(1)}
                                                        </span>
                                                        <div className="flex items-center text-[#222222]">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star
                                                                    key={i}
                                                                    size={10}
                                                                    fill={i < Math.floor(serviceRatingsMap[active.id] || 4.9) ? "currentColor" : "none"}
                                                                    strokeWidth={1}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="w-[1px] h-10 bg-[#DDDDDD] opacity-70"></div>

                                                    {/* Middle: Verified Badge */}
                                                {/*<div className="flex flex-col items-center justify-center flex-[1.2] px-1">
                                                        <div className="flex items-center justify-center gap-1 w-full text-[#222222]">
                                                            <Leaf size={18} className="scale-x-[-1] flex-shrink-0" strokeWidth={1.5} />
                                                            <span className="text-[14.5px] font-extrabold text-[#222222] text-center leading-[1.1] tracking-tight flex-shrink-0">
                                                                {t({ en: 'Verified', fr: 'Pros', ar: 'محترفون' })}<br />{t({ en: 'Pros', fr: 'Vérifiés', ar: 'معتمدون' })}
                                                            </span>
                                                            <Leaf size={18} className="flex-shrink-0" strokeWidth={1.5} />
                                                        </div>
                                                    </div>

                                                    <div className="w-[1px] h-10 bg-[#DDDDDD] opacity-70"></div>

                                                    {/* Right: Count */}
                                                {/*<div className="flex flex-col items-center justify-center flex-1">
                                                        <span className="text-[18px] font-bold text-[#222222] tracking-tight mb-0.5">
                                                            {bricolersCountMap[active.id] ? Math.max(5, bricolersCountMap[active.id]) + '+' : '5+'}
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-[#222222] text-center ">
                                                            {t({ en: 'Active pros', fr: 'Pros actifs', ar: 'محترفون نشطون' })}
                                                        </span>
                                                    </div>
                                                </div>*/}

                                                {/* Details Rows */}
                                                <div className="flex flex-col gap-5 p-5">
                                                    {/* Row 1: Speed */}
                                                    <motion.div
                                                        className="flex items-start gap-4"
                                                        initial={{ opacity: 0, x: -15 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: (hasManuallySelected ? 0.2 : 1.7) + 0.2 }}
                                                    >
                                                        <div className="mt-0.5 text-[#222222]">
                                                            <Zap size={24} strokeWidth={1.5} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-[15px] font-semibold text-[#222222] leading-tight mb-0.5">
                                                                {t({ en: 'Book in 10s (2 steps)', fr: 'Trouvez un pro en 10s', ar: 'احجز في 10 ثوانٍ' })}
                                                            </h4>
                                                            <p className="text-[14px] text-[#717171] leading-tight">
                                                                {t({ en: 'Find available pros instantly.', fr: 'Trouvez des pros disponibles instantanément.', ar: 'ابحث عن محترفين متاحين على الفور.' })}
                                                            </p>
                                                        </div>
                                                    </motion.div>

                                                    {/* Row 2: Price */}
                                                    <motion.div
                                                        className="flex items-start gap-4"
                                                        initial={{ opacity: 0, x: -15 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: (hasManuallySelected ? 0.2 : 1.7) + 0.3 }}
                                                    >
                                                        <div className="mt-0.5 text-[#222222]">
                                                            <Tag size={24} strokeWidth={1.5} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-[15px] font-semibold text-[#222222] leading-tight mb-0.5">
                                                                {t({
                                                                    en: `Starting from 99 MAD`,
                                                                    fr: `À partir de 99 MAD`,
                                                                    ar: `ابتداءً من 99 درهم`
                                                                })}
                                                            </h4>
                                                            <p className="text-[14px] text-[#717171] leading-tight">
                                                                {t({ en: 'Transparent and fair pricing.', fr: 'Des prix transparents et justes.', ar: 'أسعار شفافة وعادلة.' })}
                                                            </p>
                                                        </div>
                                                    </motion.div>

                                                    {/* Row 3: Safer than random */}
                                                    <motion.div
                                                        className="flex items-start gap-4"
                                                        initial={{ opacity: 0, x: -15 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: (hasManuallySelected ? 0.2 : 1.7) + 0.4 }}
                                                    >
                                                        <div className="mt-0.5 text-[#222222]">
                                                            <ShieldCheck size={24} strokeWidth={1.5} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="text-[15px] font-semibold text-[#222222] leading-tight mb-0.5">
                                                                {t({ en: 'Safer than a random number', fr: 'Plus sûr qu\'un numéro au hasard', ar: 'أكثر أمانًا من رقم عشوائي' })}
                                                            </h4>
                                                            <p className="text-[14px] text-[#717171] leading-tight">
                                                                {t({ en: 'Verified pros with reviews.', fr: 'Pros vérifiés avec avis clients.', ar: 'محترفون معتمدون مع تقييمات.' })}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            )}

                            {/* Horizontal Auto-scrolling Client Reviews Section */}
                            <ReviewsScrollingSection />
                        </div>
                    </motion.div>
                </AnimatePresence>
            </motion.div>

            {/* Premium Onboarding Overlay (Absolute, top level) */}
            <AnimatePresence>
                {showOnboarding && (
                    <ClientOnboarding
                        onComplete={() => {
                            onOnboardingComplete();
                            const alreadyShown = safeStorage.getItem('bricoler_upsell_shown');
                            if (!alreadyShown) {
                                setTimeout(() => setShowBricolerUpsell(true), 900);
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Promo banners hidden as per request */}

        </div>
    );
};

export default ClientHome;
