"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import radarAnimation from '../../../public/Lottifiles Animation/Radar.json';
import { useLanguage } from '@/context/LanguageContext';
import confetti from 'canvas-confetti';
import OrderCard, { OrderDetails } from '@/features/orders/components/OrderCard';
import WeekCalendar from '@/features/calendar/components/WeekCalendar';
import ProfileView from '@/features/provider/components/ProfileView';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import ProviderOrdersView from '@/features/orders/components/ProviderOrdersView';
import PromoteYourselfView from '@/features/provider/components/PromoteYourselfView';
import PromocodesView from '@/features/client/components/PromocodesView';
import { isToday, isThisWeek, parseISO, startOfDay, addDays, format } from 'date-fns';
import { getAllServices, getServiceById, getServiceVector, getSubServiceName } from '@/config/services_config';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import {
    Menu,
    User,
    Briefcase,
    Calendar,
    MapPin,
    TrendingUp,
    Hammer,
    Package,
    Trash2,
    Droplets,
    Lightbulb,
    PenTool,
    Truck,
    Wrench,
    Monitor,
    Leaf,
    Utensils,
    Soup,
    Baby,
    HeartPulse,
    Car,
    Key,
    PackageCheck,
    Plane,
    Navigation,
    Map as MapIcon,
    X,
    Settings,
    Wallet,
    Globe,
    HelpCircle,
    Users,
    Plus,
    MessageSquare,
    Star,
    Zap,
    Clock,
    CheckCircle2,
    Search,
    Send,
    Languages,
    BookOpen,
    Bell,
    ChevronDown,
    CreditCard,
    Check,
    Copy,
    Upload,
    Home,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Trophy,
    Mail,
    Banknote,
    Info,
    Tag,
    Gift,
    Eye,
    Image,
    MessageCircle
} from 'lucide-react';
import { WhatsAppBrandIcon } from '@/components/shared/WhatsAppIcon';
import { cn } from '@/lib/utils';
import { auth, db } from '@/lib/firebase';
import { formatJobDate, formatJobPrice } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import {
    signInWithPopup,
    GoogleAuthProvider,
    updateProfile,
    onAuthStateChanged,
    User as FirebaseUser
} from 'firebase/auth';
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    addDoc,
    limit,
    getDocs,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    arrayUnion,
    serverTimestamp,
    Timestamp,
    increment
} from 'firebase/firestore';
import { MOROCCAN_CITIES, MOROCCAN_CITIES_AREAS, SERVICE_TIER_RATES } from '@/config/moroccan_areas';
import SplashScreen from '@/components/layout/SplashScreen';
import LanguagePreferencePopup from '@/features/onboarding/components/LanguagePreferencePopup';

// --- Types & Interfaces ---

interface UserData {
    uid: string;
    email: string | null;
    name: string | null;
    whatsappNumber?: string;
    isProvider: boolean;
    services: string[] | { serviceId: string; serviceName: string; subServices: string[] }[];
    city: string;
    nidDetails?: any;

    rating?: number;
    completedJobs?: number;
    isActive?: boolean;
    workAreas?: string[];
    calendarSlots?: Record<string, { from: string; to: string }[]>;
    photoURL?: string; // Added photoURL to UserData
    avatar?: string;
    profilePhotoURL?: string;
    googlePhotoURL?: string;
}

export interface Job {
    id: string;
    clientName: string;
    clientAvatar: string;
    craft: string;
    title: string;
    price: string | number;
    rating: number;
    description: string;
    timestamp: string;
    date: string;
    image?: string;
    city: string;
    duration?: string;
    createdAt?: any;
    offers?: any[];
    clientId?: string;
    images?: string[];
    serviceId?: string;
    subService?: string;
    subServiceDisplayName?: string;
    time?: string;
    status: string;
    basePrice?: number | string;
    area?: string;
    clientWhatsApp?: string;
}

interface ServiceCategory {
    id: string;
    name: { en: string; fr: string; ar?: string };
    icon: any;
}

type MobileJobsStatus = 'new' | 'waiting' | 'programmed' | 'done' | 'delivered';

interface MobileJobsViewItem {
    id: string;
    kind: 'market' | 'accepted';
    status: MobileJobsStatus;
    statusLabel: string;
    clientName: string;
    clientAvatar?: string;
    clientRating?: number;
    clientReviewCount?: number;
    city: string;
    service: string;
    subService: string;
    dateLabel: string;
    timeLabel: string;
    priceLabel: string;
    image: string;
    description?: string;
    images?: string[];
    rawJob?: Job;
    rawAccepted?: OrderDetails;
    isUrgent?: boolean;
    clientWhatsApp?: string;
}

// --- Constants & Mock Data ---

const SERVICE_CATEGORIES: ServiceCategory[] = [
    { id: 'handyman', name: { en: 'Handyman', fr: 'Bricoleur', ar: 'إصلاحات منزلية' }, icon: Hammer },
    { id: 'furniture_assembly', name: { en: 'Furniture assembly', fr: 'Montage meubles', ar: 'تركيب الأثاث' }, icon: Package },
    { id: 'cleaning', name: { en: 'Cleaning', fr: 'Nettoyage', ar: 'تنظيف' }, icon: Trash2 },
    { id: 'plumbing', name: { en: 'Plumbing', fr: 'Plomberie', ar: 'سباكة' }, icon: Droplets },
    { id: 'electricity', name: { en: 'Electricity', fr: 'Électricité', ar: 'كهرباء' }, icon: Lightbulb },
    { id: 'painting', name: { en: 'Painting', fr: 'Peinture', ar: 'صباغة' }, icon: PenTool },
    { id: 'moving', name: { en: 'Moving', fr: 'Déménagement', ar: 'مساعدة في النقل' }, icon: Truck },
    { id: 'appliance_installation', name: { en: 'Appliances', fr: 'Électroménagers', ar: 'الأجهزة المنزلية' }, icon: Wrench },
    { id: 'mounting', name: { en: 'Mounting', fr: 'Montage', ar: 'تثبيت وتوريد' }, icon: Monitor },
    { id: 'gardening', name: { en: 'Gardening', fr: 'Jardinage', ar: 'بستنة' }, icon: Leaf },
    { id: 'cooking', name: { en: 'Cooking', fr: 'Cuisine', ar: 'طبخ' }, icon: Utensils },
    { id: 'meal_prep', name: { en: 'Meal prep', fr: 'Préparation repas', ar: 'تحضير الطعام' }, icon: Soup },
    { id: 'babysitting', name: { en: 'Babysitting', fr: 'Garde d\'enfants', ar: 'جليسة أطفال' }, icon: Baby },
    { id: 'elderly_care', name: { en: 'Elderly care', fr: 'Maintien domicile', ar: 'رعاية المسنين' }, icon: HeartPulse },
    { id: 'driver', name: { en: 'Driver', fr: 'Chauffeur', ar: 'سائق' }, icon: Car },
    { id: 'car_rental', name: { en: 'Car rental', fr: 'Location voiture', ar: 'كراء السيارات' }, icon: Key },
    { id: 'courier', name: { en: 'Courier', fr: 'Coursier', ar: 'توصيل' }, icon: PackageCheck },
    { id: 'airport', name: { en: 'Airport', fr: 'Aéroport', ar: 'النقل من المطار' }, icon: Plane },
    { id: 'transport_city', name: { en: 'City transport', fr: 'Transport urbain', ar: 'نقل حضري' }, icon: Navigation },
    { id: 'transport_intercity', name: { en: 'Intercity', fr: 'Interurbain', ar: 'نقل بين المدن' }, icon: MapIcon },
    { id: 'private_driver', name: { en: 'Private Driver', fr: 'Chauffeur Privé', ar: 'سائق خاص' }, icon: Car },
    { id: 'learn_arabic', name: { en: 'Learn Arabic', fr: 'Apprendre l’Arabe', ar: 'تعلم العربية' }, icon: Languages },
    { id: 'tour_guide', name: { en: 'Tour Guide', fr: 'Guide Touristique', ar: 'مرشد سياحي' }, icon: MapIcon },
];

// --- Helper Functions ---
const normalizeServiceId = (input: any): string => {
    if (!input || typeof input !== 'string') return 'general';
    const lowerInput = input.toLowerCase().trim();
    if (!lowerInput) return 'general';

    const exactMatch = SERVICE_CATEGORIES.find(s => s.id && s.id.toLowerCase() === lowerInput);
    if (exactMatch) return exactMatch.id;

    const nameMatch = SERVICE_CATEGORIES.find(s => s.name.en && s.name.en.toLowerCase() === lowerInput);
    if (nameMatch) return nameMatch.id;

    const keyMatch = SERVICE_CATEGORIES.find(s => s.id && (lowerInput.includes(s.id.toLowerCase()) || s.id.toLowerCase().includes(lowerInput)));
    if (keyMatch) return keyMatch.id;

    return lowerInput;
};

const getFallbackJobCardImage = (serviceName: string, craft?: string): string => {
    const source = `${serviceName} ${craft || ''}`.toLowerCase();

    if (source.includes('pool') && source.includes('clean')) return '/Images/Job Cards Images/Pool%20Cleaning_job_card.webp';
    if (source.includes('paint')) return '/Images/Job Cards Images/Painting_job_card.webp';
    if (source.includes('plumb')) return '/Images/Job Cards Images/Plumbing_job_card.webp';
    if (source.includes('mov')) return '/Images/Job Cards Images/Moving%20Help_job_card.webp';
    if (source.includes('baby')) return '/Images/Job Cards Images/Babysetting_job_card.webp';
    if (source.includes('furniture') || source.includes('assembly')) return '/Images/Job Cards Images/Furniture_Assembly_job_card.webp';
    if (source.includes('garden')) return '/Images/Job Cards Images/Gardening_job_card.webp';
    if (source.includes('clean')) return '/Images/Job Cards Images/Cleaning_job_card.webp';
    if (source.includes('electr')) return '/Images/Job Cards Images/Electricity_job_card.webp';

    return '/Images/Job Cards Images/Handyman_job_card.webp';
};

// --- Main Component ---

const TIME_SLOTS = [
    "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
    "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"
];

const AVAILABILITY_SLOTS = {
    morning: ["08:00", "09:00", "10:00", "11:00", "12:00"],
    afternoon: ["13:00", "14:00", "15:00", "16:00", "17:00"],
    evening: ["18:00", "19:00", "20:00", "21:00"]
};

