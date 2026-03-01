"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Calendar,
    MapPin,
    X,
    User,
    Star,
    ChevronDown,
    Zap,
    Bookmark,
    ShieldCheck,
    Clock,
    CheckCircle2,
    Timer,
    XCircle,
    Info,
    MessageSquare,
    Send,
    HelpCircle,
    Check,
    Plus,
    ArrowUp,
    ArrowDown,
    Home,
    Truck
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '@/lib/utils';
import { OrderDetails } from './OrderCard';
import { db, auth } from '@/lib/firebase';
import { useIsMobileViewport } from '@/lib/mobileOnly';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    doc
} from 'firebase/firestore';

interface WeekCalendarProps {
    orders: OrderDetails[];
    isLoading?: boolean;
    onUpdateOrder: (idx: number, updates: Partial<OrderDetails>) => void;
    onCancelOrder: (idx: number) => void;
    onNewOrder?: () => void;
    onClose?: () => void;
    variant?: 'card' | 'borderless' | 'fullscreen';
    externalSelectedOrderId?: string | null;
    userType?: 'client' | 'provider';
    autoChat?: boolean;
    newlyProgrammedOrderId?: string | null;
    onViewProvider?: (providerId: string) => void;
    onViewMessages?: (orderId: string) => void;
    activeTab?: 'domestic' | 'go';
    onTabChange?: (tab: 'domestic' | 'go') => void;
    overlayTopOffset?: number;
}

