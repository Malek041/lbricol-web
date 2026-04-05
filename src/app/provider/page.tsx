"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import radarAnimation from '../../../public/Lottifiles Animation/Radar.json';
import { useLanguage } from '@/context/LanguageContext';
import confetti from 'canvas-confetti';
import OrderCard, { OrderDetails } from '@/features/orders/components/OrderCard';
import JobDetailsPopup, { JobDetails } from '@/features/orders/components/JobDetailsPopup';
import WeekCalendar from '@/features/calendar/components/WeekCalendar';
import ProfileView from '@/features/provider/components/ProfileView';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import ProviderOrdersView from '@/features/orders/components/ProviderOrdersView';
import ActivityTab from '@/features/orders/components/ActivityTab';
import AvailabilityTab from '@/features/orders/components/AvailabilityTab';
import ProviderRoutineModal from '@/features/orders/components/ProviderRoutineModal';
import MessagesView from '@/features/messages/components/MessagesView';
import PromoteYourselfView from '@/features/provider/components/PromoteYourselfView';
import PromocodesView from '@/features/client/components/PromocodesView';
import { isToday, isThisWeek, parseISO, startOfDay, addDays, format } from 'date-fns';
import { getAllServices, getServiceById, getServiceVector, getSubServiceName } from '@/config/services_config';
import { FloatingMessengerBubble } from '@/components/shared/FloatingMessengerBubble';
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
    MessageCircle,
    AlertCircle
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
import { writeCityIndex } from '@/lib/cityIndex';
import SplashScreen from '@/components/layout/SplashScreen';
import LanguagePreferencePopup from '@/features/onboarding/components/LanguagePreferencePopup';
import { NewJobCard, JobCard } from '@/features/provider/components/MarketJobCard';
import { PerformanceView } from '@/features/provider/components/PerformanceView';

import {
    UserData,
    Job,
    MobileJobsStatus,
    MobileJobsViewItem
} from '@/features/provider/types';
import {
    SERVICE_CATEGORIES,
    TIME_SLOTS,
    AVAILABILITY_SLOTS,
    ServiceCategory
} from '@/features/provider/constants/ProviderConstants';
import {
    normalizeServiceId,
    getFallbackJobCardImage
} from '@/features/provider/utils/providerUtils';