export default function ProviderPage() {
    // 1. Data State & Hooks
    const { t, setLanguage } = useLanguage();
    const [showLanguagePopup, setShowLanguagePopup] = useState(false);
    const { showToast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [activeNav, setActiveNav] = useState<'jobs' | 'calendar' | 'performance' | 'profile' | 'messages' | 'services'>('calendar');
    const [ordersActiveTab, setOrdersActiveTab] = useState<'activity' | 'availability'>('activity');
    const [messageFilter, setMessageFilter] = useState<'all' | 'unread'>('all');
    const [providerCity, setProviderCity] = useState<string>('');
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
    const [acceptedJobs, setAcceptedJobs] = useState<OrderDetails[]>([]);
    const [dismissedJobIds, setDismissedJobIds] = useState<string[]>([]);
    const [horizontalSelectedDate, setHorizontalSelectedDate] = useState<Date>(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });

    // 2. Refs
    const notifiedMessageIds = useRef<Set<string>>(new Set());
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const prevJobsCountRef = useRef<number>(0);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const providerHeaderRef = useRef<HTMLElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const cityInputRef = useRef<HTMLSelectElement>(null);
    const whatsappInputRef = useRef<HTMLInputElement>(null);
    const performanceScrollRef = useRef<HTMLDivElement>(null);

    // 3. UI Logic State
    const [showNewJobPopup, setShowNewJobPopup] = useState(false);
    const [latestJob, setLatestJob] = useState<any>(null);
    const [activeCraftFilter, setActiveCraftFilter] = useState<string>('all');
    const [pendingJobsCount, setPendingJobsCount] = useState(0);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [showNotificationsPage, setShowNotificationsPage] = useState(false);
    const [showPromotePage, setShowPromotePage] = useState(false);
    const [showPromocodesPage, setShowPromocodesPage] = useState(false);
    const [bricolerNotifications, setBricolerNotifications] = useState<any[]>([]);
    const [selectedMonthDt, setSelectedMonthDt] = useState(new Date());
    const [showNIDModal, setShowNIDModal] = useState(false);
    const [pendingJob, setPendingJob] = useState<Job | null>(null);
    const [whatsappInput, setWhatsappInput] = useState('');
    const [showCounterModal, setShowCounterModal] = useState(false);
    const [counterJob, setCounterJob] = useState<Job | null>(null);
    const [counterPrice, setCounterPrice] = useState('');
    const [counterComment, setCounterComment] = useState('');
    const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewingProviderId, setViewingProviderId] = useState<string | null>(null);
    const [providerDetails, setProviderDetails] = useState<any>(null);
    const [activeCounterOffer, setActiveCounterOffer] = useState<{ jobId: string, bricolerId: string, oldPrice: number } | null>(null);
    const [counterInputPrice, setCounterInputPrice] = useState("");
    const [selectedChat, setSelectedChat] = useState<OrderDetails | null>(null);
    const [chatMessage, setChatMessage] = useState('');
    const [showCashOutModal, setShowCashOutModal] = useState(false);
    const [cashOutMethod, setCashOutMethod] = useState<'bank' | 'wafacash' | 'barid'>('bank');
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [providerHeaderHeight, setProviderHeaderHeight] = useState(0);
    const [mobileJobsStatus, setMobileJobsStatus] = useState<MobileJobsStatus>('new');
    const isMobileLayout = useIsMobileViewport(1024, 'lt');
    const [exitingCard, setExitingCard] = useState<{ id: string; direction: 'left' | 'right' } | null>(null);
    const [showRedistributeModal, setShowRedistributeModal] = useState(false);
    const [redistributeJob, setRedistributeJob] = useState<OrderDetails | null>(null);
    const [redistributeReason, setRedistributeReason] = useState('');
    const [isRedistributing, setIsRedistributing] = useState(false);
    const [showRateClientModal, setShowRateClientModal] = useState(false);
    const [rateClientJob, setRateClientJob] = useState<OrderDetails | null>(null);
    const [clientRating, setClientRating] = useState(0);
    const [clientHover, setClientHover] = useState(0);
    const [clientRatingComment, setClientRatingComment] = useState('');
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);
    const [isClientRatedLocally, setIsClientRatedLocally] = useState<string[]>([]);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [viewingJobDetails, setViewingJobDetails] = useState<MobileJobsViewItem | null>(null);
    const [performanceDetail, setPerformanceDetail] = useState<'none' | 'financial' | 'operational' | 'reputation' | 'marketing' | 'growth' | 'tips-profile' | 'tips-pricing' | 'tips-stars' | 'tips-visibility'>('none');
    const [tempSelectedServices, setTempSelectedServices] = useState<string[]>([]);
    const [dailySlots, setDailySlots] = useState<{ from: string, to: string }[]>([]);
    const [isSavingSlots, setIsSavingSlots] = useState(false);
    const [showAddServiceModal, setShowAddServiceModal] = useState(false);
    const [newServiceData, setNewServiceData] = useState<{ id: string, rate: number, pitch: string }>({ id: '', rate: 100, pitch: '' });
    const [selectedWorkAreas, setSelectedWorkAreas] = useState<string[]>([]);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isEditingSlots, setIsEditingSlots] = useState(false);
    const [settlementReceipt, setSettlementReceipt] = useState<string | null>(null);
    const [isSubmittingSettlement, setIsSubmittingSettlement] = useState(false);
    const [settlementAmount, setSettlementAmount] = useState<number>(0);
    const [cityDoneJobs, setCityDoneJobs] = useState<{ craft: string }[]>([]);

    // --- Helpers ---
    const getJobDateTime = useCallback((rawDate: string) => {
        if (!rawDate) return { dateLabel: '', timeLabel: '' };
        if (rawDate.includes(' at ')) {
            const [d, time] = rawDate.split(' at ');
            return { dateLabel: formatJobDate(d), timeLabel: time || '' };
        }
        return { dateLabel: formatJobDate(rawDate), timeLabel: '' };
    }, []);

    const parseDateTime = useCallback((rawDate?: string, rawTime?: string, createdAt?: any) => {
        if (createdAt?.seconds) return createdAt.seconds * 1000;
        if (!rawDate) return 0;

        let datePart = rawDate;
        let timePart = rawTime || '';
        if (rawDate.includes(' at ')) {
            const [d, t] = rawDate.split(' at ');
            datePart = d;
            timePart = timePart || t || '';
        }

        const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(datePart)
            ? `${datePart}T${timePart || '00:00'}`
            : `${datePart}${timePart ? ` ${timePart}` : ''}`;
        const parsed = Date.parse(isoCandidate);
        return Number.isNaN(parsed) ? 0 : parsed;
    }, []);

    // --- Filtered & Sorted Lists ---
    const filteredJobs = useMemo(() => availableJobs.filter((job) => {
        const matchCity = !providerCity || job.city.toLowerCase().includes(providerCity.toLowerCase());
        const matchCraft = activeCraftFilter === 'all' || job.serviceId === activeCraftFilter || job.craft === activeCraftFilter;
        return matchCity && matchCraft;
    }), [availableJobs, providerCity, activeCraftFilter]);

    const marketJobsSorted = useMemo(() => [...filteredJobs].sort((a, b) => parseDateTime(b.date, '', b.createdAt) - parseDateTime(a.date, '', a.createdAt)), [filteredJobs, parseDateTime]);
    const marketJobsOpen = useMemo(() => marketJobsSorted.filter((job) => !dismissedJobIds.includes(job.id)), [marketJobsSorted, dismissedJobIds]);

    const newMarketJobs = useMemo(() => marketJobsOpen.filter((job) => {
        const myOffer = (job.offers || []).find((offer: any) => offer.bricolerId === user?.uid);
        if (!myOffer) return true;
        const lastOffer = [...(job.offers || [])].pop();
        const isClientAction = job.status === 'negotiating' && lastOffer && lastOffer.bricolerId !== user?.uid;
        return isClientAction;
    }), [marketJobsOpen, user]);

    const waitingMarketJobs = useMemo(() => marketJobsOpen.filter((job) => {
        const myOffer = (job.offers || []).find((offer: any) => offer.bricolerId === user?.uid);
        if (!myOffer) return false;
        const lastOffer = [...(job.offers || [])].pop();
        const isClientAction = job.status === 'negotiating' && lastOffer && lastOffer.bricolerId !== user?.uid;
        return !isClientAction;
    }), [marketJobsOpen, user]);

    const acceptedJobsSorted = useMemo(() => [...acceptedJobs].sort((a, b) => parseDateTime(a.date, a.time) - parseDateTime(b.date, b.time)), [acceptedJobs, parseDateTime]);
    const programmedStatuses = useMemo(() => new Set(['confirmed', 'in_progress', 'accepted', 'pending', 'programmed']), []);
    const programmedAcceptedJobs = useMemo(() => acceptedJobsSorted.filter((job) => programmedStatuses.has(job.status || '')), [acceptedJobsSorted, programmedStatuses]);
    const doneAcceptedJobs = useMemo(() => acceptedJobsSorted.filter((job) => job.status === 'done' || job.status === 'delivered'), [acceptedJobsSorted]);

    // Calculate days which have programmed or accepted jobs
    const daysWithProgrammedJobs = useMemo(() => {
        const datesSet = new Set<number>();
        programmedAcceptedJobs.forEach(rawJob => {
            const dateInfo = getJobDateTime(rawJob.time ? `${rawJob.date} at ${rawJob.time}` : rawJob.date);
            const dStr = dateInfo.dateLabel;
            if (!dStr) return;

            if (dStr.includes(' - ')) {
                const [sStr, eStr] = dStr.split(' - ');
                const s = new Date(sStr);
                const e = new Date(eStr);
                s.setFullYear(new Date().getFullYear()); e.setFullYear(new Date().getFullYear());
                s.setHours(0, 0, 0, 0); e.setHours(0, 0, 0, 0);
                for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
                    datesSet.add(new Date(d).getTime());
                }
            } else {
                const p = new Date(dStr);
                p.setFullYear(new Date().getFullYear());
                p.setHours(0, 0, 0, 0);
                datesSet.add(p.getTime());
            }
        });
        return datesSet;
    }, [programmedAcceptedJobs, getJobDateTime]);

    // --- Combined Mapper & Sections ---
    const toMobileItem = useCallback((raw: any, kind: 'market' | 'accepted'): MobileJobsViewItem => {
        const isMarket = kind === 'market';
        const dateInfo = getJobDateTime(isMarket ? raw.date : (raw.time ? `${raw.date} at ${raw.time}` : raw.date));

        return {
            id: isMarket ? raw.id : raw.id!,
            kind,
            status: isMarket ? (raw.offers?.some((o: any) => o.bricolerId === user?.uid) ? 'waiting' : 'new') : (['done', 'delivered'].includes(raw.status) ? raw.status as MobileJobsStatus : 'programmed'),
            statusLabel: isMarket ? (raw.offers?.some((o: any) => o.bricolerId === user?.uid) ? t({ en: 'Waiting Client', fr: 'En attente du client', ar: 'في انتظار العميل' }) : t({ en: 'New Mission', fr: 'Nouvelle mission', ar: 'مهمة جديدة' })) : (['done', 'delivered'].includes(raw.status) ? t({ en: 'Completed', fr: 'Terminé', ar: 'مكتمل' }) : t({ en: 'Scheduled', fr: 'Programmé', ar: 'مبرمج' })),
            clientName: raw.clientName || 'Client',
            clientAvatar: raw.clientAvatar,
            city: isMarket ? raw.city : (raw.city || raw.location || ''),
            service: isMarket ? raw.title : (raw.service || ''),
            subService: isMarket ? (raw.subService || '') : (raw.subServiceDisplayName || ''),
            dateLabel: dateInfo.dateLabel,
            timeLabel: dateInfo.timeLabel,
            description: isMarket ? raw.description : (raw.description || raw.comment || ''),
            clientRating: isMarket ? (raw.clientRating || raw.rating || 5.0) : (raw.clientRating || raw.rating || 5.0),
            clientReviewCount: isMarket ? (raw.clientReviewCount || 0) : (raw.clientReviewCount || 0),
            priceLabel: isMarket ? formatJobPrice(raw.basePrice || raw.price) : String(raw.basePrice || raw.price),
            image: raw.image || '',
            images: raw.images || [],
            rawJob: isMarket ? raw : undefined,
            rawAccepted: !isMarket ? raw : undefined,
            clientWhatsApp: raw.clientWhatsApp || raw.clientPhone || ""
        };
    }, [user, formatJobPrice, t]);

    const jobsBySection = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const todayStr = now.toISOString().split('T')[0];

        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);

        const pending = [
            ...newMarketJobs.map(j => toMobileItem(j, 'market')),
            ...waitingMarketJobs.map(j => toMobileItem(j, 'market'))
        ];

        const accepted = programmedAcceptedJobs.map(j => {
            const item = toMobileItem(j, 'accepted');
            const jDateTs = parseDateTime(j.date, j.time);
            const jDate = new Date(jDateTs);
            jDate.setHours(0, 0, 0, 0);
            const jDateStr = jDate.toISOString().split('T')[0];

            let section: 'today' | 'week' | 'later' = 'later';
            if (jDateStr === todayStr) section = 'today';
            else if (jDateTs <= endOfWeek.getTime() && jDateTs > now.getTime()) section = 'week';

            return { ...item, section };
        });

        const done = doneAcceptedJobs.map(j => toMobileItem(j, 'accepted'));

        return {
            pending,
            today: (accepted.filter(j => (j as any).section === 'today') as MobileJobsViewItem[]),
            week: (accepted.filter(j => (j as any).section === 'week') as MobileJobsViewItem[]),
            done
        };
    }, [newMarketJobs, waitingMarketJobs, programmedAcceptedJobs, doneAcceptedJobs, toMobileItem]);

    useEffect(() => {
        if (showProfileModal) {
            setTempSelectedServices(selectedServices);
        }
    }, [showProfileModal, selectedServices]);

    const triggerCardExit = useCallback(
        (jobId: string, direction: 'left' | 'right', callback?: () => void) => {
            setExitingCard({ id: jobId, direction });
            setTimeout(() => {
                setExitingCard(null);
                callback?.();
            }, 380);
        },
        []
    );

    const handleSaveSlotsManual = async (dateKey: string, slots: any[]) => {
        if (!user) return;
        setIsSavingSlots(true);
        try {
            const bricolerRef = doc(db, 'bricolers', user.uid);
            const snap = await getDoc(bricolerRef);
            const currentSlots = (snap.data())?.calendarSlots || {};
            await updateDoc(bricolerRef, {
                calendarSlots: { ...currentSlots, [dateKey]: slots }
            });
            showToast({
                variant: 'success',
                title: t({ en: 'Success', fr: 'Succès' }),
                description: t({ en: 'Availability updated!', fr: 'Disponibilité mise à jour !' })
            });
        } catch (err) {
            console.error(err);
        } finally {
            setIsSavingSlots(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!auth.currentUser) return;
        setIsSavingProfile(true);

        const name = nameInputRef.current?.value || '';
        const city = cityInputRef.current?.value || '';
        const whatsapp = whatsappInputRef.current?.value || '';

        try {
            const updates: Partial<UserData> = {
                name,
                city,
                whatsappNumber: whatsapp,
                workAreas: selectedWorkAreas,
                services: tempSelectedServices
            };

            await updateDoc(doc(db, 'bricolers', auth.currentUser.uid), updates);

            showToast({
                variant: 'success',
                title: t({ en: 'Profile updated!', fr: 'Profil mis à jour !' }),
                description: t({ en: 'Your profile changes have been saved.', fr: 'Vos modifications ont été enregistrées.' })
            });
            setShowProfileModal(false);
        } catch (error) {
            console.error('Error saving profile:', error);
            showToast({ variant: 'error', title: t({ en: 'Error', fr: 'Erreur' }), description: t({ en: 'Failed to update profile', fr: 'Échec de la mise à jour du profil' }) });
        } finally {
            setIsSavingProfile(false);
        }
    };

    // Chat Logic for Provider
    useEffect(() => {
        if (!selectedChat?.id) {
            setChatMessages([]);
            return;
        }

        const messagesRef = collection(db, 'jobs', selectedChat.id, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setChatMessages(msgs);
        }, (error) => {
            console.error("Provider chat listener error:", error);
            if (error.code === 'permission-denied') {
                setChatMessages([]);
            }
        });

        return () => unsubscribe();
    }, [selectedChat?.id]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    const handleSubmitChatMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatMessage.trim() || !selectedChat?.id || !auth.currentUser) return;

        try {
            const messagesRef = collection(db, 'jobs', selectedChat.id, 'messages');
            await addDoc(messagesRef, {
                text: chatMessage,
                senderId: auth.currentUser.uid,
                senderName: userData?.name || 'Bricoler',
                timestamp: serverTimestamp()
            });

            // Notify client
            const selectedChatAny = selectedChat as any;
            if (selectedChat.clientId || selectedChatAny.rawJob?.clientId) {
                const clientId = selectedChat.clientId || selectedChatAny.rawJob?.clientId;
                await addDoc(collection(db, 'client_notifications'), {
                    clientId: clientId,
                    type: 'new_message',
                    jobId: selectedChat.id,
                    serviceName: selectedChat.service || 'Service',
                    senderName: userData?.name || 'Bricoler',
                    text: chatMessage.length > 50 ? `${chatMessage.substring(0, 50)}...` : chatMessage,
                    read: false,
                    timestamp: serverTimestamp()
                });
            }

            setChatMessage("");
        } catch (err) {
            console.error("Error sending message:", err);
        }
    };


    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const prevBodyBg = document.body.style.backgroundColor;
        const prevHtmlBg = document.documentElement.style.backgroundColor;
        document.body.style.backgroundColor = '#F3F3F3';
        document.documentElement.style.backgroundColor = '#F3F3F3';
        return () => {
            document.body.style.backgroundColor = prevBodyBg;
            document.documentElement.style.backgroundColor = prevHtmlBg;
        };
    }, []);

    useEffect(() => {
        const updateHeaderHeight = () => {
            if (providerHeaderRef.current) {
                setProviderHeaderHeight(Math.round(providerHeaderRef.current.getBoundingClientRect().height));
            }
        };
        updateHeaderHeight();
        window.addEventListener('resize', updateHeaderHeight);
        return () => window.removeEventListener('resize', updateHeaderHeight);
    }, []);

    // Notification Listener for Provider Decisions
    useEffect(() => {
        if (!user) return;
        console.log("🔔 Starting Bricoler notification listener for:", user.uid);

        // Fetch all notifications to show in list but handle toasts for unread
        const q = query(
            collection(db, 'bricoler_notifications'),
            where('bricolerId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            notifications.sort((a: any, b: any) => {
                const tA = a.timestamp?.seconds || 0;
                const tB = b.timestamp?.seconds || 0;
                return tB - tA;
            });
            setBricolerNotifications(notifications.slice(0, 30));

            snapshot.docChanges().forEach(async (change) => {
                // We listen for 'added' to show new toasts
                if (change.type === 'added') {
                    const noti = change.doc.data();
                    if (noti.read === false) {
                        console.log("📨 New Bricoler notification received:", noti.type, noti);

                        let title = "";
                        let description = "";
                        let variant: 'success' | 'error' | 'info' = 'info';

                        if (noti.type === 'offer_accepted') {
                            title = t({ en: "Offer Accepted! 🎉", fr: "Offre Acceptée ! 🎉", ar: "تم قبول العرض! 🎉" });
                            description = t({ en: `Your offer for ${noti.serviceName} was accepted. Check your confirmed jobs.`, fr: `Votre offre pour ${noti.serviceName} a été acceptée. Consultez vos missions confirmées.`, ar: `تم قبول عرضك لـ ${noti.serviceName}. تحقق من مهامك المؤكدة.` });
                            variant = 'success';
                            confetti({
                                particleCount: 150,
                                spread: 70,
                                origin: { y: 0.6 }
                            });
                        } else if (noti.type === 'offer_declined') {
                            title = t({ en: "Offer Declined", fr: "Offre Déclinée", ar: "تم رفض العرض" });
                            description = t({ en: `The client declined your offer for ${noti.serviceName}.`, fr: `Le client a décliné votre offre pour ${noti.serviceName}.`, ar: `رفض العميل عرضك لـ ${noti.serviceName}.` });
                            variant = 'error';
                        } else if (noti.type === 'counter_offer_received') {
                            title = t({ en: "New Counter Offer 💰", fr: "Nouvelle Contre-offre 💰", ar: "عرض مقابل جديد 💰" });
                            description = t({ en: `Client sent a counter offer of ${noti.price} MAD for ${noti.serviceName || 'a job'}.`, fr: `Le client a envoyé une contre-offre de ${noti.price} MAD pour ${noti.serviceName || 'une mission'}.`, ar: `أرسل العميل عرضاً مقابلاً بقيمة ${noti.price} درهم لـ ${noti.serviceName || 'مهمة'}.` });
                            variant = 'info';
                        }

                        showToast({
                            variant,
                            title,
                            description
                        });

                        // Mark as read after a slight delay to ensure the animation triggers
                        setTimeout(async () => {
                            try {
                                await updateDoc(change.doc.ref, { read: true });
                            } catch (err) {
                                console.error("Error marking notification as read:", err);
                            }
                        }, 1000);
                    }
                }
            });
        }, (err) => {
            console.error("❌ Notification Listener Error:", err);
            if (err.code === 'permission-denied') {
                console.warn("Please ensure firestore.rules are deployed with 'bricoler_notifications' match block.");
            }
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user || acceptedJobs.length === 0) return;

        const checkAutoDeliver = async () => {
            const now = new Date();
            const programmedJobs = acceptedJobs.filter(j =>
                ((j.status as any) === 'confirmed' || (j.status as any) === 'programmed' || (j.status as any) === 'accepted') &&
                j.date
            );

            for (const job of programmedJobs) {
                try {
                    // estimatedDuration might be on the job or fallback to 2 hours
                    const durationStr = job.duration || '2';
                    const durationHours = parseFloat(durationStr.replace(/[^0-9.]/g, '')) || 2;

                    const startTs = parseDateTime(job.date, job.time);
                    if (!startTs) continue;

                    const endTs = startTs + (durationHours * 60 * 60 * 1000);

                    if (now.getTime() > endTs) {
                        console.log(`[Auto-Deliver] Job ${job.id} has passed duration (${durationHours}h). Marking as delivered.`);
                        await updateDoc(doc(db, 'jobs', job.id!), { status: 'delivered' });
                        // Also update accepted_jobs collection if it's separate
                        await updateDoc(doc(db, 'accepted_jobs', job.id!), { status: 'delivered' });
                    }
                } catch (err) {
                    console.error("Auto-deliver error for job:", job.id, err);
                }
            }
        };

        const interval = setInterval(checkAutoDeliver, 30000); // Check every 30s
        checkAutoDeliver(); // Run once on mount/change

        return () => clearInterval(interval);
    }, [user, acceptedJobs, parseDateTime]);

    // City-wide done jobs for Demand Score calculation
    useEffect(() => {
        if (!providerCity) return;
        const q = query(
            collection(db, 'jobs'),
            where('city', '==', providerCity),
            where('status', '==', 'done')
        );
        const unsub = onSnapshot(q, (snap) => {
            const selYear = selectedMonthDt.getFullYear();
            const selMonth = selectedMonthDt.getMonth();
            const jobs = snap.docs.flatMap(d => {
                const data = d.data();
                const ts = data.confirmedAt?.seconds || data.createdAt?.seconds;
                if (!ts) return [];
                const dt = new Date(ts * 1000);
                if (dt.getFullYear() !== selYear || dt.getMonth() !== selMonth) return [];
                return [{ craft: normalizeServiceId(data.craft || data.service || '') }];
            });
            setCityDoneJobs(jobs);
        }, (err) => {
            if (err.code !== 'permission-denied') console.error('City demand listener error:', err);
        });
        return () => unsub();
    }, [providerCity, selectedMonthDt]);

    // Scroll to top when performance detail view changes
    useEffect(() => {
        if (performanceScrollRef.current) {
            performanceScrollRef.current.scrollTo(0, 0);
        }
    }, [performanceDetail]);

    // 2. Main Logic Effect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlServices = params.get('services');
        const urlCity = params.get('city');

        if (urlServices && urlCity) {
            const servicesList = urlServices.split(',').map(s => normalizeServiceId(s));
            setSelectedServices(servicesList);
            setProviderCity(urlCity);
        }

        let unsubscribeMarketplace: (() => void) | undefined;
        let unsubscribeMyJobs: (() => void) | undefined;
        let unsubscribeProfile: (() => void) | undefined;

        const startMarketplaceListener = () => {
            if (!auth.currentUser) return () => { };

            const q = query(
                collection(db, 'jobs'),
                where('offeredTo', 'array-contains', auth.currentUser.uid)
            );
            return onSnapshot(q, (snapshot) => {
                const fetchedJobs: Job[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();

                    if (!['new', 'negotiating'].includes(data.status)) return;

                    fetchedJobs.push({
                        id: doc.id,
                        clientName: data.clientName || 'Client',
                        clientAvatar: data.clientAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.clientId}`,
                        craft: normalizeServiceId(data.craft || data.service || 'general'),
                        title: data.service || data.title,
                        price: parseInt(data.price) || 0,
                        rating: data.rating || 0,
                        description: data.description || data.comment || t({ en: 'No details provided.', fr: 'Aucun détail fourni.', ar: 'لا توجد تفاصيل مقدمة.' }),
                        timestamp: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : t({ en: 'Just now', fr: 'À l’instant', ar: 'الآن' }),
                        date: data.date,
                        time: data.time || '',
                        subService: data.subService || '',
                        subServiceDisplayName: data.subServiceDisplayName || '',
                        city: data.city,
                        area: data.area || '',
                        offers: data.offers || [],
                        status: data.status,
                        image: data.images && data.images.length > 0 ? data.images[0] : undefined,
                        images: Array.isArray(data.images) ? data.images : [],
                        createdAt: data.createdAt,
                        clientId: data.clientId
                    } as any);
                });

                // Sort jobs in memory: newest first
                fetchedJobs.sort((a: any, b: any) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA;
                });

                setAvailableJobs(fetchedJobs);

                // New Job Detection
                const pendingJobs = fetchedJobs.filter((job: any) => job.status === 'new');
                if (pendingJobs.length > prevJobsCountRef.current && prevJobsCountRef.current > 0) {
                    const newJob = pendingJobs[0];
                    setLatestJob(newJob);
                    setShowNewJobPopup(true);

                    // Sound Effect (Mixkit placeholder)
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                    audio.play().catch(e => console.log("Audio play failed:", e));

                    // Auto-hide after 10 seconds
                    setTimeout(() => setShowNewJobPopup(false), 10000);
                }
                prevJobsCountRef.current = pendingJobs.length;
            }, (error) => {
                if (error.code === 'permission-denied') {
                    console.warn("Marketplace permissions missing. Check Firestore rules.", error);
                } else {
                    console.error("Marketplace listener error:", error);
                }
            });
        };


        const startMyJobsListener = (uid: string) => {
            const q = query(
                collection(db, 'jobs'),
                where('bricolerId', '==', uid)
            );
            return onSnapshot(q, (snapshot) => {
                const myJobs: OrderDetails[] = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    myJobs.push({
                        id: doc.id,
                        service: data.service,
                        subServiceDisplayName: data.subServiceDisplayName || data.subService || '',
                        location: data.city,
                        city: data.city,
                        area: data.area || '',
                        date: data.date,
                        time: data.time || "",
                        price: data.price,
                        status: data.status,
                        comment: data.comment,
                        rating: data.rating,
                        feedback: data.feedback,
                        bricolersCount: data.bricolersCount || 1,
                        images: Array.isArray(data.images) ? data.images : [],
                        craft: normalizeServiceId(data.craft || data.service || 'general'),
                        clientName: data.clientName || 'Client',
                        clientId: data.clientId,
                        clientAvatar: data.clientAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.clientId}`,
                        confirmedAt: data.confirmedAt,
                        description: data.description || data.comment || '',
                        providerConfirmed: data.providerConfirmed
                    });
                });
                setAcceptedJobs(myJobs);
            }, (error) => {
                if (error.code === 'permission-denied') {
                    console.warn("Private jobs permissions missing. Check Firestore rules.", error);
                } else {
                    console.error("My jobs listener error:", error);
                }
            });
        };

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            // Cleanup existing listeners on auth change
            if (unsubscribeMyJobs) {
                unsubscribeMyJobs();
                unsubscribeMyJobs = undefined;
            }
            if (unsubscribeMarketplace) {
                unsubscribeMarketplace();
                unsubscribeMarketplace = undefined;
            }
            if (unsubscribeProfile) {
                unsubscribeProfile();
                unsubscribeProfile = undefined;
            }

            // Marketplace is public (new jobs)
            unsubscribeMarketplace = startMarketplaceListener();

            if (firebaseUser) {
                // Start Private Listeners
                unsubscribeMyJobs = startMyJobsListener(firebaseUser.uid);

                const bricolerRef = doc(db, 'bricolers', firebaseUser.uid);
                unsubscribeProfile = onSnapshot(bricolerRef, (snap) => {
                    if (snap.exists()) {
                        const data = snap.data() as UserData;
                        setUserData(data);
                        if (data.services && data.services.length > 0) {
                            // Handle both old (string[]) and new (object[]) formats
                            const serviceIds = data.services.map(s => {
                                if (typeof s === 'string') {
                                    return normalizeServiceId(s);
                                } else {
                                    // Handle all formats: categoryId (new), serviceId (old-new), or fallback to names
                                    const val = (s as any).categoryId || (s as any).serviceId || (s as any).subServiceId;
                                    if (val) return val;
                                    return normalizeServiceId((s as any).categoryName || (s as any).serviceName || (s as any).subServiceName);
                                }
                            });
                            setSelectedServices(serviceIds);
                        }
                        if (snap.data().city) setProviderCity(snap.data().city);
                        setIsLoading(false);
                    } else {
                        // Initialize Profile
                        const normalizedServices = urlServices ? urlServices.split(',').map(s => normalizeServiceId(s)) : [];
                        const newData: UserData = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            name: firebaseUser.displayName,
                            isProvider: true,
                            services: normalizedServices,
                            city: urlCity || '',
                            photoURL: firebaseUser.photoURL || undefined, // Prioritize Firebase Auth photoURL on initial creation
                            profilePhotoURL: firebaseUser.photoURL || undefined,
                            googlePhotoURL: firebaseUser.photoURL || undefined,
                        };
                        setDoc(bricolerRef, newData).then(() => {
                            setUserData(newData);
                            setIsLoading(false);
                        });
                    }
                }, (err) => {
                    if (err.code === 'permission-denied') {
                        console.warn("Profile permissions missing. Check Firestore rules.", err);
                    } else {
                        console.error("Profile listener error:", err);
                    }
                    setIsLoading(false);
                });
            } else {
                setIsLoading(false);
                setUserData(null);
                setAcceptedJobs([]);
                if (!urlServices) {
                    setSelectedServices([]);
                    setProviderCity('');
                }
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeMarketplace) unsubscribeMarketplace();
            if (unsubscribeMyJobs) unsubscribeMyJobs();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, []);

    useEffect(() => {
        if (!isLoading) return;
        const watchdog = setTimeout(() => {
            console.warn("Provider loading watchdog released splash screen after timeout.");
            setIsLoading(false);
        }, 20000);
        return () => clearTimeout(watchdog);
    }, [isLoading]);

    // Message Sound Listener for Bricoler
    useEffect(() => {
        if (!user || acceptedJobs.length === 0) return;

        const unsubs: (() => void)[] = [];

        acceptedJobs.forEach(job => {
            if (!job.id) return;
            const jobId = job.id;
            const messagesRef = collection(db, 'jobs', jobId, 'messages');
            const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));

            const unsub = onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const msgId = change.doc.id;

                        // Only notify if sender is NOT the current user AND we haven't notified for this msgId yet
                        if (data.senderId !== user.uid && !notifiedMessageIds.current.has(msgId)) {
                            notifiedMessageIds.current.add(msgId);

                            // Play sound
                            try {
                                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                                audio.volume = 0.5;
                                audio.play().catch(e => console.warn("Audio play blocked:", e));
                            } catch (err) {
                                console.error("Error playing sound:", err);
                            }
                        }
                    }
                });
            });
            unsubs.push(unsub);
        });

        return () => unsubs.forEach(u => u());
    }, [user, acceptedJobs]);


    // Load slots when date changes
    useEffect(() => {
        if (!userData || !horizontalSelectedDate) return;
        const dateKey = horizontalSelectedDate.toISOString().split('T')[0];
        const slots = (userData as any).calendarSlots?.[dateKey] || [];
        setDailySlots(slots.length > 0 ? slots : [{ from: '08:30', to: '10:30' }]);
        setIsEditingSlots(false); // Default to compact view if programmed
    }, [horizontalSelectedDate, userData]);

    const handleSaveSlots = async () => {
        if (!user) return;
        setIsSavingSlots(true);
        try {
            const dateKey = horizontalSelectedDate.toISOString().split('T')[0];
            const bricolerRef = doc(db, 'bricolers', user.uid);

            const snap = await getDoc(bricolerRef);
            const currentData = snap.data() || {};
            const existingSlots = currentData.calendarSlots || {};

            await updateDoc(bricolerRef, {
                calendarSlots: {
                    ...existingSlots,
                    [dateKey]: dailySlots
                }
            });

            showToast({
                variant: 'success',
                title: t({ en: 'Success', fr: 'Succès' }),
                description: t({ en: 'Availability updated!', fr: 'Disponibilité mise à jour !' })
            });
            setIsEditingSlots(false);
        } catch (err) {
            console.error("Error saving slots:", err);
            showToast({
                variant: 'error',
                title: t({ en: 'Error', fr: 'Erreur', ar: 'خطأ' }),
                description: t({ en: 'Failed to save availability', fr: 'Échec de l’enregistrement de la disponibilité', ar: 'فشل في حفظ التوافر' })
            });
        } finally {
            setIsSavingSlots(false);
        }
    };

    // Auto-delivery logic: when estimated duration finishes, mark as done
    useEffect(() => {
        if (!user || programmedAcceptedJobs.length === 0) return;

        const checkInterval = setInterval(() => {
            const now = new Date();
            programmedAcceptedJobs.forEach(async (job) => {
                if (job.status === 'done') return;

                const startTs = parseDateTime(job.date, job.time);
                if (!startTs) return;

                // Get duration in hours from string like '2h-3h' or '2'
                const durStr = job.duration || '2';
                const hours = parseInt(durStr.split('-')[0]) || 2;
                const endTs = startTs + (hours * 3600 * 1000);

                if (now.getTime() > endTs) {
                    // Auto mark as done
                    try {
                        const jobRef = doc(db, 'jobs', job.id!);
                        const jobSnap = await getDoc(jobRef);
                        if (jobSnap.exists() && jobSnap.data().status !== 'done') {
                            await updateDoc(jobRef, {
                                status: 'done',
                                autoCompleted: true,
                                completedAt: serverTimestamp()
                            });

                            // Increment Bricoler jobs
                            if (job.bricolerId) {
                                const bricolerRef = doc(db, 'bricolers', job.bricolerId);
                                await updateDoc(bricolerRef, {
                                    completedJobs: increment(1)
                                }).catch(console.error);
                            }
                            console.log(`Auto-completed job ${job.id}`);
                        }
                    } catch (err) {
                        console.error(`Error auto-completing job ${job.id}:`, err);
                    }
                }
            });
        }, 60000); // Check every minute

        return () => clearInterval(checkInterval);
    }, [user, programmedAcceptedJobs, parseDateTime]);


    // 3. Logic Handlers
    const handleUpdateJob = async (id: string, updates: any) => {
        try {
            const jobRef = doc(db, 'jobs', id);

            // --- REFERRAL LOGIC START ---
            if (updates.status === 'done') {
                const jobSnap = await getDoc(jobRef);

                // 1. Process Bricoler Referral Reward (First Job Completion)
                if (auth.currentUser) {
                    try {
                        const providerRef = doc(db, 'users', auth.currentUser.uid);
                        const providerSnap = await getDoc(providerRef);
                        if (providerSnap.exists()) {
                            const pData = providerSnap.data();
                            if (pData.referredBricolerBy && !pData.bricolerRewardIssued) {
                                const pReferrerRef = doc(db, 'users', pData.referredBricolerBy);
                                await updateDoc(pReferrerRef, {
                                    bricolerReferralBalance: increment(15)
                                }).catch(console.error);
                                await updateDoc(providerRef, {
                                    bricolerRewardIssued: true
                                });
                            }
                        }
                    } catch (err) {
                        console.error("Error issuing bricoler referral reward:", err);
                    }
                }

                // 2. Process Client Referral Reward (First Job Delivered)
                if (jobSnap.exists()) {
                    const jobData = jobSnap.data();
                    const clientId = jobData.clientId;
                    if (clientId) {
                        const clientRef = doc(db, 'users', clientId);
                        const clientSnap = await getDoc(clientRef);
                        if (clientSnap.exists()) {
                            const clientData = clientSnap.data();
                            if (clientData.referredBy && !clientData.referralRewardIssued) {
                                // Issue reward to referrer
                                const referrerRef = doc(db, 'users', clientData.referredBy);
                                const referrerSnap = await getDoc(referrerRef);
                                if (referrerSnap.exists()) {
                                    await updateDoc(referrerRef, {
                                        referralBalance: increment(15)
                                    });
                                }
                                // Mark as issued
                                await updateDoc(clientRef, {
                                    referralRewardIssued: true
                                });
                            }
                        }
                    }
                }
            }
            // --- REFERRAL LOGIC END ---

            if (updates.status) {
                const jobSnap = await getDoc(jobRef);
                if (jobSnap.exists()) {
                    const jobData = jobSnap.data();

                    // Increment Bricoler jobs on status change to 'done' or 'delivered'
                    if ((updates.status === 'done' || updates.status === 'delivered') &&
                        jobData.status !== 'done' && jobData.status !== 'delivered' && jobData.status !== updates.status) {
                        if (jobData.bricolerId) {
                            const bricolerRef = doc(db, 'bricolers', jobData.bricolerId);
                            await updateDoc(bricolerRef, {
                                completedJobs: increment(1)
                            }).catch(console.error);
                        }
                    }

                    if (jobData.clientId) {
                        await addDoc(collection(db, 'client_notifications'), {
                            clientId: jobData.clientId,
                            type: 'job_status_update',
                            jobId: id,
                            serviceName: jobData.service || 'Service',
                            status: updates.status,
                            read: false,
                            timestamp: serverTimestamp()
                        });
                    }
                }
            }

            await updateDoc(jobRef, updates);
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
        } catch (error) {
            console.error('Error updating job:', error);
        }
    };

    const handleConfirmJob = async (id: string) => {
        try {
            const jobRef = doc(db, 'jobs', id);
            const jobSnap = await getDoc(jobRef);

            if (jobSnap.exists()) {
                const jobData = jobSnap.data();

                // Calculate response time
                let responseTimeMinutes: number | null = null;
                if (jobData.createdAt) {
                    const startMs = jobData.createdAt.toMillis ? jobData.createdAt.toMillis() : new Date(jobData.createdAt).getTime();
                    const diffMs = Date.now() - startMs;
                    responseTimeMinutes = Math.floor(diffMs / 60000);
                }

                await updateDoc(jobRef, {
                    providerConfirmed: true,
                    confirmedAt: serverTimestamp(),
                    responseTimeMinutes
                });

                // Update Bricoler metrics
                if (auth.currentUser && responseTimeMinutes !== null) {
                    const pRef = doc(db, 'bricolers', auth.currentUser.uid);
                    const pSnap = await getDoc(pRef);
                    if (pSnap.exists()) {
                        const pData = pSnap.data();
                        const currentAvg = pData.avgResponseTimeMinutes || 0;
                        const currentCount = pData.confirmedJobsCount || 0;
                        const newCount = currentCount + 1;
                        const newAvg = Math.round(((currentAvg * currentCount) + responseTimeMinutes) / newCount);

                        await updateDoc(pRef, {
                            avgResponseTimeMinutes: newAvg,
                            confirmedJobsCount: newCount
                        });
                    }
                }

                // Notify Client
                if (jobData.clientId) {
                    const bricolerName = userData?.name || auth.currentUser?.displayName || t({ en: 'The provider', fr: 'Le bricoleur', ar: 'المحترف' });
                    const { sendClientNotification } = await import('@/features/client/components/ClientNotificationsView');
                    await sendClientNotification({
                        clientId: jobData.clientId,
                        type: 'order_confirmed',
                        title: t({ en: 'Confirmed! (Bricoler)', fr: 'Confirmé ! (Bricoleur)', ar: 'تم التأكيد! (المحترف)' }),
                        body: t({
                            en: `${bricolerName} confirmed your order.`,
                            fr: `${bricolerName} a confirmé votre commande.`,
                            ar: `قام ${bricolerName} بتأكيد طلبك.`
                        }),
                        orderId: id
                    });
                }
            }
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
        } catch (error) {
            console.error('Error confirming job:', error);
        }
    };

    const handleCancelJob = async (job: OrderDetails) => {
        if (!confirm('Are you sure you want to cancel this job? This may affect your completion rate.')) return;
        try {
            const jobRef = doc(db, 'jobs', job.id!);
            await updateDoc(jobRef, {
                status: 'cancelled',
                bricolerId: null,
                cancelledBy: 'bricoler',
                cancelledAt: serverTimestamp()
            });
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
        } catch (error) {
            console.error('Error cancelling job:', error);
        }
    };

    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleGoogleLogin = async () => {
        if (isLoggingIn) return;
        setIsLoggingIn(true);
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            console.error("Auth Error:", error);
            if (error.code === 'auth/popup-blocked') {
                showToast({
                    variant: 'error',
                    title: t({ en: 'Login popup was blocked.', fr: 'La fenêtre de connexion a été bloquée.', ar: 'تم حظر نافذة تسجيل الدخول.' }),
                    description: t({ en: 'Please allow popups for this site.', fr: 'Veuillez autoriser les popups pour ce site.', ar: 'يرجى السماح بالنوافذ المنبثقة لهذا الموقع.' })
                });
            } else if (error.code === 'auth/cancelled-popup-request') {
                console.log("Popup request was cancelled by a new request - this is usually harmless.");
            } else if (error.code === 'auth/popup-closed-by-user') {
                // Silent
            } else {
                showToast({
                    variant: 'error',
                    title: t({ en: 'Login failed.', fr: 'Échec de connexion.' }),
                    description: error.message
                });
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    const [clientReview, setClientReview] = useState(''); // Keep temporary if needed or remove
    // Duplicate states removed

    const handleRateClient = async (job: any) => {
        if (clientRating === 0 || isSubmittingRating || !job.id || !job.clientId) return;
        setIsSubmittingRating(true);
        try {
            const reviewData = {
                id: job.id,
                rating: clientRating,
                comment: clientRatingComment || clientReview,
                serviceName: job.title || job.craft || 'Service',
                date: new Date().toISOString(),
                bricolerName: user?.displayName || 'Bricoler',
                bricolerAvatar: userData?.profilePhotoURL || userData?.avatar || userData?.photoURL || user?.photoURL || null,
            };

            const clientRef = doc(db, 'clients', job.clientId);
            await updateDoc(clientRef, {
                reviews: arrayUnion(reviewData),
                totalRating: increment(clientRating),
                jobsCount: increment(1),
            });

            const jobRef = doc(db, 'jobs', job.id);
            await updateDoc(jobRef, { clientRated: true });

            setIsClientRatedLocally(prev => [...prev, job.id!]);
            setClientRating(0);
            setClientReview('');

            showToast({
                variant: 'success',
                title: t({ en: 'Review submitted!', fr: 'Avis envoyé !' }),
                description: t({ en: 'Thank you for rating the client.', fr: 'Merci d\'avoir noté le client.' })
            });
        } catch (err) {
            console.error('Error submitting client review:', err);
        } finally {
            setIsSubmittingRating(false);
        }
    };

    const handleAddService = async () => {
        if (!user || !newServiceData.id) return;
        setIsSavingProfile(true);
        try {
            const bricolerRef = doc(db, 'bricolers', user.uid);
            const svc = getServiceById(newServiceData.id);
            const entry = {
                serviceId: newServiceData.id,
                serviceName: svc?.name || newServiceData.id,
                hourlyRate: newServiceData.rate,
                pitch: newServiceData.pitch,
            };

            await updateDoc(bricolerRef, {
                services: arrayUnion(entry)
            });

            // Also update city_services (supply-side visibility)
            if (providerCity) {
                const cityRef = doc(db, 'city_services', providerCity);
                await updateDoc(cityRef, {
                    active_services: arrayUnion(newServiceData.id)
                });
            }

            showToast({
                variant: 'success',
                title: t({ en: 'Service added!', fr: 'Service ajouté !', ar: 'تم إضافة الخدمة!' }),
                description: t({ en: `${svc?.name} is now active on your profile.`, fr: `${svc?.name} est maintenant actif sur votre profil.`, ar: `${t({ en: svc?.name || '', fr: svc?.name || '' })} نشط الآن في ملفك الشخصي.` })
            });
            setShowAddServiceModal(false);
            setNewServiceData({ id: '', rate: 100, pitch: '' });
        } catch (err) {
            console.error("Error adding service:", err);
            showToast({ variant: 'error', title: t({ en: 'Error', fr: 'Erreur' }), description: t({ en: 'Failed to add service', fr: 'Échec de l\'ajout du service' }) });
        } finally {
            setIsSavingProfile(false);
        }
    };



    const handleAcceptJob = async (job: Job) => {
        if (!user) {
            handleGoogleLogin();
            return;
        }



        // Removed whatsapp number check to avoid sharing contact info

        setIsSubmittingOffer(true);
        try {
            const jobRef = doc(db, 'jobs', job.id);
            const providerRef = doc(db, 'bricolers', user.uid);

            const offer = {
                bricolerId: user.uid,
                bricolerName: user.displayName || 'Bricoler',
                avatar: userData?.profilePhotoURL || userData?.avatar || userData?.photoURL || user.photoURL || '',
                rating: userData?.rating || 0,
                jobsCount: userData?.completedJobs || 0,
                type: 'accept',
                price: typeof job.price === 'string' ? parseFloat(job.price.replace(/[^0-9.]/g, '')) : job.price,
                timestamp: Timestamp.now()
            };

            // Push offer to array
            await updateDoc(jobRef, {
                offers: arrayUnion(offer)
            });

            // Notify Client of new offer
            const jobSnap = await getDoc(jobRef);
            if (jobSnap.exists()) {
                const jobData = jobSnap.data();
                if (jobData.clientId) {
                    await addDoc(collection(db, 'client_notifications'), {
                        clientId: jobData.clientId,
                        type: 'bricoler_offer',
                        jobId: job.id,
                        bricolerName: user.displayName || 'Bricoler',
                        serviceName: jobData.service || job.craft || 'Service',
                        read: false,
                        timestamp: serverTimestamp()
                    });
                }
            }
            await addDoc(collection(db, 'activity'), {
                type: 'offer_sent',
                bricolerId: user.uid,
                jobId: job.id,
                service: job.craft,
                city: job.city,
                timestamp: serverTimestamp()
            });

            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#000000', '#FFD700', '#FFFFFF']
            });

            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);

            // Show calendar overlay to see the new job
            // setShowCalendarOverlay(true); // Don't show calendar, just toast
            setActiveNav('jobs');
        } catch (error) {
            console.error('Error accepting job:', error);
            const err = error as any;
            if (err?.code === 'permission-denied') {
                showToast({
                    variant: 'error',
                    title: t({ en: 'Offer not sent.', fr: 'Offre non envoyée.' }),
                    description: t({ en: 'This job may no longer be available.', fr: 'Ce job n\'est peut-être plus disponible.' })
                });
            } else {
                showToast({ variant: 'error', title: t({ en: 'Failed to send offer.', fr: 'Échec d\'envoi de l\'offre.' }), description: t({ en: 'Please try again.', fr: 'Veuillez réessayer.' }) });
            }
        } finally {
            setIsSubmittingOffer(false);
        }
    };

    const handleCounterClick = (job: Job) => {
        if (!user) {
            handleGoogleLogin();
            return;
        }

        setCounterJob(job);
        setCounterPrice(typeof job.price === 'string' ? job.price.replace(/[^0-9.]/g, '') : job.price.toString());
        setCounterComment("");
        setShowCounterModal(true);
    };

    const handleSubmitCounter = async () => {
        if (!user || !counterJob) return;

        setIsSubmittingOffer(true);
        try {
            const jobRef = doc(db, 'jobs', counterJob.id);
            const providerRef = doc(db, 'bricolers', user.uid);

            const offer = {
                bricolerId: user.uid,
                bricolerName: user.displayName || 'Bricoler',
                avatar: userData?.profilePhotoURL || userData?.avatar || userData?.photoURL || user.photoURL || '',
                rating: userData?.rating || 0,
                jobsCount: userData?.completedJobs || 0,
                type: 'counter',
                price: parseFloat(counterPrice),
                comment: counterComment,
                timestamp: Timestamp.now()
            };

            await updateDoc(jobRef, {
                offers: arrayUnion(offer),
                status: 'negotiating'
            });

            // Notify Client of counter offer
            const jobSnap = await getDoc(jobRef);
            if (jobSnap.exists()) {
                const jobData = jobSnap.data();
                if (jobData.clientId) {
                    await addDoc(collection(db, 'client_notifications'), {
                        clientId: jobData.clientId,
                        type: 'bricoler_counter_offer',
                        jobId: counterJob.id,
                        bricolerName: user.displayName || 'Bricoler',
                        serviceName: jobData.service || counterJob.craft || 'Service',
                        price: parseFloat(counterPrice),
                        read: false,
                        timestamp: serverTimestamp()
                    });
                }
            }
            await addDoc(collection(db, 'activity'), {
                type: 'counter_offer_sent',
                bricolerId: user.uid,
                jobId: counterJob.id,
                price: counterPrice,
                timestamp: serverTimestamp()
            });

            confetti({
                particleCount: 100,
                spread: 60,
                origin: { y: 0.6 },
            });

            setShowCounterModal(false);
            setCounterJob(null);
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);

        } catch (error) {
            console.error('Error sending counter offer:', error);
            const err = error as any;
            if (err?.code === 'permission-denied') {
                showToast({
                    variant: 'error',
                    title: t({ en: 'Counter offer not sent.', fr: 'Contre-offre non envoyée.' }),
                    description: t({ en: 'This job may no longer be available.', fr: 'Ce job n\'est peut-être plus disponible.' })
                });
            } else {
                showToast({ variant: 'error', title: t({ en: 'Failed to send offer.', fr: 'Échec d\'envoi de l\'offre.' }), description: t({ en: 'Please try again.', fr: 'Veuillez réessayer.' }) });
            }
        } finally {
            setIsSubmittingOffer(false);
        }
    };

    const handleSaveWhatsapp = async () => {
        if (user && whatsappInput) {
            const bricolerRef = doc(db, 'bricolers', user.uid);
            await updateDoc(bricolerRef, { whatsappNumber: whatsappInput });
            setUserData(prev => prev ? { ...prev, whatsappNumber: whatsappInput } : null);
            setShowWhatsAppModal(false);
            if (pendingJob) {
                handleAcceptJob(pendingJob);
                setPendingJob(null);
            }
        }
    };


    // Sub-Components
    const NavTab = ({ id, label, icon: Icon }: { id: typeof activeNav, label: string, icon: any }) => (
        <button
            onClick={() => setActiveNav(id)}
            className={cn(
                "text-sm font-semibold transition-colors pb-1 border-b-2 flex items-center gap-2",
                activeNav === id
                    ? "text-neutral-900 border-neutral-900"
                    : "text-neutral-500 hover:text-neutral-900 border-transparent"
            )}
            style={{ backgroundColor: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer' }}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    const NewJobCard = ({ job }: { job: MobileJobsViewItem }) => {
        const isNew = job.status === 'new';
        const isWaiting = job.status === 'waiting';
        const isDone = job.status === 'done';
        const isProgrammed = job.status === 'programmed';

        return (
            <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => setViewingJobDetails(job)}
                className="bg-white rounded-[28px] p-4 flex items-center gap-4 border-2 border-neutral-50 shadow-sm active:border-[#008C74]/20 transition-all"
            >
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-neutral-100 flex-shrink-0">
                    <img src={job.image || undefined} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-[17px] font-black text-neutral-900 truncate tracking-tight">{job.service}</h4>
                        <span className="text-[15px] font-black text-[#00A082] uppercase">{t({ en: 'MAD', fr: 'MAD' })} {job.priceLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 text-[12px] font-bold">
                        <span className="truncate">{job.clientName}</span>
                        <span>•</span>
                        <span>{job.dateLabel} {job.timeLabel && `at ${job.timeLabel}`}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        {isNew && <span className="px-3 py-1 bg-red-50 text-red-500 text-[10px] font-black rounded-full uppercase">{t({ en: 'Action Required', fr: 'Action requise' })}</span>}
                        {isWaiting && <span className="px-3 py-1 bg-amber-50 text-amber-500 text-[10px] font-black rounded-full uppercase">{t({ en: 'Waiting Client', fr: 'En attente du client' })}</span>}
                        {isProgrammed && <span className="px-3 py-1 bg-blue-50 text-blue-500 text-[10px] font-black rounded-full uppercase">{t({ en: 'Scheduled', fr: 'Programmée' })}</span>}
                        {isDone && <span className="px-3 py-1 bg-emerald-50 text-emerald-500 text-[10px] font-black rounded-full uppercase">{t({ en: 'Completed', fr: 'Terminée' })}</span>}

                        <div className="flex-1" />

                        {(isProgrammed || isWaiting || isDone) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const raw = job.rawAccepted || { id: job.id, clientName: job.clientName };
                                    setSelectedChat(raw as any);
                                }}
                                className="w-9 h-9 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400 hover:text-[#00A082] transition-colors"
                            >
                                <MessageCircle size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    const JobCard = ({ job, onAccept, onCounter }: { job: Job, onAccept: (j: Job) => void, onCounter: (j: Job) => void }) => {
        const myOffer = job.offers?.find((o: any) => o.bricolerId === auth.currentUser?.uid);
        const isWaiting = Boolean(myOffer);
        const cardPrice = formatJobPrice(job.basePrice || job.price);
        const { dateLabel, timeLabel } = getJobDateTime(job.date);
        const dotColors = isWaiting
            ? ['#4ADE80', '#86EFAC', '#DCFCE7']
            : ['#AFAFAF', '#D1D1D1', '#E7E7E7'];

        return (
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-[36px] border p-6 md:p-7 transition-all duration-300 ${isWaiting ? 'border-[3px] border-[#4ADE80]' : 'border-neutral-200'}`}
            >
                <div className="flex items-start justify-between gap-6">
                    <h3
                        className="text-[32px] md:text-[56px] font-black text-neutral-900 leading-[0.95] tracking-tight max-w-[340px]"
                        style={{ fontFamily: 'Uber Move, var(--font-sans)' }}
                    >
                        {job.title}
                    </h3>
                    <div className="flex items-center gap-3 pt-2">
                        {dotColors.map((color, idx) => (
                            <span key={`${color}-${idx}`} className="w-5 h-5 rounded-full" style={{ backgroundColor: color }} />
                        ))}
                    </div>
                </div>

                <div className="mt-4 flex flex-col items-start gap-1">
                    <span className="text-[32px] md:text-[54px] font-black tracking-tight text-[#BDBDBD] leading-none uppercase">{t({ en: 'MAD', fr: 'MAD' })} {cardPrice}</span>
                    <span className="text-[13px] font-bold text-neutral-400 uppercase tracking-widest">{t({ en: 'Estimated Payout', fr: 'Paiement estimé' })}</span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 flex-shrink-0">
                        {job.clientAvatar ? (
                            <img src={job.clientAvatar || undefined} alt={job.clientName} className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-neutral-500 font-bold">
                                {(job.clientName || 'C').slice(0, 1)}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-extrabold text-neutral-900 truncate">{job.clientName || 'Client'}</div>
                        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500">
                            <Star size={13} className="fill-black text-black" />
                            <span>{job.rating || 'N/A'}</span>
                            <span className="text-neutral-300">•</span>
                            <span className="truncate">{job.timestamp}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-3 text-[15px] md:text-[18px] text-neutral-500 font-semibold">
                        <Calendar size={20} className="text-neutral-400 md:w-[26px] md:h-[26px]" />
                        <span>{dateLabel}</span>
                        {timeLabel ? <span className="text-neutral-300">•</span> : null}
                        {timeLabel ? <Clock size={20} className="text-neutral-400 md:w-[26px] md:h-[26px]" /> : null}
                        {timeLabel ? <span>{timeLabel}</span> : null}
                    </div>
                    <div className="flex items-center gap-3 text-[15px] md:text-[17px] text-neutral-500 font-semibold">
                        <MapPin size={20} className="text-neutral-400 md:w-[26px] md:h-[26px]" />
                        <span>{job.city}</span>
                    </div>
                </div>

                <div className="mt-4">
                    <p className="text-[14px] md:text-[15px] leading-relaxed text-neutral-700 line-clamp-3">{job.description || t({ en: 'No description provided.', fr: 'Aucune description fournie.' })}</p>
                    <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-500">{job.craft}</div>
                </div>

                <div className="mt-8 flex items-center gap-3">
                    <button
                        onClick={() => onAccept(job)}
                        disabled={isSubmittingOffer || isWaiting}
                        className="px-7 md:px-9 py-3 md:py-3.5 bg-black text-white text-[15px] md:text-[17px] font-bold rounded-full transition-all disabled:opacity-50"
                    >
                        {isSubmittingOffer ? '...' : t({ en: 'Accept', fr: 'Accepter' })}
                    </button>
                    <button
                        onClick={() => onCounter(job)}
                        disabled={isWaiting}
                        className="px-7 md:px-9 py-3 md:py-3.5 bg-neutral-100 text-neutral-900 text-[15px] md:text-[17px] font-bold rounded-full transition-all disabled:opacity-50"
                    >
                        {t({ en: 'Counter Offer', fr: 'Contre-offre' })}
                    </button>
                </div>
            </motion.div>
        );
    };

    const profileBadge = userData?.name
        ? userData.name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((n) => n[0])
            .join('')
            .toUpperCase()
        : 'xP';


    const monthNow = new Date();
    const monthLabel = selectedMonthDt.toLocaleDateString('en-US', { month: 'long' });
    const monthJobs = acceptedJobsSorted.filter((job) => {
        const ts = parseDateTime(job.date, job.time);
        if (!ts) return false;
        const d = new Date(ts);
        return d.getMonth() === selectedMonthDt.getMonth() && d.getFullYear() === selectedMonthDt.getFullYear();
    });
    const monthDoneJobs = monthJobs.filter((job) => job.status === 'done' || job.status === 'delivered');

    // ── Calculate month-scoped worked hours ──
    const monthWorkedHours = monthDoneJobs.reduce((sum, job) => sum + (Number((job as any).duration) || 0), 0);

    // ── Calculate month-scoped availability hours declared ──
    const monthAvailabilityHours = (() => {
        if (!(userData as any)?.calendarSlots) return 0;
        let totalMinutes = 0;
        const year = selectedMonthDt.getFullYear();
        const month = selectedMonthDt.getMonth();

        Object.entries((userData as any).calendarSlots).forEach(([dateKey, slots]: [string, any]) => {
            try {
                const d = new Date(dateKey);
                if (d.getFullYear() === year && d.getMonth() === month && Array.isArray(slots)) {
                    slots.forEach(slot => {
                        if (slot.from && slot.to) {
                            const [h1, m1] = slot.from.split(':').map(Number);
                            const [h2, m2] = slot.to.split(':').map(Number);
                            const dur = (h2 * 60 + m2) - (h1 * 60 + m1);
                            if (dur > 0) totalMinutes += dur;
                        }
                    });
                }
            } catch (e) { /* skip invalid keys */ }
        });
        return Math.round(totalMinutes / 60);
    })();
    const monthProgrammedJobs = monthJobs.filter((job) => programmedStatuses.has(job.status || ''));

    // ── Per-service breakdown (for Service Breakdown strip) ──
    const serviceBreakdown = useMemo(() => {
        return [...new Set(selectedServices)].map(serviceId => {
            const myJobs = monthDoneJobs.filter(j => normalizeServiceId((j as any).craft || j.service || '') === serviceId);
            const allTimeJobsForService = doneAcceptedJobs.filter(j => normalizeServiceId((j as any).craft || j.service || '') === serviceId);
            const earnings = myJobs.reduce((acc, j) => {
                const p = String(j.price || '0').replace(/[^\d.]/g, '');
                return acc + (parseFloat(p) || 0);
            }, 0);
            const ratings = myJobs.map(j => Number(j.rating)).filter(r => r > 0);
            const allTimeRatingsForService = allTimeJobsForService.map(j => Number(j.rating)).filter(r => r > 0);
            const avgRating = ratings.length > 0
                ? (ratings.reduce((s, r) => s + r, 0) / ratings.length)
                : allTimeRatingsForService.length > 0
                    ? (allTimeRatingsForService.reduce((s, r) => s + r, 0) / allTimeRatingsForService.length)
                    : 0;
            const cityTotal = cityDoneJobs.filter(j => j.craft === serviceId).length;
            const demandScore = cityTotal > 0 ? Math.round((myJobs.length / cityTotal) * 100) : null;
            return { serviceId, earnings, avgRating, demandScore, jobCount: myJobs.length };
        });
    }, [selectedServices, monthDoneJobs, doneAcceptedJobs, cityDoneJobs]);
    const monthRevenue = monthDoneJobs.reduce((acc, job) => acc + (parseInt(String(job.price || '').replace(/[^\d]/g, ''), 10) || 0), 0);
    // Month-scoped rating: AVG of client ratings on DONE jobs in the selected month
    const monthRatings = monthDoneJobs
        .map((job) => Number(job.rating))
        .filter((r) => Number.isFinite(r) && r > 0);
    const allTimeRatings = doneAcceptedJobs
        .map((job) => Number(job.rating))
        .filter((r) => Number.isFinite(r) && r > 0);
    const monthAvgRating = monthRatings.length > 0
        ? (monthRatings.reduce((s, r) => s + r, 0) / monthRatings.length).toFixed(1)
        : allTimeRatings.length > 0
            ? (allTimeRatings.reduce((s, r) => s + r, 0) / allTimeRatings.length).toFixed(1)
            : '0.0';

    // Total revenue: sum of prices for done jobs in the selected month
    const COMMISSION_RATE = 0.15;
    const monthRevenueNum = (monthDoneJobs.reduce((acc, job: any) => {
        const cleanVal = (val: any) => {
            if (typeof val === 'number') return val;
            // Handle Moroccan numbers: "250,50" -> "250.50", strip thousand separators if they match common patterns
            let s = String(val || '0').replace(',', '.');
            // If there's more than one dot, the earlier ones are likely thousand separators
            const dots = s.split('.');
            if (dots.length > 2) {
                // Keep only the last one as decimal
                s = dots.slice(0, -1).join('') + '.' + dots.slice(-1);
            }
            return parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
        };

        const baseVal = job.basePrice ? Number(job.basePrice) : undefined;
        if (baseVal !== undefined && !isNaN(baseVal)) return acc + baseVal;

        const priceNum = cleanVal(job.price);
        return acc + priceNum;
    }, 0));

    const monthReferralBonus = (userData as any)?.bricolerReferralBalance || 0;
    // Note: monthNetEarnings here is a helper, but the final display in Performance view 
    // calculates it as (totalEarnings * 0.85) + monthReferralBonus or similar.
    // For consistency with line 3160, we set monthRevenueNum as the Gross.
    const monthNetEarnings = Math.round(monthRevenueNum * 0.85 + monthReferralBonus);

    // Capacity of 2 jobs per day x Number of Days in that month
    const daysInMonth = new Date(selectedMonthDt.getFullYear(), selectedMonthDt.getMonth() + 1, 0).getDate();
    const monthlyCapacity = daysInMonth * 2;
    // Occupancy = (programmed + done) / capacity
    const totalMonthActiveJobs = monthProgrammedJobs.length + monthDoneJobs.length;
    const monthOccupancyRate = Math.max(0, Math.min(100, Math.round((totalMonthActiveJobs / Math.max(1, monthlyCapacity)) * 100)));

    // Notifications badge count: new market jobs + awaiting client decision + unread firestore notifications
    const mobileNotificationsCount = newMarketJobs.length + waitingMarketJobs.length + bricolerNotifications.filter((n: any) => !n.read).length;

    // Build a merged notification feed: Firestore notifications + synthetic job/chat events
    const syntheticNotifications: any[] = [
        ...newMarketJobs.slice(0, 5).map((job) => ({
            id: `market-${job.id}`,
            type: 'new_job',
            serviceName: job.title,
            city: job.city,
            price: job.price,
            timestamp: { seconds: Math.floor((job.createdAt ? new Date(job.createdAt).getTime() : Date.now()) / 1000) },
            read: false,
            synthetic: true,
        })),
    ];
    const mergedNotifications = [
        ...bricolerNotifications,
        ...syntheticNotifications.filter(s => !bricolerNotifications.find((n: any) => n.id === s.id)),
    ].sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

    const jobsStatusTabs: { key: MobileJobsStatus; label: string; count: number }[] = [
        { key: 'new', label: t({ en: 'New', fr: 'Nouveau' }), count: newMarketJobs.length },
        { key: 'waiting', label: t({ en: 'Waiting', fr: 'Attente' }), count: waitingMarketJobs.length },
        { key: 'programmed', label: t({ en: 'Programmed', fr: 'Programmé' }), count: programmedAcceptedJobs.length },
        { key: 'done', label: t({ en: 'Delivered', fr: 'Livré' }), count: doneAcceptedJobs.length }
    ];

    const serviceSubtitle = (service: any, craft?: string) => {
        if (!service || typeof service !== 'string') return craft || 'Sub-service';
        const serviceConfig = getServiceById(craft || normalizeServiceId(service));
        if (serviceConfig?.name && serviceConfig.name.toLowerCase() !== service.toLowerCase()) return serviceConfig.name;
        if (craft) return craft.replace(/[_-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        return 'Sub-service';
    };

    const visibleMobileJobs: MobileJobsViewItem[] = useMemo(() => {
        if (mobileJobsStatus === 'new') return jobsBySection.pending.filter(j => j.status === 'new');
        if (mobileJobsStatus === 'waiting') return jobsBySection.pending.filter(j => j.status === 'waiting');
        if (mobileJobsStatus === 'programmed') return [...jobsBySection.today, ...jobsBySection.week];
        if (mobileJobsStatus === 'done') return jobsBySection.done;
        return [];
    }, [jobsBySection, mobileJobsStatus]);
    const stackedMobileJobs = visibleMobileJobs.slice(0, 3);

    const openWhatsApp = async (number?: string, clientId?: string) => {
        let targetNumber = number;

        if (!targetNumber && clientId) {
            try {
                // Try from clients collection
                const clientSnap = await getDoc(doc(db, 'clients', clientId));
                if (clientSnap.exists()) {
                    targetNumber = clientSnap.data().whatsappNumber || clientSnap.data().phone;
                }

                // Fallback to users collection
                if (!targetNumber) {
                    const userSnap = await getDoc(doc(db, 'users', clientId));
                    if (userSnap.exists()) {
                        targetNumber = userSnap.data().whatsappNumber || userSnap.data().phone;
                    }
                }
            } catch (err) {
                console.error("Error fetching client contact for WhatsApp:", err);
            }
        }

        if (!targetNumber) {
            showToast({
                variant: 'error',
                title: t({ en: 'Error', fr: 'Erreur', ar: 'خطأ' }),
                description: t({ en: 'Client WhatsApp number not found.', fr: 'Numéro WhatsApp du client introuvable.', ar: 'رقم واتساب العميل غير موجود.' })
            });
            return;
        }

        const cleanNumber = targetNumber.replace(/\D/g, '');
        const finalNumber = cleanNumber.startsWith('212') ? cleanNumber : `212${cleanNumber.startsWith('0') ? cleanNumber.slice(1) : cleanNumber}`;
        window.open(`https://wa.me/${finalNumber}`, '_blank');
    };

    const renderJobDetailsModal = () => {
        if (!viewingJobDetails) return null;
        const job = viewingJobDetails;
        const dateStr = job.dateLabel;
        const timeStr = job.timeLabel || 'Flexible';

        // Get hero image for vector
        const serviceVector = getServiceVector(job.rawAccepted?.service || job.rawJob?.craft || '');

        return (
            <AnimatePresence key="job-details-modal-presence">
                <motion.div
                    key="job-details-modal-content"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-[4000] bg-white flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-12 py-5 border-b border-neutral-50 sticky top-0 bg-white z-50">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setViewingJobDetails(null)}
                                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-neutral-50 active:scale-90 transition-transform"
                            >
                                <ChevronLeft size={28} className="text-black" />
                            </button>
                            <h1 className="text-[20px] font-black text-black">{t({ en: 'Job details', fr: 'Détails de la mission' })}</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            {(job.rawAccepted?.status === 'confirmed' || job.rawAccepted?.status === 'programmed' || job.rawAccepted?.status === 'accepted') && (
                                <button
                                    onClick={() => openWhatsApp(job.clientWhatsApp, job.rawAccepted?.clientId || job.rawJob?.clientId)}
                                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-neutral-50 active:scale-90 transition-all"
                                >
                                    <WhatsAppBrandIcon className="w-6 h-6" />
                                </button>
                            )}
                            {/* Help and Chat hidden as per user request */}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        <div className="pb-10">
                            <div className="px-6 md:px-12 pt-10 pb-6 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                                <div className="w-32 h-32 md:w-35 md:h-50 flex-shrink-0 overflow-hidden rounded-2xl bg-neutral-100 flex items-center justify-center border border-neutral-100">
                                    {job.images && job.images.length > 0 ? (
                                        <img
                                            src={job.images[0]}
                                            className="w-full h-full object-cover"
                                            alt="job highlight"
                                        />
                                    ) : (
                                        <img
                                            src="/Images/Vectors Illu/NewOrder.webp"
                                            className="w-full h-full object-contain p-2"
                                            alt="illustration"
                                        />
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-[32px] md:text-[42px] font-black text-black leading-[1.1] tracking-tighter">
                                        {job.status === 'done' ? t({ en: 'Completed', fr: 'Terminée' }) :
                                            (job.rawAccepted?.status === 'confirmed' || job.rawAccepted?.status === 'programmed') ? t({ en: 'Programmed', fr: 'Programmée' }) :
                                                t({ en: 'Upcoming', fr: 'À venir' })}
                                    </h2>
                                    <div className="flex items-center gap-2 text-[18px] font-semibold text-black mt-1">
                                        <span>{dateStr}</span>
                                        <span className="text-neutral-200">|</span>
                                        <span>{timeStr}</span>
                                    </div>
                                    <p className="text-[12px] font-light text-black uppercase tracking-[0.2em] mt-2">
                                        {t({ en: 'ORDER ID', fr: 'ID DE COMMANDE' })}: #{job.id?.slice(-8).toUpperCase() || '---'}
                                    </p>
                                </div>
                            </div>

                            {/* Key Details Grid */}
                            <div className="px-6 md:px-12 mb-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Contact the Client (Moved to top of grid) */}
                                    {(job.rawAccepted?.status === 'confirmed' || job.rawAccepted?.status === 'programmed' || job.rawAccepted?.status === 'accepted') && (
                                        <div className="col-span-1 sm:col-span-2 mb-2">
                                            <button
                                                onClick={() => openWhatsApp(job.clientWhatsApp, job.rawAccepted?.clientId || job.rawJob?.clientId)}
                                                className="w-full bg-[#25D366] text-white py-4 rounded-xl font-black text-[18px] flex items-center justify-center gap-3 hover:bg-[#128C7E] transition-all shadow-sm"
                                            >
                                                <WhatsAppBrandIcon className="w-6 h-6" />
                                                {t({ en: 'Contact Client', fr: 'Contacter le Client' })}
                                            </button>
                                        </div>
                                    )}
                                    <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-4 border border-neutral-100/50">
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                            <Clock size={20} className="text-[#00A082]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Duration', fr: 'Durée' })}</span>
                                            <span className="text-[16px] font-black text-black">≈ {job.rawAccepted?.duration || job.rawJob?.duration || '2h-3h'}</span>
                                        </div>
                                    </div>
                                    <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-4 border border-neutral-100/50">
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                            <Banknote size={20} className="text-[#00A082]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Your Earnings', fr: 'Tes Gains (NET)' })}</span>
                                            <span className="text-[16px] font-black text-black">{(parseFloat(job.priceLabel) * (1 - COMMISSION_RATE)).toFixed(0)} {t({ en: 'MAD', fr: 'MAD' })}</span>
                                        </div>
                                    </div>
                                    <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-4 border border-neutral-100/50">
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                            <Wrench size={20} className="text-[#00A082]" />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Service', fr: 'Service' })}</span>
                                            <span className="text-[16px] font-black text-black truncate">{job.rawAccepted?.service || job.rawJob?.craft}</span>
                                        </div>
                                    </div>
                                    <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-4 border border-neutral-100/50">
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                            <CreditCard size={20} className="text-[#00A082]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Payment', fr: 'Paiement' })}</span>
                                            <span className="text-[16px] font-black text-black">{t({ en: 'Cash', fr: 'Espèces' })}</span>
                                        </div>
                                    </div>
                                    {/* Location */}
                                    <div className="bg-neutral-50 rounded-2xl p-4 flex items-center gap-4 border border-neutral-100/50">
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                            <MapPin size={20} className="text-[#00A082]" />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Location', fr: 'Localisation' })}</span>
                                            <span className="text-[16px] font-black text-black">
                                                {job.rawAccepted?.location || job.rawJob?.city || job.city || t({ en: 'Unknown', fr: 'Inconnu' })}{(job.rawAccepted?.area || job.rawJob?.area) ? `, ${job.rawAccepted?.area || job.rawJob?.area}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                    {/* Description */}
                                    <div className="bg-neutral-50 rounded-2xl p-4 col-span-1 sm:col-span-2 flex items-start gap-4 border border-neutral-100/50">
                                        <div className="w-10 h-10 rounded-full bg-white flex-shrink-0 flex items-center justify-center shadow-sm">
                                            <Info size={20} className="text-[#00A082]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-bold text-neutral-400 uppercase tracking-wider">{t({ en: 'Description', fr: 'Description' })}</span>
                                            <p className="text-[14px] font-semibold text-black line-clamp-2 leading-tight">
                                                {job.rawAccepted?.description || job.rawJob?.description || t({ en: 'No specific instructions.', fr: 'Aucune instruction spécifique.' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Wide Light ZigZag */}
                            <div className="w-full relative h-[40px] flex items-center overflow-hidden">
                                <div className="absolute w-full h-[2px] bg-neutral-100/50" />
                                <div className="w-full h-full flex justify-center opacity-[0.08]" style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='10' viewBox='0 0 40 10' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10L20 0L40 10' stroke='black' stroke-width='2'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'repeat-x',
                                    backgroundPosition: 'center'
                                }} />
                            </div>

                            <div className="px-6 py-8 space-y-10">
                                {/* Service Info */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-shrink-0 px-3 py-1 bg-[#FFC244]/20 text-black text-[13px] font-black rounded-md whitespace-nowrap">
                                            ≈ {job.rawAccepted?.duration || job.rawJob?.duration || '2h-3h'}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[20px] font-semibold text-black">
                                            {job.service.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} {job.subService ? `› ${job.subService}` : ''}
                                        </p>
                                        <p className="text-[14px] font-light text-black leading-relaxed">
                                            {t({ en: 'Work with client ', fr: 'Travail avec le client ' })}<span className="text-black font-semibold">{job.clientName || 'Client'}</span>{t({ en: '. Feel free to chat for more details or location guidance.', fr: '. N\'hésitez pas à discuter pour plus de détails ou d\'itinéraires.' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Client Section */}
                                <section>
                                    <h3 className="text-[28px] font-black text-black mb-4">{t({ en: 'Client', fr: 'Client' })}</h3>
                                    <div className="flex items-center justify-between p-4 border border-neutral-100 rounded-[28px] bg-white">
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 rounded-[18px] overflow-hidden bg-neutral-100">
                                                {job.clientAvatar ? <img src={job.clientAvatar} alt={job.clientName} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-[20px] font-black text-neutral-400">{job.clientName?.[0] || 'C'}</div>}
                                            </div>
                                            <div>
                                                <p className="text-[18px] font-black text-black">{job.clientName || 'Client'}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <div className="flex items-center gap-0.5 mr-1">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star key={s} size={14} className={cn("fill-neutral-200 text-neutral-200", (job.clientRating && s <= Math.floor(job.clientRating)) ? "fill-[#FFC244] text-[#FFC244]" : (s <= 5 && !job.clientRating ? "fill-[#FFC244] text-[#FFC244]" : ""))} />
                                                        ))}
                                                    </div>
                                                    <span className="text-[13px] font-bold text-[#FFC244]">{job.clientRating ? job.clientRating.toFixed(1) : '5.0'}</span>
                                                    <span className="text-[13px] text-neutral-400 font-medium">({job.clientReviewCount || 0} {t({ en: 'reviews', fr: 'avis' })})</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const clientId = job.rawAccepted?.clientId || job.rawJob?.clientId;
                                                const whatsappNumber = job.rawAccepted?.clientWhatsApp || job.rawJob?.clientWhatsApp;
                                                openWhatsApp(whatsappNumber, clientId);
                                            }}
                                            className="h-12 w-12 flex items-center justify-center bg-[#25D366] text-white rounded-full transition-transform active:scale-90 shadow-lg shadow-[#25D366]/20"
                                        >
                                            <WhatsAppBrandIcon size={24} />
                                        </button>
                                    </div>

                                    {/* Provider rating Client embedded section */}
                                    {job.status === 'done' && !(job as any).rawJob?.clientRated && !isClientRatedLocally.includes(job.id!) && (
                                        <div className="mt-4 p-5 bg-neutral-50 rounded-[28px] border border-neutral-100/50 flex flex-col items-center gap-4">
                                            <div className="text-center">
                                                <p className="text-[14px] font-black text-black">{t({ en: 'Rate this Client', fr: 'Notez ce Client' })}</p>
                                                <p className="text-[12px] font-medium text-neutral-400">{t({ en: 'How was your experience?', fr: 'Comment s\'est passée votre expérience ?' })}</p>
                                            </div>
                                            <div className="flex gap-1.5">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <motion.button
                                                        key={s}
                                                        whileHover={{ scale: 1.2 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => setClientRating(s)}
                                                        onMouseEnter={() => setClientHover(s)}
                                                        onMouseLeave={() => setClientHover(0)}
                                                    >
                                                        <Star
                                                            size={28}
                                                            className={cn(
                                                                "transition-all cursor-pointer",
                                                                (clientHover || clientRating) >= s ? "fill-[#FFC244] text-[#FFC244]" : "fill-white text-neutral-200"
                                                            )}
                                                        />
                                                    </motion.button>
                                                ))}
                                            </div>
                                            <textarea
                                                value={clientReview || clientRatingComment}
                                                onChange={(e) => {
                                                    setClientReview(e.target.value);
                                                    setClientRatingComment(e.target.value);
                                                }}
                                                placeholder={t({ en: 'Client behavior, timing...', fr: 'Comportement du client, ponctualité...' })}
                                                className="w-full h-20 p-3 rounded-xl bg-white border border-neutral-100 text-[13px] outline-none focus:ring-2 focus:ring-[#FFC244]/50 font-medium resize-none"
                                            />
                                            <button
                                                onClick={() => handleRateClient(job)}
                                                disabled={clientRating === 0 || isSubmittingRating}
                                                className={cn(
                                                    "w-full py-3 rounded-xl text-white font-black text-[14px] transition-all flex items-center justify-center gap-2",
                                                    clientRating > 0 ? "bg-[#00A082]" : "bg-neutral-300 opacity-50"
                                                )}
                                            >
                                                {isSubmittingRating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t({ en: 'Submit Rating', fr: 'Envoyer la note' })}
                                            </button>
                                        </div>
                                    )}
                                </section>

                                {/* Need Description */}
                                <div className="space-y-3">
                                    <h3 className="text-[28px] font-black text-black">{t({ en: 'Need Description', fr: 'Description du besoin' })}</h3>
                                    <div className="p-5 bg-neutral-50 rounded-[16px] text-neutral-500 text-[15px] font-light leading-relaxed">
                                        {job.rawJob?.description || job.rawAccepted?.description || job.rawAccepted?.comment || t({ en: 'No specific instructions provided for this task.', fr: 'Aucune instruction spécifique fournie pour cette tâche.' })}
                                    </div>
                                </div>

                                {/* Photos */}
                                {(job.rawJob?.images || job.rawAccepted?.images) && (job.rawJob?.images || job.rawAccepted?.images)!.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-[28px] font-black text-black">{t({ en: 'Photos', fr: 'Photos' })}</h3>
                                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                            {(job.rawJob?.images || job.rawAccepted?.images)!.map((img: string, i: number) => (
                                                <div key={i} className="relative w-40 h-40 flex-shrink-0 rounded-[20px] overflow-hidden border border-neutral-100 shadow-sm">
                                                    <img
                                                        src={img}
                                                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                        alt="Task"
                                                        onClick={() => window.open(img, '_blank')}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Location Section */}
                                <section className="space-y-4">
                                    <h3 className="text-[28px] font-black text-black flex items-center gap-2">
                                        <MapPin size={24} className="text-[#00A082]" />
                                        {t({ en: 'Location', fr: 'Lieu' })}
                                    </h3>
                                    <div className="p-5 bg-neutral-50 rounded-[10px] space-y-2">
                                        <p className="text-[17px] font-black text-black">
                                            {job.rawAccepted?.address || job.rawJob?.city || job.city}
                                        </p>
                                        {(job.rawAccepted?.area || job.rawAccepted?.city) && (
                                            <p className="text-[14px] font-medium text-neutral-400 capitalize">
                                                {job.rawAccepted?.area ? `${job.rawAccepted.area}, ` : ''}{job.rawAccepted?.city || job.city}
                                            </p>
                                        )}
                                        {job.rawAccepted?.address && (
                                            <button
                                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.rawAccepted?.address + ', ' + (job.rawAccepted?.area || '') + ', ' + (job.rawAccepted?.city || job.city))}`, '_blank')}
                                                className="text-[14px] font-bold text-[#00A082] mt-2 underline"
                                            >
                                                {t({ en: 'Open in Maps', fr: 'Ouvrir dans Maps' })}
                                            </button>
                                        )}
                                    </div>
                                </section>

                                {/* Payment Method Section */}
                                <section className="space-y-4">
                                    <h3 className="text-[28px] font-black text-black flex items-center gap-2">
                                        <div className="w-10 h-10 flex-shrink-0">
                                            <img src="/Images/Vectors Illu/Currency_VI.webp" className="w-full h-full object-contain" alt="payment" />
                                        </div>
                                        {t({ en: 'Payment Method', fr: 'Paiement' })}
                                    </h3>
                                    <div className="inline-flex px-4 py-2 bg-[#FFC244] text-black text-[15px] font-bold rounded-[12px]">
                                        {job.rawAccepted?.paymentMethod === 'Cash on delivery' || job.rawAccepted?.paymentMethod === 'cash'
                                            ? t({ en: 'Cash on delivery', fr: 'Paiement à la livraison' })
                                            : (job.rawAccepted?.paymentMethod || t({ en: 'Cash on delivery', fr: 'Paiement à la livraison' }))}
                                    </div>
                                    {job.rawAccepted?.bankReceipt && (
                                        <div className="mt-4 p-4 bg-emerald-50 rounded-1xl border border-emerald-100">
                                            <p className="text-[14px] font-black text-[#00A082] flex items-center gap-2 mb-3">
                                                <Check size={16} strokeWidth={3} />
                                                {t({ en: 'Bank receipt attached', fr: 'Reçu bancaire joint' })}
                                            </p>
                                            <div className="w-40 h-52 rounded-xl overflow-hidden border border-emerald-100 bg-white shadow-sm">
                                                <img
                                                    src={job.rawAccepted.bankReceipt}
                                                    alt="Bank Receipt"
                                                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => window.open(job.rawAccepted!.bankReceipt, '_blank')}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </section>

                                {/* Earnings Summary */}
                                <div className="mt-12 bg-[#FFFFFF] relative">
                                    {/* Top ZigZag for Summary */}
                                    <div className="absolute top-0 left-0 right-0 h-[10px] -translate-y-[10px]">
                                        <div className="w-full h-full" style={{
                                            backgroundImage: 'linear-gradient(135deg, transparent 45%, #F5F5F5 45%, #F5F5F5 55%, transparent 55%), linear-gradient(-135deg, transparent 45%, #F5F5F5 45%, #F5F5F5 55%, transparent 55%)',
                                            backgroundSize: '20px 20px',
                                            backgroundRepeat: 'repeat-x'
                                        }} />
                                    </div>

                                    <div className="px-6 py-10 space-y-8">
                                        <h3 className="text-[28px] font-black text-black">{t({ en: 'Earnings Summary', fr: 'Résumé des gains' })}</h3>
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[16px] font-semibold text-black">{t({ en: 'Mission Fee', fr: 'Frais de mission' })}</span>
                                                    <span className="text-[14px] font-light text-black">≈ {job.rawAccepted?.duration || job.rawJob?.duration || '2h-3h'}</span>
                                                </div>
                                                <span className="text-[16px] font-bold text-black tracking-tight">{job.priceLabel} {t({ en: 'MAD', fr: 'MAD' })}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[16px] font-semibold text-black">{t({ en: 'Lbricol Fee', fr: 'Frais Lbricol' })}</span>
                                                    <span className="text-[14px] font-light text-black">15%</span>
                                                </div>
                                                <span className="text-[16px] font-bold text-black tracking-tight">- {(parseFloat(job.priceLabel) * 0.15).toFixed(0)} {t({ en: 'MAD', fr: 'MAD' })}</span>
                                            </div>
                                            <div className="pt-4 border-t border-neutral-100 flex justify-between items-center">
                                                <span className="text-[18px] font-black text-[#00A082]">{t({ en: 'Final Earnings', fr: 'Gains Nets' })}</span>
                                                <span className="text-[20px] font-black text-[#00A082] tracking-tight">{(parseFloat(job.priceLabel) * (1 - COMMISSION_RATE)).toFixed(0)} {t({ en: 'MAD', fr: 'MAD' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fixed Total Footer */}
                    <div className="px-6 md:px-12 py-8 bg-white border-t border-neutral-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[4001]">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[28px] md:text-[32px] font-black text-[#00A082] leading-tight">{t({ en: 'Your Net Payout', fr: 'Tes Gains Nets' })}</span>
                            <span className="text-[28px] md:text-[32px] font-black text-[#00A082] tracking-tighter truncate">{(parseFloat(job.priceLabel) * (1 - COMMISSION_RATE)).toFixed(0)} {t({ en: 'MAD', fr: 'MAD' })}</span>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    };

    return (
        <div className="w-full h-screen overflow-hidden flex flex-col transition-colors duration-300" style={{ backgroundColor: '#FFFFFF' }}>
            <AnimatePresence key="provider-splash-presence">
                {isLoading && <SplashScreen key="provider-splash" />}
            </AnimatePresence>
            {renderJobDetailsModal()}
            <AnimatePresence key="main-app-presence">
                {isMobileLayout && activeNav === 'calendar' && (
                    <header key="bricoler-mobile-header" className="pt-10 pb-3 px-6 flex flex-col flex-none sticky top-0 z-[100] transition-colors duration-300 bg-white border-b border-neutral-100">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-black text-[22px] font-black tracking-tight" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                {activeNav === 'calendar' ? t({ en: 'Missions', fr: 'Missions' }) :
                                    activeNav === 'performance' ? t({ en: 'Performance', fr: 'Performance' }) :
                                        activeNav === 'messages' ? t({ en: 'Messages', fr: 'Messages' }) :
                                            activeNav === 'profile' || activeNav === 'services' ? t({ en: 'Profile', fr: 'Profil' }) :
                                                t({ en: 'Missions', fr: 'Missions' })}
                            </h2>
                            <button
                                onClick={() => setShowNotificationsPage(true)}
                                className="w-10 h-10 flex items-center justify-center text-black relative active:scale-90 transition-transform bg-neutral-50 rounded-full"
                            >
                                <Bell size={22} strokeWidth={2.5} />
                                {mobileNotificationsCount > 0 && (
                                    <span className="absolute top-[10px] right-[10px] h-2.5 w-2.5 rounded-full bg-[#E51B24] border-2 border-white" />
                                )}
                            </button>
                        </div>

                        {activeNav === 'calendar' && (
                            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                                {[
                                    { id: 'activity' as const, label: t({ en: 'Activity', fr: 'Activité' }) },
                                    { id: 'availability' as const, label: t({ en: 'Availability', fr: 'Disponibilité' }) }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setOrdersActiveTab(tab.id as any);
                                            if (activeNav !== 'calendar') setActiveNav('calendar');
                                        }}
                                        className={cn(
                                            "pb-2 text-[15px] transition-all relative shrink-0",
                                            ordersActiveTab === tab.id ? "font-black text-black" : "font-bold text-neutral-400"
                                        )}
                                    >
                                        {tab.label}
                                        {ordersActiveTab === tab.id && (
                                            <motion.div layoutId="orders-header-tab" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#00A082] rounded-t-full" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </header>
                )}

                <main key="provider-main" className={cn(
                    "flex-1 min-h-0 overflow-hidden bg-white",
                    (isMobileLayout && (activeNav === 'jobs' || activeNav === 'calendar')) || activeNav === 'profile' ? "px-0 py-0" : "px-0 py-0"
                )}>
                    {activeNav === 'jobs' && (
                        <motion.div key="jobs-tab-content" className="h-full">
                            {isMobileLayout ? (
                                <div className="relative h-full min-h-0 overflow-y-auto bg-white pb-32 no-scrollbar">
                                    <section className="px-5 pt-4">
                                        {/* ── Month Header ── */}
                                        <div className="relative mb-6 flex items-center justify-start mt-3">
                                            <div
                                                className="relative inline-flex items-center gap-2 cursor-pointer"
                                                onClick={() => setShowMonthPicker(!showMonthPicker)}
                                            >
                                                <span className="text-[20px] font-bold text-black leading-none tracking-tight" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                    {monthLabel}
                                                </span>
                                                <motion.div animate={{ rotate: showMonthPicker ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                                    <ChevronDown size={18} className="text-black stroke-[2.5px] mt-0.5" />
                                                </motion.div>
                                            </div>
                                        </div>

                                        {/* ── Custom Month Picker Dropdown ── */}
                                        <AnimatePresence key="month-picker-presence">
                                            {showMonthPicker && (
                                                <motion.div
                                                    key="month-picker-dropdown"
                                                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                                    transition={{ duration: 0.18 }}
                                                    className="absolute inset-x-5 top-14 z-50 bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm"
                                                >
                                                    {/* Year row */}
                                                    <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                                                        <button
                                                            onClick={() => setSelectedMonthDt(new Date(selectedMonthDt.getFullYear() - 1, selectedMonthDt.getMonth(), 1))}
                                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
                                                        >
                                                            <ChevronDown style={{ transform: 'rotate(90deg)' }} size={16} />
                                                        </button>
                                                        <span className="text-[16px] font-black text-neutral-900">{selectedMonthDt.getFullYear()}</span>
                                                        <button
                                                            onClick={() => setSelectedMonthDt(new Date(selectedMonthDt.getFullYear() + 1, selectedMonthDt.getMonth(), 1))}
                                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
                                                        >
                                                            <ChevronDown style={{ transform: 'rotate(-90deg)' }} size={16} />
                                                        </button>
                                                    </div>
                                                    {/* Month grid */}
                                                    <div className="grid grid-cols-4 gap-1 p-3">
                                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => {
                                                            const isCurrentMonth = idx === selectedMonthDt.getMonth();
                                                            const isNow = idx === new Date().getMonth() && selectedMonthDt.getFullYear() === new Date().getFullYear();
                                                            return (
                                                                <button
                                                                    key={m}
                                                                    onClick={() => {
                                                                        setSelectedMonthDt(new Date(selectedMonthDt.getFullYear(), idx, 1));
                                                                        setShowMonthPicker(false);
                                                                    }}
                                                                    className={cn(
                                                                        'h-10 rounded-xl text-[13px] font-bold transition-all',
                                                                        isCurrentMonth
                                                                            ? 'bg-black text-white'
                                                                            : isNow
                                                                                ? 'bg-neutral-100 text-black ring-1 ring-neutral-300'
                                                                                : 'text-neutral-700 hover:bg-neutral-100'
                                                                    )}
                                                                >
                                                                    {m}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {/* Footer */}
                                                    <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-100">
                                                        <button
                                                            onClick={() => { setSelectedMonthDt(new Date()); setShowMonthPicker(false); }}
                                                            className="text-[13px] font-bold text-neutral-500 hover:text-black transition-colors"
                                                        >
                                                            This month
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* ── Stats Block ── */}
                                        <div className="space-y-2.5 max-w-[320px] mx-auto mt-6 mb-2">
                                            {/* Top row: 2 pills */}
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="h-[34px] px-[18px] bg-[#F9F9F9] rounded-full flex items-center justify-center gap-1.5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.02)]">
                                                    <Star size={15} className="fill-[#FFC244] text-[#FFC244] -ml-1" />
                                                    <span className="text-[15px] font-medium text-black mt-0.5" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>{monthAvgRating}</span>
                                                </div>
                                                <div className="h-[34px] px-8 flex-1 bg-[#F9F9F9] rounded-full flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.02)]">
                                                    <span className="text-[13px] font-bold text-black mt-0.5 tracking-wide" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                        {t({ en: 'MAD', fr: 'MAD' })} {monthRevenueNum >= 1000 ? `${(monthRevenueNum / 1000).toFixed(0)}K` : monthRevenueNum}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Occupancy bar */}
                                            <div className="h-[34px] bg-[#F9F9F9] rounded-full overflow-hidden relative shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.02)] flex items-center mx-0.5">
                                                <motion.div
                                                    className="absolute left-0 top-0 bottom-0 bg-[#FFC244] min-w-[16px]"
                                                    initial={{ width: '0%' }}
                                                    animate={{ width: `${Math.max(12, monthOccupancyRate)}%` }}
                                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                                />
                                                <span className="relative z-10 text-black text-[13px] font-medium ml-6 mt-0.5 tracking-wide" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                    {monthOccupancyRate === 0
                                                        ? t({ en: '0% Occupancy Rate', fr: '0% Taux d’occupation' })
                                                        : t({ en: `${monthOccupancyRate}% Occupancy Rate`, fr: `${monthOccupancyRate}% Taux d’occupation` })}
                                                </span>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Craft Filter Chips */}
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 px-5 mb-4">
                                        <button
                                            onClick={() => setActiveCraftFilter('all')}
                                            className={cn(
                                                "px-5 py-2.5 rounded-full text-[13px] font-black transition-all whitespace-nowrap border-1.5",
                                                activeCraftFilter === 'all'
                                                    ? "bg-black border-black text-white"
                                                    : "bg-[#F9F9F9] border-transparent text-neutral-900"
                                            )}
                                        >
                                            {t({ en: 'All', fr: 'Tout' })}
                                        </button>
                                        {selectedServices.map(serviceId => {
                                            const cat = SERVICE_CATEGORIES.find(c => c.id === serviceId);
                                            if (!cat) return null;
                                            return (
                                                <button
                                                    key={`filter-jobs-mobile-${serviceId}`}
                                                    onClick={() => setActiveCraftFilter(serviceId)}
                                                    className={cn(
                                                        "px-5 py-2.5 rounded-full text-[13px] font-black transition-all whitespace-nowrap border-1.5",
                                                        activeCraftFilter === serviceId
                                                            ? "bg-black border-black text-white"
                                                            : "bg-[#F9F9F9] border-transparent text-neutral-900"
                                                    )}
                                                >
                                                    {t(cat.name)}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <section className="bg-white pt-2 pb-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] mb-2 relative z-20">
                                        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar snap-x px-5 mt-6 pb-4">
                                            {programmedAcceptedJobs.filter(rawJob => {
                                                const dateInfo = getJobDateTime(rawJob.time ? `${rawJob.date} at ${rawJob.time}` : rawJob.date);
                                                const dStr = dateInfo.dateLabel;
                                                if (!dStr) return false;

                                                if (dStr.includes(' - ')) {
                                                    const [sStr, eStr] = dStr.split(' - ');
                                                    const s = new Date(sStr);
                                                    const e = new Date(eStr);
                                                    s.setFullYear(new Date().getFullYear()); e.setFullYear(new Date().getFullYear());
                                                    s.setHours(0, 0, 0, 0); e.setHours(0, 0, 0, 0);
                                                    return horizontalSelectedDate >= s && horizontalSelectedDate <= e;
                                                }
                                                const p = new Date(dStr);
                                                p.setFullYear(new Date().getFullYear());
                                                p.setHours(0, 0, 0, 0);
                                                return p.getTime() === horizontalSelectedDate.getTime();
                                            }).length === 0 ? (
                                                <div className="w-[85vw] flex-shrink-0 bg-[#F9F9F9] rounded-[24px] border-2 border-dashed border-neutral-100 flex flex-col items-center justify-center py-10 opacity-60">
                                                    <Calendar size={24} className="text-neutral-300 mb-2" />
                                                    <p className="text-[13px] font-medium text-neutral-400 italic">{t({ en: 'No programmed jobs for this day', fr: 'Aucune mission programmée pour ce jour' })}</p>
                                                </div>
                                            ) : (
                                                programmedAcceptedJobs.filter(rawJob => {
                                                    const dateInfo = getJobDateTime(rawJob.time ? `${rawJob.date} at ${rawJob.time}` : rawJob.date);
                                                    const dStr = dateInfo.dateLabel;
                                                    if (!dStr) return false;

                                                    if (dStr.includes(' - ')) {
                                                        const [sStr, eStr] = dStr.split(' - ');
                                                        const s = new Date(sStr);
                                                        const e = new Date(eStr);
                                                        s.setFullYear(new Date().getFullYear()); e.setFullYear(new Date().getFullYear());
                                                        s.setHours(0, 0, 0, 0); e.setHours(0, 0, 0, 0);
                                                        return horizontalSelectedDate >= s && horizontalSelectedDate <= e;
                                                    }
                                                    const p = new Date(dStr);
                                                    p.setFullYear(new Date().getFullYear());
                                                    p.setHours(0, 0, 0, 0);
                                                    return p.getTime() === horizontalSelectedDate.getTime();
                                                }).map(rawJob => {
                                                    const job = toMobileItem(rawJob, 'accepted');
                                                    return (
                                                        <motion.div
                                                            key={job.id}
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className="snap-center w-[85vw] flex-shrink-0 bg-white rounded-[28px] overflow-hidden border border-neutral-100"
                                                            onClick={() => setViewingJobDetails(job)}
                                                        >
                                                            <div className="relative h-[160px]">
                                                                <img src={job.image || undefined} alt={job.service} className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                                                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full pl-1 pr-3 py-1 border border-white/20">
                                                                        <div className="h-6 w-6 rounded-full border-2 border-white overflow-hidden bg-neutral-200">
                                                                            {job.clientAvatar ? <img src={job.clientAvatar} alt={job.clientName} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-[10px] font-black text-neutral-500">{job.clientName[0]}</div>}
                                                                        </div>
                                                                        <span className="text-white text-[11px] font-bold drop-shadow-sm">{job.clientName}</span>
                                                                    </div>
                                                                    <span className="bg-white text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{job.statusLabel}</span>
                                                                </div>
                                                                <div className="absolute bottom-4 left-4 right-4">
                                                                    <div className="flex items-center gap-1.5 text-white/90 text-[11px] font-bold mb-1">
                                                                        <MapPin size={12} className="text-[#FFC244]" />
                                                                        <span>{job.city}</span>
                                                                    </div>
                                                                    <h4 className="text-[22px] font-black text-white leading-tight" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>{job.service}</h4>
                                                                </div>
                                                            </div>
                                                            <div className="px-5 py-5">
                                                                <div className="flex items-start justify-between mb-4">
                                                                    <div>
                                                                        <p className="text-[13px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">{job.subService}</p>
                                                                        <div className="flex items-center gap-3 text-[13px] text-neutral-700 font-black">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Calendar size={14} className="text-neutral-400" />
                                                                                <span>{job.dateLabel}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Clock size={14} className="text-neutral-400" />
                                                                                <span>{job.timeLabel}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">{t({ en: 'Budget', fr: 'Budget' })}</p>
                                                                        <span className="text-[20px] font-black text-black uppercase" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>{t({ en: 'MAD', fr: 'MAD' })} {job.priceLabel}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedChat(job.rawAccepted!);
                                                                        }}
                                                                        className="h-14 flex-1 rounded-2xl bg-[#FFC244] text-black flex items-center justify-center gap-2.5 text-[15px] font-black shadow-[0_4px_12px_rgba(255,205,44,0.3)] active:scale-95 transition-all"
                                                                    >
                                                                        <MessageSquare size={20} strokeWidth={2.5} />
                                                                        {t({ en: 'Quick Chat', fr: 'Chat rapide' })}
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleUpdateJob(job.rawAccepted!.id!, { status: 'done' });
                                                                        }}
                                                                        className="h-14 w-14 rounded-2xl bg-black text-white flex items-center justify-center active:scale-95 transition-all shadow-lg"
                                                                    >
                                                                        <Check size={24} strokeWidth={3} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </section>


                                    <section className="px-5 pt-7 pb-2 relative z-20 w-full overflow-hidden">
                                        <div className="flex items-center justify-start gap-2 overflow-x-auto no-scrollbar py-2 -mx-5 px-5">
                                            {jobsStatusTabs.map((tab) => (
                                                <button
                                                    key={tab.key}
                                                    onClick={() => setMobileJobsStatus(tab.key)}
                                                    className={cn(
                                                        "relative px-8 h-12 rounded-[24px] text-[15px] font-medium whitespace-nowrap transition-all flex-shrink-0",
                                                        mobileJobsStatus === tab.key
                                                            ? "bg-black text-white"
                                                            : "bg-[#F5F5F5] text-[#555555]"
                                                    )}
                                                >
                                                    {tab.label}
                                                    {tab.count > 0 && (
                                                        <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-[#E51B24] text-white text-[9px] font-bold flex items-center justify-center shadow-[0_0_0_2px_#FFFFFF]">
                                                            {tab.count > 9 ? '9+' : tab.count}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                    {mobileJobsStatus === 'new' && (
                                        <section className="px-5 pt-4">
                                            {isLoading ? (
                                                <div className="h-[480px] rounded-[30px] border border-neutral-200 bg-neutral-200/80 animate-pulse" />
                                            ) : stackedMobileJobs.length === 0 ? (
                                                <div className="h-[480px] rounded-[30px] border border-neutral-100 bg-[#FCFCFC] flex flex-col items-center justify-center text-center px-8 relative overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
                                                    {/* Animated Radar Effect */}
                                                    <div className="relative mb-8 flex items-center justify-center w-48 h-48 mx-auto -mt-8">
                                                        <Lottie animationData={radarAnimation} loop={true} />
                                                    </div>

                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="space-y-2 relative z-10"
                                                    >
                                                        <h3 className="text-[20px] font-black text-black tracking-tight" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                            {t({ en: 'Searching for jobs', fr: 'Recherche de missions' })}
                                                        </h3>
                                                        <p className="text-[13px] font-medium text-neutral-400 max-w-[200px] mx-auto leading-relaxed">
                                                            {t({ en: 'Looking for the best matches in', fr: 'Recherche des meilleures correspondances à' })} <span className="text-black font-bold">{providerCity?.split(' (')[0] || t({ en: 'your area', fr: 'votre zone' })}</span>...
                                                        </p>
                                                    </motion.div>

                                                    {/* Bottom indicator */}
                                                    <div className="absolute bottom-10 flex gap-1">
                                                        {[1, 2, 3].map((i) => (
                                                            <motion.div
                                                                key={i}
                                                                animate={{ opacity: [0.3, 1, 0.3] }}
                                                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                                                className="w-1.5 h-1.5 rounded-full bg-black/20"
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="relative h-[540px] w-full">
                                                    {[...stackedMobileJobs].reverse().map((job, index, stack) => {
                                                        const depth = stack.length - index - 1;
                                                        const isTop = depth === 0;
                                                        const isMarketNew = job.kind === 'market' && job.status === 'new';
                                                        const isProgrammed = job.kind === 'accepted' && job.status === 'programmed';
                                                        const actionsDisabled = !isTop || job.status === 'waiting' || job.status === 'done';
                                                        const canConfirm = isMarketNew || isProgrammed;
                                                        const isExiting = exitingCard?.id === job.id;

                                                        return (
                                                            <motion.article
                                                                key={job.id || `stacked-${index}`}
                                                                onClick={() => !isExiting && setViewingJobDetails(job)}
                                                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                                                animate={isExiting
                                                                    ? {
                                                                        x: exitingCard?.direction === 'right' ? 420 : -420,
                                                                        opacity: 0,
                                                                        rotate: exitingCard?.direction === 'right' ? 18 : -18,
                                                                        scale: 0.85,
                                                                    }
                                                                    : {
                                                                        opacity: isTop ? 1 : 0.9,
                                                                        scale: 1,
                                                                        y: 0,
                                                                        x: 0,
                                                                        rotate: 0,
                                                                    }
                                                                }
                                                                transition={isExiting
                                                                    ? { duration: 0.36, ease: [0.32, 0, 0.67, 0] }
                                                                    : { duration: 0.3, ease: 'easeOut' }
                                                                }
                                                                className={cn(
                                                                    "absolute inset-x-0 top-0 bottom-4 cursor-pointer",
                                                                    job.isUrgent && "animate-pulsating-border"
                                                                )}
                                                                style={{
                                                                    zIndex: 20 - depth,
                                                                    transformOrigin: 'bottom center',
                                                                    transform: isTop
                                                                        ? undefined
                                                                        : `translate3d(-${14 * depth}px, ${6 * depth}px, 0) rotate(-${3 * depth}deg) scale(${1 - 0.04 * depth})`,
                                                                    pointerEvents: isTop ? 'auto' : 'none'
                                                                }}
                                                            >
                                                                <div className="h-full rounded-none overflow-hidden bg-white shadow-[0_6px_18px_rgba(0,0,0,0.09)] flex flex-col">
                                                                    {job.isUrgent && (
                                                                        <div className="bg-red-600 text-white py-2 px-4 text-center">
                                                                            <span className="text-[11px] font-black uppercase tracking-widest animate-pulse">
                                                                                🔥 This is a last chance!! Agree to client&apos;s price
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    <div className="px-3 py-2.5 flex items-start justify-between gap-3 bg-white">
                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                            <div className="h-8 w-8 rounded-full overflow-hidden bg-neutral-200 border border-neutral-300">
                                                                                {job.clientAvatar ? (
                                                                                    <img src={job.clientAvatar || undefined} alt={job.clientName} className="h-full w-full object-cover" />
                                                                                ) : (
                                                                                    <div className="h-full w-full flex items-center justify-center text-neutral-500 text-xs font-black">
                                                                                        {job.clientName.slice(0, 1)}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="truncate text-[14px] leading-tight font-black text-neutral-900" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                                                    {job.clientName}
                                                                                </p>
                                                                                <p className="truncate text-[11px] font-medium text-neutral-500">{job.city}</p>
                                                                            </div>
                                                                        </div>
                                                                        <span className={cn(
                                                                            "h-7 px-4 rounded-[999px] flex items-center justify-center text-[11px] font-bold text-white",
                                                                            job.status === 'new'
                                                                                ? "bg-black"
                                                                                : job.status === 'waiting'
                                                                                    ? "bg-neutral-800"
                                                                                    : job.status === 'programmed'
                                                                                        ? "bg-neutral-700"
                                                                                        : "bg-neutral-400"
                                                                        )}>
                                                                            {job.statusLabel}
                                                                        </span>
                                                                    </div>

                                                                    <div className="relative h-[200px] bg-neutral-200">
                                                                        <img src={job.image || undefined} alt={job.service} className="h-full w-full object-cover" />
                                                                        {job.images && job.images.length > 1 && (
                                                                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
                                                                                {job.images.map((_, i) => (
                                                                                    <div key={i} className={cn(
                                                                                        "h-0.5 w-4 rounded-full bg-white",
                                                                                        i === 0 ? "opacity-100" : "opacity-50"
                                                                                    )} />
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    <div className="px-4 pt-3 pb-6 bg-white flex-1 flex flex-col justify-between">
                                                                        <div>
                                                                            <h4 className="text-[34px] leading-[1.05] tracking-tight font-extrabold text-black" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                                                {job.service}
                                                                            </h4>
                                                                            <p className="mt-0 text-[14px] font-medium text-black">{job.subService}</p>

                                                                            <div className="mt-5 flex items-center justify-between gap-3 text-black">
                                                                                <div className="flex items-center gap-2 font-medium text-[15px]">
                                                                                    <span>{job.dateLabel}</span>
                                                                                    <span className="text-neutral-300">|</span>
                                                                                    <span>{job.timeLabel}</span>
                                                                                </div>
                                                                                <span className="text-[16px] font-medium text-black">
                                                                                    {job.priceLabel} {t({ en: 'MAD', fr: 'MAD' })}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="mt-6 flex items-center justify-between px-2 pb-0">
                                                                            {/* ── Dismiss (swipe left) ── */}
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (actionsDisabled || exitingCard) return;
                                                                                    if (isMarketNew && job.rawJob) {
                                                                                        const rawJob = job.rawJob;
                                                                                        triggerCardExit(rawJob.id, 'left', () => {
                                                                                            setDismissedJobIds((prev) => [...prev, rawJob.id]);
                                                                                        });
                                                                                    } else if (isProgrammed && job.rawAccepted) {
                                                                                        handleCancelJob(job.rawAccepted);
                                                                                    }
                                                                                }}
                                                                                disabled={actionsDisabled}
                                                                                className={cn(
                                                                                    "h-[56px] w-[56px] rounded-full flex items-center justify-center transition-colors",
                                                                                    actionsDisabled
                                                                                        ? "bg-[#F4F4F4] text-neutral-400"
                                                                                        : "bg-[#EAEAEA] text-[#000000]"
                                                                                )}
                                                                            >
                                                                                <X size={24} strokeWidth={1.5} />
                                                                            </button>

                                                                            <div className="flex items-center gap-4">
                                                                                {/* ── Counter Offer ── */}
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (actionsDisabled) return;
                                                                                        if (isMarketNew && job.rawJob) {
                                                                                            handleCounterClick(job.rawJob);
                                                                                        } else if (isProgrammed && job.rawAccepted) {
                                                                                            setSelectedChat(job.rawAccepted);
                                                                                            setActiveNav('messages');
                                                                                        }
                                                                                    }}
                                                                                    disabled={actionsDisabled}
                                                                                    className={cn(
                                                                                        "h-[64px] w-[64px] rounded-full flex items-center justify-center transition-colors",
                                                                                        actionsDisabled
                                                                                            ? "bg-[#F4F4F4] text-neutral-400"
                                                                                            : "bg-[#EAEAEA] text-[#000000]"
                                                                                    )}
                                                                                >
                                                                                    <RefreshCw size={24} strokeWidth={1.5} />
                                                                                </button>
                                                                                {/* ── Accept (swipe right) ── */}
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (!canConfirm || actionsDisabled || exitingCard) return;
                                                                                        if (isMarketNew && job.rawJob) {
                                                                                            const rawJob = job.rawJob;
                                                                                            triggerCardExit(rawJob.id, 'right', () => {
                                                                                                handleAcceptJob(rawJob);
                                                                                                setDismissedJobIds((prev) => [...prev, rawJob.id]);
                                                                                            });
                                                                                        } else if (isProgrammed) {
                                                                                            setActiveNav('calendar');
                                                                                        }
                                                                                    }}
                                                                                    disabled={!canConfirm || actionsDisabled || isSubmittingOffer}
                                                                                    className={cn(
                                                                                        "h-[64px] w-[64px] rounded-full flex items-center justify-center transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.1)]",
                                                                                        (!canConfirm || actionsDisabled)
                                                                                            ? "bg-neutral-200 text-neutral-400 shadow-none border border-neutral-300"
                                                                                            : "bg-black text-white"
                                                                                    )}
                                                                                >
                                                                                    <Check size={26} strokeWidth={1.5} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </motion.article>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </section>
                                    )}
                                    {/* ── Programmed / Done / Waiting → vertical list ── */}
                                    {(mobileJobsStatus === 'programmed' || mobileJobsStatus === 'done' || mobileJobsStatus === 'waiting') && (
                                        <section className="px-4 pt-2 pb-4 space-y-3">
                                            {visibleMobileJobs.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                                    <div className="w-14 h-14 bg-neutral-100 rounded-2xl flex items-center justify-center mb-4">
                                                        {mobileJobsStatus === 'done' ? <CheckCircle2 size={24} className="text-neutral-400" /> : <Clock size={24} className="text-neutral-400" />}
                                                    </div>
                                                    <p className="text-[15px] font-bold text-neutral-400">
                                                        {mobileJobsStatus === 'waiting'
                                                            ? t({ en: 'No pending offers', fr: 'Aucune offre en attente' })
                                                            : mobileJobsStatus === 'programmed'
                                                                ? t({ en: 'No upcoming jobs', fr: 'Aucune mission à venir' })
                                                                : t({ en: 'No completed jobs yet', fr: 'Aucune mission terminée pour le moment' })}
                                                    </p>
                                                </div>
                                            ) : visibleMobileJobs.map((job) => (
                                                <motion.div
                                                    key={job.id || `visible-${job.kind}-${job.status}-${Math.random()}`}
                                                    initial={{ opacity: 0, y: 12 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    onClick={() => setViewingJobDetails(job)}
                                                    className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-neutral-100 cursor-pointer"
                                                >
                                                    {/* Card image strip */}
                                                    <div className="relative h-[130px]">
                                                        <img src={job.image || undefined} alt={job.service} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-7 w-7 rounded-full border-2 border-white overflow-hidden bg-neutral-200">
                                                                    {job.clientAvatar
                                                                        ? <img src={job.clientAvatar} alt={job.clientName} className="h-full w-full object-cover" />
                                                                        : <div className="h-full w-full flex items-center justify-center text-[10px] font-black text-neutral-500">{job.clientName[0]}</div>}
                                                                </div>
                                                                <span className="text-white text-[12px] font-bold drop-shadow">{job.clientName}</span>
                                                            </div>
                                                            <span className={cn(
                                                                'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide',
                                                                job.status === 'waiting' ? 'bg-amber-400 text-white' :
                                                                    job.status === 'programmed' ? 'bg-black text-white' : 'bg-emerald-500 text-white'
                                                            )}>{job.statusLabel}</span>
                                                        </div>
                                                        <div className="absolute bottom-3 left-3">
                                                            <p className="text-white text-[11px] font-medium opacity-80">{job.city}</p>
                                                        </div>
                                                    </div>

                                                    {/* Card body */}
                                                    <div className="px-4 py-3">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <h4 className="text-[18px] font-black text-black leading-tight" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>{job.service}</h4>
                                                                <p className="text-[12px] text-neutral-500 font-medium">{job.subService}</p>
                                                            </div>
                                                            <span className="text-[16px] font-black text-black uppercase">{t({ en: 'MAD', fr: 'MAD' })} {job.priceLabel}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-2 text-[12px] text-neutral-500 font-medium">
                                                            <Clock size={11} />
                                                            <span>{job.dateLabel}</span>
                                                            <span className="text-neutral-300">·</span>
                                                            <span>{job.timeLabel}</span>
                                                        </div>

                                                        {/* ── Per-status action buttons ── */}
                                                        <div className="mt-4 flex items-center gap-3">

                                                            {/* WAITING buttons: Cancel + Chat */}
                                                            {job.status === 'waiting' && job.rawJob && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (job.rawJob) {
                                                                                triggerCardExit(job.rawJob.id, 'left', () =>
                                                                                    setDismissedJobIds((prev) => [...prev, job.rawJob!.id])
                                                                                );
                                                                            }
                                                                        }}
                                                                        title={t({ en: 'Cancel offer', fr: 'Annuler l’offre' })}
                                                                        className="h-11 w-11 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                                                                    >
                                                                        <X size={20} strokeWidth={1.8} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            const syntheticOrder: OrderDetails = {
                                                                                id: job.id,
                                                                                service: job.service,
                                                                                subServiceDisplayName: job.subService,
                                                                                location: job.city,
                                                                                city: job.city,
                                                                                date: job.dateLabel,
                                                                                time: job.timeLabel,
                                                                                price: job.priceLabel,
                                                                                status: 'pending',
                                                                                clientName: job.clientName,
                                                                                clientAvatar: job.clientAvatar,
                                                                            };
                                                                            setSelectedChat(syntheticOrder);
                                                                        }}
                                                                        title={t({ en: 'Chat with client', fr: 'Discuter avec le client' })}
                                                                        className="h-11 flex-1 rounded-full bg-neutral-900 text-white flex items-center justify-center gap-2 text-[13px] font-bold hover:bg-black transition-colors"
                                                                    >
                                                                        <MessageCircle size={16} strokeWidth={1.8} />
                                                                        {t({ en: 'Quick Chat', fr: 'Chat rapide' })}
                                                                    </button>
                                                                </>
                                                            )}

                                                            {/* PROGRAMMED buttons: Redistribute + Chat + Done */}
                                                            {job.status === 'programmed' && job.rawAccepted && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setRedistributeJob(job.rawAccepted!);
                                                                            setShowRedistributeModal(true);
                                                                        }}
                                                                        title={t({ en: 'Redistribute job', fr: 'Redistribuer la mission' })}
                                                                        className="h-11 w-11 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                                                    >
                                                                        <RefreshCw size={20} strokeWidth={1.8} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setSelectedChat(job.rawAccepted!)}
                                                                        title={t({ en: 'Chat', fr: 'Chat' })}
                                                                        className="h-11 w-11 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors"
                                                                    >
                                                                        <MessageCircle size={20} strokeWidth={1.8} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUpdateJob(job.rawAccepted!.id!, { status: 'done' })}
                                                                        title={t({ en: 'Mark as done', fr: 'Marquer comme terminée' })}
                                                                        className="h-11 flex-1 rounded-full bg-black text-white flex items-center justify-center gap-2 text-[13px] font-bold hover:bg-neutral-800 transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                                                                    >
                                                                        <CheckCircle2 size={16} strokeWidth={1.8} />
                                                                        {t({ en: 'Done', fr: 'Terminée' })}
                                                                    </button>
                                                                </>
                                                            )}

                                                            {/* DONE buttons: Chat + Rate Client */}
                                                            {job.status === 'done' && job.rawAccepted && (
                                                                <>
                                                                    <button
                                                                        onClick={() => setSelectedChat(job.rawAccepted!)}
                                                                        title={t({ en: 'Chat', fr: 'Chat' })}
                                                                        className="h-11 w-11 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors"
                                                                    >
                                                                        <MessageCircle size={20} strokeWidth={1.8} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setRateClientJob(job.rawAccepted!);
                                                                            setClientRating(0);
                                                                            setClientRatingComment('');
                                                                            setShowRateClientModal(true);
                                                                        }}
                                                                        title={t({ en: 'Rate client', fr: 'Noter le client' })}
                                                                        className="h-11 flex-1 rounded-full bg-black text-white flex items-center justify-center gap-2 text-[13px] font-bold hover:bg-neutral-800 transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                                                                    >
                                                                        <Star size={16} strokeWidth={1.8} />
                                                                        {t({ en: 'Rate Client', fr: 'Noter le client' })}
                                                                    </button>
                                                                </>
                                                            )}

                                                            {job.status === 'programmed' && !job.rawAccepted?.providerConfirmed && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (job.id) handleConfirmJob(job.id);
                                                                    }}
                                                                    className="flex-1 px-4 py-2.5 bg-black text-white text-[13px] font-bold rounded-full transition-all"
                                                                >
                                                                    {t({ en: 'Confirm Job', fr: 'Confirmer' })}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </section>
                                    )}

                                    {/* Moved Notifications Overlay outside of tabs */}
                                </div>
                            ) : (
                                <div className="h-full min-h-0 flex flex-col gap-7 max-w-[1480px] mx-auto">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-end">
                                        <div className="lg:col-span-4">
                                            <h1
                                                className="text-[52px] md:text-[86px] font-black text-neutral-900 tracking-tight leading-none"
                                                style={{ fontFamily: 'Uber Move, var(--font-sans)' }}
                                            >
                                                Bricoles
                                            </h1>
                                            {/* Deskop Craft Filter Chips */}
                                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mt-6">
                                                <button
                                                    onClick={() => setActiveCraftFilter('all')}
                                                    className={cn(
                                                        "px-6 py-3 rounded-full text-[14px] font-black transition-all whitespace-nowrap border-2",
                                                        activeCraftFilter === 'all'
                                                            ? "bg-black border-black text-white"
                                                            : "bg-white border-neutral-100 text-neutral-900 hover:border-neutral-200"
                                                    )}
                                                >
                                                    {t({ en: 'All Missions', fr: 'Toutes les missions', ar: 'كل المهام' })}
                                                </button>
                                                {selectedServices.map(serviceId => {
                                                    const cat = SERVICE_CATEGORIES.find(c => c.id === serviceId);
                                                    if (!cat) return null;
                                                    return (
                                                        <button
                                                            key={`filter-jobs-desktop-${serviceId}`}
                                                            onClick={() => setActiveCraftFilter(serviceId)}
                                                            className={cn(
                                                                "px-6 py-3 rounded-full text-[14px] font-black transition-all whitespace-nowrap border-2",
                                                                activeCraftFilter === serviceId
                                                                    ? "bg-black border-black text-white"
                                                                    : "bg-white border-neutral-100 text-neutral-900 hover:border-neutral-200"
                                                            )}
                                                        >
                                                            {t(cat.name)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="lg:col-span-8 flex items-end justify-between">
                                            <h2 className="text-[52px] md:text-[86px] font-black text-neutral-900 tracking-tight leading-none">
                                                Calendar
                                            </h2>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 flex-1 min-h-0">
                                        <div className="lg:col-span-4 h-full min-h-0 overflow-y-auto pr-1">
                                            {isLoading ? (
                                                <div className="bg-white rounded-[40px] h-[320px] animate-pulse border border-neutral-100 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-100/60 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                                                </div>
                                            ) : filteredJobs.length === 0 ? (
                                                <div className="bg-white border border-neutral-200 rounded-[32px] p-6 text-left">
                                                    <h3 className="text-xl md:text-3xl font-semibold text-neutral-900">{t({ en: 'No jobs available right now', fr: 'Aucune mission disponible pour le moment' })}</h3>
                                                    <p className="text-neutral-500 mt-2 text-sm md:text-lg font-medium">
                                                        {t({ en: `We’ll notify you as soon as someone needs your skills in ${providerCity || 'your area'}.`, fr: `Nous vous notifierons dès que quelqu’un aura besoin de vos compétences à ${providerCity || 'votre zone'}.` })}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-5 pb-3">
                                                    {filteredJobs.map((job, index) => (
                                                        <JobCard
                                                            key={job.id || `filtered-${index}`}
                                                            job={job}
                                                            onAccept={handleAcceptJob}
                                                            onCounter={handleCounterClick}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="lg:col-span-8 h-full min-h-0 overflow-hidden">
                                            <div className="h-full min-h-0">
                                                <WeekCalendar
                                                    orders={acceptedJobs}
                                                    onUpdateOrder={(idx, updates) => handleUpdateJob(acceptedJobs[idx].id!, updates)}
                                                    onCancelOrder={(idx) => handleCancelJob(acceptedJobs[idx])}
                                                    onNewOrder={() => { window.location.href = '/'; }}
                                                    variant="card"
                                                    userType="provider"
                                                    overlayTopOffset={providerHeaderHeight}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeNav === 'calendar' && (
                        <ProviderOrdersView
                            orders={acceptedJobsSorted}
                            activeTab={ordersActiveTab}
                            setActiveTab={setOrdersActiveTab}
                            onConfirmJob={handleConfirmJob}
                            onRedistributeJob={(order) => {
                                const job = acceptedJobs.find(j => j.id === order.id);
                                if (job) {
                                    setRedistributeJob(job);
                                    setShowRedistributeModal(true);
                                }
                            }}
                            onViewMessages={(jobId) => {
                                const job = availableJobs.find(j => j.id === jobId);
                                if (job) {
                                    setSelectedChat(job as any);
                                    setActiveNav('messages');
                                }
                            }}
                            onSelectOrder={(order) => {
                                const job = availableJobs.find(j => j.id === order.id);
                                if (job) {
                                    setViewingJobDetails(toMobileItem(job, 'market'));
                                    return;
                                }
                                const accepted = acceptedJobs.find(j => j.id === order.id);
                                if (accepted) {
                                    setViewingJobDetails(toMobileItem(accepted, 'accepted'));
                                }
                            }}
                            userData={userData}
                            setUserData={setUserData}
                            horizontalSelectedDate={horizontalSelectedDate}
                            setHorizontalSelectedDate={setHorizontalSelectedDate}
                            handleSaveSlotsManual={handleSaveSlotsManual}
                            AVAILABILITY_SLOTS={AVAILABILITY_SLOTS}
                            TIME_SLOTS={TIME_SLOTS}
                        />
                    )}

                    {
                        activeNav === 'performance' && (
                            <div ref={performanceScrollRef} className="h-full overflow-y-auto pb-10 no-scrollbar">
                                <div className="space-y-6 max-w-4xl mx-auto px-6 pt-10">
                                    {/* Month Selection Header */}
                                    <div className="flex items-center justify-between mb-8">
                                        <div
                                            className="relative inline-flex items-center gap-3 cursor-pointer group"
                                            onClick={() => setShowMonthPicker(!showMonthPicker)}
                                        >
                                            <div className="w-12 h-12 bg-neutral-50 rounded-2xl flex items-center justify-center border border-neutral-100 group-hover:bg-neutral-100 transition-colors">
                                                <Calendar size={20} className="text-black" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">{t({ en: 'Selected Period', fr: 'Période sélectionnée' })}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[20px] font-black text-black leading-none tracking-tight" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                        {monthLabel}
                                                    </span>
                                                    <motion.div animate={{ rotate: showMonthPicker ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                                        <ChevronDown size={18} className="text-black stroke-[2.5px]" />
                                                    </motion.div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setShowNotificationsPage(true)}
                                            className="w-12 h-12 flex items-center justify-center text-black relative active:scale-90 transition-transform bg-neutral-50 rounded-2xl border border-neutral-100"
                                        >
                                            <Bell size={22} strokeWidth={2.5} />
                                            {mobileNotificationsCount > 0 && (
                                                <span className="absolute top-[10px] right-[10px] h-2.5 w-2.5 rounded-full bg-[#E51B24] border-2 border-white" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Monthly Performance Summary */}
                                    {(() => {
                                        const COMMISSION_RATE = 0.15;

                                        // ── All figures are month-scoped via selectedMonthDt ──
                                        const referralBonus = (userData as any)?.bricolerReferralBalance || 0;
                                        const totalEarnings = monthRevenueNum;
                                        const lbricolCommission = Math.round(totalEarnings * COMMISSION_RATE);
                                        const netEarnings = totalEarnings - lbricolCommission + referralBonus;

                                        // Rating: month-scoped AVG; fallback to all-time
                                        const avgRating = monthAvgRating;

                                        const ratingBreakdown = [5, 4, 3, 2, 1].map(star => {
                                            const count = monthRatings.filter(r => Math.round(r) === star).length;
                                            const pct = monthRatings.length > 0 ? Math.round((count / monthRatings.length) * 100) : 0;
                                            return { star, pct };
                                        });

                                        const monthCancelled = monthJobs.filter(j => j.status === 'cancelled').length;
                                        const monthTotal = monthJobs.length;
                                        const completionRate = monthTotal > 0
                                            ? Math.round((monthDoneJobs.length / monthTotal) * 100)
                                            : 0;

                                        // Real Health Score Calculation
                                        const qScore = (Number(avgRating) || 0) / 5; // 0 to 1
                                        const rTotal = monthTotal;
                                        const rDone = monthDoneJobs.length;
                                        const rScore = rTotal > 0 ? rDone / rTotal : 0; // 0 to 1
                                        const vScore = Math.min(rDone / 4, 1); // Max volume reached at 4 jobs per month

                                        // Combined Score: (70% Rating + 30% Reliability) * VolumeFactor
                                        // This ensures users with more done missions have higher scores
                                        const healthScore = Math.round(((qScore * 70) + (rScore * 30)) * vScore);

                                        // Dynamic Status Label
                                        const statusLabel = healthScore >= 90
                                            ? t({ en: 'Elite', fr: 'Élite' })
                                            : healthScore >= 70
                                                ? t({ en: 'Professional', fr: 'Professionnel' })
                                                : healthScore >= 40
                                                    ? t({ en: 'Steady', fr: 'Stable' })
                                                    : rDone > 0
                                                        ? t({ en: 'Active', fr: 'Actif' })
                                                        : t({ en: 'Starter', fr: 'Débutant' });

                                        return (
                                            <div className="space-y-6 max-w-lg mx-auto pb-20 relative">
                                                {/* ── Month Picker Dropdown Overlay ── */}
                                                <AnimatePresence key="performance-month-picker-presence">
                                                    {showMonthPicker && (
                                                        <motion.div
                                                            key="performance-month-picker"
                                                            initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                                            transition={{ duration: 0.18 }}
                                                            className="absolute inset-x-6 top-0 z-[100] bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xl"
                                                        >
                                                            {/* Year row */}
                                                            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                                                                <button
                                                                    onClick={() => setSelectedMonthDt(new Date(selectedMonthDt.getFullYear() - 1, selectedMonthDt.getMonth(), 1))}
                                                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
                                                                >
                                                                    <ChevronDown style={{ transform: 'rotate(90deg)' }} size={16} />
                                                                </button>
                                                                <span className="text-[16px] font-black text-neutral-900">{selectedMonthDt.getFullYear()}</span>
                                                                <button
                                                                    onClick={() => setSelectedMonthDt(new Date(selectedMonthDt.getFullYear() + 1, selectedMonthDt.getMonth(), 1))}
                                                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-neutral-100 transition-colors"
                                                                >
                                                                    <ChevronDown style={{ transform: 'rotate(-90deg)' }} size={16} />
                                                                </button>
                                                            </div>
                                                            {/* Month grid */}
                                                            <div className="grid grid-cols-4 gap-1 p-3">
                                                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => {
                                                                    const isSelectedMonth = idx === selectedMonthDt.getMonth();
                                                                    const isNowMonth = idx === new Date().getMonth() && selectedMonthDt.getFullYear() === new Date().getFullYear();
                                                                    return (
                                                                        <button
                                                                            key={m}
                                                                            onClick={() => {
                                                                                setSelectedMonthDt(new Date(selectedMonthDt.getFullYear(), idx, 1));
                                                                                setShowMonthPicker(false);
                                                                            }}
                                                                            className={cn(
                                                                                'h-10 rounded-xl text-[13px] font-bold transition-all',
                                                                                isSelectedMonth
                                                                                    ? 'bg-black text-white'
                                                                                    : isNowMonth
                                                                                        ? 'bg-neutral-100 text-black ring-1 ring-neutral-300'
                                                                                        : 'text-neutral-700 hover:bg-neutral-100 transition-colors'
                                                                            )}
                                                                        >
                                                                            {m}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                                <AnimatePresence mode="wait">
                                                    {performanceDetail === 'none' ? (
                                                        <motion.div
                                                            key="main-performance"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="space-y-8 pt-20 pb-32"
                                                        >
                                                            {/* HERO SECTION: SIMPLE METRIC */}
                                                            <div className="px-6 relative">
                                                                <button
                                                                    onClick={() => setPerformanceDetail('financial')}
                                                                    className="absolute top-0 right-6 w-12 h-12 bg-[#00A082] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all z-20"
                                                                    title={t({ en: 'Commissions', fr: 'Commissions' })}
                                                                >
                                                                    <Banknote size={24} />
                                                                </button>
                                                                <div className="p-10 bg-white rounded-[15px] border border-[#C5C5C5] flex flex-col items-center text-center">
                                                                    <div className="w-[120px] h-[120px] rounded-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center relative mb-6">
                                                                        <span className="text-[40px] font-[1000] text-black tracking-tighter" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>{healthScore}</span>

                                                                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                                                                            <circle
                                                                                cx="60" cy="60" r="54"
                                                                                fill="none" stroke="#E5E5E5" strokeWidth="8"
                                                                            />
                                                                            <motion.circle
                                                                                cx="60" cy="60" r="54"
                                                                                fill="none" stroke="black" strokeWidth="8"
                                                                                strokeDasharray="339.29"
                                                                                initial={{ strokeDashoffset: 339.29 }}
                                                                                animate={{ strokeDashoffset: 339.29 - (339.29 * healthScore / 100) }}
                                                                                transition={{ duration: 1.2, ease: "easeOut" }}
                                                                                strokeLinecap="round"
                                                                            />
                                                                        </svg>
                                                                    </div>

                                                                    <div className="space-y-1 mb-8">
                                                                        <div className="inline-flex px-3 py-1 bg-black rounded-full mb-2">
                                                                            <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">{statusLabel}</span>
                                                                        </div>
                                                                        <h2 className="text-black text-[22px] font-[1000] tracking-tight">{t({ en: 'Global Performance', fr: 'Performance Globale' })}</h2>
                                                                        <p className="text-neutral-500 text-[13px] font-extrabold leading-relaxed px-4">
                                                                            {healthScore > 80 ? t({ en: 'You are among the top tier providers!', fr: 'Vous faites partie des meilleurs prestataires !' }) : t({ en: 'Complete more missions to boost your score', fr: 'Réalisez plus de missions pour booster votre score' })}
                                                                        </p>
                                                                    </div>

                                                                    <div className="mt-8 grid grid-cols-2 gap-8 w-full border-t border-neutral-200 pt-6">
                                                                        <div>
                                                                            <p className="text-neutral-400 text-[10px] uppercase font-black tracking-widest mb-0.5">{t({ en: 'Missions', fr: 'Missions' })}</p>
                                                                            <p className="text-black text-[16px] font-black">{monthDoneJobs.length}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-neutral-400 text-[10px] uppercase font-black tracking-widest mb-0.5">{t({ en: 'Rating', fr: 'Note' })}</p>
                                                                            <p className="text-black text-[16px] font-black">{Number(avgRating) > 0 ? avgRating : '--'}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* MAIN STATS GRID - MINIMALIST */}
                                                            <div className="px-6 space-y-3">
                                                                <motion.div
                                                                    onClick={() => setPerformanceDetail('financial')}
                                                                    whileTap={{ scale: 0.98 }}
                                                                    className="p-5 bg-white rounded-[13px] border border-[#C5C5C5] cursor-pointer flex items-center justify-between group"
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
                                                                            <Wallet size={24} />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">{t({ en: 'Your earnings', fr: 'Vos gains' })}</p>
                                                                            <div className="flex items-baseline gap-1">
                                                                                <span className="text-[20px] font-black text-black">{netEarnings.toFixed(0)}</span>
                                                                                <span className="text-[12px] font-black text-neutral-300 uppercase">{t({ en: 'MAD', fr: 'MAD' })}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <ChevronRight size={18} className="text-neutral-300 group-hover:text-black transition-colors" />
                                                                </motion.div>

                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <motion.div
                                                                        onClick={() => setPerformanceDetail('reputation')}
                                                                        whileTap={{ scale: 0.98 }}
                                                                        className="p-5 bg-white rounded-[13px] border border-[#C5C5C5] cursor-pointer group"
                                                                    >
                                                                        <Star size={20} className="text-[#FFC244] mb-3" fill="#FFC244" />
                                                                        <p className="text-neutral-500 text-[11px] font-black uppercase tracking-widest mb-0.5">{t({ en: 'Rating', fr: 'Note' })}</p>
                                                                        <span className="text-[20px] font-black text-black">{Number(avgRating) > 0 ? avgRating : '--'}/5</span>
                                                                    </motion.div>

                                                                    <motion.div
                                                                        onClick={() => setPerformanceDetail('operational')}
                                                                        whileTap={{ scale: 0.98 }}
                                                                        className="p-5 bg-white rounded-[13px] border border-[#C5C5C5] cursor-pointer group"
                                                                    >
                                                                        <TrendingUp size={20} className="text-black mb-3" />
                                                                        <p className="text-neutral-400 text-[11px] font-black uppercase tracking-widest mb-0.5">{t({ en: 'Efficiency', fr: 'Efficacité' })}</p>
                                                                        <span className="text-[20px] font-black text-black">{completionRate}%</span>
                                                                    </motion.div>

                                                                    <motion.div
                                                                        onClick={() => setPerformanceDetail('marketing')}
                                                                        whileTap={{ scale: 0.98 }}
                                                                        className="p-5 bg-white rounded-[13px] border border-[#C5C5C5] cursor-pointer opacity-60"
                                                                    >
                                                                        <Eye size={20} className="text-black mb-3" />
                                                                        <p className="text-black text-[11px] font-black uppercase tracking-widest mb-0.5">{t({ en: 'Visibilty', fr: 'Visibilité' })}</p>
                                                                        <span className="text-[20px] font-black text-neutral-400">--</span>
                                                                    </motion.div>


                                                                </div>
                                                            </div>

                                                            {/* TIPS SECTION - SIMPLE CARDS */}
                                                            <div className="space-y-4 pt-4">
                                                                <div className="px-6 flex items-center justify-between">
                                                                    <h3 className="text-[18px] font-[900] text-black tracking-tight">{t({ en: 'Tips on how to make more money on Lbricol', fr: 'Conseils pour gagner plus sur Lbricol' })}</h3>
                                                                    <div className="flex gap-1">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#FFC244]" />
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-100" />
                                                                    </div>
                                                                </div>

                                                                <div className="px-4 overflow-x-auto no-scrollbar flex gap-3 pb-4">
                                                                    {[
                                                                        { id: 'tips-profile', title: t({ en: 'Profile', fr: 'Profil' }), desc: t({ en: 'Get more clicks', fr: 'Plus de clics' }), color: '#F8F9FA', icon: User },
                                                                        { id: 'tips-pricing', title: t({ en: 'Pricing', fr: 'Tarifs' }), desc: t({ en: 'Optimize rates', fr: 'Optimisez prix' }), color: '#F1F3F5', icon: Tag },
                                                                        { id: 'tips-stars', title: t({ en: 'Service', fr: 'Service' }), desc: t({ en: '5-star secrets', fr: 'Secrets 5 étoiles' }), color: '#E9ECEF', icon: Gift },
                                                                        { id: 'tips-visibility', title: t({ en: 'Ranking', fr: 'Classement' }), desc: t({ en: 'Boost ranking', fr: 'Montez en haut' }), color: '#DEE2E6', icon: Eye }
                                                                    ].map((tip) => (
                                                                        <motion.button
                                                                            key={tip.id}
                                                                            onClick={() => setPerformanceDetail(tip.id as any)}
                                                                            whileTap={{ scale: 0.95 }}
                                                                            className="w-[160px] flex-none bg-[#F7F6F6] rounded-[13px] border border-neutral-100 p-5 text-left flex flex-col gap-3"
                                                                        >
                                                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: tip.color }}>
                                                                                <tip.icon size={18} className="text-black/70" />
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="text-[15px] font-black text-neutral-900 leading-none mb-1">{tip.title}</h4>
                                                                                <p className="text-[11px] font-medium text-neutral-400 leading-tight">{tip.desc}</p>
                                                                            </div>
                                                                        </motion.button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* SERVICE BREAKDOWN STRIP */}
                                                            {serviceBreakdown.length > 0 && (
                                                                <div className="space-y-4 pt-6 pb-2">
                                                                    <div className="px-6 flex items-center justify-between">
                                                                        <div>
                                                                            <h3 className="text-[18px] font-[900] text-black tracking-tight">{t({ en: 'My Services', fr: 'Mes Services', ar: 'خدماتي' })}</h3>
                                                                            <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mt-0.5">{t({ en: 'This month breakdown', fr: 'Récap du mois', ar: 'ملخص الشهر' })}</p>
                                                                        </div>
                                                                        <div className="flex gap-1">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#00A082]" />
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-100" />
                                                                        </div>
                                                                    </div>

                                                                    <div className="px-4 overflow-x-auto no-scrollbar flex gap-3 pb-6">
                                                                        {serviceBreakdown.map(({ serviceId, earnings, avgRating, demandScore, jobCount }) => {
                                                                            const cat = SERVICE_CATEGORIES.find(c => c.id === serviceId);
                                                                            const catName = cat ? t(cat.name) : serviceId;
                                                                            const CatIcon = (cat as any)?.icon as React.ElementType | undefined;
                                                                            return (
                                                                                <motion.div
                                                                                    key={serviceId}
                                                                                    initial={{ opacity: 0, y: 16 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    className="w-[190px] flex-none bg-white rounded-[20px] border border-neutral-100 p-5 flex flex-col gap-4 shadow-sm"
                                                                                >
                                                                                    {/* Service header */}
                                                                                    <div className="flex items-center gap-2.5">
                                                                                        <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center">
                                                                                            {CatIcon ? <CatIcon size={20} className="text-black/70" /> : <span className="text-[18px]">🔧</span>}
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <p className="text-[13px] font-black text-black leading-none truncate">{catName}</p>
                                                                                            <p className="text-[10px] font-bold text-neutral-400 mt-0.5">{jobCount} {t({ en: jobCount === 1 ? 'mission' : 'missions', fr: jobCount === 1 ? 'mission' : 'missions', ar: jobCount === 1 ? 'مهمة' : 'مهام' })}</p>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* KPIs */}
                                                                                    <div className="space-y-3">
                                                                                        {/* Earnings */}
                                                                                        <div className="flex items-center justify-between">
                                                                                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Earned', fr: 'Gains', ar: 'الأرباح' })}</span>
                                                                                            <span className="text-[15px] font-black text-black">
                                                                                                {earnings > 0 ? `${earnings.toFixed(0)} MAD` : '--'}
                                                                                            </span>
                                                                                        </div>

                                                                                        {/* Avg Rating */}
                                                                                        <div className="flex items-center justify-between">
                                                                                            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Rating', fr: 'Note', ar: 'التقييم' })}</span>
                                                                                            <div className="flex items-center gap-1">
                                                                                                {avgRating > 0 ? (
                                                                                                    <>
                                                                                                        <Star size={12} fill="#FFC244" className="text-[#FFC244]" />
                                                                                                        <span className="text-[15px] font-black text-black">{avgRating.toFixed(1)}</span>
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <span className="text-[15px] font-black text-neutral-300">--</span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Demand score */}
                                                                                        <div>
                                                                                            <div className="flex items-center justify-between mb-1.5">
                                                                                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'City Demand', fr: 'Demande Ville', ar: 'طلب المدينة' })}</span>
                                                                                                {demandScore === null ? (
                                                                                                    <span className="px-2 py-0.5 bg-[#00A082]/10 text-[#00A082] text-[10px] font-black rounded-full">{t({ en: 'New', fr: 'Nouveau', ar: 'جديد' })}</span>
                                                                                                ) : (
                                                                                                    <span className="text-[15px] font-black text-black">{demandScore}%</span>
                                                                                                )}
                                                                                            </div>
                                                                                            {/* Progress bar */}
                                                                                            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                                                                                <motion.div
                                                                                                    initial={{ width: 0 }}
                                                                                                    animate={{ width: `${demandScore ?? 0}%` }}
                                                                                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                                                                                    className="h-full rounded-full"
                                                                                                    style={{ background: demandScore !== null && demandScore >= 50 ? '#00A082' : demandScore !== null && demandScore > 0 ? '#FFC244' : '#E5E5E5' }}
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </motion.div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div
                                                            key="detail-performance"
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 10 }}
                                                            transition={{ duration: 0.3 }}
                                                            className="bg-white min-h-[100vh] flex flex-col pt-4 relative"
                                                        >
                                                            {/* DETAIL HEADER */}
                                                            <div className="px-6 pt-6 pb-2 flex items-center sticky top-0 z-10 bg-white">
                                                                <button
                                                                    onClick={() => setPerformanceDetail('none')}
                                                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-neutral-100 transition-all hover:scale-105 active:scale-95"
                                                                >
                                                                    <ChevronLeft size={24} className="text-neutral-500" />
                                                                </button>
                                                            </div>

                                                            <div className="p-8 pb-40 space-y-10 overflow-y-auto no-scrollbar flex-1">
                                                                {/* FINANCIAL DETAIL */}
                                                                {performanceDetail === 'financial' && (
                                                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                                        {/* TOP CARD: YOUR EARNINGS */}
                                                                        <div className="p-8 bg-neutral-900 rounded-[28px] relative overflow-hidden group shadow-xl">
                                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                                                                            <div className="relative z-10">
                                                                                <p className="text-white/60 text-[11px] font-black uppercase tracking-widest mb-2">{t({ en: 'Your earnings', fr: 'Vos gains' })}</p>
                                                                                <div className="flex items-center gap-3">
                                                                                    <p className="text-white text-[38px] font-[1000] tracking-tighter">{netEarnings.toFixed(0)} <span className="text-[18px] text-white/40 uppercase">{t({ en: 'MAD', fr: 'MAD' })}</span></p>
                                                                                    <div className="px-2 py-1 bg-emerald-500/20 backdrop-blur-md rounded-lg text-[10px] font-black text-emerald-400 uppercase tracking-tighter">{t({ en: 'Net', fr: 'Net' })}</div>
                                                                                </div>
                                                                                <p className="text-white/70 text-[13px] font-bold mt-4 leading-relaxed">
                                                                                    {t({
                                                                                        en: 'This is the net amount after platform fees based on your completed missions for this period.',
                                                                                        fr: 'C\'est le montant net après frais de plateforme basé sur vos missions terminées pour cette période.'
                                                                                    })}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <div className="p-6 rounded-[24px] border border-neutral-100 bg-neutral-50/50 flex flex-col justify-between h-[120px]">
                                                                                <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Total Gross', fr: 'Brut Total' })}</p>
                                                                                <p className="text-[24px] font-black text-black leading-none">{(totalEarnings).toFixed(0)} <span className="text-[14px] text-neutral-300 uppercase">{t({ en: 'MAD', fr: 'MAD' })}</span></p>
                                                                            </div>
                                                                            <div className="p-6 rounded-[24px] border border-neutral-100 bg-neutral-50/50 flex flex-col justify-between h-[120px]">
                                                                                <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Referral Bonus', fr: 'Bonus Parrainage' })}</p>
                                                                                <p className="text-[24px] font-black text-[#00A082] leading-none">+{referralBonus} <span className="text-[14px] text-[#00A082]/30 uppercase">{t({ en: 'MAD', fr: 'MAD' })}</span></p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid grid-cols-1 gap-4">
                                                                            <div className="p-6 rounded-[24px] border border-neutral-100 bg-neutral-50/50 flex flex-col justify-between h-[100px]">
                                                                                <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Platform Fee', fr: 'Frais Plateforme' })}</p>
                                                                                <p className="text-[24px] font-black text-red-500 leading-none">-{lbricolCommission} <span className="text-[14px] text-red-200 uppercase">{t({ en: 'MAD', fr: 'MAD' })}</span></p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="p-7 bg-black rounded-[15px] text-white shadow-xl shadow-black/20 space-y-6 relative overflow-hidden">
                                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                                                                            <div className="relative z-10">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <p className="text-[12px] font-black text-neutral-400 uppercase tracking-widest">{t({ en: 'Total Due', fr: 'Total dû' })}</p>
                                                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 rounded-full">
                                                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                                                        <span className="text-[10px] font-black text-red-500 uppercase">{t({ en: 'Pending', fr: 'En attente' })}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <p className="text-[36px] font-[1000] tracking-tighter">{lbricolCommission} {t({ en: 'MAD', fr: 'MAD' })}</p>
                                                                            </div>

                                                                            <div className="pt-4 space-y-4 border-t border-white/10 relative z-10">
                                                                                <p className="text-[13px] font-bold text-neutral-300">{t({ en: 'Bank Transfer Details:', fr: 'Détails du virement :' })}</p>
                                                                                <div className="space-y-3 bg-white/5 rounded-xl p-4">
                                                                                    <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                                                                                        <span className="text-[11px] font-black text-neutral-500 uppercase">{t({ en: 'Name', fr: 'Nom' })}</span>
                                                                                        <span className="text-[14px] font-bold">{t({ en: 'Abdelmalek Tahri', fr: 'Abdelmalek Tahri' })}</span>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-[80px_1fr] gap-2 items-start">
                                                                                        <span className="text-[11px] font-black text-neutral-500 uppercase">{t({ en: 'Bank', fr: 'Banque' })}</span>
                                                                                        <span className="text-[14px] font-bold">{t({ en: 'Al Barid Bank', fr: 'Al Barid Bank' })}</span>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-2 items-center">
                                                                                        <span className="text-[11px] font-black text-neutral-500 uppercase">RIB</span>
                                                                                        <div className="flex items-center justify-between gap-2 bg-black/40 px-3 py-2 rounded-lg border border-white/10 group cursor-pointer" onClick={() => { navigator.clipboard.writeText('350810000000000880844466'); alert(t({ en: 'Copied!', fr: 'Copié !' })); }}>
                                                                                            <span className="text-[11px] sm:text-[12px] font-black font-mono tracking-tight text-neutral-200 break-all">350810000000000880844466</span>
                                                                                            <Copy size={12} className="text-neutral-500 flex-shrink-0" />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="pt-2">
                                                                                    <div className="flex flex-col sm:flex-row gap-3">
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                const input = document.createElement('input');
                                                                                                input.type = 'file';
                                                                                                input.accept = 'image/*';
                                                                                                input.onchange = (e: any) => {
                                                                                                    const file = e.target.files[0];
                                                                                                    if (file) {
                                                                                                        const reader = new FileReader();
                                                                                                        reader.onload = (re) => {
                                                                                                            setSettlementReceipt(re.target?.result as string);
                                                                                                            setSettlementAmount(lbricolCommission);
                                                                                                            showToast({
                                                                                                                variant: 'success',
                                                                                                                title: t({ en: 'Receipt Selected', fr: 'Reçu sélectionné' }),
                                                                                                                description: t({ en: 'Click submit to send for verification.', fr: 'Cliquez sur envoyer pour vérification.' })
                                                                                                            });
                                                                                                        };
                                                                                                        reader.readAsDataURL(file);
                                                                                                    }
                                                                                                };
                                                                                                input.click();
                                                                                            }}
                                                                                            className={cn(
                                                                                                "flex-1 py-4 rounded-xl font-black text-[14px] flex items-center justify-center gap-2 transition-all border-2",
                                                                                                settlementReceipt
                                                                                                    ? "bg-white text-black border-white"
                                                                                                    : "bg-transparent text-white border-white/20 hover:border-white/40"
                                                                                            )}
                                                                                        >
                                                                                            {settlementReceipt ? <PenTool size={18} /> : <CreditCard size={18} />}
                                                                                            {settlementReceipt ? t({ en: 'Modifier', fr: 'Modifier' }) : t({ en: 'Payer cet Hero', fr: 'Payer cet Hero' })}
                                                                                        </button>
                                                                                        {settlementReceipt && (
                                                                                            <button
                                                                                                disabled={isSubmittingSettlement}
                                                                                                onClick={async () => {
                                                                                                    if (!auth.currentUser) return;
                                                                                                    setIsSubmittingSettlement(true);
                                                                                                    try {
                                                                                                        const settlementDoc = await addDoc(collection(db, 'commission_settlements'), {
                                                                                                            bricolerId: auth.currentUser.uid,
                                                                                                            bricolerName: userData?.name || auth.currentUser.displayName || 'Unknown',
                                                                                                            amount: settlementAmount,
                                                                                                            receipt: settlementReceipt,
                                                                                                            status: 'pending',
                                                                                                            month: format(selectedMonthDt, 'yyyy-MM'),
                                                                                                            timestamp: serverTimestamp()
                                                                                                        });

                                                                                                        await addDoc(collection(db, 'admin_notifications'), {
                                                                                                            type: 'commission_paid',
                                                                                                            settlementId: settlementDoc.id,
                                                                                                            bricolerId: auth.currentUser.uid,
                                                                                                            bricolerName: userData?.name || auth.currentUser.displayName || 'Unknown',
                                                                                                            amount: settlementAmount,
                                                                                                            read: false,
                                                                                                            createdAt: serverTimestamp()
                                                                                                        });

                                                                                                        setSettlementReceipt(null);
                                                                                                        showToast({
                                                                                                            variant: 'success',
                                                                                                            title: t({ en: 'Submission Received!', fr: 'Envoi reçu !' }),
                                                                                                            description: t({ en: 'Admin will verify and update your status within 24h.', fr: 'L\'admin vérifiera et mettra à jour votre statut sous 24h.' })
                                                                                                        });
                                                                                                    } catch (error) {
                                                                                                        console.error('Error submitting settlement:', error);
                                                                                                        showToast({ variant: 'error', title: 'Error', description: 'Failed to submit. Please try again.' });
                                                                                                    } finally {
                                                                                                        setIsSubmittingSettlement(false);
                                                                                                    }
                                                                                                }}
                                                                                                className="flex-1 py-4 bg-[#00A082] hover:bg-[#008C74] text-white rounded-xl font-black text-[14px] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                                                                            >
                                                                                                {isSubmittingSettlement ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                                                                                                {t({ en: 'Envoyer', fr: 'Envoyer' })}
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                    <p className="text-center text-[10px] text-neutral-500 mt-3 uppercase font-black tracking-widest">{t({ en: 'Verification time: ~24 hours', fr: 'Délai de vérification : ~24 heures' })}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* OPERATIONAL DETAIL */}
                                                                {performanceDetail === 'operational' && (
                                                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                                        <div className="bg-neutral-50 p-8 rounded-[32px] border border-neutral-100 relative overflow-hidden group">
                                                                            <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-6">{t({ en: 'Reliability Score', fr: 'Score de Fiabilité' })}</p>
                                                                            <div className="flex items-center justify-between mb-8">
                                                                                <div>
                                                                                    <span className="text-[40px] font-[900] leading-none text-black">{completionRate}%</span>
                                                                                    <div className="flex items-center gap-2 mt-2">
                                                                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                                                        <span className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider">{completionRate >= 90 ? t({ en: 'High Stability', fr: 'Haute stabilité' }) : t({ en: 'Standard', fr: 'Standard' })}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="w-14 h-14 rounded-full bg-white border border-neutral-100 flex items-center justify-center">
                                                                                    <TrendingUp size={20} className="text-black" />
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                                                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${completionRate}%` }} className="h-full bg-[#00A082]" />
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid grid-cols-1 gap-4">
                                                                            <div className="p-7 bg-neutral-50 rounded-[32px] border border-neutral-100 flex flex-col justify-between h-[140px]">
                                                                                <div className="w-10 h-10 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center mb-2">
                                                                                    <Check size={18} className="text-emerald-500" />
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Month Done', fr: 'Terminées ce mois' })}</p>
                                                                                    <p className="text-[26px] font-black text-black">{monthDoneJobs.length}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="p-6 bg-neutral-50 rounded-[24px] border border-neutral-100 flex items-center gap-4">
                                                                            <div className="w-10 h-10 bg-white border border-neutral-100 rounded-xl flex items-center justify-center flex-none">
                                                                                <Info size={18} className="text-neutral-400" />
                                                                            </div>
                                                                            <p className="text-[12px] font-medium text-neutral-500 leading-tight">
                                                                                {t({
                                                                                    en: 'Cancellations impact your search rank. Keep your rate above 90% for maximum visibility.',
                                                                                    fr: 'Les annulations impactent votre classement. Gardez un taux au-dessus de 90% pour une visibilité maximale.'
                                                                                })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* REPUTATION DETAIL */}
                                                                {performanceDetail === 'reputation' && (
                                                                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                                        <div className="flex flex-col items-center text-center py-4">
                                                                            <div className="text-[64px] font-[900] tracking-tighter leading-none text-black mb-2">{Number(avgRating) > 0 ? avgRating : '--'}</div>
                                                                            <div className="flex gap-1.5 mb-4">
                                                                                {Array.from({ length: 5 }).map((_, i) => (
                                                                                    <Star key={i} size={24} className={cn(i < Math.floor(Number(avgRating)) ? "text-[#FFC244] fill-[#FFC244]" : "text-neutral-100 fill-neutral-100")} />
                                                                                ))}
                                                                            </div>
                                                                            <div className="px-4 py-1.5 bg-emerald-50 rounded-full text-[12px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100">
                                                                                {Number(avgRating) >= 4.5
                                                                                    ? t({ en: 'Excellent Quality', fr: 'Qualité excellente' })
                                                                                    : t({ en: 'Needs Focus', fr: 'À améliorer' })}
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-5 bg-neutral-50 p-8 rounded-[32px] border border-neutral-100">
                                                                            <h4 className="text-[13px] font-black uppercase tracking-widest text-neutral-400 mb-2">{t({ en: 'Rating Distribution', fr: 'Distribution des Notes' })}</h4>
                                                                            {ratingBreakdown.map(rb => (
                                                                                <div key={rb.star} className="flex items-center gap-4">
                                                                                    <div className="flex items-center gap-1 w-8">
                                                                                        <span className="text-[14px] font-black">{rb.star}</span>
                                                                                        <Star size={12} className="text-neutral-300 fill-neutral-300" />
                                                                                    </div>
                                                                                    <div className="flex-1 h-3 bg-white rounded-full overflow-hidden border border-neutral-100">
                                                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${rb.pct}%` }} className="h-full bg-[#FFC244]" />
                                                                                    </div>
                                                                                    <span className="text-[12px] font-black text-neutral-400 w-10 text-right">{rb.pct}%</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>

                                                                        <div className="p-6 bg-white border border-neutral-100 rounded-[32px]">
                                                                            <p className="text-[14px] font-bold text-neutral-800 mb-2">{t({ en: 'Recent Reviews', fr: 'Avis Récents' })}</p>
                                                                            <p className="text-[13px] font-medium text-neutral-400 leading-relaxed italic">
                                                                                &quot;{monthRatings.length > 0 ? t({ en: 'You have solid feedback from your clients this month.', fr: 'Vous avez de bons retours de vos clients ce mois-ci.' }) : t({ en: 'No reviews yet for this month. Complete more tasks to earn stars!', fr: 'Pas encore d\'avis ce mois-ci. Finalisez plus de tâches pour gagner des étoiles !' })}&quot;
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* MARKETING DETAIL */}
                                                                {performanceDetail === 'marketing' && (
                                                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                                        <div className="bg-[#00A082] p-8 rounded-[32px] text-white relative overflow-hidden shadow-lg shadow-emerald-900/10">
                                                                            <h3 className="text-[18px] font-black mb-2">{t({ en: 'Visibility Metrics', fr: 'Indicateurs de visibilité' })}</h3>
                                                                            <p className="text-white/80 text-[13px] font-medium leading-relaxed">
                                                                                {t({ en: 'We are currently calibrating your search performance data. You will soon see exactly how many times your profile appears in search results.', fr: 'Nous calibrons actuellement vos données de performance dans la recherche. Vous verrez bientôt exactement combien de fois votre profil apparaît dans les résultats.' })}
                                                                            </p>
                                                                            <div className="mt-6 flex items-center gap-3 px-3 py-1.5 bg-white rounded-full w-fit">
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#00A082]" />
                                                                                <span className="text-[10px] font-black uppercase tracking-widest text-[#00A082]">{t({ en: 'BETA Access', fr: 'Accès BÊTA' })}</span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="p-8 border border-neutral-100 rounded-[32px] flex flex-col items-center text-center space-y-4 bg-neutral-50/50">
                                                                            <div className="w-12 h-12 bg-white border border-neutral-100 rounded-full flex items-center justify-center">
                                                                                <TrendingUp size={20} className="text-neutral-300" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[15px] font-black text-neutral-900">{t({ en: 'Reach Data Incoming', fr: 'Données de portée à venir' })}</p>
                                                                                <p className="text-[12px] text-neutral-400 font-medium px-4">{t({ en: 'Complete more missions to unlock depth analytics for your city ranking.', fr: 'Réalisez plus de missions pour débloquer des analyses avancées de votre classement dans la ville.' })}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* GROWTH DETAIL */}
                                                                {performanceDetail === 'growth' && (
                                                                    <div className="space-y-8">
                                                                        <div className="p-8 bg-[#FFC244] rounded-[32px] text-black">
                                                                            <div className="flex items-center gap-4 mb-4">
                                                                                <div className="w-10 h-10 bg-black text-[#FFC244] rounded-xl flex items-center justify-center">
                                                                                    <Zap size={20} />
                                                                                </div>
                                                                                <h3 className="text-[18px] font-black">{t({ en: 'Unlock Rewards', fr: 'Débloquer des récompenses' })}</h3>
                                                                            </div>
                                                                            <p className="text-[13px] font-bold text-black/60 leading-relaxed mb-8">{t({ en: 'Refer other Bricolers and earn 50 MAD for each one who completes their first mission.', fr: 'Parrainez d’autres Bricoleurs et gagnez 50 MAD pour chacun qui termine sa première mission.' })}</p>
                                                                            <button
                                                                                onClick={() => { setPerformanceDetail('none'); setShowPromotePage(true); }}
                                                                                className="w-full py-5 bg-black text-white rounded-[20px] text-[14px] font-black shadow-lg"
                                                                            >
                                                                                {t({ en: 'Open Referrals', fr: 'Ouvrir les parrainages' })}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* OPTIMIZATION TIPS DETAIL VIEWS */}
                                                                {performanceDetail === 'tips-profile' && (
                                                                    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                                                        <div className="w-full h-48 bg-[#F7F6F6] rounded-[32px] flex items-center justify-center relative overflow-hidden border border-neutral-100">
                                                                            <User size={80} className="text-black opacity-5 absolute -right-4 -bottom-4 rotate-12" />
                                                                            <div className="text-center z-10 px-6">
                                                                                <h3 className="text-black text-[24px] font-[900] tracking-tight">{t({ en: 'The Magnet Profile', fr: 'Le Profil Aimant' })}</h3>
                                                                                <p className="text-neutral-500 text-[14px] font-bold">{t({ en: 'Get +35% more client interest', fr: '+35% d\'intérêt client en plus' })}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-8">
                                                                            <div className="space-y-4">
                                                                                <h4 className="text-[14px] font-black uppercase tracking-widest text-neutral-400">{t({ en: 'Step 1: The Bio Formula', fr: 'Étape 1 : La formule de bio' })}</h4>
                                                                                <p className="text-[15px] font-medium text-neutral-600 leading-relaxed border-l-4 border-[#FFC244] pl-5 bg-neutral-50 p-4 rounded-xl">
                                                                                    {t({
                                                                                        en: '"I am a [Niche] expert with [Years] exp. I help clients with [Problem A] and [Problem B]. My goal is [Benefit]."',
                                                                                        fr: '"Je suis expert en [Niche] avec [Années] d\'exp. J\'aide mes clients pour [Problème A] et [Problème B]."'
                                                                                    })}
                                                                                </p>
                                                                            </div>
                                                                            <div className="space-y-4">
                                                                                <h4 className="text-[14px] font-black uppercase tracking-widest text-neutral-400">{t({ en: 'Step 2: Social Proof', fr: 'Étape 2 : La preuve sociale' })}</h4>
                                                                                <p className="text-[15px] font-medium text-neutral-600 leading-relaxed">
                                                                                    {t({ en: 'Adding just 3 high-quality photos of your work increases your trust score by 50%.', fr: 'Ajouter seulement 3 photos de qualité de votre travail augmente votre score de confiance de 50 %.' })}
                                                                                </p>
                                                                            </div>

                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {performanceDetail === 'tips-pricing' && (
                                                                    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                                                        <div className="w-full h-48 bg-[#F7F6F6] rounded-[32px] flex items-center justify-center relative overflow-hidden border border-neutral-100">
                                                                            <Tag size={80} className="text-black opacity-5 absolute -right-4 -bottom-4 rotate-12" />
                                                                            <div className="text-center z-10 px-6">
                                                                                <h3 className="text-black text-[24px] font-[900] tracking-tight">{t({ en: 'Market Legend', fr: 'Légende du Marché' })}</h3>
                                                                                <p className="text-neutral-500 text-[14px] font-bold">{t({ en: 'Master your unit economics', fr: 'Maîtrisez votre rentabilité' })}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-6">
                                                                            <div className="p-6 bg-neutral-50 rounded-[28px] border border-neutral-100 flex gap-4">
                                                                                <div className="w-10 h-10 rounded-full bg-white border border-neutral-100 flex items-center justify-center flex-none">
                                                                                    <TrendingUp size={18} className="text-emerald-600" />
                                                                                </div>
                                                                                <div>
                                                                                    <h4 className="text-[16px] font-black mb-1">{t({ en: 'Competitive Anchoring', fr: 'Positionnement concurrentiel' })}</h4>
                                                                                    <p className="text-[14px] text-neutral-500 leading-relaxed">{t({ en: 'Check similar services in your city. Start 5% lower to build reviews, then scale up once you hit legendary status.', fr: 'Vérifiez les services similaires dans votre ville. Commencez 5 % plus bas pour obtenir des avis, puis augmentez vos tarifs une fois votre statut renforcé.' })}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="p-6 bg-neutral-50 rounded-[28px] border border-neutral-100 flex gap-4">
                                                                                <div className="w-10 h-10 rounded-full bg-white border border-neutral-100 flex items-center justify-center flex-none">
                                                                                    <Zap size={18} className="text-orange-600" />
                                                                                </div>
                                                                                <div>
                                                                                    <h4 className="text-[16px] font-black mb-1">{t({ en: 'Add-on Strategy', fr: 'Stratégie d’options complémentaires' })}</h4>
                                                                                    <p className="text-[14px] text-neutral-500 leading-relaxed">{t({ en: 'Don’t just sell the main task. Suggest maintenance or extra parts for a higher average ticket.', fr: 'Ne vendez pas seulement la tâche principale. Proposez maintenance ou options supplémentaires pour augmenter le panier moyen.' })}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {performanceDetail === 'tips-stars' && (
                                                                    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                                                        <div className="w-full h-48 bg-[#F7F6F6] rounded-[32px] flex items-center justify-center relative overflow-hidden border border-neutral-100">
                                                                            <Star size={80} className="text-black opacity-5 absolute -right-4 -bottom-4 rotate-12" fill="currentColor" />
                                                                            <div className="text-center z-10 px-6">
                                                                                <h3 className="text-black text-[24px] font-[900] tracking-tight">{t({ en: '5-Star Protocol', fr: 'Protocole 5 Étoiles' })}</h3>
                                                                                <p className="text-neutral-500 text-[14px] font-bold">{t({ en: 'Building lifelong clients', fr: 'Fidéliser vos clients à vie' })}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-4">
                                                                            {[
                                                                                { t: t({ en: 'Be Early', fr: 'Soyez en avance' }), d: t({ en: 'Arriving 5 mins early = 4.8 star average.', fr: 'Arriver 5 minutes en avance = moyenne de 4,8 étoiles.' }) },
                                                                                { t: t({ en: 'Clean Up', fr: 'Nettoyez après' }), d: t({ en: 'Never leave tools or dust. The finish is what they remember.', fr: 'Ne laissez jamais d’outils ni de poussière. La finition est ce dont ils se souviennent.' }) },
                                                                                { t: t({ en: 'The Follow Up', fr: 'Le suivi' }), d: t({ en: 'Message 24h later: "Is everything working perfectly?"', fr: 'Envoyez un message 24h plus tard : "Tout fonctionne parfaitement ?"' }) }
                                                                            ].map((item, idx) => (
                                                                                <div key={idx} className="flex items-center gap-4 bg-neutral-50 p-5 rounded-[24px] border border-neutral-100">
                                                                                    <div className="w-8 h-8 rounded-full bg-white border border-neutral-100 text-black flex items-center justify-center font-black text-[12px]">{idx + 1}</div>
                                                                                    <div>
                                                                                        <p className="text-[15px] font-[900]">{item.t}</p>
                                                                                        <p className="text-[13px] text-neutral-400 font-bold">{item.d}</p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {performanceDetail === 'tips-visibility' && (
                                                                    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                                                        <div className="w-full h-48 bg-[#F7F6F6] rounded-[32px] flex items-center justify-center relative overflow-hidden border border-neutral-100">
                                                                            <Eye size={80} className="text-black opacity-5 absolute -right-4 -bottom-4 rotate-12" />
                                                                            <div className="text-center z-10 px-6">
                                                                                <h3 className="text-black text-[24px] font-[900] tracking-tight">{t({ en: 'Ranking Hacker', fr: 'Hacker de Classement' })}</h3>
                                                                                <p className="text-neutral-500 text-[14px] font-bold">{t({ en: 'Master the algorithm', fr: 'Maîtrisez l\'algorithme' })}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="bg-neutral-50 p-8 rounded-[32px] border border-neutral-100 space-y-5">
                                                                            <h4 className="text-black text-[16px] font-black">{t({ en: 'Top Ranking Factors', fr: 'Facteurs clés de classement' })}</h4>
                                                                            <ul className="space-y-4">
                                                                                <li className="flex items-center gap-4 text-[13px] font-bold text-neutral-600">
                                                                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-none">
                                                                                        <Check size={16} />
                                                                                    </div>
                                                                                    {t({ en: 'High completion rate (>90%)', fr: 'Taux d’achèvement élevé (>90%)' })}
                                                                                </li>
                                                                                <li className="flex items-center gap-4 text-[13px] font-bold text-neutral-600">
                                                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-none">
                                                                                        <Zap size={16} />
                                                                                    </div>
                                                                                    {t({ en: 'Response time under 15 mins', fr: 'Temps de réponse inférieur à 15 min' })}
                                                                                </li>
                                                                                <li className="flex items-center gap-4 text-[13px] font-bold text-neutral-600">
                                                                                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center flex-none">
                                                                                        <TrendingUp size={16} />
                                                                                    </div>
                                                                                    {t({ en: 'Frequent commission settlements', fr: 'Règlements de commission fréquents' })}
                                                                                </li>
                                                                            </ul>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>



                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div >
                        )
                    }

                    {
                        activeNav === 'services' && (
                            <motion.div
                                key="services-tab-content"
                                className={cn(
                                    "h-full flex flex-col",
                                    isMobileLayout ? "pb-24" : ""
                                )}>
                                <ProfileView
                                    userData={userData}
                                    setUserData={setUserData}
                                    userName={userData?.name || user?.displayName || 'Bricoler'}
                                    userAvatar={userData?.profilePhotoURL || userData?.avatar || userData?.photoURL || user?.photoURL || undefined}
                                    userEmail={userData?.email || user?.email || undefined}
                                    isBricoler={true}
                                    isAuthenticated={!!user}
                                    variant="provider"
                                    initialView="portfolio"
                                    onBricolerAction={() => {
                                        localStorage.setItem('lbricol_force_client_mode', 'true');
                                        window.location.href = '/';
                                    }}
                                    onOpenLanguage={() => setShowLanguagePopup(true)}
                                    onLogin={() => handleGoogleLogin()}
                                    onLogout={() => auth.signOut()}
                                    onNavigate={(path: string) => {
                                        if (path === '/portfolio') {
                                            setActiveNav('services');
                                        } else if (path === '/edit-profile') {
                                            setSelectedWorkAreas(userData?.workAreas || []);
                                            setShowProfileModal(true);
                                        } else if (path === '/add-services') {
                                            window.location.href = '/onboarding';
                                        } else if (path === '/notifications') {
                                            setShowNotificationsPage(true);
                                        } else if (path === '/promote') {
                                            setShowPromotePage(true);
                                        } else if (path === '/promocodes') {
                                            setShowPromocodesPage(true);
                                        }
                                    }}
                                />
                            </motion.div>
                        )
                    }

                    {
                        activeNav === 'messages' && (
                            <motion.div
                                key="messages-tab-content"
                                className={cn(
                                    "h-full flex flex-col pt-4",
                                    isMobileLayout ? "px-0" : "px-6"
                                )}>
                                {/* Header Section */}
                                <div className={cn(
                                    "flex flex-col gap-6 mb-6",
                                    isMobileLayout ? "px-6" : ""
                                )}>

                                    {/* Search Bar */}
                                    <div className="flex items-center gap-3 bg-neutral-50 rounded-[14px] px-4 py-3 border border-neutral-100">
                                        <Search size={18} className="text-neutral-400" />
                                        <input
                                            type="text"
                                            placeholder={t({ en: 'Search...', fr: 'Rechercher...' })}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="bg-transparent border-none outline-none text-[15px] font-bold text-neutral-900 w-full placeholder:text-neutral-400"
                                        />
                                    </div>

                                    {/* Filter Chips */}
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                                        <button
                                            onClick={() => setActiveCraftFilter('all')}
                                            className={cn(
                                                "px-5 py-2.5 rounded-full text-[13px] font-black transition-all whitespace-nowrap border-1.5",
                                                activeCraftFilter === 'all'
                                                    ? "bg-black border-black text-white"
                                                    : "bg-white border-neutral-100 text-neutral-900"
                                            )}
                                        >
                                            {t({ en: 'All', fr: 'Tout' })}
                                        </button>
                                        {Array.from(new Set(acceptedJobs.map(j => j.service).filter(Boolean))).map(service => (
                                            <button
                                                key={`filter-${service}`}
                                                onClick={() => setActiveCraftFilter(service)}
                                                className={cn(
                                                    "px-5 py-2.5 rounded-full text-[13px] font-black transition-all whitespace-nowrap border-1.5",
                                                    activeCraftFilter === service
                                                        ? "bg-black border-black text-white"
                                                        : "bg-white border-neutral-100 text-neutral-900"
                                                )}
                                            >
                                                {service}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Conversations List */}
                                <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
                                    {acceptedJobs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                                            <div className="w-20 h-20 bg-neutral-50 rounded-[32px] flex items-center justify-center mb-6">
                                                <MessageSquare size={36} className="text-neutral-200" />
                                            </div>
                                            <h2 className="text-xl font-black text-neutral-900 mb-2">{t({ en: 'No messages yet', fr: 'Aucun message pour le moment' })}</h2>
                                            <p className="text-neutral-500 text-sm font-medium max-w-[240px]">{t({ en: 'Messages about your active jobs will appear here.', fr: 'Les messages concernant vos missions actives apparaîtront ici.' })}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            {acceptedJobs
                                                .filter(job => {
                                                    const clientName = (job as any).clientName || '';
                                                    const matchesSearch = clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        job.service.toLowerCase().includes(searchQuery.toLowerCase());
                                                    const matchesFilter = activeCraftFilter === 'all' || job.service === activeCraftFilter;
                                                    return matchesSearch && matchesFilter;
                                                })
                                                .map((job) => (
                                                    <div
                                                        key={job.id || Math.random().toString()}
                                                        onClick={() => setSelectedChat(job)}
                                                        className="px-6 py-5 flex items-start gap-4 hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer border-b border-neutral-50 text-left"
                                                    >
                                                        <div className="w-14 h-14 rounded-[18px] bg-neutral-100 flex-shrink-0 overflow-hidden relative border border-neutral-100">
                                                            <img
                                                                src={job.clientAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${job.id || 'client'}`}
                                                                alt="Client"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-0.5">
                                                                <h3 className="text-[17px] font-black text-neutral-900 truncate">
                                                                    {(job as any).clientName || 'Client'}
                                                                </h3>
                                                                <span className="text-[12px] font-bold text-neutral-400">18/02</span>
                                                            </div>
                                                            <p className="text-[14px] font-medium text-neutral-500 truncate mb-3">
                                                                {t({ en: 'Click to check messages regarding this order...', fr: 'Cliquez pour voir les messages concernant cette commande...' })}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black uppercase tracking-wider">
                                                                    {job.service.toUpperCase()}
                                                                </span>
                                                                <div className="flex items-center gap-1 text-neutral-400">
                                                                    <MapPin size={10} />
                                                                    <span className="text-[11px] font-bold truncate">{job.location}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )
                    }

                    {
                        activeNav === 'profile' && (
                            <motion.div
                                key="profile-tab-content"
                                className={cn(
                                    "h-full flex flex-col",
                                    isMobileLayout ? "pb-24" : ""
                                )}>
                                <ProfileView
                                    userData={userData}
                                    setUserData={setUserData}
                                    userName={userData?.name || user?.displayName || 'Bricoler'}
                                    userAvatar={userData?.profilePhotoURL || userData?.avatar || userData?.photoURL || user?.photoURL || undefined}
                                    userEmail={userData?.email || user?.email || undefined}
                                    isBricoler={true}
                                    isAuthenticated={!!user}
                                    variant="provider"
                                    onBricolerAction={() => {
                                        localStorage.setItem('lbricol_force_client_mode', 'true');
                                        window.location.href = '/';
                                    }}
                                    onOpenLanguage={() => setShowLanguagePopup(true)}
                                    onLogin={() => handleGoogleLogin()}
                                    onLogout={() => auth.signOut()}
                                    onNavigate={(path: string) => {
                                        if (path === '/portfolio') {
                                            setActiveNav('services');
                                        } else if (path === '/edit-profile') {
                                            setSelectedWorkAreas(userData?.workAreas || []);
                                            setShowProfileModal(true);
                                        } else if (path === '/add-services') {
                                            window.location.href = '/onboarding';
                                        } else if (path === '/notifications') {
                                            setShowNotificationsPage(true);
                                        } else if (path === '/promote') {
                                            setShowPromotePage(true);
                                        } else if (path === '/promocodes') {
                                            setShowPromocodesPage(true);
                                        }
                                    }}
                                />
                            </motion.div>
                        )
                    }
                </main >


                {/* ── Redistribute Modal ── */}
                < AnimatePresence key="redistribute-presence" >
                    {
                        showRedistributeModal && redistributeJob && (
                            <motion.div
                                key="redistribute-modal-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[120] flex items-end justify-center p-0"
                            >
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRedistributeModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                                <motion.div
                                    initial={{ y: '100%' }}
                                    animate={{ y: 0 }}
                                    exit={{ y: '100%' }}
                                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                                    className="relative bg-white w-full rounded-t-[32px] p-6 pb-24 shadow-xl border-t border-neutral-100 max-h-[80vh] overflow-y-auto"
                                >
                                    <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-6" />
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
                                            <RefreshCw size={20} className="text-amber-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-[20px] font-black text-neutral-900">{t({ en: 'Redistribute Job', fr: 'Redistribuer la mission' })}</h2>
                                            <p className="text-[12px] text-neutral-500 font-medium">{redistributeJob.service} · {redistributeJob.date}</p>
                                        </div>
                                    </div>

                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5">
                                        <p className="text-[13px] font-bold text-amber-700">{t({ en: '⚠️ Financial Penalty Notice', fr: '⚠️ Avis de pénalité financière' })}</p>
                                        <p className="text-[12px] font-medium text-amber-600 mt-1 leading-relaxed">
                                            {t({ en: 'Redistributing a confirmed job applies a', fr: 'La redistribution d’une mission confirmée applique une' })} <strong>{t({ en: 'penalty deduction', fr: 'déduction de pénalité' })}</strong> {t({ en: 'to your next earnings. Use this only for urgent, genuine circumstances.', fr: 'sur vos prochains gains. Utilisez cela uniquement pour des circonstances urgentes et réelles.' })}
                                        </p>
                                    </div>

                                    <div className="mb-5">
                                        <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'Reason for redistribution *', fr: 'Raison de redistribution *' })}</label>
                                        <textarea
                                            value={redistributeReason}
                                            onChange={(e) => setRedistributeReason(e.target.value)}
                                            placeholder={t({ en: 'Describe your urgent circumstance clearly...', fr: 'Décrivez clairement votre situation urgente...' })}
                                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/10 resize-none min-h-[100px]"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowRedistributeModal(false)}
                                            className="flex-1 h-12 rounded-2xl border border-neutral-200 text-sm font-black text-neutral-600 hover:bg-neutral-50 transition-colors"
                                        >
                                            {t({ en: 'Cancel', fr: 'Annuler' })}
                                        </button>
                                        <button
                                            disabled={!redistributeReason.trim() || isRedistributing}
                                            onClick={async () => {
                                                if (!redistributeReason.trim() || !redistributeJob.id) return;
                                                setIsRedistributing(true);
                                                try {
                                                    await handleUpdateJob(redistributeJob.id, {
                                                        status: 'redistributed_by_provider',
                                                        redistributedBy: user?.uid,
                                                        redistributeReason,
                                                        penaltyApplied: true,
                                                        redistributedAt: new Date().toISOString(),
                                                    });

                                                    // Send notification to client
                                                    try {
                                                        const { sendClientNotification } = await import('@/features/client/components/ClientNotificationsView');
                                                        await sendClientNotification({
                                                            clientId: redistributeJob.clientId!,
                                                            type: 'job_status_update',
                                                            title: t({ en: 'Order Redistributed', fr: 'Commande redistribuée' }),
                                                            body: t({
                                                                en: `${userData?.name || 'Your professional'} had to redistribute your job. Please choose someone else or cancel.`,
                                                                fr: `${userData?.name || 'Votre professionnel'} a dû redistribuer votre mission. Veuillez choisir quelqu'un d'autre ou annuler.`
                                                            }),
                                                            orderId: redistributeJob.id
                                                        });
                                                    } catch (notifErr) {
                                                        console.warn("Failed to notify client about redistribution:", notifErr);
                                                    }

                                                    showToast({ variant: 'info', title: t({ en: 'Job redistributed', fr: 'Mission redistribuée' }), description: t({ en: 'A penalty has been applied to your earnings.', fr: 'Une pénalité a été appliquée à vos revenus.' }) });
                                                    setShowRedistributeModal(false);
                                                    setRedistributeReason('');
                                                } catch (e) {
                                                    showToast({ variant: 'error', title: t({ en: 'Error', fr: 'Erreur' }), description: t({ en: 'Could not redistribute. Please try again.', fr: 'Impossible de redistribuer. Veuillez réessayer.' }) });
                                                } finally {
                                                    setIsRedistributing(false);
                                                }
                                            }}
                                            className="flex-1 h-12 rounded-2xl bg-black text-white text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors"
                                        >
                                            {isRedistributing ? t({ en: 'Processing…', fr: 'En cours…' }) : t({ en: 'Confirm Redistribution', fr: 'Confirmer la redistribution' })}
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >

                {/* ── Rate Client Modal ── */}
                < AnimatePresence key="rate-client-presence" >
                    {
                        showRateClientModal && rateClientJob && (
                            <div key="rate-client-modal" className="fixed inset-0 z-[120] flex items-end justify-center p-0">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRateClientModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                                <motion.div
                                    initial={{ y: '100%' }}
                                    animate={{ y: 0 }}
                                    exit={{ y: '100%' }}
                                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                                    className="relative bg-white w-full rounded-t-[32px] p-6 pb-24 shadow-xl border-t border-neutral-100"
                                >
                                    <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-6" />
                                    <div className="text-center mb-6">
                                        <p className="text-[12px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Rate your client', fr: 'Évaluez votre client' })}</p>
                                        <h2 className="text-[22px] font-black text-neutral-900" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>{rateClientJob.service}</h2>
                                        <p className="text-[13px] font-medium text-neutral-500 mt-1">{rateClientJob.clientName} · {rateClientJob.date}</p>
                                    </div>

                                    {/* Star rating */}
                                    <div className="flex items-center justify-center gap-3 mb-6">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <button key={s} onClick={() => setClientRating(s)} className="transition-transform hover:scale-110 active:scale-95">
                                                <Star
                                                    size={40}
                                                    strokeWidth={1.5}
                                                    className={cn('transition-colors', s <= clientRating ? 'text-black fill-black' : 'text-neutral-300')}
                                                />
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mb-5">
                                        <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'Comment (optional)', fr: 'Commentaire (optionnel)' })}</label>
                                        <textarea
                                            value={clientRatingComment}
                                            onChange={(e) => setClientRatingComment(e.target.value)}
                                            placeholder={t({ en: 'How was the client to work with?', fr: 'Comment était le client ?' })}
                                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/10 resize-none min-h-[80px]"
                                        />
                                    </div>

                                    <button
                                        disabled={clientRating === 0 || isSubmittingRating}
                                        onClick={async () => {
                                            if (clientRating === 0 || !rateClientJob.id) return;
                                            setIsSubmittingRating(true);
                                            try {
                                                await handleUpdateJob(rateClientJob.id, {
                                                    bricolerRating: clientRating,
                                                    bricolerComment: clientRatingComment,
                                                });
                                                confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
                                                showToast({ variant: 'success', title: t({ en: 'Rating submitted!', fr: 'Évaluation envoyée !' }), description: t({ en: 'Thank you for your feedback.', fr: 'Merci pour votre retour.' }) });
                                                setShowRateClientModal(false);
                                            } catch (e) {
                                                showToast({ variant: 'error', title: t({ en: 'Error', fr: 'Erreur' }), description: t({ en: 'Could not submit rating. Try again.', fr: 'Impossible d\'envoyer l\'évaluation. Réessayez.' }) });
                                            } finally {
                                                setIsSubmittingRating(false);
                                            }
                                        }}
                                        className="w-full h-14 rounded-2xl bg-black text-white text-[15px] font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors"
                                    >
                                        {isSubmittingRating ? t({ en: 'Submitting…', fr: 'Envoi…' }) : `${t({ en: 'Submit', fr: 'Envoyer' })} ${clientRating > 0 ? `${clientRating}★` : t({ en: 'Rating', fr: 'l\'évaluation' })}`}
                                    </button>
                                </motion.div>
                            </div>
                        )
                    }
                </AnimatePresence >



                {/* Chat and Other Overlays */}
                <AnimatePresence key="other-overlays-presence">
                    {
                        selectedChat && (
                            <motion.div
                                key="chat-modal-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[110] flex items-center justify-center p-4"
                            >
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedChat(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 30 }}
                                    className="relative bg-white w-full max-w-2xl h-[700px] rounded-[40px] shadow-xl border border-neutral-100 overflow-hidden flex flex-col"
                                >
                                    {/* Chat Header */}
                                    <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-neutral-100 overflow-hidden">
                                                <img src={selectedChat.clientAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedChat.id}`} alt="Client" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-neutral-900 leading-tight">
                                                    {selectedChat.clientName || 'Client'}
                                                </h3>
                                                <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">{t({ en: 'Online', fr: 'En ligne' })}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">

                                            <button onClick={() => setSelectedChat(null)} className="p-2 hover:bg-neutral-50 rounded-full transition-all text-neutral-400 hover:text-neutral-900">
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Chat Context Box */}
                                    <div className="bg-neutral-50 p-4 border-b border-neutral-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-xl border border-neutral-100 shadow-sm">
                                                <Briefcase size={16} className="text-black" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t({ en: 'Subject', fr: 'Objet' })}</p>
                                                <p className="text-xs font-bold text-neutral-900">{selectedChat.service} in {selectedChat.location}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t({ en: 'Agreed Price', fr: 'Prix convenu' })}</p>
                                            <p className="text-xs font-bold text-black">{selectedChat.price} {t({ en: 'MAD', fr: 'MAD' })}</p>
                                        </div>
                                    </div>

                                    {/* Chat Messages */}
                                    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white">
                                        {chatMessages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full opacity-40">
                                                <MessageSquare size={48} className="mb-2" />
                                                <p className="text-sm font-bold">{t({ en: 'No messages yet', fr: 'Aucun message pour l\'instant' })}</p>
                                            </div>
                                        ) : (
                                            chatMessages.map((msg: any) => {
                                                const isProvider = msg.senderId === user?.uid;
                                                return (
                                                    <div key={msg.id} className={cn("flex gap-3 max-w-[85%]", isProvider ? "ml-auto flex-row-reverse" : "")}>
                                                        {!isProvider && (
                                                            <div className="w-8 h-8 rounded-full bg-neutral-100 flex-shrink-0 overflow-hidden mt-auto">
                                                                <img src={selectedChat.clientAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedChat.id}`} alt="Client" />
                                                            </div>
                                                        )}
                                                        <div className={cn(
                                                            "p-4 rounded-3xl",
                                                            isProvider ? "bg-black text-white rounded-br-none" : "bg-neutral-50 text-neutral-900 rounded-bl-none"
                                                        )}>
                                                            <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                                                            <span className={cn("text-[8px] font-bold uppercase mt-1.5 block", isProvider ? "text-white/40 text-right" : "text-neutral-400")}>
                                                                {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Chat Input */}
                                    <div className="p-6 border-t border-neutral-100 bg-white">
                                        <form
                                            onSubmit={handleSubmitChatMessage}
                                            className="relative"
                                        >
                                            <input
                                                type="text"
                                                placeholder={t({ en: 'Write your message...', fr: 'Écrivez votre message...' })}
                                                value={chatMessage}
                                                onChange={(e) => setChatMessage(e.target.value)}
                                                className="w-full pl-6 pr-16 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                                            />
                                            <button
                                                type="submit"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                                            >
                                                <Send size={18} />
                                            </button>
                                        </form>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )
                    }
                    {
                        showCashOutModal && (
                            <div key="cashout-modal" className="fixed inset-0 z-[110] flex items-center justify-center p-6 pb-20 md:pb-6">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCashOutModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                                <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[40px] p-10 shadow-xl border border-neutral-100 overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6">
                                        <button onClick={() => setShowCashOutModal(false)} className="p-2 hover:bg-neutral-50 rounded-full transition-colors text-neutral-400">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <h2 className="text-3xl font-black text-neutral-900 mb-2">{t({ en: 'Request Payout', fr: 'Demande de paiement' })}</h2>
                                    <p className="text-neutral-500 text-sm mb-8 font-medium">{t({ en: 'Choose your preferred withdrawal method. Payouts are usually processed within 24-48 hours.', fr: 'Choisissez votre méthode de retrait préférée. Les paiements sont généralement traités sous 24-48 heures.' })}</p>

                                    <div className="space-y-4 mb-8">
                                        <div
                                            onClick={() => setCashOutMethod('bank')}
                                            className={cn(
                                                "p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between",
                                                cashOutMethod === 'bank' ? "border-black bg-neutral-50" : "border-neutral-100 opacity-60 hover:opacity-100"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl border border-neutral-100 flex items-center justify-center shadow-sm">
                                                    <Wallet size={20} className="text-blue-500" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-neutral-900">{t({ en: 'Bank Transfer (RIB)', fr: 'Virement bancaire (RIB)' })}</p>
                                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t({ en: 'Free • 2 days', fr: 'Gratuit • 2 jours' })}</p>
                                                </div>
                                            </div>
                                            {cashOutMethod === 'bank' && <CheckCircle2 size={20} className="text-black" />}
                                        </div>

                                        <div
                                            onClick={() => setCashOutMethod('wafacash')}
                                            className={cn(
                                                "p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between",
                                                cashOutMethod === 'wafacash' ? "border-black bg-neutral-50" : "border-neutral-100 opacity-60 hover:opacity-100"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl border border-neutral-100 flex items-center justify-center shadow-sm">
                                                    <Navigation size={20} className="text-red-500" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-neutral-900">{t({ en: 'Wafacash / Cash Plus', fr: 'Wafacash / Cash Plus' })}</p>
                                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t({ en: '20 MAD fee • Instant', fr: 'Frais 20 MAD • Instantané' })}</p>
                                                </div>
                                            </div>
                                            {cashOutMethod === 'wafacash' && <CheckCircle2 size={20} className="text-black" />}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'Payout Details', fr: 'Informations de paiement' })}</label>
                                            <textarea
                                                placeholder={cashOutMethod === 'bank' ? t({ en: 'Enter your 24-digit RIB number...', fr: 'Entrez votre numéro RIB de 24 chiffres...' }) : t({ en: 'Enter your Full Name and Phone Number...', fr: 'Entrez votre nom complet et numéro de téléphone...' })}
                                                className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all min-h-[100px] text-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                showToast({
                                                    variant: 'success',
                                                    title: t({ en: 'Payout request sent.', fr: 'Demande de paiement envoyée.' }),
                                                    description: t({ en: 'You will receive a confirmation message shortly.', fr: 'Vous recevrez un message de confirmation prochainement.' })
                                                });
                                                setShowCashOutModal(false);
                                            }}
                                            className="w-full py-5 bg-black text-white font-black rounded-2xl transition-all active:scale-[0.98]"
                                        >
                                            {t({ en: 'Submit Request', fr: 'Envoyer la demande' })}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )
                    }
                    {
                        showProfileModal && (
                            <div key="profile-modal" className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProfileModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                                <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[40px] p-10 shadow-xl border border-neutral-100 overflow-hidden">
                                    <div className="absolute top-0 right-0 p-6">
                                        <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-neutral-50 rounded-full transition-colors text-neutral-400">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <h2 className="text-3xl font-black text-neutral-900 mb-2">{t({ en: 'Profile Settings', fr: 'Paramètres du profil' })}</h2>
                                    <p className="text-neutral-500 text-sm mb-8 font-medium">{t({ en: 'Update your professional details and contact information.', fr: 'Mettez à jour vos informations professionnelles et vos coordonnées.' })}</p>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'Display Name', fr: 'Nom affiché' })}</label>
                                            <input
                                                ref={nameInputRef}
                                                type="text"
                                                defaultValue={userData?.name || user?.displayName || ''}
                                                className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all text-sm"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="relative">
                                                <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'City', fr: 'Ville' })}</label>
                                                <select
                                                    ref={cityInputRef}
                                                    defaultValue={providerCity}
                                                    className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all text-sm appearance-none cursor-pointer hover:bg-neutral-100 font-bold"
                                                >
                                                    <option disabled>{t({ en: 'Select City', fr: 'Choisir une ville' })}</option>
                                                    <option>{t({ en: 'Casablanca', fr: 'Casablanca' })}</option>
                                                    <option>{t({ en: 'Rabat', fr: 'Rabat' })}</option>
                                                    <option>{t({ en: 'Marrakech', fr: 'Marrakech' })}</option>
                                                    <option>{t({ en: 'Tangier', fr: 'Tanger' })}</option>
                                                    <option>{t({ en: 'Essaouira', fr: 'Essaouira' })}</option>
                                                </select>
                                                <div className="absolute right-4 top-[42px] pointer-events-none">
                                                    <ChevronDown size={16} className="text-neutral-400" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'Language', fr: 'Langue' })}</label>
                                                <div className="w-full px-5 py-4 bg-neutral-100 border border-neutral-100 rounded-2xl text-sm opacity-50 cursor-not-allowed flex items-center gap-2">
                                                    <Globe size={14} /> {t({ en: 'English', fr: 'Anglais' })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Work Areas Selector */}
                                        <div>
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">{t({ en: 'Work Areas (Neighborhoods)', fr: 'Zones de travail (quartiers)' })}</label>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {selectedWorkAreas.map(area => (
                                                    <div key={area} className="pl-3 pr-2 py-1.5 bg-neutral-100 rounded-full text-xs font-bold text-neutral-700 flex items-center gap-2 border border-transparent">
                                                        {area}
                                                        <button
                                                            onClick={() => setSelectedWorkAreas(prev => prev.filter(a => a !== area))}
                                                            className="p-1 hover:bg-white rounded-full transition-colors text-neutral-400 hover:text-red-500"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}

                                                <div className="relative inline-block">
                                                    <select
                                                        value=""
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val && !selectedWorkAreas.includes(val)) {
                                                                setSelectedWorkAreas([...selectedWorkAreas, val]);
                                                            }
                                                        }}
                                                        className="appearance-none pl-3 pr-8 py-1.5 bg-black text-white rounded-full text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer outline-none"
                                                    >
                                                        <option value="" disabled>{t({ en: '+ Add Neighborhood', fr: '+ Ajouter un quartier' })}</option>
                                                        {(providerCity ? MOROCCAN_CITIES_AREAS[providerCity] || [] : [])
                                                            .filter(a => !selectedWorkAreas.includes(a))
                                                            .map(a => <option key={a} value={a} className="text-black bg-white">{a}</option>)
                                                        }
                                                    </select>
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                                        <Plus size={12} className="text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Services Section */}
                                        <div>
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">{t({ en: 'My Services', fr: 'Mes services' })}</label>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {tempSelectedServices.map(sId => {
                                                    const s = getServiceById(sId);
                                                    return (
                                                        <div key={sId} className="pl-3 pr-2 py-1.5 bg-neutral-100 rounded-full text-xs font-bold text-neutral-700 flex items-center gap-2 group border border-transparent hover:border-neutral-200 transition-all">
                                                            {s?.icon && <s.icon size={12} className="text-neutral-500" />}
                                                            {s?.name || sId}
                                                            <button
                                                                onClick={() => setTempSelectedServices(prev => prev.filter(id => id !== sId))}
                                                                className="p-1 hover:bg-white rounded-full transition-colors text-neutral-400 hover:text-red-500 hover:shadow-sm"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}

                                                <div className="relative inline-block">
                                                    <select
                                                        value=""
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val && !tempSelectedServices.includes(val)) {
                                                                setTempSelectedServices([...tempSelectedServices, val]);
                                                            }
                                                        }}
                                                        className="appearance-none pl-3 pr-8 py-1.5 bg-black text-white rounded-full text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer outline-none border border-transparent focus:ring-2 focus:ring-offset-1 focus:ring-black"
                                                    >
                                                        <option value="" disabled>{t({ en: '+ Add Service', fr: '+ Ajouter un service' })}</option>
                                                        {getAllServices()
                                                            .filter(s => !tempSelectedServices.includes(s.id))
                                                            .map(s => (
                                                                <option key={s.id} value={s.id} className="text-black bg-white py-1">{s.name}</option>
                                                            ))
                                                        }
                                                    </select>
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                                        <Plus size={12} className="text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-neutral-400 font-medium ml-1">
                                                {t({ en: 'Adding services increases your job visibility.', fr: 'Ajouter des services augmente votre visibilité sur les missions.' })}
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'WhatsApp Number', fr: 'Numéro WhatsApp' })}</label>
                                            <input
                                                ref={whatsappInputRef}
                                                type="tel"
                                                defaultValue={userData?.whatsappNumber || ''}
                                                className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all text-sm"
                                            />
                                        </div>

                                        <div className="pt-4 flex gap-4">
                                            <button
                                                onClick={() => setShowProfileModal(false)}
                                                className="flex-1 py-4 border border-neutral-200 text-neutral-900 font-black rounded-2xl hover:bg-neutral-50 transition-all"
                                            >
                                                {t({ en: 'Cancel', fr: 'Annuler' })}
                                            </button>
                                            <button
                                                disabled={isSavingProfile}
                                                onClick={handleSaveProfile}
                                                className="flex-[2] py-4 bg-black text-white font-black rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40"
                                            >
                                                {isSavingProfile ? <RefreshCw className="animate-spin" size={20} /> : t({ en: 'Save Profile', fr: 'Enregistrer le profil' })}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )
                    }

                    {/* ── Add Service Modal (PicStyle) ── */}
                    {
                        showAddServiceModal && (
                            <div key="add-service-modal" className="fixed inset-0 z-[120] flex items-end justify-center p-0">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddServiceModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                                <motion.div
                                    initial={{ y: '100%' }}
                                    animate={{ y: 0 }}
                                    exit={{ y: '100%' }}
                                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                                    className="relative bg-white w-full rounded-t-[32px] p-6 pb-24 shadow-xl border-t border-neutral-100 max-h-[85vh] overflow-y-auto"
                                >
                                    <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-6" />

                                    <h2 className="text-[24px] font-black text-neutral-900 mb-2" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>{t({ en: 'Offer New Service', fr: 'Proposer un nouveau service' })}</h2>
                                    <p className="text-[13px] font-medium text-neutral-500 mb-8 font-medium">{t({ en: 'Add a new specialty to your profile to receive more job offers.', fr: 'Ajoutez une nouvelle spécialité à votre profil pour recevoir plus d’offres de missions.' })}</p>

                                    <div className="space-y-8">
                                        {/* Step 1: Category */}
                                        <div>
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">{t({ en: 'Select Category', fr: 'Choisir une catégorie' })}</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {getAllServices().filter(s => !selectedServices.includes(s.id)).map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => setNewServiceData({ ...newServiceData, id: s.id, rate: SERVICE_TIER_RATES[s.id]?.suggestedMin || 75 })}
                                                        className={cn(
                                                            "p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-3",
                                                            newServiceData.id === s.id ? "border-black bg-neutral-50 shadow-sm" : "border-neutral-100 hover:border-neutral-200"
                                                        )}
                                                    >
                                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", newServiceData.id === s.id ? "bg-black text-white" : "bg-neutral-100 text-neutral-400")}>
                                                            <s.icon size={20} />
                                                        </div>
                                                        <span className="text-[14px] font-black">{s.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {newServiceData.id && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                                                {/* Step 2: Rate */}
                                                <div>
                                                    <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">{t({ en: 'Your Hourly Rate (MAD)', fr: 'Votre tarif horaire (MAD)' })}</label>
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[12px] font-bold text-neutral-400">{t({ en: 'Low', fr: 'Bas' })}</span>
                                                                <span className="text-[12px] font-black text-black">{newServiceData.rate} {t({ en: 'MAD', fr: 'MAD' })}</span>
                                                                <span className="text-[12px] font-bold text-neutral-400">{t({ en: 'High', fr: 'Élevé' })}</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min={SERVICE_TIER_RATES[newServiceData.id]?.suggestedMin || 50}
                                                                max={SERVICE_TIER_RATES[newServiceData.id]?.suggestedMax || 500}
                                                                value={newServiceData.rate}
                                                                onChange={(e) => setNewServiceData({ ...newServiceData, rate: parseInt(e.target.value) })}
                                                                className="w-full h-1.5 bg-neutral-100 rounded-full appearance-none cursor-pointer accent-black"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Step 3: Pitch */}
                                                <div>
                                                    <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">{t({ en: 'Your Professional Pitch', fr: 'Votre présentation professionnelle' })}</label>
                                                    <textarea
                                                        value={newServiceData.pitch}
                                                        onChange={(e) => setNewServiceData({ ...newServiceData, pitch: e.target.value })}
                                                        placeholder={t({ en: `Describe your experience in ${getServiceById(newServiceData.id)?.name}...`, fr: `Décrivez votre expérience en ${getServiceById(newServiceData.id)?.name}...` })}
                                                        className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all min-h-[120px] text-[15px] font-medium"
                                                    />
                                                    <p className="text-[10px] text-neutral-400 font-medium mt-2 ml-1">{t({ en: 'Example: "I have 5 years of experience in furniture assembly and tiling."', fr: 'Exemple : "J’ai 5 ans d’expérience en montage de meubles et carrelage."' })}</p>
                                                </div>

                                                <button
                                                    disabled={isSavingProfile || newServiceData.pitch.length < 10}
                                                    onClick={handleAddService}
                                                    className="w-full h-14 bg-black text-white rounded-2xl text-[16px] font-black uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] disabled:opacity-40"
                                                >
                                                    {isSavingProfile ? <RefreshCw className="animate-spin" size={20} /> : t({ en: 'List Service', fr: 'Publier le service' })}
                                                </button>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        )
                    }

                    {/* success toast moved inside the main AnimatePresence below */}
                    {/* --- Counter Offer Modal --- */}
                    <AnimatePresence key="counter-offer-presence">
                        {showCounterModal && counterJob && (
                            <div key="counter-modal" className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowCounterModal(false)}
                                    className="absolute inset-0 bg-black/25 backdrop-blur-sm"
                                />

                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96, y: 30 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96, y: 30 }}
                                    className="relative bg-white w-full max-w-[760px] rounded-[40px] p-14 shadow-[0_24px_80px_rgba(0,0,0,0.18)] overflow-hidden"
                                >
                                    <div className="text-left mb-8">
                                        <h2
                                            className="text-[48px] md:text-[56px] font-black text-neutral-900 leading-[1.05]"
                                            style={{ fontFamily: 'Uber Move, var(--font-sans)' }}
                                        >
                                            {t({ en: 'How Much', fr: 'Combien' })}<br />{t({ en: 'do you want?', fr: 'voulez-vous ?' })}
                                        </h2>
                                    </div>

                                    <div className="mb-10">
                                        <div className="relative flex items-baseline gap-3 pb-3 border-b border-neutral-200">
                                            <span className="text-[40px] font-black text-[#BFBFBF] uppercase">{t({ en: 'MAD', fr: 'MAD' })}</span>
                                            <input
                                                type="number"
                                                value={counterPrice}
                                                onChange={(e) => setCounterPrice(e.target.value)}
                                                className="w-full bg-transparent border-none p-0 text-[64px] font-black text-neutral-400 focus:text-neutral-900 focus:ring-0 placeholder-neutral-300 outline-none transition-colors"
                                                placeholder="150"
                                                autoFocus
                                            />
                                        </div>
                                        <p className="mt-3 text-neutral-400 font-semibold text-[14px]">
                                            {t({ en: `Client Suggested ${counterJob.price} MAD`, fr: `Le client propose ${counterJob.price} MAD` })}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-end">
                                        <button
                                            onClick={handleSubmitCounter}
                                            disabled={isSubmittingOffer || !counterPrice}
                                            className="px-12 py-4 bg-black text-white rounded-full font-semibold text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_16px_30px_rgba(0,0,0,0.2)]"
                                        >
                                            {isSubmittingOffer ? t({ en: 'Sending...', fr: 'Envoi...' }) : t({ en: 'Send', fr: 'Envoyer' })}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </AnimatePresence>

                {/* New Job Floating Notification */}
                <AnimatePresence key="new-job-presence">
                    {
                        showNewJobPopup && latestJob && (
                            <motion.div
                                key="new-job-floating-notification"
                                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 100, scale: 0.9 }}
                                className="fixed bottom-24 left-4 right-4 z-[100] md:bottom-10 md:right-10 md:left-auto md:w-[400px]"
                            >
                                <div
                                    className="bg-black text-white p-6 rounded-[32px] shadow-2xl overflow-hidden relative border border-white/10"
                                    style={{
                                        background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
                                    }}
                                >
                                    {/* Animated Background Pulse */}
                                    <motion.div
                                        className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 blur-[80px] rounded-full"
                                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    />

                                    <div className="flex items-start justify-between mb-4 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                                <Briefcase className="text-blue-400" size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-[18px] leading-tight">{t({ en: 'New Job!', fr: 'Nouvelle mission !' })}</h4>
                                                <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">{latestJob.service}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowNewJobPopup(false)}
                                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                        >
                                            <X size={20} className="text-neutral-500" />
                                        </button>
                                    </div>

                                    <div className="space-y-4 relative z-10">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <MapPin size={14} className="text-neutral-400" />
                                                <span className="text-sm font-bold text-neutral-300">{latestJob.location}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{t({ en: 'Offer', fr: 'Offre' })}</p>
                                                <p className="text-xl font-black text-white">{latestJob.price} {t({ en: 'MAD', fr: 'MAD' })}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setActiveNav('jobs');
                                                setShowNewJobPopup(false);
                                                // Optionally scroll to job or highlight it
                                            }}
                                            className="w-full py-4 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >

                <AnimatePresence key="promote-promocodes-presence">
                    {showPromotePage && (
                        <motion.div
                            key="promote_overlay"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="fixed inset-0 z-[200] bg-white lg:absolute lg:inset-auto lg:top-0 lg:right-0 lg:w-[480px] lg:h-full lg:shadow-[-5px_0_30px_rgba(0,0,0,0.1)]"
                        >
                            <PromoteYourselfView
                                currentUser={auth.currentUser}
                                onBack={() => setShowPromotePage(false)}
                                onLogin={handleGoogleLogin}
                            />
                        </motion.div>
                    )}
                    {showPromocodesPage && (
                        <motion.div
                            key="promocodes_overlay"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="fixed inset-0 z-[200] bg-white lg:absolute lg:inset-auto lg:top-0 lg:right-0 lg:w-[480px] lg:h-full lg:shadow-[-5px_0_30px_rgba(0,0,0,0.1)]"
                        >
                            <PromocodesView
                                currentUser={auth.currentUser}
                                onBack={() => setShowPromocodesPage(false)}
                                isBricoler={true}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                <LanguagePreferencePopup
                    key="language-preference-popup"
                    isOpen={showLanguagePopup}
                    onClose={() => setShowLanguagePopup(false)}
                    onSelectLanguage={(lang) => {
                        setLanguage(lang);
                        setShowLanguagePopup(false);
                    }}
                />

                {
                    isMobileLayout && (
                        <div key="mobile-bottom-nav-wrapper">
                            <MobileBottomNav
                                activeTab={activeNav}
                                onTabChange={(tab) => {
                                    setActiveNav(tab as any);
                                    setShowNotificationsPage(false);

                                    // Reset views to main screens when clicking nav
                                    if (tab === 'calendar') setOrdersActiveTab('activity');
                                    if (tab === 'performance') setPerformanceDetail('none');
                                    // ProfileView automatically starts at 'main' if not controlled, 
                                    // but we ensure other overlays are closed
                                    setShowPromotePage(false);
                                    setShowPromocodesPage(false);
                                }}
                                variant="provider"
                            />
                        </div>
                    )
                }

                {/* Notifications Overlay Rendering */}
                <AnimatePresence key="notifications-overlay-presence">
                    {showNotificationsPage && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="fixed inset-0 z-[5000] bg-[#F3F3F3] h-full overflow-y-auto no-scrollbar pb-32"
                        >
                            <div className="sticky top-0 z-10 bg-white px-5 py-4 flex items-center gap-4 border-b border-neutral-100">
                                <button
                                    onClick={() => setShowNotificationsPage(false)}
                                    className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-black hover:bg-neutral-200 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <h2 className="text-[22px] font-black text-black tracking-tight flex-1" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                    {t({ en: 'Notifications', fr: 'Notifications' })}
                                </h2>
                                {mergedNotifications.filter((n: any) => !n.read).length > 0 && (
                                    <span className="h-6 px-3 bg-red-500 text-white rounded-full text-[11px] font-black flex items-center">
                                        {mergedNotifications.filter((n: any) => !n.read).length} {t({ en: 'new', fr: 'nouvelles' })}
                                    </span>
                                )}
                            </div>
                            <div className="px-4 pt-4 pb-24 space-y-3 max-w-[480px] mx-auto">
                                {mergedNotifications.length === 0 ? (
                                    <div className="text-center py-20">
                                        <Bell size={48} className="text-neutral-200 mx-auto mb-4" />
                                        <h3 className="text-[20px] font-black text-neutral-800 mb-1">{t({ en: 'All caught up!', fr: 'Tout est à jour !' })}</h3>
                                        <p className="text-[13px] font-medium text-neutral-400">{t({ en: 'New job alerts and client messages will appear here.', fr: 'Les nouvelles alertes de mission et messages clients apparaîtront ici.' })}</p>
                                    </div>
                                ) : (
                                    mergedNotifications.map((noti: any, index: number) => {
                                        const isNewJob = noti.type === 'new_job';
                                        const isAccepted = noti.type === 'offer_accepted';
                                        const isDeclined = noti.type === 'offer_declined';
                                        const isCounter = noti.type === 'counter_offer_received';
                                        const isMessage = noti.type === 'new_message';

                                        const iconBg = isNewJob ? 'bg-blue-50' : isAccepted ? 'bg-emerald-50' : isDeclined ? 'bg-red-50' : isMessage ? 'bg-indigo-50' : 'bg-neutral-100';
                                        const iconColor = isNewJob ? 'text-blue-500' : isAccepted ? 'text-emerald-500' : isDeclined ? 'text-red-500' : isMessage ? 'text-indigo-500' : 'text-neutral-500';

                                        const title = isNewJob
                                            ? `${t({ en: 'New Job', fr: 'Nouvelle mission' })}: ${noti.serviceName || t({ en: 'Service needed', fr: 'Service demandé' })}`
                                            : isAccepted
                                                ? t({ en: '✅ Offer Accepted!', fr: '✅ Offre acceptée !' })
                                                : isDeclined
                                                    ? t({ en: 'Offer Declined', fr: 'Offre refusée' })
                                                    : isCounter
                                                        ? t({ en: '💰 Counter Offer', fr: '💰 Contre-offre' })
                                                        : isMessage
                                                            ? `${t({ en: 'Message from', fr: 'Message de' })} ${noti.clientName || t({ en: 'Client', fr: 'Client' })}`
                                                            : t({ en: 'Notification', fr: 'Notification' });

                                        const body = isNewJob
                                            ? `${noti.city || ''} · ${t({ en: 'MAD', fr: 'MAD' })} ${noti.price || '?'}`
                                            : isAccepted
                                                ? t({ en: `Your offer for ${noti.serviceName || 'a job'} was accepted!`, fr: `Votre offre pour ${noti.serviceName || 'une mission'} a été acceptée !` })
                                                : isDeclined
                                                    ? t({ en: `Offer declined for ${noti.serviceName || 'a job'}.`, fr: `Offre refusée pour ${noti.serviceName || 'une mission'}.` })
                                                    : isCounter
                                                        ? t({ en: `Client proposed MAD ${noti.price} for ${noti.serviceName || 'a job'}.`, fr: `Le client propose ${noti.price} MAD pour ${noti.serviceName || 'une mission'}.` })
                                                        : isMessage
                                                            ? (noti.message || t({ en: 'Tap to view conversation.', fr: 'Touchez pour voir la conversation.' }))
                                                            : t({ en: 'You have a new update.', fr: 'Vous avez une nouvelle mise à jour.' });

                                        const timeAgo = (() => {
                                            const secs = noti.timestamp?.seconds || 0;
                                            if (!secs) return '';
                                            const diff = Math.floor(Date.now() / 1000 - secs);
                                            if (diff < 60) return `${diff}s ago`;
                                            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                                            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                                            return new Date(secs * 1000).toLocaleDateString();
                                        })();

                                        return (
                                            <div
                                                key={noti.id || `noti-${index}`}
                                                onClick={() => {
                                                    if (isNewJob) { setMobileJobsStatus('new'); setShowNotificationsPage(false); }
                                                    else if (isAccepted || isDeclined || isCounter) { setMobileJobsStatus('waiting'); setShowNotificationsPage(false); }
                                                    else if (isMessage) { setActiveNav('messages'); setShowNotificationsPage(false); }
                                                }}
                                                className={cn(
                                                    'bg-white rounded-2xl p-4 flex gap-3 cursor-pointer active:bg-neutral-50 transition-colors border',
                                                    !noti.read ? 'border-blue-100 shadow-[0_2px_12px_rgba(59,130,246,0.08)]' : 'border-neutral-100'
                                                )}
                                            >
                                                <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0', iconBg)}>
                                                    {isNewJob ? <Briefcase size={18} className={iconColor} /> :
                                                        isAccepted ? <CheckCircle2 size={18} className={iconColor} /> :
                                                            isDeclined ? <X size={18} className={iconColor} /> :
                                                                isMessage ? <MessageCircle size={18} className={iconColor} /> :
                                                                    <Bell size={18} className={iconColor} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className={cn('text-[14px] font-black leading-snug', !noti.read ? 'text-black' : 'text-neutral-800')}>{title}</p>
                                                        <span className="text-[10px] font-bold text-neutral-400 whitespace-nowrap pt-0.5">{timeAgo}</span>
                                                    </div>
                                                    <p className="text-[12px] font-medium text-neutral-500 mt-0.5 line-clamp-2">{body}</p>
                                                    {isNewJob && (
                                                        <span className="inline-flex mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-wide">
                                                            Tap to view
                                                        </span>
                                                    )}
                                                </div>
                                                {!noti.read && (
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </AnimatePresence>
        </div>
    );
}
