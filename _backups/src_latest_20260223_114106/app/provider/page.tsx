"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import radarAnimation from '../../../public/Lottifiles Animation/Radar.json';
import { useLanguage } from '@/context/LanguageContext';
import confetti from 'canvas-confetti';
import OrderCard, { OrderDetails } from '@/components/OrderCard';
import WeekCalendar from '@/components/WeekCalendar';
import ProfileView from '@/components/ProfileView';
import MobileBottomNav from '@/components/MobileBottomNav';
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
    Map,
    X,
    Settings,
    Wallet,
    Globe,
    HelpCircle,
    Users,
    Plus,
    MessageSquare,
    MessageCircle,
    Star,
    Zap,
    Clock,
    CheckCircle2,
    Search,
    Send,
    CreditCard,
    ChevronDown,
    Bell,
    Check,
    Home,
    RefreshCw,
    ChevronLeft,
    Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth, db } from '@/lib/firebase';
import { formatJobDate, formatJobPrice } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import {
    signInWithPopup,
    GoogleAuthProvider,
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
import { getAllServices, getServiceById } from '@/config/services_config';
import { MOROCCAN_CITIES, MOROCCAN_CITIES_AREAS, SERVICE_TIER_RATES } from '@/config/moroccan_areas';

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
    pictures?: string[];
    subService?: string;
    subServiceDisplayName?: string;
    time?: string;
    status: string;
}

interface ServiceCategory {
    id: string;
    name: string;
    icon: any;
}

type MobileJobsStatus = 'new' | 'waiting' | 'programmed' | 'done';

interface MobileJobsViewItem {
    id: string;
    kind: 'market' | 'accepted';
    status: MobileJobsStatus;
    statusLabel: string;
    clientName: string;
    clientAvatar?: string;
    city: string;
    service: string;
    subService: string;
    dateLabel: string;
    timeLabel: string;
    priceLabel: string;
    image: string;
    pictures?: string[];
    rawJob?: Job;
    rawAccepted?: OrderDetails;
    isUrgent?: boolean;
}

// --- Constants & Mock Data ---

const SERVICE_CATEGORIES: ServiceCategory[] = [
    { id: 'handyman', name: 'Handyman', icon: Hammer },
    { id: 'furniture_assembly', name: 'Furniture assembly', icon: Package },
    { id: 'cleaning', name: 'Cleaning', icon: Trash2 },
    { id: 'plumbing', name: 'Plumbing', icon: Droplets },
    { id: 'electricity', name: 'Electricity', icon: Lightbulb },
    { id: 'painting', name: 'Painting', icon: PenTool },
    { id: 'moving', name: 'Moving', icon: Truck },
    { id: 'appliance_installation', name: 'Appliances', icon: Wrench },
    { id: 'mounting', name: 'Mounting', icon: Monitor },
    { id: 'gardening', name: 'Gardening', icon: Leaf },
    { id: 'cooking', name: 'Cooking', icon: Utensils },
    { id: 'meal_prep', name: 'Meal prep', icon: Soup },
    { id: 'babysitting', name: 'Babysitting', icon: Baby },
    { id: 'elderly_assistance', name: 'Elderly care', icon: HeartPulse },
    { id: 'driver', name: 'Driver', icon: Car },
    { id: 'car_rental', name: 'Car rental', icon: Key },
    { id: 'courier', name: 'Courier', icon: PackageCheck },
    { id: 'airport', name: 'Airport', icon: Plane },
    { id: 'transport_city', name: 'City transport', icon: Navigation },
    { id: 'transport_intercity', name: 'Intercity', icon: Map },
];

// --- Helper Functions ---
const normalizeServiceId = (input: string): string => {
    const lowerInput = input.toLowerCase().trim();
    const exactMatch = SERVICE_CATEGORIES.find(s => s.id.toLowerCase() === lowerInput);
    if (exactMatch) return exactMatch.id;
    const nameMatch = SERVICE_CATEGORIES.find(s => s.name.toLowerCase() === lowerInput);
    if (nameMatch) return nameMatch.id;
    const keyMatch = SERVICE_CATEGORIES.find(s => lowerInput.includes(s.id) || s.id.includes(lowerInput));
    if (keyMatch) return keyMatch.id;
    return lowerInput;
};

const getFallbackJobCardImage = (serviceName: string, craft?: string): string => {
    const source = `${serviceName} ${craft || ''}`.toLowerCase();

    if (source.includes('pool') && source.includes('clean')) return '/Images/Job Cards Images/Pool%20Cleaning_job_card.png';
    if (source.includes('paint')) return '/Images/Job Cards Images/Painting_job_card.png';
    if (source.includes('plumb')) return '/Images/Job Cards Images/Plumbing_job_card.png';
    if (source.includes('mov')) return '/Images/Job Cards Images/Moving%20Help_job_card.png';
    if (source.includes('baby')) return '/Images/Job Cards Images/Babysetting_job_card.png';
    if (source.includes('furniture') || source.includes('assembly')) return '/Images/Job Cards Images/Furniture_Assembly_job_card.png';
    if (source.includes('garden')) return '/Images/Job Cards Images/Gardening_job_card.png';
    if (source.includes('clean')) return '/Images/Job Cards Images/Cleaning_job_card.png';
    if (source.includes('electr')) return '/Images/Job Cards Images/Electricity_job_card.png';

    return '/Images/Job Cards Images/Handyman_job_card.png';
};

// --- Main Component ---

const TIME_SLOTS = [
    "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
    "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"
];