export default function ProviderPage() {
    // 1. Data State & Hooks
    const { t, setLanguage } = useLanguage();
    const [showLanguagePopup, setShowLanguagePopup] = useState(false);
    const { showToast } = useToast();
    const router = useRouter();
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Redirection check for first-timers
    useEffect(() => {
        const onboardingShown = localStorage.getItem('client_onboarding_shown');
        if (!onboardingShown) {
            router.push('/join');
        }
    }, [router]);

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
    const [activeBubble, setActiveBubble] = useState<{ id: string, avatar?: string, count: number, jobId: string } | null>(null);
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
    const [performanceTab, setPerformanceTab] = useState<'activity' | 'performance' | 'availability'>('activity');
    const [performanceDetail, setPerformanceDetail] = useState<'none' | 'financial' | 'operational' | 'reputation' | 'marketing' | 'growth' | 'tips-profile' | 'tips-pricing' | 'tips-stars' | 'tips-visibility' | 'availability'>('none');
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
    const [showRoutineModal, setShowRoutineModal] = useState(false);

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
        // Priority 1: Appointment Date & Time
        if (rawDate && rawDate !== '') {
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
            if (!Number.isNaN(parsed)) return parsed;
        }

        // Priority 2: Creation Timestamp (fallback for sorting/legacy)
        if (createdAt?.seconds) return createdAt.seconds * 1000;
        
        return 0;
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
            priceLabel: isMarket
                ? formatJobPrice(raw.totalPrice || raw.basePrice || raw.price)
                : String(raw.totalPrice || raw.basePrice || raw.price || '0'),
            image: raw.image || '',
            images: raw.images || [],
            rawJob: isMarket ? raw : undefined,
            rawAccepted: !isMarket ? raw : undefined,
            clientWhatsApp: raw.clientWhatsApp || raw.clientPhone || "",
            selectedCar: raw.selectedCar,
            carReturnDate: raw.carReturnDate,
            carReturnTime: raw.carReturnTime,
            totalPrice: raw.totalPrice,
            duration: raw.duration || (raw.carReturnDate && raw.date ? `${Math.max(1, Math.round((new Date(raw.carReturnDate).getTime() - new Date(raw.date).getTime()) / 86400000))} j` : undefined)
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

            // Keep city_index in sync (non-blocking)
            writeCityIndex(auth.currentUser.uid, city || userData?.city || '', {
                displayName: name,
                whatsappNumber: whatsapp,
                areas: selectedWorkAreas,
                workAreas: selectedWorkAreas,
                services: tempSelectedServices,
                rating: (userData as any)?.rating || 0,
                completedJobs: (userData as any)?.completedJobs || 0,
                numReviews: (userData as any)?.numReviews || 0,
                jobsDone: (userData as any)?.jobsDone || (userData as any)?.completedJobs || 0,
                bio: (userData as any)?.bio || (userData as any)?.quickPitch || '',
                isVerified: (userData as any)?.isVerified || false,
                isActive: (userData as any)?.isActive !== false,
                profilePhotoURL: (userData as any)?.profilePhotoURL || (userData as any)?.avatar,
                routine: (userData as any)?.routine,
            }).catch(console.warn);

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
                        } else if (noti.type === 'new_message') {
                            setActiveBubble({
                                id: change.doc.id,
                                avatar: noti.senderAvatar,
                                count: 1, 
                                jobId: noti.jobId
                            });
                            // Skip toast for messages as bubble is shown
                            title = "";
                        }

                        if (title !== "") {
                            showToast({
                                variant,
                                title,
                                description
                            });
                        }

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
            if (err.code !== 'permission-denied') {
                console.error("Notif listener error:", err);
            }
        });

        return () => unsubscribe();
    }, [user]);


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
                        clientAvatar: data.clientAvatar || undefined,
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
                        area: data.area || '',
                        offers: data.offers || [],
                        status: data.status,
                        image: data.images && data.images.length > 0 ? data.images[0] : undefined,
                        images: Array.isArray(data.images) ? data.images : [],
                        createdAt: data.createdAt,
                        clientId: data.clientId,
                        selectedCar: data.selectedCar,
                        carReturnDate: data.carReturnDate,
                        carReturnTime: data.carReturnTime,
                        totalPrice: data.totalPrice,
                        basePrice: data.basePrice,
                        locationDetails: data.locationDetails || null,
                        address: data.address || '',
                        city: data.city || '',
                        coords: data.coords || null
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
                        clientAvatar: data.clientAvatar || undefined,
                        confirmedAt: data.confirmedAt,
                        description: data.description || data.comment || '',
                        providerConfirmed: data.providerConfirmed,
                        selectedCar: data.selectedCar,
                        carReturnDate: data.carReturnDate,
                        carReturnTime: data.carReturnTime,
                        totalPrice: data.totalPrice,
                        basePrice: data.basePrice,
                        locationDetails: data.locationDetails || null,
                        address: data.address || '',
                        coords: data.coords || null
                    } as any);
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

    // Live Location Tracking for Bricoler Dashboard
    useEffect(() => {
        if (!user || !user.uid) return;

        let watchId: number | null = null;
        const bricolerRef = doc(db, 'bricolers', user.uid);

        // Mark as live initially
        updateDoc(bricolerRef, {
            isLive: true,
            lastActive: serverTimestamp()
        }).catch(err => console.error("Error marking bricoler live:", err));

        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    updateDoc(bricolerRef, {
                        current_lat: latitude,
                        current_lng: longitude,
                        lastActive: serverTimestamp()
                    }).catch(err => console.warn("Live location update failed:", err));
                },
                (err) => console.warn("Live location watch error:", err),
                { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
            );
        }

        // Cleanup: Mark as not live when leaving dashboard
        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            updateDoc(bricolerRef, {
                isLive: false,
                lastActive: serverTimestamp()
            }).catch(() => { /* silent fail on unmount */ });
        };
    }, [user]);


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
                const status = (job.status as any) || '';
                // Only auto-mark as done if it was active/confirmed, not just programmed but not yet started.
                // This prevents new missions from closing immediately.
                if (status === 'done' || status === 'delivered' || status === 'programmed' || status === 'broadcast') return;

                const startTs = parseDateTime(job.date, job.time);
                if (!startTs) return;

                // Get duration in hours from string like '2h-3h' or '2'
                const durStr = job.duration || '2';
                const hours = parseInt(durStr.split('-')[0]) || 2;
                let endTs = startTs + (hours * 3600 * 1000);

                const isCarRental = job.service === 'car_rental' || job.craft === 'Car rental' || job.craft === 'car_rental';
                if (isCarRental && job.carReturnDate) {
                    const rawReturnTime = (job.carReturnTime || '').split('-')[0].trim();
                    const returnTimePart = rawReturnTime.includes(':')
                        ? (rawReturnTime.split(':').length === 2 ? `${rawReturnTime}:00` : rawReturnTime)
                        : '23:59:00';
                    const returnDatePart = job.carReturnDate.split('T')[0];
                    const parsedDate = new Date(`${returnDatePart}T${returnTimePart}`);
                    if (!isNaN(parsedDate.getTime())) {
                        endTs = parsedDate.getTime();
                    }
                }

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

                                // Update city_index (non-blocking)
                                if (userData && job.city) {
                                    writeCityIndex(job.bricolerId, job.city, {
                                        ...userData,
                                        completedJobs: (userData.completedJobs || 0) + 1,
                                        jobsDone: (userData.jobsDone || userData.completedJobs || 0) + 1
                                    }).catch(console.warn);
                                }
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
    // --- Sound Effects ---
    const playNewJobSound = () => {
        try {
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio playback failed:', e));
        } catch (e) {
            console.log('Audio error:', e);
        }
    };

    useEffect(() => {
        if (showNewJobPopup) {
            playNewJobSound();
        }
    }, [showNewJobPopup]);
    const handleUpdateJob = async (id: string, updates: any) => {
        try {
            const jobRef = doc(db, 'jobs', id);

            // --- CAR RENTAL RETURN DATE GUARD ---
            if (updates.status === 'done') {
                const guardSnap = await getDoc(jobRef);
                if (guardSnap.exists()) {
                    const gData = guardSnap.data();
                    const isCarRental = gData.service === 'car_rental' || gData.craft === 'Car rental';
                    if (isCarRental && gData.carReturnDate) {
                        try {
                            const rawReturnTime = (gData.carReturnTime || '').split('-')[0].trim();
                            const returnTimePart = rawReturnTime.includes(':')
                                ? (rawReturnTime.split(':').length === 2 ? `${rawReturnTime}:00` : rawReturnTime)
                                : '23:59:00';
                            const returnDatePart = gData.carReturnDate.split('T')[0];
                            const returnDateTime = new Date(`${returnDatePart}T${returnTimePart}`);
                            if (!isNaN(returnDateTime.getTime()) && new Date() < returnDateTime) {
                                showToast({
                                    variant: 'error',
                                    title: t({ en: 'Return date not reached', fr: 'Date de retour non atteinte' }),
                                    description: t({
                                        en: `This rental cannot be marked as done until the return date (${returnDatePart}) has passed.`,
                                        fr: `Cette location ne peut pas être marquée comme terminée avant la date de retour (${returnDatePart}).`
                                    })
                                });
                                return;
                            }
                        } catch (e) { /* ignore parse errors */ }
                    }
                }
            }
            // --- CAR RENTAL RETURN DATE GUARD END ---

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

                    if ((updates.status === 'done' || updates.status === 'delivered') &&
                        jobData.status !== 'done' && jobData.status !== 'delivered' && jobData.status !== updates.status) {
                        if (jobData.bricolerId) {
                            const bricolerRef = doc(db, 'bricolers', jobData.bricolerId);
                            await updateDoc(bricolerRef, {
                                completedJobs: increment(1)
                            }).catch(console.error);

                            // Update city_index (non-blocking)
                            if (userData && jobData.city) {
                                writeCityIndex(jobData.bricolerId, jobData.city, {
                                    ...userData,
                                    completedJobs: (userData.completedJobs || 0) + 1,
                                    jobsDone: (userData.jobsDone || userData.completedJobs || 0) + 1
                                }).catch(console.warn);
                            }
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

    const handleStatusUpdate = async (jobId: string, status: string, subStatus?: string) => {
        try {
            const updates: any = { status };
            if (subStatus) updates.providerStatus = subStatus;

            await handleUpdateJob(jobId, updates);

            if (subStatus === 'heading') {
                const senderId = user?.uid;
                const senderName = userData?.name || user?.displayName || 'Bricoler';
                
                const messageText = t({ 
                    en: "I'm on my way! 🚀", 
                    fr: "Je suis en chemin ! 🚀",
                    ar: "أنا في الطريق! 🚀"
                });

                const messageData = {
                    senderId,
                    senderName,
                    text: messageText,
                    timestamp: serverTimestamp()
                };

                await addDoc(collection(db, 'jobs', jobId, 'messages'), messageData);

                const jobSnap = await getDoc(doc(db, 'jobs', jobId));
                if (jobSnap.exists()) {
                    const jobData = jobSnap.data();
                    if (jobData.clientId) {
                        await addDoc(collection(db, 'client_notifications'), {
                            clientId: jobData.clientId,
                            type: 'on_my_way',
                            jobId: jobId,
                            serviceName: jobData.service || 'Service',
                            senderName: senderName,
                            text: messageText,
                            read: false,
                            timestamp: serverTimestamp()
                        });
                    }
                }

                showToast({
                    variant: 'success',
                    title: t({ en: 'En route!', fr: 'En route !' }),
                    description: t({ en: 'Client has been notified.', fr: 'Le client a été notifié.' })
                });
            }
        } catch (error) {
            console.error('Error in status update:', error);
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
                    status: 'confirmed',
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
    const completionRate = monthJobs.length > 0 ? Math.round((monthDoneJobs.length / monthJobs.length) * 100) : 0;

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


// ── Shared Sub-component for Job Details ────────────────────────────────
const DetailItem = ({ icon: Icon, label, value, subValue, highlight }: { 
    icon: any, 
    label: string, 
    value: string | number, 
    subValue?: string,
    highlight?: boolean
}) => (
    <div className="flex items-start gap-5 p-6 border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors group">
        <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110",
            highlight ? "bg-[#01A083] text-white border border-[#008f75]" : "bg-neutral-50 text-neutral-400 border border-neutral-100"
        )}>
            <Icon size={24} strokeWidth={highlight ? 2.5 : 2} className={cn(!highlight && "group-hover:text-[#01A083]")} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-neutral-300 uppercase tracking-widest leading-none mb-2">{label}</p>
            <p className="text-[16px] font-black text-black leading-tight truncate">{value}</p>
            {subValue && <p className="text-[13px] font-bold text-neutral-400 mt-1 line-clamp-1">{subValue}</p>}
        </div>
    </div>
);

    const renderJobDetailsModal = () => {
        if (!viewingJobDetails) return null;
        
        const job = viewingJobDetails as any;
        const raw = (job.rawAccepted || job.rawJob || {}) as any;
        const user = userData as any;
        
        let mappedStatus: JobDetails['status'] = 'new';
        if (job.status === 'done' || raw.status === 'completed') {
            mappedStatus = 'completed';
        } else if (raw.status === 'confirmed' || raw.status === 'programmed') {
            mappedStatus = 'programmed';
        } else if (job.status === 'waiting' || raw.status === 'waiting') {
            mappedStatus = 'waiting';
        } else if (raw.status === 'accepted') {
            mappedStatus = 'accepted';
        } else if (raw.status === 'declined') {
            mappedStatus = 'declined';
        }

        const popupData: JobDetails = {
            id: job.id,
            service: job.service || raw.craft || '',
            clientName: job.clientName || 'Client',
            clientRating: job.clientRating || 5,
            location: raw.address || raw.location || job.city || '',
            date: raw.date || job.dateLabel || '',
            time: raw.time || job.timeLabel || '',
            duration: raw.duration || job.duration || 'Flexible',
            price: parseFloat(job.priceLabel || '0') || raw.price || 0,
            status: mappedStatus,
            description: job.description || raw.description || raw.comment,
            photos: raw.images || [],
            clientAvatar: job.clientAvatar || raw.clientAvatar || raw.userPhotoURL,
            bricolerId: user?.id || user?.uid,
            bricolerName: user?.name,
            bricolerAvatar: user?.profilePhotoURL || user?.avatar || user?.photoURL || undefined,
            bricolerRating: user?.rating || 5,
            bricolerWhatsApp: user?.phone || user?.whatsappNumber,
            clientWhatsApp: raw.userPhone || raw.clientPhone,
            selectedCar: raw.selectedCar,
            carReturnDate: raw.carReturnDate,
            carReturnTime: raw.carReturnTime,
            totalPrice: raw.totalPrice || parseFloat(job.priceLabel || '0'),
            movingVehicle: raw.movingVehicle,
            recipientName: raw.recipientName,
            pickupAddress: raw.pickupAddress,
            dropoffAddress: raw.dropoffAddress,
            details: raw.details,
            city: job.city || raw.city || raw.area,
        } as any;

        return (
            <JobDetailsPopup
                job={popupData}
                onClose={() => setViewingJobDetails(null)}
                mode="provider"
                onAccept={(jobId) => {
                    setViewingJobDetails(null);
                    if (job.rawJob) handleAcceptJob(job.rawJob);
                }}
                onChat={(jobId, bricolerId, bricolerName) => {
                    setViewingJobDetails(null);
                    if (job.rawAccepted) {
                        setSelectedChat(job.rawAccepted);
                        setActiveNav('messages');
                    } else if (job.rawJob) {
                        // Construct minimal OrderDetails for chat if not yet accepted
                        setSelectedChat({
                            id: jobId,
                            service: job.service,
                            serviceId: job.rawJob.craft || job.rawJob.serviceId,
                            clientId: job.rawJob.clientId,
                            clientName: job.clientName,
                            clientAvatar: job.clientAvatar,
                            jobTitle: job.service,
                            status: job.rawJob.status
                        } as any);
                        setActiveNav('messages');
                    }
                }}
            />
        );
    };

    return (
        <div className="w-full h-screen overflow-hidden flex flex-col transition-colors duration-300" style={{ backgroundColor: '#FFFFFF' }}>
            <AnimatePresence key="provider-splash-presence">
                {isLoading && <SplashScreen key="provider-splash" />}
            </AnimatePresence>
            {renderJobDetailsModal()}
            <AnimatePresence key="main-app-presence">
            {isMobileLayout && (activeNav === 'jobs' || (activeNav === 'performance' && performanceDetail === 'none')) && (
                <header key="bricoler-mobile-header" className="pt-10 pb-3 px-6 flex flex-col flex-none sticky top-0 z-[100] transition-colors duration-300 bg-white border-b border-neutral-100">
                    {(activeNav as string) === 'jobs' && (
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-black text-[22px] font-black tracking-tight" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                {t({ en: 'Market', fr: 'Missions' })}
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
                    )}

                    {(activeNav as string) === 'performance' && performanceDetail === 'none' && (
                        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'activity' as const, label: t({ en: 'Orders', fr: 'Commandes' }) },
                                { id: 'performance' as const, label: t({ en: 'Performance', fr: 'Performance' }) },
                                { id: 'availability' as const, label: t({ en: 'Availability', fr: 'Dispo' }) }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setPerformanceTab(tab.id as any);
                                        if ((activeNav as string) !== 'performance') setActiveNav('performance');
                                    }}
                                    className={cn(
                                        "pb-2 text-[15px] transition-all relative shrink-0",
                                        performanceTab === tab.id ? "font-black text-black" : "font-bold text-neutral-400"
                                    )}
                                >
                                    {tab.label}
                                    {performanceTab === tab.id && (
                                        <motion.div layoutId="performance-header-tab" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#01A083] rounded-t-full" />
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
                                                    className="absolute inset-x-5 top-14 z-50 bg-white rounded-2xl border border-neutral-100 overflow-hidden"
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
                                                <div className="h-[34px] px-[18px] bg-[#F9F9F9] rounded-full flex items-center justify-center gap-1.5 border border-neutral-100">
                                                    <Star size={15} className="fill-[#FFC244] text-[#FFC244] -ml-1" />
                                                    <span className="text-[15px] font-medium text-black mt-0.5" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>{monthAvgRating}</span>
                                                </div>
                                                <div className="h-[34px] px-8 flex-1 bg-[#F9F9F9] rounded-full flex items-center justify-center border border-neutral-100">
                                                    <span className="text-[13px] font-bold text-black mt-0.5 tracking-wide" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                        {t({ en: 'MAD', fr: 'MAD' })} {monthRevenueNum >= 1000 ? `${(monthRevenueNum / 1000).toFixed(0)}K` : monthRevenueNum}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Occupancy bar */}
                                            <div className="h-[34px] bg-[#F9F9F9] rounded-full overflow-hidden relative border border-neutral-100 flex items-center mx-0.5">
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
                                                    ? "bg-[#01A083] border-[#008f75] text-white"
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
                                                            ? "bg-[#01A083] border-[#008f75] text-white"
                                                            : "bg-[#F9F9F9] border-transparent text-neutral-900"
                                                    )}
                                                >
                                                    {t(cat.name)}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <section className="bg-white pt-2 pb-6 border-b border-neutral-100 mb-2 relative z-20">
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
                                                                        <span className="text-white text-[11px] font-bold">{job.clientName}</span>
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
                                                                        className="h-14 flex-1 rounded-2xl bg-[#01A083] text-white flex items-center justify-center gap-2.5 text-[15px] font-black border border-[#008f75] active:scale-95 transition-all"
                                                                    >
                                                                        <MessageSquare size={20} strokeWidth={2.5} />
                                                                        {t({ en: 'Quick Chat', fr: 'Chat rapide' })}
                                                                    </button>
                                                                    {(() => {
                                                                        const ra = job.rawAccepted as any;
                                                                        const isCarRental = ra?.service === 'car_rental' || ra?.craft === 'Car rental';
                                                                        let returnLocked = false;
                                                                        let returnLabel = '';
                                                                        if (isCarRental && ra?.carReturnDate) {
                                                                            try {
                                                                                const rawT = (ra.carReturnTime || '').split('-')[0].trim();
                                                                                const tPart = rawT.includes(':') ? (rawT.split(':').length === 2 ? `${rawT}:00` : rawT) : '23:59:00';
                                                                                const dt = new Date(`${ra.carReturnDate.split('T')[0]}T${tPart}`);
                                                                                if (!isNaN(dt.getTime()) && new Date() < dt) {
                                                                                    returnLocked = true;
                                                                                    returnLabel = ra.carReturnDate.split('T')[0];
                                                                                }
                                                                            } catch (e) { }
                                                                        }
                                                                        return (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleUpdateJob(job.rawAccepted!.id!, { status: 'done' });
                                                                                }}
                                                                                title={returnLocked ? t({ en: `Locked until return: ${returnLabel}`, fr: `Bloqué jusqu'au retour: ${returnLabel}` }) : t({ en: 'Mark as done', fr: 'Marquer comme terminée' })}
                                                                                className={cn(
                                                                                    "h-14 w-14 rounded-2xl flex items-center justify-center active:scale-95 transition-all",
                                                                                    returnLocked ? "bg-neutral-300 text-neutral-500 cursor-not-allowed" : "bg-[#01A083] text-white border border-[#008f75]"
                                                                                )}
                                                                            >
                                                                                {returnLocked ? <Clock size={22} strokeWidth={2.5} /> : <Check size={24} strokeWidth={3} />}
                                                                            </button>
                                                                        );
                                                                    })()}
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
                                                            ? "bg-[#01A083] text-white"
                                                            : "bg-[#F5F5F5] text-[#555555]"
                                                    )}
                                                >
                                                    {tab.label}
                                                    {tab.count > 0 && (
                                                        <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-[#E51B24] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
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
                                                <div className="h-[480px] rounded-[30px] border border-neutral-100 bg-[#FCFCFC] flex flex-col items-center justify-center text-center px-8 relative overflow-hidden">
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
                                                                <div className="h-full rounded-none overflow-hidden bg-white border border-neutral-100 flex flex-col">
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
                                                                                ? "bg-[#01A083]"
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
                                                                                        "h-[64px] w-[64px] rounded-full flex items-center justify-center transition-colors border border-black/10",
                                                                                        (!canConfirm || actionsDisabled)
                                                                                            ? "bg-neutral-200 text-neutral-400 border border-neutral-300"
                                                                                            : "bg-[#01A083] text-white border-[#008f75]"
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
                                                    className="bg-white rounded-2xl overflow-hidden border border-neutral-200 cursor-pointer"
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
                                                                    job.status === 'programmed' ? 'bg-[#01A083] text-white' : 'bg-emerald-500 text-white'
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
                                                                        className="h-11 flex-1 rounded-full bg-[#01A083] text-white flex items-center justify-center gap-2 text-[13px] font-bold transition-colors border border-[#008f75]"
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
                                                                    {(() => {
                                                                        const ra = job.rawAccepted as any;
                                                                        const isCarRental = ra?.service === 'car_rental' || ra?.craft === 'Car rental';
                                                                        let returnLocked = false;
                                                                        let returnLabel = '';
                                                                        if (isCarRental && ra?.carReturnDate) {
                                                                            try {
                                                                                const rawT = (ra.carReturnTime || '').split('-')[0].trim();
                                                                                const tPart = rawT.includes(':') ? (rawT.split(':').length === 2 ? `${rawT}:00` : rawT) : '23:59:00';
                                                                                const dt = new Date(`${ra.carReturnDate.split('T')[0]}T${tPart}`);
                                                                                if (!isNaN(dt.getTime()) && new Date() < dt) {
                                                                                    returnLocked = true;
                                                                                    returnLabel = ra.carReturnDate.split('T')[0];
                                                                                }
                                                                            } catch (e) { }
                                                                        }
                                                                        return (
                                                                            <button
                                                                                onClick={() => handleUpdateJob(job.rawAccepted!.id!, { status: 'done' })}
                                                                                title={returnLocked ? t({ en: `Locked until return: ${returnLabel}`, fr: `Bloqué jusqu'au retour: ${returnLabel}` }) : t({ en: 'Mark as done', fr: 'Marquer comme terminée' })}
                                                                                className={cn(
                                                                                    "h-11 flex-1 rounded-full flex items-center justify-center gap-2 text-[13px] font-bold transition-colors border border-[#008f75]",
                                                                                    returnLocked ? "bg-neutral-200 text-neutral-500 cursor-not-allowed" : "bg-[#01A083] text-white"
                                                                                )}
                                                                            >
                                                                                {returnLocked ? <Clock size={14} strokeWidth={2} /> : <CheckCircle2 size={16} strokeWidth={1.8} />}
                                                                                {returnLocked ? t({ en: `Return: ${returnLabel}`, fr: `Retour: ${returnLabel}` }) : t({ en: 'Done', fr: 'Terminée' })}
                                                                            </button>
                                                                        );
                                                                    })()}
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
                                                                        className="h-11 flex-1 rounded-full bg-[#01A083] text-white flex items-center justify-center gap-2 text-[13px] font-bold transition-colors border border-[#008f75]"
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
                                                                    className="flex-1 px-4 py-2.5 bg-[#01A083] text-white text-[13px] font-bold rounded-full transition-all border border-[#008f75]"
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
                                                            ? "bg-[#01A083] border-[#008f75] text-white"
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
                                                                    ? "bg-[#01A083] border-[#008f75] text-white"
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
                                                <div className="bg-white rounded-[40px] h-[320px] border border-neutral-100 relative overflow-hidden">
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
                                                            isWaiting={!!job.offers?.find((o: any) => o.bricolerId === auth.currentUser?.uid)}
                                                            isSubmitting={isSubmittingOffer}
                                                            onAccept={handleAcceptJob}
                                                            onCounter={handleCounterClick}
                                                            formatPrice={formatJobPrice}
                                                            getJobDateTime={getJobDateTime}
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

                    {activeNav === 'calendar' && (() => {
                        const _ud = userData as any;
                        const hasRoutine = _ud?.routine && typeof _ud.routine === 'object' && Object.keys(_ud.routine).length > 0;
                        return (
                            <div className="relative h-full w-full">
                                {/* The actual orders view — blurred when no routine */}
                                <div className={hasRoutine ? '' : 'pointer-events-none select-none filter blur-sm brightness-90 saturate-50'}>
                                    <ProviderOrdersView
                                        confirmedOrders={acceptedJobsSorted}
                                        availableJobs={marketJobsOpen}
                                        userData={userData}
                                        setUserData={setUserData as any}
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
                                    />
                                </div>

                                {/* Routine-required overlay — shown only to new bricolers */}
                                {!hasRoutine && (
                                    <div className="absolute inset-0 z-[50] flex flex-col items-center justify-end pb-28 px-6">
                                        <motion.div
                                            initial={{ opacity: 0, y: 40, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ type: 'spring', damping: 24, stiffness: 260, delay: 0.1 }}
                                            className="w-full max-w-sm bg-white rounded-[32px] p-7 shadow-2xl border border-neutral-100 flex flex-col items-center text-center"
                                        >
                                            {/* Icon */}
                                            <div className="w-16 h-16 bg-[#E6F7F4] rounded-2xl flex items-center justify-center mb-5">
                                                <Calendar size={30} className="text-[#01A083]" />
                                            </div>

                                            <h2 className="text-[20px] font-black text-black mb-2 leading-tight" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                                {t({ en: 'Set your weekly routine first', fr: 'Définissez votre routine d\'abord', ar: 'حدد روتينك الأسبوعي أولاً' })}
                                            </h2>
                                            <p className="text-[13px] font-medium text-neutral-500 mb-6 leading-relaxed">
                                                {t({
                                                    en: 'Clients can only book you when they know your availability. Set your weekly hours to start receiving orders.',
                                                    fr: 'Les clients peuvent vous réserver uniquement quand ils connaissent vos disponibilités. Définissez vos horaires pour commencer à recevoir des commandes.',
                                                    ar: 'لا يمكن للعملاء حجزك إلا عند معرفة مواعيدك. حدد ساعات عملك الأسبوعية لبدء استقبال الطلبات.'
                                                })}
                                            </p>

                                            <button
                                                onClick={() => {
                                                    setActiveNav('performance');
                                                    setPerformanceTab('availability');
                                                }}
                                                className="w-full h-14 bg-[#01A083] text-white font-black text-[15px] rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all border border-[#008f75]"
                                            >
                                                <Calendar size={18} />
                                                {t({ en: 'Set weekly routine', fr: 'Définir ma routine', ar: 'تحديد الروتين الأسبوعي' })}
                                            </button>
                                        </motion.div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {activeNav === 'performance' && (
                        <PerformanceView
                            performanceTab={performanceTab}
                            performanceDetail={performanceDetail}
                            setPerformanceDetail={setPerformanceDetail}
                            performanceScrollRef={performanceScrollRef}
                            userData={userData}
                            acceptedJobsSorted={acceptedJobsSorted}
                            availableJobs={availableJobs}
                            acceptedJobs={acceptedJobs}
                            monthLabel={monthLabel}
                            showMonthPicker={showMonthPicker}
                            setShowMonthPicker={setShowMonthPicker}
                            selectedMonthDt={selectedMonthDt}
                            setSelectedMonthDt={setSelectedMonthDt}
                            monthAvgRating={monthAvgRating}
                            monthRatings={monthRatings}
                            monthJobs={monthJobs}
                            monthDoneJobs={monthDoneJobs}
                            monthRevenueNum={monthRevenueNum}
                            completionRate={completionRate}
                            mobileNotificationsCount={mobileNotificationsCount}
                            setShowNotificationsPage={setShowNotificationsPage}
                            showToast={showToast}
                            setViewingJobDetails={setViewingJobDetails}
                            handleConfirmJob={handleConfirmJob}
                            handleStatusUpdate={handleStatusUpdate}
                            setRedistributeJob={setRedistributeJob}
                            setShowRedistributeModal={setShowRedistributeModal}
                            toMobileItem={toMobileItem}
                            t={t}
                            showRoutineModal={showRoutineModal}
                            setShowRoutineModal={setShowRoutineModal}
                            setUserData={setUserData}
                            TIME_SLOTS={TIME_SLOTS}
                        />
                    )}
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
                            <div className="h-full flex flex-col pt-0">
                                <MessagesView
                                    orders={acceptedJobs}
                                    currentUser={user}
                                    isModal={false}
                                />
                            </div>
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



                    {/* ── Redistribute Modal ── */}
                    <AnimatePresence key="redistribute-presence">
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
                                        className="relative bg-white w-full rounded-t-[32px] p-6 pb-24 border-t border-neutral-100 max-h-[80vh] overflow-y-auto"
                                    >
                                        <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-6" />
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
                                                <RefreshCw size={20} className="text-amber-500" />
                                            </div>
                                            <div>
                                                <h2 className="text-[20px] font-black text-neutral-900">{t({ en: 'Redistribute Job', fr: 'Redistribuer la mission', ar: 'إعادة توزيع المهمة' })}</h2>
                                                <p className="text-[12px] text-neutral-500 font-medium">{redistributeJob.service} · {redistributeJob.date}</p>
                                            </div>
                                        </div>

                                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5">
                                            <p className="text-[13px] font-bold text-amber-700">{t({ en: '⚠️ Financial Penalty Notice', fr: '⚠️ Avis de pénalité financière', ar: '⚠️ تنبيه بخصم مالي' })}</p>
                                            <p className="text-[12px] font-medium text-amber-600 mt-1 leading-relaxed">
                                                {t({ en: 'Redistributing a confirmed job applies a', fr: 'La redistribution d’une mission confirmée applique une', ar: 'تؤدي إعادة توزيع مهمة مؤكدة إلى تطبيق' })} <strong>{t({ en: 'penalty deduction', fr: 'déduction de pénalité', ar: 'خصم جزائي' })}</strong> {t({ en: 'to your next earnings. Use this only for urgent, genuine circumstances.', fr: 'sur vos prochains gains. Utilisez cela uniquement pour des circonstances urgentes et réelles.', ar: 'على أرباحك القادمة. استخدم هذا فقط للظروف العاجلة والحقيقية.' })}
                                            </p>
                                        </div>

                                        <div className="mb-5">
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'Reason for redistribution *', fr: 'Raison de redistribution *', ar: 'سبب إعادة التوزيع *' })}</label>
                                            <textarea
                                                value={redistributeReason}
                                                onChange={(e) => setRedistributeReason(e.target.value)}
                                                placeholder={t({ en: 'Describe your urgent circumstance clearly...', fr: 'Décrivez clairement votre situation urgente...', ar: 'صف ظروفك العاجلة بوضوح...' })}
                                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#01A083]/10 resize-none min-h-[100px]"
                                            />
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowRedistributeModal(false)}
                                                className="flex-1 h-12 rounded-2xl border border-neutral-200 text-sm font-black text-neutral-600 hover:bg-neutral-50 transition-colors"
                                            >
                                                {t({ en: 'Cancel', fr: 'Annuler', ar: 'إلغاء' })}
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
                                                                title: t({ en: 'Order Redistributed', fr: 'Commande redistribuée', ar: 'تمت إعادة توزيع الطلب' }),
                                                                body: t({
                                                                    en: `${userData?.name || 'Your professional'} had to redistribute your job. Please choose someone else or cancel.`,
                                                                    fr: `${userData?.name || 'Votre professionnel'} a dû redistribuer votre mission. Veuillez choisir quelqu'un d'autre ou annuler.`,
                                                                    ar: `اضطر ${userData?.name || 'المحترف'} لإعادة توزيع مهمتك. يرجى اختيار شخص آخر أو الإلغاء.`
                                                                }),
                                                                orderId: redistributeJob.id
                                                            });
                                                        } catch (notifErr) {
                                                            console.warn("Failed to notify client about redistribution:", notifErr);
                                                        }

                                                        showToast({ variant: 'info', title: t({ en: 'Job redistributed', fr: 'Mission redistribuée', ar: 'تمت إعادة توزيع المهمة' }), description: t({ en: 'A penalty has been applied to your earnings.', fr: 'Une pénalité a été appliquée à vos revenus.', ar: 'تم تطبيق خصم جزائي على أرباحك.' }) });
                                                        setShowRedistributeModal(false);
                                                        setRedistributeReason('');
                                                    } catch (e) {
                                                        showToast({ variant: 'error', title: t({ en: 'Error', fr: 'Erreur', ar: 'خطأ' }), description: t({ en: 'Could not redistribute. Please try again.', fr: 'Impossible de redistribuer. Veuillez réessayer.', ar: 'تعذر إعادة التوزيع. يرجى المحاولة مرة أخرى.' }) });
                                                    } finally {
                                                        setIsRedistributing(false);
                                                    }
                                                }}
                                                className="flex-1 h-12 rounded-2xl bg-[#01A083] text-white text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-[#008f75]"
                                            >
                                                {isRedistributing ? t({ en: 'Processing…', fr: 'En cours…', ar: 'جاري المعالجة...' }) : t({ en: 'Confirm Redistribution', fr: 'Confirmer la redistribution', ar: 'تأكيد إعادة التوزيع' })}
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
                                        className="relative bg-white w-full rounded-t-[32px] p-6 pb-24 border-t border-neutral-100"
                                    >
                                        <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-6" />
                                        <div className="text-center mb-6">
                                            <p className="text-[12px] font-black text-neutral-400 uppercase tracking-widest mb-1">{t({ en: 'Rate your client', fr: 'Évaluez votre client', ar: 'قيم عميلك' })}</p>
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
                                                        className={cn('transition-colors', s <= clientRating ? 'text-[#01A083] fill-[#01A083]' : 'text-neutral-300')}
                                                    />
                                                </button>
                                            ))}
                                        </div>

                                        <div className="mb-5">
                                            <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'Comment (optional)', fr: 'Commentaire (optionnel)', ar: 'تعليق (اختياري)' })}</label>
                                            <textarea
                                                value={clientRatingComment}
                                                onChange={(e) => setClientRatingComment(e.target.value)}
                                                placeholder={t({ en: 'How was the client to work with?', fr: 'Comment était le client ?', ar: 'كيف كان التعامل مع العميل؟' })}
                                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#01A083]/10 resize-none min-h-[80px]"
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
                                                    showToast({ variant: 'success', title: t({ en: 'Rating submitted!', fr: 'Évaluation envoyée !', ar: 'تم إرسال التقييم!' }), description: t({ en: 'Thank you for your feedback.', fr: 'Merci pour votre retour.', ar: 'شكراً لتعليقك.' }) });
                                                    setShowRateClientModal(false);
                                                } catch (e) {
                                                    showToast({ variant: 'error', title: t({ en: 'Error', fr: 'Erreur', ar: 'خطأ' }), description: t({ en: 'Could not submit rating. Try again.', fr: 'Impossible d\'envoyer l\'évaluation. Réessayez.', ar: 'تعذر إرسال التقييم. حاول مرة أخرى.' }) });
                                                } finally {
                                                    setIsSubmittingRating(false);
                                                }
                                            }}
                                            className="w-full h-14 rounded-2xl bg-[#01A083] text-white text-[15px] font-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-[#008f75]"
                                        >
                                            {isSubmittingRating ? t({ en: 'Submitting…', fr: 'Envoi…', ar: 'جاري الإرسال...' }) : `${t({ en: 'Submit', fr: 'Envoyer', ar: 'إرسال' })} ${clientRating > 0 ? `${clientRating}★` : t({ en: 'Rating', fr: 'l\'évaluation', ar: 'التقييم' })}`}
                                        </button>
                                    </motion.div>
                                </div>
                            )
                        }
                    </AnimatePresence >

                    {/* Chat and Other Overlays */}
                    <AnimatePresence key="other-overlays-presence">
                        {selectedChat && (
                            <motion.div
                                key="chat-modal-overlay"
                                initial={{ opacity: 0, x: '100%' }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed inset-0 z-[5100] bg-white flex flex-col"
                                style={{ height: 'calc(100% - 82px - env(safe-area-inset-bottom))', bottom: 'calc(82px + env(safe-area-inset-bottom))', top: 0 }}
                            >
                                <MessagesView
                                    orders={acceptedJobs}
                                    currentUser={user}
                                    initialSelectedJobId={selectedChat?.id}
                                    isModal={true}
                                    onBackToOrders={() => setSelectedChat(null)}
                                />
                            </motion.div>
                        )}
                        {
                            showCashOutModal && (
                                <div key="cashout-modal" className="fixed inset-0 z-[110] flex items-center justify-center p-6 pb-20 md:pb-6">
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCashOutModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[40px] p-10 border border-neutral-100 overflow-hidden">
                                        <div className="absolute top-0 right-0 p-6">
                                            <button onClick={() => setShowCashOutModal(false)} className="p-2 hover:bg-neutral-50 rounded-full transition-colors text-neutral-400">
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <h2 className="text-3xl font-black text-neutral-900 mb-2">{t({ en: 'Request Payout', fr: 'Demande de paiement', ar: 'طلب سحب الأرباح' })}</h2>
                                        <p className="text-neutral-500 text-sm mb-8 font-medium">{t({ en: 'Choose your preferred withdrawal method. Payouts are usually processed within 24-48 hours.', fr: 'Choisissez votre méthode de retrait préférée. Les paiements sont généralement traités sous 24-48 heures.', ar: 'اختر طريقة السحب المفضلة لديك. يتم عادةً معالجة المدفوعات في غضون 24-48 ساعة.' })}</p>

                                        <div className="space-y-4 mb-8">
                                            <div
                                                onClick={() => setCashOutMethod('bank')}
                                                className={cn(
                                                    "p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between",
                                                    cashOutMethod === 'bank' ? "border-[#01A083] bg-neutral-50" : "border-neutral-100 opacity-60 hover:opacity-100"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-white rounded-xl border border-neutral-100 flex items-center justify-center">
                                                        <Wallet size={20} className="text-blue-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-neutral-900">{t({ en: 'Bank Transfer (RIB)', fr: 'Virement bancaire (RIB)', ar: 'تحويل بنكي (RIB)' })}</p>
                                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t({ en: 'Free • 2 days', fr: 'Gratuit • 2 jours', ar: 'مجاني • يومين' })}</p>
                                                    </div>
                                                </div>
                                                {cashOutMethod === 'bank' && <CheckCircle2 size={20} className="text-[#01A083]" />}
                                            </div>

                                            <div
                                                onClick={() => setCashOutMethod('wafacash')}
                                                className={cn(
                                                    "p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between",
                                                    cashOutMethod === 'wafacash' ? "border-[#01A083] bg-neutral-50" : "border-neutral-100 opacity-60 hover:opacity-100"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-white rounded-xl border border-neutral-100 flex items-center justify-center">
                                                        <Navigation size={20} className="text-red-500" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-neutral-900">{t({ en: 'Wafacash / Cash Plus', fr: 'Wafacash / Cash Plus', ar: 'وفاكاش / كاش بلوس' })}</p>
                                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{t({ en: '20 MAD fee • Instant', fr: 'Frais 20 MAD • Instantané', ar: 'عمولة 20 درهم • فوري' })}</p>
                                                    </div>
                                                </div>
                                                {cashOutMethod === 'wafacash' && <CheckCircle2 size={20} className="text-[#01A083]" />}
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'Payout Details', fr: 'Informations de paiement', ar: 'تفاصيل السحب' })}</label>
                                                <textarea
                                                    placeholder={cashOutMethod === 'bank' ? t({ en: 'Enter your 24-digit RIB number...', fr: 'Entrez votre numéro RIB de 24 chiffres...', ar: 'أدخل رقم RIB المكون من 24 رقماً...' }) : t({ en: 'Enter your Full Name and Phone Number...', fr: 'Entrez votre nom complet et numéro de téléphone...', ar: 'أدخل اسمك الكامل ورقم هاتفك...' })}
                                                    className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#01A083]/20 transition-all min-h-[100px] text-sm"
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    showToast({
                                                        variant: 'success',
                                                        title: t({ en: 'Payout request sent.', fr: 'Demande de paiement envoyée.', ar: 'تم إرسال طلب السحب.' }),
                                                        description: t({ en: 'You will receive a confirmation message shortly.', fr: 'Vous recevrez un message de confirmation prochainement.', ar: 'ستتلقى رسالة تأكيد قريباً.' })
                                                    });
                                                    setShowCashOutModal(false);
                                                }}
                                                className="w-full py-5 bg-black text-white font-black rounded-2xl transition-all active:scale-[0.98]"
                                            >
                                                {t({ en: 'Submit Request', fr: 'Envoyer la demande', ar: 'إرسال الطلب' })}
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
                                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[40px] p-10 border border-neutral-100 overflow-hidden">
                                        <div className="absolute top-0 right-0 p-6">
                                            <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-neutral-50 rounded-full transition-colors text-neutral-400">
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <h2 className="text-3xl font-black text-neutral-900 mb-2">{t({ en: 'Profile Settings', fr: 'Paramètres du profil', ar: 'إعدادات الحساب' })}</h2>
                                        <p className="text-neutral-500 text-sm mb-8 font-medium">{t({ en: 'Update your professional details and contact information.', fr: 'Mettez à jour vos informations professionnelles et vos coordonnées.', ar: 'تحديث بياناتك المهنية ومعلومات الاتصال.' })}</p>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'Display Name', fr: 'Nom affiché', ar: 'اسم العرض' })}</label>
                                                <input
                                                    ref={nameInputRef}
                                                    type="text"
                                                    defaultValue={userData?.name || user?.displayName || ''}
                                                    className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#01A083]/10 transition-all text-sm"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="relative">
                                                    <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'City', fr: 'Ville', ar: 'المدينة' })}</label>
                                                    <select
                                                        ref={cityInputRef}
                                                        defaultValue={providerCity}
                                                        className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#01A083]/10 transition-all text-sm appearance-none cursor-pointer hover:bg-neutral-100 font-bold"
                                                    >
                                                        <option disabled>{t({ en: 'Select City', fr: 'Choisir une ville', ar: 'اختر المدينة' })}</option>
                                                        <option>{t({ en: 'Casablanca', fr: 'Casablanca', ar: 'الدار البيضاء' })}</option>
                                                        <option>{t({ en: 'Rabat', fr: 'Rabat', ar: 'الرباط' })}</option>
                                                        <option>{t({ en: 'Marrakech', fr: 'Marrakech', ar: 'مراكش' })}</option>
                                                        <option>{t({ en: 'Tangier', fr: 'Tanger', ar: 'طنجة' })}</option>
                                                        <option>{t({ en: 'Essaouira', fr: 'Essaouira', ar: 'الصويرة' })}</option>
                                                    </select>
                                                    <div className="absolute right-4 top-[42px] pointer-events-none">
                                                        <ChevronDown size={16} className="text-neutral-400" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'Language', fr: 'Langue', ar: 'اللغة' })}</label>
                                                    <div className="w-full px-5 py-4 bg-neutral-100 border border-neutral-100 rounded-2xl text-sm opacity-50 cursor-not-allowed flex items-center gap-2">
                                                        <Globe size={14} /> {t({ en: 'English', fr: 'Anglais', ar: 'الإنجليزية' })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Work Areas Selector */}
                                            <div>
                                                <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">{t({ en: 'Work Areas (Neighborhoods)', fr: 'Zones de travail (quartiers)', ar: 'مناطق العمل (الأحياء)' })}</label>
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
                                                            className="appearance-none pl-3 pr-8 py-1.5 bg-[#01A083] text-white rounded-full text-xs font-bold hover:bg-[#008f75] transition-colors cursor-pointer outline-none"
                                                        >
                                                            <option value="" disabled>{t({ en: '+ Add Neighborhood', fr: '+ Ajouter un quartier', ar: '+ إضافة حي' })}</option>
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
                                                <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-3">{t({ en: 'My Services', fr: 'Mes services', ar: 'خدماتي' })}</label>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {tempSelectedServices.map(sId => {
                                                        const s = getServiceById(sId);
                                                        return (
                                                            <div key={sId} className="pl-3 pr-2 py-1.5 bg-neutral-100 rounded-full text-xs font-bold text-neutral-700 flex items-center gap-2 group border border-transparent hover:border-neutral-200 transition-all">
                                                                {s?.icon && <s.icon size={12} className="text-neutral-500" />}
                                                                {s?.name || sId}
                                                                <button
                                                                    onClick={() => setTempSelectedServices(prev => prev.filter(id => id !== sId))}
                                                                    className="p-1 hover:bg-white rounded-full transition-colors text-neutral-400 hover:text-red-500"
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
                                                            className="appearance-none pl-3 pr-8 py-1.5 bg-[#01A083] text-white rounded-full text-xs font-bold hover:bg-[#008f75] transition-colors cursor-pointer outline-none border border-transparent focus:ring-2 focus:ring-offset-1 focus:ring-[#01A083]/20"
                                                        >
                                                            <option value="" disabled>{t({ en: '+ Add Service', fr: '+ Ajouter un service', ar: '+ إضافة خدمة' })}</option>
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
                                                    {t({ en: 'Adding services increases your job visibility.', fr: 'Ajouter des services augmente votre visibilité sur les missions.', ar: 'إضافة الخدمات تزيد من ظهورك للطلبات.' })}
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2">{t({ en: 'WhatsApp Number', fr: 'Numéro WhatsApp', ar: 'رقم الواتساب' })}</label>
                                                <input
                                                    ref={whatsappInputRef}
                                                    type="tel"
                                                    defaultValue={userData?.whatsappNumber || ''}
                                                    className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#01A083]/10 transition-all text-sm"
                                                />
                                            </div>

                                            <div className="pt-4 flex gap-4">
                                                <button
                                                    onClick={() => setShowProfileModal(false)}
                                                    className="flex-1 py-4 border border-neutral-200 text-neutral-900 font-black rounded-2xl hover:bg-neutral-50 transition-all"
                                                >
                                                    {t({ en: 'Cancel', fr: 'Annuler', ar: 'إلغاء' })}
                                                </button>
                                                <button
                                                    disabled={isSavingProfile}
                                                    onClick={handleSaveProfile}
                                                    className="flex-[2] py-4 bg-[#01A083] text-white font-black rounded-2xl transition-all active:scale-[0.98] disabled:opacity-40 border border-[#008f75]"
                                                >
                                                    {isSavingProfile ? <RefreshCw className="animate-spin" size={20} /> : t({ en: 'Save Profile', fr: 'Enregistrer le profil', ar: 'حفظ الحساب' })}
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
                                        className="relative bg-white w-full rounded-t-[32px] p-6 pb-24 border-t border-neutral-100 max-h-[85vh] overflow-y-auto"
                                    >
                                        <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-6" />

                                        <h2 className="text-[24px] font-black text-neutral-900 mb-2" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>{t({ en: 'Offer New Service', fr: 'Proposer un nouveau service', ar: 'تقديم خدمة جديدة' })}</h2>
                                        <p className="text-[13px] font-medium text-neutral-500 mb-8 font-medium">{t({ en: 'Add a new specialty to your profile to receive more job offers.', fr: 'Ajoutez une nouvelle spécialité à votre profil pour recevoir plus d’offres de missions.', ar: 'أضف تخصصاً جديداً إلى ملفك الشخصي لتلقي المزيد من عروض العمل.' })}</p>

                                        <div className="space-y-8">
                                            {/* Step 1: Category */}
                                            <div>
                                                <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">{t({ en: 'Select Category', fr: 'Choisir une catégorie', ar: 'اختر الفئة' })}</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {getAllServices().filter(s => !selectedServices.includes(s.id)).map(s => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => setNewServiceData({ ...newServiceData, id: s.id, rate: SERVICE_TIER_RATES[s.id]?.suggestedMin || 75 })}
                                                            className={cn(
                                                                "p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-3",
                                                                newServiceData.id === s.id ? "border-[#01A083] bg-neutral-50" : "border-neutral-100 hover:border-neutral-200"
                                                            )}
                                                        >
                                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", newServiceData.id === s.id ? "bg-[#01A083] text-white" : "bg-neutral-100 text-neutral-400")}>
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
                                                        <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">{t({ en: 'Your Hourly Rate (MAD)', fr: 'Votre tarif horaire (MAD)', ar: 'سعرك بالساعة (درهم)' })}</label>
                                                        <div className="flex items-center gap-6">
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-[12px] font-bold text-neutral-400">{t({ en: 'Low', fr: 'Bas', ar: 'منخفض' })}</span>
                                                                    <span className="text-[12px] font-black text-black">{newServiceData.rate} {t({ en: 'MAD', fr: 'MAD', ar: 'درهم' })}</span>
                                                                    <span className="text-[12px] font-bold text-neutral-400">{t({ en: 'High', fr: 'Élevé', ar: 'مرتفع' })}</span>
                                                                </div>
                                                                <input
                                                                    type="range"
                                                                    min={SERVICE_TIER_RATES[newServiceData.id]?.suggestedMin || 50}
                                                                    max={SERVICE_TIER_RATES[newServiceData.id]?.suggestedMax || 500}
                                                                    value={newServiceData.rate}
                                                                    onChange={(e) => setNewServiceData({ ...newServiceData, rate: parseInt(e.target.value) })}
                                                                    className="w-full h-1.5 bg-neutral-100 rounded-full appearance-none cursor-pointer accent-[#01A083]"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Step 3: Pitch */}
                                                    <div>
                                                        <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-4">{t({ en: 'Your Professional Pitch', fr: 'Votre présentation professionnelle', ar: 'عرضك المهني' })}</label>
                                                        <textarea
                                                            value={newServiceData.pitch}
                                                            onChange={(e) => setNewServiceData({ ...newServiceData, pitch: e.target.value })}
                                                            placeholder={t({ en: `Describe your experience in ${getServiceById(newServiceData.id)?.name}...`, fr: `Décrivez votre expérience en ${getServiceById(newServiceData.id)?.name}...`, ar: `صف خبرتك في ${getServiceById(newServiceData.id)?.name}...` })}
                                                            className="w-full px-5 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#01A083]/10 transition-all min-h-[120px] text-[15px] font-medium"
                                                        />
                                                        <p className="text-[10px] text-neutral-400 font-medium mt-2 ml-1">{t({ en: 'Example: "I have 5 years of experience in furniture assembly and tiling."', fr: 'Exemple : "J’ai 5 ans d’expérience en montage de meubles et carrelage."', ar: 'مثال: "لدي 5 سنوات من الخبرة في تجميع الأثاث والتبليط."' })}</p>
                                                    </div>

                                                    <button
                                                        disabled={isSavingProfile || newServiceData.pitch.length < 10}
                                                        onClick={handleAddService}
                                                        className="w-full h-14 bg-[#01A083] text-white rounded-2xl text-[16px] font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-40 border border-[#008f75]"
                                                    >
                                                        {isSavingProfile ? <RefreshCw className="animate-spin" size={20} /> : t({ en: 'List Service', fr: 'Publier le service', ar: 'إدراج الخدمة' })}
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
                                        className="relative bg-white w-full max-w-[760px] rounded-[40px] p-14 border border-neutral-100 overflow-hidden"
                                    >
                                        <div className="text-left mb-8">
                                            <h2
                                                className="text-[48px] md:text-[56px] font-black text-neutral-900 leading-[1.05]"
                                                style={{ fontFamily: 'Uber Move, var(--font-sans)' }}
                                            >
                                                {t({ en: 'How Much', fr: 'Combien', ar: 'كم' })}<br />{t({ en: 'do you want?', fr: 'voulez-vous ?', ar: 'تريد؟' })}
                                            </h2>
                                        </div>

                                        <div className="mb-10">
                                            <div className="relative flex items-baseline gap-3 pb-3 border-b border-neutral-200">
                                                <span className="text-[40px] font-black text-[#BFBFBF] uppercase">{t({ en: 'MAD', fr: 'MAD', ar: 'درهم' })}</span>
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
                                                className="px-12 py-4 bg-[#01A083] text-white rounded-full font-semibold text-[15px] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-[#008f75]"
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
                                        className="bg-black text-white p-6 rounded-[32px] overflow-hidden relative border border-white/10"
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
                                                className="w-full py-4 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all border border-neutral-200"
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
                                className="fixed inset-0 z-[200] bg-white lg:absolute lg:inset-auto lg:top-0 lg:right-0 lg:w-[480px] lg:h-full border-l border-neutral-100"
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
                                className="fixed inset-0 z-[200] bg-white lg:absolute lg:inset-auto lg:top-0 lg:right-0 lg:w-[480px] lg:h-full border-l border-neutral-100"
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
                        isMobileLayout && !selectedChat && !viewingJobDetails && performanceDetail === 'none' && !showLanguagePopup && !showProfileModal && !showAddServiceModal && !showNIDModal && !(activeNav === 'performance' && performanceTab === 'availability') && (
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
                                                        !noti.read ? 'border-[#01A083]/20 bg-[#01A083]/5' : 'border-neutral-100'
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
                </main>
            </AnimatePresence>
            {/* Floating Messenger Bubble */}
            {activeBubble && (
                <FloatingMessengerBubble
                    avatar={activeBubble.avatar}
                    count={activeBubble.count}
                    jobId={activeBubble.jobId}
                    onOpen={(jobId) => {
                        const job = acceptedJobs.find(j => j.id === jobId);
                        if (job) {
                            setSelectedChat(job);
                            setActiveNav('messages');
                        }
                        setActiveBubble(null);
                    }}
                    onDismiss={() => setActiveBubble(null)}
                />
            )}
        </div>
    );
}