const WeekCalendar = ({
    orders,
    isLoading = false,
    onUpdateOrder,
    onCancelOrder,
    onNewOrder,
    onClose,
    variant = 'card',
    externalSelectedOrderId = null,
    userType = 'client',
    autoChat = false,
    newlyProgrammedOrderId = null,
    onViewProvider,
    onViewMessages,
    activeTab = 'domestic',
    onTabChange,
    overlayTopOffset = 0
}: WeekCalendarProps) => {
    const { t } = useLanguage();
    const { theme } = useTheme();

    // Animations for Confirmed Status
    const styles = `
      @keyframes gradient-border-shimmer {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .ordered-confirmed-border {
        position: relative;
        overflow: hidden !important;
        border: none !important; /* Override default border */
        box-shadow: 0 4px 12px rgba(88, 86, 214, 0.25);
      }
      .ordered-confirmed-border::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        padding: 2px; /* Border thickness */
        background: linear-gradient(60deg, #5856D6, #007AFF, #00C7BE, #FF2D55, #5856D6);
        background-size: 300% 300%;
        animation: gradient-border-shimmer 3s ease infinite;
        -webkit-mask: 
           linear-gradient(#fff 0 0) content-box, 
           linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
        z-index: 5;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .carousel-container {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    gap: 1.5rem;
    padding: 1rem 2rem;
    scroll-behavior: smooth;
  }
  .carousel-item {
    flex: 0 0 calc(100% - 4rem);
    scroll-snap-align: center;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .carousel-item:not(.active) {
    filter: blur(4px) brightness(0.9);
    transform: scale(0.9) translateY(10px);
    opacity: 0.6;
  }
  .carousel-item.active {
    filter: blur(0);
    transform: scale(1) translateY(0);
    opacity: 1;
  }
  @keyframes order-pulse {
    0% { box-shadow: 0 0 0 0px rgba(0, 122, 255, 0.4); }
    50% { box-shadow: 0 0 0 10px rgba(0, 122, 255, 0); }
    100% { box-shadow: 0 0 0 0px rgba(0, 122, 255, 0); }
  }
  @keyframes zoom-in-out {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  @keyframes pulsate-border {
    0% { border-color: #000; box-shadow: 0 0 0 0px rgba(0,0,0,0.4); }
    50% { border-color: #007AFF; box-shadow: 0 0 0 8px rgba(0,122,255,0); }
    100% { border-color: #000; box-shadow: 0 0 0 0px rgba(0,0,0,0.4); }
  }
  .order-highlight {
    z-index: 100 !important;
    animation: pulsate-border 2s infinite ease-in-out !important;
    border: 3px solid #000 !important;
    outline: 2px solid #fff !important;
    outline-offset: -2px;
    scale: 1.08;
    transform: translateY(-2px);
  }
`;

    const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<(OrderDetails & { originalIndex: number }) | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isRating, setIsRating] = useState(false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [editDate, setEditDate] = useState("");
    const [editTime, setEditTime] = useState("");
    const [tempRating, setTempRating] = useState(0);
    const [tempFeedback, setTempFeedback] = useState("");
    const [currentImageIdx, setCurrentImageIdx] = useState(0);
    const isMobile = useIsMobileViewport(1024, 'lt');
    const [mounted, setMounted] = useState(false);
    const [isChatting, setIsChatting] = useState(false);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const hasInitialJumped = useRef(false);
    const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<OrderDetails | null>(null);
    const [headerHeight, setHeaderHeight] = useState(0);
    const [bottomNavHeight, setBottomNavHeight] = useState(0);
    const [todayArrowDirection, setTodayArrowDirection] = useState<'up' | 'down' | null>(null);
    const [hasOrdersBelow, setHasOrdersBelow] = useState(false);
    const [isViewSelectorOpen, setIsViewSelectorOpen] = useState(false);
    const [selectedBricolerMobileDayOrders, setSelectedBricolerMobileDayOrders] = useState<OrderDetails[] | null>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (externalSelectedOrderId && orders) {
            const order = orders.find(o => o.id === externalSelectedOrderId);
            if (order) {
                const newIdx = orders.indexOf(order);
                setSelectedOrder({ ...order, originalIndex: newIdx });

                // Navigate to the order's date
                const datePart = order.date.includes(' at ') ? order.date.split(' at ')[0] : (order.date.includes(' - ') ? order.date.split(' - ')[0] : order.date);
                const d = new Date(datePart);
                if (!isNaN(d.getTime())) {
                    // Only update if it's a different month/week than current
                    if (d.getMonth() !== currentDate.getMonth() || d.getFullYear() !== currentDate.getFullYear()) {
                        setCurrentDate(new Date(d));
                    }
                }

                setIsChatting(autoChat);
                setIsEditing(false);
                setIsRating(false);
            }
        } else if (!externalSelectedOrderId) {
            setSelectedOrder(null);
        }
    }, [externalSelectedOrderId, orders, autoChat]);

    const isFullscreenView = variant === 'fullscreen';
    const isFullscreenMobile = isMobile && variant === 'fullscreen';
    const useOverlayPeek = !isMobile && userType === 'provider' && variant === 'card';
    // For web (non-mobile) card/fullscreen, also use calculated height so calendar scrolls
    const isWebCalendar = !isMobile && (variant === 'card' || variant === 'fullscreen');
    const scrollAreaHeight = isFullscreenMobile
        ? `calc(100dvh - ${headerHeight + bottomNavHeight}px)`
        : isWebCalendar
            ? `calc(100% - ${headerHeight}px)`
            : 'auto';
    const headerIsMobile = isMobile || isFullscreenView;
    const isBricolerMobile = userType === 'provider' && !isWebCalendar;

    const handleScrollToToday = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Today's date (beginning of the day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find the month section that contains today
        // Each month section is a div inside the map
        const monthSections = container.querySelectorAll('div[data-month-date]');
        let targetSection: HTMLElement | null = null;
        let todayElement: HTMLElement | null = null;

        for (let i = 0; i < monthSections.length; i++) {
            const section = monthSections[i] as HTMLElement;
            const monthDateStr = section.getAttribute('data-month-date');
            if (monthDateStr) {
                const monthDate = new Date(monthDateStr);
                if (monthDate.getMonth() === today.getMonth() && monthDate.getFullYear() === today.getFullYear()) {
                    targetSection = section;
                    // Find the today day element inside this section
                    todayElement = section.querySelector('[data-is-today="true"]');
                    break;
                }
            }
        }

        if (todayElement) {
            // Scroll so that today's element is visible
            // container.scrollTo({ top: todayElement.offsetTop - (headerHeight + 20), behavior: 'smooth' });
            // Alternatively, scroll to the start of today's month
            if (targetSection) {
                container.scrollTo({ top: targetSection.offsetTop - 10, behavior: 'smooth' });
            }
        }
    };

    useEffect(() => {
        if (mounted && (isFullscreenMobile || isWebCalendar) && viewMode === 'month') {
            const timer = setTimeout(() => {
                handleScrollToToday();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [mounted, isFullscreenMobile, isWebCalendar, viewMode]);

    useEffect(() => {
        if (!isFullscreenMobile && selectedOrderForDetails) {
            setSelectedOrderForDetails(null);
        }
    }, [isFullscreenMobile, selectedOrderForDetails]);

    useEffect(() => {
        if (!isFullscreenMobile && !isWebCalendar) return;

        const updateHeights = () => {
            const headerEl = headerRef.current;
            const navEl = document.querySelector('[data-mobile-bottom-nav="true"]') as HTMLElement | null;
            if (headerEl) {
                setHeaderHeight(Math.round(headerEl.getBoundingClientRect().height));
            }
            if (navEl) {
                setBottomNavHeight(Math.round(navEl.getBoundingClientRect().height));
            }
        };

        updateHeights();
        window.addEventListener('resize', updateHeights);
        return () => window.removeEventListener('resize', updateHeights);
    }, [isFullscreenMobile, isWebCalendar]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        let rafId: number | null = null;
        const updateArrow = () => {
            const todayEl = container.querySelector('[data-today="true"]') as HTMLElement | null;

            const scrollTop = container.scrollTop;
            const viewBottom = scrollTop + container.clientHeight;

            // Today arrow logic for Month view
            if (viewMode === 'month' && isFullscreenView) {
                if (!todayEl) {
                    setTodayArrowDirection(null);
                } else {
                    const containerRect = container.getBoundingClientRect();
                    const todayRect = todayEl.getBoundingClientRect();
                    const todayTop = todayRect.top - containerRect.top + scrollTop;
                    const todayBottom = todayTop + todayRect.height;

                    if (todayTop < scrollTop - 100) {
                        setTodayArrowDirection('up');
                    } else if (todayBottom > viewBottom + 100) {
                        setTodayArrowDirection('down');
                    } else {
                        setTodayArrowDirection(null);
                    }
                }
            } else {
                setTodayArrowDirection(null);
            }

            // Orders below logic for Day/Week view
            if (viewMode === 'day' || viewMode === 'week') {
                const orderEls = container.querySelectorAll('[data-order-item="true"]');
                let foundBelow = false;
                const containerRect = container.getBoundingClientRect();

                for (let i = 0; i < orderEls.length; i++) {
                    const el = orderEls[i] as HTMLElement;
                    const elRect = el.getBoundingClientRect();
                    const elTopInContainer = elRect.top - containerRect.top + scrollTop;

                    if (elTopInContainer > viewBottom + 10) {
                        foundBelow = true;
                        break;
                    }
                }
                setHasOrdersBelow(foundBelow);
            } else {
                setHasOrdersBelow(false);
            }
        };

        const onScroll = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(updateArrow);
        };

        updateArrow();
        container.addEventListener('scroll', onScroll);
        window.addEventListener('resize', updateArrow);
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            container.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', updateArrow);
        };
    }, [isFullscreenView, viewMode, currentDate, orders?.length]);

    const c = {
        bg: theme === 'light' ? '#FFFFFF' : '#111111',
        bgSecondary: theme === 'light' ? '#FAFAFA' : '#0D0D0D',
        text: theme === 'light' ? '#000000' : '#FFFFFF',
        textMuted: theme === 'light' ? '#545454' : '#A0A0A0',
        border: theme === 'light' ? '#E2E2E2' : '#2D2D2D',
        surface: theme === 'light' ? '#F5F5F5' : '#1A1A1A',
        card: theme === 'light' ? '#FFFFFF' : '#1A1A1A',
        event: theme === 'light' ? '#000000' : '#FFFFFF',
        eventText: theme === 'light' ? '#FFFFFF' : '#000000'
    };

    const getStatusStyles = (status: OrderDetails['status']) => {
        if (userType === 'provider') {
            switch (status) {
                case 'new': return { color: '#007AFF', bg: '#E5F1FF', icon: Info, label: t({ en: 'Available', fr: 'Disponible' }), isNew: true };
                case 'negotiating': return { color: '#5856D6', bg: '#EBEBFF', icon: Timer, label: t({ en: 'Offer Sent', fr: 'Offre Envoyée' }) };
                case 'confirmed': return { color: '#008A21', bg: '#E1FCE0', icon: ShieldCheck, label: t({ en: 'Confirmed', fr: 'Confirmé' }) };
                case 'cancelled': return { color: '#FF3B30', bg: '#FFEBEA', icon: XCircle, label: t({ en: 'Cancelled', fr: 'Annulé' }) };
                case 'done': return { color: '#8E8E93', bg: '#F2F2F7', icon: CheckCircle2, label: t({ en: 'Completed', fr: 'Terminé' }) };
                default: return { color: '#8E8E93', bg: '#F2F2F7', icon: Info, label: t({ en: 'Job', fr: 'Mission' }) };
            }
        }
        switch (status) {
            case 'new': return { color: '#007AFF', bg: '#E5F1FF', icon: Info, label: t({ en: 'New', fr: 'Nouveau' }), isNew: true };
            case 'negotiating': return { color: '#5856D6', bg: '#EBEBFF', icon: Zap, label: t({ en: 'Offers', fr: 'Offres' }) };
            case 'confirmed': return { color: '#9A6A00', bg: '#FBF2D5', icon: ShieldCheck, label: t({ en: 'Confirmed', fr: 'Confirmé' }) };
            case 'pending': return { color: '#FF9500', bg: '#FFF4E5', icon: Timer, label: t({ en: 'In Progress', fr: 'En cours' }) };
            case 'cancelled': return { color: '#FF3B30', bg: '#FFEBEA', icon: XCircle, label: t({ en: 'Cancelled', fr: 'Annulé' }) };
            case 'done': return { color: '#008A21', bg: '#E1FCE0', icon: CheckCircle2, label: t({ en: 'Done', fr: 'Terminé' }) };
            default: return { color: '#8E8E93', bg: '#F2F2F7', icon: Info, label: t({ en: 'Unknown', fr: 'Inconnu' }) };
        }
    };

    const getBricolerRank = (jobsCount: number = 0) => {
        if (jobsCount >= 100) return { label: 'Elite', color: '#5856D6' };
        if (jobsCount >= 10) return { label: 'Pro', color: '#06C167' };
        return { label: 'New', color: '#8E8E93' };
    };

    // Chat Logic: Listen for messages
    useEffect(() => {
        if (!isChatting || !selectedOrder?.id) return;

        const messagesRef = collection(db, 'jobs', selectedOrder.id, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setChatMessages(msgs);
        }, (error) => {
            if (error.code === 'permission-denied') {
                console.warn("Chat listener permissions missing. Check Firestore rules.", error);
                setChatMessages([]);
            } else {
                console.error("Chat listener error:", error);
            }
        });

        return () => unsubscribe();
    }, [isChatting, selectedOrder?.id]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedOrder?.id || !auth.currentUser) return;

        try {
            const messagesRef = collection(db, 'jobs', selectedOrder.id, 'messages');
            await addDoc(messagesRef, {
                text: newMessage,
                senderId: auth.currentUser.uid,
                senderName: auth.currentUser.displayName || 'Client',
                timestamp: serverTimestamp()
            });
            setNewMessage("");
        } catch (err) {
            console.error("Error sending message:", err);
        }
    };

    useEffect(() => {
        if (!mounted || !orders || orders.length === 0 || hasInitialJumped.current) return;

        const jumpToNextOrder = () => {
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            let targetDate: Date | null = null;
            let minDiff = Infinity;

            orders.forEach(order => {
                const datePart = order.date.includes(' at ') ? order.date.split(' at ')[0] : (order.date.includes(' - ') ? order.date.split(' - ')[0] : order.date);
                const d = new Date(datePart);
                if (!isNaN(d.getTime())) {
                    d.setHours(0, 0, 0, 0);
                    if (d >= now) {
                        const diff = d.getTime() - now.getTime();
                        if (diff < minDiff) {
                            minDiff = diff;
                            targetDate = d;
                        }
                    }
                }
            });

            if (targetDate) {
                setCurrentDate(targetDate);
                hasInitialJumped.current = true;
            }
        };

        jumpToNextOrder();
    }, [mounted, orders]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setSelectedOrder(null);
                setIsEditing(false);
                setIsRating(false);
            }
        };
        if (selectedOrder) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedOrder]);

    // Keep selectedOrder in sync with real-time updates from orders prop
    useEffect(() => {
        if (!selectedOrder || !orders) return;

        // Find the latest version of this order in the orders array
        const updatedOrder = orders.find((o) => {
            if (o.id && selectedOrder.id) return o.id === selectedOrder.id;
            // Fallback to matching some unique properties if ID is missing (unlikely for active orders)
            return o.date === selectedOrder.date && o.service === selectedOrder.service;
        });

        if (updatedOrder) {
            // Check if backend data actually changed to avoid unnecessary re-renders
            // We focus on status and offers (the "interests")
            const hasStatusChanged = updatedOrder.status !== selectedOrder.status;
            const hasOffersChanged = JSON.stringify(updatedOrder.offers) !== JSON.stringify(selectedOrder.offers);

            if (hasStatusChanged || hasOffersChanged) {
                // Determine its new index in the current orders array
                const newIdx = orders.indexOf(updatedOrder);
                setSelectedOrder({ ...updatedOrder, originalIndex: newIdx === -1 ? selectedOrder.originalIndex : newIdx });
            }
        }
    }, [orders, selectedOrder?.id]);

    useEffect(() => {
        if (selectedOrder) {
            const [datePart, timePart] = selectedOrder.date.split(' at ');
            setEditDate(datePart);
            setEditTime(timePart);
            setTempRating(selectedOrder.rating || 0);
            setTempFeedback(selectedOrder.feedback || "");
            setCurrentImageIdx(0);
        }
    }, [selectedOrder]);

    const handleSaveEdit = () => {
        if (selectedOrder) {
            onUpdateOrder(selectedOrder.originalIndex, {
                date: `${editDate} at ${editTime}`,
                status: 'new'
            });
            setSelectedOrder(null);
            setIsEditing(false);
        }
    };

    const handleSaveRating = () => {
        if (selectedOrder) {
            onUpdateOrder(selectedOrder.originalIndex, {
                rating: tempRating,
                feedback: tempFeedback,
                tags: selectedTags
            });
            setSelectedOrder(null);
            setIsRating(false);
            setSelectedTags([]);
        }
    };

    const handleCancelClick = () => {
        if (selectedOrder) {
            onCancelOrder(selectedOrder.originalIndex);
            setSelectedOrder(null);
            setIsEditing(false);
        }
    };

    const timeSlots = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"];


    const feedbackTags = [
        { en: 'Great quality', fr: 'Excellente qualité' },
        { en: 'Professional', fr: 'Professionnel' },
        { en: 'Punctual', fr: 'Ponctuel' },
        { en: 'Clean work', fr: 'Travail propre' },
        { en: 'Friendly', fr: 'Sympathique' },
        { en: 'Efficient', fr: 'Efficace' }
    ];

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const getCalendarDates = (date: Date) => {
        const dates: Date[] = [];
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const startDay = startOfMonth.getDay();
        const firstVisibleDay = new Date(startOfMonth);
        firstVisibleDay.setDate(startOfMonth.getDate() - startDay);
        for (let i = 0; i < 42; i++) {
            const d = new Date(firstVisibleDay);
            d.setDate(firstVisibleDay.getDate() + i);
            dates.push(d);
        }
        return dates;
    };

    const calendarDates = getCalendarDates(currentDate);
    const displayMonth = currentDate.toLocaleString('default', { month: 'long' });
    const displayYear = currentDate.getFullYear();

    const navigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        } else if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        } else {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        }
        setCurrentDate(newDate);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    };



    const getOrderDisplayName = (order: OrderDetails) => {
        if (userType === 'provider') {
            return order.clientName || order.bricolerName || order.service;
        }
        return order.bricolerName || order.clientName || order.service;
    };

    const getOrderAvatar = (order: OrderDetails) => {
        if (userType === 'provider') {
            return order.clientAvatar || order.bricolerAvatar;
        }
        return order.bricolerAvatar || order.clientAvatar;
    };

    const getOrderDateInfo = (rawDate: string) => {
        const datePart = rawDate.includes(' at ') ? rawDate.split(' at ')[0] : rawDate;
        if (datePart.includes(' - ')) {
            const [startRaw, endRaw] = datePart.split(' - ');
            const startDate = new Date(startRaw);
            const endDate = new Date(endRaw);
            const startValid = !isNaN(startDate.getTime());
            const endValid = !isNaN(endDate.getTime());
            return {
                startRaw,
                endRaw,
                startDate: startValid ? startDate : null,
                endDate: endValid ? endDate : null
            };
        }
        const singleDate = new Date(datePart);
        const valid = !isNaN(singleDate.getTime());
        return {
            startRaw: datePart,
            endRaw: datePart,
            startDate: valid ? singleDate : null,
            endDate: valid ? singleDate : null
        };
    };

    const handleOrderBlockClick = (order: OrderDetails) => {
        if (isFullscreenMobile) {
            setSelectedOrderForDetails(order);
            setSelectedOrder(null);
            setIsChatting(false);
        }
    };
    const positionedOrders = orders.flatMap((order, idx) => {
        if (order.status === 'cancelled') return [];
        const hasSeparator = order.date.includes(' at ');
        const [datePart, tPart] = hasSeparator ? order.date.split(' at ') : [order.date, order.time];
        const timePart = tPart || order.time || "";
        const timeSlotIdx = timeSlots.indexOf(timePart);

        // Check for range
        if (datePart.includes(' - ')) {
            const [startStr, endStr] = datePart.split(' - ');
            const startDate = new Date(startStr);
            const endDate = new Date(endStr);

            // Normalize years if missing
            if (!startStr.includes(',')) startDate.setFullYear(new Date().getFullYear());
            if (!endStr.includes(',')) endDate.setFullYear(new Date().getFullYear());

            const segments = [];
            const s = new Date(startDate); s.setHours(0, 0, 0, 0);
            const e = new Date(endDate); e.setHours(0, 0, 0, 0);

            // Months can have 42 days visible, check bounds
            const mStart = new Date(calendarDates[0]); mStart.setHours(0, 0, 0, 0);
            const mEnd = new Date(calendarDates[calendarDates.length - 1]); mEnd.setHours(0, 0, 0, 0);

            if (e < mStart || s > mEnd) return [];

            const vStart = s < mStart ? mStart : s;
            const vEnd = e > mEnd ? mEnd : e;

            let curr = new Date(vStart);
            while (curr <= vEnd) {
                const dayIdx = calendarDates.findIndex(d => isSameDay(d, curr));
                if (dayIdx === -1) break;

                const col = dayIdx % 7;
                const remainingInWeek = 7 - col;
                const daysLeft = Math.round((vEnd.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const span = Math.min(remainingInWeek, daysLeft);

                segments.push({
                    ...order,
                    originalIndex: idx,
                    dayIdx: dayIdx,
                    timeIdx: 0,
                    isRange: true,
                    span: span
                });

                curr.setDate(curr.getDate() + span);
            }
            return segments;
        }

        const orderDate = new Date(datePart);
        const dayIdxInView = calendarDates.findIndex(d => isSameDay(d, orderDate));
        return [{ ...order, originalIndex: idx, dayIdx: dayIdxInView, timeIdx: timeSlotIdx, isRange: false, span: 1 }];
    }).filter(o => o.dayIdx >= 0);


    const getWeekDays = () => {
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day;
        startOfWeek.setDate(diff);
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const renderWeekView = () => {
        if (isLoading) {
            return (
                <div style={{ padding: isMobile ? '1rem' : '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div />
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} style={{ height: '14px', backgroundColor: c.border, borderRadius: '4px', opacity: 0.3 }} />
                        ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '0.5rem' }}>
                                <div style={{ height: '12px', backgroundColor: c.border, borderRadius: '4px', opacity: 0.3, marginTop: '8px' }} />
                                <div style={{ height: '60px', borderRadius: '20px', backgroundColor: c.bgSecondary, border: `1px dashed ${c.border}` }} />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        const weekDays = getWeekDays();
        const startOfWeek = weekDays[0];
        const endOfWeek = new Date(weekDays[6]);
        endOfWeek.setHours(23, 59, 59, 999);

        // 1. Process orders for this week and separate by time slot
        const slotOrders: Record<string, any[]> = {};

        orders.forEach((order, originalIndex) => {
            if (order.status === 'cancelled') return;
            const hasSeparator = order.date.includes(' at ');
            const [datePart, tPartRaw] = hasSeparator ? order.date.split(' at ') : [order.date, order.time];
            const timePart = tPartRaw || order.time || "";

            // Only process if time matches one of our slots
            if (!timeSlots.includes(timePart)) return;

            let start: Date, end: Date;

            if (datePart.includes(' - ')) {
                const [sStr, eStr] = datePart.split(' - ');
                start = new Date(sStr);
                end = new Date(eStr);
                if (!sStr.includes(',')) start.setFullYear(new Date().getFullYear());
                if (!eStr.includes(',')) end.setFullYear(new Date().getFullYear());
            } else {
                start = new Date(datePart);
                end = new Date(datePart);
            }
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            // Check overlap
            if (end < startOfWeek || start > endOfWeek) return;

            // Clip to view
            const effectiveStart = start < startOfWeek ? startOfWeek : start;
            const effectiveEnd = end > endOfWeek ? endOfWeek : end;

            // Calculate Grid Position (0-6)
            const dayDiff = Math.round((effectiveStart.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
            const span = Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            if (!slotOrders[timePart]) slotOrders[timePart] = [];
            slotOrders[timePart].push({
                ...order,
                originalIndex,
                dayIdx: dayDiff,
                span,
                start: effectiveStart,
                end: effectiveEnd
            });
        });

        // 2. Calculate lanes for each slot
        const slotLanes: Record<string, number> = {};
        const processedSlotOrders: Record<string, any[]> = {};

        timeSlots.forEach(time => {
            const items = slotOrders[time] || [];
            // Sort by start day, then span (longer first)
            items.sort((a, b) => a.dayIdx - b.dayIdx || b.span - a.span);

            const lanes: any[][] = [];
            items.forEach(item => {
                let assigned = false;
                for (let l = 0; l < lanes.length; l++) {
                    // Check collision in this lane
                    const collision = lanes[l].some(existing => {
                        const existingEnd = existing.dayIdx + existing.span;
                        const itemEnd = item.dayIdx + item.span;
                        return (item.dayIdx < existingEnd && itemEnd > existing.dayIdx);
                    });
                    if (!collision) {
                        lanes[l].push(item);
                        item.lane = l;
                        assigned = true;
                        break;
                    }
                }
                if (!assigned) {
                    lanes.push([item]);
                    item.lane = lanes.length - 1;
                }
            });

            processedSlotOrders[time] = items;
            slotLanes[time] = lanes.length;
        });

        return (
            <div style={{ padding: isMobile ? '1rem' : '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <style>{styles}</style>
                {/* Header Days */}
                <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: '0.5rem', marginBottom: '1.5rem', position: 'sticky', top: 0, zIndex: 30, backgroundColor: c.card, padding: '1.5rem 0' }}>
                    <div />
                    {weekDays.map(d => {
                        const isSelectedDate = selectedOrder && isSameDay(new Date(selectedOrder.date.includes(' at ') ? selectedOrder.date.split(' at ')[0] : (selectedOrder.date.includes(' - ') ? selectedOrder.date.split(' - ')[0] : selectedOrder.date)), d);
                        return (
                            <div key={d.toString()} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                    {t({ en: d.toLocaleDateString('en-US', { weekday: 'short' }), fr: d.toLocaleDateString('fr-FR', { weekday: 'short' }) })}
                                </div>
                                <div style={{
                                    fontSize: '18px',
                                    fontWeight: 900,
                                    color: (isToday(d) || isSelectedDate) ? '#fff' : c.text,
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '10px',
                                    margin: '0 auto',
                                    backgroundColor: (isToday(d) || isSelectedDate) ? '#000' : 'transparent',
                                    border: isSelectedDate && !isToday(d) ? '2px solid #000' : 'none',
                                    transition: 'all 0.2s',
                                    boxShadow: isSelectedDate ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                                }}>
                                    {d.getDate()}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Grid Body */}
                <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', columnGap: '0.5rem', rowGap: '1rem' }}>
                    {timeSlots.map((time, rowIdx) => {
                        const laneCount = Math.max(1, slotLanes[time] || 0);
                        // Base height 40px for tighter grid, expand if many lanes
                        const rowHeight = Math.max(40, laneCount * 26 + 8);

                        return (
                            <React.Fragment key={time}>
                                {/* Time Label */}
                                <div style={{
                                    gridColumn: 1,
                                    gridRow: rowIdx + 1,
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: c.textMuted,
                                    paddingTop: '8px'
                                }}>
                                    {time}
                                </div>

                                {/* Background Cells */}
                                {weekDays.map((date, dayIdx) => (
                                    <div
                                        key={`bg-${time}-${dayIdx}`}
                                        style={{
                                            gridColumn: dayIdx + 2,
                                            gridRow: rowIdx + 1,
                                            minHeight: `${rowHeight}px`,
                                            border: `1px solid ${c.border}`,
                                            backgroundColor: isSameDay(date, new Date()) ? (theme === 'light' ? '#F9F9F9' : '#151515') : 'transparent',
                                            zIndex: 1,
                                            transition: 'all 0.2s ease',
                                            position: 'relative'
                                        }}
                                    >
                                        {/* Subtle dot at grid intersections for premium feel */}
                                        <div style={{ position: 'absolute', top: -3, left: -3, width: '6px', height: '6px', borderRadius: '50%', backgroundColor: c.border, opacity: 0.5 }} />
                                    </div>
                                ))}

                                {/* Events Layer */}
                                {processedSlotOrders[time]?.map((order, i) => {
                                    const statusStyle = getStatusStyles(order.status);
                                    const StatusIcon = statusStyle.icon;
                                    return (
                                        <motion.button
                                            key={`${order.originalIndex}-${i}`}
                                            layoutId={`week-order-${order.originalIndex}`}
                                            data-order-item="true"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedOrder(order);
                                                setIsChatting(false);
                                            }}
                                            whileHover={{ scale: 1.02, zIndex: 20 }}
                                            className={cn(
                                                order.status === 'confirmed' ? "ordered-confirmed-border" : "",
                                                (order.id === externalSelectedOrderId || order.id === selectedOrder?.id) ? "order-highlight" : ""
                                            )}
                                            animate={order.id === newlyProgrammedOrderId ? {
                                                scale: [1, 1.25, 1],
                                                zIndex: 1001
                                            } : ((order.id === externalSelectedOrderId || order.id === selectedOrder?.id) ? { scale: 1.08 } : { scale: 1 })}
                                            transition={order.id === newlyProgrammedOrderId ? {
                                                duration: 1.5,
                                                repeat: 3,
                                                ease: "easeInOut"
                                            } : { duration: 0.2 }}
                                            style={{
                                                gridColumn: `${order.dayIdx + 2} / span ${order.span}`,
                                                gridRow: rowIdx + 1,
                                                marginTop: `${order.lane * 26 + 6}px`,
                                                height: '24px',
                                                marginLeft: '4px',
                                                width: 'calc(100% - 8px)',
                                                background: statusStyle.color === '#007AFF'
                                                    ? 'linear-gradient(135deg, #007AFF, #00C7BE)'
                                                    : (statusStyle.color === '#5856D6'
                                                        ? 'linear-gradient(135deg, #5856D6, #FF2D55)'
                                                        : (statusStyle.color === '#9A6A00'
                                                            ? 'linear-gradient(135deg, #FFC244, #FF9500)'
                                                            : statusStyle.color)),
                                                borderRadius: '100px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '0 10px',
                                                gap: '6px',
                                                position: 'relative',
                                                zIndex: 10,
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                            }}
                                        >
                                            {order.status === 'new' && (
                                                <motion.div
                                                    animate={{ x: ['-100%', '100%'] }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                                                        zIndex: 1
                                                    }}
                                                />
                                            )}
                                            <div style={{
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '50%',
                                                backgroundColor: 'rgba(255,255,255,0.25)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                zIndex: 2
                                            }}>
                                                <StatusIcon size={12} color="#ffffff" strokeWidth={3} />
                                            </div>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                color: '#fff',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                zIndex: 2
                                            }}>
                                                {order.service} • {order.price}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div >
        );
    };

    const renderDayView = () => {
        if (isLoading) {
            return (
                <div style={{ padding: isMobile ? '1rem' : '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ height: '400px', width: '100%', backgroundColor: c.bgSecondary, borderRadius: '40px' }} />
                </div>
            );
        }

        const dayOrders = orders.filter((o) => {
            if (o.status === 'cancelled') return false;
            const hasSeparator = o.date.includes(' at ');
            const [dPart, tPartRaw] = hasSeparator ? o.date.split(' at ') : [o.date, o.time];

            if (dPart.includes(' - ')) {
                const [sStr, eStr] = dPart.split(' - ');
                const s = new Date(sStr);
                const e = new Date(eStr);
                if (!sStr.includes(',')) s.setFullYear(new Date().getFullYear());
                if (!eStr.includes(',')) e.setFullYear(new Date().getFullYear());
                const checkDate = new Date(currentDate);
                checkDate.setHours(0, 0, 0, 0);
                s.setHours(0, 0, 0, 0);
                e.setHours(0, 0, 0, 0);
                return (checkDate >= s && checkDate <= e);
            }
            const orderDate = new Date(dPart);
            return isSameDay(currentDate, orderDate);
        }).sort((a, b) => {
            const timeA = a.date.includes(' at ') ? a.date.split(' at ')[1] : (a.time || '00:00');
            const timeB = b.date.includes(' at ') ? b.date.split(' at ')[1] : (b.time || '00:00');
            return timeA.localeCompare(timeB);
        });

        const dayName = currentDate.toLocaleDateString(t({ en: 'en-US', fr: 'fr-FR' }), { weekday: 'long' });
        const monthYear = currentDate.toLocaleDateString(t({ en: 'en-US', fr: 'fr-FR' }), { month: 'long', year: 'numeric' });
        const dayNumber = currentDate.getDate();

        if (dayOrders.length === 0) {
            return (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: c.bg }}>
                    <div style={{
                        padding: '2rem',
                        borderBottom: `1px solid ${c.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: c.card,
                        position: 'sticky',
                        top: 0,
                        zIndex: 10
                    }}>
                        <div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 950, color: c.text, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                                {dayNumber} {monthYear}
                            </h2>
                            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: c.textMuted, textTransform: 'uppercase' }}>
                                {dayName}
                            </span>
                        </div>
                    </div>
                    <div style={{
                        height: '500px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1.5rem',
                        color: c.textMuted
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '24px',
                            backgroundColor: c.surface,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: c.textMuted
                        }}>
                            <Calendar size={40} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: c.text, marginBottom: '0.5rem', fontFamily: 'Uber Move, var(--font-sans)' }}>
                                {t({ en: "Empty schedule", fr: "Planning vide" })}
                            </h3>
                            <p style={{ fontWeight: 600 }}>{t({ en: "Enjoy your free time!", fr: "Profitez de votre temps libre !" })}</p>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '600px', backgroundColor: c.bg, overflowY: 'auto' }}>
                {/* Date Header */}
                <div style={{
                    padding: '2rem',
                    borderBottom: `1px solid ${c.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: (theme === 'light' ? '#FFFFFF' : c.card),
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 950, color: c.text, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
                            {dayNumber} {monthYear}
                        </h2>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: c.textMuted, textTransform: 'uppercase' }}>
                            {dayName}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 100px) 1fr', flex: 1 }}>
                    {/* Timeline Sidebar */}
                    <div style={{ borderRight: `1px solid ${c.border}`, paddingTop: '2rem', backgroundColor: c.bgSecondary }}>
                        {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'].map(time => (
                            <div key={time} style={{ height: '140px', display: 'flex', justifyContent: 'center', paddingTop: '8px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 900, color: c.textMuted, fontFamily: 'monospace' }}>{time}</span>
                            </div>
                        ))}
                    </div>

                    {/* Jobs List */}
                    <div style={{
                        padding: isMobile ? '1rem' : '2rem',
                        position: 'relative',
                        height: `${(15 * 140) + 32}px`, // Match sidebar height (15 slots) + potential padding
                        backgroundColor: theme === 'light' ? '#FFFFFF' : '#0D0D0D'
                    }}>
                        {dayOrders.map((job, idx) => {
                            const statusStyle = getStatusStyles(job.status);
                            const StatusIcon = statusStyle.icon;
                            const fullDatePart = job.date.includes(' at ') ? job.date.split(' at ')[1] : (job.time || '09:00');
                            const [h, m] = fullDatePart.split(':').map(Number);

                            // 07:00 is our start time (index 0)
                            const startHour = 7;
                            const topOffset = ((h - startHour) * 140) + ((m / 60) * 140) + 16; // 16px to align with sidebar padding

                            return (
                                <motion.div
                                    key={job.id || idx}
                                    data-order-item="true"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => setSelectedOrder({ ...job, originalIndex: orders.indexOf(job) })}
                                    style={{
                                        position: 'absolute',
                                        top: `${topOffset + 4}px`, // Added +4px for space between slots
                                        left: isMobile ? '1rem' : '2rem',
                                        right: isMobile ? '1rem' : '2rem',
                                        backgroundColor: c.card,
                                        borderRadius: '32px',
                                        padding: isMobile ? '1.25rem' : '1.75rem',
                                        border: (job.id === externalSelectedOrderId || job.id === selectedOrder?.id) ? '4px solid #111' : `1.5px solid #F0F0F0`,
                                        boxShadow: (job.id === externalSelectedOrderId || job.id === selectedOrder?.id) ? '0 12px 40px rgba(0,0,0,0.12)' : '0 4px 20px rgba(0,0,0,0.03)',
                                        cursor: 'pointer',
                                        zIndex: (job.id === externalSelectedOrderId || job.id === selectedOrder?.id) ? 10 : 1,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        minHeight: '160px' // Increased height for better visibility
                                    }}
                                    whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                                >
                                    {/* Status Badge */}
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 16px',
                                        borderRadius: '12px',
                                        backgroundColor: statusStyle.bg,
                                        color: statusStyle.color,
                                        fontSize: '12px',
                                        fontWeight: 900,
                                        marginBottom: '1.5rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        <StatusIcon size={14} />
                                        {statusStyle.label}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 950, color: c.text, marginBottom: '0.25rem', lineHeight: 1.1 }}>
                                                {job.service}
                                            </h3>
                                            {job.subServiceDisplayName && (
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#007AFF', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    {job.subServiceDisplayName}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: c.textMuted }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                                                    <MapPin size={16} /> {job.location} {job.city && `, ${job.city}`}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                                                    <Calendar size={16} /> {new Date(job.date.split(' at ')[0]).toLocaleDateString(t({ en: 'en-US', fr: 'fr-FR' }), { day: 'numeric', month: 'short' })}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 900, color: '#111', marginBottom: '4px', fontFamily: 'Uber Move, var(--font-sans)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                                {fullDatePart}
                                            </div>
                                            <div style={{ fontSize: '1.75rem', fontWeight: 950, color: c.text, letterSpacing: '-0.02em' }}>
                                                {job.price} <span style={{ fontSize: '13px', fontWeight: 800 }}>MAD</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Provider Info if confirmed/done */}
                                    {(job.status === 'confirmed' || job.status === 'done') && (job.bricolerId || job.clientId) && (
                                        <div style={{
                                            marginTop: '1.5rem',
                                            paddingTop: '1.5rem',
                                            borderTop: `1px solid ${c.border}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '12px',
                                                    overflow: 'hidden',
                                                    border: `2px solid ${statusStyle.color}44`
                                                }}>
                                                    <img
                                                        src={userType === 'client' ? (job.bricolerAvatar || "https://cdn-icons-png.flaticon.com/512/1048/1048953.png") : (job.clientAvatar || "https://cdn-icons-png.flaticon.com/512/1077/1077114.png")}
                                                        alt="avatar"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '14px', fontWeight: 800, color: c.text }}>
                                                        {userType === 'client' ? (job.bricolerName || 'Bricoleur') : (job.clientName || 'Client')}
                                                    </div>
                                                    <div style={{ fontSize: '12px', fontWeight: 600, color: c.textMuted }}>
                                                        {userType === 'client' ? 'Bricoler' : 'Client'}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                style={{
                                                    padding: '10px 20px',
                                                    borderRadius: '14px',
                                                    backgroundColor: c.bg,
                                                    color: c.text,
                                                    fontWeight: 900,
                                                    fontSize: '13px',
                                                    border: `1px solid ${c.border}`,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {t({ en: 'VIEW DETAILS', fr: 'VOIR DÉTAILS' })}
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderOrderContent = () => {
        if (!selectedOrder) return null;
        const statusStyle = getStatusStyles(selectedOrder.status);
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                {/* Header Status & Close */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    {(selectedOrder.status === 'new' || selectedOrder.status === 'confirmed') && (
                        <div style={{ padding: '8px 16px', borderRadius: '100px', backgroundColor: '#E5F1FF', color: '#007AFF', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Info size={14} strokeWidth={3} />
                            {selectedOrder.status === 'new' ? 'NEW' : 'CONFIRMED'}
                        </div>
                    )}
                    <button
                        onClick={() => { setSelectedOrder(null); setIsChatting(false); }}
                        style={{ marginLeft: 'auto', width: '36px', height: '36px', borderRadius: '50%', border: 'none', backgroundColor: '#F3F3F3', color: '#000', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Service Icon Bubble */}
                <div style={{
                    width: '120px',
                    height: '120px',
                    margin: '1rem auto 2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                }}>
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: '#FFF',
                        borderRadius: '40px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.25rem'
                    }}>
                        <img
                            src={selectedOrder.images?.[0] || "https://cdn-icons-png.flaticon.com/512/1048/1048953.png"}
                            alt="service"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    </div>
                </div>

                {/* Title & Price */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 950, letterSpacing: '-0.04em', color: '#000', marginBottom: '0.25rem', fontFamily: 'Uber Move, var(--font-sans)', lineHeight: 1 }}>
                        {selectedOrder.service}
                    </h3>
                    {selectedOrder.subServiceDisplayName && (
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#007AFF', marginBottom: '1.5rem', letterSpacing: '-0.01em' }}>
                            {selectedOrder.subServiceDisplayName}
                        </div>
                    )}
                    <div style={{ fontSize: '3rem', fontWeight: 900, color: '#D1D1D1', letterSpacing: '-0.03em', marginTop: '0.5rem' }}>
                        MAD {selectedOrder.price}
                    </div>
                </div>

                {/* Date & Time Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 800, color: '#000' }}>
                        <Calendar size={20} />
                        {selectedOrder.date.split(' at ')[0]}
                    </div>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#D1D1D1' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 800, color: '#000' }}>
                        <Clock size={20} />
                        {selectedOrder.time || selectedOrder.date.split(' at ')[1]}
                    </div>
                </div>

                {/* Bricoleur/Client Info Card (Uber Style) */}
                {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'done' || selectedOrder.status === 'pending' || (userType === 'provider' && selectedOrder.status === 'new')) && (userType === 'client' ? selectedOrder.bricolerId : selectedOrder.clientId) && (
                    <div
                        onClick={() => {
                            if (userType === 'client' && selectedOrder.bricolerId) {
                                onViewProvider?.(selectedOrder.bricolerId);
                            }
                        }}
                        style={{
                            marginBottom: '2rem',
                            padding: '1.25rem',
                            borderRadius: '32px',
                            backgroundColor: '#FFF',
                            border: '1px solid #F0F0F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.03)',
                            cursor: userType === 'client' ? 'pointer' : 'default',
                            transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                        onMouseOver={(e) => { if (userType === 'client') e.currentTarget.style.transform = 'scale(1.02)'; }}
                        onMouseOut={(e) => { if (userType === 'client') e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '18px',
                                overflow: 'hidden',
                                backgroundColor: '#1C1C1E',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFF',
                                position: 'relative'
                            }}>
                                {userType === 'client' ? (
                                    selectedOrder.bricolerAvatar ? (
                                        <img src={selectedOrder.bricolerAvatar} alt="bricoler" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '20px', fontWeight: 900 }}>{selectedOrder.bricolerName?.substring(0, 2).toUpperCase() || 'B'}</span>
                                    )
                                ) : (
                                    selectedOrder.clientAvatar ? (
                                        <img src={selectedOrder.clientAvatar} alt="client" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '20px', fontWeight: 900 }}>{selectedOrder.clientName?.substring(0, 2).toUpperCase() || 'C'}</span>
                                    )
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ fontSize: '18px', fontWeight: 950, color: '#000', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {userType === 'client' ? (selectedOrder.bricolerName || 'Bricoleur') : (selectedOrder.clientName || 'Client')}
                                    {userType === 'client' && selectedOrder.bricolerRank && (
                                        <div style={{
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            backgroundColor: selectedOrder.bricolerRank === 'Elite' ? '#5856D615' : (selectedOrder.bricolerRank === 'Pro' ? '#06C16715' : '#F3F3F3'),
                                            color: selectedOrder.bricolerRank === 'Elite' ? '#5856D6' : (selectedOrder.bricolerRank === 'Pro' ? '#06C167' : '#8E8E93'),
                                            fontSize: '10px',
                                            fontWeight: 900,
                                            letterSpacing: '0.05em'
                                        }}>
                                            {selectedOrder.bricolerRank.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {userType === 'client' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#FFC24415', padding: '3px 10px', borderRadius: '100px', border: '1px solid #FFC24420' }}>
                                            <Star size={12} fill="#FFC244" color="#FFC244" />
                                            <span style={{ fontSize: '13px', fontWeight: 950, color: '#000' }}>{selectedOrder.bricolerRating || '5.0'}</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F3F4F6', padding: '3px 10px', borderRadius: '100px' }}>
                                            <MapPin size={12} />
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#666' }}>{selectedOrder.city || 'Casablanca'}</span>
                                        </div>
                                    )}
                                    {userType === 'client' && (
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#999' }}>
                                            {selectedOrder.bricolerJobsCount || 0} {t({ en: 'jobs', fr: 'missions' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 'auto' }}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isMobile && onViewMessages && selectedOrder.id) {
                                onViewMessages(selectedOrder.id);
                                return;
                            }
                            setIsChatting(true);
                        }}
                        style={{
                            width: '100%',
                            height: '70px',
                            borderRadius: '24px',
                            backgroundColor: '#FFC244',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            color: '#000',
                            fontWeight: 950,
                            fontSize: '18px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 8px 24px rgba(255, 194, 68, 0.3)',
                            fontFamily: 'Uber Move, var(--font-sans)'
                        }}
                    >
                        <MessageSquare size={24} strokeWidth={2.5} />
                        {t({ en: 'Quick Chat', fr: 'Chat Rapide' })}
                    </button>

                    {/* Action Buttons Row */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingBottom: '0.5rem' }}>
                        <button
                            onClick={handleCancelClick}
                            disabled={selectedOrder.status === 'done' || selectedOrder.status === 'cancelled'}
                            style={{
                                flex: 1,
                                padding: '20px',
                                borderRadius: '24px',
                                backgroundColor: '#F3F4F6',
                                color: '#000',
                                border: 'none',
                                fontSize: '16px',
                                fontWeight: 900,
                                cursor: 'pointer',
                                opacity: (selectedOrder.status === 'done' || selectedOrder.status === 'cancelled') ? 0.5 : 1
                            }}
                        >
                            {t({ en: 'Cancel Request', fr: 'Annuler la demande' })}
                        </button>
                    </div>

                    {/* Overlays */}
                    <AnimatePresence>
                        {isEditing && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{ position: 'absolute', inset: -20, backgroundColor: c.card, zIndex: 100, padding: '2rem', display: 'flex', flexDirection: 'column' }}
                            >
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1.5rem', fontFamily: 'Uber Move, var(--font-sans)' }}>{t({ en: 'Reschedule', fr: 'Reprogrammer' })}</h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, color: c.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>{t({ en: 'Date', fr: 'Date' })}</label>
                                        <input
                                            type="text"
                                            value={editDate}
                                            onChange={(e) => setEditDate(e.target.value)}
                                            style={{ width: '100%', padding: '16px', borderRadius: '16px', border: `1px solid ${c.border}`, backgroundColor: c.surface, color: c.text, fontSize: '16px', fontWeight: 600, outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, color: c.textMuted, marginBottom: '6px', textTransform: 'uppercase' }}>{t({ en: 'Time', fr: 'Heure' })}</label>
                                        <div style={{ position: 'relative', group: 'true' } as any}>
                                            <select
                                                value={editTime}
                                                onChange={(e) => setEditTime(e.target.value)}
                                                style={{ width: '100%', padding: '18px 24px', borderRadius: '20px', border: `1px solid ${c.border}`, backgroundColor: '#F8F8F8', color: '#000', fontSize: '16px', fontWeight: 700, outline: 'none', appearance: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onFocus={(e) => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.backgroundColor = '#FFF'; }}
                                                onBlur={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.backgroundColor = '#F8F8F8'; }}
                                            >
                                                {timeSlots.map(t_val => <option key={t_val} value={t_val}>{t_val}</option>)}
                                            </select>
                                            <div style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#000', opacity: 0.4 }}>
                                                <ChevronDown size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <button onClick={handleSaveEdit} style={{ padding: '18px', backgroundColor: '#000', color: '#FFF', borderRadius: '16px', fontWeight: 900, border: 'none', fontSize: '16px', cursor: 'pointer' }}>{t({ en: 'Save Changes', fr: 'Enregistrer' })}</button>
                                    <button onClick={() => setIsEditing(false)} style={{ padding: '16px', backgroundColor: 'transparent', color: c.text, borderRadius: '16px', fontWeight: 800, border: 'none', fontSize: '14px', cursor: 'pointer' }}>{t({ en: 'Cancel', fr: 'Annuler' })}</button>
                                </div>
                            </motion.div>
                        )}

                        {isChatting && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                style={{ position: 'absolute', inset: -20, backgroundColor: c.card, zIndex: 110, padding: 0, display: 'flex', flexDirection: 'column' }}
                            >
                                {/* Chat Header */}
                                <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${c.border}66`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <button
                                        onClick={() => setIsChatting(false)}
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            border: 'none',
                                            backgroundColor: '#F5F5F7',
                                            color: '#000',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <ChevronDown size={20} style={{ transform: 'rotate(90deg)' }} />
                                    </button>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#1C1C1E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                                        {userType === 'client' ? (
                                            selectedOrder.bricolerAvatar ? (
                                                <img src={selectedOrder.bricolerAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '14px', fontWeight: 700 }}>{selectedOrder.bricolerName ? selectedOrder.bricolerName.substring(0, 2).toUpperCase() : 'B'}</span>
                                            )
                                        ) : (
                                            selectedOrder.clientAvatar ? (
                                                <img src={selectedOrder.clientAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '14px', fontWeight: 700 }}>{selectedOrder.clientName ? selectedOrder.clientName.substring(0, 2).toUpperCase() : 'C'}</span>
                                            )
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <div style={{ fontWeight: 900, fontSize: '16px', color: '#000', letterSpacing: '-0.01em' }}>
                                            {userType === 'client'
                                                ? (selectedOrder.bricolerName || t({ en: 'Provider', fr: 'Bricoleur' }))
                                                : (selectedOrder.clientName || t({ en: 'Client', fr: 'Client' }))}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#06C167', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#06C167' }} />
                                            {t({ en: 'Active now', fr: 'Actif maintenant' })}
                                        </div>
                                    </div>
                                </div>

                                {/* Messages Area */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#F8F8F8' }} className="no-scrollbar">
                                    {chatMessages.length === 0 ? (
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: c.textMuted, textAlign: 'center' }}>
                                            <MessageSquare size={48} opacity={0.2} />
                                            <p style={{ fontSize: '14px', fontWeight: 600 }}>
                                                {t({ en: 'Start the conversation with', fr: 'Commencez la conversation avec' })}<br />
                                                {t({ en: 'your provider', fr: 'votre Bricoleur' })}
                                            </p>
                                        </div>
                                    ) : (
                                        chatMessages.map((msg: any) => {
                                            const isMe = msg.senderId === auth.currentUser?.uid;
                                            return (
                                                <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                                    <div style={{
                                                        padding: '12px 16px',
                                                        borderRadius: '18px',
                                                        borderBottomRightRadius: isMe ? '4px' : '18px',
                                                        borderBottomLeftRadius: isMe ? '18px' : '4px',
                                                        backgroundColor: isMe ? '#000' : '#FFF',
                                                        color: isMe ? '#FFF' : '#000',
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        boxShadow: isMe ? '0 4px 12px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.04)',
                                                        lineHeight: 1.4
                                                    }}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Chat Input */}
                                <form
                                    onSubmit={handleSendMessage}
                                    style={{
                                        padding: '1.25rem',
                                        backgroundColor: '#FFF',
                                        borderTop: `1px solid ${c.border}66`,
                                        display: 'flex',
                                        gap: '12px',
                                        alignItems: 'center'
                                    }}
                                >
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={t({ en: 'Type a message...', fr: 'Écrivez un message...' })}
                                        style={{
                                            flex: 1,
                                            padding: '14px 20px',
                                            borderRadius: '100px',
                                            border: `1px solid ${c.border}66`,
                                            backgroundColor: '#F3F3F3',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            outline: 'none',
                                            transition: 'border-color 0.2s ease'
                                        }}
                                        onFocus={(e) => (e.currentTarget.style.borderColor = '#000')}
                                        onBlur={(e) => (e.currentTarget.style.borderColor = 'transparent')}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            backgroundColor: newMessage.trim() ? '#000' : '#E0E0E0',
                                            color: '#FFF',
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <Send size={20} fill={newMessage.trim() ? "#FFF" : "none"} />
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    };

    const renderMonthView = () => {
        if (isLoading) {
            return (
                <div style={{ padding: isMobile ? '1rem' : '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} style={{ height: '14px', backgroundColor: c.border, borderRadius: '4px', opacity: 0.3 }} />
                        ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', flex: 1 }}>
                                {Array.from({ length: 7 }).map((_, j) => (
                                    <div key={j} style={{ flex: 1, minHeight: '5rem', borderRadius: '20px', backgroundColor: c.bgSecondary, border: `1px solid ${c.border}` }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: c.border, opacity: 0.1, margin: '8px' }} />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        const isAirbnbMobile = isFullscreenView || isWebCalendar;
        const isBricolerMobile = userType === 'provider' && !isWebCalendar;

        if (isAirbnbMobile) {
            const monthsToRender = 12;
            const months = [];
            const now = new Date();

            for (let m = 0; m < monthsToRender; m++) {
                const targetMonth = new Date(now.getFullYear(), now.getMonth() + m, 1);
                const dates = getCalendarDates(targetMonth);
                const weeks = [];
                for (let i = 0; i < dates.length; i += 7) {
                    weeks.push(dates.slice(i, i + 7));
                }
                months.push({ date: targetMonth, weeks, dates });
            }

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: isBricolerMobile ? '1.5rem 1rem 6rem' : (isAirbnbMobile && !isWebCalendar ? '1rem 0' : '1rem 2rem 2rem'), backgroundColor: isBricolerMobile ? '#1C1C1E' : undefined }}>
                    {months.map((monthData, mIdx) => {
                        const monthName = monthData.date.toLocaleString('default', { month: 'long' });
                        const year = monthData.date.getFullYear();

                        return (
                            <div key={mIdx} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{
                                    position: 'sticky',
                                    top: -1,
                                    zIndex: 20,
                                    backgroundColor: isBricolerMobile ? '#1C1C1E' : c.card,
                                    padding: isBricolerMobile ? '0 0.5rem 0.25rem' : (isWebCalendar ? '0.75rem 0' : '1rem 1.25rem'),
                                    borderBottom: isBricolerMobile ? 'none' : `1px solid ${c.border}`,
                                    display: 'flex',
                                    justifyContent: 'flex-start'
                                }}>
                                    <h3 style={{
                                        fontSize: isBricolerMobile ? '15px' : (isWebCalendar ? '22px' : '18px'),
                                        fontWeight: isBricolerMobile ? 600 : 900,
                                        color: isBricolerMobile ? '#FFFFFF' : c.text,
                                        margin: 0,
                                        textTransform: isBricolerMobile ? 'none' : 'capitalize',
                                        fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, inherit',
                                        letterSpacing: '0'
                                    }}>
                                        {monthName} <span style={{ fontWeight: isBricolerMobile ? 600 : 600 }}>{year}</span>
                                    </h3>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isWebCalendar ? '0.75rem' : '0.5rem', marginBottom: isBricolerMobile ? '0.5rem' : '0' }}>
                                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
                                        <div key={d} style={{
                                            textAlign: 'center',
                                            fontSize: isBricolerMobile ? '12px' : '11px',
                                            fontWeight: isBricolerMobile ? 500 : 800,
                                            color: isBricolerMobile ? '#8E8E93' : c.textMuted,
                                            textTransform: isBricolerMobile ? 'capitalize' : 'uppercase',
                                            letterSpacing: isBricolerMobile ? '0' : '0.08em',
                                            fontFamily: isBricolerMobile ? 'SF Pro Text, -apple-system, BlinkMacSystemFont, inherit' : undefined
                                        }}>
                                            {isBricolerMobile ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][i] : t({ en: d, fr: d })}
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: isWebCalendar ? '0.75rem' : '0.5rem' }}>
                                    {monthData.weeks.map((week, weekIdx) => {
                                        const weekDaysWithOrders: Record<number, any[]> = {};
                                        week.forEach((date, i) => {
                                            const ordersForDay = positionedOrders.filter(o => {
                                                const dPart = o.date.includes(' at ') ? o.date.split(' at ')[0] : o.date;
                                                if (dPart.includes(' - ')) {
                                                    const [sStr, eStr] = dPart.split(' - ');
                                                    const s = new Date(sStr);
                                                    const e = new Date(eStr);
                                                    if (!sStr.includes(',')) s.setFullYear(new Date().getFullYear());
                                                    if (!eStr.includes(',')) e.setFullYear(new Date().getFullYear());
                                                    s.setHours(0, 0, 0, 0); e.setHours(0, 0, 0, 0);
                                                    const check = new Date(date); check.setHours(0, 0, 0, 0);
                                                    return check >= s && check <= e;
                                                }
                                                return isSameDay(date, new Date(dPart));
                                            });
                                            if (ordersForDay.length > 0) weekDaysWithOrders[i] = ordersForDay;
                                        });

                                        return (
                                            <div key={weekIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isWebCalendar ? '0.75rem' : '0.5rem' }}>
                                                {week.map((date, i) => {
                                                    const today = isToday(date);
                                                    const isCurrentMonth = date.getMonth() === monthData.date.getMonth();
                                                    const isSelectedDate = selectedOrder && isSameDay(new Date(selectedOrder.date.includes(' at ') ? selectedOrder.date.split(' at ')[0] : (selectedOrder.date.includes(' - ') ? selectedOrder.date.split(' - ')[0] : selectedOrder.date)), date);
                                                    const ordersForDay = weekDaysWithOrders[i] || [];
                                                    const hasOrders = ordersForDay.length > 0;
                                                    const isPassed = date.getTime() < new Date().setHours(0, 0, 0, 0);
                                                    const isFull = ordersForDay.length >= (userType === 'provider' ? 2 : 100);
                                                    const coinType: 'golden' | 'silver' | null = (() => {
                                                        if (isBricolerMobile && hasOrders) {
                                                            const hasNotDone = ordersForDay.some(o => o.status !== 'done' && o.status !== 'cancelled');
                                                            return hasNotDone ? 'golden' : 'silver';
                                                        }
                                                        return null;
                                                    })();

                                                    return (
                                                        <motion.div
                                                            key={i}
                                                            data-today={today ? "true" : undefined}
                                                            whileHover={{ scale: 0.985, backgroundColor: isBricolerMobile ? 'transparent' : (theme === 'light' ? '#FAFAFA' : '#151515') }}
                                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                            onClick={() => {
                                                                setSelectedDay(date);
                                                                setCurrentDate(date);
                                                                if (isBricolerMobile || isMobile) {
                                                                    if (ordersForDay.length > 0) {
                                                                        setSelectedBricolerMobileDayOrders(ordersForDay);
                                                                    } else {
                                                                        setSelectedBricolerMobileDayOrders(null);
                                                                    }
                                                                    return;
                                                                }
                                                                if (ordersForDay.length > 0 && !isMobile) {
                                                                    setSelectedOrder(ordersForDay[0]);
                                                                    setIsChatting(false);
                                                                    return;
                                                                }
                                                                setSelectedOrder(null);
                                                                setViewMode('day');
                                                            }}
                                                            style={{
                                                                minHeight: isBricolerMobile ? '3.5rem' : (isWebCalendar ? '10.5rem' : '5.5rem'),
                                                                padding: isBricolerMobile ? '0' : (isWebCalendar ? '1rem' : '0.5rem'),
                                                                borderRadius: isBricolerMobile ? '50%' : (isWebCalendar ? '28px' : '18px'),
                                                                border: isBricolerMobile ? 'none' : (isSelectedDate
                                                                    ? '2px solid #000'
                                                                    : (isPassed || isFull ? `1px solid ${c.border}44` : '1.5px solid #B0B0B0')),
                                                                backgroundColor: isBricolerMobile
                                                                    ? 'transparent'
                                                                    : (isFull ? (theme === 'light' ? '#F5F5F7' : '#1C1C1E') : (hasOrders ? (theme === 'light' ? '#F4F7FF' : '#252B3B') : c.card)),
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                justifyContent: 'center',
                                                                alignItems: 'center',
                                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                zIndex: isSelectedDate ? 5 : 1,
                                                                boxShadow: (today && !isBricolerMobile) ? '0 12px 30px -10px rgba(0,0,0,0.12)' : 'none',
                                                                position: 'relative',
                                                                visibility: isCurrentMonth ? 'visible' : 'hidden'
                                                            }}
                                                        >
                                                            {coinType ? (
                                                                <div style={{ padding: '4px' }}>
                                                                    <img src={`/Images/Calendar Coins/${coinType === 'golden' ? 'Golden Coin.png' : 'Silver Coin.png'}`} alt="Coin" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div style={{ display: 'flex', justifyContent: isWebCalendar ? 'flex-start' : 'center', alignItems: 'center', marginBottom: isWebCalendar ? '12px' : '0' }}>
                                                                        <span style={{
                                                                            fontSize: isBricolerMobile ? '16px' : '14px',
                                                                            fontWeight: today ? 900 : (isBricolerMobile ? 400 : 800),
                                                                            color: isBricolerMobile ? (today ? '#FFFFFF' : (isPassed || isFull ? '#48484A' : '#FFFFFF')) : (today ? '#fff' : (isPassed || isFull ? '#D1D1D6' : '#1C1C1E')),
                                                                            width: isBricolerMobile ? '38px' : '32px',
                                                                            height: isBricolerMobile ? '38px' : '32px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            borderRadius: '50%',
                                                                            backgroundColor: today ? (isBricolerMobile ? '#2C2C2E' : '#000') : 'transparent',
                                                                            fontFamily: 'SF Pro Text, var(--font-sans)',
                                                                            transition: 'all 0.2s ease',
                                                                            textDecoration: (isPassed && isBricolerMobile) ? 'line-through' : 'none'
                                                                        }}>
                                                                            {date.getDate()}
                                                                        </span>
                                                                    </div>

                                                                    {isWebCalendar ? (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, width: '100%' }}>
                                                                            {ordersForDay.map((order, oIdx) => {
                                                                                const statusStyle = getStatusStyles(order.status);
                                                                                const isHighlighted = order.id === externalSelectedOrderId || order.id === selectedOrder?.id;
                                                                                return (
                                                                                    <motion.button
                                                                                        key={`scroll-${order.id || oIdx}-${oIdx}`}
                                                                                        whileHover={{ scale: 1.03 }}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setSelectedOrder(order);
                                                                                            setIsChatting(false);
                                                                                        }}
                                                                                        style={{
                                                                                            padding: '6px 12px',
                                                                                            backgroundColor: statusStyle.color || '#000',
                                                                                            color: '#fff',
                                                                                            borderRadius: '12px',
                                                                                            border: 'none',
                                                                                            fontSize: '10px',
                                                                                            fontWeight: 900,
                                                                                            textAlign: 'left',
                                                                                            cursor: 'pointer',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '6px',
                                                                                            boxShadow: isHighlighted ? '0 5px 15px rgba(0,0,0,0.2)' : 'none',
                                                                                            borderLeft: isHighlighted ? '4px solid #fff' : 'none',
                                                                                            opacity: (selectedOrder && !isHighlighted) ? 0.6 : 1,
                                                                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                                            textTransform: 'uppercase',
                                                                                            letterSpacing: '0.02em'
                                                                                        }}
                                                                                    >
                                                                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff', opacity: 0.8, flexShrink: 0 }} />
                                                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                            {order.service}
                                                                                        </span>
                                                                                    </motion.button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : (
                                                                        !isBricolerMobile && ordersForDay.length > 0 && (
                                                                            <div style={{ position: 'absolute', bottom: '10px', width: '100%', display: 'flex', justifyContent: 'center', gap: '3px' }}>
                                                                                {ordersForDay.slice(0, 3).map((order, oIdx) => (
                                                                                    <div key={oIdx} style={{
                                                                                        height: '4px',
                                                                                        width: '4px',
                                                                                        backgroundColor: getStatusStyles(order.status).color,
                                                                                        borderRadius: '50%'
                                                                                    }} />
                                                                                ))}
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        const weeks = [];
        for (let i = 0; i < calendarDates.length; i += 7) {
            weeks.push(calendarDates.slice(i, i + 7));
        }

        return (
            <div style={{ padding: isMobile ? '0.85rem 1rem 1rem' : '2rem', display: 'flex', flexDirection: 'column', gap: isMobile ? '0.5rem' : '0.75rem', height: isWebCalendar ? 'auto' : '100%', flex: isWebCalendar ? 'none' : 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '0.5rem' : '0.75rem', marginBottom: isMobile ? '0.5rem' : '0.75rem' }}>
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                        <div key={d} style={{
                            textAlign: 'center',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: c.textMuted,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em'
                        }}>
                            {t({ en: d, fr: d })}
                        </div>
                    ))}
                </div>

                {weeks.map((week, weekIdx) => {
                    const weekStartIdx = weekIdx * 7;
                    const weekEndIdx = weekStartIdx + 6;

                    const weekOrders = positionedOrders
                        .filter(o => o.dayIdx >= weekStartIdx && o.dayIdx <= weekEndIdx)
                        .sort((a, b) => a.dayIdx - b.dayIdx);

                    const daysWithOrders: Record<number, any[]> = {};
                    weekOrders.forEach(order => {
                        const start = order.dayIdx;
                        const end = start + (order.span || 1) - 1;
                        for (let d = start; d <= end; d++) {
                            if (d >= weekStartIdx && d <= weekEndIdx) {
                                if (!daysWithOrders[d]) daysWithOrders[d] = [];
                                daysWithOrders[d].push(order);
                            }
                        }
                    });

                    return (
                        <div key={weekIdx} style={{ position: 'relative', flex: '1 0 auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? '0.6rem' : '0.75rem', height: '100%', zIndex: 1, position: 'relative' }}>
                                {week.map((date, i) => {
                                    const today = isToday(date);
                                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                                    const isSelectedDate = selectedOrder && isSameDay(new Date(selectedOrder.date.includes(' at ') ? selectedOrder.date.split(' at ')[0] : (selectedOrder.date.includes(' - ') ? selectedOrder.date.split(' - ')[0] : selectedOrder.date)), date);
                                    const dayIdx = weekStartIdx + i;
                                    const ordersForDay = daysWithOrders[dayIdx] || [];
                                    const hasOrders = ordersForDay.length > 0;
                                    const isPassed = date.getTime() < new Date().setHours(0, 0, 0, 0);
                                    const isFull = ordersForDay.length >= (userType === 'provider' ? 2 : 100);

                                    return (
                                        <motion.div
                                            key={i}
                                            data-today={today ? "true" : undefined}
                                            whileHover={{ scale: 0.985, backgroundColor: theme === 'light' ? '#FAFAFA' : '#151515' }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                            onClick={() => {
                                                setSelectedDay(date);
                                                setCurrentDate(date);
                                                if (ordersForDay.length > 0 && !isMobile) {
                                                    setSelectedOrder(ordersForDay[0]);
                                                    setIsChatting(false);
                                                    return;
                                                }
                                                setSelectedOrder(null);
                                                setViewMode('day');
                                            }}
                                            style={{
                                                minHeight: isMobile ? '7rem' : '10.5rem',
                                                padding: isMobile ? '0.6rem' : '1rem',
                                                borderRadius: '28px',
                                                border: isSelectedDate
                                                    ? `2px solid #000`
                                                    : (isPassed || isFull ? `1px solid ${c.border}44` : `1.5px solid #B0B0B0`),
                                                backgroundColor: isFull ? (theme === 'light' ? '#F5F5F7' : '#1C1C1E') : (hasOrders ? (theme === 'light' ? '#F4F7FF' : '#252B3B') : c.card),
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                zIndex: isSelectedDate ? 5 : 1,
                                                boxShadow: today ? '0 12px 30px -10px rgba(0,0,0,0.12)' : 'none',
                                                position: 'relative',
                                                visibility: isCurrentMonth ? 'visible' : 'hidden'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '12px' }}>
                                                <span style={{
                                                    fontSize: '14px',
                                                    fontWeight: today ? 900 : 800,
                                                    color: today ? '#fff' : (isCurrentMonth ? c.text : c.textMuted),
                                                    width: '30px',
                                                    height: '30px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '50%',
                                                    backgroundColor: today ? '#000' : 'transparent',
                                                    fontFamily: 'Uber Move, var(--font-sans)',
                                                    transition: 'all 0.2s ease'
                                                }}>
                                                    {date.getDate()}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                                {daysWithOrders[dayIdx]?.map((order, oIdx) => {
                                                    const statusStyle = getStatusStyles(order.status);
                                                    const isHighlighted = order.id === externalSelectedOrderId || order.id === selectedOrder?.id;

                                                    return (
                                                        <motion.button
                                                            key={`${order.originalIndex}-${oIdx}`}
                                                            layoutId={`month-order-${order.originalIndex}-${dayIdx}`}
                                                            whileHover={{ scale: 1.03 }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedOrder(order);
                                                                setIsChatting(false);
                                                            }}
                                                            style={{
                                                                padding: '6px 12px',
                                                                backgroundColor: statusStyle.color || '#000',
                                                                color: '#fff',
                                                                borderRadius: '12px',
                                                                border: 'none',
                                                                fontSize: '10px',
                                                                fontWeight: 900,
                                                                textAlign: 'left',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                boxShadow: isHighlighted ? '0 5px 15px rgba(0,0,0,0.2)' : 'none',
                                                                borderLeft: isHighlighted ? '4px solid #fff' : 'none',
                                                                opacity: (selectedOrder && !isHighlighted) ? 0.6 : 1,
                                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.02em'
                                                            }}
                                                        >
                                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff', opacity: 0.8, flexShrink: 0 }} />
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {order.service}
                                                            </span>
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'row', flex: 1, position: 'relative', gap: isMobile ? '0' : '2rem', alignItems: 'flex-start', minHeight: '100%', height: '100%' }}>
            <motion.section
                layout
                style={{
                    width: isMobile ? '100vw' : (selectedOrder ? 'calc(100% - 460px)' : '100%'),
                    maxWidth: '100%',
                    height: isFullscreenMobile ? '100dvh' : '100%',
                    maxHeight: isFullscreenMobile ? '100dvh' : 'none',
                    minHeight: 0,
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: variant === 'card' ? c.bgSecondary : (isFullscreenMobile ? (isBricolerMobile ? '#1C1C1E' : c.card) : 'transparent'),
                    borderRadius: variant === 'card' ? '40px' : '0',
                    overflow: 'hidden',
                    border: variant === 'card' ? `1px solid ${c.border}` : 'none',
                    boxShadow: variant === 'card' && theme === 'light' ? '0 4px 24px rgba(0,0,0,0.04)' : 'none',
                    fontFamily: 'var(--font-sans)',
                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                {!isBricolerMobile && (
                    <div
                        ref={headerRef}
                        style={{
                            padding: variant === 'card' ? (headerIsMobile ? '1rem 1.25rem 0.75rem' : '2rem') : (headerIsMobile ? '1rem 1.25rem 0.5rem' : '3rem 3rem 1.5rem'),
                            borderBottom: `1px solid ${c.border}`,
                            backgroundColor: c.card,
                            borderRadius: variant === 'card' ? '40px 40px 0 0' : (isMobile ? '0' : '40px 40px 0 0'),
                            display: 'flex',
                            flexDirection: 'column',
                            gap: headerIsMobile ? '0.75rem' : '1.5rem',
                            zIndex: isFullscreenMobile ? 40 : 10,
                            position: isFullscreenMobile ? 'sticky' : 'relative',
                            top: 0,
                            flexShrink: 0,
                            boxShadow: isFullscreenMobile ? '0 1px 6px rgba(0,0,0,0.06)' : 'none'
                        }}>
                        {headerIsMobile ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: '1rem',
                                    padding: '0.5rem 1.25rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            onClick={() => setIsViewSelectorOpen(true)}
                                            style={{
                                                width: '42px',
                                                height: '42px',
                                                borderRadius: '50%',
                                                border: `1.5px solid #111`,
                                                backgroundColor: 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Calendar size={20} color="#111" />
                                        </button>
                                        {onClose && (
                                            <button
                                                onClick={onClose}
                                                style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '10px',
                                                    backgroundColor: '#F5F5F7',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <h1 style={{
                                    fontSize: '2.5rem',
                                    fontWeight: 950,
                                    color: c.text,
                                    margin: 0,
                                    letterSpacing: '-0.03em',
                                    fontFamily: 'Uber Move, var(--font-sans)'
                                }}>
                                    {t({ en: 'Calendar', fr: 'Calendrier' })}
                                </h1>

                                <div style={{
                                    display: 'flex',
                                    flexDirection: variant === 'card' ? 'row' : 'column',
                                    alignItems: variant === 'card' ? 'center' : 'center',
                                    justifyContent: variant === 'card' ? 'space-between' : 'center',
                                    textAlign: variant === 'card' ? 'left' : 'center',
                                    gap: variant === 'card' ? '1rem' : '1.5rem',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <img
                                            src="/Images/Logo/Black Lbricol Avatar Face.png"
                                            alt="Lbricol Face"
                                            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                                        />
                                        <h2 style={{
                                            fontSize: variant === 'card' ? '1.875rem' : '3rem',
                                            fontWeight: 900,
                                            color: c.text,
                                            letterSpacing: variant === 'card' ? '-0.02em' : '-0.05em',
                                            lineHeight: variant === 'card' ? 'normal' : 1,
                                            fontFamily: 'Uber Move, var(--font-sans)'
                                        }}>
                                            {mounted && (
                                                <span style={{ opacity: 0.3, fontWeight: 500, fontFamily: 'Uber Move, var(--font-sans)', fontSize: '1.875rem' }}>
                                                    {displayMonth}
                                                </span>
                                            )}
                                        </h2>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: variant === 'card' ? '0.75rem' : '1rem' }}>
                                        <div style={{ display: 'flex', backgroundColor: '#F3F3F3', borderRadius: '100px', padding: '4px', gap: '2px' }}>
                                            {(['month', 'week', 'day'] as const).map((m) => (
                                                <button
                                                    key={m}
                                                    onClick={() => setViewMode(m)}
                                                    style={{
                                                        padding: '6px 16px',
                                                        borderRadius: '100px',
                                                        border: 'none',
                                                        backgroundColor: viewMode === m ? '#000' : 'transparent',
                                                        color: viewMode === m ? '#fff' : '#000',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        cursor: 'pointer',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                        fontFamily: 'Uber Move, var(--font-sans)',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                >
                                                    {t({ en: m, fr: m === 'week' ? 'semaine' : m === 'day' ? 'jour' : 'mois' })}
                                                </button>
                                            ))}
                                        </div>
                                        {onNewOrder && (
                                            <button
                                                onClick={onNewOrder}
                                                style={{
                                                    padding: '10px 20px',
                                                    borderRadius: '100px',
                                                    backgroundColor: '#000',
                                                    color: '#fff',
                                                    border: 'none',
                                                    fontSize: '14px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    boxShadow: 'none',
                                                    transition: 'all 0.2s',
                                                    fontFamily: 'Uber Move, var(--font-sans)',
                                                    letterSpacing: '0.02em'
                                                }}
                                                onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                                                onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                            >
                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Plus size={10} strokeWidth={4} />
                                                </div>
                                                {t({ en: 'New Order', fr: 'Nouvelle Commande' })}
                                            </button>
                                        )}
                                        {/* Web month view: single ↑ Today scroll button. Other views: < Today > arrows */}
                                        {isWebCalendar && viewMode === 'month' ? (
                                            <button
                                                onClick={() => {
                                                    setCurrentDate(new Date());
                                                    handleScrollToToday();
                                                }}
                                                className="hover-scale"
                                                style={{
                                                    padding: '0 16px',
                                                    height: '32px',
                                                    borderRadius: '100px',
                                                    backgroundColor: '#F3F3F3',
                                                    color: c.text,
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    border: 'none',
                                                    fontFamily: 'Uber Move, var(--font-sans)'
                                                }}
                                            >
                                                <ChevronUp size={14} strokeWidth={2.5} />
                                                {t({ en: 'Today', fr: "Aujourd'hui" })}
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', gap: variant === 'card' ? '4px' : '6px' }}>
                                                <button
                                                    onClick={() => navigate('prev')}
                                                    style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        border: `1px solid ${c.border}`,
                                                        backgroundColor: '#fff',
                                                        color: c.text,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setCurrentDate(new Date())}
                                                    className="hover-scale"
                                                    style={{
                                                        padding: '0 14px',
                                                        height: '32px',
                                                        borderRadius: '100px',
                                                        backgroundColor: '#F3F3F3',
                                                        color: c.text,
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        border: 'none',
                                                        fontFamily: 'Uber Move, var(--font-sans)'
                                                    }}
                                                >
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#000' }} />
                                                    {t({ en: 'Today', fr: "Aujourd'hui" })}
                                                </button>
                                                <button
                                                    onClick={() => navigate('next')}
                                                    style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '50%',
                                                        border: `1px solid ${c.border}`,
                                                        backgroundColor: '#fff',
                                                        color: c.text,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        )}
                                        {onClose && (
                                            <button
                                                onClick={onClose}
                                                style={{
                                                    position: variant === 'borderless' && !isMobile ? 'absolute' : 'static',
                                                    top: variant === 'borderless' ? '0.5rem' : 'auto',
                                                    right: variant === 'borderless' ? '-1rem' : 'auto',
                                                    padding: variant === 'card' ? '8px' : '12px',
                                                    marginLeft: variant === 'card' ? '0.5rem' : '0',
                                                    borderRadius: '16px',
                                                    backgroundColor: '#F5F5F7',
                                                    color: '#000',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#E5E5E7')}
                                                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#F5F5F7')}
                                            >
                                                <X size={variant === 'card' ? 18 : 24} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Content area for Calendar Views and Recent Activities */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', backgroundColor: (isBricolerMobile ? '#1C1C1E' : c.card) }}>
                    <div
                        ref={scrollContainerRef}
                        style={{
                            height: (isFullscreenMobile || isWebCalendar) ? scrollAreaHeight : '100%',
                            maxHeight: (isFullscreenMobile || isWebCalendar) ? scrollAreaHeight : '100%',
                            flex: (isFullscreenMobile || isWebCalendar) ? '0 0 auto' : '1',
                            overflowY: 'auto',
                            WebkitOverflowScrolling: 'touch'
                        }}
                        className="no-scrollbar"
                    >
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            {mounted && (
                                viewMode === 'month' ? renderMonthView() :
                                    viewMode === 'week' ? renderWeekView() :
                                        renderDayView()
                            )}
                        </div>

                        {/* Scroll Down Indicator */}
                        <AnimatePresence>
                            {hasOrdersBelow && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    style={{
                                        position: 'absolute',
                                        bottom: isMobile ? '24px' : '32px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        zIndex: 100,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        pointerEvents: 'none'
                                    }}
                                >
                                    <div style={{
                                        backgroundColor: '#000',
                                        color: '#fff',
                                        padding: '10px 18px',
                                        borderRadius: '100px',
                                        fontSize: '12px',
                                        fontWeight: 900,
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        <span>{t({ en: 'More orders below', fr: 'Plus de missions en bas' })}</span>
                                        <motion.div
                                            animate={{ y: [0, 4, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            <ArrowDown size={14} strokeWidth={3} />
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.section>

            <AnimatePresence>
                {selectedOrder && (
                    isMobile ? (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', pointerEvents: 'auto' }}>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => {
                                    setSelectedOrder(null);
                                    setIsChatting(false);
                                }}
                                style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
                            />

                            {/* Bottom Sheet */}
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 1 }}
                                style={{
                                    position: 'relative',
                                    backgroundColor: c.card,
                                    width: '100%',
                                    borderTopLeftRadius: '32px',
                                    borderTopRightRadius: '32px',
                                    padding: '1.25rem 1.5rem 3rem',
                                    boxShadow: '0 -10px 40px rgba(0,0,0,0.1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    maxHeight: '85dvh',
                                    zIndex: 2001,
                                    overflowY: 'auto'
                                }}
                            >
                                {/* Drag Indicator */}
                                <div style={{
                                    width: '40px',
                                    height: '5px',
                                    backgroundColor: '#E0E0E0',
                                    borderRadius: '10px',
                                    margin: '0 auto 1.5rem auto',
                                    flexShrink: 0
                                }} />
                                {renderOrderContent()}
                            </motion.div>
                        </div>
                    ) : useOverlayPeek ? (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => {
                                    setSelectedOrder(null);
                                    setIsChatting(false);
                                }}
                                style={{
                                    position: 'fixed',
                                    top: Math.max(0, overlayTopOffset),
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: 'rgba(0,0,0,0.32)',
                                    backdropFilter: 'blur(3px)',
                                    zIndex: 90
                                }}
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 30, stiffness: 240 }}
                                style={{
                                    position: 'fixed',
                                    top: Math.max(0, overlayTopOffset),
                                    right: 0,
                                    width: 'clamp(420px, 34vw, 560px)',
                                    height: `calc(100dvh - ${Math.max(0, overlayTopOffset)}px)`,
                                    backgroundColor: c.card,
                                    borderLeft: `1px solid ${c.border}`,
                                    boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
                                    zIndex: 100,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }} className="no-scrollbar">
                                    {renderOrderContent()}
                                </div>
                            </motion.div>
                        </>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 100 }}
                            transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                            style={{
                                width: '420px',
                                height: '100%',
                                backgroundColor: c.card,
                                borderRadius: '40px',
                                border: `1px solid ${c.border}`,
                                boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                position: 'relative',
                                marginLeft: '1rem'
                            }}
                        >
                            <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }} className="no-scrollbar">
                                {renderOrderContent()}
                            </div>
                        </motion.div>
                    )
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isFullscreenMobile && selectedOrderForDetails && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 260 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: '#FFFFFF',
                            zIndex: 9999,
                            overflowY: 'auto',
                            WebkitOverflowScrolling: 'touch'
                        }}
                    >
                        {(() => {
                            const locale = t({ en: 'en-US', fr: 'fr-FR' });
                            const displayName = getOrderDisplayName(selectedOrderForDetails);
                            const avatar = getOrderAvatar(selectedOrderForDetails);
                            const dateInfo = getOrderDateInfo(selectedOrderForDetails.date);
                            const msPerDay = 1000 * 60 * 60 * 24;
                            const nightsCount = dateInfo.startDate && dateInfo.endDate
                                ? Math.max(0, Math.round((dateInfo.endDate.getTime() - dateInfo.startDate.getTime()) / msPerDay))
                                : 0;
                            const nightsLabel = nightsCount > 0 ? ` (${nightsCount} ${t({ en: 'nights', fr: 'nuits' })})` : '';
                            const rangeLabel = dateInfo.startDate && dateInfo.endDate
                                ? `${dateInfo.startDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${dateInfo.endDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}${nightsLabel}`
                                : dateInfo.startRaw;
                            const arrivalLabel = dateInfo.startDate
                                ? dateInfo.startDate.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                                : dateInfo.startRaw;
                            const departureLabel = dateInfo.endDate
                                ? dateInfo.endDate.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                                : dateInfo.endRaw;
                            const propertyLine = [selectedOrderForDetails.service, selectedOrderForDetails.subServiceDisplayName, selectedOrderForDetails.location]
                                .filter(Boolean)
                                .join(' | ');
                            const confirmationCode = selectedOrderForDetails.id || t({ en: 'Unavailable', fr: 'Indisponible' });

                            return (
                                <div style={{ padding: '24px 24px 32px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                {t({ en: 'Experienced traveler', fr: 'Ancien voyageur' })}
                                            </span>
                                            <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#111111', margin: 0 }}>
                                                {displayName}
                                            </h1>
                                            <div style={{ fontSize: '15px', fontWeight: 600, color: '#4B4B4B', lineHeight: 1.5 }}>
                                                {propertyLine}
                                            </div>
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111111' }}>
                                                {rangeLabel}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                                            <button
                                                onClick={() => setSelectedOrderForDetails(null)}
                                                style={{
                                                    width: '44px',
                                                    height: '44px',
                                                    borderRadius: '50%',
                                                    border: 'none',
                                                    backgroundColor: '#F2F2F2',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer'
                                                }}
                                                aria-label={t({ en: 'Close', fr: 'Fermer' })}
                                            >
                                                <X size={20} />
                                            </button>
                                            <div
                                                style={{
                                                    width: '56px',
                                                    height: '56px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#6B7280',
                                                    overflow: 'hidden',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    fontSize: '16px',
                                                    fontWeight: 800
                                                }}
                                            >
                                                {avatar ? (
                                                    <img src={avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    (displayName || 'NA').substring(0, 2).toUpperCase()
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ height: '1px', backgroundColor: '#EFEFF0' }} />

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#111111', margin: 0 }}>
                                            {t({ en: `About ${displayName}`, fr: `Tout sur ${displayName}` })}
                                        </h2>
                                        <button
                                            style={{
                                                alignSelf: 'flex-start',
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                color: '#111111',
                                                textDecoration: 'underline',
                                                fontSize: '15px',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {t({ en: 'View profile', fr: 'Afficher le profil' })}
                                        </button>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <button
                                                disabled
                                                style={{
                                                    width: '100%',
                                                    padding: '14px 16px',
                                                    borderRadius: '16px',
                                                    border: '1px solid #E0E0E0',
                                                    backgroundColor: '#F6F6F6',
                                                    fontSize: '15px',
                                                    fontWeight: 700,
                                                    color: '#B1B1B1',
                                                    cursor: 'not-allowed'
                                                }}
                                            >
                                                {t({ en: 'Call', fr: 'Appeler' })}
                                            </button>
                                            <span style={{ fontSize: '12px', color: '#9B9B9B' }}>
                                                {t({ en: 'Phone number unavailable', fr: 'Numéro de téléphone indisponible' })}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ height: '1px', backgroundColor: '#EFEFF0' }} />

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#111111', margin: 0 }}>
                                            {t({ en: 'Reservation details', fr: 'Détails de la réservation' })}
                                        </h2>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                {t({ en: 'Arrival', fr: 'Arrivée' })}
                                            </div>
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111111' }}>{arrivalLabel}</div>
                                        </div>
                                        <div style={{ height: '1px', backgroundColor: '#EFEFF0' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                {t({ en: 'Departure', fr: 'Départ' })}
                                            </div>
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111111' }}>{departureLabel}</div>
                                        </div>
                                        <div style={{ height: '1px', backgroundColor: '#EFEFF0' }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                {t({ en: 'Confirmation code', fr: 'Code de confirmation' })}
                                            </div>
                                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#111111' }}>{confirmationCode}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </motion.div>
                )}
            </AnimatePresence>

            {
                isFullscreenMobile && onNewOrder && !selectedOrder && !selectedOrderForDetails && (
                    <button
                        onClick={onNewOrder}
                        aria-label={t({ en: 'New Order', fr: 'Nouvelle Commande' })}
                        style={{
                            position: 'fixed',
                            right: '20px',
                            bottom: `${bottomNavHeight ? bottomNavHeight + 16 : 96}px`,
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: '#111111',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 10px 24px rgba(0,0,0,0.22)',
                            cursor: 'pointer',
                            zIndex: 2500
                        }}
                    >
                        <Plus size={22} strokeWidth={2.5} />
                    </button>
                )
            }

            {/* Floating Today Arrow Button */}
            <AnimatePresence>
                {todayArrowDirection && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: 20 }}
                        onClick={handleScrollToToday}
                        style={{
                            position: 'fixed',
                            right: '25px',
                            bottom: `${bottomNavHeight ? bottomNavHeight + 84 : 160}px`,
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: '#FFFFFF',
                            color: '#111111',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                            border: '1px solid #EAEAEA',
                            cursor: 'pointer',
                            zIndex: 2600
                        }}
                    >
                        {todayArrowDirection === 'up' ? <ArrowUp size={24} strokeWidth={3} /> : <ArrowDown size={24} strokeWidth={3} />}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Bottom View Selector Sheet */}
            <AnimatePresence>
                {isViewSelectorOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsViewSelectorOpen(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                backgroundColor: 'rgba(0,0,0,0.4)',
                                zIndex: 3000
                            }}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{
                                position: 'fixed',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                backgroundColor: '#fff',
                                borderTopLeftRadius: '32px',
                                borderTopRightRadius: '32px',
                                padding: '1.5rem',
                                paddingBottom: `calc(1.5rem + ${bottomNavHeight}px)`,
                                zIndex: 3001,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}
                        >
                            <div style={{ width: '40px', height: '4px', backgroundColor: '#E0E0E0', borderRadius: '2px', margin: '0 auto 1rem' }} />
                            <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '0.5rem', fontFamily: 'Uber Move, var(--font-sans)' }}>
                                {t({ en: 'View Mode', fr: 'Mode de Vue' })}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {(['month'] as const).map((m) => {
                                    const labels = {
                                        month: t({ en: 'Month', fr: 'Mois' }),
                                        day: t({ en: 'Day', fr: 'Jour' })
                                    };
                                    return (
                                        <button
                                            key={m}
                                            onClick={() => {
                                                setViewMode(m);
                                                setIsViewSelectorOpen(false);
                                            }}
                                            style={{
                                                padding: '1.25rem',
                                                borderRadius: '20px',
                                                border: '1.5px solid',
                                                borderColor: viewMode === m ? '#111' : '#F0F0F0',
                                                backgroundColor: viewMode === m ? '#111' : '#F9F9F9',
                                                color: viewMode === m ? '#fff' : '#111',
                                                fontSize: '16px',
                                                fontWeight: 800,
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontFamily: 'Uber Move, var(--font-sans)',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {labels[m]}
                                            {viewMode === m && <Check size={20} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Bricoler Mobile Day Orders Bottom Sheet */}
            <AnimatePresence>
                {selectedBricolerMobileDayOrders && selectedBricolerMobileDayOrders.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm"
                        onClick={() => setSelectedBricolerMobileDayOrders(null)}
                        style={{ paddingBottom: bottomNavHeight || 80 }}
                    >
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="bg-white w-full rounded-t-[32px] p-6 pb-12 shadow-2xl max-h-[80vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-10 h-1 bg-neutral-200 rounded-full mx-auto mb-6" />
                            <h2 className="text-[20px] font-black text-neutral-900 mb-4 font-sans" style={{ fontFamily: 'Uber Move, var(--font-sans)' }}>
                                {t({ en: 'Jobs for this day', fr: 'Missions pour ce jour' })}
                            </h2>
                            <div className="space-y-4">
                                {selectedBricolerMobileDayOrders.map((order, idx) => {
                                    const statusStyle = getStatusStyles(order.status);
                                    return (
                                        <div key={idx} className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100 flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[12px] font-black px-2 py-1 rounded-md text-white uppercase tracking-widest" style={{ backgroundColor: statusStyle.color }}>
                                                    {statusStyle.label}
                                                </span>
                                                <span className="text-[12px] font-bold text-neutral-500">
                                                    {order.time || 'TBD'}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-[16px] font-bold text-black">{order.service}</h3>
                                                {order.subServiceDisplayName && (
                                                    <p className="text-[14px] text-neutral-600">{order.subServiceDisplayName}</p>
                                                )}
                                                {order.clientName && (
                                                    <p className="text-[13px] font-medium text-neutral-500 mt-1 flex items-center gap-1">
                                                        <User size={14} /> {order.clientName}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WeekCalendar;