export default function ProviderPage() {
    // 1. Data State & Hooks
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [activeNav, setActiveNav] = useState<'jobs' | 'calendar' | 'performance' | 'profile' | 'messages'>('jobs');
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

    // 3. UI Logic State
    const [showNewJobPopup, setShowNewJobPopup] = useState(false);
    const [latestJob, setLatestJob] = useState<any>(null);
    const [activeCraftFilter, setActiveCraftFilter] = useState<string>('all');
    const [pendingJobsCount, setPendingJobsCount] = useState(0);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [showNotificationsPage, setShowNotificationsPage] = useState(false);
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
    const [isMobileLayout, setIsMobileLayout] = useState(false);
    const [exitingCard, setExitingCard] = useState<{ id: string; direction: 'left' | 'right' } | null>(null);
    const [showRedistributeModal, setShowRedistributeModal] = useState(false);
    const [redistributeJob, setRedistributeJob] = useState<OrderDetails | null>(null);
    const [redistributeReason, setRedistributeReason] = useState('');
    const [isRedistributing, setIsRedistributing] = useState(false);
    const [showRateClientModal, setShowRateClientModal] = useState(false);
    const [rateClientJob, setRateClientJob] = useState<OrderDetails | null>(null);
    const [clientRating, setClientRating] = useState(0);
    const [clientRatingComment, setClientRatingComment] = useState('');
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [viewingJobDetails, setViewingJobDetails] = useState<MobileJobsViewItem | null>(null);
    const [tempSelectedServices, setTempSelectedServices] = useState<string[]>([]);
    const [dailySlots, setDailySlots] = useState<{ from: string, to: string }[]>([]);
    const [isSavingSlots, setIsSavingSlots] = useState(false);
    const [showAddServiceModal, setShowAddServiceModal] = useState(false);
    const [newServiceData, setNewServiceData] = useState<{ id: string, rate: number, pitch: string }>({ id: '', rate: 100, pitch: '' });
    const [selectedWorkAreas, setSelectedWorkAreas] = useState<string[]>([]);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isEditingSlots, setIsEditingSlots] = useState(false);

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
        return matchCity;
    }), [availableJobs, providerCity]);

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
    const programmedStatuses = useMemo(() => new Set(['confirmed', 'in_progress', 'accepted', 'pending']), []);
    const programmedAcceptedJobs = useMemo(() => acceptedJobsSorted.filter((job) => programmedStatuses.has(job.status || '')), [acceptedJobsSorted, programmedStatuses]);
    const doneAcceptedJobs = useMemo(() => acceptedJobsSorted.filter((job) => job.status === 'done'), [acceptedJobsSorted]);

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
            status: isMarket ? (raw.offers?.some((o: any) => o.bricolerId === user?.uid) ? 'waiting' : 'new') : (raw.status === 'done' ? 'done' : 'programmed'),
            statusLabel: isMarket ? (raw.offers?.some((o: any) => o.bricolerId === user?.uid) ? 'Waiting Client' : 'New Mission') : (raw.status === 'done' ? 'Completed' : 'Scheduled'),
            clientName: raw.clientName || 'Client',
            clientAvatar: raw.clientAvatar,
            city: isMarket ? raw.city : (raw.city || raw.location || ''),
            service: isMarket ? raw.title : (raw.service || ''),
            subService: isMarket ? (raw.subService || '') : (raw.subServiceDisplayName || ''),
            dateLabel: dateInfo.dateLabel,
            timeLabel: dateInfo.timeLabel,
            priceLabel: isMarket ? formatJobPrice(raw.price) : String(raw.price),
            image: raw.image || '',
            rawJob: isMarket ? raw : undefined,
            rawAccepted: !isMarket ? raw : undefined
        };
    }, [user, formatJobPrice]);

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
                title: 'Profile updated!',
                description: 'Your profile changes have been saved.'
            });
            setShowProfileModal(false);
        } catch (error) {
            console.error('Error saving profile:', error);
            showToast({ variant: 'error', title: 'Error', description: 'Failed to update profile' });
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

    useEffect(() => {
        const syncMobileState = () => setIsMobileLayout(window.innerWidth < 1024);
        syncMobileState();
        window.addEventListener('resize', syncMobileState);
        return () => window.removeEventListener('resize', syncMobileState);
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
                            title = t({ en: "Offer Accepted! 🎉", fr: "Offre Acceptée ! 🎉" });
                            description = t({ en: `Your offer for ${noti.serviceName} was accepted. Check your confirmed jobs.`, fr: `Votre offre pour ${noti.serviceName} a été acceptée. Consultez vos missions confirmées.` });
                            variant = 'success';
                            confetti({
                                particleCount: 150,
                                spread: 70,
                                origin: { y: 0.6 }
                            });
                        } else if (noti.type === 'offer_declined') {
                            title = t({ en: "Offer Declined", fr: "Offre Déclinée" });
                            description = t({ en: `The client declined your offer for ${noti.serviceName}.`, fr: `Le client a décliné votre offre pour ${noti.serviceName}.` });
                            variant = 'error';
                        } else if (noti.type === 'counter_offer_received') {
                            title = t({ en: "New Counter Offer 💰", fr: "Nouvelle Contre-offre 💰" });
                            description = t({ en: `Client sent a counter offer of ${noti.price} MAD for ${noti.serviceName || 'a job'}.`, fr: `Le client a envoyé une contre-offre de ${noti.price} MAD pour ${noti.serviceName || 'une mission'}.` });
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
                        rating: data.rating || 5,
                        description: data.description || data.comment || "No details provided.",
                        timestamp: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'Just now',
                        date: data.date,
                        time: data.time || '',
                        subService: data.subService || '',
                        subServiceDisplayName: data.subServiceDisplayName || '',
                        city: data.city,
                        offers: data.offers || [],
                        status: data.status,
                        image: data.pictures && data.pictures.length > 0 ? data.pictures[0] : undefined,
                        pictures: Array.isArray(data.pictures) ? data.pictures : [],
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
                        date: data.date,
                        time: data.time || "",
                        price: data.price,
                        status: data.status,
                        comment: data.comment,
                        rating: data.rating,
                        feedback: data.feedback,
                        bricolersCount: data.bricolersCount || 1,
                        pictures: Array.isArray(data.pictures) ? data.pictures : [],
                        craft: normalizeServiceId(data.craft || data.service || 'general'),
                        clientName: data.clientName || 'Client',
                        clientId: data.clientId,
                        clientAvatar: data.clientAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.clientId}`
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
                                    // New format: { serviceId, serviceName, subServices }
                                    return s.serviceId || normalizeServiceId(s.serviceName);
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
                title: "Error",
                description: "Failed to save availability"
            });
        } finally {
            setIsSavingSlots(false);
        }
    };


    // 3. Logic Handlers
    const handleUpdateJob = async (id: string, updates: any) => {
        try {
            const jobRef = doc(db, 'jobs', id);

            // --- REFERRAL LOGIC START ---
            if (updates.status === 'done') {
                const jobSnap = await getDoc(jobRef);
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
                                        referralBalance: increment(20)
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

            await updateDoc(jobRef, updates);
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
        } catch (error) {
            console.error('Error updating job:', error);
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
                    title: "Login popup was blocked.",
                    description: "Please allow popups for this site."
                });
            } else if (error.code === 'auth/cancelled-popup-request') {
                console.log("Popup request was cancelled by a new request - this is usually harmless.");
            } else if (error.code === 'auth/popup-closed-by-user') {
                // Silent
            } else {
                showToast({
                    variant: 'error',
                    title: "Login failed.",
                    description: error.message
                });
            }
        } finally {
            setIsLoggingIn(false);
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
                title: 'Service added!',
                description: `${svc?.name} is now active on your profile.`
            });
            setShowAddServiceModal(false);
            setNewServiceData({ id: '', rate: 100, pitch: '' });
        } catch (err) {
            console.error("Error adding service:", err);
            showToast({ variant: 'error', title: 'Error', description: 'Failed to add service' });
        } finally {
            setIsSavingProfile(false);
        }
    };



    const handleAcceptJob = async (job: Job) => {
        if (!user) {
            handleGoogleLogin();
            return;
        }



        if (!userData?.whatsappNumber) {
            setPendingJob(job);
            setShowWhatsAppModal(true);
            return;
        }

        setIsSubmittingOffer(true);
        try {
            const jobRef = doc(db, 'jobs', job.id);
            const providerRef = doc(db, 'bricolers', user.uid);

            const offer = {
                bricolerId: user.uid,
                bricolerName: user.displayName || 'Bricoler',
                avatar: user.photoURL || '',
                rating: userData?.rating || 5.0,
                jobsCount: userData?.completedJobs || 0,
                type: 'accept',
                price: typeof job.price === 'string' ? parseFloat(job.price.replace(/[^0-9.]/g, '')) : job.price,
                timestamp: Timestamp.now()
            };

            // Push offer to array
            await updateDoc(jobRef, {
                offers: arrayUnion(offer)
            });



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
                    title: 'Offer not sent.',
                    description: 'This job may no longer be available.'
                });
            } else {
                showToast({ variant: 'error', title: 'Failed to send offer.', description: 'Please try again.' });
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
                avatar: user.photoURL || '',
                rating: userData?.rating || 5.0,
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
                    title: 'Counter offer not sent.',
                    description: 'This job may no longer be available.'
                });
            } else {
                showToast({ variant: 'error', title: 'Failed to send offer.', description: 'Please try again.' });
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
                    <img src={job.image} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-[17px] font-black text-neutral-900 truncate tracking-tight">{job.service}</h4>
                        <span className="text-[15px] font-black text-[#00A082]">MAD {job.priceLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 text-[12px] font-bold">
                        <span className="truncate">{job.clientName}</span>
                        <span>•</span>
                        <span>{job.dateLabel} {job.timeLabel && `at ${job.timeLabel}`}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        {isNew && <span className="px-3 py-1 bg-red-50 text-red-500 text-[10px] font-black rounded-full uppercase">Action Required</span>}
                        {isWaiting && <span className="px-3 py-1 bg-amber-50 text-amber-500 text-[10px] font-black rounded-full uppercase">Waiting Client</span>}
                        {isProgrammed && <span className="px-3 py-1 bg-blue-50 text-blue-500 text-[10px] font-black rounded-full uppercase">Scheduled</span>}
                        {isDone && <span className="px-3 py-1 bg-emerald-50 text-emerald-500 text-[10px] font-black rounded-full uppercase">Completed</span>}

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
        const cardPrice = formatJobPrice(job.price);
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

                <div className="mt-4">
                    <span className="text-[32px] md:text-[54px] font-black tracking-tight text-[#BDBDBD] leading-none">MAD {cardPrice}</span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 flex-shrink-0">
                        {job.clientAvatar ? (
                            <img src={job.clientAvatar} alt={job.clientName} className="h-full w-full object-cover" />
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
                            <span>{job.rating || 5}</span>
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
                    <p className="text-[14px] md:text-[15px] leading-relaxed text-neutral-700 line-clamp-3">{job.description || 'No description provided.'}</p>
                    <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-neutral-500">{job.craft}</div>
                </div>

                <div className="mt-8 flex items-center gap-3">
                    <button
                        onClick={() => onAccept(job)}
                        disabled={isSubmittingOffer || isWaiting}
                        className="px-7 md:px-9 py-3 md:py-3.5 bg-black text-white text-[15px] md:text-[17px] font-bold rounded-full transition-all disabled:opacity-50"
                    >
                        {isSubmittingOffer ? '...' : 'Accept'}
                    </button>
                    <button
                        onClick={() => onCounter(job)}
                        disabled={isWaiting}
                        className="px-7 md:px-9 py-3 md:py-3.5 bg-neutral-100 text-neutral-900 text-[15px] md:text-[17px] font-bold rounded-full transition-all disabled:opacity-50"
                    >
                        Counter Offer
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
    const monthDoneJobs = monthJobs.filter((job) => job.status === 'done');
    const monthProgrammedJobs = monthJobs.filter((job) => programmedStatuses.has(job.status || ''));
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
    const monthRevenueNum = monthDoneJobs.reduce((acc, job) => {
        const priceStr = typeof job.price === 'string' ? job.price : String(job.price || '0');
        return acc + (parseInt(priceStr.replace(/[^\d]/g, ''), 10) || 0);
    }, 0);
    const COMMISSION_RATE_MOBILE = 0.40;
    const monthNetEarnings = Math.round(monthRevenueNum * (1 - COMMISSION_RATE_MOBILE));

    // Capacity of 2 jobs per day x Number of Days in that month
    const daysInMonth = new Date(selectedMonthDt.getFullYear(), selectedMonthDt.getMonth() + 1, 0).getDate();
    const monthlyCapacity = daysInMonth * 2;
    // Occupancy = (programmed + done) / capacity
    const totalMonthActiveJobs = monthProgrammedJobs.length + monthDoneJobs.length;
    const monthOccupancyRate = Math.max(0, Math.min(100, Math.round((totalMonthActiveJobs / Math.max(1, monthlyCapacity)) * 100)));

    // Notifications badge count: new market jobs + awaiting client decision
    const mobileNotificationsCount = newMarketJobs.length + waitingMarketJobs.length;

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
        { key: 'new', label: 'New', count: newMarketJobs.length },
        { key: 'waiting', label: 'Waiting', count: waitingMarketJobs.length },
        { key: 'programmed', label: 'Programmed', count: programmedAcceptedJobs.length },
        { key: 'done', label: 'Done', count: doneAcceptedJobs.length }
    ];

    const serviceSubtitle = (service: string, craft?: string) => {
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

    const renderJobDetailsModal = () => {
        if (!viewingJobDetails) return null;
        const job = viewingJobDetails;
        const dateStr = job.dateLabel;
        const timeStr = job.timeLabel || 'Flexible';

        return (
            <AnimatePresence>
                <motion.div
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-[1000] bg-white flex flex-col"
                >
                    {/* Header */}
                    <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-100 bg-white">
                        <button onClick={() => setViewingJobDetails(null)} className="h-10 w-10 flex items-center justify-center bg-neutral-100 rounded-full transition-transform active:scale-95">
                            <ChevronDown size={24} className="rotate-90" />
                        </button>
                        <h2 className="text-[17px] font-black" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>Job Details</h2>
                        <div className="w-10" />
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar bg-white">
                        {/* Status Banner */}
                        <div className={cn(
                            "px-5 py-3 flex items-center gap-3",
                            job.status === 'done' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                        )}>
                            <div className={cn("h-2 w-2 rounded-full", job.status === 'done' ? "bg-emerald-500" : "bg-blue-500")} />
                            <span className="text-[13px] font-black uppercase tracking-wider">{job.status === 'done' ? 'Completed' : 'Upcoming Mission'}</span>
                        </div>

                        {/* Visual Segment */}
                        <div className="relative h-[240px] w-full">
                            <img src={job.pictures?.[0] || job.image || "https://images.unsplash.com/photo-1581578731548-c64695ce6958?auto=format&fit=crop&q=80"} className="w-full h-full object-cover" alt="service" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-6 left-6 right-6">
                                <h1 className="text-white text-[36px] font-black leading-tight tracking-tight" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>{job.service}</h1>
                                <p className="text-white/80 text-[15px] font-medium">{job.subService}</p>
                            </div>
                        </div>

                        <div className="px-6 py-8 space-y-8">
                            {/* Key Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-neutral-50 rounded-[24px]">
                                    <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1">Date</p>
                                    <p className="text-[15px] font-bold text-black">{dateStr}</p>
                                </div>
                                <div className="p-4 bg-neutral-50 rounded-[24px]">
                                    <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1">Time</p>
                                    <p className="text-[15px] font-bold text-black">{timeStr}</p>
                                </div>
                                <div className="p-4 bg-neutral-50 rounded-[24px]">
                                    <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1">Earnings</p>
                                    <p className="text-[15px] font-bold text-black">MAD {job.priceLabel}</p>
                                </div>
                                <div className="p-4 bg-neutral-50 rounded-[24px]">
                                    <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest mb-1">Location</p>
                                    <p className="text-[15px] font-bold text-black truncate">{job.city || 'Casablanca'}</p>
                                </div>
                            </div>

                            {/* Client Section */}
                            <section>
                                <h3 className="text-[13px] font-black text-neutral-400 uppercase tracking-widest mb-4 px-1">Client</h3>
                                <div className="flex items-center justify-between p-4 border border-neutral-100 rounded-[28px] bg-white">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 rounded-[18px] overflow-hidden bg-neutral-100">
                                            {job.clientAvatar ? <img src={job.clientAvatar} alt={job.clientName} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-[20px] font-black text-neutral-400">{job.clientName?.[0] || 'C'}</div>}
                                        </div>
                                        <div>
                                            <p className="text-[18px] font-black text-black">{job.clientName || 'Client'}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Star size={12} className="fill-[#FFCD2C] text-[#FFCD2C]" />
                                                <span className="text-[13px] font-bold text-[#FFCD2C]">4.9</span>
                                                <span className="text-[13px] text-neutral-400 font-medium">(12 reviews)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedChat((job.rawAccepted || job.rawJob) as any);
                                            setActiveNav('messages');
                                            setViewingJobDetails(null);
                                        }}
                                        className="h-12 w-12 flex items-center justify-center bg-black text-white rounded-full transition-transform active:scale-90"
                                    >
                                        <MessageSquare size={20} />
                                    </button>
                                </div>
                            </section>

                            {/* Description Section */}
                            <section>
                                <h3 className="text-[13px] font-black text-neutral-400 uppercase tracking-widest mb-4 px-1">Description</h3>
                                <div className="p-5 bg-neutral-50 rounded-[28px]">
                                    <p className="text-[15px] text-neutral-600 leading-relaxed font-medium">
                                        Hey, I need help with {job.service.toLowerCase()} in {job.city}. The job usually takes about 2 hours. Please bring your tools.
                                    </p>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="p-6 bg-white border-t border-neutral-100 pb-28">
                        <button
                            onClick={() => {
                                setSelectedChat((job.rawAccepted || job.rawJob) as any);
                                setActiveNav('messages');
                                setViewingJobDetails(null);
                            }}
                            className="w-full h-16 bg-black text-white rounded-full text-[17px] font-black flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"
                        >
                            <MessageSquare size={20} />
                            Quick Chat
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    };

    return (
        <div className="w-full h-screen overflow-hidden flex flex-col transition-colors duration-300" style={{ backgroundColor: activeNav === 'calendar' && isMobileLayout ? '#1C1C1E' : '#F3F3F3' }}>
            {renderJobDetailsModal()}
            <AnimatePresence mode="wait">
                {!isMobileLayout && (
                    <header key="provider-header" ref={providerHeaderRef} data-provider-header="true" className="sticky top-0 z-50 w-full bg-white border-b border-neutral-200 flex-none">
                        <div className="max-w-[1280px] mx-auto px-6 md:px-8 py-5 flex items-center justify-between">
                            <div className="flex-1">
                                <img src="/Images/Logo/Black Logo (latest).png" alt="Lbricol" className="h-8 w-auto cursor-pointer" onClick={() => window.location.href = '/'} />
                            </div>

                            <nav className="hidden md:flex items-center gap-8">
                                <NavTab id="jobs" label="Jobs" icon={Briefcase} />
                                <NavTab id="calendar" label="Calendar" icon={Calendar} />
                                <NavTab id="messages" label="Messages" icon={MessageSquare} />
                                <NavTab id="performance" label="Performance" icon={TrendingUp} />
                            </nav>

                            <div className="flex-1 flex justify-end items-center gap-3">
                                <button
                                    onClick={() => {
                                        window.location.href = '/';
                                    }}
                                    className="px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium rounded-full transition-all"
                                >
                                    Switch to Client Mode
                                </button>
                                <button
                                    onClick={() => setShowProfileModal(true)}
                                    className="h-12 w-12 rounded-2xl bg-[#1E1E1E] text-white text-[16px] font-medium flex items-center justify-center overflow-hidden"
                                >
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        profileBadge
                                    )}
                                </button>
                            </div>
                        </div>
                    </header>
                )}

                <main key="provider-main" className={cn(
                    "flex-1 min-h-0 overflow-hidden",
                    isMobileLayout && activeNav === 'jobs' ? "px-0 py-0" : "px-6 md:px-8 py-8"
                )}>
                    {activeNav === 'jobs' && (
                        <motion.div key="jobs-tab-content" className="h-full">
                            {isMobileLayout ? (
                                <div className="relative h-full min-h-0 overflow-y-auto bg-white pb-32 no-scrollbar">
                                    <section className="px-5 pt-4">
                                        {/* ── Month Header ── */}
                                        <div className="relative mb-6 flex items-center justify-center mt-3">
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
                                            <button onClick={() => setShowNotificationsPage(true)} className="absolute right-0 h-[44px] w-[44px] rounded-full bg-neutral-200/50 flex items-center justify-center border border-neutral-100/50">
                                                <Bell size={19} className="text-neutral-900" />
                                                {mobileNotificationsCount > 0 && (
                                                    <span className="absolute top-[11px] right-[11px] h-2.5 w-2.5 rounded-full bg-[#E51B24] shadow-[0_0_0_2px_#F5F5F5]" />
                                                )}
                                            </button>
                                        </div>

                                        {/* ── Custom Month Picker Dropdown ── */}
                                        <AnimatePresence>
                                            {showMonthPicker && (
                                                <motion.div
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
                                                    <Star size={15} className="fill-[#FFCD2C] text-[#FFCD2C] -ml-1" />
                                                    <span className="text-[15px] font-medium text-black mt-0.5" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>{monthAvgRating}</span>
                                                </div>
                                                <div className="h-[34px] px-8 flex-1 bg-[#F9F9F9] rounded-full flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.02)]">
                                                    <span className="text-[13px] font-bold text-black mt-0.5 tracking-wide" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                        MAD {monthRevenueNum >= 1000 ? `${(monthRevenueNum / 1000).toFixed(0)}K` : monthRevenueNum}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Occupancy bar */}
                                            <div className="h-[34px] bg-[#F9F9F9] rounded-full overflow-hidden relative shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.02)] flex items-center mx-0.5">
                                                <motion.div
                                                    className="absolute left-0 top-0 bottom-0 bg-[#FFD13B] min-w-[16px]"
                                                    initial={{ width: '0%' }}
                                                    animate={{ width: `${Math.max(12, monthOccupancyRate)}%` }}
                                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                                />
                                                <span className="relative z-10 text-black text-[13px] font-medium ml-6 mt-0.5 tracking-wide" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                    {monthOccupancyRate === 0 ? '0% Occupancy Rate' : monthOccupancyRate + '% Occupancy Rate'}
                                                </span>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Horizontal Calendar */}
                                    <section className="bg-white pt-6 pb-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] mb-2 relative z-20">
                                        {(() => {
                                            const dateKey = horizontalSelectedDate.toISOString().split('T')[0];
                                            const savedSlots = (userData as any)?.calendarSlots?.[dateKey] || [];
                                            const hasProgrammedSlots = savedSlots.length > 0;

                                            return (
                                                <div className="flex flex-col items-center mb-4">
                                                    <div className="text-center font-bold text-[14px] text-black" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                        {horizontalSelectedDate.getTime() === new Date().setHours(0, 0, 0, 0) ? 'Today' : horizontalSelectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                                    </div>

                                                    {/* Compact Slot View */}
                                                    {hasProgrammedSlots && !isEditingSlots && (
                                                        <div className="flex items-center gap-3 mt-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <div className="flex items-center gap-3 text-[16px] font-black text-black" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                                {savedSlots.map((s: any, idx: number) => (
                                                                    <React.Fragment key={idx}>
                                                                        {idx > 0 && <span className="opacity-30 mx-0.5">|</span>}
                                                                        <span>{s.from} - {s.to}</span>
                                                                    </React.Fragment>
                                                                ))}
                                                            </div>
                                                            <button
                                                                onClick={() => setIsEditingSlots(true)}
                                                                className="w-[34px] h-[34px] rounded-xl bg-[#FFCD2C] flex items-center justify-center text-black active:scale-90 transition-all border border-black/5"
                                                            >
                                                                <Calendar size={16} strokeWidth={2.5} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-6 snap-x pb-2">
                                            {Array.from({ length: 14 }).map((_, i) => {
                                                const d = new Date();
                                                d.setDate(d.getDate() - 1 + i);
                                                d.setHours(0, 0, 0, 0);
                                                const isSelected = d.getTime() === horizontalSelectedDate.getTime();
                                                const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 2);
                                                const dateNum = d.getDate();
                                                const hasJob = daysWithProgrammedJobs.has(d.getTime());

                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => setHorizontalSelectedDate(d)}
                                                        className={cn(
                                                            'snap-center flex flex-col items-center justify-center rounded-full flex-shrink-0 transition-all relative',
                                                            isSelected ? 'bg-[#FFCD2C] w-[52px] h-[80px] shadow-[0_4px_12px_rgba(255,205,44,0.3)]' :
                                                                (hasJob ? 'bg-[#FFF8E6] border-2 border-[#FFCD2C] w-[52px] h-[72px]' : 'bg-[#F9F9F9] w-[52px] h-[68px]')
                                                        )}
                                                    >
                                                        <span className={cn('text-[12px] font-black mb-1.5', isSelected ? 'text-black' : 'text-neutral-500')} style={{ fontFamily: 'Uber Move, var(--font-sans)', letterSpacing: '0.05em' }}>{dayStr}</span>
                                                        <div className={cn(
                                                            'w-[34px] h-[34px] rounded-full flex items-center justify-center text-[15px] font-black relative',
                                                            isSelected ? 'bg-white text-black shadow-sm' :
                                                                (hasJob ? 'bg-[#FFCD2C] text-black shadow-sm' : 'bg-[#F1F1F1] text-[#A0A0A0]')
                                                        )} style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                            {dateNum}
                                                        </div>
                                                        {hasJob && !isSelected && (
                                                            <div className="absolute -top-1 -right-1">
                                                                <Star size={10} className="fill-[#FFCD2C] text-[#FFCD2C]" />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* ── Time Slots Management (Pic 3 Style) ── */}
                                        <AnimatePresence>
                                            {(isEditingSlots || !(() => {
                                                const dateKey = horizontalSelectedDate.toISOString().split('T')[0];
                                                return ((userData as any)?.calendarSlots?.[dateKey] || []).length > 0;
                                            })()) && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 10 }}
                                                        className="px-6 py-8 border-y border-neutral-100 bg-white"
                                                    >
                                                        <div className="flex flex-col gap-6 max-w-[340px] mx-auto">
                                                            {dailySlots.map((slot, idx) => (
                                                                <div key={idx} className="flex items-center gap-4 bg-neutral-50 p-4 rounded-3xl border border-neutral-100 relative group">
                                                                    <div className="flex-1 flex items-center gap-2">
                                                                        {/* From */}
                                                                        <div className="flex-1">
                                                                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center mb-1">From</p>
                                                                            <div className="relative group">
                                                                                <select
                                                                                    value={slot.from}
                                                                                    onChange={(e) => {
                                                                                        const newSlots = [...dailySlots];
                                                                                        newSlots[idx].from = e.target.value;
                                                                                        setDailySlots(newSlots);
                                                                                    }}
                                                                                    className="w-full h-12 bg-white rounded-2xl text-center text-[16px] font-bold border-none outline-none focus:ring-2 focus:ring-[#FFC244] transition-all appearance-none cursor-pointer shadow-sm"
                                                                                >
                                                                                    {TIME_SLOTS.map(t => {
                                                                                        const isToday = horizontalSelectedDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                                                                                        if (isToday) {
                                                                                            const [h] = t.split(':').map(Number);
                                                                                            const now = new Date();
                                                                                            if (h < now.getHours() + 1) return null;
                                                                                        }
                                                                                        return <option key={t} value={t}>{t}</option>;
                                                                                    })}
                                                                                </select>
                                                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                                                                                    <ChevronDown size={14} />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <span className="text-neutral-400 font-bold mt-4">—</span>
                                                                        {/* To */}
                                                                        <div className="flex-1">
                                                                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center mb-1">To</p>
                                                                            <div className="relative group">
                                                                                <select
                                                                                    value={slot.to}
                                                                                    onChange={(e) => {
                                                                                        const newSlots = [...dailySlots];
                                                                                        newSlots[idx].to = e.target.value;
                                                                                        setDailySlots(newSlots);
                                                                                    }}
                                                                                    className="w-full h-12 bg-white rounded-2xl text-center text-[16px] font-bold border-none outline-none focus:ring-2 focus:ring-[#FFC244] transition-all appearance-none cursor-pointer shadow-sm"
                                                                                >
                                                                                    {TIME_SLOTS.map(t => {
                                                                                        const isToday = horizontalSelectedDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                                                                                        if (isToday) {
                                                                                            const [h] = t.split(':').map(Number);
                                                                                            const now = new Date();
                                                                                            if (h < now.getHours() + 1) return null;
                                                                                        }
                                                                                        return <option key={t} value={t}>{t}</option>;
                                                                                    })}
                                                                                </select>
                                                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                                                                                    <ChevronDown size={14} />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {dailySlots.length > 1 && (
                                                                        <button
                                                                            onClick={() => setDailySlots(dailySlots.filter((_, i) => i !== idx))}
                                                                            className="absolute -right-2 -top-2 w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm z-10"
                                                                        >
                                                                            <X size={14} strokeWidth={3} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}

                                                            <div className="flex flex-col items-center gap-6 mt-4">
                                                                <button
                                                                    onClick={() => {
                                                                        const lastSlot = dailySlots[dailySlots.length - 1];
                                                                        const nextFrom = lastSlot ? lastSlot.to : '09:00';
                                                                        const fromIdx = TIME_SLOTS.indexOf(nextFrom);
                                                                        const nextTo = fromIdx !== -1 ? (TIME_SLOTS[Math.min(fromIdx + 4, TIME_SLOTS.length - 1)] || '11:00') : '11:00';
                                                                        setDailySlots([...dailySlots, { from: nextFrom, to: nextTo }]);
                                                                    }}
                                                                    className="w-12 h-12 rounded-full bg-[#FFF9E6] border-2 border-[#FFC244] flex items-center justify-center text-[#FFC244] hover:bg-[#FFC244] hover:text-white active:scale-95 transition-all shadow-sm"
                                                                >
                                                                    <Plus size={28} strokeWidth={3} />
                                                                </button>

                                                                <div className="flex gap-4 w-full">
                                                                    <button
                                                                        onClick={async () => {
                                                                            const allDaySlots = [{ from: '09:00', to: '18:00' }];
                                                                            setDailySlots(allDaySlots);
                                                                            // Save immediately
                                                                            if (user) {
                                                                                setIsSavingSlots(true);
                                                                                try {
                                                                                    const dateKey = horizontalSelectedDate.toISOString().split('T')[0];
                                                                                    const bricolerRef = doc(db, 'bricolers', user.uid);
                                                                                    const snap = await getDoc(bricolerRef);
                                                                                    const existingSlots = (snap.data())?.calendarSlots || {};
                                                                                    await updateDoc(bricolerRef, {
                                                                                        calendarSlots: { ...existingSlots, [dateKey]: allDaySlots }
                                                                                    });
                                                                                    showToast({ variant: 'success', title: 'Success', description: 'Availability updated!' });
                                                                                    setIsEditingSlots(false);
                                                                                } catch (err) { console.error(err); } finally { setIsSavingSlots(false); }
                                                                            }
                                                                        }}
                                                                        className="flex-1 h-[56px] bg-[#FFC244] text-white rounded-[20px] text-[15px] font-bold uppercase tracking-wide hover:bg-[#FFB11F] transition-all active:scale-[0.98]"
                                                                    >
                                                                        All day
                                                                    </button>
                                                                    <button
                                                                        disabled={isSavingSlots}
                                                                        onClick={handleSaveSlots}
                                                                        className={cn(
                                                                            "flex-[2] h-[56px] bg-[#00A082] text-white rounded-[20px] text-[17px] font-bold uppercase tracking-wide shadow-lg flex items-center justify-center transition-all active:scale-[0.98]",
                                                                            isSavingSlots ? "opacity-70 cursor-not-allowed" : "hover:bg-[#008C74]"
                                                                        )}
                                                                    >
                                                                        {isSavingSlots ? (
                                                                            <RefreshCw className="animate-spin" size={20} />
                                                                        ) : (
                                                                            'Program'
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                        </AnimatePresence>

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
                                                    <p className="text-[13px] font-medium text-neutral-400 italic">No programmed jobs for this day</p>
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
                                                                <img src={job.image} alt={job.service} className="w-full h-full object-cover" />
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
                                                                        <MapPin size={12} className="text-[#FFCD2C]" />
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
                                                                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">Budget</p>
                                                                        <span className="text-[20px] font-black text-black" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>MAD {job.priceLabel}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedChat(job.rawAccepted!);
                                                                        }}
                                                                        className="h-14 flex-1 rounded-2xl bg-[#FFCD2C] text-black flex items-center justify-center gap-2.5 text-[15px] font-black shadow-[0_4px_12px_rgba(255,205,44,0.3)] active:scale-95 transition-all"
                                                                    >
                                                                        <MessageSquare size={20} strokeWidth={2.5} />
                                                                        Quick Chat
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
                                                            Searching for jobs
                                                        </h3>
                                                        <p className="text-[13px] font-medium text-neutral-400 max-w-[200px] mx-auto leading-relaxed">
                                                            Looking for the best matches in <span className="text-black font-bold">{providerCity?.split(' (')[0] || 'your area'}</span>...
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
                                                                                    <img src={job.clientAvatar} alt={job.clientName} className="h-full w-full object-cover" />
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
                                                                        <img src={job.image} alt={job.service} className="h-full w-full object-cover" />
                                                                        {job.pictures && job.pictures.length > 1 && (
                                                                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
                                                                                {job.pictures.map((_, i) => (
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
                                                                                    MAD {job.priceLabel}
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
                                                        {mobileJobsStatus === 'waiting' ? 'No pending offers' :
                                                            mobileJobsStatus === 'programmed' ? 'No upcoming jobs' : 'No completed jobs yet'}
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
                                                        <img src={job.image} alt={job.service} className="w-full h-full object-cover" />
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
                                                            <span className="text-[16px] font-black text-black">MAD {job.priceLabel}</span>
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
                                                                        title="Cancel offer"
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
                                                                                status: 'pending' as any,
                                                                                clientName: job.clientName,
                                                                                clientAvatar: job.clientAvatar,
                                                                            };
                                                                            setSelectedChat(syntheticOrder);
                                                                        }}
                                                                        title="Chat with client"
                                                                        className="h-11 flex-1 rounded-full bg-neutral-900 text-white flex items-center justify-center gap-2 text-[13px] font-bold hover:bg-black transition-colors"
                                                                    >
                                                                        <MessageCircle size={16} strokeWidth={1.8} />
                                                                        Quick Chat
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
                                                                        title="Redistribute job"
                                                                        className="h-11 w-11 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                                                    >
                                                                        <RefreshCw size={20} strokeWidth={1.8} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setSelectedChat(job.rawAccepted!)}
                                                                        title="Chat"
                                                                        className="h-11 w-11 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors"
                                                                    >
                                                                        <MessageCircle size={20} strokeWidth={1.8} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUpdateJob(job.rawAccepted!.id!, { status: 'done' })}
                                                                        title="Mark as done"
                                                                        className="h-11 flex-1 rounded-full bg-black text-white flex items-center justify-center gap-2 text-[13px] font-bold hover:bg-neutral-800 transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                                                                    >
                                                                        <CheckCircle2 size={16} strokeWidth={1.8} />
                                                                        Done
                                                                    </button>
                                                                </>
                                                            )}

                                                            {/* DONE buttons: Chat + Rate Client */}
                                                            {job.status === 'done' && job.rawAccepted && (
                                                                <>
                                                                    <button
                                                                        onClick={() => setSelectedChat(job.rawAccepted!)}
                                                                        title="Chat"
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
                                                                        title="Rate client"
                                                                        className="h-11 flex-1 rounded-full bg-black text-white flex items-center justify-center gap-2 text-[13px] font-bold hover:bg-neutral-800 transition-colors shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
                                                                    >
                                                                        <Star size={16} strokeWidth={1.8} />
                                                                        Rate Client
                                                                    </button>
                                                                </>
                                                            )}

                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </section>
                                    )}

                                    {/* Notifications Overlay */}
                                    <AnimatePresence>
                                        {showNotificationsPage && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 20 }}
                                                className="absolute inset-0 z-50 bg-[#F3F3F3] h-full overflow-y-auto no-scrollbar pb-32"
                                            >
                                                <div className="sticky top-0 z-10 bg-white px-5 py-4 flex items-center gap-4 border-b border-neutral-100">
                                                    <button
                                                        onClick={() => setShowNotificationsPage(false)}
                                                        className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-black hover:bg-neutral-200 transition-colors"
                                                    >
                                                        <ChevronLeft size={20} />
                                                    </button>
                                                    <h2 className="text-[22px] font-black text-black tracking-tight flex-1" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                        Notifications
                                                    </h2>
                                                    {mergedNotifications.filter((n: any) => !n.read).length > 0 && (
                                                        <span className="h-6 px-3 bg-red-500 text-white rounded-full text-[11px] font-black flex items-center">
                                                            {mergedNotifications.filter((n: any) => !n.read).length} new
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="px-4 pt-4 pb-24 space-y-3">
                                                    {mergedNotifications.length === 0 ? (
                                                        <div className="text-center py-20">
                                                            <Bell size={48} className="text-neutral-200 mx-auto mb-4" />
                                                            <h3 className="text-[20px] font-black text-neutral-800 mb-1">All caught up!</h3>
                                                            <p className="text-[13px] font-medium text-neutral-400">New job alerts and client messages will appear here.</p>
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

                                                            const title = isNewJob ? `New Job: ${noti.serviceName || 'Service needed'}` :
                                                                isAccepted ? '✅ Offer Accepted!' :
                                                                    isDeclined ? 'Offer Declined' :
                                                                        isCounter ? '💰 Counter Offer' :
                                                                            isMessage ? `Message from ${noti.clientName || 'Client'}` :
                                                                                'Notification';

                                                            const body = isNewJob ? `${noti.city || ''} · MAD ${noti.price || '?'}` :
                                                                isAccepted ? `Your offer for ${noti.serviceName || 'a job'} was accepted!` :
                                                                    isDeclined ? `Offer declined for ${noti.serviceName || 'a job'}.` :
                                                                        isCounter ? `Client proposed MAD ${noti.price} for ${noti.serviceName || 'a job'}.` :
                                                                            isMessage ? (noti.message || 'Tap to view conversation.') :
                                                                                'You have a new update.';

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
                                                    <h3 className="text-xl md:text-3xl font-semibold text-neutral-900">No jobs available right now</h3>
                                                    <p className="text-neutral-500 mt-2 text-sm md:text-lg font-medium">
                                                        We&apos;ll notify you as soon as someone needs your skills in {providerCity || 'your area'}.
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

                    {
                        activeNav === 'calendar' && (
                            <motion.div
                                key="calendar-tab-content"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full min-h-0 flex flex-col gap-7 max-w-[1480px] mx-auto"
                            >
                                <div className="h-full min-h-0 overflow-hidden">
                                    <WeekCalendar
                                        orders={acceptedJobs}
                                        onUpdateOrder={(idx, updates) => handleUpdateJob(acceptedJobs[idx].id!, updates)}
                                        onCancelOrder={(idx) => handleCancelJob(acceptedJobs[idx])}
                                        onNewOrder={() => { window.location.href = '/'; }}
                                        variant={isMobileLayout ? "fullscreen" : "card"}
                                        userType="provider"
                                        overlayTopOffset={isMobileLayout ? 0 : providerHeaderHeight}
                                    />
                                </div>
                            </motion.div>
                        )
                    }

                    {
                        activeNav === 'performance' && (
                            <div className="h-full overflow-y-auto pb-10">
                                <div className="space-y-6 max-w-4xl mx-auto">
                                    {(() => {
                                        const COMMISSION_RATE = 0.40;

                                        // ── All figures are month-scoped via selectedMonthDt ──
                                        const totalEarnings = monthRevenueNum;
                                        const lbricolCommission = Math.round(totalEarnings * COMMISSION_RATE);
                                        const netEarnings = totalEarnings - lbricolCommission;

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
                                            ? Math.round((monthDoneJobs.length / Math.max(1, monthTotal - monthCancelled)) * 100)
                                            : 100;

                                        return (
                                            <div className="space-y-6">
                                                {/* Month Selector */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Viewing</p>
                                                        <h2 className="text-[28px] font-black text-neutral-900 leading-tight" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                            {selectedMonthDt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                        </h2>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setSelectedMonthDt(new Date(selectedMonthDt.getFullYear(), selectedMonthDt.getMonth() - 1, 1))}
                                                            className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
                                                        >
                                                            <ChevronLeft size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedMonthDt(new Date())}
                                                            className="px-4 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 text-[12px] font-black transition-colors"
                                                        >
                                                            This Month
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedMonthDt(new Date(selectedMonthDt.getFullYear(), selectedMonthDt.getMonth() + 1, 1))}
                                                            className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
                                                        >
                                                            <ChevronLeft size={18} className="rotate-180" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 1. Elite Program Dashboard */}
                                                <div className="bg-gradient-to-br from-[#1C1C1E] to-[#2C2C2E] text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden">
                                                    {/* Elite Badge Overlay */}
                                                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFCD2C]/5 rounded-full blur-3xl -mr-32 -mt-32" />

                                                    <div className="relative z-10 flex flex-col md:flex-row justify-between gap-8">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-6">
                                                                <div className="w-12 h-12 bg-[#FFCD2C] rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(255,205,44,0.3)]">
                                                                    <Zap size={24} className="text-black fill-black" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-[20px] font-black tracking-tight" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>Elite Bricoler Program</h3>
                                                                    <p className="text-[12px] font-bold text-neutral-400 uppercase tracking-widest">Performance Dashboard</p>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                                <div>
                                                                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Performance Score</p>
                                                                    <h4 className="text-[28px] font-black text-[#FFCD2C]">94<span className="text-[14px] text-neutral-400 font-bold ml-1">/100</span></h4>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Market Rank</p>
                                                                    <h4 className="text-[28px] font-black text-white">#12<span className="text-[14px] text-neutral-400 font-bold ml-1">TOP 2%</span></h4>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Missions Month</p>
                                                                    <h4 className="text-[28px] font-black text-white">{monthDoneJobs.length}</h4>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Completion</p>
                                                                    <h4 className="text-[28px] font-black text-white">{completionRate}%</h4>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="md:w-[280px] bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <span className="text-[12px] font-black uppercase tracking-widest text-[#FFCD2C]">Elite Status</span>
                                                                <Trophy size={16} className="text-[#FFCD2C]" />
                                                            </div>
                                                            <div className="h-2 w-full bg-white/10 rounded-full mb-3 overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: '94%' }}
                                                                    className="h-full bg-gradient-to-r from-[#FFCD2C] to-[#FFE07D]"
                                                                />
                                                            </div>
                                                            <p className="text-[11px] font-medium text-neutral-400 leading-relaxed">You are an <b>Elite Bricoler</b>. You get priority access to high-value leads and 24/7 priority support.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 2. Earnings & Commission */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="md:col-span-2 bg-white border-2 border-neutral-50 p-8 rounded-[40px] shadow-sm flex flex-col justify-between">
                                                        <div>
                                                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Revenue ({selectedMonthDt.toLocaleDateString('en-US', { month: 'short' })})</p>
                                                            <div className="flex items-baseline gap-2">
                                                                <h1 className="text-[44px] font-black text-neutral-900 leading-none">{totalEarnings.toLocaleString()}</h1>
                                                                <span className="text-[18px] font-black text-neutral-300">MAD</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-8 mt-8">
                                                            <div>
                                                                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Your Net Profit</p>
                                                                <p className="text-[24px] font-black text-[#00A082]">{netEarnings.toLocaleString()} MAD</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Lbricol Fee (40%)</p>
                                                                <p className="text-[24px] font-black text-neutral-900">{lbricolCommission.toLocaleString()} MAD</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-[#00A082] text-white p-8 rounded-[40px] shadow-lg flex flex-col justify-between relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                                                        <div>
                                                            <h3 className="text-[18px] font-black mb-2">Available Balance</h3>
                                                            <p className="text-[32px] font-black">{netEarnings.toLocaleString()} <span className="text-[14px]">MAD</span></p>
                                                        </div>
                                                        <button
                                                            onClick={() => setShowCashOutModal(true)}
                                                            className="w-full py-4 bg-white text-[#00A082] rounded-[20px] text-[13px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all mt-6"
                                                        >
                                                            Withdraw Funds
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* 2. Primary Metrics Row */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Lbricol Revenue Card */}
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="bg-white border border-neutral-100 p-8 rounded-[32px] shadow-sm flex flex-col justify-between min-h-[220px]"
                                                    >
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="p-2 bg-red-50 rounded-xl">
                                                                    <Wallet size={20} className="text-red-500" />
                                                                </div>
                                                                <span className="text-xs font-black text-neutral-400 uppercase tracking-widest">Lbricol Revenue</span>
                                                            </div>
                                                            <div className="px-3 py-1 bg-red-50 rounded-full text-[9px] font-black text-red-600 uppercase">
                                                                To Pay
                                                            </div>
                                                        </div>

                                                        <div className="my-2">
                                                            <h2 className="text-4xl font-black text-neutral-900">{lbricolCommission.toLocaleString()} <span className="text-sm font-bold text-neutral-400">MAD</span></h2>
                                                            <p className="text-xs font-bold text-neutral-400 mt-1">40% commission · {selectedMonthDt.toLocaleDateString('en-US', { month: 'long' })}</p>
                                                        </div>

                                                        <button
                                                            onClick={() => window.open('https://wa.me/212702814355?text=Hello%20Lbricol!%20I%20would%20like%20to%20settle%20my%20commission%20of%20' + lbricolCommission + '%20MAD%20for%20' + selectedMonthDt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '.', '_blank')}
                                                            className="w-full py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-neutral-800 transition-all"
                                                        >
                                                            Settle Balance
                                                        </button>
                                                    </motion.div>

                                                    {/* Performance Stats Group */}
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.1 }}
                                                        className="grid grid-cols-2 gap-4"
                                                    >
                                                        <div className="bg-white border border-neutral-100 p-6 rounded-[32px] shadow-sm flex flex-col justify-center text-center">
                                                            <div className="mx-auto p-3 bg-green-50 rounded-2xl mb-3">
                                                                <TrendingUp size={24} className="text-green-500" />
                                                            </div>
                                                            <div className="text-3xl font-black text-neutral-900">{completionRate}%</div>
                                                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Success</div>
                                                        </div>
                                                        <div className="bg-white border border-neutral-100 p-6 rounded-[32px] shadow-sm flex flex-col justify-center text-center">
                                                            <div className="mx-auto p-3 bg-indigo-50 rounded-2xl mb-3">
                                                                <Star size={24} className="text-indigo-500 fill-indigo-500" />
                                                            </div>
                                                            <div className="text-3xl font-black text-neutral-900">{avgRating}</div>
                                                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Rating</div>
                                                        </div>
                                                    </motion.div>
                                                </div>

                                                {/* 3. Simplified Customer Reviews & Activity */}
                                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                                    {/* Activity Feed (3/5) */}
                                                    <div className="lg:col-span-3 bg-white border border-neutral-100 rounded-[32px] p-8 shadow-sm">
                                                        <div className="flex items-center justify-between mb-6">
                                                            <h3 className="text-xl font-black text-neutral-900">Recent Work</h3>
                                                            <button className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">See All</button>
                                                        </div>
                                                        <div className="space-y-4">
                                                            {acceptedJobs.length === 0 ? (
                                                                <div className="py-8 text-center text-neutral-400">
                                                                    <Briefcase size={32} className="mx-auto mb-2 opacity-20" />
                                                                    <p className="text-xs font-bold uppercase tracking-widest">No activity yet</p>
                                                                </div>
                                                            ) : (
                                                                acceptedJobs.slice(0, 4).map((job, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl hover:bg-neutral-100 transition-colors">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={cn(
                                                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                                                job.status === 'done' ? "bg-green-100 text-green-600" :
                                                                                    job.status === 'cancelled' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                                                                            )}>
                                                                                {job.status === 'done' ? <CheckCircle2 size={20} /> :
                                                                                    job.status === 'cancelled' ? <Trash2 size={20} /> : <Clock size={20} />}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-bold text-neutral-800 text-xs truncate max-w-[150px]">{job.service}</p>
                                                                                <p className="text-[9px] font-bold text-neutral-400 uppercase">{job.date}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="font-black text-neutral-900 text-xs">+{job.price} MAD</p>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Rating Breakdown (2/5) */}
                                                    <div className="lg:col-span-2 bg-white border border-neutral-100 rounded-[32px] p-8 shadow-sm">
                                                        <h3 className="text-xl font-black text-neutral-900 mb-6">Reviews</h3>
                                                        <div className="space-y-4">
                                                            {ratingBreakdown.map(({ star, pct }) => (
                                                                <div key={star} className="flex items-center gap-3">
                                                                    <div className="flex items-center gap-1 w-6">
                                                                        <span className="text-[10px] font-black text-neutral-900">{star}</span>
                                                                        <Star size={8} className="text-neutral-900 fill-neutral-900" />
                                                                    </div>
                                                                    <div className="flex-1 h-1.5 bg-neutral-50 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-black rounded-full" style={{ width: `${pct}%` }} />
                                                                    </div>
                                                                    <span className="text-[9px] font-bold text-neutral-400 w-6 text-right">{pct}%</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="mt-8 pt-8 border-t border-neutral-100">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-2xl font-black text-neutral-900">{avgRating}</p>
                                                                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Average Score</p>
                                                                </div>
                                                                <div className="flex gap-0.5">
                                                                    {[1, 2, 3, 4, 5].map(s => (
                                                                        <Star key={s} size={14} className={cn(s <= Math.round(Number(avgRating)) ? "text-neutral-900 fill-neutral-900" : "text-neutral-100")} />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 4. Support Footer */}
                                                <div className="p-6 bg-neutral-50 rounded-[32px] flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                                                            <HelpCircle size={20} className="text-neutral-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-neutral-900">Need help?</p>
                                                            <p className="text-[10px] font-medium text-neutral-500">Contact Lbricol support 24/7</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => window.open('https://wa.me/212702814355', '_blank')}
                                                        className="px-4 py-2 bg-white border border-neutral-100 rounded-xl text-[10px] font-black uppercase hover:bg-neutral-100 transition-all"
                                                    >
                                                        Contact
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
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
                                    <h1 className="text-[32px] font-black text-neutral-900 tracking-tight" style={{ fontFamily: 'Uber Move, var(--font-sans)', letterSpacing: '-0.03em' }}>
                                        Messages
                                    </h1>

                                    {/* Search Bar */}
                                    <div className="flex items-center gap-3 bg-neutral-50 rounded-[14px] px-4 py-3 border border-neutral-100">
                                        <Search size={18} className="text-neutral-400" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
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
                                            All
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
                                            <h2 className="text-xl font-black text-neutral-900 mb-2">No messages yet</h2>
                                            <p className="text-neutral-500 text-sm font-medium max-w-[240px]">Messages about your active jobs will appear here.</p>
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
                                                                Click to check messages regarding this order...
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
                                    isMobileLayout ? "pb-24" : "pt-8 px-6"
                                )}>
                                <ProfileView
                                    userName={userData?.name || user?.displayName || 'Bricoler'}
                                    userAvatar={user?.photoURL || undefined}
                                    isBricoler={true}
                                    isAuthenticated={!!user}
                                    variant="provider"
                                    onBricolerAction={() => window.location.href = '/'}
                                    onOpenLanguage={() => { /* Handle language open */ }}
                                    onLogin={() => handleGoogleLogin()}
                                    onLogout={() => auth.signOut()}
                                    onNavigate={(path) => {
                                        if (path === '/edit-profile') {
                                            setSelectedWorkAreas(userData?.workAreas || []);
                                            setShowProfileModal(true);
                                        }
                                        if (path === '/add-services') setShowAddServiceModal(true);
                                    }}
                                />
                            </motion.div>
                        )
                    }
                </main >


                {/* ── Redistribute Modal ── */}
                <AnimatePresence key="redistribute-presence">
                    {
                        showRedistributeModal && redistributeJob && (
                            <div key="redistribute-modal" className="fixed inset-0 z-[120] flex items-end justify-center p-0">
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
                                            <h2 className="text-[20px] font-black text-neutral-900">Redistribute Job</h2>
                                            <p className="text-[12px] text-neutral-500 font-medium">{redistributeJob.service} · {redistributeJob.date}</p>
                                        </div>
                                    </div>

                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5">
                                        <p className="text-[13px] font-bold text-amber-700">⚠️ Financial Penalty Notice</p>
                                        <p className="text-[12px] font-medium text-amber-600 mt-1 leading-relaxed">
                                            Redistributing a confirmed job applies a <strong>penalty deduction</strong> to your next earnings. Use this only for urgent, genuine circumstances.
                                        </p>
                                    </div>

                                    <div className="mb-5">
                                        <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Reason for redistribution *</label>
                                        <textarea
                                            value={redistributeReason}
                                            onChange={(e) => setRedistributeReason(e.target.value)}
                                            placeholder="Describe your urgent circumstance clearly..."
                                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/10 resize-none min-h-[100px]"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowRedistributeModal(false)}
                                            className="flex-1 h-12 rounded-2xl border border-neutral-200 text-sm font-black text-neutral-600 hover:bg-neutral-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            disabled={!redistributeReason.trim() || isRedistributing}
                                            onClick={async () => {
                                                if (!redistributeReason.trim() || !redistributeJob.id) return;
                                                setIsRedistributing(true);
                                                try {
                                                    await handleUpdateJob(redistributeJob.id, {
                                                        status: 'new',
                                                        bricolerId: null,
                                                        redistributedBy: user?.uid,
                                                        redistributeReason,
                                                        penaltyApplied: true,
                                                        redistributedAt: new Date().toISOString(),
                                                    });
                                                    showToast({ variant: 'info', title: 'Job redistributed', description: 'A penalty has been applied to your earnings.' });
                                                    setShowRedistributeModal(false);
                                                    setRedistributeReason('');
                                                } catch (e) {
                                                    showToast({ variant: 'error', title: 'Error', description: 'Could not redistribute. Please try again.' });
                                                } finally {
                                                    setIsRedistributing(false);
                                                }
                                            }}
                                            className="flex-1 h-12 rounded-2xl bg-black text-white text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors"
                                        >
                                            {isRedistributing ? 'Processing…' : 'Confirm Redistribution'}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )
                    }
                </AnimatePresence >

                {/* ── Rate Client Modal ── */}
                <AnimatePresence key="rate-client-presence">
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
                                        <p className="text-[12px] font-black text-neutral-400 uppercase tracking-widest mb-1">Rate your client</p>
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
                                        <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Comment (optional)</label>
                                        <textarea
                                            value={clientRatingComment}
                                            onChange={(e) => setClientRatingComment(e.target.value)}
                                            placeholder="How was the client to work with?"
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
                                                showToast({ variant: 'success', title: 'Rating submitted!', description: 'Thank you for your feedback.' });
                                                setShowRateClientModal(false);
                                            } catch (e) {
                                                showToast({ variant: 'error', title: 'Error', description: 'Could not submit rating. Try again.' });
                                            } finally {
                                                setIsSubmittingRating(false);
                                            }
                                        }}
                                        className="w-full h-14 rounded-2xl bg-black text-white text-[15px] font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-colors"
                                    >
                                        {isSubmittingRating ? 'Submitting…' : `Submit ${clientRating > 0 ? `${clientRating}★` : 'Rating'}`}
                                    </button>
                                </motion.div>
                            </div>
                        )
                    }
                </AnimatePresence >

                {/* WhatsApp Modal */}
                <AnimatePresence key="whatsapp-presence-group">
                    {
                        showWhatsAppModal && (
                            <div key="whatsapp-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWhatsAppModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                                <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white w-full max-w-md rounded-3xl p-8 shadow-xl border border-neutral-100">
                                    <h2 className="text-2xl font-black text-neutral-900 mb-2">Final Step!</h2>
                                    <p className="text-neutral-500 text-sm mb-8">We need your WhatsApp number so the client can contact you once you accept the job.</p>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">WhatsApp Number</label>
                                            <input type="tel" placeholder="+212 600 000000" value={whatsappInput} onChange={(e) => setWhatsappInput(e.target.value)} className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all" />
                                        </div>
                                        <button onClick={handleSaveWhatsapp} className="w-full py-4 bg-black text-white font-black rounded-2xl transition-all active:scale-[0.98]">Confirm & Accept Job</button>
                                    </div>
                                </motion.div>
                            </div>
                        )
                    }


                    {
                        selectedChat && (
                            <div key="chat-modal" className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedChat(null)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                                <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} className="relative bg-white w-full max-w-2xl h-[700px] rounded-[40px] shadow-xl border border-neutral-100 overflow-hidden flex flex-col">
                                    {/* Chat Header */}
                                    <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-neutral-100 overflow-hidden">
                                                <img src={selectedChat.clientAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedChat.id}`} alt="Client" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-neutral-900 leading-tight">
                                                    {(selectedChat as any).clientName || 'Client'}
                                                </h3>
                                                <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Online</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    const message = encodeURIComponent(`Hello! This is ${userData?.name || 'your provider'} from Lbricol regarding your ${selectedChat.service} request. I've just accepted your job!`);
                                                    window.open(`https://wa.me/?text=${message}`, '_blank');
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-black hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                                            >
                                                <MessageCircle size={14} className="fill-white" />
                                                WhatsApp
                                            </button>
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
                                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Subject</p>
                                                <p className="text-xs font-bold text-neutral-900">{selectedChat.service} in {selectedChat.location}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Agreed Price</p>
                                            <p className="text-xs font-bold text-black">{selectedChat.price} MAD</p>
                                        </div>
                                    </div>

                                    {/* Chat Messages */}
                                    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white">
                                        {chatMessages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full opacity-40">
                                                <MessageSquare size={48} className="mb-2" />
                                                <p className="text-sm font-bold">No messages yet</p>
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
                                                placeholder="Write your message..."
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
                            </div>
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

                                    <h2 className="text-3xl font-black text-neutral-900 mb-2">Request Payout</h2>
                                    <p className="text-neutral-500 text-sm mb-8 font-medium">Choose your preferred withdrawal method. Payouts are usually processed within 24-48 hours.</p>

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
                                                    <p className="font-bold text-sm text-neutral-900">Bank Transfer (RIB)</p>
                                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Free • 2 days</p>
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
                                                    <p className="font-bold text-sm text-neutral-900">Wafacash / Cash Plus</p>
                                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">20 MAD fee • Instant</p>
                                                </div>
                                            </div>
                                            {cashOutMethod === 'wafacash' && <CheckCircle2 size={20} className="text-black" />}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Payout Details</label>
                                            <textarea
                                                placeholder={cashOutMethod === 'bank' ? "Enter your 24-digit RIB number..." : "Enter your Full Name and Phone Number..."}
                                                className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all min-h-[100px] text-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                showToast({
                                                    variant: 'success',
                                                    title: "Payout request sent.",
                                                    description: "You will receive a confirmation message shortly."
                                                });
                                                setShowCashOutModal(false);
                                            }}
                                            className="w-full py-5 bg-black text-white font-black rounded-2xl transition-all active:scale-[0.98]"
                                        >
                                            Submit Request
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

                                    <h2 className="text-3xl font-black text-neutral-900 mb-2">Profile Settings</h2>
                                    <p className="text-neutral-500 text-sm mb-8 font-medium">Update your professional details and contact information.</p>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Display Name</label>
                                            <input
                                                ref={nameInputRef}
                                                type="text"
                                                defaultValue={userData?.name || user?.displayName || ''}
                                                className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all text-sm"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="relative">
                                                <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">City</label>
                                                <select
                                                    ref={cityInputRef}
                                                    defaultValue={providerCity}
                                                    className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all text-sm appearance-none cursor-pointer hover:bg-neutral-100 font-bold"
                                                >
                                                    <option disabled>Select City</option>
                                                    <option>Casablanca</option>
                                                    <option>Rabat</option>
                                                    <option>Marrakech</option>
                                                    <option>Tangier</option>
                                                    <option>Essaouira</option>
                                                </select>
                                                <div className="absolute right-4 top-[42px] pointer-events-none">
                                                    <ChevronDown size={16} className="text-neutral-400" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">Language</label>
                                                <div className="w-full px-5 py-4 bg-neutral-100 border border-neutral-100 rounded-2xl text-sm opacity-50 cursor-not-allowed flex items-center gap-2">
                                                    <Globe size={14} /> English
                                                </div>
                                            </div>
                                        </div>

                                        {/* Work Areas Selector */}
                                        <div>
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">Work Areas (Neighborhoods)</label>
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
                                                        <option value="" disabled>+ Add Neighborhood</option>
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
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">My Services</label>
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
                                                        <option value="" disabled>+ Add Service</option>
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
                                                Adding services increases your job visibility.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">WhatsApp Number</label>
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
                                                Cancel
                                            </button>
                                            <button
                                                disabled={isSavingProfile}
                                                onClick={handleSaveProfile}
                                                className="flex-[2] py-4 bg-black text-white font-black rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40"
                                            >
                                                {isSavingProfile ? <RefreshCw className="animate-spin" size={20} /> : 'Save Profile'}
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

                                    <h2 className="text-[24px] font-black text-neutral-900 mb-2" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>Offer New Service</h2>
                                    <p className="text-[13px] font-medium text-neutral-500 mb-8 font-medium">Add a new specialty to your profile to receive more job offers.</p>

                                    <div className="space-y-8">
                                        {/* Step 1: Category */}
                                        <div>
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">Select Category</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {getAllServices().filter(s => !selectedServices.includes(s.id)).map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => setNewServiceData({ ...newServiceData, id: s.id, rate: SERVICE_TIER_RATES[s.id]?.suggestedMin || 100 })}
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
                                                    <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">Your Hourly Rate (MAD)</label>
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[12px] font-bold text-neutral-400">Low</span>
                                                                <span className="text-[12px] font-black text-black">{newServiceData.rate} MAD</span>
                                                                <span className="text-[12px] font-bold text-neutral-400">High</span>
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
                                                    <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">Your Professional Pitch</label>
                                                    <textarea
                                                        value={newServiceData.pitch}
                                                        onChange={(e) => setNewServiceData({ ...newServiceData, pitch: e.target.value })}
                                                        placeholder={`Describe your experience in ${getServiceById(newServiceData.id)?.name}...`}
                                                        className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black transition-all min-h-[120px] text-[15px] font-medium"
                                                    />
                                                    <p className="text-[10px] text-neutral-400 font-medium mt-2 ml-1">Example: "I have 5 years of experience in furniture assembly and tiling."</p>
                                                </div>

                                                <button
                                                    disabled={isSavingProfile || newServiceData.pitch.length < 10}
                                                    onClick={handleAddService}
                                                    className="w-full h-14 bg-black text-white rounded-2xl text-[16px] font-black uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] disabled:opacity-40"
                                                >
                                                    {isSavingProfile ? <RefreshCw className="animate-spin" size={20} /> : 'List Service'}
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
                                            How Much<br />do you want?
                                        </h2>
                                    </div>

                                    <div className="mb-10">
                                        <div className="relative flex items-baseline gap-3 pb-3 border-b border-neutral-200">
                                            <span className="text-[40px] font-black text-[#BFBFBF]">MAD</span>
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
                                            Client Suggested {counterJob.price}MAD
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-end">
                                        <button
                                            onClick={handleSubmitCounter}
                                            disabled={isSubmittingOffer || !counterPrice}
                                            className="px-12 py-4 bg-black text-white rounded-full font-semibold text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_16px_30px_rgba(0,0,0,0.2)]"
                                        >
                                            {isSubmittingOffer ? 'Sending...' : 'Send'}
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
                                                <h4 className="font-black text-[18px] leading-tight">New Job!</h4>
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
                                                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Offer</p>
                                                <p className="text-xl font-black text-white">{latestJob.price} MAD</p>
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

                {isMobileLayout && (
                    <MobileBottomNav
                        activeTab={activeNav as any}
                        onTabChange={(tab) => {
                            setActiveNav(tab as any);
                            setShowNotificationsPage(false);
                        }}
                        variant="provider"
                    />
                )}
            </AnimatePresence>
        </div >
    );
}
